-- Tabela de fila de jobs para captura assíncrona de leads
-- Execute no SQL Editor do Supabase (uma vez)

CREATE TABLE IF NOT EXISTS public.job_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  nicho TEXT NOT NULL,
  regiao TEXT NOT NULL,
  quantidade INTEGER NOT NULL,
  fontes JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  result JSONB,
  creditos_gastos INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Índice para o worker encontrar rapidamente jobs pendentes
CREATE INDEX IF NOT EXISTS idx_job_queue_status_created
  ON public.job_queue (status, created_at);

-- Segurança: RLS para que usuários vejam apenas seus próprios jobs
ALTER TABLE public.job_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_queue_insert_own"
  ON public.job_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "job_queue_select_own"
  ON public.job_queue FOR SELECT
  USING (auth.uid() = user_id);
