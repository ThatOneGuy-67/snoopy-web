/**
 * AI chat data layer + placeholder streaming API.
 * Everything about persistence, message shape, and "sending" lives here
 * so the UI stays presentation-only and the backend can be swapped later
 * by replacing `streamAssistantReply`.
 */

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'snoopy.ai.conversations.v1';

const uid = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export const loadConversations = (): Conversation[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveConversations = (list: Conversation[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* quota — ignore */
  }
};

export const createConversation = (): Conversation => {
  const now = Date.now();
  return {
    id: uid(),
    title: 'New chat',
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
};

export const createMessage = (
  role: ChatMessage['role'],
  content: string,
): ChatMessage => ({
  id: uid(),
  role,
  content,
  createdAt: Date.now(),
});

export const deriveTitle = (text: string) => {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return 'New chat';
  return clean.length > 40 ? clean.slice(0, 40) + '…' : clean;
};

/**
 * Placeholder streaming reply. Replace the body of this function with a
 * real fetch/SSE call to your backend (e.g. an edge function that talks to
 * an AI provider). The signature is intentionally stable:
 *
 *   - `history`   full prior messages for context
 *   - `onChunk`   called with each streamed token/segment
 *   - `signal`    AbortSignal so the UI can cancel mid-stream
 *
 * NEVER read API keys from the client — proxy through a server function.
 */
export async function streamAssistantReply(
  history: ChatMessage[],
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const last = history[history.length - 1]?.content ?? '';
  const demo = [
    "I'm a placeholder AI running locally in Snoopy's Web.",
    "\n\nYou said: **" + (last || '(nothing)') + "**\n\n",
    "Once you wire up a backend (Lovable AI, OpenAI, etc.), replace ",
    "`streamAssistantReply` in `src/lib/aiChat.ts` and this UI will ",
    "stream real tokens automatically.\n\n",
    "Here's a quick markdown demo:\n\n",
    "```ts\n",
    "// Example fetch to your future endpoint\n",
    "const res = await fetch('/api/chat', {\n",
    "  method: 'POST',\n",
    "  body: JSON.stringify({ messages }),\n",
    "});\n",
    "```\n",
    "- Supports **bold**, *italic*, `inline code`\n",
    "- GFM tables, lists, and links\n",
    "- Syntax-highlighted code blocks\n",
  ];

  let full = '';
  for (const part of demo) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    await new Promise((r) => setTimeout(r, 40));
    full += part;
    onChunk(part);
  }
  return full;
}
