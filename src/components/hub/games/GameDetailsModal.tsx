import { useEffect } from 'react';
import { X, Play, Star, Tag } from 'lucide-react';
import { GameCover } from './GameCard';
import type { Game } from '@/lib/games';

interface Props {
  game: Game;
  favorite: boolean;
  onToggleFavorite: (id: string) => void;
  onPlay: (game: Game) => void;
  onClose: () => void;
}

const GameDetailsModal = ({ game, favorite, onToggleFavorite, onPlay, onClose }: Props) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-background/70 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={`${game.t} details`}
      onClick={onClose}
    >
      <div
        className="glass-panel hover-glow group w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative w-full aspect-[16/9] overflow-hidden rounded-t-2xl">
          <GameCover game={game} large />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="absolute top-3 right-3 p-2 rounded-lg bg-background/60 border border-border/60 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 flex flex-col gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold glow-text tracking-tight break-words">{game.t}</h2>
            <p className="text-xs font-mono text-muted-foreground mt-1">// {game.category.toLowerCase()}</p>
          </div>

          <p className="text-sm text-foreground/80 leading-relaxed">{game.description}</p>

          <div className="flex flex-wrap gap-2">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-mono border border-primary/50 text-primary bg-primary/10">
              {game.category}
            </span>
            {game.tags.slice(1).map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono text-muted-foreground border border-border/60 bg-foreground/5"
              >
                <Tag className="w-3 h-3" />
                {tag}
              </span>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              type="button"
              onClick={() => onPlay(game)}
              className="flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-mono border border-primary/50 text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
            >
              <Play className="w-4 h-4" /> play now
            </button>
            <button
              type="button"
              onClick={() => onToggleFavorite(game.id)}
              aria-pressed={favorite}
              className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl text-sm font-mono border border-border/60 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Star className={`w-4 h-4 ${favorite ? 'fill-primary text-primary' : ''}`} />
              {favorite ? 'favorited' : 'favorite'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameDetailsModal;
