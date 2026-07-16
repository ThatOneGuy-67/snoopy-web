import { useState, type ReactNode } from 'react';
import { Check, Copy } from 'lucide-react';

interface Props {
  className?: string;
  children?: ReactNode;
}

/**
 * Fenced-code renderer used by react-markdown.
 * Inline `code` falls back to a styled span; block code gets a copy button.
 */
const CodeBlock = ({ className, children, ...rest }: Props & Record<string, unknown>) => {
  const [copied, setCopied] = useState(false);
  const text = String(children ?? '').replace(/\n$/, '');
  const isBlock = /language-/.test(className || '') || text.includes('\n');

  if (!isBlock) {
    return (
      <code
        className="px-1.5 py-0.5 rounded bg-secondary/60 text-primary font-mono text-[0.85em]"
        {...rest}
      >
        {children}
      </code>
    );
  }

  const lang = (className || '').replace('language-', '').trim() || 'text';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* noop */
    }
  };

  return (
    <div className="relative group my-3 rounded-lg overflow-hidden border border-border/50 bg-[hsl(220_15%_10%)]">
      <div className="flex items-center justify-between px-3 py-1.5 text-[11px] font-mono text-muted-foreground border-b border-border/40 bg-secondary/30">
        <span>{lang}</span>
        <button
          onClick={copy}
          className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-secondary/70 hover:text-foreground transition"
          aria-label="Copy code"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-[13px] leading-relaxed">
        <code className={className} {...rest}>{children}</code>
      </pre>
    </div>
  );
};

export default CodeBlock;
