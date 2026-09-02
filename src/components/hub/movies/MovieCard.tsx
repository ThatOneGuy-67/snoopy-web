import { useState } from 'react';
import { Play, Plus, Check, Layers } from 'lucide-react';
import type { MediaItem } from '@/lib/movies';

interface Props {
  item: MediaItem;
  inList: boolean;
  onPlay: (item: MediaItem) => void;
  onToggleList: (id: string) => void;
}

const MovieCard = ({ item, inList, onPlay, onToggleList }: Props) => {
  const [failed, setFailed] = useState(false);

  return (
    <button
      onClick={() => onPlay(item)}
      aria-label={`Play ${item.title}`}
      className="group relative shrink-0 w-[136px] sm:w-[168px] text-left focus:outline-none"
    >
      <div
        className="relative aspect-[2/3] rounded-xl overflow-hidden glass-panel transition-all duration-300 ease-out
                   group-hover:scale-[1.06] group-hover:-translate-y-1 group-focus-visible:scale-[1.06]"
        style={{ boxShadow: '0 8px 24px hsl(220 15% 4% / 0.55)' }}
      >
        {!failed ? (
          <img
            src={item.poster}
            alt={`${item.title} poster`}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-3 text-center bg-gradient-to-br from-primary/20 to-transparent">
            <span className="text-xs font-semibold text-foreground/80">{item.title}</span>
          </div>
        )}

        {/* hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute inset-x-0 bottom-0 p-2.5 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold px-2.5 py-1">
              <Play className="w-3 h-3 fill-current" /> Play
            </span>
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                onToggleList(item.id);
              }}
              className="grid place-items-center w-6 h-6 rounded-full border border-border/70 bg-background/70 backdrop-blur text-foreground/80 hover:text-primary hover:border-primary/50 transition"
            >
              {inList ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            </span>
          </div>
        </div>

        {item.type === 'show' && (
          <span className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-md bg-background/75 backdrop-blur px-1.5 py-0.5 text-[10px] font-mono text-foreground/80">
            <Layers className="w-2.5 h-2.5" /> {item.episodes.length}
          </span>
        )}

        <div
          className="pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ boxShadow: '0 0 0 1px hsl(var(--glow-primary) / 0.5), 0 0 28px hsl(var(--glow-primary) / 0.22)' }}
        />
      </div>

      <p className="mt-2 px-0.5 text-xs font-medium text-foreground/85 line-clamp-2 group-hover:text-primary transition-colors">
        {item.title}
      </p>
    </button>
  );
};

export default MovieCard;
