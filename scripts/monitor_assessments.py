#!/usr/bin/env python3
"""
Script para monitorear assessments en Supabase
Uso: python scripts/monitor_assessments.py
"""

import requests
import json
from datetime import datetime
from typing import Dict, List, Any
import time
import os

# Configuración
SUPABASE_URL = "http://10.10.10.77:8000"
ANON_KEY = "eeyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzYzMzU1NjAwLCJleHAiOjE5MjExMjIwMDB9.OzXw4tdhXGo59s1KqnAWD8O9XpdN3dcHTazxY0uL0Go"

class SupabaseMonitor:
    def __init__(self, url: str, key: str):
        self.url = url
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json"
        }

    def query(self, table: str, select: str = "*", filters: str = "") -> List[Dict[str, Any]]:
        """Hacer query a una tabla de Supabase"""
        endpoint = f"{self.url}/rest/v1/{table}"
        params = f"?select={select}{filters}"

        try:
            response = requests.get(endpoint + params, headers=self.headers)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"❌ Error al consultar {table}: {e}")
            return []

    def get_assessments(self) -> List[Dict[str, Any]]:
        """Obtener todos los assessments"""
        return self.query(
            "assessments",
            "id,domain,status,created_at,updated_at,completed_at,analysis_progress",
            "&order=created_at.desc"
        )

    def get_findings(self, assessment_id: str = None) -> List[Dict[str, Any]]:
        """Obtener findings"""
        filters = f"&assessment_id=eq.{assessment_id}" if assessment_id else ""
        return self.query("findings", "*", filters)

    def get_status_summary(self) -> Dict[str, int]:
        """Obtener resumen de estados"""
        assessments = self.get_assessments()
        summary = {}
        for assessment in assessments:
            status = assessment.get('status', 'unknown')
            summary[status] = summary.get(status, 0) + 1
        return summary

    def get_severity_summary(self) -> Dict[str, int]:
        """Obtener resumen de severidades"""
        findings = self.get_findings()
        summary = {}
        for finding in findings:
            severity = finding.get('severity', 'unknown')
            summary[severity] = summary.get(severity, 0) + 1
        return summary

    def calculate_progress(self, analysis_progress: Dict) -> float:
        """Calcular porcentaje de progreso"""
        if not analysis_progress:
            return 0.0

        completed = analysis_progress.get('completed', 0)
        total = analysis_progress.get('total', 0)

        if total == 0:
            return 0.0

        return round((completed / total) * 100, 2)

    def format_datetime(self, dt_str: str) -> str:
        """Formatear fecha/hora"""
        if not dt_str:
            return "N/A"
        try:
            dt = datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
            return dt.strftime('%Y-%m-%d %H:%M:%S')
        except:
            return dt_str

    def print_assessments(self):
        """Imprimir todos los assessments"""
        print("\n" + "="*80)
        print("📊 ASSESSMENTS")
        print("="*80 + "\n")

        assessments = self.get_assessments()

        if not assessments:
            print("No se encontraron assessments.\n")
            return

        for i, assessment in enumerate(assessments, 1):
            domain = assessment.get('domain', 'N/A')
            status = assessment.get('status', 'N/A')
            created = self.format_datetime(assessment.get('created_at'))
            progress = assessment.get('analysis_progress', {})

            print(f"{'─'*80}")
            print(f"#{i} | {domain}")
            print(f"{'─'*80}")
            print(f"  Estado: {status.upper()}")
            print(f"  Creado: {created}")

            if progress:
                current = progress.get('current', 'N/A')
                completed = progress.get('completed', 0)
                total = progress.get('total', 0)
                percentage = self.calculate_progress(progress)

                print(f"  Progreso: {completed}/{total} ({percentage}%)")
                if current:
                    print(f"  Categoría actual: {current}")

            print()

    def print_status_summary(self):
        """Imprimir resumen de estados"""
        print("\n" + "="*80)
        print("📈 RESUMEN POR ESTADO")
        print("="*80 + "\n")

        summary = self.get_status_summary()

        if not summary:
            print("No hay datos disponibles.\n")
            return

        for status, count in sorted(summary.items(), key=lambda x: x[1], reverse=True):
            print(f"  {status.upper():20} : {count}")

        print()

    def print_findings_summary(self):
        """Imprimir resumen de findings"""
        print("\n" + "="*80)
        print("🔍 RESUMEN DE FINDINGS")
        print("="*80 + "\n")

        summary = self.get_severity_summary()
        total = sum(summary.values())

        if total == 0:
            print("No se encontraron findings.\n")
            return

        print(f"  Total: {total}\n")

        severity_order = ['critical', 'high', 'medium', 'low', 'info']
        for severity in severity_order:
            count = summary.get(severity, 0)
            if count > 0:
                emoji = {
                    'critical': '🔴',
                    'high': '🟠',
                    'medium': '🟡',
                    'low': '🟢',
                    'info': 'ℹ️'
                }.get(severity, '⚪')
                print(f"  {emoji} {severity.upper():20} : {count}")

        print()

    def print_active_assessments(self):
        """Imprimir assessments activos con progreso detallado"""
        print("\n" + "="*80)
        print("⏳ ASSESSMENTS EN ANÁLISIS")
        print("="*80 + "\n")

        assessments = self.get_assessments()
        active = [a for a in assessments if a.get('status') in ['analyzing', 'pending', 'uploaded']]

        if not active:
            print("No hay assessments activos en este momento.\n")
            return

        for assessment in active:
            domain = assessment.get('domain', 'N/A')
            status = assessment.get('status', 'N/A')
            progress = assessment.get('analysis_progress', {})

            print(f"  Dominio: {domain}")
            print(f"  Estado: {status}")

            if progress:
                current = progress.get('current', 'N/A')
                completed = progress.get('completed', 0)
                total = progress.get('total', 0)
                percentage = self.calculate_progress(progress)

                # Barra de progreso visual
                bar_length = 40
                filled = int(bar_length * completed / max(total, 1))
                bar = '█' * filled + '░' * (bar_length - filled)

                print(f"  Progreso: [{bar}] {percentage}%")
                print(f"  Completado: {completed}/{total} categorías")
                if current:
                    print(f"  Analizando: {current}")

            print()

    def print_latest_findings(self, limit: int = 10):
        """Imprimir últimos findings"""
        print("\n" + "="*80)
        print(f"🆕 ÚLTIMOS {limit} FINDINGS")
        print("="*80 + "\n")

        findings = self.get_findings()[:limit]

        if not findings:
            print("No se encontraron findings.\n")
            return

        for i, finding in enumerate(findings, 1):
            title = finding.get('title', 'N/A')
            severity = finding.get('severity', 'N/A')
            category = finding.get('category_id', 'N/A')

            emoji = {
                'critical': '🔴',
                'high': '🟠',
                'medium': '🟡',
                'low': '🟢',
                'info': 'ℹ️'
            }.get(severity, '⚪')

            print(f"{i}. {emoji} [{severity.upper()}] {title}")
            print(f"   Categoría: {category}")
            print()

    def print_full_report(self):
        """Imprimir reporte completo"""
        print("\n" + "="*80)
        print("📊 REPORTE DE MONITOREO - ASSESSMENTS")
        print(f"Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*80)

        self.print_status_summary()
        self.print_findings_summary()
        self.print_active_assessments()
        self.print_assessments()
        self.print_latest_findings()


def main():
    """Función principal"""
    monitor = SupabaseMonitor(SUPABASE_URL, ANON_KEY)

    # Verificar conexión
    print("\n🔍 Conectando a Supabase...")
    try:
        response = requests.get(f"{SUPABASE_URL}/rest/v1/", headers=monitor.headers)
        response.raise_for_status()
        print("✅ Conexión exitosa\n")
    except Exception as e:
        print(f"❌ Error de conexión: {e}\n")
        return

    # Imprimir reporte completo
    monitor.print_full_report()

    print("\n" + "="*80)
    print("✅ Reporte completado")
    print("="*80 + "\n")


if __name__ == "__main__":
    main()
