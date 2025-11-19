# Monitoreo de Assessments

Guía completa para monitorear y consultar el progreso de tus assessments de seguridad.

## 📊 Métodos de Monitoreo

### 1. Desde el Dashboard de Supabase (Más Fácil)

#### Ver Assessments en Table Editor

1. Abre el dashboard: `http://10.10.10.77:8000`
2. Ve a **Table Editor** en el menú lateral
3. Selecciona la tabla `assessments`
4. Puedes:
   - Ver todos los registros
   - Filtrar por estado (pending, analyzing, completed, etc.)
   - Ordenar por fecha
   - Ver el progreso en `analysis_progress`

#### Ejecutar Queries SQL

1. Ve a **SQL Editor** en el dashboard
2. Abre el archivo `scripts/queries-assessments.sql`
3. Copia y pega cualquier query que necesites
4. Haz clic en **Run**

### 2. Desde la API REST (Automatizado)

Usa el script `check-assessments.sh` para obtener información rápidamente:

```bash
# Ejecutar el script
./scripts/check-assessments.sh
```

Este script te mostrará:
- ✅ Todos los assessments con su estado
- ✅ Resumen por estado (cuántos pending, analyzing, completed, etc.)
- ✅ Assessments actualmente en análisis con su progreso
- ✅ Total de findings encontrados
- ✅ Findings agrupados por severidad

### 3. Desde psql (Avanzado)

Si tienes acceso directo al contenedor de PostgreSQL:

```bash
# Conectarse a la base de datos
docker exec -it supabase-db psql -U postgres

# Ver assessments
SELECT domain, status, created_at FROM assessments ORDER BY created_at DESC;

# Salir
\q
```

---

## 🔍 Queries SQL Más Útiles

Todas estas queries están en `scripts/queries-assessments.sql`. Aquí están las más importantes:

### Ver Todos los Assessments con Progreso

```sql
SELECT
    domain,
    status,
    analysis_progress->>'current' as categoria_actual,
    (analysis_progress->>'completed')::int as completadas,
    (analysis_progress->>'total')::int as total,
    CASE
        WHEN (analysis_progress->>'total')::int > 0
        THEN ROUND(((analysis_progress->>'completed')::int * 100.0 / (analysis_progress->>'total')::int), 2)
        ELSE 0
    END as porcentaje_completado,
    created_at
FROM assessments
WHERE status IN ('analyzing', 'pending')
ORDER BY created_at DESC;
```

### Ver Assessment Específico con Findings

```sql
SELECT
    a.domain,
    a.status,
    COUNT(f.id) as total_findings,
    COUNT(CASE WHEN f.severity = 'critical' THEN 1 END) as critical,
    COUNT(CASE WHEN f.severity = 'high' THEN 1 END) as high,
    COUNT(CASE WHEN f.severity = 'medium' THEN 1 END) as medium,
    COUNT(CASE WHEN f.severity = 'low' THEN 1 END) as low
FROM assessments a
LEFT JOIN findings f ON a.id = f.assessment_id
WHERE a.id = 'TU-ASSESSMENT-ID'
GROUP BY a.domain, a.status;
```

### Ver Estadísticas Generales

```sql
SELECT
    (SELECT COUNT(*) FROM assessments) as total_assessments,
    (SELECT COUNT(*) FROM assessments WHERE status = 'completed') as completados,
    (SELECT COUNT(*) FROM assessments WHERE status = 'analyzing') as en_analisis,
    (SELECT COUNT(*) FROM findings) as total_findings,
    (SELECT COUNT(*) FROM findings WHERE severity = 'critical') as findings_critical
```

### Ver Últimos Findings Creados

```sql
SELECT
    a.domain,
    f.title,
    f.severity,
    f.category_id,
    f.created_at
FROM findings f
JOIN assessments a ON f.assessment_id = a.id
ORDER BY f.created_at DESC
LIMIT 20;
```

---

## 📋 Estados de Assessments

Los assessments pueden tener estos estados:

| Estado | Descripción |
|--------|-------------|
| `pending` | Creado, esperando comenzar análisis |
| `uploaded` | Archivo subido, esperando procesamiento |
| `analyzing` | Análisis en progreso |
| `completed` | Análisis completado exitosamente |
| `failed` | Error durante el análisis |
| `error` | Error general |

---

## 📈 Estructura de `analysis_progress`

El campo `analysis_progress` es un objeto JSON con esta estructura:

```json
{
  "categories": ["categoria1", "categoria2", ...],
  "current": "categoria-actual",
  "completed": 5,
  "total": 10
}
```

- **categories**: Array de categorías a analizar
- **current**: Categoría que se está analizando actualmente
- **completed**: Número de categorías completadas
- **total**: Total de categorías a analizar

