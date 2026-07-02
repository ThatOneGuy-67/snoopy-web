import { useState, useCallback } from 'react';
import HubSidebar from './HubSidebar';
import HubLauncher from '../HubLauncher';
import GamesPage from './pages/GamesPage';
import ChatPage from './pages/ChatPage';
import MoviesPage from './pages/MoviesPage';
import MusicPage from './pages/MusicPage';
import AIPage from './pages/AIPage';
import DownloadsPage from './pages/DownloadsPage';
import { HUB_NAV_ITEMS, type HubViewId } from '@/lib/hubNav';

interface Props {
  pinnedIds: string[];
  onSearch: (q: string) => void;
  onOpen: (url: string, title?: string) => void;
  onOpenApps: () => void;
  onOpenSettings: () => void;
}

const HubShell = ({ pinnedIds, onSearch, onOpen, onOpenApps, onOpenSettings }: Props) => {
  const [view, setView] = useState<HubViewId>('home');

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
      <HubSidebar active={view} onSelect={handleSelect} />
      <div className="flex-1 min-w-0 animate-fade-in" key={view}>
        {view === 'home' && (
          <HubLauncher
            pinnedIds={pinnedIds}
            onSearch={onSearch}
            onOpen={onOpen}
            onOpenApps={onOpenApps}
          />
        )}
        {view === 'games'     && <GamesPage />}
        {view === 'chat'      && <ChatPage />}
        {view === 'movies'    && <MoviesPage />}
        {view === 'music'     && <MusicPage />}
        {view === 'ai'        && <AIPage />}
        {view === 'downloads' && <DownloadsPage />}
      </div>
    </div>
  );
};

export default HubShell;
