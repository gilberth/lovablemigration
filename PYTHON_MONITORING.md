# Monitoreo de Assessments con Python

Scripts Python para monitorear assessments de forma visual y eficiente.

## 📦 Instalación

### Instalar Dependencias

```bash
# Opción 1: Instalar todo
pip install -r requirements.txt

# Opción 2: Solo lo básico (requerido)
pip install requests

# Opción 3: Con interfaz visual mejorada (opcional)
pip install requests rich

# Opción 4: Con conexión directa a PostgreSQL (opcional)
pip install requests psycopg2-binary
```

---

## 🐍 Scripts Disponibles

### 1. `monitor_assessments.py` - Reporte Completo

**Descripción:** Genera un reporte completo del estado de los assessments.

**Uso:**
```bash
python scripts/monitor_assessments.py
```

**Características:**
- ✅ Conexión vía API REST
- ✅ No requiere dependencias extras (solo `requests`)
- ✅ Reporte completo con todas las estadísticas
- ✅ Fácil de usar

**Muestra:**
- Estado de todos los assessments
- Resumen por estado (pending, analyzing, completed, etc.)
- Resumen de findings por severidad
- Assessments activos con progreso detallado
- Últimos 10 findings
- Barra de progreso visual

**Ejemplo de salida:**
```
================================================================================
📊 REPORTE DE MONITOREO - ASSESSMENTS
Fecha: 2025-11-18 23:45:00
================================================================================

================================================================================
📈 RESUMEN POR ESTADO
================================================================================

  COMPLETED            : 5
  ANALYZING            : 2
  PENDING              : 1

================================================================================
🔍 RESUMEN DE FINDINGS
================================================================================

  Total: 45

  🔴 CRITICAL          : 5
  🟠 HIGH              : 12
  🟡 MEDIUM            : 20
  🟢 LOW               : 8
```

---

### 2. `monitor_live.py` - Monitoreo en Tiempo Real

**Descripción:** Monitoreo en tiempo real con interfaz visual interactiva.

**Uso:**
```bash
python scripts/monitor_live.py
```

**Características:**
- ✅ Actualización automática cada 5 segundos
- ✅ Interfaz visual con tablas (si tienes `rich` instalado)
- ✅ Modo básico si no tienes `rich`
- ✅ Presiona Ctrl+C para detener

**Con Rich (recomendado):**
```bash
pip install rich
python scripts/monitor_live.py
```

Verás una interfaz visual con:
- Título y fecha actualizada
- Estadísticas generales en panel
- Tabla de estados de assessments
- Tabla de findings por severidad
- Tabla de assessments activos con progreso

**Sin Rich (modo básico):**
```bash
python scripts/monitor_live.py
```

Actualización simple en terminal cada 5 segundos.

**Configuración:**

Edita el archivo para cambiar el intervalo de actualización:
```python
REFRESH_INTERVAL = 5  # segundos
```

---

### 3. `monitor_db.py` - Conexión Directa a PostgreSQL

**Descripción:** Monitoreo con conexión directa a la base de datos para queries más potentes.

**Uso:**

1. **Configurar password:**

Edita `scripts/monitor_db.py` y cambia:
```python
DB_CONFIG = {
    'host': '10.10.10.77',
    'port': 5432,
    'database': 'postgres',
    'user': 'postgres',
    'password': 'TU-PASSWORD-AQUI'  # ← CAMBIAR
}
```

2. **Instalar dependencia:**
```bash
pip install psycopg2-binary
```

3. **Ejecutar:**
```bash
python scripts/monitor_db.py
```

**Características:**
- ✅ Conexión directa a PostgreSQL
- ✅ Queries SQL optimizadas
- ✅ Análisis de categorías más problemáticas
- ✅ Más rápido que REST API
- ✅ Más opciones de consulta

**Muestra:**
- Resumen de assessments
- Assessments activos con progreso
- Findings por severidad
- Últimos assessments con conteo de findings
- Últimos 10 findings
- Categorías más problemáticas con score

---

## 📊 Comparación de Scripts

| Característica | monitor_assessments.py | monitor_live.py | monitor_db.py |
|----------------|------------------------|-----------------|---------------|
| Tipo de conexión | REST API | REST API | PostgreSQL directo |
| Actualización automática | ❌ | ✅ | ❌ |
| Interfaz visual | Básica | ✅ (con rich) | Básica |
| Dependencias extras | ❌ | rich (opcional) | psycopg2 |
| Velocidad | Media | Media | Rápida |
| Complejidad | Baja | Media | Alta |
| Recomendado para | Reportes rápidos | Monitoreo continuo | Análisis avanzado |

---

## 🚀 Guía de Inicio Rápido

### Para empezar rápido (sin instalar nada extra):

