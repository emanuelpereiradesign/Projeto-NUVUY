-- Tabela de Score (Classificação e pontuação do lead)
create table public.score (
    id uuid default gen_random_uuid() primary key,
    id_lead uuid references public.lead(id) on delete cascade unique not null,
    id_mtc_instagram uuid references public.metrica_instagram(id) on delete set null,
    id_mtc_mps uuid references public.metrica_google_maps(id) on delete set null,
    data_analise timestamp with time zone default timezone('utc'::text, now()) not null,
    pontuacao integer not null check (pontuacao >= 0 and pontuacao <= 100),
    classificacao text not null check (classificacao in ('quente', 'morno', 'frio')),
    justificativa_ia text,
    -- Garante que a classificação do lead corresponda exatamente à pontuação:
    -- quente (71 a 100), morno (41 a 70), frio (0 a 40)
    constraint check_classificacao_faixa check (
        (classificacao = 'quente' and pontuacao >= 71 and pontuacao <= 100) or
        (classificacao = 'morno' and pontuacao >= 41 and pontuacao <= 70) or
        (classificacao = 'frio' and pontuacao >= 0 and pontuacao <= 40)
    )
);

-- Habilita RLS (Row Level Security)
alter table public.score enable row level security;

-- Políticas de RLS
create policy "Usuários podem visualizar pontuações de seus leads."
    on public.score for select
    using (
        exists (
            select 1 from public.lead l
            join public.tarefas t on l.id_tarefas = t.id
            where l.id = id_lead and t.id_usuario = auth.uid()
        )
    );

create policy "Usuários podem criar pontuações para seus leads."
    on public.score for insert
    with check (
        exists (
            select 1 from public.lead l
            join public.tarefas t on l.id_tarefas = t.id
            where l.id = id_lead and t.id_usuario = auth.uid()
        )
    );
