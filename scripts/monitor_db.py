#!/usr/bin/env python3
"""
Monitoreo de assessments con conexión directa a PostgreSQL
Uso: python scripts/monitor_db.py
Requiere: pip install psycopg2-binary
"""

import sys
from datetime import datetime
from typing import List, Dict, Any

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    PSYCOPG2_AVAILABLE = True
except ImportError:
    PSYCOPG2_AVAILABLE = False
    print("❌ Este script requiere psycopg2")
    print("Instalar con: pip install psycopg2-binary")
    sys.exit(1)

# Configuración de base de datos
DB_CONFIG = {
    'host': '10.10.10.77',
    'port': 5432,
    'database': 'postgres',
    'user': 'postgres',
    'password': 'your-super-secret-and-long-postgres-password'  # CAMBIAR por tu password
}


class DatabaseMonitor:
    def __init__(self, config: Dict[str, str]):
        self.config = config
        self.conn = None

    def connect(self):
        """Conectar a la base de datos"""
        try:
            self.conn = psycopg2.connect(**self.config)
            print("✅ Conectado a PostgreSQL")
            return True
        except Exception as e:
            print(f"❌ Error de conexión: {e}")
            return False

    def disconnect(self):
        """Desconectar de la base de datos"""
        if self.conn:
            self.conn.close()
            print("✅ Desconectado de PostgreSQL")

    def execute_query(self, query: str, params: tuple = None) -> List[Dict[str, Any]]:
        """Ejecutar query y retornar resultados"""
        try:
            with self.conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(query, params)
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            print(f"❌ Error en query: {e}")
            return []

    def get_assessments_summary(self):
        """Obtener resumen de assessments"""
        query = """
        SELECT
            status,
            COUNT(*) as count,
            MIN(created_at) as oldest,
            MAX(created_at) as newest
        FROM assessments
        GROUP BY status
        ORDER BY count DESC;
        """
        return self.execute_query(query)

    def get_active_assessments(self):
        """Obtener assessments activos con progreso"""
        query = """
        SELECT
            id,
            domain,
            status,
            analysis_progress->>'current' as current_category,
            (analysis_progress->>'completed')::int as completed,
            (analysis_progress->>'total')::int as total,
            CASE
                WHEN (analysis_progress->>'total')::int > 0
                THEN ROUND(((analysis_progress->>'completed')::int * 100.0 / (analysis_progress->>'total')::int), 2)
                ELSE 0
            END as progress_percentage,
            created_at,
            updated_at
        FROM assessments
        WHERE status IN ('analyzing', 'pending', 'uploaded')
        ORDER BY created_at DESC;
        """
        return self.execute_query(query)

    def get_findings_by_severity(self):
        """Obtener findings agrupados por severidad"""
        query = """
        SELECT
            severity,
            COUNT(*) as count
        FROM findings
        GROUP BY severity
        ORDER BY
            CASE severity
                WHEN 'critical' THEN 1
                WHEN 'high' THEN 2
                WHEN 'medium' THEN 3
                WHEN 'low' THEN 4
                WHEN 'info' THEN 5
            END;
        """
        return self.execute_query(query)

    def get_assessments_with_findings(self):
        """Obtener assessments con conteo de findings"""
        query = """
        SELECT
            a.id,
            a.domain,
            a.status,
            COUNT(f.id) as total_findings,
            COUNT(CASE WHEN f.severity = 'critical' THEN 1 END) as critical,
            COUNT(CASE WHEN f.severity = 'high' THEN 1 END) as high,
            COUNT(CASE WHEN f.severity = 'medium' THEN 1 END) as medium,
            COUNT(CASE WHEN f.severity = 'low' THEN 1 END) as low,
            a.created_at
        FROM assessments a
        LEFT JOIN findings f ON a.id = f.assessment_id
        GROUP BY a.id, a.domain, a.status, a.created_at
        ORDER BY a.created_at DESC
        LIMIT 10;
        """
        return self.execute_query(query)

    def get_latest_findings(self, limit: int = 10):
        """Obtener últimos findings"""
        query = """
        SELECT
            a.domain,
            f.title,
            f.severity,
            f.category_id,
            f.description,
            f.created_at
        FROM findings f
        JOIN assessments a ON f.assessment_id = a.id
        ORDER BY f.created_at DESC
        LIMIT %s;
        """
        return self.execute_query(query, (limit,))

    def get_category_analysis(self):
        """Análisis de categorías más problemáticas"""
        query = """
        SELECT
            category_id,
            COUNT(*) as total_findings,
            COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical,
            COUNT(CASE WHEN severity = 'high' THEN 1 END) as high,
            COUNT(CASE WHEN severity = 'medium' THEN 1 END) as medium,
            AVG(CASE
                WHEN severity = 'critical' THEN 5
                WHEN severity = 'high' THEN 4
                WHEN severity = 'medium' THEN 3
                WHEN severity = 'low' THEN 2
                WHEN severity = 'info' THEN 1
            END) as avg_severity_score
        FROM findings
        WHERE category_id IS NOT NULL
        GROUP BY category_id
        ORDER BY avg_severity_score DESC, total_findings DESC
        LIMIT 10;
        """
        return self.execute_query(query)

    def print_summary(self):
        """Imprimir resumen completo"""
        print("\n" + "="*80)
        print("📊 RESUMEN DE ASSESSMENTS")
        print("="*80 + "\n")

        summary = self.get_assessments_summary()
        for row in summary:
            print(f"  {row['status'].upper():20} : {row['count']}")

        print("\n" + "="*80)
        print("⏳ ASSESSMENTS ACTIVOS")
        print("="*80 + "\n")

        active = self.get_active_assessments()
        if not active:
            print("  No hay assessments activos\n")
        else:
            for assessment in active:
                print(f"  Dominio: {assessment['domain']}")
                print(f"  Estado: {assessment['status']}")
                if assessment['total']:
                    print(f"  Progreso: {assessment['completed']}/{assessment['total']} ({assessment['progress_percentage']}%)")
                    if assessment['current_category']:
                        print(f"  Categoría: {assessment['current_category']}")
                print()

        print("="*80)
        print("🔍 FINDINGS POR SEVERIDAD")
        print("="*80 + "\n")

        findings = self.get_findings_by_severity()
        for row in findings:
            emoji = {
                'critical': '🔴',
                'high': '🟠',
                'medium': '🟡',
                'low': '🟢',
                'info': 'ℹ️'
            }.get(row['severity'], '⚪')
            print(f"  {emoji} {row['severity'].upper():20} : {row['count']}")

        print("\n" + "="*80)
        print("📋 ÚLTIMOS ASSESSMENTS CON FINDINGS")
        print("="*80 + "\n")

        assessments_findings = self.get_assessments_with_findings()
        for assessment in assessments_findings:
            print(f"  {assessment['domain']}")
            print(f"    Total: {assessment['total_findings']} | "
                  f"🔴 {assessment['critical']} | "
                  f"🟠 {assessment['high']} | "
                  f"🟡 {assessment['medium']} | "
                  f"🟢 {assessment['low']}")
            print()

        print("="*80)
        print("🆕 ÚLTIMOS 10 FINDINGS")
        print("="*80 + "\n")

        latest = self.get_latest_findings(10)
        for i, finding in enumerate(latest, 1):
            emoji = {
                'critical': '🔴',
                'high': '🟠',
                'medium': '🟡',
                'low': '🟢',
                'info': 'ℹ️'
            }.get(finding['severity'], '⚪')
            print(f"{i}. {emoji} [{finding['severity'].upper()}] {finding['title']}")
            print(f"   Dominio: {finding['domain']} | Categoría: {finding['category_id']}")
            print()

        print("="*80)
        print("📊 CATEGORÍAS MÁS PROBLEMÁTICAS")
        print("="*80 + "\n")

        categories = self.get_category_analysis()
        for category in categories:
            print(f"  {category['category_id']}")
            print(f"    Total: {category['total_findings']} | "
                  f"🔴 {category['critical']} | "
                  f"🟠 {category['high']} | "
                  f"🟡 {category['medium']} | "
                  f"Score: {category['avg_severity_score']:.2f}")
            print()


def main():
    """Función principal"""
    print("\n🔍 Conectando a PostgreSQL...")

    monitor = DatabaseMonitor(DB_CONFIG)

    if not monitor.connect():
        return

    try:
        monitor.print_summary()

        print("\n" + "="*80)
        print("✅ Reporte completado")
        print("="*80 + "\n")

    except Exception as e:
        print(f"\n❌ Error: {e}\n")

    finally:
        monitor.disconnect()


if __name__ == "__main__":
    main()
