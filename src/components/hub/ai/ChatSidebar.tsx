import { Plus, MessageSquare, Trash2 } from 'lucide-react';
import type { Conversation } from '@/lib/aiChat';

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

const ChatSidebar = ({ conversations, activeId, onSelect, onNew, onDelete }: Props) => {
  return (
    <aside className="glass-panel p-3 flex flex-col gap-2 md:w-64 shrink-0 md:h-[calc(100vh-6rem)] md:sticky md:top-4">
      <button
        onClick={onNew}
        className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg bg-primary/15 hover:bg-primary/25 text-primary text-sm font-medium transition"
      >
        <Plus className="w-4 h-4" /> New chat
      </button>

      <div className="flex-1 overflow-y-auto -mr-1 pr-1 mt-1 min-h-0">
        {conversations.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6 font-mono">
            // no chats yet
          </p>
        ) : (
          <ul className="space-y-1">
            {conversations.map((c) => {
              const active = c.id === activeId;
              return (
                <li key={c.id} className="group flex items-center gap-1">
                  <button
                    onClick={() => onSelect(c.id)}
                    className={`flex-1 min-w-0 flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-sm transition ${
                      active
                        ? 'bg-primary/15 text-primary'
                        : 'hover:bg-secondary/50 text-foreground/80'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-70" />
                    <span className="truncate">{c.title}</span>
                  </button>
                  <button
                    onClick={() => onDelete(c.id)}
                    aria-label={`Delete ${c.title}`}
                    className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
};

export default ChatSidebar;
