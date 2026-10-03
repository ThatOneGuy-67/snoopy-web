create table if not exists public.visitor_bans (
  visitor_id text primary key,
  banned_at timestamptz not null default now(),
  banned_by uuid references auth.users(id) on delete set null
);

alter table public.visitor_bans enable row level security;

revoke all on public.visitor_bans from anon, authenticated;

create or replace function public.set_visitor_ban(p_visitor_id text, p_banned boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;
  if nullif(trim(p_visitor_id), '') is null then
    raise exception 'visitor_id is required';
  end if;
  if p_banned then
    insert into public.visitor_bans(visitor_id, banned_by)
    values (trim(p_visitor_id), auth.uid())
    on conflict (visitor_id) do update set banned_at = now(), banned_by = auth.uid();
  else
    delete from public.visitor_bans where visitor_id = trim(p_visitor_id);
  end if;
  return p_banned;
end;
$$;

revoke execute on function public.set_visitor_ban(text, boolean) from public, anon;
grant execute on function public.set_visitor_ban(text, boolean) to authenticated;

create or replace function public.is_current_visitor_banned()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.visitor_bans
    where visitor_id = ((current_setting('request.headers', true))::json ->> 'x-visitor-id')
  );
$$;

revoke execute on function public.is_current_visitor_banned() from public;
grant execute on function public.is_current_visitor_banned() to anon, authenticated;

create or replace function public.get_admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  return jsonb_build_object(
    'online', (select count(distinct visitor_id)::integer from public.sessions where last_heartbeat > now() - interval '90 seconds'),
    'visitors', (select count(*)::integer from public.visitors),
    'sessions', (select count(*)::integer from public.sessions),
    'all_visitors', coalesce((select jsonb_agg(v order by v.last_seen desc nulls last) from (
      select
        v.visitor_id,
        v.first_seen,
        v.last_seen,
        v.visit_count,
        (s.last_heartbeat > now() - interval '90 seconds') as is_online,
        s.session_id,
        s.started_at,
        s.last_heartbeat,
        extract(epoch from (coalesce(s.last_heartbeat, now()) - s.started_at))::integer as session_duration_seconds,
        (b.visitor_id is not null) as banned
      from public.visitors v
      left join lateral (
        select s.* from public.sessions s
        where s.visitor_id = v.visitor_id
        order by s.last_heartbeat desc nulls last
        limit 1
      ) s on true
      left join public.visitor_bans b on b.visitor_id = v.visitor_id
    ) v), '[]'::jsonb),
    'recent_sessions', coalesce((select jsonb_agg(x) from (
      select session_id, visitor_id, started_at, last_heartbeat
      from public.sessions order by last_heartbeat desc limit 25
    ) x), '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.get_admin_stats() from anon;
