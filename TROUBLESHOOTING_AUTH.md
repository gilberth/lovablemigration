# Solución de Problemas de Autenticación - Supabase Self-Hosted

## Error Detectado

```
10.10.10.77:8000/auth/v1/signup - 500 (Internal Server Error)
```

## Diagnóstico y Soluciones

### Paso 1: Verificar Logs del Servidor Supabase

Primero, necesitas ver qué está causando el error 500. Conéctate a tu servidor donde corre Supabase:

```bash
# Si usas Docker (lo más común)
docker logs supabase-auth

# O si tienes docker-compose
docker-compose logs auth

# Ver logs en tiempo real
docker logs -f supabase-auth
```

Busca en los logs mensajes de error relacionados con SMTP, JWT, o configuración.

### Paso 2: Configuración Mínima para Desarrollo (Sin SMTP)

Si no tienes SMTP configurado y solo quieres probar, edita tu configuración de Supabase:

**Para instalaciones con Docker Compose:**

Edita `docker-compose.yml` o tu archivo `.env` y agrega/modifica:

```env
# Deshabilitar confirmación de email (SOLO DESARROLLO)
GOTRUE_MAILER_AUTOCONFIRM=true
GOTRUE_DISABLE_SIGNUP=false

# URLs permitidas
GOTRUE_SITE_URL=http://10.10.10.113:8080
GOTRUE_ADDITIONAL_REDIRECT_URLS=http://localhost:5173,http://10.10.10.113:8080

# Configuración de email (mock para desarrollo)
GOTRUE_SMTP_ADMIN_EMAIL=admin@localhost
GOTRUE_SMTP_HOST=localhost
GOTRUE_SMTP_PORT=1025

# JWT Secret (cámbialo por uno seguro)
GOTRUE_JWT_SECRET=your-super-secret-jwt-token-with-at-least-32-characters-long
```

**Después de cambiar, reinicia los servicios:**

```bash
docker-compose down
docker-compose up -d

# O si es un contenedor específico
docker restart supabase-auth
```

### Paso 3: Configuración con SMTP Real (Producción)

Si quieres configuración completa con emails reales:

#### Opción A: Usar Gmail

```env
GOTRUE_MAILER_AUTOCONFIRM=false
GOTRUE_SMTP_ADMIN_EMAIL=tu-email@gmail.com
GOTRUE_SMTP_HOST=smtp.gmail.com
GOTRUE_SMTP_PORT=587
GOTRUE_SMTP_USER=tu-email@gmail.com
GOTRUE_SMTP_PASS=tu-app-password
GOTRUE_SMTP_SENDER_NAME=Tu Aplicación
GOTRUE_MAILER_SUBJECTS_CONFIRMATION=Confirma tu cuenta
```

**Nota:** Para Gmail, necesitas crear una "App Password" en tu cuenta de Google:
1. Ve a https://myaccount.google.com/security
2. Activa verificación en 2 pasos
3. Genera una "App Password"
4. Usa esa password en `GOTRUE_SMTP_PASS`

#### Opción B: Usar Mailgun, SendGrid, u otros

```env
# Ejemplo con Mailgun
GOTRUE_SMTP_HOST=smtp.mailgun.org
GOTRUE_SMTP_PORT=587
GOTRUE_SMTP_USER=postmaster@tu-dominio.mailgun.org
GOTRUE_SMTP_PASS=tu-api-key
```

### Paso 4: Verificar JWT Secret

El JWT secret debe tener al menos 32 caracteres. Verifica que esté configurado:

```bash
# Generar un JWT secret seguro
openssl rand -base64 32

# Agrégalo a tu configuración
GOTRUE_JWT_SECRET=el-resultado-del-comando-anterior
```

### Paso 5: Verificar en el Dashboard de Supabase

1. Ve a `http://10.10.10.77:8000`
2. Navega a **Authentication** > **Settings**
3. Verifica:
   - ✅ "Enable Email Signup" está activado
   - ✅ "Confirm Email" puede estar deshabilitado para desarrollo
   - ✅ La URL del sitio está configurada correctamente

### Paso 6: Alternativa - Desactivar Autenticación Temporalmente

Si quieres probar tu aplicación sin autenticación por ahora, puedes modificar temporalmente tu código:

**Editar `src/components/ProtectedRoute.tsx`:**

```typescript
// Temporalmente deshabilitar protección (SOLO PARA TESTING)
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // Comentar la protección real
  // const { session, loading } = useSession();
  // if (loading) return <div>Loading...</div>;
  // if (!session) return <Navigate to="/auth" />;

  // Permitir acceso directo para testing
  return <>{children}</>;
}
```

**IMPORTANTE:** Esta solución es SOLO para testing local. NO la uses en producción.

## Checklist de Verificación

- [ ] Logs del servidor Supabase revisados
- [ ] Variables de entorno de autenticación configuradas
- [ ] Servicios de Supabase reiniciados después de cambios
- [ ] SMTP configurado O auto-confirmación habilitada
- [ ] JWT secret configurado (mínimo 32 caracteres)
- [ ] URLs de redirección agregadas a GOTRUE_ADDITIONAL_REDIRECT_URLS
- [ ] Intentar signup nuevamente desde la aplicación

## Comandos Útiles

```bash
# Ver configuración actual de Supabase Auth
docker exec supabase-auth env | grep GOTRUE

# Reiniciar solo el servicio de auth
docker restart supabase-auth

# Ver logs en tiempo real
docker logs -f supabase-auth

# Verificar que el puerto 8000 esté accesible
curl http://10.10.10.77:8000/health

# Probar endpoint de auth directamente
curl http://10.10.10.77:8000/auth/v1/health
```

## Si Nada Funciona

### Opción 1: Usar Supabase Cloud (gratis)

Si la instancia self-hosted te está dando problemas, puedes usar Supabase Cloud para desarrollo:

1. Ve a https://supabase.com
2. Crea un proyecto gratuito
3. Obtén las credenciales
4. Actualiza tu `.env`:
   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=tu-anon-key
   ```

### Opción 2: Reinstalar Supabase Self-Hosted

Si la instalación está corrupta:

```bash
# Backup de datos primero
docker exec supabase-db pg_dump -U postgres > backup.sql

# Reinstalar
docker-compose down -v
docker-compose up -d
```

## Próximo Paso

Una vez que apliques los cambios:

1. Reinicia los servicios de Supabase
2. Limpia el caché del navegador (Ctrl+Shift+R)
3. Intenta registrarte nuevamente en tu aplicación
4. Compárteme los nuevos logs si sigues teniendo errores

## Referencias

- [Supabase Self-Hosting Docs](https://supabase.com/docs/guides/self-hosting)
- [GoTrue Configuration](https://github.com/supabase/gotrue#configuration)
- [Supabase Auth Settings](https://supabase.com/docs/guides/auth)
