-- ============================================================================
-- QUERIES ÚTILES PARA MONITOREAR ASSESSMENTS
-- Ejecutar en Supabase Dashboard > SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. VISTA GENERAL DE ASSESSMENTS
-- ============================================================================

SELECT
    id,
    domain,
    status,
    created_at,
    updated_at,
    analysis_progress->>'current' as categoria_actual,
    analysis_progress->>'completed' as completadas,
    analysis_progress->>'total' as total_categorias
FROM assessments
ORDER BY created_at DESC
LIMIT 20;


-- ============================================================================
-- 2. PROGRESO DETALLADO CON PORCENTAJE
-- ============================================================================

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
    created_at,
    updated_at
FROM assessments
WHERE status IN ('analyzing', 'pending', 'uploaded')
ORDER BY created_at DESC;


-- ============================================================================
-- 3. RESUMEN DE ESTADOS
-- ============================================================================

SELECT
    status,
    COUNT(*) as cantidad,
    MIN(created_at) as mas_antiguo,
    MAX(created_at) as mas_reciente
FROM assessments
GROUP BY status
ORDER BY cantidad DESC;


-- ============================================================================
-- 4. ASSESSMENT ESPECÍFICO CON FINDINGS
-- Reemplaza 'ASSESSMENT-ID-AQUI' con el ID real
-- ============================================================================

SELECT
    a.id,
    a.domain,
    a.status,
    a.created_at,
    a.analysis_progress,
    COUNT(f.id) as total_findings,
    COUNT(CASE WHEN f.severity = 'critical' THEN 1 END) as critical,
    COUNT(CASE WHEN f.severity = 'high' THEN 1 END) as high,
    COUNT(CASE WHEN f.severity = 'medium' THEN 1 END) as medium,
    COUNT(CASE WHEN f.severity = 'low' THEN 1 END) as low,
    COUNT(CASE WHEN f.severity = 'info' THEN 1 END) as info
FROM assessments a
LEFT JOIN findings f ON a.id = f.assessment_id
WHERE a.id = 'ASSESSMENT-ID-AQUI'
GROUP BY a.id, a.domain, a.status, a.created_at, a.analysis_progress;


-- ============================================================================
-- 5. TODOS LOS ASSESSMENTS CON CONTEO DE FINDINGS
-- ============================================================================

SELECT
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
ORDER BY a.created_at DESC;


-- ============================================================================
-- 6. ÚLTIMOS FINDINGS CREADOS
-- ============================================================================

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
LIMIT 20;


-- ============================================================================
-- 7. FINDINGS POR CATEGORÍA
-- ============================================================================

SELECT
    category_id,
    severity,
    COUNT(*) as cantidad
FROM findings
WHERE category_id IS NOT NULL
GROUP BY category_id, severity
ORDER BY category_id,
    CASE severity
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
        WHEN 'info' THEN 5
    END;


-- ============================================================================
-- 8. ASSESSMENTS COMPLETADOS RECIENTEMENTE
-- ============================================================================

SELECT
    domain,
    status,
    completed_at,
    created_at,
    completed_at - created_at as duracion
FROM assessments
WHERE status = 'completed'
ORDER BY completed_at DESC
LIMIT 10;


-- ============================================================================
-- 9. ASSESSMENTS CON ERRORES
-- ============================================================================

SELECT
    domain,
    status,
    created_at,
    updated_at,
    analysis_progress
FROM assessments
WHERE status IN ('error', 'failed')
ORDER BY updated_at DESC;


-- ============================================================================
-- 10. ESTADÍSTICAS GENERALES
-- ============================================================================

SELECT
    (SELECT COUNT(*) FROM assessments) as total_assessments,
    (SELECT COUNT(*) FROM assessments WHERE status = 'completed') as completados,
    (SELECT COUNT(*) FROM assessments WHERE status = 'analyzing') as en_analisis,
    (SELECT COUNT(*) FROM assessments WHERE status = 'pending') as pendientes,
    (SELECT COUNT(*) FROM assessments WHERE status IN ('error', 'failed')) as con_errores,
    (SELECT COUNT(*) FROM findings) as total_findings,
    (SELECT COUNT(*) FROM findings WHERE severity = 'critical') as findings_critical,
    (SELECT COUNT(*) FROM findings WHERE severity = 'high') as findings_high;


-- ============================================================================
-- 11. FINDING ESPECÍFICO CON DETALLES COMPLETOS
-- Reemplaza 'FINDING-ID-AQUI' con el ID real
-- ============================================================================

SELECT
    f.*,
    a.domain as assessment_domain,
    a.status as assessment_status
FROM findings f
JOIN assessments a ON f.assessment_id = a.id
WHERE f.id = 'FINDING-ID-AQUI';


-- ============================================================================
-- 12. TOP 10 FINDINGS POR SEVERIDAD
-- ============================================================================

SELECT
    a.domain,
    f.title,
    f.severity,
    f.description,
    f.recommendation,
    f.created_at
FROM findings f
JOIN assessments a ON f.assessment_id = a.id
WHERE f.severity IN ('critical', 'high')
ORDER BY
    CASE f.severity
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
    END,
    f.created_at DESC
LIMIT 10;


-- ============================================================================
-- 13. ASSESSMENT DATA (datos raw)
-- ============================================================================

SELECT
    a.domain,
    ad.data,
    ad.received_at
FROM assessment_data ad
JOIN assessments a ON ad.assessment_id = a.id
ORDER BY ad.received_at DESC
LIMIT 5;


-- ============================================================================
-- 14. ANÁLISIS DE CATEGORÍAS MÁS PROBLEMÁTICAS
-- ============================================================================

SELECT
    category_id,
    COUNT(*) as total_findings,
    COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical,
    COUNT(CASE WHEN severity = 'high' THEN 1 END) as high,
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
ORDER BY avg_severity_score DESC, total_findings DESC;


-- ============================================================================
-- 15. HISTORIAL DE CAMBIOS DE ESTADO
-- (requiere activar tracking de cambios o logs)
-- ============================================================================

SELECT
    domain,
    status,
    created_at,
    updated_at,
    completed_at,
    CASE
        WHEN completed_at IS NOT NULL THEN completed_at - created_at
        ELSE NOW() - created_at
    END as tiempo_transcurrido
FROM assessments
ORDER BY created_at DESC
LIMIT 20;
