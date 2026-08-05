import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { AI_MODELS, getModel } from '@/lib/aiModels';

interface Props {
  value: string;
  onChange: (id: string) => void;
  compact?: boolean;
}

const ModelSelector = ({ value, onChange, compact }: Props) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = getModel(value);
  const Icon = active.icon;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="glass-panel flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary/40 transition w-full"
      >
        <span
          className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center"
          style={{ background: `hsl(${active.color} / 0.18)`, color: `hsl(${active.color})` }}
        >
          <Icon className="w-3.5 h-3.5" />
        </span>
        <span className="font-medium truncate">{active.name}</span>
        {!compact && (
          <span className="hidden lg:inline text-xs text-muted-foreground truncate">
            {active.tagline}
          </span>
        )}
        <ChevronDown className={`w-4 h-4 ml-auto shrink-0 opacity-70 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="listbox"
          className="glass-panel absolute z-50 mt-2 left-0 w-[min(22rem,85vw)] max-h-[60vh] overflow-y-auto p-1.5 animate-fade-in"
        >
          {AI_MODELS.map((m) => {
            const MIcon = m.icon;
            const selected = m.id === value;
            return (
              <button
                key={m.id}
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(m.id);
                  setOpen(false);
                }}
                className={`w-full flex items-start gap-3 px-2.5 py-2 rounded-lg text-left transition ${
                  selected ? 'bg-primary/10' : 'hover:bg-secondary/50'
                }`}
              >
                <span
                  className="shrink-0 mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: `hsl(${m.color} / 0.18)`, color: `hsl(${m.color})` }}
                >
                  <MIcon className="w-4 h-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-medium">{m.name}</span>
                    {selected && <Check className="w-3.5 h-3.5 text-primary" />}
                  </span>
                  <span className="block text-xs text-muted-foreground leading-snug">
                    {m.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ModelSelector;
