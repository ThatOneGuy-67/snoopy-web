import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { Send, Square, Paperclip, X, FileText, ImageIcon } from 'lucide-react';
import { fileToAttachment, type Attachment } from '@/lib/aiChat';

interface Props {
  onSend: (text: string, attachments: Attachment[]) => void;
  onStop?: () => void;
  busy?: boolean;
  disabled?: boolean;
  placeholder?: string;
  focusKey?: string | number;
}

const ChatInput = ({ onSend, onStop, busy, disabled, placeholder, focusKey }: Props) => {
  const [value, setValue] = useState('');
  const [files, setFiles] = useState<Attachment[]>([]);
  const [dragging, setDragging] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!disabled) ref.current?.focus();
  }, [disabled, focusKey, busy]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, [value]);

  const addFiles = async (list: FileList | File[]) => {
    const parsed = await Promise.all(Array.from(list).slice(0, 6).map(fileToAttachment));
    setFiles((prev) => [...prev, ...parsed.filter(Boolean as unknown as (a: Attachment | null) => a is Attachment)]);
  };

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const text = value.trim();
    if ((!text && files.length === 0) || busy || disabled) return;
    onSend(text, files);
    setValue('');
    setFiles([]);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) void addFiles(e.dataTransfer.files);
  };

  return (
    <form
      onSubmit={submit}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`glass-panel p-2 flex flex-col gap-2 transition ${
        dragging ? 'ring-2 ring-primary/60' : ''
      }`}
    >
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 px-1 pt-1">
          {files.map((f) => (
            <span
              key={f.id}
              className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-md bg-secondary/60 text-xs"
            >
              {f.kind === 'image' ? <ImageIcon className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
              <span className="max-w-[10rem] truncate">{f.name}</span>
              <button
                type="button"
                onClick={() => setFiles((p) => p.filter((x) => x.id !== f.id))}
                aria-label={`Remove ${f.name}`}
                className="p-0.5 rounded hover:bg-destructive/20 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*,.txt,.md,.csv,.json,.log,.ts,.tsx,.js,.jsx,.py,.java,.cs,.cpp,.rs,.go,.sql,.html,.css,.yml,.yaml"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void addFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          aria-label="Attach files"
          className="shrink-0 p-2.5 rounded-lg hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <textarea
          ref={ref}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder ?? 'Message the AI…  (Shift+Enter for newline, drop files to attach)'}
          disabled={disabled}
          aria-label="Message"
          className="flex-1 resize-none bg-transparent px-1 py-2 text-sm outline-none placeholder:text-muted-foreground/70 max-h-[200px]"
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
            disabled={(!value.trim() && files.length === 0) || disabled}
            className="shrink-0 p-2.5 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        )}
      </div>
    </form>
  );
};

export default ChatInput;
