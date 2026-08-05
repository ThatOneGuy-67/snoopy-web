import { useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Trash2,
  Pin,
  PinOff,
  Pencil,
  FolderPlus,
  Folder as FolderIcon,
  ChevronRight,
  Check,
  X,
} from 'lucide-react';
import { getModel } from '@/lib/aiModels';
import type { Conversation, Folder } from '@/lib/aiChat';

interface Props {
  conversations: Conversation[];
  folders: Folder[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onTogglePin: (id: string) => void;
  onMoveToFolder: (id: string, folderId: string | null) => void;
  onNewFolder: (name: string) => void;
  onDeleteFolder: (id: string) => void;
}

const ChatSidebar = ({
  conversations,
  folders,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onRename,
  onTogglePin,
  onMoveToFolder,
  onNewFolder,
  onDeleteFolder,
}: Props) => {
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.messages.some((m) => m.content.toLowerCase().includes(q)),
    );
  }, [conversations, query]);

  const groups = useMemo(() => {
    const byFolder = new Map<string, Conversation[]>();
    const loose: Conversation[] = [];
    for (const c of filtered) {
      if (c.folderId && folders.some((f) => f.id === c.folderId)) {
        const arr = byFolder.get(c.folderId) ?? [];
        arr.push(c);
        byFolder.set(c.folderId, arr);
      } else loose.push(c);
    }
    return { byFolder, loose };
  }, [filtered, folders]);

  const startRename = (c: Conversation) => {
    setEditingId(c.id);
    setDraft(c.title);
  };

  const commitRename = () => {
    if (editingId && draft.trim()) onRename(editingId, draft.trim());
    setEditingId(null);
  };

  const row = (c: Conversation) => {
    const active = c.id === activeId;
    const spec = getModel(c.modelId);
    const Icon = spec.icon;
    return (
      <li key={c.id} className="group relative flex items-center gap-1">
        {editingId === c.id ? (
          <div className="flex-1 flex items-center gap-1 px-2 py-1.5">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') setEditingId(null);
              }}
              className="flex-1 min-w-0 bg-secondary/50 rounded px-2 py-1 text-sm outline-none ring-1 ring-primary/40"
            />
            <button onClick={commitRename} aria-label="Save name" className="p-1 rounded hover:bg-secondary/70">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setEditingId(null)} aria-label="Cancel rename" className="p-1 rounded hover:bg-secondary/70">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => onSelect(c.id)}
              className={`flex-1 min-w-0 flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-sm transition ${
                active ? 'bg-primary/15 text-primary' : 'hover:bg-secondary/50 text-foreground/80'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: `hsl(${spec.color})` }} />
              <span className="truncate">{c.title}</span>
              {c.pinned && <Pin className="w-3 h-3 ml-auto shrink-0 opacity-60" />}
            </button>
            <div className="absolute right-1 hidden group-hover:flex items-center gap-0.5 bg-background/80 backdrop-blur rounded-md px-0.5">
              <button
                onClick={() => onTogglePin(c.id)}
                aria-label={c.pinned ? `Unpin ${c.title}` : `Pin ${c.title}`}
                className="p-1.5 rounded hover:bg-secondary/70"
              >
                {c.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => startRename(c)}
                aria-label={`Rename ${c.title}`}
                className="p-1.5 rounded hover:bg-secondary/70"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              {folders.length > 0 && (
                <select
                  aria-label={`Move ${c.title} to folder`}
                  value={c.folderId ?? ''}
                  onChange={(e) => onMoveToFolder(c.id, e.target.value || null)}
                  className="bg-transparent text-[11px] rounded px-1 py-1 outline-none hover:bg-secondary/70 max-w-[4.5rem]"
                >
                  <option value="">No folder</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={() => onDelete(c.id)}
                aria-label={`Delete ${c.title}`}
                className="p-1.5 rounded hover:bg-destructive/20 hover:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}
      </li>
    );
  };

  return (
    <aside className="glass-panel p-3 flex flex-col gap-2 md:w-72 shrink-0 md:h-[calc(100vh-6rem)] md:sticky md:top-4">
      <div className="flex gap-2">
        <button
          onClick={onNew}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary/15 hover:bg-primary/25 text-primary text-sm font-medium transition"
        >
          <Plus className="w-4 h-4" /> New chat
        </button>
        <button
          onClick={() => {
            const name = window.prompt('Folder name');
            if (name?.trim()) onNewFolder(name.trim());
          }}
          aria-label="New folder"
          className="px-2.5 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition"
        >
          <FolderPlus className="w-4 h-4" />
        </button>
      </div>

      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search chats…"
          aria-label="Search chats"
          className="w-full bg-secondary/40 rounded-lg pl-8 pr-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/70"
        />
      </div>

      <div className="flex-1 overflow-y-auto -mr-1 pr-1 mt-1 min-h-0 space-y-3">
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6 font-mono">
            // {query ? 'no matches' : 'no chats yet'}
          </p>
        ) : (
          <>
            {folders.map((f) => {
              const items = groups.byFolder.get(f.id) ?? [];
              if (items.length === 0 && query) return null;
              const isCollapsed = collapsed[f.id];
              return (
                <div key={f.id}>
                  <div className="group flex items-center gap-1 px-1 text-xs text-muted-foreground">
                    <button
                      onClick={() => setCollapsed((s) => ({ ...s, [f.id]: !s[f.id] }))}
                      className="flex items-center gap-1.5 flex-1 min-w-0 py-1 hover:text-foreground transition"
                    >
                      <ChevronRight className={`w-3 h-3 transition ${isCollapsed ? '' : 'rotate-90'}`} />
                      <FolderIcon className="w-3 h-3" />
                      <span className="truncate">{f.name}</span>
                      <span className="opacity-60">{items.length}</span>
                    </button>
                    <button
                      onClick={() => onDeleteFolder(f.id)}
                      aria-label={`Delete folder ${f.name}`}
                      className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  {!isCollapsed && <ul className="space-y-1 mt-1">{items.map(row)}</ul>}
                </div>
              );
            })}
            {groups.loose.length > 0 && <ul className="space-y-1">{groups.loose.map(row)}</ul>}
          </>
        )}
      </div>
    </aside>
  );
};

export default ChatSidebar;
