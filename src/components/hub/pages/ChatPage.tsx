import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  child,
  get,
  limitToLast,
  onDisconnect,
  onValue,
  push,
  query,
  ref,
  remove,
  set,
  update,
} from 'firebase/database';
import {
  ADMIN_PASSWORD,
  CAT_GIFS,
  COLORS,
  MOD_GIFS,
  MOD_PASSWORD,
  OWNER_GIFS,
  OWNER_PASSWORD,
  PUBLIC_ROOMS,
  browserFingerprint,
  censor,
  db,
  type ChatMsg,
  type Role,
  type RoomMeta,
} from '@/lib/chatDb';
import ChatAmbient from '../ChatAmbient';
import { loadSettings } from '@/lib/settings';
import {
  ArrowDown,
  ArrowUp,
  Film,
  LogOut,
  MessageCircle,
  Palette,
  Plus,
  Send,
  Shield,
  Users,
  X,
} from 'lucide-react';

const ChatPage = () => {
  // Follow the active proxy theme preset unless the user opted out in Settings.
  const [matchTheme, setMatchTheme] = useState(() => loadSettings().chatMatchTheme);
  useEffect(() => {
    const sync = () => setMatchTheme(loadSettings().chatMatchTheme);
    window.addEventListener('focus', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('focus', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  const themeClass = matchTheme ? '' : 'chat-neutral';

  const [joined, setJoined] = useState(false);
  const [nameInput, setNameInput] = useState(() => localStorage.getItem('savedUsername') ?? '');
  const [passInput, setPassInput] = useState(() => localStorage.getItem('savedPassword') ?? '');
  const [notice, setNotice] = useState<string | null>(null);

  const [username, setUsername] = useState('');
  const [role, setRole] = useState<Role>('user');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, { id: string }>>({});
  const [mutedUsers, setMutedUsers] = useState<Record<string, boolean>>({});
  const [privateRooms, setPrivateRooms] = useState<RoomMeta[]>([]);
  const [room, setRoom] = useState<RoomMeta>(PUBLIC_ROOMS[0]);
  const [draft, setDraft] = useState('');
  const [myColor, setMyColor] = useState<string | null>(null);
  const [modal, setModal] = useState<null | 'gif' | 'color' | 'private'>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [adminTarget, setAdminTarget] = useState('');
  const [log, setLog] = useState<string[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const isAdmin = role === 'admin' || role === 'owner';
  const isMod = role === 'mod';

  const flash = (m: string) => {
    setNotice(m);
    window.setTimeout(() => setNotice((cur) => (cur === m ? null : cur)), 4000);
  };
  const logCmd = (m: string) => setLog((l) => [m, ...l].slice(0, 40));

  /* ------------------------------- join / leave ------------------------------ */

  const join = useCallback(async () => {
    const name = nameInput.trim();
    const pass = passInput;
    const userId = localStorage.getItem('savedUserId') ?? browserFingerprint();

    let nextName = name;
    let nextRole: Role = 'user';
    if (pass === OWNER_PASSWORD) {
      nextName = name || '👑ThatOneGuy👑';
      nextRole = 'owner';
    } else if (pass === ADMIN_PASSWORD) {
      nextName = name || '🥞Admin🥞';
      nextRole = 'admin';
    } else if (pass === MOD_PASSWORD) {
      nextName = name || '🍔Mod🍔';
      nextRole = 'mod';
    } else if (name.length < 3) {
      return flash('Username must be at least 3 characters.');
    }

    const onlineSnap = await get(ref(db, `online/${nextName}`));
    if (onlineSnap.exists()) return flash('That username is already in use.');

    const bannedSnap = await get(ref(db, 'admin/banned'));
    const banned = (bannedSnap.val() as Record<string, boolean>) || {};
    if (banned[userId]) return flash('You are banned from this chat.');

    await set(ref(db, `online/${nextName}`), { id: userId });
    onDisconnect(ref(db, `online/${nextName}`)).remove();

    localStorage.setItem('savedUsername', nextName);
    localStorage.setItem('savedUserId', userId);
    localStorage.setItem('savedPassword', pass);

    PUBLIC_ROOMS.forEach((r) => {
      update(ref(db, `roomsMeta/${r.id}`), {
        id: r.id,
        name: r.name,
        description: r.description,
        type: r.type,
        gifOnly: !!r.gifOnly,
      });
    });

    setUsername(nextName);
    setRole(nextRole);
    setRoom(PUBLIC_ROOMS[0]);
    setJoined(true);
    setNotice(null);
  }, [nameInput, passInput]);

  const leave = useCallback(() => {
    if (username) remove(ref(db, `online/${username}`));
    setJoined(false);
    setMessages([]);
  }, [username]);

  useEffect(() => {
    const handler = () => {
      if (username) remove(ref(db, `online/${username}`));
    };
    window.addEventListener('beforeunload', handler);
    return () => {
      window.removeEventListener('beforeunload', handler);
      handler();
    };
  }, [username]);

  /* -------------------------------- listeners -------------------------------- */

  useEffect(() => {
    if (!joined) return;
    const un1 = onValue(ref(db, 'online'), (s) => setOnlineUsers(s.val() || {}));
    const un2 = onValue(ref(db, 'admin/muted'), (s) => setMutedUsers(s.val() || {}));
    return () => {
      un1();
      un2();
    };
  }, [joined]);

  useEffect(() => {
    if (!joined || !username) return;
    return onValue(ref(db, 'roomsMeta'), (snap) => {
      const all = (snap.val() as Record<string, RoomMeta>) || {};
      const mine = Object.entries(all)
        .filter(([, r]) => r.type === 'private' && r.participants?.[username])
        .map(([id, r]) => ({ ...r, id }));
      setPrivateRooms(mine.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
    });
  }, [joined, username]);

  useEffect(() => {
    if (!joined) return;
    setMessages([]);
    return onValue(query(ref(db, `chats/${room.id}`), limitToLast(100)), (snap) => {
      const out: ChatMsg[] = [];
      snap.forEach((c) => {
        out.push({ key: c.key as string, ...(c.val() as Omit<ChatMsg, 'key'>) });
      });
      setMessages(out);
    });
  }, [joined, room.id]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const online = useMemo(() => Object.keys(onlineUsers), [onlineUsers]);
  const others = useMemo(() => online.filter((n) => n !== username).sort(), [online, username]);

  /* --------------------------------- sending --------------------------------- */

  const handleCommand = (text: string) => {
    const [command, ...args] = text.slice(1).split(' ');
    const allowed: Record<string, Role[]> = {
      mute: ['admin', 'owner', 'mod'],
      unmute: ['admin', 'owner', 'mod'],
      ban: ['admin', 'owner'],
      unban: ['admin', 'owner'],
      kick: ['admin', 'owner'],
      clear: ['admin', 'owner'],
      deleteall: ['admin', 'owner'],
      color: ['admin', 'owner', 'mod', 'user'],
      del: ['admin', 'owner', 'mod'],
    };
    if (!allowed[command]?.includes(role)) return flash('You cannot use that command.');
    const target = args[0];
    switch (command) {
      case 'mute':
        if (target) set(ref(db, `admin/muted/${target}`), true);
        break;
      case 'unmute':
        if (target) remove(ref(db, `admin/muted/${target}`));
        break;
      case 'ban':
        if (target) banUser(target);
        break;
      case 'unban':
        if (target) unbanUser(target);
        break;
      case 'kick':
        if (target) remove(ref(db, `online/${target}`));
        break;
      case 'clear':
        clearChat();
        break;
      case 'deleteall':
        remove(ref(db, `chats/${room.id}`));
        break;
      case 'color':
        if (target) setMyColor(target.toLowerCase());
        break;
      case 'del':
        if (target) remove(ref(db, `chats/${room.id}/${target}`));
        break;
    }
    logCmd(`Command executed: ${text}`);
    setDraft('');
  };

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    if (mutedUsers[username]) return flash('You are muted.');
    if (text.startsWith('/')) return handleCommand(text);
    if (room.gifOnly) return flash('This room only allows GIFs — use the GIF button.');
    push(ref(db, `chats/${room.id}`), {
      name: username,
      msg: text,
      admin: isAdmin,
      role,
      color: myColor,
      time: Date.now(),
      roomId: room.id,
    });
    setDraft('');
  };

  const sendGif = (src: string) => {
    push(ref(db, `chats/${room.id}`), {
      name: username,
      msg: src,
      admin: isAdmin,
      role,
      isImage: true,
      time: Date.now(),
      roomId: room.id,
    });
    setModal(null);
  };

  /* ------------------------------- moderation -------------------------------- */

  const banUser = async (name: string) => {
    const snap = await get(ref(db, `online/${name}`));
    const id = snap.val()?.id;
    if (!id) return flash('Unable to ban: user not found.');
    await set(ref(db, `admin/banned/${id}`), true);
    remove(ref(db, `online/${name}`));
    logCmd(`/ban ${name}`);
  };
  const unbanUser = async (name: string) => {
    const snap = await get(ref(db, `online/${name}`));
    const id = snap.val()?.id;
    if (!id) return flash('Unable to unban: user not found.');
    remove(ref(db, `admin/banned/${id}`));
    logCmd(`/unban ${name}`);
  };
  const clearChat = async () => {
    const snap = await get(ref(db, `chats/${room.id}`));
    snap.forEach((c) => {
      if (!c.val()?.admin) remove(child(ref(db, `chats/${room.id}`), c.key as string));
    });
  };
  const clearGifs = async () => {
    const snap = await get(ref(db, `chats/${room.id}`));
    snap.forEach((c) => {
      if (c.val()?.isImage) remove(child(ref(db, `chats/${room.id}`), c.key as string));
    });
  };

  const withTarget = (fn: (n: string) => void) => () => {
    if (!adminTarget) return flash('Select an online user first.');
    fn(adminTarget);
  };

  /* ------------------------------ private rooms ------------------------------ */

  const createPrivate = () => {
    if (!picked.length) return flash('Select at least one person.');
    const id = `private-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const participants: Record<string, boolean> = { [username]: true };
    picked.forEach((n) => (participants[n] = true));
    const name = picked.join(', ');
    const meta: RoomMeta = { id, type: 'private', name, participants, createdAt: Date.now(), createdBy: username, gifOnly: false };
    set(ref(db, `roomsMeta/${id}`), meta);
    setPicked([]);
    setModal(null);
    setRoom(meta);
  };

  const leavePrivate = (id: string) => {
    remove(ref(db, `roomsMeta/${id}/participants/${username}`));
    if (room.id === id) setRoom(PUBLIC_ROOMS[0]);
  };

  /* --------------------------------- render ---------------------------------- */

  if (!joined) {
    return (
      <div className={`relative max-w-md mx-auto pt-8 sm:pt-10 px-1 sm:px-4 ${themeClass}`}>
        <ChatAmbient stars={30} />
        <div className="glass-panel hover-glow relative z-10 p-5 sm:p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/35 text-primary flex items-center justify-center">
              <MessageCircle className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold glow-text">Chat</h1>
              <p className="text-xs font-mono text-muted-foreground">// join the live rooms</p>
            </div>
          </div>

          {notice && (
            <p className="text-sm text-destructive glass-panel border-destructive/40 px-3 py-2">{notice}</p>
          )}

          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && join()}
            placeholder="Username"
            aria-label="Username"
            className="w-full rounded-xl bg-secondary/40 border border-border/60 px-4 py-3 text-sm outline-none focus:border-primary/60"
          />
          <input
            value={passInput}
            onChange={(e) => setPassInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && join()}
            type="password"
            placeholder="Staff password (optional)"
            aria-label="Staff password"
            className="w-full rounded-xl bg-secondary/40 border border-border/60 px-4 py-3 text-sm outline-none focus:border-primary/60"
          />
          <button
            onClick={join}
            className="w-full rounded-xl bg-primary/20 border border-primary/40 text-primary py-3 text-sm font-medium hover:bg-primary/30 transition"
          >
            Enter chat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative flex flex-col md:flex-row gap-3 md:gap-4 max-w-6xl mx-auto pt-2 md:h-[calc(100vh-6rem)] ${themeClass}`}>
      <ChatAmbient />
      {/* rooms sidebar */}
      <aside className="relative z-10 md:w-64 shrink-0 flex flex-col gap-2 md:gap-3 md:overflow-y-auto">
        <div className="glass-panel hover-glow p-2.5 md:p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-muted-foreground flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Online: {online.length}
            </span>
            <button onClick={leave} aria-label="Leave chat" className="text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm font-medium truncate">
            {username} <span className="text-[10px] uppercase text-primary">{role}</span>
          </p>
        </div>

        <div className="glass-panel hover-glow p-2.5 md:p-3 flex flex-col gap-2">
          <p className="text-[11px] font-mono text-muted-foreground">// public rooms</p>
          <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible -mx-0.5 px-0.5 pb-1 md:pb-0">
          {PUBLIC_ROOMS.map((r) => (
            <button
              key={r.id}
              onClick={() => setRoom(r)}
              className={`shrink-0 md:shrink w-44 md:w-auto text-left rounded-xl px-3 py-2 border transition hover-glow ${
                room.id === r.id
                  ? 'bg-primary/15 border-primary/40 text-primary'
                  : 'bg-secondary/30 border-border/50 hover:bg-secondary/50'
              }`}
            >
              <span className="block text-sm font-medium">{r.name}</span>
              <span className="block text-xs text-muted-foreground truncate">{r.description}</span>
            </button>
          ))}
          </div>
        </div>

        <div className="glass-panel hover-glow p-2.5 md:p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-mono text-muted-foreground">// private chats</p>
            <button
              onClick={() => setModal('private')}
              aria-label="Create private chat"
              className="p-1 rounded-md hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {privateRooms.length === 0 && <p className="text-xs text-muted-foreground">No private chats yet.</p>}
          {privateRooms.map((r) => (
            <div key={r.id} className="flex items-center gap-1">
              <button
                onClick={() => setRoom(r)}
                className={`flex-1 text-left rounded-xl px-3 py-2 border transition hover-glow ${
                  room.id === r.id
                    ? 'bg-primary/15 border-primary/40 text-primary'
                    : 'bg-secondary/30 border-border/50 hover:bg-secondary/50'
                }`}
              >
                <span className="block text-sm font-medium truncate">{r.name || 'Private chat'}</span>
                <span className="block text-xs text-muted-foreground truncate">
                  {Object.keys(r.participants || {}).filter((n) => n !== username).join(', ') || 'Just you'}
                </span>
              </button>
              <button
                onClick={() => leavePrivate(r.id)}
                aria-label="Leave private chat"
                className="p-1 rounded-md text-muted-foreground hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {(isAdmin || isMod) && (
          <div className="glass-panel hover-glow p-2.5 md:p-3 flex flex-col gap-2">
            <p className="text-[11px] font-mono text-primary flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> // staff panel
            </p>
            <select
              value={adminTarget}
              onChange={(e) => setAdminTarget(e.target.value)}
              aria-label="Select online user"
              className="w-full rounded-lg bg-secondary/40 border border-border/60 px-2 py-2 text-xs outline-none"
            >
              <option value="">{others.length ? 'Select user' : 'No users online'}</option>
              {others.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button className="rounded-lg bg-secondary/40 py-1.5 hover:bg-secondary/70" onClick={withTarget((n) => { set(ref(db, `admin/muted/${n}`), true); logCmd(`/mute ${n}`); })}>Mute</button>
              <button className="rounded-lg bg-secondary/40 py-1.5 hover:bg-secondary/70" onClick={withTarget((n) => { remove(ref(db, `admin/muted/${n}`)); logCmd(`/unmute ${n}`); })}>Unmute</button>
              {isAdmin && (
                <>
                  <button className="rounded-lg bg-secondary/40 py-1.5 hover:bg-secondary/70" onClick={withTarget((n) => { remove(ref(db, `online/${n}`)); logCmd(`/kick ${n}`); })}>Kick</button>
                  <button className="rounded-lg bg-secondary/40 py-1.5 hover:bg-secondary/70" onClick={withTarget(banUser)}>Ban</button>
                  <button className="rounded-lg bg-secondary/40 py-1.5 hover:bg-secondary/70" onClick={() => { remove(ref(db, 'admin/banned')); logCmd('/unbanall'); }}>Unban all</button>
                  <button className="rounded-lg bg-secondary/40 py-1.5 hover:bg-secondary/70" onClick={clearChat}>Clear chat</button>
                  <button className="rounded-lg bg-secondary/40 py-1.5 hover:bg-secondary/70" onClick={() => remove(ref(db, `chats/${room.id}`))}>Delete history</button>
                  <button className="rounded-lg bg-secondary/40 py-1.5 hover:bg-secondary/70" onClick={clearGifs}>Clear GIFs</button>
                </>
              )}
            </div>
            {log.length > 0 && (
              <div className="max-h-24 overflow-y-auto text-[11px] font-mono text-muted-foreground space-y-0.5">
                {log.map((l, i) => (
                  <div key={i}>{l}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </aside>

      {/* chat area */}
      <div className="relative z-10 flex-1 min-w-0 flex flex-col">
        <div className="pb-2 flex items-center justify-between gap-2">
          <h1 className="text-lg font-bold glow-text truncate">
            {room.name}
            {room.gifOnly && <span className="text-xs text-muted-foreground font-normal"> (GIFs only)</span>}
          </h1>
          <div className="flex gap-1">
            <button
              onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
              aria-label="Scroll to top"
              className="p-1.5 rounded-md hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })}
              aria-label="Scroll to bottom"
              className="p-1.5 rounded-md hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
            >
              <ArrowDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {notice && (
          <div className="glass-panel border-destructive/40 text-destructive text-sm px-3 py-2 mb-2">{notice}</div>
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2.5 sm:space-y-3 pr-1 pb-3 min-h-[50vh] max-h-[60vh] md:max-h-none">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center pt-10">No messages yet — say hi.</p>
          )}
          {messages.map((m) => {
            const label = m.role && m.role !== 'user' ? `${m.name} (${String(m.role).toUpperCase()})` : m.name;
            const mine = m.name === username;
            return (
              <div key={m.key} className={`flex ${mine ? 'justify-end' : ''}`}>
                <div
                  className={`glass-panel hover-glow px-3 sm:px-4 py-2 sm:py-2.5 max-w-[90%] sm:max-w-[85%] ${
                    mine ? 'border-primary/35 shadow-[0_0_20px_hsl(var(--glow-primary)/0.12)]' : ''
                  }`}
                  style={mine ? { background: 'linear-gradient(135deg, hsl(var(--glow-primary) / 0.14), hsl(var(--glass-bg) / 0.35))' } : undefined}
                >
                  <p className="text-xs font-semibold mb-1" style={{ color: m.color || (m.admin ? 'hsl(var(--destructive))' : undefined) }}>
                    {label}
                  </p>
                  {m.isImage ? (
                    <img src={m.msg} alt="GIF" loading="lazy" className="max-h-48 rounded-lg border border-border/50" />
                  ) : (
                    <p className="text-sm break-words whitespace-pre-wrap">{censor(m.msg)}</p>
                  )}
                  {(isAdmin || isMod) && (
                    <div className="flex gap-2 mt-2 text-[11px] text-muted-foreground">
                      <button className="hover:text-foreground" onClick={() => set(ref(db, `admin/muted/${m.name}`), true)}>Mute</button>
                      <button className="hover:text-destructive" onClick={() => remove(ref(db, `chats/${room.id}/${m.key}`))}>Delete</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="glass-panel hover-glow sticky bottom-0 p-1.5 sm:p-2 flex items-center gap-1 sm:gap-2 min-h-[52px]">
          <button onClick={() => setModal('color')} aria-label="Pick name color" className="p-2 rounded-lg hover:bg-secondary/60 text-muted-foreground hover:text-foreground">
            <Palette className="w-4 h-4" />
          </button>
          <button onClick={() => setModal('gif')} aria-label="Send a GIF" className="p-2 rounded-lg hover:bg-secondary/60 text-muted-foreground hover:text-foreground">
            <Film className="w-4 h-4" />
          </button>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={room.gifOnly ? 'This room only allows GIFs' : 'Type a message and press enter'}
            aria-label="Message"
            className="flex-1 bg-transparent text-sm outline-none px-1 py-2 min-w-0"
          />
          <button
            onClick={send}
            aria-label="Send message"
            className="p-2 rounded-lg bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* modals */}
      {modal && (
        <div
          className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setModal(null)}
        >
          <div className="glass-panel p-5 w-full max-w-lg max-h-[76vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {modal === 'gif' && (
              <>
                <h2 className="text-base font-semibold mb-3">Choose a GIF</h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {[...(role === 'owner' ? OWNER_GIFS : []), ...(role === 'mod' ? MOD_GIFS : []), ...CAT_GIFS].map((src) => (
                    <button key={src} onClick={() => sendGif(src)} aria-label="Send this GIF">
                      <img src={src} alt="" loading="lazy" className="w-full h-20 object-cover rounded-lg border border-border/50 hover:border-primary/50" />
                    </button>
                  ))}
                </div>
              </>
            )}
            {modal === 'color' && (
              <>
                <h2 className="text-base font-semibold mb-3">Pick a name color</h2>
                <div className="flex flex-wrap gap-3">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      aria-label={`Use color ${c}`}
                      onClick={() => {
                        setMyColor(c);
                        setModal(null);
                      }}
                      className="w-9 h-9 rounded-full border border-border/60"
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </>
            )}
            {modal === 'private' && (
              <>
                <h2 className="text-base font-semibold mb-1">Create private chat</h2>
                <p className="text-xs text-muted-foreground mb-3">Select one or more online friends.</p>
                {others.length === 0 && <p className="text-sm text-muted-foreground">Nobody else is online.</p>}
                <div className="grid sm:grid-cols-2 gap-2">
                  {others.map((n) => (
                    <label key={n} className="flex items-center gap-2 rounded-lg bg-secondary/30 border border-border/50 px-3 py-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={picked.includes(n)}
                        onChange={(e) =>
                          setPicked((p) => (e.target.checked ? [...p, n] : p.filter((x) => x !== n)))
                        }
                      />
                      <span className="truncate">{n}</span>
                    </label>
                  ))}
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => setModal(null)} className="px-3 py-1.5 rounded-lg text-sm bg-secondary/60 hover:bg-secondary">
                    Cancel
                  </button>
                  <button onClick={createPrivate} className="px-3 py-1.5 rounded-lg text-sm bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30">
                    Create chat
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
