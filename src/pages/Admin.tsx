import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";
import { BarChart3, Megaphone, ShieldCheck, Users, Vote, LogOut, Plus, Trash2, Power } from "lucide-react";

type Stats = {
  online: number;
  visitors: number;
  sessions: number;
  recent_sessions: Array<{ session_id: string; visitor_id: string; started_at: string; last_heartbeat: string }>;
};

const Admin = () => {
  const [session, setSession] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [polls, setPolls] = useState<any[]>([]);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [question, setQuestion] = useState("");
  const [optionsText, setOptionsText] = useState("");

  const load = async () => {
    const { data: s } = await supabase.auth.getSession();
    setSession(s.session);
    if (!s.session) { setChecking(false); return; }

    const { data: admin } = await (supabase as any).rpc("is_admin");
    const allowed = admin === true;
    setIsAdmin(allowed);
    setChecking(false);
    if (!allowed) return;

    const { data: statData } = await (supabase as any).rpc("get_admin_stats");
    if (statData) setStats(statData);

    const { data: a } = await (supabase as any).from("announcements").select("*").order("created_at", { ascending: false });
    if (a) setAnnouncements(a);

    const { data: p } = await (supabase as any).from("polls").select("*").order("created_at", { ascending: false });
    if (p) setPolls(p);
  };

  useEffect(() => {
    load();
    const { data } = supabase.auth.onAuthStateChange(() => load());
    return () => data.subscription.unsubscribe();
  }, []);

  const login = async () => {
    setLoginError("");
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    if (error) setLoginError(error.message);
  };

  const logout = async () => { await supabase.auth.signOut(); };

  const createAnnouncement = async () => {
    if (!title.trim() || !message.trim()) return;
    const { error } = await (supabase as any).from("announcements").insert({ title: title.trim(), message: message.trim(), enabled: true });
    if (!error) { setTitle(""); setMessage(""); load(); }
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
    const { error } = await (supabase as any).from("polls").insert({ question: question.trim(), options, enabled: true });
    if (!error) { setQuestion(""); setOptionsText(""); load(); }
  };

  const togglePoll = async (item: any) => {
    await (supabase as any).from("polls").update({ enabled: !item.enabled }).eq("id", item.id);
    load();
  };

  const deletePoll = async (id: string) => {
    await (supabase as any).from("polls").delete().eq("id", id);
    load();
  };

  const pollResults = useMemo(() => {
    return polls.map(p => ({ ...p, results: [] }));
  }, [polls]);

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
          <div className="grid sm:grid-cols-3 gap-4 mt-7">
            {[["People Online", stats?.online ?? 0, Users], ["Visitors", stats?.visitors ?? 0, Users], ["Sessions", stats?.sessions ?? 0, BarChart3]].map(([label, value, Icon]: any) =>
              <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-5"><Icon size={20}/><p className="text-white/50 mt-4">{label}</p><p className="text-4xl font-bold mt-1">{value}</p></div>
            )}
          </div>
          <div className="mt-7 rounded-2xl border border-white/10 bg-white/5 p-5">
            <h3 className="font-semibold">Recent Sessions</h3>
            <div className="mt-4 space-y-2">{stats?.recent_sessions?.length ? stats.recent_sessions.map(s => <div key={s.session_id} className="text-sm border-t border-white/10 pt-2"><span className="text-white/60">{s.visitor_id.slice(0, 12)}…</span><span className="float-right text-white/40">{new Date(s.last_heartbeat).toLocaleString()}</span></div>) : <p className="text-white/40">No sessions yet.</p>}</div>
          </div>
        </>}

        {tab === "announcements" && <>
          <h2 className="text-3xl font-bold">Announcements</h2>
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
            <input className="w-full rounded-lg bg-black/30 border border-white/10 p-3" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
            <textarea className="w-full rounded-lg bg-black/30 border border-white/10 p-3 min-h-28" placeholder="Message" value={message} onChange={e => setMessage(e.target.value)} />
            <button onClick={createAnnouncement} className="rounded-lg bg-white text-black px-4 py-2 font-semibold flex items-center gap-2"><Plus size={17}/>Create</button>
          </div>
          <div className="mt-6 space-y-3">{announcements.map(a => <div key={a.id} className="rounded-xl border border-white/10 bg-white/5 p-4"><div className="flex justify-between gap-3"><div><b>{a.title}</b><p className="text-white/60 mt-1">{a.message}</p></div><div className="flex gap-2"><button onClick={() => toggleAnnouncement(a)} title="Toggle"><Power size={18}/></button><button onClick={() => deleteAnnouncement(a.id)} title="Delete"><Trash2 size={18}/></button></div></div></div>)}</div>
        </>}

        {tab === "polls" && <>
          <h2 className="text-3xl font-bold">Polls</h2>
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
            <input className="w-full rounded-lg bg-black/30 border border-white/10 p-3" placeholder="Question" value={question} onChange={e => setQuestion(e.target.value)} />
            <textarea className="w-full rounded-lg bg-black/30 border border-white/10 p-3 min-h-28" placeholder="One option per line" value={optionsText} onChange={e => setOptionsText(e.target.value)} />
            <button onClick={createPoll} className="rounded-lg bg-white text-black px-4 py-2 font-semibold flex items-center gap-2"><Plus size={17}/>Create Poll</button>
          </div>
          <div className="mt-6 space-y-3">{pollResults.map(p => <div key={p.id} className="rounded-xl border border-white/10 bg-white/5 p-4"><div className="flex justify-between"><div><b>{p.question}</b><p className="text-white/50 text-sm mt-1">{(p.options ?? []).length} options · {p.enabled ? "Enabled" : "Disabled"}</p></div><div className="flex gap-2"><button onClick={() => togglePoll(p)}><Power size={18}/></button><button onClick={() => deletePoll(p.id)}><Trash2 size={18}/></button></div></div><p className="text-white/40 text-sm mt-3">Vote results will appear here once poll votes are recorded.</p></div>)}</div>
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
