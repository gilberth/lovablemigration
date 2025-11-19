#!/usr/bin/env python3
"""
Monitoreo en tiempo real de assessments con interfaz visual
Uso: python scripts/monitor_live.py
Requiere: pip install rich
"""

import requests
import time
from datetime import datetime
from typing import Dict, List, Any

try:
    from rich.console import Console
    from rich.table import Table
    from rich.live import Live
    from rich.layout import Layout
    from rich.panel import Panel
    from rich.progress import Progress, BarColumn, TextColumn, TimeRemainingColumn
    from rich.text import Text
    RICH_AVAILABLE = True
except ImportError:
    RICH_AVAILABLE = False
    print("⚠️  Para mejor visualización, instala rich: pip install rich")
    print("Usando modo básico...\n")

# Configuración
SUPABASE_URL = "http://10.10.10.77:8000"
ANON_KEY = "eeyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzYzMzU1NjAwLCJleHAiOjE5MjExMjIwMDB9.OzXw4tdhXGo59s1KqnAWD8O9XpdN3dcHTazxY0uL0Go"
REFRESH_INTERVAL = 5  # segundos


class AssessmentMonitor:
    def __init__(self, url: str, key: str):
        self.url = url
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json"
        }
        self.console = Console() if RICH_AVAILABLE else None

    def query(self, table: str, select: str = "*", filters: str = "") -> List[Dict[str, Any]]:
        """Hacer query a Supabase"""
        endpoint = f"{self.url}/rest/v1/{table}"
        params = f"?select={select}{filters}"

        try:
            response = requests.get(endpoint + params, headers=self.headers, timeout=10)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            return []

    def get_stats(self) -> Dict[str, Any]:
        """Obtener estadísticas generales"""
        assessments = self.query("assessments", "status,created_at,analysis_progress")
        findings = self.query("findings", "severity")

        # Contar por estado
        status_counts = {}
        for a in assessments:
            status = a.get('status', 'unknown')
            status_counts[status] = status_counts.get(status, 0) + 1

        # Contar por severidad
        severity_counts = {}
        for f in findings:
            severity = f.get('severity', 'unknown')
            severity_counts[severity] = severity_counts.get(severity, 0) + 1

        # Assessments activos
        active = [a for a in assessments if a.get('status') in ['analyzing', 'pending', 'uploaded']]

        return {
            'total_assessments': len(assessments),
            'total_findings': len(findings),
            'status_counts': status_counts,
            'severity_counts': severity_counts,
            'active_assessments': active
        }

    def create_status_table(self, stats: Dict) -> Table:
        """Crear tabla de estados"""
        table = Table(title="📊 Estado de Assessments", show_header=True, header_style="bold magenta")
        table.add_column("Estado", style="cyan", width=20)
        table.add_column("Cantidad", justify="right", style="green")

        status_counts = stats.get('status_counts', {})
        for status, count in sorted(status_counts.items(), key=lambda x: x[1], reverse=True):
            table.add_row(status.upper(), str(count))

        return table

    def create_findings_table(self, stats: Dict) -> Table:
        """Crear tabla de findings por severidad"""
        table = Table(title="🔍 Findings por Severidad", show_header=True, header_style="bold magenta")
        table.add_column("Severidad", style="cyan", width=20)
        table.add_column("Cantidad", justify="right")

        severity_counts = stats.get('severity_counts', {})
        severity_colors = {
            'critical': 'red',
            'high': 'orange1',
            'medium': 'yellow',
            'low': 'green',
            'info': 'blue'
        }

        severity_order = ['critical', 'high', 'medium', 'low', 'info']
        for severity in severity_order:
            count = severity_counts.get(severity, 0)
            if count > 0:
                color = severity_colors.get(severity, 'white')
                table.add_row(
                    f"[{color}]{severity.upper()}[/{color}]",
                    f"[{color}]{count}[/{color}]"
                )

        return table

    def create_active_table(self, stats: Dict) -> Table:
        """Crear tabla de assessments activos"""
        table = Table(title="⏳ Assessments Activos", show_header=True, header_style="bold magenta")
        table.add_column("Dominio", style="cyan")
        table.add_column("Estado", style="yellow")
        table.add_column("Progreso", justify="right")

        active = stats.get('active_assessments', [])

        if not active:
            table.add_row("---", "---", "---")
        else:
            for assessment in active[:5]:  # Mostrar solo 5
                # Obtener assessment completo con dominio
                ass_id = assessment.get('id')
                full_data = self.query("assessments", "domain,status,analysis_progress", f"&id=eq.{ass_id}")

                if full_data:
                    domain = full_data[0].get('domain', 'N/A')
                    status = full_data[0].get('status', 'N/A')
                    progress = full_data[0].get('analysis_progress', {})

                    if progress:
                        completed = progress.get('completed', 0)
                        total = progress.get('total', 1)
                        percentage = round((completed / total) * 100, 1) if total > 0 else 0
                        progress_str = f"{completed}/{total} ({percentage}%)"
                    else:
                        progress_str = "N/A"

                    table.add_row(domain, status, progress_str)

        return table

    def create_layout(self, stats: Dict) -> Layout:
        """Crear layout completo"""
        layout = Layout()

        # Título
        title = Panel(
            f"[bold cyan]🔍 Monitor de Assessments - Supabase[/bold cyan]\n"
            f"[dim]{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}[/dim]",
            style="bold white on blue"
        )

        # Estadísticas generales
        summary = Panel(
            f"[bold green]Total Assessments:[/bold green] {stats['total_assessments']}\n"
            f"[bold yellow]Total Findings:[/bold yellow] {stats['total_findings']}\n"
            f"[bold blue]Activos:[/bold blue] {len(stats['active_assessments'])}",
            title="📈 Resumen General",
            style="green"
        )

        # Crear layout
        layout.split_column(
            Layout(name="header", size=5),
            Layout(name="summary", size=7),
            Layout(name="tables"),
        )

        layout["header"].update(title)
        layout["summary"].update(summary)

        # Tablas
        layout["tables"].split_row(
            Layout(name="status"),
            Layout(name="findings"),
        )

        layout["status"].split_column(
            Layout(self.create_status_table(stats)),
            Layout(self.create_active_table(stats))
        )
        layout["findings"].update(self.create_findings_table(stats))

        return layout

    def monitor_basic(self):
        """Monitoreo básico sin rich"""
        print("\n🔍 Iniciando monitor básico...")
        print("Presiona Ctrl+C para detener\n")

        try:
            while True:
                stats = self.get_stats()

                print(f"\n{'='*60}")
                print(f"Actualizado: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                print(f"{'='*60}")

                print(f"\n📊 Total Assessments: {stats['total_assessments']}")
                print(f"🔍 Total Findings: {stats['total_findings']}")
                print(f"⏳ Activos: {len(stats['active_assessments'])}")

                print("\nEstados:")
                for status, count in stats['status_counts'].items():
                    print(f"  {status}: {count}")

                print("\nSeveridades:")
                for severity, count in stats['severity_counts'].items():
                    print(f"  {severity}: {count}")

                print(f"\nPróxima actualización en {REFRESH_INTERVAL} segundos...")
                time.sleep(REFRESH_INTERVAL)

        except KeyboardInterrupt:
            print("\n\n✅ Monitor detenido")

    def monitor_live(self):
        """Monitoreo en tiempo real con rich"""
        if not RICH_AVAILABLE:
            self.monitor_basic()
            return

        with Live(self.create_layout(self.get_stats()), refresh_per_second=1, console=self.console) as live:
            try:
                while True:
                    time.sleep(REFRESH_INTERVAL)
                    stats = self.get_stats()
                    live.update(self.create_layout(stats))
            except KeyboardInterrupt:
                self.console.print("\n[bold green]✅ Monitor detenido[/bold green]")


def main():
    """Función principal"""
    monitor = AssessmentMonitor(SUPABASE_URL, ANON_KEY)

    print("\n🔍 Conectando a Supabase...")
    try:
        response = requests.get(f"{SUPABASE_URL}/rest/v1/", headers=monitor.headers, timeout=5)
        response.raise_for_status()
        print("✅ Conexión exitosa")
    except Exception as e:
        print(f"❌ Error de conexión: {e}")
        return

    print(f"\n⏱️  Intervalo de actualización: {REFRESH_INTERVAL} segundos")
    print("Presiona Ctrl+C para detener\n")

    time.sleep(2)

    # Iniciar monitor
    monitor.monitor_live()


if __name__ == "__main__":
    main()
