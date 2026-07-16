import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Bot, User } from 'lucide-react';
import CodeBlock from './CodeBlock';
import type { ChatMessage as ChatMessageT } from '@/lib/aiChat';

import 'highlight.js/styles/github-dark.css';

interface Props {
  message: ChatMessageT;
  streaming?: boolean;
}

const ChatMessageView = ({ message, streaming }: Props) => {
  const isUser = message.role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} animate-fade-in`}>
      <div
        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border ${
          isUser
            ? 'bg-primary/20 border-primary/40 text-primary'
            : 'bg-secondary/60 border-border/50 text-foreground'
        }`}
        aria-hidden
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      <div
        className={`glass-panel px-4 py-3 max-w-[85%] md:max-w-[75%] text-sm leading-relaxed ${
          isUser ? 'bg-primary/10' : ''
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-pre:my-0 prose-pre:bg-transparent prose-pre:p-0">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{ code: CodeBlock as never }}
            >
              {message.content || (streaming ? '…' : '')}
            </ReactMarkdown>
            {streaming && (
              <span className="inline-block w-2 h-4 ml-0.5 align-middle bg-primary animate-pulse" />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessageView;
