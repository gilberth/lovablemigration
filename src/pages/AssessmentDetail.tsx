import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, Shield, Users, FileText, AlertTriangle, RefreshCw, Upload } from "lucide-react";
import Header from "@/components/layout/Header";
import SeverityBadge from "@/components/assessment/SeverityBadge";
import AnalysisProgress from "@/components/assessment/AnalysisProgress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { generateReport } from "@/lib/reportGenerator";

const AssessmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState<any>(null);
  const [findings, setFindings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [rawData, setRawData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) {
      loadAssessment();
      
      // Poll for updates every 5 seconds if analyzing (faster updates for progress)
      const interval = setInterval(() => {
        if (assessment?.status === 'analyzing') {
          loadAssessment();
        }
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [id, assessment?.status]);

  const handleRetryAnalysis = async () => {
    if (!id || !assessment?.file_path) return;
    
    setRetrying(true);
    try {
      toast({
        title: "Descargando archivo",
        description: "Preparando datos para re-análisis...",
      });

      // Download the file from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('assessment-files')
        .download(assessment.file_path);

      if (downloadError || !fileData) {
        throw new Error('No se pudo descargar el archivo');
      }

      // Parse JSON
      const text = await fileData.text();
      const fullData = JSON.parse(text);
      const users = fullData.Users || [];

      if (!Array.isArray(users) || users.length === 0) {
        throw new Error('No se encontraron usuarios en el archivo');
      }

      const CHUNK_SIZE = 1000;
      const totalChunks = Math.ceil(users.length / CHUNK_SIZE);
      
      toast({
        title: "Dividiendo datos",
        description: `Creando ${totalChunks} lotes de ${users.length} usuarios...`,
      });

      // Upload chunks to storage
      const chunkPaths: string[] = [];
      for (let i = 0; i < totalChunks; i++) {
        const chunkStart = i * CHUNK_SIZE;
        const chunkEnd = Math.min((i + 1) * CHUNK_SIZE, users.length);
        const chunkUsers = users.slice(chunkStart, chunkEnd);
        
        const chunkData = { Users: chunkUsers };
        const chunkJson = JSON.stringify(chunkData);
        const chunkBlob = new Blob([chunkJson], { type: 'application/json' });
        const chunkPath = `${id}/categories/users_chunk_${i + 1}.json`;

        const { error: uploadError } = await supabase.storage
          .from('assessment-files')
          .upload(chunkPath, chunkBlob, {
            contentType: 'application/json',
            upsert: true
          });

        if (uploadError) {
          console.error('Error uploading chunk:', uploadError);
          throw new Error(`Error subiendo lote ${i + 1}`);
        }

        chunkPaths.push(chunkPath);
      }

      // Process chunks in batches
      const BATCH_SIZE = 15;
      const totalBatches = Math.ceil(totalChunks / BATCH_SIZE);
      
      toast({
        title: "Iniciando análisis",
        description: `Procesando ${totalChunks} lotes en ${totalBatches} grupos...`,
      });

      for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
        const batchStart = batchNum * BATCH_SIZE;
        const batchEnd = Math.min((batchNum + 1) * BATCH_SIZE, totalChunks);
        
        // Process chunks in this batch in parallel
        const batchPromises = [];
        for (let i = batchStart; i < batchEnd; i++) {
          batchPromises.push(
            supabase.functions.invoke('analyze-category', {
              body: {
                assessmentId: id,
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

        await Promise.allSettled(batchPromises);
        
        // Update progress
        await supabase.from('assessments').update({
          analysis_progress: {
            categories: [{ id: 'users', status: 'processing' }],
            current: `Grupo ${batchNum + 1}/${totalBatches} completado`,
            completed: batchEnd,
            total: totalChunks,
            batchInfo: {
              totalChunks,
              totalBatches,
              currentBatch: batchNum + 1,
              chunksProcessed: batchEnd
            }
          }
        }).eq('id', id);
        
        toast({
          title: `Grupo ${batchNum + 1}/${totalBatches}`,
          description: `Procesados ${batchEnd}/${totalChunks} lotes`,
        });
      }

      toast({
        title: "Análisis en progreso",
        description: "Los datos se están analizando. La página se actualizará automáticamente.",
      });

      setTimeout(() => {
        loadAssessment();
        setRetrying(false);
      }, 2000);

    } catch (error) {
      console.error('Error retrying analysis:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo reintentar el análisis",
        variant: "destructive",
      });
      setRetrying(false);
    }
  };

  const handleUploadFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !id) return;

    // Validate file type
    if (!file.name.endsWith('.json')) {
      toast({
        title: "Error",
        description: "Por favor selecciona un archivo JSON válido",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Check file size
      const fileSizeMB = file.size / (1024 * 1024);
      const maxSizeMB = 500;
      
      if (fileSizeMB > maxSizeMB) {
        toast({
          title: "Archivo demasiado grande",
          description: `El archivo es de ${fileSizeMB.toFixed(1)}MB. El límite máximo es ${maxSizeMB}MB.`,
          variant: "destructive",
        });
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      
      toast({
        title: "Procesando archivo",
        description: `${fileSizeMB.toFixed(1)}MB - Dividiendo y subiendo...`,
      });

      // Read and parse the JSON file
      const text = await file.text();
      const fullData = JSON.parse(text);

      // Define categories
      const categories = [
        { id: 'users', name: 'Análisis de Usuarios' },
        { id: 'gpos', name: 'Análisis de GPOs' },
        { id: 'domain', name: 'Configuración de Dominio' },
        { id: 'security', name: 'Políticas de Seguridad' },
        { id: 'dc_health', name: 'Salud de Controladores de Dominio' },
        { id: 'forest_domain', name: 'Bosque y Dominio' },
        { id: 'dns', name: 'Configuración DNS' },
        { id: 'dhcp', name: 'Configuración DHCP' }
      ];

      // Extract category data function
      const extractCategoryData = (fullData: any, categoryId: string): any => {
        switch (categoryId) {
          case 'users':
            return { Users: fullData.Users || [] };
          case 'gpos':
            return { GPOs: fullData.GPOs || [] };
          case 'domain':
            return { Domain: fullData.Domain || {}, DomainControllers: fullData.DomainControllers || [] };
          case 'security':
            return { 
              PasswordPolicy: fullData.PasswordPolicy,
              KerberosPolicy: fullData.KerberosPolicy,
              AccountLockoutPolicy: fullData.AccountLockoutPolicy
            };
          case 'dc_health':
            return { DomainControllers: fullData.DomainControllers || [] };
          case 'forest_domain':
            return { Forest: fullData.Forest, Domain: fullData.Domain };
          case 'dns':
            return { DNS: fullData.DNS || {} };
          case 'dhcp':
            return { DHCP: fullData.DHCP || {} };
          default:
            return {};
        }
      };

      // Upload full file first for reference
      const mainFileName = `${id}/${Date.now()}-${file.name}`;
      await supabase.storage
        .from('assessment-files')
        .upload(mainFileName, file, {
          contentType: 'application/json',
          upsert: false
        });

      // Update assessment with file path and initialize progress
      await supabase
        .from('assessments')
        .update({
          file_path: mainFileName,
          status: 'analyzing',
          analysis_progress: {
            categories: categories.map(c => ({ ...c, status: 'pending' })),
            current: null,
            completed: 0,
            total: categories.length
          }
        })
        .eq('id', id);

      // Split and upload each category, then trigger analysis
      for (const category of categories) {
        const categoryData = extractCategoryData(fullData, category.id);
        
        // Special handling for large user data - split into chunks client-side
        if (category.id === 'users' && categoryData.Users && Array.isArray(categoryData.Users)) {
          const users = categoryData.Users;
          const CHUNK_SIZE = 1000; // 1000 users per chunk
          const totalChunks = Math.ceil(users.length / CHUNK_SIZE);
          
          console.log(`Splitting ${users.length} users into ${totalChunks} chunks`);
          
          toast({
            title: "Procesando usuarios",
            description: `Dividiendo ${users.length} usuarios en ${totalChunks} lotes para análisis...`,
          });

          // Update progress to show chunked processing
          await supabase.from('assessments').update({
            analysis_progress: {
              categories: categories.map(c => ({ ...c, status: c.id === 'users' ? 'processing' : 'pending' })),
              current: `Procesando ${totalChunks} lotes de usuarios...`,
              completed: 0,
              total: categories.length + totalChunks - 1 // Adjust total for chunks
            }
          }).eq('id', id);

          // Process each chunk
          for (let i = 0; i < totalChunks; i++) {
            const chunkStart = i * CHUNK_SIZE;
            const chunkEnd = Math.min((i + 1) * CHUNK_SIZE, users.length);
            const chunkUsers = users.slice(chunkStart, chunkEnd);
            
            const chunkData = { Users: chunkUsers };
            const chunkJson = JSON.stringify(chunkData);
            const chunkBlob = new Blob([chunkJson], { type: 'application/json' });
            const chunkPath = `${id}/categories/users_chunk_${i + 1}.json`;

            // Upload chunk
            await supabase.storage
              .from('assessment-files')
              .upload(chunkPath, chunkBlob, {
                contentType: 'application/json',
                upsert: true
              });

            console.log(`Uploaded chunk ${i + 1}/${totalChunks}: ${chunkUsers.length} users, ${(chunkBlob.size/1024).toFixed(1)}KB`);

            // Trigger analysis for this chunk
            supabase.functions.invoke('analyze-category', {
              body: {
                assessmentId: id,
                categoryId: `users_chunk_${i + 1}`,
                categoryFilePath: chunkPath,
                isChunk: true,
                chunkInfo: {
                  chunkNumber: i + 1,
                  totalChunks: totalChunks,
                  parentCategory: 'users'
                }
              }
            }).catch(err => console.error(`Error analyzing users chunk ${i + 1}:`, err));
          }
          
          continue; // Skip normal processing for users
        }

        // Standard processing for non-chunked categories
        const categoryJson = JSON.stringify(categoryData);
        const categoryBlob = new Blob([categoryJson], { type: 'application/json' });
        const categoryPath = `${id}/categories/${category.id}.json`;

        // Upload category file
        await supabase.storage
          .from('assessment-files')
          .upload(categoryPath, categoryBlob, {
            contentType: 'application/json',
            upsert: true
          });

        // Standard analysis
        supabase.functions.invoke('analyze-category', {
          body: {
            assessmentId: id,
            categoryId: category.id,
            categoryFilePath: categoryPath
          }
        }).catch(err => console.error(`Error analyzing ${category.id}:`, err));
      }

      toast({
        title: "¡Éxito!",
        description: "Archivo procesado y análisis iniciado.",
      });

      // Reload assessment after a moment
      setTimeout(() => {
        loadAssessment();
      }, 2000);

    } catch (error: any) {
      console.error('Error uploading file:', error);
      
      let errorMessage = "No se pudo procesar el archivo JSON";
      
      if (error.message === 'timeout') {
        errorMessage = "La subida está tomando demasiado tiempo. El análisis puede continuar en segundo plano. Verifica el progreso en unos minutos.";
      } else if (error.message?.toLowerCase().includes('memory') || error.message?.includes('FunctionsHttpError')) {
        errorMessage = "El archivo es demasiado grande para procesar online. Usa el script de PowerShell en el DC.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error al cargar archivo",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownloadReport = async () => {
    if (!assessment || !rawData) {
      toast({
        title: "Error",
        description: "No se pueden generar reportes sin datos de evaluación",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "Generando reporte",
        description: "Por favor espere...",
      });

      const blob = await generateReport({
        assessment,
        findings,
        rawData: rawData.data,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `assessment-${assessment.domain}-${new Date().toISOString().split('T')[0]}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Reporte generado",
        description: "El reporte se ha descargado correctamente",
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: "Error al generar el reporte",
        variant: "destructive",
      });
    }
  };

  const handleDownloadRawData = async () => {
    if (!rawData) {
      toast({
        title: "Error",
        description: "No hay datos raw disponibles para descargar",
        variant: "destructive",
      });
      return;
    }

    try {
      setDownloading(true);
      
      // Convert the raw data to JSON blob and download
      const jsonString = JSON.stringify(rawData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `raw-data-${assessment?.domain || 'assessment'}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Datos descargados",
        description: "Los datos raw se han descargado correctamente",
      });
    } catch (error) {
      console.error('Error downloading raw data:', error);
      toast({
        title: "Error",
        description: "Error al descargar los datos raw",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const loadAssessment = async () => {
    try {
      // Load assessment
      const { data: assessmentData, error: assessmentError } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', id)
        .single();

      if (assessmentError) throw assessmentError;

      // Load assessment data for stats - handle case where no data exists
      const { data: rawDataResult, error: dataError } = await supabase
        .from('assessment_data')
        .select('data')
        .eq('assessment_id', id)
        .maybeSingle(); // Use maybeSingle to avoid error when no rows

      if (dataError) {
        console.error('Error fetching raw data:', dataError);
      } else if (rawDataResult) {
        setRawData(rawDataResult);
      } else {
        console.log('No raw data yet - file not uploaded');
      }

      // Load findings
      const { data: findingsData, error: findingsError } = await supabase
        .from('findings')
        .select('*')
        .eq('assessment_id', id)
        .order('severity', { ascending: true });

      if (findingsError) throw findingsError;

      // Extract stats from raw data - handle case where no data exists yet
      const dataObj = rawDataResult?.data as any;
      const stats = dataObj ? {
        totalUsers: dataObj.Users?.Total || 0,
        privilegedUsers: dataObj.Users?.Privileged || 0,
        inactiveUsers: dataObj.Users?.Inactive || 0,
        gpoCount: dataObj.GPOs?.length || 0,
      } : {
        totalUsers: 0,
        privilegedUsers: 0,
        inactiveUsers: 0,
        gpoCount: 0,
      };

      setAssessment({
        ...assessmentData,
        stats,
      });
      setFindings(findingsData || []);
    } catch (error) {
      console.error('Error loading assessment:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <Header />
        <main className="container py-8">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Cargando assessment...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <Header />
        <main className="container py-8">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Assessment no encontrado</p>
            <Link to="/">
              <Button className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver al Dashboard
              </Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      
      <main className="container py-8">
        <div className="mb-6">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al Dashboard
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">{assessment.domain}</h1>
              <p className="text-muted-foreground">
                Assessment realizado el {new Date(assessment.created_at).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Estado: {assessment.status === 'completed' ? 'Completado' : 
                        assessment.status === 'analyzing' ? 'Analizando' : 
                        assessment.status === 'uploaded' ? 'Archivo Subido - Listo para Procesar' : 
                        'Pendiente'}
              </p>
            </div>
            <div className="flex gap-3">
              {(assessment.status === 'pending' || assessment.status === 'uploaded') && !rawData && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button 
                    onClick={handleUploadFile} 
                    disabled={uploading}
                    size="lg"
                    variant="default"
                  >
                    <Upload className={`h-5 w-5 mr-2 ${uploading ? 'animate-pulse' : ''}`} />
                    {uploading ? 'Subiendo...' : 'Subir Datos JSON'}
                  </Button>
                </>
              )}
              {assessment.status === 'analyzing' && (
                <Button onClick={handleRetryAnalysis} disabled={retrying} variant="outline" size="lg">
                  <RefreshCw className={`h-5 w-5 mr-2 ${retrying ? 'animate-spin' : ''}`} />
                  {retrying ? 'Reintentando...' : 'Reintentar Análisis'}
                </Button>
              )}
              {assessment.status === 'completed' && (
                <>
                  <Button onClick={handleDownloadReport} size="lg">
                    <Download className="h-5 w-5 mr-2" />
                    Descargar Informe Word
                  </Button>
                  {assessment.file_path && (
                    <Button 
                      onClick={handleDownloadRawData} 
                      variant="outline"
                      disabled={downloading}
                      size="lg"
                    >
                      <Download className="h-5 w-5 mr-2" />
                      {downloading ? 'Descargando...' : 'Descargar Datos Raw'}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Information banner for pending assessments */}
          {assessment.status === 'pending' && !rawData && (
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
              <h3 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">
                💡 ¿Cómo subir los datos del DC?
              </h3>
              <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                <p><strong>Opción 1 - DC con Internet:</strong></p>
                <p className="ml-4">Ejecuta el script sin parámetros: <code className="bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded">.\AD-Assessment.ps1</code></p>
                
                <p className="mt-3"><strong>Opción 2 - DC sin Internet (Recomendado):</strong></p>
                <ol className="ml-4 list-decimal space-y-1">
                  <li>En el DC: <code className="bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded">.\AD-Assessment.ps1 -OfflineMode</code></li>
                  <li>El script guardará el JSON en <code className="bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded">C:\AD-Assessments\</code></li>
                  <li>Copia el archivo JSON a una PC con internet</li>
                  <li>Usa el botón "Subir Datos JSON" arriba para cargar el archivo</li>
                </ol>
                
                <p className="mt-3 text-xs">
                  ℹ️ Archivos mayores a 10MB se suben directamente al almacenamiento para evitar problemas de memoria
                </p>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Usuarios</p>
                    <p className="text-2xl font-bold">{assessment.stats.totalUsers}</p>
                  </div>
                  <Users className="h-8 w-8 text-primary opacity-70" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Privilegiados</p>
                    <p className="text-2xl font-bold">{assessment.stats.privilegedUsers}</p>
                  </div>
                  <Shield className="h-8 w-8 text-primary opacity-70" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Inactivos</p>
                    <p className="text-2xl font-bold">{assessment.stats.inactiveUsers}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-severity-medium opacity-70" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">GPOs</p>
                    <p className="text-2xl font-bold">{assessment.stats.gpoCount}</p>
                  </div>
                  <FileText className="h-8 w-8 text-primary opacity-70" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Findings Section */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Hallazgos de Seguridad</h2>
          
          {/* Show progress when analyzing */}
          {assessment.status === 'analyzing' && (
            <AnalysisProgress 
              status={assessment.status} 
              createdAt={assessment.created_at}
              progress={assessment.analysis_progress}
            />
          )}
          
          {findings.length === 0 && assessment.status !== 'analyzing' ? (
            <div className="text-center py-12 bg-card rounded-lg border border-border">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">
                No se encontraron hallazgos para este assessment.
              </p>
            </div>
          ) : findings.length > 0 ? (
            <div className="space-y-4">
              {findings.map((finding) => (
                <Card key={finding.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <SeverityBadge severity={finding.severity} />
                          <CardTitle className="text-xl">{finding.title}</CardTitle>
                        </div>
                        <CardDescription>{finding.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="font-semibold mb-2 text-sm">Recomendación:</h4>
                      <p className="text-sm text-muted-foreground">{finding.recommendation}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
};

export default AssessmentDetail;