---

## 🔔 Monitoreo en Tiempo Real

### Opción 1: Polling desde la Aplicación Web

Tu aplicación React probablemente ya tiene un sistema de polling que consulta el estado cada X segundos.

### Opción 2: Script de Monitoreo Continuo

Crea un script que revise periódicamente:

```bash
#!/bin/bash
# Monitoreo continuo cada 10 segundos

while true; do
    clear
    echo "=== $(date) ==="
    ./scripts/check-assessments.sh
    sleep 10
done
```

### Opción 3: Watch con psql

```bash
# Ejecutar cada 5 segundos
watch -n 5 'docker exec supabase-db psql -U postgres -c "SELECT domain, status, analysis_progress FROM assessments ORDER BY created_at DESC LIMIT 5"'
```

---

## 🎯 Casos de Uso Comunes

### Ver si hay assessments en progreso

```sql
SELECT domain, status, analysis_progress
FROM assessments
WHERE status IN ('analyzing', 'pending', 'uploaded')
ORDER BY created_at DESC;
```

### Ver cuánto tiempo lleva cada assessment

```sql
SELECT
    domain,
    status,
    created_at,
    updated_at,
    CASE
        WHEN completed_at IS NOT NULL THEN completed_at - created_at
        ELSE NOW() - created_at
    END as duracion
FROM assessments
ORDER BY created_at DESC;
```

### Ver findings críticos pendientes de revisar

```sql
SELECT
    a.domain,
    f.title,
    f.severity,
    f.description,
    f.recommendation
FROM findings f
JOIN assessments a ON f.assessment_id = a.id
WHERE f.severity IN ('critical', 'high')
ORDER BY f.created_at DESC;
```

### Ver categorías más problemáticas

```sql
SELECT
    category_id,
    COUNT(*) as total_findings,
    COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical,
    COUNT(CASE WHEN severity = 'high' THEN 1 END) as high
FROM findings
WHERE category_id IS NOT NULL
GROUP BY category_id
ORDER BY critical DESC, high DESC;
```

---

## 🛠️ Herramientas Disponibles

### Scripts en `scripts/`

1. **`check-assessments.sh`**
   - Monitoreo rápido vía API REST
   - Muestra resumen completo
   - Ejecutable desde terminal

2. **`queries-assessments.sql`**
   - 15 queries SQL predefinidas
   - Para ejecutar en SQL Editor del dashboard
   - Cubren todos los casos de uso comunes

3. **`check-supabase-config.sh`**
   - Verificar configuración de Supabase
   - Útil para troubleshooting

---

## 📊 Dashboard Personalizado (Opcional)

Si quieres crear un dashboard personalizado, puedes usar estas tecnologías:

### Con Metabase (Recomendado)

1. Instalar Metabase
2. Conectar a tu base de datos Supabase
3. Crear dashboards visuales

### Con Grafana

1. Usar plugin de PostgreSQL
2. Conectar a Supabase
3. Crear panels con las queries

### Con Python/Streamlit

```python
import streamlit as st
import psycopg2

# Conectar a Supabase
conn = psycopg2.connect(
    host="10.10.10.77",
    port=5432,
    database="postgres",
    user="postgres",
    password="tu-password"
)

# Crear dashboard
st.title("Assessment Dashboard")
# ... tu código aquí
```

---

## 🔍 Troubleshooting

### Error: "permission denied"

**Problema:** No puedes ejecutar los scripts.

**Solución:**
```bash
chmod +x scripts/*.sh
```

### Error: "connection refused"

**Problema:** No puedes conectar a Supabase.

**Solución:**
1. Verifica que Supabase esté corriendo: `docker ps | grep supabase`
2. Verifica que puedas acceder al dashboard: `http://10.10.10.77:8000`
3. Verifica las credenciales en el script

### No veo datos en las queries

**Problema:** Las queries no devuelven datos.

**Solución:**
1. Verifica que tengas assessments creados
2. Revisa que las migraciones se hayan aplicado correctamente
3. Verifica que estés conectado a la base de datos correcta

---

## 📚 Recursos Adicionales

- [Documentación de Supabase](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [SQL Editor de Supabase](https://supabase.com/docs/guides/database/overview)

---

## ✅ Checklist de Monitoreo

- [ ] Scripts ejecutables (`chmod +x scripts/*.sh`)
- [ ] Puedes acceder al dashboard de Supabase
- [ ] Migraciones aplicadas correctamente
- [ ] API REST responde (probar con `check-assessments.sh`)
- [ ] Puedes ejecutar queries SQL desde el dashboard
- [ ] Conoces el ID de tus assessments para queries específicas

---

¡Todo listo para monitorear tus assessments! 🎉
