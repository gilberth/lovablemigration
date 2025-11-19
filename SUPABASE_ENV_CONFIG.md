# Configuración del archivo .env para Supabase Self-Hosted

## 🎯 Problema a Resolver

Error 500 en `/auth/v1/signup` - Tu Supabase necesita las variables de entorno correctamente configuradas.

## 📍 Ubicación del archivo .env

El archivo `.env` debe estar en el **mismo directorio** que tu `docker-compose.yml` en el servidor Supabase.

```
/ruta/a/supabase/
├── docker-compose.yml
├── .env              ← ESTE ARCHIVO
└── ... otros archivos
```

## 🔧 Pasos para Configurar

### 1. Conectarte a tu servidor Supabase

```bash
ssh usuario@10.10.10.77
```

### 2. Ir al directorio de Supabase

```bash
cd /ruta/donde/esta/docker-compose.yml
```

### 3. Verificar archivo .env actual

```bash
# Ver si existe
ls -la .env

# Ver contenido actual
cat .env
```

### 4. Editar el archivo .env

```bash
# Opción A: Con nano
nano .env

# Opción B: Con vim
vim .env

# Opción C: Con vi
vi .env
```

### 5. Configuración Mínima para DESARROLLO (sin SMTP)

Agrega o modifica estas líneas en tu `.env`:

```bash
# URLs
API_EXTERNAL_URL=http://10.10.10.77:8000
SITE_URL=http://10.10.10.113:8080
ADDITIONAL_REDIRECT_URLS=http://localhost:5173,http://10.10.10.113:8080

# Signup habilitado
DISABLE_SIGNUP=false

# Base de datos (verifica que coincida con tu configuración)
POSTGRES_HOST=db
POSTGRES_PORT=5432
POSTGRES_DB=postgres
POSTGRES_PASSWORD=tu-password-actual-no-cambiar-si-ya-existe

# JWT Secret (GENERA UNO NUEVO si no existe)
JWT_SECRET=tu-secret-jwt-de-al-menos-32-caracteres
JWT_EXPIRY=3600

# Email - AUTO CONFIRMACIÓN HABILITADA (para desarrollo)
ENABLE_EMAIL_SIGNUP=true
ENABLE_EMAIL_AUTOCONFIRM=true

# SMTP (configuración mínima para desarrollo)
SMTP_ADMIN_EMAIL=admin@localhost
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
SMTP_SENDER_NAME=Supabase

# URLs de mailer
MAILER_URLPATHS_INVITE=/auth/v1/verify
MAILER_URLPATHS_CONFIRMATION=/auth/v1/verify
MAILER_URLPATHS_RECOVERY=/auth/v1/verify
MAILER_URLPATHS_EMAIL_CHANGE=/auth/v1/verify

# Teléfono y anónimos (deshabilitados)
ENABLE_PHONE_SIGNUP=false
ENABLE_PHONE_AUTOCONFIRM=false
ENABLE_ANONYMOUS_USERS=false
```

### 6. Generar JWT_SECRET seguro

Si no tienes un `JWT_SECRET` configurado o quieres generar uno nuevo:

```bash
openssl rand -base64 32
```

Copia el resultado y úsalo como valor de `JWT_SECRET` en tu `.env`.

**IMPORTANTE:** Si ya tienes un JWT_SECRET existente y tu base de datos tiene usuarios, **NO LO CAMBIES** o invalidarás todas las sesiones.

### 7. Guardar el archivo

- **En nano:** `Ctrl+O` (guardar), `Enter`, `Ctrl+X` (salir)
- **En vim:** `Esc`, `:wq`, `Enter`
- **En vi:** `Esc`, `:wq`, `Enter`

### 8. Reiniciar Supabase

```bash
# Detener todos los servicios
docker-compose down

# Iniciar nuevamente
docker-compose up -d

# Ver logs del servicio de auth
docker-compose logs -f auth
```

### 9. Verificar que funcione

```bash
# Verificar que auth responda
curl http://10.10.10.77:8000/auth/v1/health

# Deberías ver algo como: {"version":"...","name":"GoTrue"}
```

## 🔍 Verificar Variables Configuradas

Para ver qué variables tiene configurado tu contenedor de auth:

```bash
# Ver todas las variables de GOTRUE
docker exec supabase-auth env | grep GOTRUE

# Ver variables específicas
docker exec supabase-auth env | grep -E "AUTOCONFIRM|JWT_SECRET|SMTP"
```

## ✅ Checklist de Configuración

- [ ] Archivo `.env` existe en el mismo directorio que `docker-compose.yml`
- [ ] `API_EXTERNAL_URL` configurado con tu IP: `http://10.10.10.77:8000`
- [ ] `SITE_URL` configurado con la URL de tu app
- [ ] `ADDITIONAL_REDIRECT_URLS` incluye todas tus URLs de desarrollo
- [ ] `ENABLE_EMAIL_AUTOCONFIRM=true` (para desarrollo sin SMTP)
- [ ] `JWT_SECRET` tiene al menos 32 caracteres
- [ ] `DISABLE_SIGNUP=false` (para permitir registro)
- [ ] `POSTGRES_PASSWORD` configurado (usa el existente si ya tienes datos)
- [ ] Servicios reiniciados con `docker-compose down && docker-compose up -d`
- [ ] Endpoint `/auth/v1/health` responde correctamente

## 🚨 Solución de Problemas

### Error: "Environment variable not set"

**Problema:** Docker Compose no encuentra las variables del `.env`.

**Solución:**
1. Verifica que el archivo se llame exactamente `.env` (con el punto al inicio)
2. Verifica que esté en el mismo directorio que `docker-compose.yml`
3. No debe tener espacios en los nombres de variables

### Error: "JWT secret is too short"

**Problema:** `JWT_SECRET` tiene menos de 32 caracteres.

**Solución:**
```bash
# Generar un secret válido
openssl rand -base64 32
```

### Error: "Database connection failed"

**Problema:** Las credenciales de PostgreSQL son incorrectas.

**Solución:**
1. Verifica que `POSTGRES_PASSWORD` sea la correcta
2. No cambies este valor si ya tienes una base de datos existente
3. Verifica que el contenedor `db` esté corriendo: `docker ps | grep db`

### Los cambios no se aplican

**Problema:** Docker Compose no recarga las variables.

**Solución:**
```bash
# Parar completamente
docker-compose down

# Verificar que ningún contenedor esté corriendo
docker ps | grep supabase

# Iniciar nuevamente
docker-compose up -d
```

## 📝 Archivo de Ejemplo Completo

Puedes usar el archivo `supabase-server.env.example` de este repositorio como referencia completa.

## 🔄 Después de Configurar

1. Reinicia tu aplicación web (Ctrl+Shift+R)
2. Intenta registrarte nuevamente
3. Con `ENABLE_EMAIL_AUTOCONFIRM=true`, el registro debería funcionar sin necesidad de confirmar email

## 📞 Siguiente Paso

Si después de aplicar esta configuración sigues teniendo errores:

1. Revisa los logs: `docker-compose logs -f auth`
2. Ejecuta el script de diagnóstico de este repositorio
3. Comparte los logs para ayudarte más específicamente
