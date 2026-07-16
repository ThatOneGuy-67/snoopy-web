import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import ChatSidebar from '../ai/ChatSidebar';
import ChatMessageView from '../ai/ChatMessage';
import ChatInput from '../ai/ChatInput';
import {
  createConversation,
  createMessage,
  deriveTitle,
  loadConversations,
  saveConversations,
  streamAssistantReply,
  type Conversation,
} from '@/lib/aiChat';

const AIPage = () => {
  const [conversations, setConversations] = useState<Conversation[]>(() => loadConversations());
  const [activeId, setActiveId] = useState<string | null>(() => {
    const list = loadConversations();
    return list[0]?.id ?? null;
  });
  const [busy, setBusy] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    saveConversations(conversations);
  }, [conversations]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  });

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  const upsert = useCallback((id: string, updater: (c: Conversation) => Conversation) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? updater(c) : c)));
  }, []);

  const handleNew = useCallback(() => {
    const c = createConversation();
    setConversations((prev) => [c, ...prev]);
    setActiveId(c.id);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (id === activeId) setActiveId(next[0]?.id ?? null);
      return next;
    });
  }, [activeId]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleSend = useCallback(async (text: string) => {
    // Ensure we have an active conversation.
    let convId = activeId;
    if (!convId) {
      const c = createConversation();
      convId = c.id;
      setConversations((prev) => [c, ...prev]);
      setActiveId(c.id);
    }
    const targetId = convId!;

    const userMsg = createMessage('user', text);
    const assistantMsg = createMessage('assistant', '');

    setConversations((prev) =>
      prev.map((c) =>
        c.id === targetId
          ? {
              ...c,
              title: c.messages.length === 0 ? deriveTitle(text) : c.title,
              messages: [...c.messages, userMsg, assistantMsg],
              updatedAt: Date.now(),
            }
          : c,
      ),
    );

    setBusy(true);
    setStreamingId(assistantMsg.id);
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      // Build history *including* the just-added user message.
      const history = [
        ...(conversations.find((c) => c.id === targetId)?.messages ?? []),
        userMsg,
      ];
      await streamAssistantReply(
        history,
        (chunk) => {
          upsert(targetId, (c) => ({
            ...c,
            messages: c.messages.map((m) =>
              m.id === assistantMsg.id ? { ...m, content: m.content + chunk } : m,
            ),
            updatedAt: Date.now(),
          }));
        },
        ctrl.signal,
      );
    } catch (err) {
      const aborted = (err as DOMException)?.name === 'AbortError';
      upsert(targetId, (c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.id === assistantMsg.id
            ? {
                ...m,
                content:
                  m.content +
                  (aborted ? '\n\n_[stopped]_' : '\n\n_[error contacting AI service]_'),
              }
            : m,
        ),
      }));
    } finally {
      setBusy(false);
      setStreamingId(null);
      abortRef.current = null;
    }
  }, [activeId, conversations, upsert]);

  return (
    <div className="flex flex-col md:flex-row gap-4 max-w-6xl mx-auto pt-2">
      <ChatSidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onNew={handleNew}
        onDelete={handleDelete}
      />

      <div className="flex-1 min-w-0 flex flex-col md:h-[calc(100vh-6rem)]">
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4 min-h-[50vh]"
        >
          {!active || active.messages.length === 0 ? (
            <div className="h-full min-h-[50vh] flex flex-col items-center justify-center text-center px-4">
              <div
                className="p-4 rounded-2xl mb-4"
                style={{
                  background:
                    'linear-gradient(135deg, hsl(var(--primary) / 0.25), hsl(var(--primary) / 0.05))',
                  boxShadow:
                    '0 0 40px hsl(var(--glow-primary) / 0.25), inset 0 1px 0 hsl(var(--primary) / 0.35)',
                }}
              >
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold glow-text mb-2">Snoopy AI</h1>
              <p className="text-sm text-muted-foreground max-w-md">
                Ask anything. Supports markdown, code blocks, and streaming replies.
              </p>
              <p className="text-[11px] font-mono text-muted-foreground/70 mt-3">
                // demo mode — connect a backend in <span className="text-primary">src/lib/aiChat.ts</span>
              </p>
            </div>
          ) : (
            active.messages.map((m) => (
              <ChatMessageView
                key={m.id}
                message={m}
                streaming={streamingId === m.id && busy}
              />
            ))
          )}
        </div>

        <div className="pt-2">
          <ChatInput onSend={handleSend} onStop={handleStop} busy={busy} />
        </div>
      </div>
    </div>
  );
};

export default AIPage;
