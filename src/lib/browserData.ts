import { useCallback, useEffect, useState } from 'react';

export interface Bookmark { id: string; title: string; url: string; createdAt: number; }
export interface HistoryEntry { url: string; title: string; visitedAt: number; }
export interface ActivityEntry { kind: 'open' | 'search' | 'bookmark' | 'app'; label: string; at: number; }

const K = {
  bookmarks: 'snoopy-bookmarks-v1',
  history:   'snoopy-history-v1',
  pinned:    'snoopy-pinned-apps-v1',
  favorites: 'snoopy-fav-apps-v1',
  activity:  'snoopy-activity-v1',
  closed:    'snoopy-closed-tabs-v1',
};

function read<T>(k: string, fallback: T): T {
  try { const r = localStorage.getItem(k); return r ? JSON.parse(r) as T : fallback; }
  catch { return fallback; }
}
function write<T>(k: string, v: T) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

function useStored<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(() => read(key, initial));
  useEffect(() => { write(key, state); }, [key, state]);
  // cross-tab sync
  useEffect(() => {
    const h = (e: StorageEvent) => { if (e.key === key && e.newValue) {
      try { setState(JSON.parse(e.newValue)); } catch {}
    }};
    window.addEventListener('storage', h);
    return () => window.removeEventListener('storage', h);
  }, [key]);
  return [state, setState] as const;
}

export function useBookmarks() {
  const [items, setItems] = useStored<Bookmark[]>(K.bookmarks, []);
  const add = useCallback((b: Omit<Bookmark, 'id' | 'createdAt'>) => {
    setItems(prev => prev.some(p => p.url === b.url)
      ? prev
      : [{ ...b, id: crypto.randomUUID(), createdAt: Date.now() }, ...prev].slice(0, 200));
  }, [setItems]);
  const remove = useCallback((id: string) => setItems(prev => prev.filter(p => p.id !== id)), [setItems]);
  const toggle = useCallback((b: Omit<Bookmark, 'id' | 'createdAt'>) => {
    setItems(prev => prev.some(p => p.url === b.url)
      ? prev.filter(p => p.url !== b.url)
      : [{ ...b, id: crypto.randomUUID(), createdAt: Date.now() }, ...prev].slice(0, 200));
  }, [setItems]);
  return { items, add, remove, toggle };
}

export function useHistory() {
  const [items, setItems] = useStored<HistoryEntry[]>(K.history, []);
  const push = useCallback((e: Omit<HistoryEntry, 'visitedAt'>) => {
    setItems(prev => [{ ...e, visitedAt: Date.now() }, ...prev.filter(p => p.url !== e.url)].slice(0, 300));
  }, [setItems]);
  const clear = useCallback(() => setItems([]), [setItems]);
  return { items, push, clear };
}

export function usePinnedApps() {
  const [ids, setIds] = useStored<string[]>(K.pinned, ['discord', 'youtube', 'chatgpt', 'github']);
  const toggle = useCallback((id: string) =>
    setIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]), [setIds]);
  return { ids, toggle, isPinned: (id: string) => ids.includes(id) };
}

export function useFavoriteApps() {
  const [ids, setIds] = useStored<string[]>(K.favorites, []);
  const toggle = useCallback((id: string) =>
    setIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]), [setIds]);
  return { ids, toggle, isFav: (id: string) => ids.includes(id) };
}

export function useActivity() {
  const [items, setItems] = useStored<ActivityEntry[]>(K.activity, []);
  const log = useCallback((e: Omit<ActivityEntry, 'at'>) =>
    setItems(prev => [{ ...e, at: Date.now() }, ...prev].slice(0, 50)), [setItems]);
  const clear = useCallback(() => setItems([]), [setItems]);
  return { items, log, clear };
}

export function useClosedTabs() {
  const [items, setItems] = useStored<{ url: string; title: string; at: number }[]>(K.closed, []);
  const push = useCallback((e: { url: string; title: string }) =>
    setItems(prev => [{ ...e, at: Date.now() }, ...prev].slice(0, 20)), [setItems]);
  return { items, push };
}
