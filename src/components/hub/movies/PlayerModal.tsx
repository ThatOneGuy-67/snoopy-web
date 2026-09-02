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

  const src =
    item.type === 'movie'
      ? item.link
      : item.episodes[epIndex]?.link;

  useEffect(() => {
    pushRecent(item.id, item.type === 'show' ? epIndex : undefined);
  }, [item, epIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKey);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-hidden p-0 sm:p-6 animate-fade-in">
      <div
        className="absolute inset-0 bg-background/85 backdrop-blur-xl"
        onClick={onClose}
      />

      <div className="relative flex h-full w-full flex-col overflow-hidden glass-panel sm:h-[calc(100dvh-3rem)] sm:max-h-[calc(100dvh-3rem)] sm:max-w-6xl sm:rounded-2xl">
        <div className="flex shrink-0 items-center gap-3 border-b border-border/60 px-4 py-3">
          <h2 className="min-w-0 flex-1 truncate text-sm font-semibold sm:text-base">
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
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg glass-panel hover:border-primary/50 md:hidden"
            >
              <ListVideo className="h-4 w-4" />
            </button>
          )}

          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            aria-label="Open in new tab"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg glass-panel hover:border-primary/50"
          >
            <Maximize2 className="h-4 w-4" />
          </a>

          <button
            onClick={onClose}
            aria-label="Close player"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg glass-panel hover:border-primary/50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col md:flex-row">
          <div className="relative min-h-0 min-w-0 flex-1 bg-black">
            {src ? (
              <iframe
                key={src}
                src={src}
                title={item.title}
                allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full border-0"
              />
            ) : (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">
                No source available.
              </div>
            )}
          </div>

          {item.type === 'show' && (
            <aside
              className={`
                ${showList ? 'flex' : 'hidden'} md:flex
                h-[40vh] max-h-[40vh] w-full shrink-0
                flex-col overflow-hidden
                border-t border-border/60
                md:h-full md:max-h-none md:w-64 md:border-l md:border-t-0
              `}
            >
              <p className="sticky top-0 z-10 shrink-0 border-b border-border/40 bg-background/90 px-3 py-3 text-[11px] font-mono uppercase tracking-wide text-muted-foreground backdrop-blur">
                {item.episodes.length} episodes
              </p>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <ul className="p-2 space-y-1">
                  {item.episodes.map((ep, i) => (
                    <li key={ep.name + i}>
                      <button
                        onClick={() => {
                          setEpIndex(i);
                          setShowList(false);
                        }}
                        className={`
                          flex w-full items-center gap-2 rounded-lg
                          border px-2.5 py-2 text-left text-xs transition
                          ${
                            i === epIndex
                              ? 'border-primary/30 bg-primary/15 text-primary'
                              : 'border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                          }
                        `}
                      >
                        <Play className="h-3 w-3 shrink-0" />
                        <span className="min-w-0 truncate">{ep.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerModal;
