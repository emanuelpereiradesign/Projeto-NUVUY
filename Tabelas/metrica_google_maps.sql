-- Tabela de Métricas do Google Maps
create table public.metrica_google_maps (
    id uuid default gen_random_uuid() primary key,
    id_lead uuid references public.lead(id) on delete cascade unique not null,
    qtd_comentarios integer default 0 not null,
    nota_avaliacao numeric(2,1) check (nota_avaliacao >= 1.0 and nota_avaliacao <= 5.0),
    qualidade_imagens text
);

-- Habilita RLS (Row Level Security)
alter table public.metrica_google_maps enable row level security;

-- Políticas de RLS
create policy "Usuários podem visualizar métricas do Maps de seus leads."
    on public.metrica_google_maps for select
    using (
        exists (
            select 1 from public.lead l
            join public.tarefas t on l.id_tarefas = t.id
            where l.id = id_lead and t.id_usuario = auth.uid()
        )
    );

create policy "Usuários podem criar métricas do Maps de seus leads."
    on public.metrica_google_maps for insert
    with check (
        exists (
            select 1 from public.lead l
            join public.tarefas t on l.id_tarefas = t.id
            where l.id = id_lead and t.id_usuario = auth.uid()
        )
    );
