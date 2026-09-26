alter table public.sessions
  add column if not exists device_type text not null default 'Unknown',
  add column if not exists operating_system text not null default 'Unknown',
  add column if not exists browser text not null default 'Unknown',
  add column if not exists current_path text not null default '/',
  add column if not exists referrer_domain text,
  add column if not exists pages_visited jsonb not null default '[]'::jsonb,
  add column if not exists is_online boolean not null default false,
  add column if not exists last_activity timestamptz;

update public.sessions
set last_activity = last_heartbeat
where last_activity is null;

update public.visitors as visitor
set visit_count = greatest(
  coalesce(visitor.visit_count, 0),
  (select count(*)::integer from public.sessions as session where session.visitor_id = visitor.visitor_id)
)
where coalesce(visitor.visit_count, 0) < (
  select count(*)::integer from public.sessions as session where session.visitor_id = visitor.visitor_id
);

create or replace function public.record_visitor_activity(
  p_visitor_id text,
  p_session_id text,
  p_device_type text,
  p_operating_system text,
  p_browser text,
  p_current_path text,
  p_referrer_domain text,
  p_is_online boolean,
  p_last_activity timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_row public.sessions%rowtype;
  visitor_row_id uuid;
  is_new_session boolean;
  activity_path text;
  activity_pages jsonb;
  referrer_host text;
  safe_device text;
  safe_os text;
  safe_browser text;
begin
  if p_visitor_id is null or p_visitor_id !~ '^[A-Za-z0-9_-]{16,128}$'
    or p_session_id is null or p_session_id !~ '^[A-Za-z0-9_-]{16,128}$' then
    raise exception 'Invalid anonymous visitor or session ID' using errcode = '22023';
  end if;

  safe_device := case when p_device_type in ('Desktop', 'Mobile', 'Tablet') then p_device_type else 'Unknown' end;
  safe_os := pg_catalog.left(coalesce(nullif(pg_catalog.btrim(p_operating_system), ''), 'Unknown'), 80);
  safe_browser := pg_catalog.left(coalesce(nullif(pg_catalog.btrim(p_browser), ''), 'Unknown'), 80);
  activity_path := pg_catalog.left(
    pg_catalog.split_part(pg_catalog.split_part(coalesce(p_current_path, '/'), '?', 1), '#', 1),
    2048
  );
  if activity_path = '' or pg_catalog.left(activity_path, 1) <> '/' then
    activity_path := '/';
  end if;
  referrer_host := case
    when p_referrer_domain ~ '^[A-Za-z0-9.-]{1,253}$' then pg_catalog.lower(p_referrer_domain)
    else null
  end;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('session:' || p_session_id, 0));
  select * into session_row
  from public.sessions
  where session_id = p_session_id
  order by started_at desc
  limit 1
  for update;
  is_new_session := not found;
  if not is_new_session and session_row.visitor_id <> p_visitor_id then
    raise exception 'Session does not belong to this anonymous visitor' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('visitor:' || p_visitor_id, 0));
  select id into visitor_row_id
  from public.visitors
  where visitor_id = p_visitor_id
  order by first_seen
  limit 1
  for update;

  if not found then
    insert into public.visitors (id, visitor_id, first_seen, last_seen, visit_count)
    values (
      pg_catalog.gen_random_uuid(), p_visitor_id, pg_catalog.now(), pg_catalog.now(),
      greatest(
        1,
        (select count(*)::integer from public.sessions as existing where existing.visitor_id = p_visitor_id)
          + case when is_new_session then 1 else 0 end
      )
    );
  else
    update public.visitors
    set last_seen = pg_catalog.now(),
        visit_count = greatest(
          coalesce(visit_count, 0),
          (select count(*)::integer from public.sessions as existing where existing.visitor_id = p_visitor_id)
        ) + case when is_new_session then 1 else 0 end
    where id = visitor_row_id;
  end if;

  if is_new_session then
    insert into public.sessions (
      id, session_id, visitor_id, started_at, last_heartbeat, last_activity,
      device_type, operating_system, browser, current_path, referrer_domain,
      pages_visited, is_online
    ) values (
      pg_catalog.gen_random_uuid(), p_session_id, p_visitor_id, pg_catalog.now(), pg_catalog.now(),
      greatest(pg_catalog.now(), coalesce(least(p_last_activity, pg_catalog.now()), pg_catalog.now())),
      safe_device, safe_os, safe_browser, activity_path, referrer_host,
      pg_catalog.jsonb_build_array(activity_path), coalesce(p_is_online, false)
    );
  else
    activity_pages := case
      when pg_catalog.jsonb_typeof(session_row.pages_visited) = 'array' then session_row.pages_visited
      else '[]'::jsonb
    end;
    if not (activity_pages @> pg_catalog.jsonb_build_array(activity_path)) then
      activity_pages := activity_pages || pg_catalog.jsonb_build_array(activity_path);
      while pg_catalog.jsonb_array_length(activity_pages) > 100 loop
        activity_pages := activity_pages - 0;
      end loop;
    end if;

    update public.sessions
    set visitor_id = p_visitor_id,
        last_heartbeat = pg_catalog.now(),
        last_activity = greatest(
          session_row.started_at,
          coalesce(least(p_last_activity, pg_catalog.now()), pg_catalog.now())
        ),
        device_type = safe_device,
        operating_system = safe_os,
        browser = safe_browser,
        current_path = activity_path,
        referrer_domain = coalesce(session_row.referrer_domain, referrer_host),
        pages_visited = activity_pages,
        is_online = coalesce(p_is_online, false)
    where id = session_row.id;
  end if;
