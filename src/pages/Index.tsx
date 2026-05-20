import { useState, useEffect, useCallback } from 'react';
import { Shield, Layers, Settings as SettingsIcon } from 'lucide-react';
import StarField from '@/components/StarField';
import SearchBar from '@/components/SearchBar';
import AppCard from '@/components/AppCard';
import TabBar from '@/components/TabBar';
import ProxyFrame from '@/components/ProxyFrame';
import BrowserChrome from '@/components/BrowserChrome';
import SettingsModal from '@/components/SettingsModal';
import SectionTitle from '@/components/SectionTitle';
import { useSettings, buildProxyUrl, buildSearchUrl, openAboutBlank } from '@/lib/settings';

interface Tab {
  id: string;
  history: string[];
  index: number; // current position in history
  title: string;
  reloadKey: number;
}

const apps = [
  { name: 'TikTok', icon: '🎵', color: '#ff0050', url: 'https://www.tiktok.com' },
  { name: 'Snapchat', icon: '👻', color: '#fffc00', url: 'https://web.snapchat.com' },
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
  const [settings, setSettings] = useSettings();
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const activeTab = tabs.find(t => t.id === activeTabId) || null;
  const currentUrl = activeTab ? activeTab.history[activeTab.index] : '';

  const applyCloak = useCallback((title: string, favicon: string) => {
    document.title = title;
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (link && favicon) link.href = favicon;
  }, []);

  // Initial title + auto-cloak
  useEffect(() => {
    if (settings.autoCloakOnLoad && settings.defaultCloakTitle) {
      applyCloak(settings.defaultCloakTitle, settings.defaultCloakFavicon);
    } else {
      document.title = "Snoopy's Web";
    }
  }, [settings.autoCloakOnLoad, settings.defaultCloakTitle, settings.defaultCloakFavicon, applyCloak]);

  // Panic key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (e.key === settings.panicKey) {
        window.location.replace(settings.panicUrl);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [settings.panicKey, settings.panicUrl]);

  const openExternal = (url: string) => {
    if (settings.aboutBlankCloak) openAboutBlank(url);
    else window.open(url, '_blank', 'noopener,noreferrer');
  };

  const createTab = (url: string, title?: string) => {
    // If user prefers new tab AND we don't have a proxy, just pop it out
    const hasProxy = !!settings.proxyUrl;
    if (settings.openInNewTab && !hasProxy) {
      openExternal(url);
      return;
    }
    const id = crypto.randomUUID();
    let displayTitle = title;
    try {
      displayTitle = title || new URL(url).hostname.replace(/^www\./, '');
    } catch {
      displayTitle = title || url;
    }
    setTabs(prev => [...prev, { id, history: [url], index: 0, title: displayTitle!, reloadKey: 0 }]);
    setActiveTabId(id);
  };

  const handleSearch = (query: string) => {
    const isUrl = query.includes('.') && !query.includes(' ');
    const url = isUrl
      ? (query.startsWith('http') ? query : `https://${query}`)
      : buildSearchUrl(query, settings.searchEngine);
    createTab(url, isUrl ? undefined : `Search: ${query}`);
  };

  const handleAppClick = (url: string) => createTab(url);

  const closeTab = (id: string) => {
    setTabs(prev => prev.filter(t => t.id !== id));
    if (activeTabId === id) {
      setActiveTabId(prev => {
        const remaining = tabs.filter(t => t.id !== id);
        return remaining[remaining.length - 1]?.id || null;
      });
    }
  };

  const updateActiveTab = (mut: (t: Tab) => Tab) => {
    setTabs(prev => prev.map(t => (t.id === activeTabId ? mut(t) : t)));
  };

  const navigate = (url: string) => {
    if (!activeTab) return;
    updateActiveTab(t => {
      const newHistory = [...t.history.slice(0, t.index + 1), url];
      return { ...t, history: newHistory, index: newHistory.length - 1 };
    });
  };

  const goBack = () => activeTab && activeTab.index > 0 &&
    updateActiveTab(t => ({ ...t, index: t.index - 1 }));
  const goForward = () => activeTab && activeTab.index < activeTab.history.length - 1 &&
    updateActiveTab(t => ({ ...t, index: t.index + 1 }));
  const reload = () => updateActiveTab(t => ({ ...t, reloadKey: t.reloadKey + 1 }));

  const proxyResolved = currentUrl ? buildProxyUrl(currentUrl, settings) : null;

  return (
    <div className="min-h-screen relative">
      {settings.showParticles && <StarField />}
      <div className="noise-overlay" />

      <div className="relative z-10 flex flex-col h-screen">
        <header className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <TabBar
                tabs={tabs.map(t => ({ id: t.id, title: t.title, url: t.history[t.index] }))}
                activeTabId={activeTabId}
                onTabClick={setActiveTabId}
                onTabClose={closeTab}
                onNewTab={() => setActiveTabId(null)}
                onHomeClick={() => setActiveTabId(null)}
              />
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="glass-card !p-3 hover:border-primary/50 shrink-0"
              title="Settings & Cloak">
              <SettingsIcon className="w-5 h-5 text-primary" />
            </button>
          </div>

          {activeTab && (
            <BrowserChrome
              url={currentUrl}
              onNavigate={navigate}
              onBack={goBack}
              onForward={goForward}
              onReload={reload}
              canBack={activeTab.index > 0}
              canForward={activeTab.index < activeTab.history.length - 1}
            />
          )}
        </header>

        <main className="flex-1 overflow-hidden">
          {activeTab ? (
            <div className="h-full p-4 pt-0">
              <ProxyFrame key={`${activeTab.id}-${activeTab.index}-${activeTab.reloadKey}`}
                url={currentUrl} proxyResolvedUrl={proxyResolved} />
            </div>
          ) : (
            <div className="h-full overflow-y-auto px-4 pb-8">
              <section className="text-center py-16 px-4">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Layers className="w-10 h-10 text-primary" />
                  <h1 className="text-5xl md:text-6xl font-bold tracking-tight glow-text">
                    Snoopy's Web
                  </h1>
                </div>
                <p className="text-muted-foreground text-lg font-mono mb-12">
                  // Secure • Fast • Unrestricted
                </p>
                <SearchBar onSearch={handleSearch} />
                {!settings.proxyUrl && (
                  <p className="text-xs text-muted-foreground mt-4">
                    Tip: configure a proxy in <button onClick={() => setShowSettings(true)} className="underline text-primary">Settings → Proxy</button> to browse inside the app.
                  </p>
                )}
              </section>

              <section className="max-w-5xl mx-auto mb-12">
                <SectionTitle title="Apps Hub" subtitle="Quick access to your favorite platforms" />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                  {apps.map((app) => (
                    <AppCard key={app.name} name={app.name} icon={app.icon} color={app.color}
                      onClick={() => handleAppClick(app.url)} />
                  ))}
                </div>
              </section>

              <section className="max-w-5xl mx-auto mb-12">
                <SectionTitle title="Games Hub" subtitle="Play your favorite games unblocked" />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                  {games.map((game) => (
                    <AppCard key={game.name} name={game.name} icon={game.icon} color={game.color}
                      onClick={() => handleAppClick(game.url)} />
                  ))}
                </div>
              </section>

              <footer className="text-center py-8 text-muted-foreground text-sm">
                <p className="font-mono">// For educational purposes only</p>
              </footer>
            </div>
          )}
        </main>
      </div>

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onChange={setSettings}
        onApplyCloak={applyCloak}
      />
    </div>
  );
};

export default Index;
