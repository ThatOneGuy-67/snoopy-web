create or replace function public.get_admin_stats()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  stats jsonb;
begin
  if not coalesce(public.is_admin(), false) then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  select pg_catalog.jsonb_build_object(
    'online', (
      select count(distinct visitor_id)::integer
      from public.sessions
      where last_heartbeat >= pg_catalog.now() - interval '90 seconds'
    ),
    'visitors', (select count(*)::integer from public.visitors),
    'sessions', (select count(*)::integer from public.sessions),
    'recent_sessions', coalesce((
      select pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'session_id', recent.session_id,
          'visitor_id', recent.visitor_id,
          'started_at', recent.started_at,
          'last_heartbeat', recent.last_heartbeat
        )
        order by recent.last_heartbeat desc
      )
      from (
        select session_id, visitor_id, started_at, last_heartbeat
        from public.sessions
        order by last_heartbeat desc
        limit 10
      ) as recent
    ), '[]'::jsonb)
  ) into stats;

  return stats;
end;
$$;

revoke all on function public.get_admin_stats() from public;
revoke all on function public.get_admin_stats() from anon;
grant execute on function public.get_admin_stats() to authenticated;