```bash
# Solo necesitas requests (probablemente ya lo tienes)
pip install requests

# Ejecutar
python scripts/monitor_assessments.py
```

### Para monitoreo visual en tiempo real:

```bash
# Instalar rich para interfaz bonita
pip install rich

# Ejecutar
python scripts/monitor_live.py
```

### Para análisis avanzado:

```bash
# Instalar psycopg2
pip install psycopg2-binary

# Configurar password en el script
# Ejecutar
python scripts/monitor_db.py
```

---

## 🔧 Personalización

### Cambiar URL de Supabase

En cada script, modifica:
```python
SUPABASE_URL = "http://10.10.10.77:8000"
ANON_KEY = "tu-anon-key-aqui"
```

### Cambiar intervalo de actualización (monitor_live.py)

```python
REFRESH_INTERVAL = 10  # actualizar cada 10 segundos
```

### Modificar queries (monitor_db.py)

Puedes agregar tus propias funciones de query:

```python
def get_custom_data(self):
    query = """
    SELECT * FROM assessments WHERE status = 'analyzing';
    """
    return self.execute_query(query)
```

---

## 💡 Casos de Uso

### Ver estado general rápidamente

```bash
python scripts/monitor_assessments.py
```

### Monitorear un análisis en progreso

```bash
python scripts/monitor_live.py
# Deja corriendo mientras el assessment se procesa
```

### Análisis detallado de findings

```bash
python scripts/monitor_db.py
# Ver categorías más problemáticas y análisis profundo
```

### Integración en Scripts

```python
from scripts.monitor_assessments import AssessmentMonitor

monitor = AssessmentMonitor(SUPABASE_URL, ANON_KEY)
stats = monitor.get_stats()

if stats['active_assessments']:
    print("Hay assessments activos!")
```

---

## 🐛 Troubleshooting

### Error: "ModuleNotFoundError: No module named 'requests'"

**Solución:**
```bash
pip install requests
```

### Error: "Connection refused" o "Timeout"

**Problema:** No puede conectar a Supabase.

**Soluciones:**
1. Verifica que Supabase esté corriendo: `curl http://10.10.10.77:8000/rest/v1/`
2. Verifica la URL en el script
3. Verifica tu firewall/red

### Error: "authentication failed" (monitor_db.py)

**Problema:** Password incorrecta de PostgreSQL.

**Solución:**
1. Verifica el password en el script
2. O usa los otros scripts que usan REST API (no requieren password de DB)

### La interfaz visual no se ve bien (monitor_live.py)

**Solución:**
```bash
# Instalar rich
pip install rich

# O usar el modo básico (funciona sin rich)
python scripts/monitor_live.py
```

### Caracteres raros en la terminal

**Problema:** Tu terminal no soporta UTF-8.

**Solución:**
```bash
# En Linux/Mac
export LANG=en_US.UTF-8

# En Windows, usar Windows Terminal o actualizar cmd
```

---

## 📈 Ejemplos Avanzados

### Monitoreo con Notificaciones

```python
from scripts.monitor_assessments import AssessmentMonitor
import time

monitor = AssessmentMonitor(SUPABASE_URL, ANON_KEY)

while True:
    stats = monitor.get_stats()

    # Notificar si hay critical findings
    critical = stats['severity_counts'].get('critical', 0)
    if critical > 0:
        print(f"⚠️ ALERTA: {critical} findings críticos!")

    time.sleep(60)
```

### Exportar a JSON

```python
from scripts.monitor_assessments import AssessmentMonitor
import json

monitor = AssessmentMonitor(SUPABASE_URL, ANON_KEY)
stats = monitor.get_stats()

with open('report.json', 'w') as f:
    json.dump(stats, f, indent=2)

print("✅ Reporte guardado en report.json")
```

### Monitoreo Programado (cron)

```bash
# Agregar a crontab para ejecutar cada hora
0 * * * * cd /ruta/a/proyecto && python scripts/monitor_assessments.py >> monitor.log 2>&1
```

---

## 📚 Recursos Adicionales

- [Documentación de requests](https://requests.readthedocs.io/)
- [Documentación de rich](https://rich.readthedocs.io/)
- [Documentación de psycopg2](https://www.psycopg.org/docs/)
- [REST API de Supabase](https://supabase.com/docs/guides/api)

---

## ✅ Checklist de Configuración

- [ ] Python 3.7+ instalado
- [ ] `requests` instalado (`pip install requests`)
- [ ] URLs y keys configuradas en los scripts
- [ ] Supabase accesible desde tu red
- [ ] (Opcional) `rich` instalado para interfaz visual
- [ ] (Opcional) `psycopg2-binary` instalado para conexión DB
- [ ] (Opcional) Password de PostgreSQL configurada en `monitor_db.py`

---

¡Listo para monitorear tus assessments con Python! 🎉
