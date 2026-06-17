import { describe, it, expect, beforeEach } from 'vitest';
import { loadSettings, saveSettings, buildExport, applyImport } from '@/lib/settings';

const KEYS = {
  settings: 'snoopy-settings-v1',
  bookmarks: 'snoopy-bookmarks-v1',
  pinned: 'snoopy-pinned-apps-v1',
  favorites: 'snoopy-fav-apps-v1',
  history: 'snoopy-history-v1',
};

describe('state isolation', () => {
  beforeEach(() => localStorage.clear());

  it('uses distinct storage keys for every domain', () => {
    const set = new Set(Object.values(KEYS));
    expect(set.size).toBe(Object.values(KEYS).length);
  });

  it('mutating one domain never leaks into another', () => {
    localStorage.setItem(KEYS.pinned, JSON.stringify(['discord']));
    localStorage.setItem(KEYS.bookmarks, JSON.stringify([{ id: '1', title: 't', url: 'u', createdAt: 0 }]));
    saveSettings({ ...loadSettings(), themeId: 'cyberpunk' });

    expect(JSON.parse(localStorage.getItem(KEYS.pinned) || '[]')).toEqual(['discord']);
    expect(JSON.parse(localStorage.getItem(KEYS.bookmarks) || '[]')).toHaveLength(1);
    expect(loadSettings().themeId).toBe('cyberpunk');
  });

  it('switching theme does not touch pinned or bookmarks', () => {
    localStorage.setItem(KEYS.pinned, JSON.stringify(['github']));
    const before = localStorage.getItem(KEYS.pinned);
    saveSettings({ ...loadSettings(), themeId: 'amoled' });
    saveSettings({ ...loadSettings(), themeId: 'matrix' });
    expect(localStorage.getItem(KEYS.pinned)).toBe(before);
  });

  it('export/import round-trips every domain independently', () => {
    localStorage.setItem(KEYS.pinned, JSON.stringify(['youtube', 'github']));
    localStorage.setItem(KEYS.bookmarks, JSON.stringify([{ id: 'a', title: 'x', url: 'y', createdAt: 1 }]));
    saveSettings({ ...loadSettings(), themeId: 'ocean' });

    const snap = buildExport();
    localStorage.clear();

    const r = applyImport(JSON.stringify(snap));
    expect(r.ok).toBe(true);
    expect(JSON.parse(localStorage.getItem(KEYS.pinned) || '[]')).toEqual(['youtube', 'github']);
    expect(loadSettings().themeId).toBe('ocean');
  });

  it('refuses imports from foreign apps', () => {
    const r = applyImport(JSON.stringify({ app: 'somewhere-else', version: 1 }));
    expect(r.ok).toBe(false);
  });
});
