-- Tabela de Tarefas (Buscas executadas pelo usuário)
create table public.tarefas (
    id uuid default gen_random_uuid() primary key,
    id_usuario uuid references public.usuario(id) on delete cascade not null,
    data timestamp with time zone default timezone('utc'::text, now()) not null,
    termo_busca text not null,
    local text not null,
    status text default 'pendente' not null
);

-- Habilita RLS (Row Level Security)
alter table public.tarefas enable row level security;

-- Políticas de RLS
create policy "Usuários podem visualizar suas próprias tarefas."
    on public.tarefas for select
    using (auth.uid() = id_usuario);

create policy "Usuários podem criar suas próprias tarefas."
    on public.tarefas for insert
    with check (auth.uid() = id_usuario);

create policy "Usuários podem atualizar suas próprias tarefas."
    on public.tarefas for update
    using (auth.uid() = id_usuario);

create policy "Usuários podem deletar suas próprias tarefas."
    on public.tarefas for delete
    using (auth.uid() = id_usuario);
