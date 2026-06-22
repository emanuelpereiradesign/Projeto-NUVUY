-- Tabela Intermediária (Muitos-para-Muitos entre Tarefas e Fontes)
create table public.tarefa_fonte (
    id_tarefa uuid references public.tarefas(id) on delete cascade not null,
    id_fonte uuid references public.fonte(id) on delete cascade not null,
    primary key (id_tarefa, id_fonte)
);

-- Habilita RLS (Row Level Security)
alter table public.tarefa_fonte enable row level security;

-- Políticas de RLS
create policy "Usuários podem ver associações de fontes de suas próprias tarefas."
    on public.tarefa_fonte for select
    using (
        exists (
            select 1 from public.tarefas t
            where t.id = id_tarefa and t.id_usuario = auth.uid()
        )
    );

create policy "Usuários podem criar associações de fontes de suas próprias tarefas."
    on public.tarefa_fonte for insert
    with check (
        exists (
            select 1 from public.tarefas t
            where t.id = id_tarefa and t.id_usuario = auth.uid()
        )
    );
