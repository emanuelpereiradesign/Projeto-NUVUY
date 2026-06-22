-- Tabela de Planos de Assinatura
create table public.plano (
    id uuid default gen_random_uuid() primary key,
    nome text not null unique,
    valor numeric(10,2) not null,
    limite_mensal integer not null,
    max_leads_tarefa integer not null default 10,
    max_tarefas_mes integer not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilita RLS (Row Level Security)
alter table public.plano enable row level security;

-- Políticas de RLS (Permite que usuários logados leiam os planos)
create policy "Qualquer usuário autenticado pode ver os planos."
    on public.plano for select
    using (auth.role() = 'authenticated');

-- Insere os planos iniciais definidos no DOCUMENTO.md (SaaS Monetization)
insert into public.plano (nome, valor, limite_mensal, max_leads_tarefa, max_tarefas_mes)
values 
    ('Gratuito', 0.00, 50, 10, 5),
    ('Básico', 49.00, 200, 10, 20),
    ('Pro', 97.00, 600, 10, 60)
on conflict (nome) do update set
    valor = excluded.valor,
    limite_mensal = excluded.limite_mensal,
    max_leads_tarefa = excluded.max_leads_tarefa,
    max_tarefas_mes = excluded.max_tarefas_mes;
