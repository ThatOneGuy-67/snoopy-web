import { memo } from 'react';
import { Star, Play } from 'lucide-react';
import type { Game } from '@/lib/games';

interface Props {
  game: Game;
  favorite: boolean;
  onToggleFavorite: (id: string) => void;
  onPlay: (game: Game) => void;
}

const GameCard = ({ game, favorite, onToggleFavorite, onPlay }: Props) => {
  return (
    <article className="glass-panel hover-glow group flex flex-col overflow-hidden">
      <button
        type="button"
        onClick={() => onPlay(game)}
        aria-label={`Play ${game.t}`}
        className="relative block w-full aspect-[16/10] overflow-hidden"
        style={{
          background: `linear-gradient(135deg, hsl(${game.hue} 70% 22%) 0%, hsl(${(game.hue + 55) % 360} 65% 12%) 100%)`,
        }}
      >
        <span
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              'linear-gradient(hsl(220 10% 95% / .6) 1px, transparent 1px), linear-gradient(90deg, hsl(220 10% 95% / .6) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        />
        <span
          className="absolute -right-6 -top-8 w-28 h-28 rounded-full blur-xl opacity-60 transition-transform duration-500 group-hover:scale-125"
          style={{ background: `hsl(${(game.hue + 30) % 360} 85% 55% / 0.45)` }}
        />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl font-black tracking-tight text-foreground/85 drop-shadow-lg">
            {game.initials}
          </span>
        </span>
        <span className="absolute inset-0 flex items-center justify-center bg-background/55 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono text-primary border border-primary/40 bg-background/60">
            <Play className="w-3.5 h-3.5" /> play
          </span>
        </span>
      </button>

      <div className="p-3 flex flex-col gap-2 flex-1">
        <div className="flex items-start gap-2">
          <h3 className="text-sm font-semibold leading-snug line-clamp-2 flex-1" title={game.t}>
            {game.t}
          </h3>
          <button
            type="button"
            onClick={() => onToggleFavorite(game.id)}
            aria-label={favorite ? `Unfavorite ${game.t}` : `Favorite ${game.t}`}
            aria-pressed={favorite}
            className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-primary transition-colors"
          >
            <Star className={`w-4 h-4 ${favorite ? 'fill-primary text-primary' : ''}`} />
          </button>
        </div>
        <div className="mt-auto flex items-center justify-between">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wide text-muted-foreground border border-border/60 bg-foreground/5">
            {game.category}
          </span>
        </div>
      </div>
    </article>
  );
};

export default memo(GameCard);
