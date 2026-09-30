import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";
import { BarChart3, ChevronDown, Megaphone, ShieldCheck, Users, Vote, LogOut, Plus, Trash2, Power } from "lucide-react";
import { getPollOptionResults, isPollActive, type PollOptionResult } from "@/lib/polls";
import { ref, get } from "firebase/database";
import { db } from "@/lib/chatDb";

type RecentSession = {
  session_id: string;
  visitor_id: string;
  started_at: string;
  last_heartbeat: string;
  last_activity: string | null;
  current_path: string;
  device_type: string;
  operating_system: string;
  browser: string;
  referrer_domain: string | null;
  pages_visited: string[];
  is_online: boolean;
  session_duration_seconds: number | null;
  first_seen: string | null;
  last_seen: string | null;
  visit_count: number | null;
};

type ChatProfile = {
  visitorId?: string;
  currentName?: string;
  names?: Record<string, boolean>;
};

type Stats = {
  online: number;
  visitors: number;
  sessions: number;
  recent_sessions: RecentSession[];
};

type Poll = {
  id: string;
  question: string;
  options: unknown;
  enabled: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  results?: PollOptionResult[];
};

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function formatDuration(durationSeconds: number | null | undefined): string {
  if (typeof durationSeconds !== "number" || !Number.isFinite(durationSeconds)) return "Unknown";
  const seconds = Math.max(0, Math.floor(durationSeconds));
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  if (minutes) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function formatTimestamp(value: string | null | undefined): string {
  if (!value) return "Unknown";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleString();
}

function formatClockTimestamp(value: string | null | undefined): string {
  if (!value) return "Unknown";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleTimeString();
}

const Admin = () => {
  const [session, setSession] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [chatProfiles, setChatProfiles] = useState<Record<string, ChatProfile>>({});
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState("");
  const [pollLoading, setPollLoading] = useState(false);
  const [pollError, setPollError] = useState("");
  const [pollFeedback, setPollFeedback] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [question, setQuestion] = useState("");
  const [optionsText, setOptionsText] = useState("");
  const [pollStartsAt, setPollStartsAt] = useState("");
  const [pollEndsAt, setPollEndsAt] = useState("");

  const load = useCallback(async () => {
    try {
      const { data: auth, error: authError } = await supabase.auth.getSession();
      if (authError) throw authError;
      setSession(auth.session);
      if (!auth.session) {
        setIsAdmin(false);
        setChecking(false);
        setStatsLoading(false);
        return;
      }

      const { data: admin, error: adminError } = await (supabase as any).rpc("is_admin");
      if (adminError) throw adminError;
      const allowed = admin === true;
      setIsAdmin(allowed);
      setChecking(false);
      if (!allowed) {
        setStatsLoading(false);
        return;
      }

      setStatsLoading(true);
      setPollLoading(true);
      setStatsError("");
      setPollError("");

      const [statsResult, announcementsResult, pollsResult] = await Promise.all([
        (supabase as any).rpc("get_admin_stats"),
        (supabase as any).from("announcements").select("*").order("created_at", { ascending: false }),
        (supabase as any).from("polls").select("*").order("created_at", { ascending: false }),
      ]);

      try {
        const profileSnapshot = await get(ref(db, "chatProfiles"));
        if (profileSnapshot.exists()) {
          setChatProfiles(profileSnapshot.val() as Record<string, ChatProfile>);
        }
      } catch (error) {
        console.warn("Unable to load chat nickname profiles:", error);
      }

      if (statsResult.error) {
        setStatsError(errorMessage(statsResult.error, "Unable to load site statistics."));
      } else {
        setStats(statsResult.data as Stats);
      }
      if (announcementsResult.data) setAnnouncements(announcementsResult.data);

      if (pollsResult.error) {
        setPollError(errorMessage(pollsResult.error, "Unable to load polls."));
      } else {
        const loadedPolls = (pollsResult.data ?? []) as Poll[];
        if (!loadedPolls.length) {
          setPolls([]);
        } else {
          const { data: votes, error: votesError } = await (supabase as any)
            .from("poll_votes")
            .select("poll_id, option_index")
            .in("poll_id", loadedPolls.map(poll => poll.id));
          if (votesError) {
            setPollError(errorMessage(votesError, "Unable to load poll votes."));
          } else {
            const votesByPoll = new Map<string, Array<{ option_index: number }>>();
            for (const vote of votes ?? []) {
              const pollVotes = votesByPoll.get(vote.poll_id) ?? [];
              pollVotes.push({ option_index: vote.option_index });
              votesByPoll.set(vote.poll_id, pollVotes);
            }
            setPolls(loadedPolls.map(poll => ({
              ...poll,
              results: getPollOptionResults(poll.options, votesByPoll.get(poll.id) ?? []),
            })) as Poll[]);
          }
        }
      }
    } catch (error) {
      const message = errorMessage(error, "Unable to load admin data.");
      setStatsError(message);
      setPollError(message);
      setChecking(false);
    } finally {
      setStatsLoading(false);
      setPollLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const { data } = supabase.auth.onAuthStateChange(() => { void load(); });
    return () => data.subscription.unsubscribe();
  }, [load]);

  useEffect(() => {
    if (!isAdmin) return;
    const interval = window.setInterval(() => { void load(); }, 30_000);
    return () => window.clearInterval(interval);
  }, [isAdmin, load]);

  useEffect(() => {
    if (!isAdmin) return;
    const channel = (supabase as any)
      .channel("admin-poll-votes")
      .on("postgres_changes", { event: "*", schema: "public", table: "poll_votes" }, () => { void load(); })
      .subscribe();
    return () => { void (supabase as any).removeChannel(channel); };
  }, [isAdmin, load]);

  const login = async () => {
    setLoginError("");
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    if (error) setLoginError(error.message);
  };

  const logout = async () => { await supabase.auth.signOut(); };

  const createAnnouncement = async () => {
    if (!title.trim() || !message.trim()) return;
    const toIso = (value: string) => value ? new Date(value).toISOString() : null;
    const { error } = await (supabase as any).from("announcements").insert({
      title: title.trim(),
      message: message.trim(),
      enabled: true,
      starts_at: toIso(startsAt),
      ends_at: toIso(endsAt),
    });
    if (!error) { setTitle(""); setMessage(""); setStartsAt(""); setEndsAt(""); load(); }
  };

  const toggleAnnouncement = async (item: any) => {
    await (supabase as any).from("announcements").update({ enabled: !item.enabled }).eq("id", item.id);
    load();
  };

  const deleteAnnouncement = async (id: string) => {
    await (supabase as any).from("announcements").delete().eq("id", id);
    load();
  };

  const createPoll = async () => {
    const options = optionsText.split("\n").map(x => x.trim()).filter(Boolean);
    if (!question.trim() || options.length < 2) return;
    const startsAtIso = pollStartsAt ? new Date(pollStartsAt).toISOString() : null;
    const endsAtIso = pollEndsAt ? new Date(pollEndsAt).toISOString() : null;
    if (startsAtIso && endsAtIso && Date.parse(endsAtIso) < Date.parse(startsAtIso)) {
      setPollFeedback("The end time must be after the start time.");
      return;
    }
    setPollFeedback("");
    const { error } = await (supabase as any).from("polls").insert({
      question: question.trim(), options, enabled: true, starts_at: startsAtIso, ends_at: endsAtIso,
    });
    if (error) setPollFeedback(errorMessage(error, "Unable to create poll."));
    else {
      setQuestion(""); setOptionsText(""); setPollStartsAt(""); setPollEndsAt("");
      await load();
    }
  };

  const togglePoll = async (item: any) => {
    setPollFeedback("");
    const { error } = await (supabase as any).from("polls").update({ enabled: !item.enabled }).eq("id", item.id);
    if (error) setPollFeedback(errorMessage(error, "Unable to update poll status."));
    else await load();
  };

  const deletePoll = async (id: string) => {
    setPollFeedback("");
    const { error } = await (supabase as any).from("polls").delete().eq("id", id);
    if (error) setPollFeedback(errorMessage(error, "Unable to delete poll."));
    else await load();
  };

  if (checking) return <div className="min-h-screen bg-[#090a0d] text-white grid place-items-center">Checking admin access...</div>;

  if (!session) {
    return (
      <div className="min-h-screen bg-[#090a0d] text-white grid place-items-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-7">
          <h1 className="text-3xl font-bold">Snoopy's Web Admin</h1>
          <p className="text-white/50 mt-2">Sign in with your admin account.</p>
          <input className="w-full mt-6 rounded-lg bg-black/30 border border-white/10 p-3" placeholder="Email" type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
          <input className="w-full mt-3 rounded-lg bg-black/30 border border-white/10 p-3" placeholder="Password" type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && login()} />
          {loginError && <p className="text-red-400 text-sm mt-3">{loginError}</p>}
          <button onClick={login} className="w-full mt-5 rounded-lg bg-white text-black font-semibold p-3">Sign in</button>
        </div>
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/" replace />;

  const nav = [
    ["overview", "Overview", BarChart3],
    ["announcements", "Announcements", Megaphone],
    ["polls", "Polls", Vote],
    ["security", "Security", ShieldCheck],
  ] as const;

  return (
    <div className="min-h-screen bg-[#090a0d] text-white flex">
      <aside className="w-64 border-r border-white/10 p-5 hidden md:block">
        <h1 className="font-bold text-xl mb-8">Snoopy's Web</h1>
        <div className="space-y-2">
          {nav.map(([key, label, Icon]) => <button key={key} onClick={() => setTab(key)} className={`w-full flex items-center gap-3 rounded-lg p-3 text-left ${tab === key ? "bg-white/10" : "hover:bg-white/5"}`}><Icon size={18}/>{label}</button>)}
        </div>
        <button onClick={logout} className="mt-8 flex items-center gap-3 p-3 text-white/60 hover:text-white"><LogOut size={18}/>Sign out</button>
      </aside>

      <main className="flex-1 p-6 md:p-10 max-w-7xl">
        <div className="md:hidden flex gap-2 overflow-x-auto mb-6">
          {nav.map(([key, label]) => <button key={key} onClick={() => setTab(key)} className="px-4 py-2 rounded-lg bg-white/5 whitespace-nowrap">{label}</button>)}
          <button onClick={logout} className="px-4 py-2 rounded-lg bg-white/5">Sign out</button>
        </div>

        {tab === "overview" && <>
          <h2 className="text-3xl font-bold">Overview</h2>
          <p className="text-white/50 mt-1">Live test-site analytics.</p>
          {statsError && <p role="alert" className="mt-4 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">Unable to load statistics: {statsError}</p>}
          <div className="grid sm:grid-cols-3 gap-4 mt-7">
            {[["People Online", stats?.online ?? 0, Users], ["Visitors", stats?.visitors ?? 0, Users], ["Sessions", stats?.sessions ?? 0, BarChart3]].map(([label, value, Icon]: any) =>
              <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-5"><Icon size={20}/><p className="text-white/50 mt-4">{label}</p><p className="text-4xl font-bold mt-1">{statsLoading && !stats ? "…" : value}</p></div>
            )}
          </div>
          <div className="mt-7 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">Recent Sessions</h3>
              <span className="text-xs text-white/40">Refreshing every 30 seconds</span>
            </div>
            <div className="mt-4 space-y-3">
              {statsLoading && !stats ? <p className="text-white/40">Loading recent sessions…</p> : stats?.recent_sessions?.length ? stats.recent_sessions.map((session, index) => {
                const rowKey = `${session.session_id}-${index}`;
                const expanded = expandedSessionId === rowKey;
                const detailsId = `session-details-${rowKey}`;
                const lastActivity = session.last_activity || session.last_heartbeat;
                return <article key={rowKey} className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={detailsId}
                    onClick={() => setExpandedSessionId(expanded ? null : rowKey)}
                    className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-2 p-4 text-left transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400"
                  >
                    <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                      <ChevronDown className={`h-4 w-4 shrink-0 text-white/50 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
                      <span className={`h-2 w-2 shrink-0 rounded-full ${session.is_online ? "bg-emerald-400" : "bg-white/30"}`} aria-hidden="true" />
                      <span className="font-medium">{session.is_online ? "Online" : "Offline"}</span>
                      <span className="break-all text-white/75">
                        {(() => {
                          const profile = chatProfiles[session.visitor_id];
                          const names = profile?.names ? Object.keys(profile.names) : [];
                          return names.length ? names.join(" · ") : `Visitor ${session.visitor_id.slice(0, 12)}…`;
                        })()}
                      </span>
                      <span className="text-white/40">·</span>
                      <span className="break-all text-white/55">Session {session.session_id.slice(0, 10)}…</span>
                    </span>
                    <span className="pl-6 text-sm text-white/45 sm:pl-0">Last activity: {formatClockTimestamp(lastActivity)}</span>
                  </button>
                  {expanded && <div id={detailsId} className="border-t border-white/10 px-4 pb-4 pt-3">
                    <dl className="grid gap-x-5 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                      <div><dt className="text-white/40">Device</dt><dd className="mt-0.5">{session.device_type || "Unknown"}</dd></div>
                      <div><dt className="text-white/40">Browser</dt><dd className="mt-0.5">{session.browser || "Unknown"}</dd></div>
                      <div><dt className="text-white/40">Operating system</dt><dd className="mt-0.5">{session.operating_system || "Unknown"}</dd></div>
                      <div><dt className="text-white/40">Referrer</dt><dd className="mt-0.5 break-all">{session.referrer_domain || "Direct / unknown"}</dd></div>
                      <div><dt className="text-white/40">Current page</dt><dd className="mt-0.5 break-all">{session.current_path || "Unknown"}</dd></div>
                      <div><dt className="text-white/40">Session duration</dt><dd className="mt-0.5">{formatDuration(session.session_duration_seconds)}</dd></div>
                      <div><dt className="text-white/40">Visit count</dt><dd className="mt-0.5">{session.visit_count ?? "Unknown"}</dd></div>
                      <div><dt className="text-white/40">Session started</dt><dd className="mt-0.5">{formatTimestamp(session.started_at)}</dd></div>
                      <div><dt className="text-white/40">First seen</dt><dd className="mt-0.5">{formatTimestamp(session.first_seen)}</dd></div>
                      <div><dt className="text-white/40">Last seen</dt><dd className="mt-0.5">{formatTimestamp(session.last_seen)}</dd></div>
                      <div><dt className="text-white/40">Last activity</dt><dd className="mt-0.5">{formatTimestamp(lastActivity)}</dd></div>
                      <div className="sm:col-span-2 lg:col-span-3"><dt className="text-white/40">Pages visited</dt><dd className="mt-0.5 break-words">{session.pages_visited?.length ? session.pages_visited.join(" · ") : session.current_path || "Unknown"}</dd></div>
                    </dl>
                  </div>}
                </article>;
              }) : !statsError && <p className="text-white/40">No sessions yet.</p>}
            </div>
          </div>
        </>}

        {tab === "announcements" && <>
          <h2 className="text-3xl font-bold">Announcements</h2>
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
            <input className="w-full rounded-lg bg-black/30 border border-white/10 p-3" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
            <textarea className="w-full rounded-lg bg-black/30 border border-white/10 p-3 min-h-28" placeholder="Message" value={message} onChange={e => setMessage(e.target.value)} />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-2 text-sm text-white/70">
                Starts at <span className="text-white/40">(optional)</span>
                <input className="w-full rounded-lg bg-black/30 border border-white/10 p-3 text-white" type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} />
              </label>
              <label className="space-y-2 text-sm text-white/70">
                Ends at <span className="text-white/40">(optional)</span>
                <input className="w-full rounded-lg bg-black/30 border border-white/10 p-3 text-white" type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} />
              </label>
            </div>
            <button onClick={createAnnouncement} className="rounded-lg bg-white text-black px-4 py-2 font-semibold flex items-center gap-2"><Plus size={17}/>Create</button>
          </div>
          <div className="mt-6 space-y-3">{announcements.map(a => <div key={a.id} className="rounded-xl border border-white/10 bg-white/5 p-4"><div className="flex justify-between gap-3"><div><div className="flex items-center gap-2"><b>{a.title}</b><span className={`rounded-full px-2 py-0.5 text-xs ${a.enabled ? "bg-emerald-400/15 text-emerald-300" : "bg-white/10 text-white/50"}`}>{a.enabled ? "Enabled" : "Disabled"}</span></div><p className="text-white/60 mt-1">{a.message}</p>{(a.starts_at || a.ends_at) && <p className="text-white/40 text-xs mt-2">{a.starts_at ? `Starts ${new Date(a.starts_at).toLocaleString()}` : "No start date"}{" · "}{a.ends_at ? `Ends ${new Date(a.ends_at).toLocaleString()}` : "No end date"}</p>}</div><div className="flex gap-2"><button onClick={() => toggleAnnouncement(a)} title={a.enabled ? "Disable" : "Enable"} aria-label={a.enabled ? "Disable announcement" : "Enable announcement"}><Power size={18}/></button><button onClick={() => deleteAnnouncement(a.id)} title="Delete" aria-label={`Delete ${a.title}`}><Trash2 size={18}/></button></div></div></div>)}</div>
        </>}

        {tab === "polls" && <>
          <h2 className="text-3xl font-bold">Polls</h2>
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
            <input className="w-full rounded-lg bg-black/30 border border-white/10 p-3" placeholder="Question" value={question} onChange={e => setQuestion(e.target.value)} />
            <textarea className="w-full rounded-lg bg-black/30 border border-white/10 p-3 min-h-28" placeholder="One option per line" value={optionsText} onChange={e => setOptionsText(e.target.value)} />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-2 text-sm text-white/70">Starts at <span className="text-white/40">(optional)</span><input className="w-full rounded-lg bg-black/30 border border-white/10 p-3 text-white" type="datetime-local" value={pollStartsAt} onChange={e => setPollStartsAt(e.target.value)} /></label>
              <label className="space-y-2 text-sm text-white/70">Ends at <span className="text-white/40">(optional)</span><input className="w-full rounded-lg bg-black/30 border border-white/10 p-3 text-white" type="datetime-local" value={pollEndsAt} onChange={e => setPollEndsAt(e.target.value)} /></label>
            </div>
            {pollFeedback && <p role="alert" className="text-sm text-red-300">{pollFeedback}</p>}
            {pollError && <p role="alert" className="text-sm text-red-300">Unable to load poll data: {pollError}</p>}
            <button onClick={createPoll} className="rounded-lg bg-white text-black px-4 py-2 font-semibold flex items-center gap-2"><Plus size={17}/>Create Poll</button>
          </div>
          <div className="mt-6 space-y-3">
            {pollLoading && <p className="text-white/50">Loading polls and votes…</p>}
            {!pollLoading && !pollError && polls.length === 0 && <p className="text-white/40">No polls yet.</p>}
            {polls.map(p => {
              const results = p.results ?? getPollOptionResults(p.options, []);
              const voteCount = results.reduce((total, result) => total + result.votes, 0);
              const active = isPollActive(p);
              return <div key={p.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex justify-between gap-4">
                  <div>
                    <b>{p.question}</b>
                    <p className="text-white/50 text-sm mt-1">{results.length} options · {active ? "Active" : p.enabled ? "Scheduled or ended" : "Disabled"}</p>
                    {(p.starts_at || p.ends_at) && <p className="text-white/40 text-xs mt-1">{p.starts_at ? `Starts ${new Date(p.starts_at).toLocaleString()}` : "No start time"}{" · "}{p.ends_at ? `Ends ${new Date(p.ends_at).toLocaleString()}` : "No end time"}</p>}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => void togglePoll(p)} title={p.enabled ? "Disable poll" : "Enable poll"} aria-label={p.enabled ? "Disable poll" : "Enable poll"}><Power size={18}/></button>
                    <button onClick={() => void deletePoll(p.id)} title="Delete poll" aria-label={`Delete ${p.question}`}><Trash2 size={18}/></button>
                  </div>
                </div>
                {pollError ? <p className="text-red-300 text-sm mt-3">Vote results unavailable: {pollError}</p> : voteCount === 0 ? <p className="text-white/40 text-sm mt-3">No votes yet.</p> : <div className="mt-4 space-y-3">{results.map((result, index) => <div key={`${p.id}-${index}`}>
                  <div className="flex justify-between gap-3 text-sm"><span>{result.option}</span><span className="text-white/60">{result.votes} · {result.percentage}%</span></div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-emerald-400" style={{ width: `${result.percentage}%` }} /></div>
                </div>)}</div>}
              </div>;
            })}
          </div>
        </>}

        {tab === "security" && <>
          <h2 className="text-3xl font-bold">Security</h2>
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
            <p><b>Authentication:</b> Supabase email/password.</p>
            <p><b>Authorization:</b> Admin access is checked against <code>public.admin_users</code> through <code>is_admin()</code>.</p>
            <p><b>Database protection:</b> Privileged inserts, updates, deletes and analytics access are enforced with Row Level Security/server-side RPCs.</p>
            <p className="text-white/50 text-sm">The admin URL is not a security boundary. Never put a service-role key in the browser.</p>
          </div>
        </>}
      </main>
    </div>
  );
};

export default Admin;
