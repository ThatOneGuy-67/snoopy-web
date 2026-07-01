import { useRef, useState } from 'react';
import { Settings as SettingsIcon, X, Shield, Globe, Palette, KeyRound, Check, AlertCircle, Loader2, Image as ImageIcon, Download, Upload, Film, Gauge } from 'lucide-react';
import { AppSettings, testProxyReachable, BACKGROUND_PRESETS, LIVE_WALLPAPERS, downloadExport, applyImport } from '@/lib/settings';
import { THEMES } from '@/lib/themes';
import { testWispReachable, DEFAULT_WISP_URL, clearCachedWispResult, resetController } from '@/lib/scramjet';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onChange: (s: AppSettings) => void;
  onApplyCloak: (title: string, favicon: string) => void;
}

const cloakPresets = [
  { name: 'Google Drive', title: 'My Drive - Google Drive', favicon: 'https://ssl.gstatic.com/docs/doclist/images/drive_2022q3_32dp.png' },
  { name: 'Google Docs', title: 'Untitled document - Google Docs', favicon: 'https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico' },
  { name: 'Google Classroom', title: 'Classes', favicon: 'https://ssl.gstatic.com/classroom/favicon.png' },
  { name: 'Canvas', title: 'Dashboard', favicon: 'https://du11hjcvx0uqb.cloudfront.net/dist/images/favicon-e10d657a73.ico' },
  { name: 'Clever', title: 'Clever | Portal', favicon: 'https://assets.clever.com/media/icons/favicon.ico' },
  { name: 'Schoology', title: 'Home | Schoology', favicon: 'https://app.schoology.com/sites/all/themes/flavor/favicon.ico' },
  { name: 'Khan Academy', title: 'Khan Academy', favicon: 'https://cdn.kastatic.org/images/favicon.ico' },
  { name: 'Gmail', title: 'Inbox - Gmail', favicon: 'https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico' },
];

type Tab = 'general' | 'proxy' | 'cloak' | 'panic' | 'theme';

const tabs: { id: Tab; label: string; icon: any }[] = [
  { id: 'general', label: 'General', icon: SettingsIcon },
  { id: 'proxy', label: 'Proxy', icon: Globe },
  { id: 'cloak', label: 'Cloak', icon: Shield },
  { id: 'panic', label: 'Panic', icon: KeyRound },
  { id: 'theme', label: 'Theme', icon: Palette },
];

