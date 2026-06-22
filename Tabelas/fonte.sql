-- Tabela de Fontes de Busca (ex: Google Maps, Instagram)
create table public.fonte (
    id uuid default gen_random_uuid() primary key,
    nome text not null,
    tipo text not null,
    ativo boolean default true not null
);

-- Habilita RLS (Row Level Security)
alter table public.fonte enable row level security;

-- Políticas de RLS
create policy "Usuários autenticados podem ver as fontes disponíveis."
    on public.fonte for select
    using (auth.role() = 'authenticated');
