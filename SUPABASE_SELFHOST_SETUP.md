# Configuración de Supabase Self-Hosted

Esta guía te ayudará a configurar tu proyecto con tu instancia de Supabase self-hosted.

## ✅ Configuración Completada

- **URL de Supabase:** `http://10.10.10.77:8000`
- **Archivo .env:** Ya configurado con tus credenciales
- **Conexión:** Lista para usar

## 📋 Pasos para Aplicar Migraciones

### Opción 1: Script Consolidado (Recomendado)

1. Abre tu dashboard de Supabase en: `http://10.10.10.77:8000`
2. Navega a **SQL Editor** en el menú lateral
3. Crea una nueva query
4. Copia todo el contenido del archivo: `supabase/migrations/00_apply_all_migrations.sql`
5. Pega el contenido en el editor SQL
6. Haz clic en **Run** o **Execute**

El script creará:
- ✅ 3 tablas principales (`assessments`, `assessment_data`, `findings`)
- ✅ 1 tabla de configuración (`ai_config`)
- ✅ 1 bucket de storage (`assessment-files`)
- ✅ Políticas de seguridad (RLS)
- ✅ Índices para mejor rendimiento
- ✅ Triggers para timestamps automáticos

### Opción 2: Aplicar Migraciones Individuales

Si prefieres aplicar las migraciones una por una, ejecuta estos archivos en orden:

1. `supabase/migrations/20251030001006_e59634fd-5d09-45f5-995b-a6f7cf94e25c.sql`
2. `supabase/migrations/20251111142818_91252291-8fb3-4c0e-8ccb-c98dcaf4f936.sql`
3. `supabase/migrations/20251112134209_bcd8a8d7-5d7e-4287-a055-684b00c7a598.sql`
4. `supabase/migrations/20251112143404_1e4998ba-e702-427d-97b0-8ed36caefcc9.sql`
5. `supabase/migrations/20251113192410_a328e6d0-1b1e-47e9-aaf2-a76f3f28137c.sql`
6. `supabase/migrations/20251114221706_366455c7-415e-4f6a-9ed8-1c945fdd4854.sql`

## 🔧 Edge Functions

Tu proyecto tiene 4 Edge Functions en `supabase/functions/`:

- `upload-data`
- `analyze-assessment`
- `analyze-category`
- `process-large-file`

### Verificar si tu instancia soporta Edge Functions

Las Edge Functions requieren Deno runtime. Para verificar:

1. Revisa la documentación de tu instalación de Supabase
2. O intenta desplegar una función de prueba

### Desplegar Edge Functions (Si está disponible)

Si tienes Supabase CLI instalado y configurado:

```bash
# Configurar el CLI para tu instancia
supabase login

# Vincular a tu proyecto (necesitarás el project-ref de tu instancia)
supabase link --project-ref tu-project-ref

# Desplegar todas las funciones
supabase functions deploy upload-data
supabase functions deploy analyze-assessment
supabase functions deploy analyze-category
supabase functions deploy process-large-file
```

### Alternativa: Edge Functions Locales

Si tu instancia self-hosted no soporta Edge Functions en producción, puedes:

1. Ejecutar las funciones localmente durante desarrollo
2. Convertirlas a endpoints de API en tu backend
3. Usar un servicio externo como Cloudflare Workers o Deno Deploy

## 🧪 Verificar la Configuración

### 1. Verificar Variables de Entorno

```bash
cat .env
```

Deberías ver:
```env
VITE_SUPABASE_URL=http://10.10.10.77:8000
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Verificar Tablas en el Dashboard

1. Ve a **Table Editor** en el dashboard
2. Deberías ver las siguientes tablas:
   - `assessments`
   - `assessment_data`
   - `findings`
   - `ai_config`

### 3. Verificar Storage Bucket

1. Ve a **Storage** en el dashboard
2. Deberías ver el bucket: `assessment-files`

### 4. Probar la Conexión Localmente

```bash
# Instalar dependencias si aún no lo has hecho
npm install

# Iniciar servidor de desarrollo
npm run dev
```

Abre `http://localhost:5173` y verifica que la aplicación se conecte correctamente.

## 🔍 Troubleshooting

### Error: "Failed to connect to database"

**Problema:** No se puede conectar a la base de datos.

**Soluciones:**
1. Verifica que tu instancia de Supabase esté corriendo
2. Verifica que puedes acceder a `http://10.10.10.77:8000` desde tu navegador
3. Verifica que las credenciales en `.env` sean correctas
4. Verifica reglas de firewall si estás en una red diferente

### Error: "relation does not exist"

**Problema:** Las tablas no fueron creadas.

**Soluciones:**
1. Ejecuta el script de migraciones consolidado
2. Verifica en Table Editor que las tablas existan
3. Revisa los logs de PostgreSQL en tu instancia

### Error: "bucket does not exist"

**Problema:** El bucket de storage no fue creado.

**Soluciones:**
1. Ve a Storage en el dashboard
2. Crea manualmente el bucket `assessment-files` con visibilidad `private`
3. Aplica las políticas de la migración 5

### No puedo ver las tablas en el dashboard

**Problema:** Las políticas RLS bloquean el acceso.

**Soluciones:**
1. Verifica que estás autenticado en el dashboard
2. Las políticas actuales permiten `USING (true)`, así que deberías tener acceso
3. Temporalmente, puedes deshabilitar RLS para debugging:
   ```sql
   ALTER TABLE public.assessments DISABLE ROW LEVEL SECURITY;
   ```

### Edge Functions no funcionan

**Problema:** Las Edge Functions no se despliegan o no funcionan.

**Soluciones:**
1. Verifica que tu instancia self-hosted soporte Edge Functions
2. Revisa la documentación de tu versión de Supabase
3. Considera alternativas como:
   - API endpoints en tu backend
   - Serverless functions externas
   - Procesamiento client-side (si es apropiado)

## 🎯 Próximos Pasos

Una vez que hayas aplicado las migraciones:

1. ✅ **Probar localmente:**
   ```bash
   npm run dev
   ```

2. ✅ **Construir para producción:**
   ```bash
   npm run build
   ```

3. ✅ **Desplegar tu aplicación:**
   - Ver opciones en `DEPLOYMENT.md`
   - Recuerda configurar las variables de entorno en tu plataforma de hosting

## 📚 Recursos

- [Documentación de Supabase](https://supabase.com/docs)
- [Guía de Self-Hosting de Supabase](https://supabase.com/docs/guides/self-hosting)
- [Supabase CLI](https://supabase.com/docs/guides/cli)

## ✅ Checklist de Configuración

- [ ] Archivo `.env` creado con credenciales correctas
- [ ] Migraciones aplicadas en el dashboard
- [ ] Tablas visibles en Table Editor
- [ ] Bucket de storage creado
- [ ] Aplicación corre localmente sin errores
- [ ] Edge Functions desplegadas (opcional)
- [ ] Build de producción exitoso

¡Todo listo! Tu proyecto ahora está configurado para trabajar con tu instancia de Supabase self-hosted.
