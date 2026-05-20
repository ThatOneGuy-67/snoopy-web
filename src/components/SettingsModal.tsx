import { useState } from 'react';
import { Settings as SettingsIcon, X, Shield, Globe, Zap, Palette, KeyRound } from 'lucide-react';
import { AppSettings } from '@/lib/settings';

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

  if (!isOpen) return null;

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    onChange({ ...settings, [key]: value });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="glass-panel w-full max-w-2xl max-h-[85vh] flex flex-col relative z-10">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <SettingsIcon className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Settings</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary/50 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <nav className="w-40 border-r border-border p-2 space-y-1 shrink-0">
            {tabs.map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    tab === t.id ? 'bg-primary/20 text-primary' : 'hover:bg-secondary/50 text-muted-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </button>
              );
            })}
          </nav>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {tab === 'general' && (
              <>
                <Toggle label="Open links in new tab (recommended)"
                  hint="Most sites block being loaded inside an iframe. New tab always works."
                  checked={settings.openInNewTab} onChange={v => update('openInNewTab', v)} />
                <Toggle label="Open in about:blank window"
                  hint="Wraps the popup in a blank-titled tab — extra stealth."
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
              </>
            )}

            {tab === 'proxy' && (
              <>
                <p className="text-sm text-muted-foreground">
                  To load sites inside the in-app browser tabs, run a proxy server (Scramjet / Ultraviolet) and paste its URL here.
                  Without one, links open in a real tab.
                </p>
                <Field label="Proxy server URL" hint="e.g. https://snoopy-proxy.onrender.com">
                  <input type="text" value={settings.proxyUrl}
                    onChange={e => update('proxyUrl', e.target.value)}
                    placeholder="https://your-proxy.onrender.com"
                    className="w-full px-4 py-2 rounded-lg bg-input border border-border outline-none" />
                </Field>
                <Field label="Proxy path prefix" hint="Default /service/ works for Scramjet & Ultraviolet">
                  <input type="text" value={settings.proxyPrefix}
                    onChange={e => update('proxyPrefix', e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-input border border-border outline-none" />
                </Field>
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
                <Field label={`Accent hue (${settings.accentHue}°)`}>
                  <input type="range" min={0} max={360} value={settings.accentHue}
                    onChange={e => update('accentHue', Number(e.target.value))}
                    className="w-full" />
                  <div className="h-3 rounded-full mt-2"
                    style={{ background: `linear-gradient(to right, hsl(0 80% 60%), hsl(60 80% 60%), hsl(120 80% 60%), hsl(180 80% 60%), hsl(240 80% 60%), hsl(300 80% 60%), hsl(360 80% 60%))` }} />
                </Field>
                <div className="flex gap-2 flex-wrap">
                  {[200, 270, 320, 0, 30, 140, 180].map(h => (
                    <button key={h} onClick={() => update('accentHue', h)}
                      className="w-10 h-10 rounded-full border-2 border-border hover:border-primary"
                      style={{ background: `hsl(${h} 80% 60%)` }} />
                  ))}
                </div>
              </>
            )}
          </div>
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
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-primary' : 'bg-secondary'}`}>
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-foreground transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  </label>
);

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <div className="text-sm font-medium">{label}</div>
    {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    {children}
  </div>
);

export default SettingsModal;
