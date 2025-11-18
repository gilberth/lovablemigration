import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB in bytes
const MAX_ITEMS_PER_CHUNK = 1000; // Limite de items por chunk para procesamiento
const BATCH_SIZE = 15; // Process chunks in batches of 15 to avoid timeouts

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { assessmentId, categoryId, categoryFilePath } = await req.json();
    console.log(`[${categoryId}] Starting large file processing`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Download and parse in streaming fashion to avoid memory issues
    console.log(`[${categoryId}] Downloading file: ${categoryFilePath}`);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('assessment-files')
      .download(categoryFilePath);

    if (downloadError || !fileData) {
      console.error(`[${categoryId}] Download error:`, downloadError);
      throw new Error('Download failed');
    }

    console.log(`[${categoryId}] Parsing JSON (streaming)...`);
    const text = await fileData.text();
    let fullData;
    
    try {
      fullData = JSON.parse(text);
    } catch (parseError) {
      console.error(`[${categoryId}] JSON parse error:`, parseError);
      throw new Error('Invalid JSON format');
    }

    // Extract users array
    const users = fullData.Users || [];
    
    if (!Array.isArray(users) || users.length === 0) {
      console.log(`[${categoryId}] No users found`);
      return new Response(JSON.stringify({ 
        category: categoryId, 
        totalFindings: 0,
        chunks: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`[${categoryId}] Found ${users.length} users to process`);

    // Split users into manageable chunks and upload to storage
    const ITEMS_PER_CHUNK = 1000;
    const totalChunks = Math.ceil(users.length / ITEMS_PER_CHUNK);
    console.log(`[${categoryId}] Splitting ${users.length} users into ${totalChunks} chunks`);
    
    const chunkPaths: string[] = [];
    
    for (let i = 0; i < totalChunks; i++) {
      const chunkStart = i * ITEMS_PER_CHUNK;
      const chunkEnd = Math.min((i + 1) * ITEMS_PER_CHUNK, users.length);
      const chunkUsers = users.slice(chunkStart, chunkEnd);
      
      // Upload chunk to storage
      const chunkData = { Users: chunkUsers };
      const chunkJson = JSON.stringify(chunkData);
      const chunkBlob = new Blob([chunkJson], { type: 'application/json' });
      const chunkPath = `${assessmentId}/categories/users_chunk_${i + 1}.json`;
      
      const { error: uploadError } = await supabase.storage
        .from('assessment-files')
        .upload(chunkPath, chunkBlob, {
          contentType: 'application/json',
          upsert: true
        });
        
      if (uploadError) {
        console.error(`[${categoryId}] Error uploading chunk ${i + 1}:`, uploadError);
        throw new Error(`Failed to upload chunk ${i + 1}`);
      }
      
      chunkPaths.push(chunkPath);
      console.log(`[${categoryId}] Uploaded chunk ${i + 1}/${totalChunks}`);
    }

    // Calculate number of batches needed  
    const totalBatches = Math.ceil(totalChunks / BATCH_SIZE);
    console.log(`[${categoryId}] Will process in ${totalBatches} batches of max ${BATCH_SIZE} chunks each`);

    // Initialize progress
    await supabase.from('assessments').update({
      analysis_progress: {
        categories: [{ id: categoryId, status: 'processing' }],
        current: 'Iniciando análisis por lotes...',
        completed: 0,
        total: totalChunks,
        batchInfo: {
          totalChunks: totalChunks,
          totalBatches: totalBatches,
          currentBatch: 0,
          chunksProcessed: 0
        }
      }
    }).eq('id', assessmentId);

    // Process chunks in batches using analyze-category function
    for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
      const batchStart = batchNum * BATCH_SIZE;
      const batchEnd = Math.min((batchNum + 1) * BATCH_SIZE, totalChunks);
      
      console.log(`[${categoryId}] Processing batch ${batchNum + 1}/${totalBatches} (chunks ${batchStart + 1}-${batchEnd})`);
      
      // Update progress
      await supabase.from('assessments').update({
        analysis_progress: {
          categories: [{ id: categoryId, status: 'processing' }],
          current: `Procesando grupo ${batchNum + 1} de ${totalBatches}...`,
          completed: batchStart,
          total: totalChunks,
          batchInfo: {
            totalChunks: totalChunks,
            totalBatches: totalBatches,
            currentBatch: batchNum + 1,
            chunksProcessed: batchStart
          }
        }
      }).eq('id', assessmentId);

      // Process chunks in this batch in parallel
      const batchPromises = [];
      for (let i = batchStart; i < batchEnd; i++) {
        batchPromises.push(
          supabase.functions.invoke('analyze-category', {
            body: {
              assessmentId: assessmentId,
              categoryId: `users_chunk_${i + 1}`,
              categoryFilePath: chunkPaths[i],
              isChunk: true,
              chunkInfo: {
                chunkNumber: i + 1,
                totalChunks: totalChunks,
                parentCategory: 'users'
              }
            }
          })
        );
      }

      // Wait for this batch to complete
      const results = await Promise.allSettled(batchPromises);
      
      // Log any errors
      results.forEach((result, idx) => {
        if (result.status === 'rejected') {
          console.error(`[${categoryId}] Chunk ${batchStart + idx + 1} failed:`, result.reason);
        }
      });
      
      // Update progress after batch
      await supabase.from('assessments').update({
        analysis_progress: {
          categories: [{ id: categoryId, status: 'processing' }],
          current: `Grupo ${batchNum + 1}/${totalBatches} completado`,
          completed: batchEnd,
          total: totalChunks,
          batchInfo: {
            totalChunks: totalChunks,
            totalBatches: totalBatches,
            currentBatch: batchNum + 1,
            chunksProcessed: batchEnd
          }
        }
      }).eq('id', assessmentId);
      
      console.log(`[${categoryId}] Completed batch ${batchNum + 1}/${totalBatches}`);
    }

    // Mark category as completed
    await supabase.from('assessments').update({
      analysis_progress: {
        categories: [{ id: categoryId, status: 'completed' }],
        current: 'Análisis completado',
        completed: totalChunks,
        total: totalChunks,
        batchInfo: {
          totalChunks: totalChunks,
          totalBatches: totalBatches,
          currentBatch: totalBatches,
          chunksProcessed: totalChunks
        }
      },
      status: 'completed',
      completed_at: new Date().toISOString()
    }).eq('id', assessmentId);

    console.log(`[${categoryId}] ✓ Complete. Processed ${totalChunks} chunks in ${totalBatches} batches`);

    return new Response(JSON.stringify({ 
      category: categoryId,
      chunks: totalChunks,
      batches: totalBatches
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-large-file:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function analyzeChunk(categoryId: string, chunkData: any[], chunkNum: number, totalChunks: number) {
  console.log(`[${categoryId}] Analyzing chunk ${chunkNum}/${totalChunks} with ${chunkData.length} items`);
  
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    console.error('[analyze] LOVABLE_API_KEY not found');
    return [];
  }

  try {
    const prompt = buildPrompt(categoryId, chunkData, chunkNum, totalChunks);
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: prompt }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'report_findings',
              description: 'Report security findings found in the AD data',
              parameters: {
                type: 'object',
                properties: {
                  findings: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        title: { type: 'string', description: 'Short title' },
                        severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'], description: 'Severity level' },
                        description: { type: 'string', description: 'Detailed description' },
                        recommendation: { type: 'string', description: 'How to fix' },
                        evidence: { type: 'object', description: 'Evidence data' }
                      },
                      required: ['title', 'severity', 'description', 'recommendation']
                    }
                  }
                },
                required: ['findings']
              }
            }
          }
        ]
      })
    });

    if (!response.ok) {
      console.error(`[${categoryId}] AI API error:`, response.status, response.statusText);
      return [];
    }

    const result = await response.json();
    const toolCalls = result.choices?.[0]?.message?.tool_calls;
    
    if (!toolCalls || toolCalls.length === 0) {
      console.log(`[${categoryId}] No findings in chunk ${chunkNum}`);
      return [];
    }

    const findings = JSON.parse(toolCalls[0].function.arguments).findings || [];
    console.log(`[${categoryId}] Chunk ${chunkNum}: Found ${findings.length} findings`);
    
    return findings;
    
  } catch (error) {
    console.error(`[${categoryId}] Error analyzing chunk ${chunkNum}:`, error);
    return [];
  }
}

function buildPrompt(categoryId: string, data: any[], chunkNum: number, totalChunks: number): string {
  const dataStr = JSON.stringify(data).slice(0, 8000);
  
  return `You are an Active Directory security expert. Analyze this AD data chunk (${chunkNum}/${totalChunks}) for security issues.

Report findings using the report_findings function with:
- title: Brief, specific title
- severity: critical/high/medium/low
- description: Clear explanation of the risk
- recommendation: Specific remediation steps
- evidence: Relevant data from the analysis

Common issues to check:
- Users with passwords that never expire
- Inactive accounts that are still enabled
- Users with administrative privileges
- Weak password policies
- Missing security settings
- Accounts with password not required
- Service accounts with interactive logon rights
- Privileged users without MFA

Data to analyze:
${dataStr}

Use the report_findings function to report any issues found.`;
}
