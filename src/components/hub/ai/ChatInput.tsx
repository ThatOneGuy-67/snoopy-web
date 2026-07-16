import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Send, Square } from 'lucide-react';

interface Props {
  onSend: (text: string) => void;
  onStop?: () => void;
  busy?: boolean;
  disabled?: boolean;
}

const ChatInput = ({ onSend, onStop, busy, disabled }: Props) => {
  const [value, setValue] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, [value]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const text = value.trim();
    if (!text || busy || disabled) return;
    onSend(text);
    setValue('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <form onSubmit={submit} className="glass-panel p-2 flex items-end gap-2">
      <textarea
        ref={ref}
        rows={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Message the AI…  (Shift+Enter for newline)"
        disabled={disabled}
        className="flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/70 max-h-[200px]"
      />
      {busy ? (
        <button
          type="button"
          onClick={onStop}
          aria-label="Stop generating"
          className="shrink-0 p-2.5 rounded-lg bg-destructive/20 hover:bg-destructive/30 text-destructive transition"
        >
          <Square className="w-4 h-4" />
        </button>
      ) : (
        <button
          type="submit"
          aria-label="Send message"
          disabled={!value.trim() || disabled}
          className="shrink-0 p-2.5 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
        </button>
      )}
    </form>
  );
};

export default ChatInput;
