-- Fase 1: Sistema de Roles e Permissões

-- 1. Criar enum para roles
create type public.app_role as enum ('dono', 'barbeiro', 'cliente');

-- 2. Criar tabela user_roles
create table public.user_roles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    role app_role not null,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    unique (user_id, role)
);

-- 3. Habilitar RLS
alter table public.user_roles enable row level security;

-- 4. Criar função security definer para verificar roles
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- 5. Políticas RLS para user_roles
-- Todos podem ver seus próprios roles
create policy "Users can view their own roles"
on public.user_roles
for select
to authenticated
using (auth.uid() = user_id);

-- Apenas donos podem inserir roles
create policy "Only owners can insert roles"
on public.user_roles
for insert
to authenticated
with check (public.has_role(auth.uid(), 'dono'));

-- Apenas donos podem atualizar roles
create policy "Only owners can update roles"
on public.user_roles
for update
to authenticated
using (public.has_role(auth.uid(), 'dono'));

-- Apenas donos podem deletar roles
create policy "Only owners can delete roles"
on public.user_roles
for delete
to authenticated
using (public.has_role(auth.uid(), 'dono'));

-- 6. Criar índice para melhor performance
create index idx_user_roles_user_id on public.user_roles(user_id);
create index idx_user_roles_role on public.user_roles(role);

-- 7. Criar tabela de auditoria de mudanças de roles
create table public.role_audit_log (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null,
    changed_by uuid references auth.users(id),
    old_role app_role,
    new_role app_role,
    action text not null,
    created_at timestamp with time zone default now()
);

alter table public.role_audit_log enable row level security;

-- Apenas donos podem ver auditoria
create policy "Only owners can view audit log"
on public.role_audit_log
for select
to authenticated
using (public.has_role(auth.uid(), 'dono'));

-- 8. Trigger para auditoria automática
create or replace function public.audit_role_changes()
returns trigger
language plpgsql
security definer
as $$
begin
  if (TG_OP = 'INSERT') then
    insert into public.role_audit_log (user_id, changed_by, new_role, action)
    values (NEW.user_id, auth.uid(), NEW.role, 'INSERT');
  elsif (TG_OP = 'UPDATE') then
    insert into public.role_audit_log (user_id, changed_by, old_role, new_role, action)
    values (NEW.user_id, auth.uid(), OLD.role, NEW.role, 'UPDATE');
  elsif (TG_OP = 'DELETE') then
    insert into public.role_audit_log (user_id, changed_by, old_role, action)
    values (OLD.user_id, auth.uid(), OLD.role, 'DELETE');
  end if;
  return NEW;
end;
$$;

create trigger role_changes_audit
after insert or update or delete on public.user_roles
for each row execute function public.audit_role_changes();