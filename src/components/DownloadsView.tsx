import { useMemo } from 'react';
import { Download, ExternalLink, FileText, Image as ImageIcon, Film, Music, Archive, FileCode } from 'lucide-react';
import { HistoryEntry } from '@/lib/browserData';

const EXT_RE = /\.(pdf|docx?|xlsx?|pptx?|zip|rar|7z|tar|gz|mp4|mov|webm|mkv|avi|mp3|wav|flac|ogg|png|jpe?g|gif|webp|svg|json|csv|txt|md|exe|dmg|apk|iso)(\?|#|$)/i;

const iconFor = (url: string) => {
  const m = url.match(EXT_RE);
  const ext = (m?.[1] || '').toLowerCase();
  if (/(png|jpe?g|gif|webp|svg)/.test(ext)) return ImageIcon;
  if (/(mp4|mov|webm|mkv|avi)/.test(ext))    return Film;
  if (/(mp3|wav|flac|ogg)/.test(ext))        return Music;
  if (/(zip|rar|7z|tar|gz)/.test(ext))       return Archive;
  if (/(json|csv|md|txt)/.test(ext))         return FileCode;
  return FileText;
};

interface Props {
  history: HistoryEntry[];
  onOpen: (url: string, title?: string) => void;
}

const DownloadsView = ({ history, onOpen }: Props) => {
  const files = useMemo(
    () => history.filter(h => EXT_RE.test(h.url)).slice(0, 100),
    [history]
  );

  return (
    <div className="max-w-3xl mx-auto py-6">
      <header className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Download className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-semibold">Downloads</h1>
        </div>
        <span className="text-xs text-muted-foreground font-mono">{files.length} file{files.length === 1 ? '' : 's'}</span>
      </header>

      {files.length === 0 ? (
        <div className="glass-panel p-8 text-center">
          <Download className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-sm text-muted-foreground">No downloads detected.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Files you visit (PDFs, videos, archives, images) will appear here automatically.
          </p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {files.map((f, i) => {
            const Icon = iconFor(f.url);
            const ext = (f.url.match(EXT_RE)?.[1] || '').toUpperCase();
            return (
              <li key={i} className="glass-panel !rounded-lg flex items-center gap-3 p-2.5 hover:border-primary/40 transition-all">
                <div className="p-2 rounded-md bg-primary/10 text-primary shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <button onClick={() => onOpen(f.url, f.title)} className="flex-1 text-left min-w-0">
                  <div className="text-sm truncate">{f.title || f.url}</div>
                  <div className="text-[10px] text-muted-foreground truncate font-mono">{f.url}</div>
                </button>
                <span className="text-[10px] font-mono text-muted-foreground px-1.5 py-0.5 rounded bg-secondary/40 border border-border/40">{ext}</span>
                <a href={f.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded text-muted-foreground hover:text-primary" title="Open direct">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default DownloadsView;
