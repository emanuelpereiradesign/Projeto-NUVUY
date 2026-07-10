-- =============================================
-- MIGRAÇÃO: Sistema de Créditos e Planos
-- =============================================

-- 0. Adiciona coluna creditos_mensais na tabela plano
ALTER TABLE public.plano
  ADD COLUMN IF NOT EXISTS creditos_mensais INTEGER;

-- 1. Adiciona colunas de créditos à tabela usuario
ALTER TABLE public.usuario
  ADD COLUMN IF NOT EXISTS creditos_restantes INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS creditos_utilizados INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS periodo_inicio TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS proxima_renovacao TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days';

-- 2. Popula a tabela plano com os planos disponíveis (se vazia)
INSERT INTO public.plano (nome, valor, limite_mensal, max_leads_tarefa, max_tarefas_mes, creditos_mensais)
SELECT * FROM (VALUES
  ('Gratuito', 0, 50, 10, 5, 100),
  ('Básico', 49, 200, 10, 20, 400),
  ('Pro', 97, 600, 10, 60, 1200),
  ('Business', 149, 1000, 10, 100, 2000)
) AS v(nome, valor, limite_mensal, max_leads_tarefa, max_tarefas_mes, creditos_mensais)
WHERE NOT EXISTS (SELECT 1 FROM public.plano LIMIT 1);

-- 3. Trigger: ao criar usuário, inicializa créditos
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usuario (id, nome, email, plano, creditos_restantes, creditos_utilizados, periodo_inicio, proxima_renovacao)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'gratuito',
    100,
    0,
    NOW(),
    NOW() + INTERVAL '30 days'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recria a trigger (se já existir, substitui)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