const SettingsModal = ({ isOpen, onClose, settings, onChange, onApplyCloak }: Props) => {
  const [tab, setTab] = useState<Tab>('general');
  const [customTitle, setCustomTitle] = useState('');
  const [customFavicon, setCustomFavicon] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [wispTesting, setWispTesting] = useState(false);
  const [wispResult, setWispResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [importResult, setImportResult] = useState<{ ok: boolean; message: string } | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    onChange({ ...settings, [key]: value });

  const runProxyTest = async () => {
    setTesting(true);
    setTestResult(null);
    const r = await testProxyReachable(settings.proxyUrl);
    setTestResult(r);
    setTesting(false);
  };

  const runWispTest = async () => {
    setWispTesting(true);
    setWispResult(null);
    clearCachedWispResult();
    const url = settings.wispUrl?.trim() || DEFAULT_WISP_URL;
    const r = await testWispReachable(url, { useCache: false });
    setWispResult(r);
    setWispTesting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="glass-panel w-full max-w-2xl max-h-[90vh] flex flex-col relative z-10">
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <SettingsIcon className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Settings</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary/50 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Horizontal tab bar — works on mobile and desktop */}
        <nav className="flex gap-1 overflow-x-auto border-b border-border p-2 shrink-0">
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors shrink-0 ${
                  tab === t.id ? 'bg-primary/20 text-primary' : 'hover:bg-secondary/50 text-muted-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </nav>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {tab === 'general' && (
            <>
              <Field label="Where should links open?">
                <div className="grid grid-cols-2 gap-2">
                  <SegBtn active={!settings.openInNewTab} onClick={() => update('openInNewTab', false)}>
                    Open in page
                  </SegBtn>
                  <SegBtn active={settings.openInNewTab} onClick={() => update('openInNewTab', true)}>
                    New tab
                  </SegBtn>
                </div>
                <p className="text-xs text-muted-foreground">
                  "Open in page" loads inside an embedded browser tab. "New tab" pops out — always works, even without a proxy.
                </p>
              </Field>
              <Toggle label="Wrap popups in about:blank"
                hint="Extra stealth — only used when opening in a new tab."
                checked={settings.aboutBlankCloak} onChange={v => update('aboutBlankCloak', v)} />
              <Toggle label="Auto-apply cloak on load"
                checked={settings.autoCloakOnLoad} onChange={v => update('autoCloakOnLoad', v)} />
              <Toggle label="Animated star background"
                checked={settings.showParticles} onChange={v => update('showParticles', v)} />
              <Field label="Search engine">
                <select
                  value={settings.searchEngine}
                  onChange={e => update('searchEngine', e.target.value as any)}
                  className="w-full px-4 py-2 rounded-lg bg-input border border-border outline-none">
                  <option value="duckduckgo">DuckDuckGo</option>
                  <option value="google">Google</option>
                  <option value="bing">Bing</option>
                </select>
              </Field>

              <div className="border-t border-border pt-4 space-y-3">
                <Field label="Layout style" hint="Browser is the full dashboard. Hub is a minimal launcher.">
                  <div className="grid grid-cols-2 gap-2">
                    <SegBtn active={settings.layoutStyle === 'browser'} onClick={() => update('layoutStyle', 'browser')}>
                      Browser
                    </SegBtn>
                    <SegBtn active={settings.layoutStyle === 'hub'} onClick={() => update('layoutStyle', 'hub')}>
                      Hub
                    </SegBtn>
                  </div>
                </Field>
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                <Field label="Sync between devices" hint="Export your settings, bookmarks, pinned apps and history as a JSON file. Import it on any other device.">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => downloadExport()}
                      className="flex items-center justify-center gap-2 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90">
                      <Download className="w-4 h-4" /> Export
                    </button>
                    <button
                      onClick={() => importRef.current?.click()}
                      className="flex items-center justify-center gap-2 py-2 rounded-lg border border-border hover:border-primary/50">
                      <Upload className="w-4 h-4" /> Import
                    </button>
                    <input
                      ref={importRef}
                      type="file"
                      accept="application/json"
                      className="hidden"
                      onChange={async e => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        const txt = await f.text();
                        const r = applyImport(txt);
                        setImportResult(r);
                        if (r.ok) setTimeout(() => window.location.reload(), 800);
                        e.target.value = '';
                      }} />
                  </div>
                  {importResult && (
                    <div className={`flex items-start gap-2 p-3 rounded-lg text-sm mt-2 ${
                      importResult.ok ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
                    }`}>
                      {importResult.ok ? <Check className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
                      <span>{importResult.message}</span>
                    </div>
                  )}
                </Field>
              </div>
            </>
          )}


          {tab === 'proxy' && (
            <>
              <Toggle label="Use built-in Scramjet proxy"
                hint="Bundled in-app proxy via public Wisp server. No server setup needed."
                checked={settings.useScramjet} onChange={v => update('useScramjet', v)} />

              <Field label="Wisp relay URL" hint={`Override the WebSocket relay used by Scramjet. Leave blank for default (${DEFAULT_WISP_URL}).`}>
                <div className="flex gap-2">
                  <input type="text" value={settings.wispUrl}
                    onChange={e => { update('wispUrl', e.target.value); clearCachedWispResult(); resetController(); setWispResult(null); }}
                    placeholder={DEFAULT_WISP_URL}
                    className="flex-1 px-4 py-2 rounded-lg bg-input border border-border outline-none font-mono text-sm" />
                  <button
                    onClick={() => { update('wispUrl', ''); clearCachedWispResult(); resetController(); setWispResult(null); }}
                    className="px-3 py-2 rounded-lg border border-border hover:border-primary/50 text-sm">
                    Reset
                  </button>
                </div>
              </Field>

              <div className="space-y-2">
                <button
                  onClick={runWispTest}
                  disabled={wispTesting}
                  className="w-full py-2 rounded-lg bg-secondary text-secondary-foreground font-medium hover:bg-secondary/80 disabled:opacity-50 flex items-center justify-center gap-2">
                  {wispTesting ? <><Loader2 className="w-4 h-4 animate-spin" /> Testing Wisp relay…</> : 'Test Scramjet connection'}
                </button>
                {wispResult && (
                  <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                    wispResult.ok ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
                  }`}>
                    {wispResult.ok ? <Check className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
                    <span>{wispResult.message}</span>
                  </div>
                )}
              </div>

              <p className="text-sm text-muted-foreground pt-2">
                Or paste your own Render-hosted proxy URL (Scramjet / Ultraviolet) below. Used only when the built-in proxy is off.
              </p>
              <Field label="Proxy server URL" hint="e.g. https://snoopy-proxy.onrender.com">
                <input type="text" value={settings.proxyUrl}
                  onChange={e => { update('proxyUrl', e.target.value); setTestResult(null); }}
                  placeholder="https://your-proxy.onrender.com"
                  className="w-full px-4 py-2 rounded-lg bg-input border border-border outline-none" />
              </Field>
              <Field label="Proxy path prefix" hint="Default /service/ works for Scramjet & Ultraviolet">
                <input type="text" value={settings.proxyPrefix}
                  onChange={e => update('proxyPrefix', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-input border border-border outline-none" />
              </Field>
              <div className="space-y-2">
                <button
                  onClick={runProxyTest}
                  disabled={testing || !settings.proxyUrl}
                  className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
                  {testing ? <><Loader2 className="w-4 h-4 animate-spin" /> Testing…</> : 'Test connection'}
                </button>
                {testResult && (
                  <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                    testResult.ok ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
                  }`}>
                    {testResult.ok ? <Check className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>
            </>
          )}

          {tab === 'cloak' && (
            <>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Quick presets</h3>
                <div className="grid grid-cols-2 gap-2">
                  {cloakPresets.map(p => (
                    <button key={p.name}
                      onClick={() => onApplyCloak(p.title, p.favicon)}
                      className="glass-card !p-3 text-left hover:border-primary/50">
                      <span className="text-sm font-medium">{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="border-t border-border pt-4 space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Custom</h3>
                <input type="text" placeholder="Custom tab title" value={customTitle}
                  onChange={e => setCustomTitle(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-input border border-border outline-none" />
                <input type="text" placeholder="Favicon URL" value={customFavicon}
                  onChange={e => setCustomFavicon(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-input border border-border outline-none" />
                <div className="flex gap-2">
                  <button
                    onClick={() => onApplyCloak(customTitle || document.title, customFavicon)}
                    className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90">
                    Apply
                  </button>
                  <button
                    onClick={() => {
                      update('defaultCloakTitle', customTitle);
                      update('defaultCloakFavicon', customFavicon);
                    }}
                    className="flex-1 py-2 rounded-lg border border-border hover:border-primary/50">
                    Save as default
                  </button>
                </div>
              </div>
              <button
                onClick={() => onApplyCloak("Snoopy's Web", '/favicon.ico')}
                className="w-full py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground">
                Reset
              </button>
            </>
          )}

          {tab === 'panic' && (
            <>
              <p className="text-sm text-muted-foreground">
                Press the panic key anywhere to instantly redirect this tab to a safe URL.
              </p>
              <Field label="Panic key" hint="A single character or 'Escape'">
                <input type="text" maxLength={10} value={settings.panicKey}
                  onChange={e => update('panicKey', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-input border border-border outline-none" />
              </Field>
              <Field label="Redirect to">
                <input type="text" value={settings.panicUrl}
                  onChange={e => update('panicUrl', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-input border border-border outline-none" />
              </Field>
            </>
          )}

          {tab === 'theme' && (
            <>
              <Field label="Theme preset" hint="Click to apply instantly. Hover a tile to live-preview before committing.">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {THEMES.map(t => {
                    const active = settings.themeId === t.id;
                    return (
                      <button key={t.id}
                        onClick={() => update('themeId', t.id)}
                        onMouseEnter={() => {
                          // live preview: temporarily apply without persisting
                          import('@/lib/themes').then(m => m.applyTheme(t.id));
                        }}
                        onMouseLeave={() => {
                          import('@/lib/themes').then(m => m.applyTheme(settings.themeId));
                        }}
                        className={`relative p-3 rounded-lg text-left transition-all border-2 ${active ? 'border-primary shadow-[0_0_18px_hsl(var(--glow-primary)/0.35)]' : 'border-border hover:border-primary/40'}`}
                        style={{ background: `linear-gradient(135deg, ${t.swatches[0]}, ${t.swatches[1]})` }}>
                        <div className="flex gap-1 mb-2">
                          {t.swatches.map((c, i) => (
                            <span key={i} className="w-3 h-3 rounded-full border border-white/20" style={{ background: c }} />
                          ))}
                          {active && <Check className="w-3.5 h-3.5 text-white ml-auto" />}
                        </div>
                        <div className="text-sm font-semibold text-white">{t.name}</div>
                        <div className="text-[10px] text-white/70">{t.description}</div>
                      </button>
                    );
                  })}
                </div>
              </Field>

              <div className="border-t border-border pt-4 space-y-4">
                <Toggle label="Override theme accent"
                  hint="Use the custom accent hue below instead of the theme's default."
                  checked={settings.accentOverride} onChange={v => update('accentOverride', v)} />
                <Toggle label="Match accent to wallpaper"
                  hint="Pick the hue automatically from the background image."
                  checked={settings.autoAccentFromBg} onChange={v => update('autoAccentFromBg', v)} />
                <Field label={`Accent hue (${settings.accentHue}°)`}>
                  <input type="range" min={0} max={360} value={settings.accentHue}
                    onChange={e => update('accentHue', Number(e.target.value))}
                    className="w-full" />
                  <div className="h-3 rounded-full mt-2"
                    style={{ background: `linear-gradient(to right, hsl(0 80% 60%), hsl(60 80% 60%), hsl(120 80% 60%), hsl(180 80% 60%), hsl(240 80% 60%), hsl(300 80% 60%), hsl(360 80% 60%))` }} />
                  <div className="flex gap-2 flex-wrap mt-2">
                    {[200, 270, 320, 0, 30, 140, 180].map(h => (
                      <button key={h} onClick={() => update('accentHue', h)}
                        className="w-8 h-8 rounded-full border-2 border-border hover:border-primary"
                        style={{ background: `hsl(${h} 80% 60%)` }} />
                    ))}
                  </div>
                </Field>
              </div>

              <div className="border-t border-border pt-4 space-y-4">
                <Field label={`Surface transparency (${settings.glassOpacity}%)`} hint="Controls how see-through glass panels and cards are.">
                  <input type="range" min={10} max={100} value={settings.glassOpacity}
                    onChange={e => update('glassOpacity', Number(e.target.value))}
                    className="w-full" />
                </Field>
                <Toggle label="UI animations"
                  hint="Hover effects, transitions, and motion. Turn off for max performance."
                  checked={settings.uiAnimations} onChange={v => update('uiAnimations', v)} />
                <Toggle label="Animated star background"
                  checked={settings.showParticles} onChange={v => update('showParticles', v)} />
              </div>


              <div className="border-t border-border pt-4 space-y-3">
                <Field label="Background image">
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {BACKGROUND_PRESETS.map(b => (
                      <button key={b.name} onClick={() => update('backgroundImage', b.url)}
                        className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                          settings.backgroundImage === b.url ? 'border-primary' : 'border-border hover:border-primary/50'
                        }`}
                        style={b.url ? {
                          backgroundImage: `url(${b.url}&w=200)`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        } : undefined}>
                        {!b.url && (
                          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                            <ImageIcon className="w-4 h-4 mr-1" /> None
                          </div>
                        )}
                        <div className="absolute bottom-0 inset-x-0 bg-background/70 text-[10px] py-0.5 text-center">
                          {b.name}
                        </div>
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Live wallpapers" hint="Animated GIF backgrounds. May be heavier on slow devices.">
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {LIVE_WALLPAPERS.map(b => (
                      <button key={b.name} onClick={() => update('backgroundImage', b.url)}
                        className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                          settings.backgroundImage === b.url ? 'border-primary' : 'border-border hover:border-primary/50'
                        }`}
                        style={{
                          backgroundImage: `url(${b.url})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}>
                        <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-primary/80 text-[9px] font-mono text-primary-foreground flex items-center gap-1">
                          <Film className="w-2.5 h-2.5" /> GIF
                        </div>
                        <div className="absolute bottom-0 inset-x-0 bg-background/70 text-[10px] py-0.5 text-center">
                          {b.name}
                        </div>
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Custom background URL" hint="Any image, GIF, or animated URL works.">
                  <input type="text" value={settings.backgroundImage}
                    onChange={e => update('backgroundImage', e.target.value)}
                    placeholder="https://… (.jpg, .png, .gif)"
                    className="w-full px-4 py-2 rounded-lg bg-input border border-border outline-none" />
                </Field>

                <Field label={`Background dim (${settings.backgroundDim}%)`}>
                  <input type="range" min={0} max={95} value={settings.backgroundDim}
                    onChange={e => update('backgroundDim', Number(e.target.value))}
                    className="w-full" />
                </Field>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const Toggle = ({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <label className="flex items-start justify-between gap-4 cursor-pointer">
    <div className="flex-1">
      <div className="text-sm font-medium">{label}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 flex items-center ${checked ? 'bg-primary' : 'bg-secondary'}`}>
      <span className={`block w-5 h-5 rounded-full bg-foreground shadow-md transition-transform duration-200 ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
    </button>
  </label>
);

const SegBtn = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button onClick={onClick}
    className={`py-2 rounded-lg text-sm font-medium transition-colors ${
      active ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 hover:bg-secondary text-foreground'
    }`}>
    {children}
  </button>
);

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <div className="text-sm font-medium">{label}</div>
    {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    {children}
  </div>
);

export default SettingsModal;
