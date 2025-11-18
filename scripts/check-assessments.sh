#!/bin/bash

# Script para monitorear assessments en Supabase
# Uso: ./scripts/check-assessments.sh

SUPABASE_URL="http://10.10.10.77:8000"
ANON_KEY="eeyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzYzMzU1NjAwLCJleHAiOjE5MjExMjIwMDB9.OzXw4tdhXGo59s1KqnAWD8O9XpdN3dcHTazxY0uL0Go"

echo "🔍 Verificando Assessments en Supabase..."
echo ""

# Función para hacer queries
query_supabase() {
    local table=$1
    local select=$2
    local filter=$3

    curl -s "${SUPABASE_URL}/rest/v1/${table}?select=${select}${filter}" \
        -H "apikey: ${ANON_KEY}" \
        -H "Authorization: Bearer ${ANON_KEY}" \
        -H "Content-Type: application/json"
}

# Obtener todos los assessments
echo "📊 Todos los Assessments:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
query_supabase "assessments" "id,domain,status,created_at,analysis_progress" "&order=created_at.desc" | jq -r '.[] | "ID: \(.id)\nDominio: \(.domain)\nEstado: \(.status)\nProgreso: \(.analysis_progress)\nCreado: \(.created_at)\n"'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Conteo por estado
echo "📈 Resumen por Estado:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
query_supabase "assessments" "status" "" | jq -r 'group_by(.status) | map({status: .[0].status, count: length}) | .[] | "\(.status): \(.count)"'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Assessments en progreso
echo "⏳ Assessments en Análisis:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
query_supabase "assessments" "domain,status,analysis_progress" "&status=eq.analyzing" | jq -r '.[] | "Dominio: \(.domain)\nProgreso: \(.analysis_progress.completed)/\(.analysis_progress.total) categorías\nActual: \(.analysis_progress.current)\n"'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Total de findings
echo "🔎 Total de Findings:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
TOTAL_FINDINGS=$(query_supabase "findings" "id" "" | jq '. | length')
echo "Total: ${TOTAL_FINDINGS}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Findings por severidad
echo "⚠️  Findings por Severidad:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
query_supabase "findings" "severity" "" | jq -r 'group_by(.severity) | map({severity: .[0].severity, count: length}) | sort_by(.severity) | .[] | "\(.severity): \(.count)"'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
