import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_PROMPT = 8000; // 8KB prompt limit for AI
const MAX_CATEGORY_FILE = 10 * 1024 * 1024; // 10MB per category file (reasonable limit)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { assessmentId, categoryId, categoryFilePath, isChunk, chunkInfo } = await req.json();
    console.log(`[${categoryId}] Starting analysis${isChunk ? ` (chunk ${chunkInfo.chunkNumber}/${chunkInfo.totalChunks})` : ''}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`[${categoryId}] Downloading from: ${categoryFilePath}`);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('assessment-files')
      .download(categoryFilePath);

    if (downloadError || !fileData) {
      console.error(`[${categoryId}] Download error:`, downloadError);
      throw new Error('Download failed');
    }

    const size = fileData.size;
    console.log(`[${categoryId}] File size: ${(size/1024).toFixed(1)}KB`);
    
    if (size > MAX_CATEGORY_FILE) {
      throw new Error(`File too large: ${(size/1024/1024).toFixed(1)}MB (max 10MB)`);
    }

    console.log(`[${categoryId}] Parsing JSON...`);
    const text = await fileData.text();
    let data;
    
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error(`[${categoryId}] JSON parse error:`, parseError);
      throw new Error('Invalid JSON format');
    }
    
    if (!data || (Array.isArray(data) && !data.length)) {
      console.log(`[${categoryId}] No data found, skipping`);
      return ok(categoryId, 0);
    }

    console.log(`[${categoryId}] Starting AI analysis...`);
    const findings = await analyze(categoryId, data);
    console.log(`[${categoryId}] AI analysis complete: ${findings.length} findings`);

    if (findings?.length) {
      console.log(`[${categoryId}] Saving ${findings.length} findings to database...`);
      const { error: insertError } = await supabase.from('findings').insert(
        findings.map(f => ({ ...f, assessment_id: assessmentId, category_id: categoryId }))
      );
      
      if (insertError) {
        console.error(`[${categoryId}] Error saving findings:`, insertError);
        throw new Error(`Failed to save findings: ${insertError.message}`);
      }
      console.log(`[${categoryId}] Findings saved successfully`);
    } else {
      console.log(`[${categoryId}] No findings to save`);
    }

    // Progress tracking removed to avoid database contention with many chunks
    console.log(`[${categoryId}] Chunk processing complete`);

    console.log(`[${categoryId}] Cleaning up category file...`);
    await supabase.storage.from('assessment-files').remove([categoryFilePath]).catch(err => 
      console.error(`[${categoryId}] Cleanup warning:`, err)
    );
    
    console.log(`[${categoryId}] ✓ Complete with ${findings.length} findings`);
    return ok(categoryId, findings.length);

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function ok(cat: string, count: number) {
  return new Response(
    JSON.stringify({ success: true, categoryId: cat, findingsCount: count }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function analyze(cat: string, d: any): Promise<any[]> {
  const key = Deno.env.get('LOVABLE_API_KEY');
  if (!key) return [];

  const prompt = build(cat, d);
  if (prompt.length > MAX_PROMPT) {
    console.log(`Truncating ${prompt.length} to ${MAX_PROMPT}`);
  }

  try {
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Experto en seguridad AD. Reporta SOLO problemas críticos.' },
          { role: 'user', content: prompt.substring(0, MAX_PROMPT) }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'report_findings',
            parameters: {
              type: 'object',
              properties: {
                findings: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      severity: { type: 'string', enum: ['critical','high','medium','low'] },
                      title: { type: 'string' },
                      description: { type: 'string' },
                      recommendation: { type: 'string' },
                      evidence: { type: 'object' }
                    },
                    required: ['severity','title','description','recommendation']
                  }
                }
              },
              required: ['findings']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'report_findings' } }
      })
    });

    if (!res.ok) {
      console.error(`AI error: ${res.status}`);
      return [];
    }

    const result = await res.json();
    const tc = result.choices?.[0]?.message?.tool_calls?.[0];
    if (tc?.function?.name === 'report_findings') {
      return JSON.parse(tc.function.arguments).findings || [];
    }
    return [];
  } catch (e) {
    console.error('AI failed:', e);
    return [];
  }
}

function build(cat: string, d: any): string {
  const str = (v: any, max: number) => JSON.stringify(v || []).substring(0, max);
  
  switch (cat) {
    case 'users':
      return `Usuarios AD - Detecta SOLO problemas CRÍTICOS:
Total: ${d.total||0}
Privilegiados: ${str(d.privileged, 2000)}
Inactivos: ${str(d.inactive, 1000)}
Muestra: ${str(d.sample, 1000)}`;

    case 'gpos':
      return `GPOs - Detecta SOLO configs PELIGROSAS:
Total: ${d.total||0}
GPOs: ${str(d.gpos, 4000)}`;

    case 'domain':
      return `Dominio - Detecta SOLO problemas CRÍTICOS:
${str(d.domains, 2000)}`;

    case 'dc_health':
      return `DCs - Detecta SOLO problemas CRÍTICOS:
${str(d.controllers, 3000)}`;

    case 'forest_domain':
      return `Bosque - SOLO problemas CRÍTICOS:
Modo: ${d.forestMode||'?'}
Nombre: ${d.forestName||'?'}
Dominios: ${(d.domains||[]).join(',')}`;

    case 'security':
      return `Seguridad - SOLO crítico:
Password: ${str(d.passwordPolicy, 1500)}
Trusts: ${str(d.trusts, 1500)}`;

    case 'dns':
      return `DNS - SOLO crítico:
${str(d.zones, 2000)}`;

    case 'dhcp':
      return `DHCP - SOLO crítico:
Servers: ${str(d.servers, 1000)}
Scopes: ${str(d.scopes, 1500)}`;

    default:
      return 'Analiza y reporta problemas de seguridad.';
  }
}
