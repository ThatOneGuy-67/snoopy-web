import {
  MessagesSquare, Flame, Music2, Instagram, Ghost, Twitter, Youtube,
  Music, Twitch, FileText, FolderOpen, Github, Palette,
  Bot, Sparkles, Brain, Search, LucideIcon,
} from 'lucide-react';

export interface AppItem {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
  url: string;
  category: AppCategory;
}

export type AppCategory = 'Social' | 'Media' | 'Productivity' | 'AI';

export const APPS: AppItem[] = [
  // Social
  { id: 'discord',   name: 'Discord',   icon: MessagesSquare, color: '#5865f2', url: 'https://discord.com/app',         category: 'Social' },
  { id: 'reddit',    name: 'Reddit',    icon: Flame,          color: '#ff4500', url: 'https://www.reddit.com',          category: 'Social' },
  { id: 'x',         name: 'X',         icon: Twitter,        color: '#ffffff', url: 'https://x.com',                   category: 'Social' },
  { id: 'instagram', name: 'Instagram', icon: Instagram,      color: '#e4405f', url: 'https://www.instagram.com',       category: 'Social' },
  { id: 'snapchat',  name: 'Snapchat',  icon: Ghost,          color: '#fffc00', url: 'https://web.snapchat.com',        category: 'Social' },
  { id: 'tiktok',    name: 'TikTok',    icon: Music2,         color: '#ff0050', url: 'https://www.tiktok.com',          category: 'Social' },

  // Media
  { id: 'youtube',   name: 'YouTube',   icon: Youtube,        color: '#ff0000', url: 'https://www.youtube.com',         category: 'Media' },
  { id: 'spotify',   name: 'Spotify',   icon: Music,          color: '#1db954', url: 'https://open.spotify.com',        category: 'Media' },
  { id: 'twitch',    name: 'Twitch',    icon: Twitch,         color: '#9146ff', url: 'https://www.twitch.tv',           category: 'Media' },

  // Productivity
  { id: 'gdocs',     name: 'Google Docs',  icon: FileText,    color: '#4285f4', url: 'https://docs.google.com',         category: 'Productivity' },
  { id: 'gdrive',    name: 'Google Drive', icon: FolderOpen,  color: '#fbbc04', url: 'https://drive.google.com',        category: 'Productivity' },
  { id: 'github',    name: 'GitHub',       icon: Github,      color: '#ffffff', url: 'https://github.com',              category: 'Productivity' },
  { id: 'canva',     name: 'Canva',        icon: Palette,     color: '#00c4cc', url: 'https://www.canva.com',           category: 'Productivity' },

  // AI
  { id: 'chatgpt',    name: 'ChatGPT',    icon: Bot,          color: '#10a37f', url: 'https://chat.openai.com',         category: 'AI' },
  { id: 'gemini',     name: 'Gemini',     icon: Sparkles,     color: '#8e75ff', url: 'https://gemini.google.com',       category: 'AI' },
  { id: 'claude',     name: 'Claude',     icon: Brain,        color: '#d97757', url: 'https://claude.ai',               category: 'AI' },
  { id: 'perplexity', name: 'Perplexity', icon: Search,       color: '#20b8cd', url: 'https://www.perplexity.ai',       category: 'AI' },
];

export const CATEGORIES: AppCategory[] = ['Social', 'Media', 'Productivity', 'AI'];

export const getApp = (id: string) => APPS.find(a => a.id === id);