end;
$$;

revoke all on function public.record_visitor_activity(text, text, text, text, text, text, text, boolean, timestamptz) from public;
grant execute on function public.record_visitor_activity(text, text, text, text, text, text, text, boolean, timestamptz) to anon, authenticated;

create or replace function public.submit_poll_vote(
  p_poll_id uuid,
  p_voter_id text,
  p_option_index integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  poll_options jsonb;
begin
  if p_poll_id is null or p_voter_id is null or p_voter_id !~ '^[A-Za-z0-9_-]{16,128}$' then
    raise exception 'Invalid anonymous voter ID' using errcode = '22023';
  end if;
  if p_option_index is null or p_option_index < 0 then
    raise exception 'Invalid poll option' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_poll_id::text || ':' || p_voter_id, 0)
  );

  select poll.options into poll_options
  from public.polls as poll
  where poll.id = p_poll_id
    and poll.enabled
    and (poll.starts_at is null or poll.starts_at <= pg_catalog.now())
    and (poll.ends_at is null or poll.ends_at >= pg_catalog.now())
  for share;

  if not found then
    raise exception 'Poll is not active' using errcode = '22023';
  end if;
  if coalesce(pg_catalog.jsonb_typeof(poll_options), '') <> 'array' then
    raise exception 'Poll has invalid options' using errcode = '22023';
  end if;
  if p_option_index >= pg_catalog.jsonb_array_length(poll_options) then
    raise exception 'Invalid poll option' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.poll_votes as vote
    where vote.poll_id = p_poll_id and vote.voter_id = p_voter_id
  ) then
    raise exception 'This anonymous voter has already voted' using errcode = '23505';
  end if;

  insert into public.poll_votes (id, poll_id, voter_id, option_index, created_at)
  values (pg_catalog.gen_random_uuid(), p_poll_id, p_voter_id, p_option_index, pg_catalog.now());
end;
$$;

revoke all on function public.submit_poll_vote(uuid, text, integer) from public;
grant execute on function public.submit_poll_vote(uuid, text, integer) to anon, authenticated;

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
      select count(distinct session_row.visitor_id)::integer
      from public.sessions as session_row
      where session_row.is_online
        and session_row.last_heartbeat >= pg_catalog.now() - interval '90 seconds'
    ),
    'visitors', (select count(*)::integer from public.visitors),
    'sessions', (select count(*)::integer from public.sessions),
    'recent_sessions', coalesce((
      select pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'session_id', recent.session_id,
          'visitor_id', recent.visitor_id,
          'started_at', recent.started_at,
          'last_heartbeat', recent.last_heartbeat,
          'last_activity', recent.last_activity,
          'current_path', recent.current_path,
          'device_type', recent.device_type,
          'operating_system', recent.operating_system,
          'browser', recent.browser,
          'referrer_domain', recent.referrer_domain,
          'pages_visited', recent.pages_visited,
          'is_online', recent.is_online and recent.last_heartbeat >= pg_catalog.now() - interval '90 seconds',
          'session_duration_seconds', greatest(0, extract(epoch from (recent.last_heartbeat - recent.started_at))::integer),
          'first_seen', visitor.first_seen,
          'last_seen', visitor.last_seen,
          'visit_count', visitor.visit_count
        )
        order by recent.last_heartbeat desc
      )
      from (
        select session_row.*
        from public.sessions as session_row
        order by session_row.last_heartbeat desc
        limit 50
      ) as recent
      left join lateral (
        select visitor_row.first_seen, visitor_row.last_seen, visitor_row.visit_count
        from public.visitors as visitor_row
        where visitor_row.visitor_id = recent.visitor_id
        order by visitor_row.first_seen
        limit 1
      ) as visitor on true
    ), '[]'::jsonb)
  ) into stats;

  return stats;
end;
$$;

revoke all on function public.get_admin_stats() from public;
revoke all on function public.get_admin_stats() from anon;
grant execute on function public.get_admin_stats() to authenticated;
