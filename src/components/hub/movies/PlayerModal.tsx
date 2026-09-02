import { useEffect, useState } from 'react';
import { X, Play, Maximize2, ListVideo } from 'lucide-react';
import type { MediaItem } from '@/lib/movies';
import { pushRecent } from '@/lib/movies';

interface Props {
  item: MediaItem;
  startEpisode?: number;
  onClose: () => void;
}

const PlayerModal = ({ item, startEpisode = 0, onClose }: Props) => {
  const [epIndex, setEpIndex] = useState(startEpisode);
  const [showList, setShowList] = useState(false);

  const src = item.type === 'movie' ? item.link : item.episodes[epIndex]?.link;

  useEffect(() => {
    pushRecent(item.id, item.type === 'show' ? epIndex : undefined);
  }, [item, epIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-0 sm:p-6 animate-fade-in">
      <div className="absolute inset-0 bg-background/85 backdrop-blur-xl" onClick={onClose} />

      <div className="relative w-full h-full sm:h-auto sm:max-w-6xl glass-panel sm:rounded-2xl overflow-hidden flex flex-col">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60">
          <h2 className="flex-1 min-w-0 truncate text-sm sm:text-base font-semibold">
            {item.title}
            {item.type === 'show' && (
              <span className="ml-2 text-xs font-mono text-muted-foreground">
                {item.episodes[epIndex]?.name}
              </span>
            )}
          </h2>
          {item.type === 'show' && (
            <button
              onClick={() => setShowList((v) => !v)}
              aria-label="Toggle episode list"
              className="md:hidden grid place-items-center w-8 h-8 rounded-lg glass-panel hover:border-primary/50"
            >
              <ListVideo className="w-4 h-4" />
            </button>
          )}
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            aria-label="Open in new tab"
            className="grid place-items-center w-8 h-8 rounded-lg glass-panel hover:border-primary/50"
          >
            <Maximize2 className="w-4 h-4" />
          </a>
          <button
            onClick={onClose}
            aria-label="Close player"
            className="grid place-items-center w-8 h-8 rounded-lg glass-panel hover:border-primary/50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          <div className="flex-1 bg-black">
            {src ? (
              <iframe
                key={src}
                src={src}
                title={item.title}
                allow="autoplay; encrypted-media; fullscreen"
                allowFullScreen
                className="w-full h-full min-h-[45vh] sm:aspect-video sm:h-auto"
              />
            ) : (
              <div className="grid place-items-center h-full text-sm text-muted-foreground">
                No source available.
              </div>
            )}
          </div>

          {item.type === 'show' && (
            <aside
              className={`${showList ? 'block' : 'hidden'} md:block w-full md:w-64 shrink-0 border-l border-border/60 overflow-y-auto max-h-[45vh] md:max-h-none`}
            >
              <p className="px-3 py-2 text-[11px] font-mono uppercase tracking-wide text-muted-foreground sticky top-0 bg-background/80 backdrop-blur">
                {item.episodes.length} episodes
              </p>
              <ul className="p-2 space-y-1">
                {item.episodes.map((ep, i) => (
                  <li key={ep.name + i}>
                    <button
                      onClick={() => {
                        setEpIndex(i);
                        setShowList(false);
                      }}
                      className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-left transition
                        ${i === epIndex
                          ? 'bg-primary/15 text-primary border border-primary/30'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent'}`}
                    >
                      <Play className="w-3 h-3 shrink-0" />
                      <span className="truncate">{ep.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerModal;
