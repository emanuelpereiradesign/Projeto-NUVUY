-- Tabela de Usuários (Extensão dos dados de autenticação com limites de plano)
create table public.usuario (
    id uuid references auth.users(id) on delete cascade primary key,
    nome text,
    email text not null,
    data_cadastro timestamp with time zone default timezone('utc'::text, now()) not null,
    id_plano uuid references public.plano(id),                     -- Referência ao plano contratado
    leads_utilizados integer default 0 not null,                    -- Leads consumidos no mês
    saldo_tokens integer default 0 not null                        -- Saldo de tokens extras comprados
);

-- Habilita RLS (Row Level Security)
alter table public.usuario enable row level security;

-- Políticas de RLS
create policy "Usuários podem ver seus próprios dados de perfil."
    on public.usuario for select
    using (auth.uid() = id);

create policy "Usuários podem atualizar seu próprio perfil."
    on public.usuario for update
    using (auth.uid() = id);

create policy "Usuários podem inserir seu próprio perfil."
    on public.usuario for insert
    with check (auth.uid() = id);
