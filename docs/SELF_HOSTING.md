# Self-Hosting Your Lovable Project

This guide provides comprehensive instructions for migrating your Lovable Cloud project to your own infrastructure and self-hosting it anywhere you choose.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Migration Steps](#migration-steps)
- [Environment Variables](#environment-variables)
- [Database Migration](#database-migration)
- [Hosting Options](#hosting-options)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

Lovable emphasizes complete code ownership. You can:

- Export your code to GitHub at any time
- Clone and self-host without restrictions
- Use any hosting provider you prefer
- Maintain full control over your application

Your Lovable project is built on open-source technologies and open standards, with no proprietary frameworks or hidden dependencies.

## Prerequisites

Before migrating your Lovable project, ensure you have:

- A GitHub account
- Access to your Lovable project
- A hosting platform account (see [Hosting Options](#hosting-options))
- Basic knowledge of Git and command line operations
- A database provider (if using a database, e.g., Supabase)

## Migration Steps

### 1. Set Up GitHub Integration

1. In your Lovable project, navigate to the GitHub integration settings
2. Connect your GitHub account if not already connected
3. Create a new repository or select an existing one
4. Push your Lovable project code to GitHub

GitHub serves as the single source of truth for both Lovable and your self-hosted deployment.

### 2. Clone Your Repository

```bash
git clone https://github.com/your-username/your-repo.git
cd your-repo
```

### 3. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 4. Configure Environment Variables

Copy your environment variables from Lovable to your local `.env` file (see [Environment Variables](#environment-variables) section for details).

### 5. Test Locally

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Verify that your application runs correctly on your local machine.

### 6. Deploy to Your Hosting Platform

Follow the specific deployment instructions for your chosen hosting platform (see [Hosting Options](#hosting-options)).

## Environment Variables

When self-hosting, you'll need to manage all environment variables that your application uses. These typically include:

### Common Environment Variables

- **API Keys**: Third-party service keys (OpenAI, Stripe, etc.)
- **Database Connection**: Database URLs and credentials
- **Authentication**: Auth provider secrets (Supabase Auth, Auth0, etc.)
- **Application Secrets**: Session secrets, encryption keys
- **Service URLs**: API endpoints, webhook URLs

### Setting Up Environment Variables

1. **Create a `.env` file** in your project root
2. **Copy variables from Lovable**: Export your environment variables from your Lovable project settings
3. **Update URLs**: Change any Lovable-specific URLs to your self-hosted URLs
4. **Secure sensitive data**: Never commit `.env` files to version control

Example `.env` file:

```env
# Database
DATABASE_URL=your_database_url

# Supabase (if using)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# API Keys
VITE_API_KEY=your_api_key

# Application
NODE_ENV=production
```

### Platform-Specific Configuration

Each hosting platform has its own way of managing environment variables:

- **Vercel**: Use the Vercel dashboard or CLI
- **Netlify**: Use the Netlify dashboard or `netlify.toml`
- **Coolify**: Configure in the Coolify web interface
- **ServerAvatar**: Set through the ServerAvatar panel
- **GitHub Pages**: Limited environment variable support (client-side only)

## Database Migration

If your Lovable project uses a database (typically Supabase), you'll need to migrate your data.

### Supabase Migration

1. **Create a Supabase Project**
   - Sign up at [supabase.com](https://supabase.com)
   - Create a new project

2. **Export Schema from Lovable**
   - Your Lovable project may have database migrations in a `supabase` directory
   - These migrations define your database schema

3. **Run Migrations on Your Supabase Instance**

   ```bash
   # Install Supabase CLI
   npm install -g supabase

   # Link to your Supabase project
   supabase link --project-ref your-project-ref

   # Run migrations
   supabase db push
   ```

4. **Export and Import Data** (if needed)

   ```bash
   # Export data from Lovable's Supabase instance
   # This may require running SQL queries or using Supabase dashboard

   # Import to your Supabase instance
   # Use Supabase dashboard or SQL commands
   ```

5. **Update Environment Variables**

   Update your `.env` file with your new Supabase credentials:

   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

### Database Best Practices

- Always back up your data before migration
- Test migrations in a staging environment first
- Keep your database schema in version control
- Use migrations for schema changes, not direct SQL modifications

## Hosting Options

You can host your Lovable project on any platform that supports Node.js and static site hosting. Here are popular options:

### 1. Coolify (Recommended for Self-Hosting)

Coolify is a self-hosted alternative to Heroku/Netlify/Vercel.

**Setup:**

1. Install Coolify on your server
2. Connect to your GitHub repository (including private repos)
3. Configure environment variables in Coolify
4. Set up automatic deployments with webhooks
5. Deploy your application

**Pros:**
- Complete control over your infrastructure
- Support for private repositories
- Automated deployments
- Cost-effective for multiple projects

**Resources:**
- [How I Self Host Lovable with Coolify](https://alfrednutile.info/2025/02/25/how-i-self-host-lovable-coolify/)

### 2. Vercel

Vercel is optimized for frontend frameworks and offers excellent performance.

**Setup:**

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

**Pros:**
- Easy deployment
- Excellent performance
- Automatic HTTPS
- Built-in CI/CD

**Cons:**
- Can be expensive for high-traffic sites
- Limited backend capabilities on free tier

### 3. Netlify

Similar to Vercel, great for static sites and Jamstack applications.

**Setup:**

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod
```

**Pros:**
- Simple deployment process
- Form handling and serverless functions
- Generous free tier

### 4. ServerAvatar

ServerAvatar provides a GUI-based approach to server management.

**Setup:**

1. Connect your server to ServerAvatar
2. Create a new application
3. Link to your GitHub repository
4. Configure environment variables
5. Deploy

**Pros:**
- No command line required
- User-friendly interface
- Supports multiple server providers

**Resources:**
- [Host Lovable AI App on Server Using ServerAvatar](https://serveravatar.com/host-lovable-ai-app-on-server-using-serveravatar/)

### 5. GitHub Pages

Suitable for static sites without backend requirements.

**Setup:**

1. Enable GitHub Pages in your repository settings
2. Configure build settings
3. Set the source branch (usually `gh-pages` or `main`)

**Pros:**
- Free hosting
- Automatic deployment from GitHub
- Good for documentation and static sites

**Cons:**
- Static sites only (no server-side logic)
- Limited environment variable support
- No database support

**Resources:**
- [Host Lovable.dev Project on GitHub Pages](https://dev.to/coderatul/host-lovabledev-project-on-github-pages-1c61)

### 6. Traditional VPS (DigitalOcean, Vultr, Linode)

For maximum control and flexibility.

**Setup:**

1. Create a server instance
2. Install Node.js and npm
3. Clone your repository
4. Set up a process manager (PM2)
5. Configure a reverse proxy (Nginx)
6. Set up SSL certificates (Let's Encrypt)

**Pros:**
- Complete control
- Cost-effective for high-traffic sites
- No platform limitations

**Cons:**
- Requires server management knowledge
- Manual security updates
- More setup complexity

## Best Practices

### 1. Use GitHub as Single Source of Truth

- Always commit changes to GitHub
- Use Lovable's GitHub integration to keep everything in sync
- Your self-hosted deployment should pull from GitHub

### 2. Environment Management

- Use separate environments (development, staging, production)
- Never commit secrets to version control
- Use different databases for each environment
- Test thoroughly in staging before deploying to production

### 3. Continuous Deployment

Set up automatic deployments:

```bash
# Example: GitHub Actions workflow
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install
      - run: npm run build
      - uses: your-deployment-action@v1
```

### 4. Monitoring and Logging

- Set up error tracking (Sentry, LogRocket)
- Monitor application performance
- Keep logs for debugging
- Set up uptime monitoring

### 5. Backups

- Regular database backups
- Keep backups in multiple locations
- Test backup restoration periodically
- Version control for code

### 6. Security

- Keep dependencies updated
- Use environment variables for secrets
- Enable HTTPS/SSL
- Implement proper authentication
- Regular security audits

## Troubleshooting

### Common Issues

#### Build Failures

**Problem**: Build fails during deployment

**Solutions**:
- Check Node.js version compatibility
- Verify all dependencies are in `package.json`
- Review build logs for specific errors
- Ensure environment variables are set correctly

#### Database Connection Issues

**Problem**: Cannot connect to database

**Solutions**:
- Verify database URL is correct
- Check firewall rules allow connection
- Ensure database is running
- Validate credentials

#### Environment Variables Not Loading

**Problem**: Application cannot read environment variables

**Solutions**:
- Verify `.env` file format
- Check variable names (especially VITE_ prefix for Vite apps)
- Ensure hosting platform has variables configured
- Restart the application after setting variables

#### 404 Errors on Refresh

**Problem**: SPA routes return 404 on page refresh

**Solutions**:
- Configure server to redirect all routes to `index.html`
- For Netlify: Create `_redirects` file
- For Vercel: Configure `vercel.json`
- For Nginx: Update configuration

Example `_redirects` for Netlify:
```
/*    /index.html   200
```

Example `vercel.json`:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

### Getting Help

- Official Lovable documentation: [docs.lovable.dev](https://docs.lovable.dev)
- GitHub integration docs: [docs.lovable.dev/integrations/git-integration](https://docs.lovable.dev/integrations/git-integration)
- Community forums and Discord
- Platform-specific support (Vercel, Netlify, etc.)

## Workflow Example

Here's a typical workflow using Lovable as a visual editor with self-hosted deployment:

1. **Develop in Lovable**: Use Lovable's AI assistant and visual editor
2. **Push to GitHub**: Commit changes from Lovable to GitHub
3. **Auto-Deploy**: GitHub webhook triggers deployment to your hosting platform
4. **Monitor**: Check deployment status and application health
5. **Iterate**: Make more changes in Lovable, repeat the process

This workflow treats Lovable as a powerful development tool while maintaining your self-hosted production environment.

## Conclusion

Self-hosting your Lovable project gives you complete control over your application while still benefiting from Lovable's powerful AI-assisted development environment. By following this guide, you can successfully migrate your project to any infrastructure you choose.

Remember:
- You own your code completely
- GitHub is your single source of truth
- Choose the hosting platform that best fits your needs
- Follow best practices for security and deployment
- Keep your dependencies and infrastructure updated

Happy self-hosting!
