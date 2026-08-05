import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import ChatSidebar from '../ai/ChatSidebar';
import ChatMessageView from '../ai/ChatMessage';
import ChatInput from '../ai/ChatInput';
import ModelSelector from '../ai/ModelSelector';
import { AI_MODELS, DEFAULT_MODEL_ID, getModel } from '@/lib/aiModels';
import {
  createConversation,
  createMessage,
  deriveTitle,
  loadConversations,
  loadFolders,
  saveConversations,
  saveFolders,
  sortConversations,
  streamAssistantReply,
  uid,
  type Attachment,
  type ChatMessage,
  type Conversation,
  type Folder,
} from '@/lib/aiChat';

/** Only the most recent slice of a long chat is mounted (cheap virtualization). */
const WINDOW = 40;

const AIPage = () => {
  const [conversations, setConversations] = useState<Conversation[]>(() => loadConversations());
  const [folders, setFolders] = useState<Folder[]>(() => loadFolders());
  const [activeId, setActiveId] = useState<string | null>(() => sortConversations(loadConversations())[0]?.id ?? null);
  const [modelId, setModelId] = useState<string>(DEFAULT_MODEL_ID);
  const [busy, setBusy] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(WINDOW);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const convRef = useRef<Conversation[]>(conversations);
  convRef.current = conversations;

  useEffect(() => saveConversations(conversations), [conversations]);
  useEffect(() => saveFolders(folders), [folders]);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  const activeModelId = active?.modelId ?? modelId;
  const spec = getModel(activeModelId);

  useEffect(() => {
    setLimit(WINDOW);
  }, [activeId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: busy ? 'auto' : 'smooth' });
  }, [active?.messages.length, streamingId, busy]);

  const sorted = useMemo(() => sortConversations(conversations), [conversations]);

  const patch = useCallback((id: string, updater: (c: Conversation) => Conversation) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? updater(c) : c)));
  }, []);

  /* ------------------------------ conversations ---------------------------- */

  const handleNew = useCallback(() => {
    const c = createConversation(activeModelId);
    setConversations((prev) => [c, ...prev]);
    setActiveId(c.id);
    setError(null);
  }, [activeModelId]);

  const handleDelete = useCallback((id: string) => {
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      setActiveId((cur) => (cur === id ? sortConversations(next)[0]?.id ?? null : cur));
      return next;
    });
  }, []);

  const handleRename = useCallback((id: string, title: string) => patch(id, (c) => ({ ...c, title })), [patch]);
  const handleTogglePin = useCallback((id: string) => patch(id, (c) => ({ ...c, pinned: !c.pinned })), [patch]);
  const handleMoveToFolder = useCallback(
    (id: string, folderId: string | null) => patch(id, (c) => ({ ...c, folderId })),
    [patch],
  );
  const handleNewFolder = useCallback((name: string) => {
    setFolders((prev) => [...prev, { id: uid(), name, createdAt: Date.now() }]);
  }, []);
  const handleDeleteFolder = useCallback((id: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== id));
    setConversations((prev) => prev.map((c) => (c.folderId === id ? { ...c, folderId: null } : c)));
  }, []);

  const handleModelChange = useCallback(
    (id: string) => {
      setModelId(id);
      if (active) patch(active.id, (c) => ({ ...c, modelId: id }));
    },
    [active, patch],
  );

  /* --------------------------------- sending -------------------------------- */

  const handleStop = useCallback(() => abortRef.current?.abort(), []);

  const runStream = useCallback(
    async (targetId: string, history: ChatMessage[], assistantId: string) => {
      setBusy(true);
      setStreamingId(assistantId);
      setError(null);
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      try {
        await streamAssistantReply(
          history,
          convRef.current.find((c) => c.id === targetId)?.modelId ?? DEFAULT_MODEL_ID,
          (chunk) => {
            patch(targetId, (c) => ({
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + chunk } : m,
              ),
              updatedAt: Date.now(),
            }));
          },
          ctrl.signal,
        );
      } catch (err) {
        const aborted = (err as DOMException)?.name === 'AbortError';
        const message = aborted ? 'Stopped.' : (err as Error)?.message || 'Something went wrong.';
        if (!aborted) setError(message);
        patch(targetId, (c) => ({
          ...c,
          messages: c.messages.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: m.content || (aborted ? '_[stopped]_' : `_${message}_`),
                  error: !aborted && !m.content,
                }
              : m,
          ),
        }));
      } finally {
        setBusy(false);
        setStreamingId(null);
        abortRef.current = null;
      }
    },
    [patch],
  );

  const handleSend = useCallback(
    async (text: string, attachments: Attachment[] = []) => {
      let targetId = activeId;
      if (!targetId) {
        const c = createConversation(modelId);
        targetId = c.id;
        setConversations((prev) => [c, ...prev]);
        setActiveId(c.id);
        convRef.current = [c, ...convRef.current];
      }

      const userMsg = createMessage('user', text, attachments);
      const assistantMsg = createMessage('assistant', '');
      const prior = convRef.current.find((c) => c.id === targetId)?.messages ?? [];

      setConversations((prev) =>
        prev.map((c) =>
          c.id === targetId
            ? {
                ...c,
                title: c.messages.length === 0 ? deriveTitle(text || attachments[0]?.name || 'New chat') : c.title,
                messages: [...c.messages, userMsg, assistantMsg],
                updatedAt: Date.now(),
              }
            : c,
        ),
      );

      await runStream(targetId, [...prior, userMsg], assistantMsg.id);
    },
    [activeId, modelId, runStream],
  );

  const handleRegenerate = useCallback(
    async (assistantId: string) => {
      if (!active || busy) return;
      const idx = active.messages.findIndex((m) => m.id === assistantId);
      if (idx < 0) return;
      const history = active.messages.slice(0, idx).filter((m) => !m.error);
      patch(active.id, (c) => ({
        ...c,
        messages: c.messages.map((m) => (m.id === assistantId ? { ...m, content: '', error: false } : m)),
      }));
      await runStream(active.id, history, assistantId);
    },
    [active, busy, patch, runStream],
  );

  const handleEditUser = useCallback(
    async (messageId: string, text: string) => {
      if (!active || busy) return;
      const idx = active.messages.findIndex((m) => m.id === messageId);
      if (idx < 0) return;
      const edited = { ...active.messages[idx], content: text };
      const assistantMsg = createMessage('assistant', '');
      const kept = active.messages.slice(0, idx);
      patch(active.id, (c) => ({
        ...c,
        messages: [...kept, edited, assistantMsg],
        updatedAt: Date.now(),
      }));
      await runStream(active.id, [...kept, edited], assistantMsg.id);
    },
    [active, busy, patch, runStream],
  );

  /* --------------------------------- render -------------------------------- */

  const messages = active?.messages ?? [];
  const hidden = Math.max(0, messages.length - limit);
  const visible = hidden ? messages.slice(hidden) : messages;
  const Icon = spec.icon;

  return (
    <div className="flex flex-col md:flex-row gap-4 max-w-6xl mx-auto pt-2">
      <ChatSidebar
        conversations={sorted}
        folders={folders}
        activeId={activeId}
        onSelect={setActiveId}
        onNew={handleNew}
        onDelete={handleDelete}
        onRename={handleRename}
        onTogglePin={handleTogglePin}
        onMoveToFolder={handleMoveToFolder}
        onNewFolder={handleNewFolder}
        onDeleteFolder={handleDeleteFolder}
      />

      <div className="flex-1 min-w-0 flex flex-col md:h-[calc(100vh-6rem)]">
        <div className="pb-3 flex items-center gap-2">
          <div className="w-full sm:w-auto sm:min-w-[16rem]">
            <ModelSelector value={activeModelId} onChange={handleModelChange} />
          </div>
        </div>

        {error && (
          <div className="glass-panel border-destructive/40 text-destructive text-sm px-3 py-2 mb-2 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} aria-label="Dismiss error" className="text-xs underline">
              dismiss
            </button>
          </div>
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4 min-h-[50vh]">
          {messages.length === 0 ? (
            <div className="h-full min-h-[50vh] flex flex-col items-center justify-center text-center px-4">
              <div
                className="p-4 rounded-2xl mb-4"
                style={{
                  background: `linear-gradient(135deg, hsl(${spec.color} / 0.28), hsl(${spec.color} / 0.05))`,
                  boxShadow: `0 0 40px hsl(${spec.color} / 0.25), inset 0 1px 0 hsl(${spec.color} / 0.35)`,
                  color: `hsl(${spec.color})`,
                }}
              >
                <Icon className="w-8 h-8" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold glow-text mb-2">{spec.name}</h1>
              <p className="text-sm text-muted-foreground max-w-md">{spec.description}</p>

              <div className="mt-5 grid gap-2 sm:grid-cols-3 w-full max-w-2xl">
                {spec.starters.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s, [])}
                    className="glass-panel px-3 py-2.5 text-xs text-left text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition"
                  >
                    {s}
                  </button>
                ))}
              </div>

              <p className="text-[11px] font-mono text-muted-foreground/70 mt-5">
                // {AI_MODELS.length} specialised assistants — switch any time
              </p>
            </div>
          ) : (
            <>
              {hidden > 0 && (
                <button
                  onClick={() => setLimit((l) => l + WINDOW)}
                  className="mx-auto block text-xs text-muted-foreground hover:text-foreground glass-panel px-3 py-1.5"
                >
                  Load {Math.min(hidden, WINDOW)} earlier messages
                </button>
              )}
              {visible.map((m) => (
                <ChatMessageView
                  key={m.id}
                  message={m}
                  modelId={activeModelId}
                  streaming={streamingId === m.id && busy}
                  onRegenerate={m.role === 'assistant' ? () => handleRegenerate(m.id) : undefined}
                  onEdit={m.role === 'user' ? (text) => handleEditUser(m.id, text) : undefined}
                />
              ))}
            </>
          )}
        </div>

        <div className="pt-2">
          <ChatInput
            onSend={handleSend}
            onStop={handleStop}
            busy={busy}
            focusKey={activeId ?? 'none'}
            placeholder={`Message ${spec.name}…  (Shift+Enter for newline)`}
          />
        </div>
      </div>
    </div>
  );
};

export default AIPage;
