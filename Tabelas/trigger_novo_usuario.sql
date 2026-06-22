-- Função Trigger para criar automaticamente o registro de usuário público associado ao plano Gratuito
create or replace function public.handle_new_user()
returns trigger as $$
declare
    default_plano_id uuid;
begin
    -- Busca o ID do plano gratuito cadastrado na tabela de planos
    select id into default_plano_id from public.plano where nome = 'Gratuito' limit 1;

    -- Insere o novo usuário na tabela pública vinculando-o ao plano Gratuito
    insert into public.usuario (id, nome, email, id_plano, leads_utilizados, saldo_tokens)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        new.email,
        default_plano_id,
        0,
        0
    );
    return new;
end;
$$ language plpgsql security definer;

-- Gatilho (Trigger) disparado imediatamente após uma nova linha ser inserida em auth.users
create or replace trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();
