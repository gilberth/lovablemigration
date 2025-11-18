# Guía de Despliegue Independiente

Esta guía te ayudará a independizar y desplegar tu proyecto Lovable en cualquier plataforma de hosting.

## Tabla de Contenidos

- [Requisitos Previos](#requisitos-previos)
- [Configuración de Supabase](#configuración-de-supabase)
- [Variables de Entorno](#variables-de-entorno)
- [Opciones de Despliegue](#opciones-de-despliegue)
- [Mantenimiento](#mantenimiento)

## Requisitos Previos

- Node.js 18 o superior
- Una cuenta de Supabase (gratuita)
- Git configurado
- npm o yarn instalado

## Configuración de Supabase

Tu proyecto utiliza Supabase para autenticación y base de datos. Necesitas crear tu propia instancia de Supabase.

### 1. Crear un Proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com)
2. Crea una cuenta o inicia sesión
3. Crea un nuevo proyecto
4. Anota las credenciales del proyecto (URL y anon key)

### 2. Configurar el Esquema de Base de Datos

Este proyecto incluye migraciones SQL en la carpeta `supabase/migrations/`. Necesitas aplicarlas a tu nueva instancia.

#### Opción A: Usar Supabase CLI (Recomendado)

```bash
# Instalar Supabase CLI
npm install -g supabase

# Iniciar sesión en Supabase
supabase login

# Vincular tu proyecto (necesitas el project-ref de tu panel de Supabase)
supabase link --project-ref tu-project-ref

# Aplicar las migraciones
supabase db push
```

#### Opción B: Aplicar Manualmente desde el Dashboard

1. Ve a tu proyecto en el Dashboard de Supabase
2. Navega a **SQL Editor**
3. Ejecuta cada archivo SQL de la carpeta `supabase/migrations/` en orden cronológico:
   - `20251030001006_e59634fd-5d09-45f5-995b-a6f7cf94e25c.sql`
   - `20251111142818_91252291-8fb3-4c0e-8ccb-c98dcaf4f936.sql`
   - `20251112134209_bcd8a8d7-5d7e-4287-a055-684b00c7a598.sql`
   - `20251112143404_1e4998ba-e702-427d-97b0-8ed36caefcc9.sql`
   - `20251113192410_a328e6d0-1b1e-47e9-aaf2-a76f3f28137c.sql`
   - `20251114221706_366455c7-415e-4f6a-9ed8-1c945fdd4854.sql`

### 3. Desplegar Edge Functions

Este proyecto tiene 4 Edge Functions en `supabase/functions/`:

- `upload-data`
- `analyze-assessment`
- `analyze-category`
- `process-large-file`

Para desplegarlas:

```bash
# Desplegar todas las funciones
supabase functions deploy upload-data
supabase functions deploy analyze-assessment
supabase functions deploy analyze-category
supabase functions deploy process-large-file
```

### 4. Configurar Autenticación

1. En el Dashboard de Supabase, ve a **Authentication** > **Providers**
2. Configura los proveedores de autenticación que necesites
3. Configura las URLs de redirección si es necesario

## Variables de Entorno

### Configuración Local

1. Copia el archivo de ejemplo:
   ```bash
   cp .env.example .env
   ```

2. Edita `.env` con tus credenciales de Supabase:
   ```env
   VITE_SUPABASE_URL=https://tu-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=tu-anon-key
   ```

3. Encuentra estas credenciales en tu Dashboard de Supabase:
   - Ve a **Settings** > **API**
   - Copia el **Project URL** para `VITE_SUPABASE_URL`
   - Copia el **anon public** key para `VITE_SUPABASE_PUBLISHABLE_KEY`

### Importante
- **NUNCA** commits el archivo `.env` a Git
- El archivo `.env.example` está incluido como plantilla
- Cada plataforma de hosting tiene su propia forma de configurar variables de entorno

## Opciones de Despliegue

### Opción 1: Vercel (Recomendado)

Vercel es ideal para aplicaciones React/Vite.

#### Despliegue desde CLI:

```bash
# Instalar Vercel CLI
npm install -g vercel

# Desplegar
vercel
```

#### Despliegue desde Dashboard:

1. Ve a [vercel.com](https://vercel.com)
2. Importa tu repositorio de GitHub
3. Configura las variables de entorno:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
4. Haz clic en "Deploy"

**Configuración incluida:** `vercel.json`

### Opción 2: Netlify

Netlify ofrece hosting gratuito con CI/CD integrado.

#### Despliegue desde CLI:

```bash
# Instalar Netlify CLI
npm install -g netlify-cli

# Desplegar
netlify deploy --prod
```

#### Despliegue desde Dashboard:

1. Ve a [netlify.com](https://netlify.com)
2. Importa tu repositorio de GitHub
3. Configura:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Agrega las variables de entorno en **Site settings** > **Environment variables**
5. Haz clic en "Deploy"

**Configuración incluida:** `netlify.toml`

### Opción 3: GitHub Pages

Solo para proyectos sin backend. Las Edge Functions de Supabase seguirán funcionando.

1. Actualiza `vite.config.ts` con tu base URL:
   ```typescript
   export default defineConfig({
     base: '/nombre-de-tu-repo/',
     // ... resto de la configuración
   })
   ```

2. Crea un workflow de GitHub Actions en `.github/workflows/deploy.yml`:
   ```yaml
   name: Deploy to GitHub Pages

   on:
     push:
       branches: [ main ]

   jobs:
     build-and-deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3

         - name: Setup Node.js
           uses: actions/setup-node@v3
           with:
             node-version: '18'

         - name: Install dependencies
           run: npm ci

         - name: Build
           run: npm run build
           env:
             VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
             VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}

         - name: Deploy to GitHub Pages
           uses: peaceiris/actions-gh-pages@v3
           with:
             github_token: ${{ secrets.GITHUB_TOKEN }}
             publish_dir: ./dist
   ```

3. Configura los secretos en GitHub:
   - Ve a **Settings** > **Secrets and variables** > **Actions**
   - Agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`

4. Habilita GitHub Pages:
   - Ve a **Settings** > **Pages**
   - Selecciona la rama `gh-pages`

### Opción 4: VPS (DigitalOcean, Linode, Vultr)

Para máximo control y flexibilidad.

#### Configuración del Servidor:

```bash
# 1. Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Instalar PM2 (gestor de procesos)
sudo npm install -g pm2

# 3. Clonar el repositorio
git clone https://github.com/tu-usuario/tu-repo.git
cd tu-repo

# 4. Instalar dependencias
npm install

# 5. Crear archivo .env con tus credenciales
nano .env
# (pega tus variables de entorno)

# 6. Construir la aplicación
npm run build

# 7. Servir con un servidor estático
npm install -g serve
pm2 start "serve -s dist -p 3000" --name lovable-app

# 8. Configurar PM2 para inicio automático
pm2 startup
pm2 save
```

#### Configurar Nginx como Reverse Proxy:

```bash
# Instalar Nginx
sudo apt-get install nginx

# Crear configuración
sudo nano /etc/nginx/sites-available/lovable-app
```

Contenido del archivo:

```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Habilitar el sitio
sudo ln -s /etc/nginx/sites-available/lovable-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Opcional: Configurar SSL con Let's Encrypt
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d tu-dominio.com
```

### Opción 5: Coolify (Self-Hosted PaaS)

Coolify es una alternativa self-hosted a Heroku/Netlify.

1. Instala Coolify en tu servidor siguiendo [coolify.io](https://coolify.io)
2. En Coolify:
   - Conecta tu repositorio de GitHub
   - Configura las variables de entorno
   - Establece el build command: `npm run build`
   - Configura el directorio de publicación: `dist`
3. Despliega automáticamente con webhooks de GitHub

## Probar Localmente

Antes de desplegar, prueba que todo funcione localmente:

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Probar el build de producción
npm run build
npm run preview
```

Visita `http://localhost:5173` para verificar que la aplicación funciona.

## Mantenimiento

### Actualizar el Código

```bash
# Hacer cambios en Lovable o localmente
git pull origin main

# Reinstalar dependencias si hay cambios en package.json
npm install

# Reconstruir
npm run build
```

### Actualizar Base de Datos

Si agregas nuevas migraciones en Lovable:

```bash
# Aplicar nuevas migraciones
supabase db push
```

### Actualizar Edge Functions

```bash
# Redesplegar funciones actualizadas
supabase functions deploy nombre-de-la-funcion
```

### Backups

#### Base de Datos:

```bash
# Exportar esquema
supabase db dump -f schema.sql

# Exportar datos
supabase db dump --data-only -f data.sql
```

#### Código:
- El código está en GitHub (ya respaldado)
- Descarga periódicamente backups de tu repositorio

## Solución de Problemas

### Error: "Failed to fetch"

- Verifica que las variables de entorno estén configuradas correctamente
- Asegúrate de que la URL de Supabase sea correcta
- Verifica que la anon key sea la correcta

### Error 404 en rutas

- Asegúrate de que tu servidor esté configurado para redirigir todas las rutas a `index.html`
- Para Vercel: usa `vercel.json`
- Para Netlify: usa `netlify.toml`
- Para Nginx: configura `try_files $uri /index.html`

### Las Edge Functions no funcionan

- Verifica que las funciones estén desplegadas: `supabase functions list`
- Revisa los logs: `supabase functions logs nombre-de-la-funcion`
- Asegúrate de que `verify_jwt = false` esté configurado en `supabase/config.toml` si no usas autenticación JWT

### Build falla

- Verifica la versión de Node.js: `node --version` (debe ser 18+)
- Limpia y reinstala dependencias:
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```
- Revisa los logs de error para identificar el problema específico

## Workflow Recomendado

1. **Desarrollo en Lovable:** Usa Lovable para desarrollo rápido con IA
2. **Push a GitHub:** Lovable automáticamente hace commit a GitHub
3. **CI/CD automático:** GitHub despliega automáticamente a tu plataforma elegida
4. **Monitoreo:** Configura alertas y monitoreo de errores

## Recursos Adicionales

- [Documentación de Supabase](https://supabase.com/docs)
- [Documentación de Vite](https://vitejs.dev/)
- [Documentación de React Router](https://reactrouter.com/)
- [Guía de Self-Hosting de Lovable](https://docs.lovable.dev/tips-tricks/self-hosting)

## Conclusión

¡Tu proyecto ahora es completamente independiente de Lovable Cloud! Puedes:

- ✅ Desplegarlo en cualquier plataforma
- ✅ Controlar completamente tu base de datos
- ✅ Seguir usando Lovable para desarrollo
- ✅ Escalar según tus necesidades

Recuerda: GitHub es tu fuente única de verdad. Lovable y tu hosting apuntan al mismo repositorio.
