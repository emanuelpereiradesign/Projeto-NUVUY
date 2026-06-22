-- Tabela de Leads
create table public.lead (
    id uuid default gen_random_uuid() primary key,
    id_tarefas uuid references public.tarefas(id) on delete cascade not null,
    nome text not null,
    email text,
    telefone text,
    website text,
    endereco text,
    categoria text,
    data_captura timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilita RLS (Row Level Security)
alter table public.lead enable row level security;

-- Políticas de RLS
create policy "Usuários podem visualizar leads vinculados às suas tarefas."
    on public.lead for select
    using (
        exists (
            select 1 from public.tarefas t
            where t.id = id_tarefas and t.id_usuario = auth.uid()
        )
    );

create policy "Usuários podem criar leads vinculados às suas tarefas."
    on public.lead for insert
    with check (
        exists (
            select 1 from public.tarefas t
            where t.id = id_tarefas and t.id_usuario = auth.uid()
        )
    );

create policy "Usuários podem deletar leads vinculados às suas tarefas."
    on public.lead for delete
    using (
        exists (
            select 1 from public.tarefas t
            where t.id = id_tarefas and t.id_usuario = auth.uid()
        )
    );
