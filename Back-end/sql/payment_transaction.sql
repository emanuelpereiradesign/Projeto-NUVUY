-- Tabela de transações de pagamento (persistente, substitui o paymentMap em memória)
-- Execute no SQL Editor do Supabase (uma vez)

CREATE TABLE IF NOT EXISTS public.payment_transaction (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  misticpay_transaction_id TEXT,
  custom_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDENTE'
    CHECK (status IN ('PENDENTE', 'COMPLETO', 'EXPIRADO', 'CANCELADO')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_payment_tx_misticpay_id
  ON public.payment_transaction (misticpay_transaction_id);

CREATE INDEX IF NOT EXISTS idx_payment_tx_custom_id
  ON public.payment_transaction (custom_id);

CREATE INDEX IF NOT EXISTS idx_payment_tx_user_id
  ON public.payment_transaction (user_id);

-- RLS: usuários veem apenas suas próprias transações
ALTER TABLE public.payment_transaction ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_tx_insert_own"
  ON public.payment_transaction FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "payment_tx_select_own"
  ON public.payment_transaction FOR SELECT
  USING (auth.uid() = user_id);
