create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default 'true'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.site_settings enable row level security;
revoke all on public.site_settings from anon, authenticated;

create table if not exists public.admin_activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.admin_activity_logs enable row level security;
revoke all on public.admin_activity_logs from anon, authenticated;

create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('game','movie','music')),
  title text not null,
  url text,
  description text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.content_items enable row level security;
create index if not exists content_items_kind_idx on public.content_items(kind);
create policy "public reads enabled content" on public.content_items for select using (enabled or public.is_admin());
create policy "admins manage content" on public.content_items for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.content_items to anon, authenticated;
grant insert, update, delete on public.content_items to authenticated;

create or replace function public.log_admin_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then
    insert into public.admin_activity_logs(actor_id, action, target_type, target_id, metadata)
    values (
      auth.uid(),
      lower(tg_op) || '_' || tg_table_name,
      tg_table_name,
      coalesce((to_jsonb(case when tg_op = 'DELETE' then old else new end)->>'id'), ''),
      jsonb_build_object('operation', tg_op)
    );
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end; $$;

drop trigger if exists announcements_admin_audit on public.announcements;
create trigger announcements_admin_audit after insert or update or delete on public.announcements
for each row execute function public.log_admin_change();
drop trigger if exists polls_admin_audit on public.polls;
create trigger polls_admin_audit after insert or update or delete on public.polls
for each row execute function public.log_admin_change();
drop trigger if exists content_items_admin_audit on public.content_items;
create trigger content_items_admin_audit after insert or update or delete on public.content_items
for each row execute function public.log_admin_change();

insert into public.site_settings(key, value) values
  ('feature_chat','true'), ('feature_games','true'), ('feature_movies','true'), ('feature_music','true'), ('maintenance_mode','false')
on conflict (key) do nothing;

create or replace function public.is_site_feature_enabled(p_key text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select (value #>> '{}')::boolean from public.site_settings where key = p_key), true);
$$;
revoke all on function public.is_site_feature_enabled(text) from public;
grant execute on function public.is_site_feature_enabled(text) to anon, authenticated;

create or replace function public.get_site_settings()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  return coalesce((select jsonb_object_agg(key, value) from public.site_settings), '{}'::jsonb);
end; $$;

create or replace function public.set_site_setting(p_key text, p_value jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  if p_key not in ('feature_chat','feature_games','feature_movies','feature_music','maintenance_mode') then raise exception 'Invalid setting'; end if;
  insert into public.site_settings(key,value,updated_at,updated_by) values (p_key,p_value,now(),auth.uid())
  on conflict (key) do update set value=excluded.value, updated_at=now(), updated_by=auth.uid();
  insert into public.admin_activity_logs(actor_id,action,target_type,target_id,metadata) values(auth.uid(),'site_setting_updated','site_setting',p_key,jsonb_build_object('value',p_value));
  return p_value;
end; $$;

create or replace function public.get_admin_activity(p_limit integer default 100)
returns setof public.admin_activity_logs language sql security definer set search_path = public as $$
  select * from public.admin_activity_logs where public.is_admin() order by created_at desc limit least(greatest(p_limit,1),500);
$$;
revoke all on function public.get_site_settings() from public, anon;
revoke all on function public.set_site_setting(text,jsonb) from public, anon;
revoke all on function public.get_admin_activity(integer) from public, anon;
grant execute on function public.get_site_settings() to authenticated;
grant execute on function public.set_site_setting(text,jsonb) to authenticated;
grant execute on function public.get_admin_activity(integer) to authenticated;
