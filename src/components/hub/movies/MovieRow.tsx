import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MovieCard from './MovieCard';
import type { MediaItem } from '@/lib/movies';

interface Props {
  title: string;
  items: MediaItem[];
  myList: string[];
  onPlay: (item: MediaItem) => void;
  onToggleList: (id: string) => void;
}

const MovieRow = ({ title, items, myList, onPlay, onToggleList }: Props) => {
  const scroller = useRef<HTMLDivElement>(null);

  const nudge = (dir: -1 | 1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(320, el.clientWidth * 0.8), behavior: 'smooth' });
  };

  if (!items.length) return null;

  return (
    <section className="group/row relative">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground/90">{title}</h2>
        <div className="hidden md:flex gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
          <button
            aria-label={`Scroll ${title} left`}
            onClick={() => nudge(-1)}
            className="grid place-items-center w-8 h-8 rounded-full glass-panel hover:border-primary/50 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            aria-label={`Scroll ${title} right`}
            onClick={() => nudge(1)}
            className="grid place-items-center w-8 h-8 rounded-full glass-panel hover:border-primary/50 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={scroller}
        className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 pt-1 -mx-1 px-1 snap-x scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => (
          <div key={item.id} className="snap-start">
            <MovieCard
              item={item}
              inList={myList.includes(item.id)}
              onPlay={onPlay}
              onToggleList={onToggleList}
            />
          </div>
        ))}
      </div>
    </section>
  );
};

export default MovieRow;
