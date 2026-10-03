CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
CREATE TABLE public.user_roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, role public.app_role NOT NULL, UNIQUE(user_id, role));
GRANT SELECT ON public.user_roles TO authenticated; GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT public.has_role(auth.uid(), 'admin') $$;

CREATE TABLE public.announcements (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, message text NOT NULL, enabled boolean NOT NULL DEFAULT true, starts_at timestamptz, ends_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.announcements TO anon, authenticated; GRANT INSERT, UPDATE, DELETE ON public.announcements TO authenticated; GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read enabled" ON public.announcements FOR SELECT USING (enabled OR public.is_admin());
CREATE POLICY "admin write" ON public.announcements FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.polls (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), question text NOT NULL, options jsonb NOT NULL, enabled boolean NOT NULL DEFAULT true, starts_at timestamptz, ends_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.polls TO anon, authenticated; GRANT INSERT, UPDATE, DELETE ON public.polls TO authenticated; GRANT ALL ON public.polls TO service_role;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read enabled" ON public.polls FOR SELECT USING (enabled OR public.is_admin());
CREATE POLICY "admin write" ON public.polls FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.poll_votes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE, option_index int NOT NULL, voter_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(poll_id, voter_id));
GRANT SELECT ON public.poll_votes TO anon, authenticated; GRANT ALL ON public.poll_votes TO service_role;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read votes" ON public.poll_votes FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.submit_poll_vote(p_poll_id uuid, p_option_index int, p_voter_id text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.polls; n int;
BEGIN
  SELECT * INTO p FROM public.polls WHERE id = p_poll_id;
  IF p.id IS NULL OR NOT p.enabled OR (p.starts_at IS NOT NULL AND p.starts_at > now()) OR (p.ends_at IS NOT NULL AND p.ends_at < now()) THEN RAISE EXCEPTION 'Poll is not active'; END IF;
  n := jsonb_array_length(p.options);
  IF p_option_index < 0 OR p_option_index >= n OR length(coalesce(p_voter_id,'')) < 4 OR length(p_voter_id) > 128 THEN RAISE EXCEPTION 'Invalid vote'; END IF;
  INSERT INTO public.poll_votes(poll_id, option_index, voter_id) VALUES (p_poll_id, p_option_index, p_voter_id) ON CONFLICT (poll_id, voter_id) DO NOTHING;
  RETURN jsonb_build_object('results', (SELECT jsonb_agg(jsonb_build_object('option_index', i, 'votes', (SELECT count(*) FROM public.poll_votes v WHERE v.poll_id=p_poll_id AND v.option_index=i)) ORDER BY i) FROM generate_series(0, n-1) i));
END $$;
GRANT EXECUTE ON FUNCTION public.submit_poll_vote(uuid,int,text) TO anon, authenticated;

CREATE TABLE public.visitors (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), visitor_id text NOT NULL UNIQUE, first_seen timestamptz NOT NULL DEFAULT now(), last_seen timestamptz NOT NULL DEFAULT now(), visit_count int NOT NULL DEFAULT 1);
GRANT SELECT, INSERT, UPDATE ON public.visitors TO anon, authenticated; GRANT ALL ON public.visitors TO service_role;
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "track" ON public.visitors FOR SELECT USING (true);
CREATE POLICY "track ins" ON public.visitors FOR INSERT WITH CHECK (length(visitor_id) BETWEEN 4 AND 128);
CREATE POLICY "track upd" ON public.visitors FOR UPDATE USING (true) WITH CHECK (length(visitor_id) BETWEEN 4 AND 128);

CREATE TABLE public.sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id text NOT NULL UNIQUE, visitor_id text NOT NULL, started_at timestamptz NOT NULL DEFAULT now(), last_heartbeat timestamptz NOT NULL DEFAULT now(), last_activity timestamptz, current_path text, device_type text, operating_system text, browser text, referrer_domain text, pages_visited text[] DEFAULT '{}');
GRANT SELECT, INSERT, UPDATE ON public.sessions TO anon, authenticated; GRANT ALL ON public.sessions TO service_role;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "track" ON public.sessions FOR SELECT USING (true);
CREATE POLICY "track ins" ON public.sessions FOR INSERT WITH CHECK (length(session_id) BETWEEN 4 AND 128);
CREATE POLICY "track upd" ON public.sessions FOR UPDATE USING (true) WITH CHECK (length(session_id) BETWEEN 4 AND 128);

CREATE OR REPLACE FUNCTION public.get_admin_stats() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not allowed'; END IF;
  RETURN jsonb_build_object(
    'online', (SELECT count(DISTINCT visitor_id) FROM public.sessions WHERE last_heartbeat > now() - interval '2 minutes'),
    'visitors', (SELECT count(*) FROM public.visitors),
    'sessions', (SELECT count(*) FROM public.sessions),
    'recent_sessions', coalesce((SELECT jsonb_agg(r) FROM (
      SELECT s.session_id, s.visitor_id, s.started_at, s.last_heartbeat, s.last_activity, coalesce(s.current_path,'') current_path, coalesce(s.device_type,'') device_type, coalesce(s.operating_system,'') operating_system, coalesce(s.browser,'') browser, s.referrer_domain, coalesce(s.pages_visited,'{}') pages_visited,
        (s.last_heartbeat > now() - interval '2 minutes') is_online, extract(epoch from s.last_heartbeat - s.started_at)::int session_duration_seconds, v.first_seen, v.last_seen, v.visit_count
      FROM public.sessions s LEFT JOIN public.visitors v ON v.visitor_id = s.visitor_id ORDER BY s.last_heartbeat DESC LIMIT 200) r), '[]'::jsonb));
END $$;
GRANT EXECUTE ON FUNCTION public.get_admin_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;