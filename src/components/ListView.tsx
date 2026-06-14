import { ReactNode } from 'react';
import { Trash2 } from 'lucide-react';

interface ListViewProps {
  title: string;
  subtitle?: string;
  onClear?: () => void;
  empty: string;
  items: { id: string; title: string; sub?: string; right?: ReactNode; onClick?: () => void }[];
}

const ListView = ({ title, subtitle, onClear, empty, items }: ListViewProps) => {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {onClear && items.length > 0 && (
          <button onClick={onClear} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition">
            <Trash2 className="w-3.5 h-3.5" /> Clear all
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <div className="glass-panel p-10 text-center text-sm text-muted-foreground">{empty}</div>
      ) : (
        <div className="glass-panel divide-y divide-border/40">
          {items.map(it => (
            <div key={it.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/30 transition">
              <button onClick={it.onClick} className="flex-1 text-left min-w-0">
                <div className="text-sm text-foreground/90 truncate">{it.title}</div>
                {it.sub && <div className="text-xs text-muted-foreground truncate font-mono">{it.sub}</div>}
              </button>
              {it.right}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ListView;
