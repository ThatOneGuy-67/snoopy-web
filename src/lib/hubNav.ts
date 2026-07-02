import {
  Home, Gamepad2, MessageCircle, Film, Music, Sparkles, Download, Settings,
  type LucideIcon,
} from 'lucide-react';

export type HubViewId =
  | 'home' | 'games' | 'chat' | 'movies' | 'music' | 'ai' | 'downloads' | 'settings';

export interface HubNavItem {
  id: HubViewId;
  label: string;
  icon: LucideIcon;
  /** When true, selecting the item opens a modal instead of switching view. */
  action?: 'settings';
}

/**
 * Single source of truth for the Hub sidebar.
 * Add, remove, or reorder items here — the sidebar and router pick it up.
 */
export const HUB_NAV_ITEMS: HubNavItem[] = [
  { id: 'home',      label: 'Home',      icon: Home },
  { id: 'games',     label: 'Games',     icon: Gamepad2 },
  { id: 'chat',      label: 'Chat',      icon: MessageCircle },
  { id: 'movies',    label: 'Movies',    icon: Film },
  { id: 'music',     label: 'Music',     icon: Music },
  { id: 'ai',        label: 'AI',        icon: Sparkles },
  { id: 'downloads', label: 'Downloads', icon: Download },
  { id: 'settings',  label: 'Settings',  icon: Settings, action: 'settings' },
];
