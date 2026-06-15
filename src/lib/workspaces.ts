import { useCallback, useEffect, useState } from 'react';

export interface Workspace {
  id: string;
  name: string;
  emoji: string;
  themeId: string;
  pinnedAppIds: string[];
  createdAt: number;
}

const K_LIST   = 'snoopy-workspaces-v1';
const K_ACTIVE = 'snoopy-workspace-active-v1';

const DEFAULTS: Workspace[] = [
  { id: 'default',     name: 'Default',     emoji: '🌐', themeId: 'matrix',    pinnedAppIds: ['discord', 'youtube', 'chatgpt', 'github'], createdAt: 0 },
  { id: 'school',      name: 'School',      emoji: '📚', themeId: 'ocean',     pinnedAppIds: ['gdocs', 'gdrive', 'chatgpt'],              createdAt: 0 },
  { id: 'gaming',      name: 'Gaming',      emoji: '🎮', themeId: 'cyberpunk', pinnedAppIds: ['discord', 'twitch', 'youtube'],            createdAt: 0 },
  { id: 'social',      name: 'Social',      emoji: '💬', themeId: 'vapor',     pinnedAppIds: ['discord', 'instagram', 'x', 'snapchat'],   createdAt: 0 },
  { id: 'focus',       name: 'Focus',       emoji: '🎯', themeId: 'amoled',    pinnedAppIds: ['gdocs', 'chatgpt', 'github'],              createdAt: 0 },
];

function read<T>(k: string, fb: T): T {
  try { const r = localStorage.getItem(k); return r ? JSON.parse(r) as T : fb; } catch { return fb; }
}

export function useWorkspaces() {
  const [list, setList]     = useState<Workspace[]>(() => read(K_LIST, DEFAULTS));
  const [activeId, setActiveId] = useState<string>(() => read(K_ACTIVE, 'default'));

  useEffect(() => { localStorage.setItem(K_LIST, JSON.stringify(list)); }, [list]);
  useEffect(() => { localStorage.setItem(K_ACTIVE, JSON.stringify(activeId)); }, [activeId]);

  const active = list.find(w => w.id === activeId) || list[0];

  const create = useCallback((w: Omit<Workspace, 'id' | 'createdAt'>) => {
    const id = crypto.randomUUID();
    setList(prev => [...prev, { ...w, id, createdAt: Date.now() }]);
    setActiveId(id);
  }, []);

  const update = useCallback((id: string, patch: Partial<Workspace>) =>
    setList(prev => prev.map(w => w.id === id ? { ...w, ...patch } : w)), []);

  const remove = useCallback((id: string) => {
    if (id === 'default') return;
    setList(prev => prev.filter(w => w.id !== id));
    setActiveId(prev => prev === id ? 'default' : prev);
  }, []);

  return { list, active, activeId, setActiveId, create, update, remove };
}
