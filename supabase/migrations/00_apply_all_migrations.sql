-- ============================================================================
-- SCRIPT CONSOLIDADO DE MIGRACIONES
-- Aplicar este script completo en el SQL Editor de Supabase Dashboard
-- ============================================================================

-- ============================================================================
-- MIGRACIÓN 1: Crear tablas base y políticas
-- Fecha: 2025-10-30
-- ============================================================================

-- Create assessments table
CREATE TABLE public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'completed', 'error')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create assessment_data table to store raw data from PowerShell script
CREATE TABLE public.assessment_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create findings table to store security findings
CREATE TABLE public.findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  description TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  evidence JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;

-- Create policies - allowing all operations since this is a private admin tool
CREATE POLICY "Allow all operations on assessments"
  ON public.assessments
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on assessment_data"
  ON public.assessment_data
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on findings"
  ON public.findings
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for assessments table
CREATE TRIGGER update_assessments_updated_at
  BEFORE UPDATE ON public.assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_assessments_status ON public.assessments(status);
CREATE INDEX idx_assessments_created_at ON public.assessments(created_at DESC);
CREATE INDEX idx_assessment_data_assessment_id ON public.assessment_data(assessment_id);
CREATE INDEX idx_findings_assessment_id ON public.findings(assessment_id);
CREATE INDEX idx_findings_severity ON public.findings(severity);

-- ============================================================================
-- MIGRACIÓN 2: Agregar columna analysis_progress
-- Fecha: 2025-11-11
-- ============================================================================

ALTER TABLE public.assessments
ADD COLUMN analysis_progress jsonb DEFAULT '{"categories": [], "current": null, "completed": 0, "total": 0}'::jsonb;

-- ============================================================================
-- MIGRACIÓN 3: Agregar category_id a findings
-- Fecha: 2025-11-12
-- ============================================================================

ALTER TABLE findings ADD COLUMN IF NOT EXISTS category_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_findings_assessment_category ON findings(assessment_id, category_id);

-- ============================================================================
-- MIGRACIÓN 4: Crear tabla de configuración AI
-- Fecha: 2025-11-12
-- ============================================================================

CREATE TABLE public.ai_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'gemini' CHECK (provider IN ('gemini', 'lovable')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_config ENABLE ROW LEVEL SECURITY;

-- Allow all operations (admin only feature)
CREATE POLICY "Allow all operations on ai_config"
ON public.ai_config
FOR ALL
USING (true)
WITH CHECK (true);

-- Insert default configuration
INSERT INTO public.ai_config (provider) VALUES ('gemini');

-- Create trigger for updated_at
CREATE TRIGGER update_ai_config_updated_at
BEFORE UPDATE ON public.ai_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- MIGRACIÓN 5: Crear storage bucket y agregar file_path
-- Fecha: 2025-11-13
-- ============================================================================

-- Create storage bucket for assessment files
INSERT INTO storage.buckets (id, name, public)
VALUES ('assessment-files', 'assessment-files', false);

-- Create policy to allow authenticated users to read their own assessment files
CREATE POLICY "Users can view assessment files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'assessment-files' AND auth.uid() IS NOT NULL);

-- Create policy to allow service role to upload files
CREATE POLICY "Service role can upload assessment files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'assessment-files');

-- Create policy to allow service role to update files
CREATE POLICY "Service role can update assessment files"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'assessment-files');

-- Add file_path column to assessments table to track uploaded file
ALTER TABLE assessments
ADD COLUMN file_path TEXT;

-- ============================================================================
-- MIGRACIÓN 6: Actualizar constraint de status
-- Fecha: 2025-11-14
-- ============================================================================

ALTER TABLE public.assessments
DROP CONSTRAINT IF EXISTS assessments_status_check;

ALTER TABLE public.assessments
ADD CONSTRAINT assessments_status_check
CHECK (status IN ('pending', 'analyzing', 'completed', 'uploaded', 'failed'));

-- ============================================================================
-- FIN DE MIGRACIONES
-- ============================================================================
