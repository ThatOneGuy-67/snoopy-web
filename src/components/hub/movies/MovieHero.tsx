import { Play, Plus, Check, Info } from 'lucide-react';
import type { MediaItem } from '@/lib/movies';

interface Props {
  item: MediaItem;
  inList: boolean;
  onPlay: (item: MediaItem) => void;
  onToggleList: (id: string) => void;
}

const MovieHero = ({ item, inList, onPlay, onToggleList }: Props) => {
  const meta =
    item.type === 'show' ? `Series · ${item.episodes.length} episodes` : 'Feature film · HD';

  return (
    <section className="relative rounded-2xl overflow-hidden glass-panel mb-8">
      {/* backdrop */}
      <div className="absolute inset-0">
        <img
          src={item.poster}
          alt=""
          aria-hidden
          className="w-full h-full object-cover scale-110 blur-2xl opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      <div className="relative flex flex-col sm:flex-row items-center gap-5 sm:gap-8 p-5 sm:p-8 md:p-10">
        <img
          src={item.poster}
          alt={`${item.title} poster`}
          className="w-32 sm:w-40 md:w-48 aspect-[2/3] object-cover rounded-xl shrink-0"
          style={{ boxShadow: '0 18px 50px hsl(220 15% 4% / 0.7), 0 0 40px hsl(var(--glow-primary) / 0.18)' }}
        />

        <div className="min-w-0 text-center sm:text-left">
          <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-primary mb-2">
            // featured
          </p>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight glow-text mb-2 line-clamp-2">
            {item.title}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mb-5">{meta}</p>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
            <button
              onClick={() => onPlay(item)}
              className="flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold transition hover:brightness-110"
              style={{ boxShadow: '0 0 26px hsl(var(--glow-primary) / 0.35)' }}
            >
              <Play className="w-4 h-4 fill-current" /> Play
            </button>
            <button
              onClick={() => onToggleList(item.id)}
              className="flex items-center gap-2 rounded-full glass-panel px-5 py-2.5 text-sm font-medium hover:border-primary/50 transition"
            >
              {inList ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {inList ? 'In My List' : 'My List'}
            </button>
            <span className="hidden md:flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground px-2">
              <Info className="w-3 h-3" /> streams in-page
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MovieHero;
