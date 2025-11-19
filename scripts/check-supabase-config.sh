#!/bin/bash

# Script para verificar la configuración de Supabase Self-Hosted
# Uso: ./scripts/check-supabase-config.sh

echo "🔍 Verificando configuración de Supabase Self-Hosted..."
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar si Docker está corriendo
if ! docker ps > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker no está corriendo o no tienes permisos${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker está corriendo${NC}"
echo ""

# Verificar contenedores de Supabase
echo "📦 Contenedores de Supabase:"
docker ps --filter "name=supabase" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

# Verificar si hay contenedor de auth
AUTH_CONTAINER=$(docker ps --filter "name=auth" --format "{{.Names}}" | head -n 1)

if [ -z "$AUTH_CONTAINER" ]; then
    echo -e "${YELLOW}⚠️  No se encontró contenedor de auth específico${NC}"
    echo "   Buscando contenedor principal de Supabase..."
    AUTH_CONTAINER=$(docker ps --filter "name=supabase" --format "{{.Names}}" | head -n 1)
fi

if [ -z "$AUTH_CONTAINER" ]; then
    echo -e "${RED}❌ No se encontró ningún contenedor de Supabase${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Usando contenedor: $AUTH_CONTAINER${NC}"
echo ""

# Verificar variables de entorno importantes
echo "🔧 Variables de entorno de autenticación:"
echo "────────────────────────────────────────"

check_env_var() {
    local var_name=$1
    local var_value=$(docker exec $AUTH_CONTAINER printenv $var_name 2>/dev/null)

    if [ -z "$var_value" ]; then
        echo -e "${RED}❌ $var_name: NO CONFIGURADA${NC}"
        return 1
    else
        # Ocultar valores sensibles
        if [[ $var_name == *"SECRET"* ]] || [[ $var_name == *"PASS"* ]]; then
            echo -e "${GREEN}✅ $var_name: ********${NC}"
        else
            echo -e "${GREEN}✅ $var_name: $var_value${NC}"
        fi
        return 0
    fi
}

check_env_var "GOTRUE_JWT_SECRET"
check_env_var "GOTRUE_SITE_URL"
check_env_var "GOTRUE_MAILER_AUTOCONFIRM"
check_env_var "GOTRUE_DISABLE_SIGNUP"
check_env_var "GOTRUE_SMTP_HOST"
check_env_var "GOTRUE_SMTP_PORT"
check_env_var "GOTRUE_SMTP_ADMIN_EMAIL"

echo ""

# Verificar conectividad
echo "🌐 Verificando conectividad:"
echo "────────────────────────────────────────"

# Verificar puerto 8000
if curl -s http://10.10.10.77:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Supabase responde en http://10.10.10.77:8000${NC}"
else
    echo -e "${RED}❌ No se puede conectar a http://10.10.10.77:8000${NC}"
fi

# Verificar endpoint de auth
if curl -s http://10.10.10.77:8000/auth/v1/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Auth endpoint respondiendo${NC}"
else
    echo -e "${RED}❌ Auth endpoint no responde${NC}"
fi

echo ""

# Verificar logs recientes
echo "📋 Últimos logs del servicio de auth:"
echo "────────────────────────────────────────"
docker logs --tail 20 $AUTH_CONTAINER 2>&1 | grep -i "error\|warn\|smtp\|jwt" || echo "No se encontraron errores recientes"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 Recomendaciones:"
echo ""

# Verificar GOTRUE_MAILER_AUTOCONFIRM
AUTOCONFIRM=$(docker exec $AUTH_CONTAINER printenv GOTRUE_MAILER_AUTOCONFIRM 2>/dev/null)
if [ "$AUTOCONFIRM" != "true" ]; then
    echo -e "${YELLOW}⚠️  GOTRUE_MAILER_AUTOCONFIRM no está en 'true'${NC}"
    echo "   Para desarrollo sin SMTP, configura:"
    echo "   GOTRUE_MAILER_AUTOCONFIRM=true"
    echo ""
fi

# Verificar JWT_SECRET
JWT_SECRET=$(docker exec $AUTH_CONTAINER printenv GOTRUE_JWT_SECRET 2>/dev/null)
if [ -z "$JWT_SECRET" ]; then
    echo -e "${YELLOW}⚠️  GOTRUE_JWT_SECRET no está configurado${NC}"
    echo "   Genera uno con: openssl rand -base64 32"
    echo ""
fi

# Verificar SMTP
SMTP_HOST=$(docker exec $AUTH_CONTAINER printenv GOTRUE_SMTP_HOST 2>/dev/null)
if [ -z "$SMTP_HOST" ] && [ "$AUTOCONFIRM" != "true" ]; then
    echo -e "${YELLOW}⚠️  SMTP no configurado y auto-confirm deshabilitado${NC}"
    echo "   Configura SMTP o habilita GOTRUE_MAILER_AUTOCONFIRM=true"
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Para ver la guía completa de solución de problemas:"
echo "cat TROUBLESHOOTING_AUTH.md"
echo ""
