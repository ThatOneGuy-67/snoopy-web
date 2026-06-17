export interface ThemePreset {
  id: string;
  name: string;
  hue: number;
  background: string;       // hsl triplet for --background
  card: string;             // hsl triplet for --card
  border: string;           // hsl triplet for --border
  accent: string;           // hsl triplet for --primary/--accent/--glow
  description: string;
  swatches: string[];       // hex previews
}

export const THEMES: ThemePreset[] = [
  {
    id: 'matrix',
    name: 'Matrix Green',
    hue: 140,
    background: '220 15% 8%',
    card: '220 15% 12%',
    border: '220 15% 20%',
    accent: '140 80% 55%',
    description: 'Default. Hacker neon.',
    swatches: ['#0a0f0c', '#1a261e', '#22c55e'],
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    hue: 320,
    background: '270 30% 6%',
    card: '270 30% 10%',
    border: '300 40% 22%',
    accent: '320 95% 62%',
    description: 'Hot pink + violet glow.',
    swatches: ['#0e0419', '#2a0d40', '#ff2bd6'],
  },
  {
    id: 'amoled',
    name: 'AMOLED',
    hue: 0,
    background: '0 0% 0%',
    card: '0 0% 6%',
    border: '0 0% 14%',
    accent: '0 0% 100%',
    description: 'True black, white accents.',
    swatches: ['#000000', '#111111', '#ffffff'],
  },
  {
    id: 'vapor',
    name: 'Vaporwave',
    hue: 290,
    background: '260 35% 10%',
    card: '275 35% 14%',
    border: '290 40% 28%',
    accent: '290 95% 70%',
    description: 'Soft pinks and cyans.',
    swatches: ['#1a0f2e', '#2d1b4e', '#ff77ff'],
  },
  {
    id: 'ocean',
    name: 'Ocean',
    hue: 200,
    background: '215 40% 7%',
    card: '215 40% 11%',
    border: '210 35% 22%',
    accent: '195 90% 55%',
    description: 'Deep sea + cyan glow.',
    swatches: ['#06121f', '#0d2540', '#22c5ff'],
  },
  {
    id: 'sunset',
    name: 'Sunset',
    hue: 25,
    background: '20 25% 8%',
    card: '20 25% 12%',
    border: '20 30% 22%',
    accent: '25 95% 60%',
    description: 'Warm amber dusk.',
    swatches: ['#1a0f0a', '#2e1a10', '#ff8c2b'],
  },
  {
    id: 'winxp',
    name: 'Windows XP',
    hue: 210,
    background: '210 60% 35%',
    card: '210 50% 28%',
    border: '210 60% 45%',
    accent: '95 70% 50%',
    description: 'Bliss blue + Start-button green.',
    swatches: ['#245edb', '#3a6ea5', '#7fbf3f'],
  },
  {
    id: 'macos',
    name: 'macOS',
    hue: 220,
    background: '220 15% 14%',
    card: '220 12% 20%',
    border: '220 10% 30%',
    accent: '212 100% 60%',
    description: 'Graphite + signature blue.',
    swatches: ['#1e1f23', '#2a2c32', '#0a84ff'],
  },
  {
    id: 'contrast',
    name: 'High Contrast',
    hue: 140,
    background: '0 0% 0%',
    card: '0 0% 8%',
    border: '140 100% 50%',
    accent: '140 100% 55%',
    description: 'Max contrast, neon kept.',
    swatches: ['#000000', '#0a0a0a', '#00ff66'],
  },
];

export function applyTheme(id: string) {
  const t = THEMES.find(x => x.id === id) || THEMES[0];
  const r = document.documentElement.style;
  r.setProperty('--background', t.background);
  r.setProperty('--card', t.card);
  r.setProperty('--popover', t.card);
  r.setProperty('--border', t.border);
  r.setProperty('--input', t.card);
  r.setProperty('--secondary', t.card);
  r.setProperty('--muted', t.card);
  r.setProperty('--primary', t.accent);
  r.setProperty('--accent', t.accent);
  r.setProperty('--ring', t.accent);
  r.setProperty('--glow-primary', t.accent);
  r.setProperty('--glass-bg', t.card);
  r.setProperty('--glass-border', t.border);
  return t;
}

export const getTheme = (id: string) => THEMES.find(t => t.id === id) || THEMES[0];
