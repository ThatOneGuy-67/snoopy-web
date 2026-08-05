import { memo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import { Bot, User, Copy, Check, RefreshCw, Pencil, X, FileText } from 'lucide-react';
import CodeBlock from './CodeBlock';
import { getModel } from '@/lib/aiModels';
import type { ChatMessage as ChatMessageT } from '@/lib/aiChat';

import 'highlight.js/styles/github-dark.css';
import 'katex/dist/katex.min.css';

interface Props {
  message: ChatMessageT;
  modelId: string;
  streaming?: boolean;
  onRegenerate?: () => void;
  onEdit?: (text: string) => void;
}

const ChatMessageView = ({ message, modelId, streaming, onRegenerate, onEdit }: Props) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const spec = getModel(modelId);
  const Icon = spec.icon;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* noop */
    }
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} animate-fade-in`}>
      <div
        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center border"
        style={
          isUser
            ? undefined
            : { background: `hsl(${spec.color} / 0.15)`, borderColor: `hsl(${spec.color} / 0.35)`, color: `hsl(${spec.color})` }
        }
        aria-hidden
      >
        {isUser ? (
          <span className="w-full h-full rounded-full flex items-center justify-center bg-primary/20 border border-primary/40 text-primary">
            <User className="w-4 h-4" />
          </span>
        ) : (
          <Icon className="w-4 h-4" />
        )}
      </div>

      <div className={`group min-w-0 max-w-[85%] md:max-w-[75%] ${isUser ? 'items-end' : ''} flex flex-col gap-1`}>
        {!!message.attachments?.length && (
          <div className={`flex flex-wrap gap-2 ${isUser ? 'justify-end' : ''}`}>
            {message.attachments.map((a) =>
              a.kind === 'image' ? (
                <img
                  key={a.id}
                  src={a.data}
                  alt={a.name}
                  className="max-h-40 rounded-lg border border-border/50 object-cover"
                  loading="lazy"
                />
              ) : (
                <span
                  key={a.id}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary/50 text-xs text-muted-foreground"
                >
                  <FileText className="w-3 h-3" /> {a.name}
                </span>
              ),
            )}
          </div>
        )}

        <div
          className={`glass-panel px-4 py-3 text-sm leading-relaxed ${isUser ? 'bg-primary/10' : ''} ${
            message.error ? 'border-destructive/40' : ''
          }`}
        >
          {isUser ? (
            editing ? (
              <div className="flex flex-col gap-2 min-w-[16rem]">
                <textarea
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={Math.min(10, draft.split('\n').length + 1)}
                  className="w-full bg-secondary/40 rounded-lg p-2 text-sm outline-none resize-y"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setEditing(false);
                      setDraft(message.content);
                    }}
                    className="px-2.5 py-1 rounded-md text-xs bg-secondary/60 hover:bg-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      if (draft.trim() && draft !== message.content) onEdit?.(draft.trim());
                    }}
                    className="px-2.5 py-1 rounded-md text-xs bg-primary/20 text-primary hover:bg-primary/30"
                  >
                    Save & resend
                  </button>
                </div>
              </div>
            ) : (
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
            )
          ) : (
            <div className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-pre:my-0 prose-pre:bg-transparent prose-pre:p-0 prose-table:text-xs">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeHighlight, rehypeKatex]}
                components={{ code: CodeBlock as never }}
              >
                {message.content || (streaming ? '' : '')}
              </ReactMarkdown>
              {streaming && (
                <span className="inline-block w-2 h-4 ml-0.5 align-middle bg-primary animate-pulse" />
              )}
            </div>
          )}
        </div>

        {!streaming && (
          <div
            className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition ${
              isUser ? 'justify-end' : ''
            }`}
          >
            <button
              onClick={copy}
              aria-label="Copy message"
              className="p-1.5 rounded-md hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            {isUser && onEdit && (
              <button
                onClick={() => setEditing((e) => !e)}
                aria-label="Edit message"
                className="p-1.5 rounded-md hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition"
              >
                {editing ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
              </button>
            )}
            {!isUser && onRegenerate && (
              <button
                onClick={onRegenerate}
                aria-label="Regenerate response"
                className="p-1.5 rounded-md hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(ChatMessageView);
