import { useState, useEffect } from 'react';
import { Shield, Layers } from 'lucide-react';
import StarField from '@/components/StarField';
import SearchBar from '@/components/SearchBar';
import AppCard from '@/components/AppCard';
import TabBar from '@/components/TabBar';
import ProxyFrame from '@/components/ProxyFrame';
import CloakSettings from '@/components/CloakSettings';
import SectionTitle from '@/components/SectionTitle';

interface Tab {
  id: string;
  title: string;
  url: string;
}

const apps = [
  { name: 'TikTok', icon: '🎵', color: '#ff0050', url: 'https://www.tiktok.com' },
  { name: 'Snapchat', icon: '👻', color: '#fffc00', url: 'https://www.snapchat.com' },
  { name: 'Instagram', icon: '📷', color: '#e4405f', url: 'https://www.instagram.com' },
  { name: 'Discord', icon: '💬', color: '#5865f2', url: 'https://discord.com/app' },
  { name: 'YouTube', icon: '▶️', color: '#ff0000', url: 'https://www.youtube.com' },
  { name: 'Reddit', icon: '🔶', color: '#ff4500', url: 'https://www.reddit.com' },
];

const games = [
  { name: 'Roblox', icon: '🎮', color: '#ff0000', url: 'https://www.roblox.com' },
  { name: 'Minecraft', icon: '⛏️', color: '#62b47a', url: 'https://classic.minecraft.net' },
  { name: 'Slope', icon: '🔴', color: '#00ff00', url: 'https://slope-game.github.io' },
  { name: '1v1.LOL', icon: '🔫', color: '#ff6b00', url: 'https://1v1.lol' },
  { name: 'Retro Bowl', icon: '🏈', color: '#8b4513', url: 'https://retrobowl.app' },
  { name: 'Subway Surfers', icon: '🏃', color: '#ffd700', url: 'https://subwaysurf.io' },
];

const Index = () => {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [showCloak, setShowCloak] = useState(false);

  const activeTab = tabs.find(t => t.id === activeTabId);

  const createTab = (url: string, title?: string) => {
    const id = crypto.randomUUID();
    const displayTitle = title || new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
    const newTab: Tab = { id, title: displayTitle, url };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(id);
  };

  const handleSearch = (query: string) => {
    // Check if it's a URL or search query
    const isUrl = query.includes('.') && !query.includes(' ');
    const url = isUrl 
      ? (query.startsWith('http') ? query : `https://${query}`)
      : `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    createTab(url, isUrl ? undefined : `Search: ${query}`);
  };

  const handleAppClick = (url: string, name: string) => {
    createTab(url, name);
  };

  const closeTab = (id: string) => {
    setTabs(prev => prev.filter(t => t.id !== id));
    if (activeTabId === id) {
      setActiveTabId(tabs.length > 1 ? tabs[tabs.length - 2]?.id || null : null);
    }
  };

  const applyCloak = (title: string, favicon: string) => {
    document.title = title;
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (link && favicon) {
      link.href = favicon;
    }
  };

  useEffect(() => {
    document.title = 'ACCESS PORTAL';
  }, []);

  return (
    <div className="min-h-screen relative">
      <StarField />
      <div className="noise-overlay" />
      
      <div className="relative z-10 flex flex-col h-screen">
        {/* Header with tabs */}
        <header className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <TabBar
                tabs={tabs}
                activeTabId={activeTabId}
                onTabClick={setActiveTabId}
                onTabClose={closeTab}
                onNewTab={() => setActiveTabId(null)}
                onHomeClick={() => setActiveTabId(null)}
              />
            </div>
            <button
              onClick={() => setShowCloak(true)}
              className="glass-card p-3 hover:border-primary/50"
            >
              <Shield className="w-5 h-5 text-primary" />
            </button>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-hidden">
          {activeTab ? (
            <div className="h-full p-4 pt-0">
              <ProxyFrame url={activeTab.url} />
            </div>
          ) : (
            <div className="h-full overflow-y-auto px-4 pb-8">
              {/* Hero Section */}
              <section className="text-center py-16 px-4">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Layers className="w-10 h-10 text-primary" />
                  <h1 className="text-5xl md:text-6xl font-bold tracking-tight glow-text">
                    ACCESS PORTAL
                  </h1>
                </div>
                <p className="text-muted-foreground text-lg font-mono mb-12">
                  // Secure • Fast • Unrestricted
                </p>
                <SearchBar onSearch={handleSearch} />
              </section>

              {/* Apps Section */}
              <section className="max-w-5xl mx-auto mb-12">
                <SectionTitle title="Apps Hub" subtitle="Quick access to your favorite platforms" />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                  {apps.map((app) => (
                    <AppCard
                      key={app.name}
                      name={app.name}
                      icon={app.icon}
                      color={app.color}
                      onClick={() => handleAppClick(app.url, app.name)}
                    />
                  ))}
                </div>
              </section>

              {/* Games Section */}
              <section className="max-w-5xl mx-auto mb-12">
                <SectionTitle title="Games Hub" subtitle="Play your favorite games unblocked" />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                  {games.map((game) => (
                    <AppCard
                      key={game.name}
                      name={game.name}
                      icon={game.icon}
                      color={game.color}
                      onClick={() => handleAppClick(game.url, game.name)}
                    />
                  ))}
                </div>
              </section>

              {/* Footer */}
              <footer className="text-center py-8 text-muted-foreground text-sm">
                <p className="font-mono">// For educational purposes only</p>
              </footer>
            </div>
          )}
        </main>
      </div>

      {/* Cloak Settings Modal */}
      <CloakSettings
        isOpen={showCloak}
        onClose={() => setShowCloak(false)}
        onApply={applyCloak}
      />
    </div>
  );
};

export default Index;
