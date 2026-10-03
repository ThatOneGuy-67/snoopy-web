import { useState, useCallback, useEffect } from 'react';
import HubSidebar from './HubSidebar';
import HubLauncher from '../HubLauncher';
import GamesPage from './pages/GamesPage';
import ChatPage from './pages/ChatPage';
import MoviesPage from './pages/MoviesPage';
import MusicPage from './pages/MusicPage';
import AIPage from './pages/AIPage';

import { HUB_NAV_ITEMS, type HubViewId } from '@/lib/hubNav';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  pinnedIds: string[];
  onSearch: (q: string) => void;
  onOpen: (url: string, title?: string) => void;
  onOpenApps: () => void;
  onOpenSettings: () => void;
}

const HubShell = ({ pinnedIds, onSearch, onOpen, onOpenApps, onOpenSettings }: Props) => {
  const [view, setView] = useState<HubViewId>('home');
  const [enabledViews, setEnabledViews] = useState<Partial<Record<HubViewId, boolean>>>({});

  useEffect(() => {
    let active = true;
    const loadFeatureState = async () => {
      const keys = ['feature_games', 'feature_chat', 'feature_movies', 'feature_music'] as const;
      const entries = await Promise.all(keys.map(async key => {
        const { data } = await (supabase as any).rpc('is_site_feature_enabled', { p_key: key });
        return [key.replace('feature_', '') as HubViewId, data !== false] as const;
      }));
      if (active) setEnabledViews(Object.fromEntries(entries));
    };
    void loadFeatureState();
    const timer = window.setInterval(() => void loadFeatureState(), 5_000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (view !== 'home' && enabledViews[view] === false) setView('home');
  }, [enabledViews, view]);

  const handleSelect = useCallback((id: HubViewId) => {
    const item = HUB_NAV_ITEMS.find(i => i.id === id);
    if (item?.action === 'settings') {
      onOpenSettings();
      return;
    }
    setView(id);
  }, [onOpenSettings]);

  return (
    <div className="flex flex-col md:flex-row min-h-full">
      <HubSidebar active={view} onSelect={handleSelect} enabledViews={enabledViews} />
      <div
        key={view}
        className="flex-1 min-w-0 px-3 sm:px-4 md:px-6 pb-8 animate-fade-in transition-all duration-300"
      >
        {view === 'home' && (
          <HubLauncher
            pinnedIds={pinnedIds}
            onSearch={onSearch}
            onOpen={onOpen}
            onOpenApps={onOpenApps}
          />
        )}
        {view === 'games'  && <GamesPage />}
        {view === 'chat'   && <ChatPage />}
        {view === 'movies' && <MoviesPage />}
        {view === 'music'  && <MusicPage />}
        {view === 'ai'     && <AIPage />}
      </div>
    </div>
  );
};

export default HubShell;
