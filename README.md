# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/7fde1dca-3e94-40c5-8179-9303862b4dfe

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/7fde1dca-3e94-40c5-8179-9303862b4dfe) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

### Option 1: Deploy with Lovable Cloud

Simply open [Lovable](https://lovable.dev/projects/7fde1dca-3e94-40c5-8179-9303862b4dfe) and click on Share -> Publish.

### Option 2: Self-Host Independently

**¡Tu código es completamente tuyo!** Puedes desplegarlo independientemente en cualquier plataforma.

**📖 [Guía Completa de Despliegue Independiente](DEPLOYMENT.md)**

Opciones de hosting soportadas:
- **Vercel** - Recomendado para React/Vite
- **Netlify** - Excelente para JAMstack
- **GitHub Pages** - Hosting gratuito
- **VPS** (DigitalOcean, Linode, Vultr) - Máximo control
- **Coolify** - PaaS self-hosted

#### Inicio Rápido para Self-Hosting

1. **Configura tu propia instancia de Supabase:**
   - Crea una cuenta en [supabase.com](https://supabase.com)
   - Crea un nuevo proyecto
   - Aplica las migraciones de la carpeta `supabase/migrations/`
   - Despliega las Edge Functions de `supabase/functions/`

2. **Configura las variables de entorno:**
   ```bash
   cp .env.example .env
   # Edita .env con tus credenciales de Supabase
   ```

3. **Despliega en tu plataforma favorita:**
   ```bash
   # Para Vercel
   vercel

   # Para Netlify
   netlify deploy --prod

   # O sigue la guía completa en DEPLOYMENT.md
   ```

**Archivos de configuración incluidos:**
- ✅ `.env.example` - Template de variables de entorno
- ✅ `vercel.json` - Configuración para Vercel
- ✅ `netlify.toml` - Configuración para Netlify
- ✅ `DEPLOYMENT.md` - Guía completa paso a paso

## Can I connect a custom domain to my Lovable project?

Yes, you can!

**Para Lovable Cloud:**
To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.
Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

**Para Self-Hosting:**
Cada plataforma tiene su propio proceso para dominios personalizados:
- **Vercel/Netlify:** Configuración desde el dashboard
- **VPS:** Configuración vía DNS + Nginx
- Ver detalles en [DEPLOYMENT.md](DEPLOYMENT.md)
