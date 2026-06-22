-- Tabela de Métricas do Instagram
create table public.metrica_instagram (
    id uuid default gen_random_uuid() primary key,
    id_lead uuid references public.lead(id) on delete cascade unique not null,
    qtd_seguidores integer default 0 not null,
    qtd_postagem integer default 0 not null,
    taxa_engajamento numeric(5,2) default 0.00 not null,
    qualidade_postagem text,
    nicho_atuacao text
);

-- Habilita RLS (Row Level Security)
alter table public.metrica_instagram enable row level security;

-- Políticas de RLS
create policy "Usuários podem visualizar métricas do Instagram de seus leads."
    on public.metrica_instagram for select
    using (
        exists (
            select 1 from public.lead l
            join public.tarefas t on l.id_tarefas = t.id
            where l.id = id_lead and t.id_usuario = auth.uid()
        )
    );

create policy "Usuários podem criar métricas do Instagram de seus leads."
    on public.metrica_instagram for insert
    with check (
        exists (
            select 1 from public.lead l
            join public.tarefas t on l.id_tarefas = t.id
            where l.id = id_lead and t.id_usuario = auth.uid()
        )
    );
