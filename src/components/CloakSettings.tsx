import { useState } from 'react';
import { Shield, X, ExternalLink } from 'lucide-react';
import { openAboutBlank } from '@/lib/settings';

interface CloakSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (title: string, favicon: string) => void;
}

const presets = [
  { name: 'Google Drive',     title: 'My Drive - Google Drive',       favicon: 'https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png' },
  { name: 'Google Docs',      title: 'Untitled document - Google Docs', favicon: 'https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico' },
  { name: 'Google Classroom', title: 'Classes',                        favicon: 'https://ssl.gstatic.com/classroom/favicon.png' },
  { name: 'Gmail',            title: 'Inbox - Gmail',                  favicon: 'https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico' },
  { name: 'Canvas',           title: 'Dashboard',                      favicon: 'https://du11hjcvx0uqb.cloudfront.net/dist/images/favicon-e10d657a73.ico' },
  { name: 'Clever',           title: 'Clever | Portal',                favicon: 'https://assets.clever.com/media/icons/favicon.ico' },
  { name: 'Schoology',        title: 'Home | Schoology',               favicon: 'https://app.schoology.com/sites/all/themes/flavor/favicon.ico' },
  { name: 'Khan Academy',     title: 'Khan Academy',                   favicon: 'https://cdn.kastatic.org/images/favicon.ico' },
];

const CloakSettings = ({ isOpen, onClose, onApply }: CloakSettingsProps) => {
  const [customTitle, setCustomTitle] = useState('');
  const [customFavicon, setCustomFavicon] = useState('');

  if (!isOpen) return null;

  const handlePreset = (title: string, favicon: string) => {
    onApply(title, favicon);
    onClose();
  };

  const handleCustomApply = () => {
    if (customTitle || customFavicon) {
      onApply(customTitle || document.title, customFavicon);
      onClose();
    }
  };

  const launchAboutBlank = () => {
    openAboutBlank(window.location.href);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="glass-panel p-6 w-full max-w-md relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Tab Cloaking</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary/50 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Presets</h3>
            <div className="grid grid-cols-2 gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handlePreset(preset.title, preset.favicon)}
                  className="glass-card p-2.5 text-left hover:border-primary/50 flex items-center gap-2"
                >
                  <img
                    src={preset.favicon}
                    alt=""
                    className="w-4 h-4 shrink-0 rounded-sm"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
                  />
                  <span className="text-sm font-medium truncate">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">About:Blank</h3>
            <button
              onClick={launchAboutBlank}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-primary/15 border border-primary/40 text-primary hover:bg-primary/25 transition-colors text-sm font-medium"
            >
              <ExternalLink className="w-4 h-4" />
              Launch inside about:blank
            </button>
            <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
              Opens TOG's Web in a new tab whose address is <code className="font-mono">about:blank</code>,
              hiding it from history and referrer sniffers.
            </p>
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Custom</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Custom tab title"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none transition-colors"
              />
              <input
                type="text"
                placeholder="Favicon URL"
                value={customFavicon}
                onChange={(e) => setCustomFavicon(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none transition-colors"
              />
              <button
                onClick={handleCustomApply}
                className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
              >
                Apply Custom Cloak
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              document.title = "TOG's Web";
              const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
              if (link) link.href = '/favicon.ico';
              onClose();
            }}
            className="w-full py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
          >
            Reset to Default
          </button>
        </div>
      </div>
    </div>
  );
};

export default CloakSettings;
