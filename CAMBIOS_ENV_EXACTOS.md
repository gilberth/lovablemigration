# Cambios Exactos para tu .env

## 🎯 Problema

Tu `.env` tiene configuraciones incorrectas que causan el error 500 en signup.

## ✏️ Cambios que Debes Hacer

Edita tu archivo `.env` en el servidor y cambia **SOLO** estas líneas:

### 1. En la sección "Auth - Configuration for the GoTrue authentication server"

**Busca esta línea:**
```bash
SITE_URL=http://10.10.10.77:3000
```

**Cámbiala a:**
```bash
SITE_URL=http://10.10.10.113:8080
```

---

**Busca esta línea:**
```bash
ADDITIONAL_REDIRECT_URLS=
```

**Cámbiala a:**
```bash
ADDITIONAL_REDIRECT_URLS=http://localhost:5173,http://10.10.10.113:8080
```

---

**Busca esta línea:**
```bash
ENABLE_EMAIL_AUTOCONFIRM=false
```

**Cámbiala a:**
```bash
ENABLE_EMAIL_AUTOCONFIRM=true
```

---

**Busca esta línea:**
```bash
SMTP_ADMIN_EMAIL=admin@example.com
```

**Cámbiala a:**
```bash
SMTP_ADMIN_EMAIL=admin@localhost
```

---

**Busca esta línea:**
```bash
SMTP_HOST=supabase-mail
```

**Cámbiala a:**
```bash
SMTP_HOST=localhost
```

---

**Busca esta línea:**
```bash
SMTP_PORT=2500
```

**Cámbiala a:**
```bash
SMTP_PORT=1025
```

---

**Busca esta línea:**
```bash
SMTP_USER=fake_mail_user
```

**Cámbiala a:**
```bash
SMTP_USER=
```
(déjala vacía, sin nada después del `=`)

---

**Busca esta línea:**
```bash
SMTP_PASS=fake_mail_password
```

**Cámbiala a:**
```bash
SMTP_PASS=
```
(déjala vacía, sin nada después del `=`)

---

**Busca esta línea:**
```bash
SMTP_SENDER_NAME=fake_sender
```

**Cámbiala a:**
```bash
SMTP_SENDER_NAME=Supabase
```

---

**Busca esta línea:**
```bash
ENABLE_PHONE_SIGNUP=true
```

**Cámbiala a:**
```bash
ENABLE_PHONE_SIGNUP=false
```

---

**Busca esta línea:**
```bash
ENABLE_PHONE_AUTOCONFIRM=true
```

**Cámbiala a:**
```bash
ENABLE_PHONE_AUTOCONFIRM=false
```

---

### 2. Al FINAL del archivo

**Elimina estas líneas** (que agregaste al final):

```bash
# Deshabilitar confirmación de email (SOLO DESARROLLO)
GOTRUE_MAILER_AUTOCONFIRM=true
GOTRUE_DISABLE_SIGNUP=false

# URLs permitidas
GOTRUE_SITE_URL=http://10.10.10.113:8080
GOTRUE_ADDITIONAL_REDIRECT_URLS=http://localhost:5173,http://10.10.10.113:8080

# Email mock (para desarrollo)
GOTRUE_SMTP_ADMIN_EMAIL=admin@localhost
GOTRUE_SMTP_HOST=localhost
GOTRUE_SMTP_PORT=1025

# JWT Secret (genera uno con: openssl rand -base64 32)
GOTRUE_JWT_SECRET=tu-secret-de-al-menos-32-caracteres-aqui
```

**⚠️ IMPORTANTE:** Elimina toda esa sección final. Las variables con prefijo `GOTRUE_` no funcionan con tu configuración de docker-compose.yml. Las correctas son las que modificaste arriba (sin el prefijo `GOTRUE_`).

---

## 📝 Comandos para Aplicar los Cambios

### En tu servidor (10.10.10.77):

```bash
# 1. Editar el archivo
sudo nano /ruta/a/supabase/.env

# 2. Hacer los cambios de arriba
# (usa las flechas para navegar, edita las líneas)

# 3. Guardar
# Ctrl+O, Enter, Ctrl+X

# 4. Ir al directorio de docker-compose
cd /ruta/a/supabase

# 5. Reiniciar Supabase
docker-compose down
docker-compose up -d

# 6. Ver logs para verificar
docker-compose logs -f auth
```

---

## ✅ Verificar que Funcione

Después de reiniciar, ejecuta:

```bash
curl http://10.10.10.77:8000/auth/v1/health
```

Deberías ver:
```json
{"version":"v2.182.1","name":"GoTrue"}
```

Si ves eso, **refresca tu aplicación web** (Ctrl+Shift+R) e intenta registrarte nuevamente.

---

## 📊 Resumen de Cambios

| Variable | Valor Anterior | Valor Nuevo | Razón |
|----------|----------------|-------------|-------|
| `SITE_URL` | `http://10.10.10.77:3000` | `http://10.10.10.113:8080` | URL de tu app frontend |
| `ADDITIONAL_REDIRECT_URLS` | (vacío) | `http://localhost:5173,http://10.10.10.113:8080` | URLs permitidas |
| `ENABLE_EMAIL_AUTOCONFIRM` | `false` | `true` | ⭐ MÁS IMPORTANTE - Permite signup sin SMTP |
| `SMTP_HOST` | `supabase-mail` | `localhost` | SMTP mock para desarrollo |
| `SMTP_PORT` | `2500` | `1025` | Puerto estándar para mock |
| `SMTP_USER` | `fake_mail_user` | (vacío) | No necesario sin SMTP real |
| `SMTP_PASS` | `fake_mail_password` | (vacío) | No necesario sin SMTP real |
| `ENABLE_PHONE_SIGNUP` | `true` | `false` | Deshabilitar auth por teléfono |
| `ENABLE_PHONE_AUTOCONFIRM` | `true` | `false` | Deshabilitar auth por teléfono |

---

## 🎯 La Clave del Problema

El cambio **MÁS IMPORTANTE** es:

```bash
ENABLE_EMAIL_AUTOCONFIRM=true
```

Esta variable le dice a Supabase que **no necesita** enviar emails de confirmación, lo cual es perfecto para desarrollo cuando no tienes un servidor SMTP configurado.

---

## ❓ Si Sigues Teniendo Problemas

1. Verifica que los cambios se guardaron:
   ```bash
   cat .env | grep -E "ENABLE_EMAIL_AUTOCONFIRM|SITE_URL|SMTP_HOST"
   ```

2. Verifica que Docker Compose los cargó:
   ```bash
   docker exec supabase-auth env | grep -E "ENABLE_EMAIL_AUTOCONFIRM|SITE_URL"
   ```

3. Comparte los logs:
   ```bash
   docker-compose logs auth --tail 50
   ```
