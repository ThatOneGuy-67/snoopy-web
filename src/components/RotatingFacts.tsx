import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

const FACTS = [
  'Tip: press Esc or your panic key to bail instantly.',
  'Did you know? Octopuses have three hearts and blue blood.',
  'Pro move: open the same site twice — one cloaked tab, one real.',
  'Honey never spoils. Archaeologists found 3,000-year-old jars still edible.',
  'Tip: change your tab title in Settings → Cloak to blend in.',
  'A day on Venus is longer than a year on Venus.',
  'Bananas are berries. Strawberries are not.',
  "Shortcut: hit / to jump straight into the search bar.",
  'There are more possible chess games than atoms in the observable universe.',
  'Tip: pin Snoopy to your bookmarks bar with a boring name like "Docs".',
  'Sharks existed before trees did.',
  'Wombat poop is cube-shaped. No one fully knows why.',
  "The Eiffel Tower can be 15 cm taller in summer due to heat expansion.",
  'Tip: middle-click a card to open it in a real new tab.',
  'A group of flamingos is called a "flamboyance".',
];

const RotatingFacts = () => {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * FACTS.length));
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setIdx(i => (i + 1) % FACTS.length);
        setFading(false);
      }, 350);
    }, 6000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="max-w-2xl mx-auto mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground min-h-[1.5rem]">
      <Sparkles className="w-4 h-4 text-primary shrink-0" />
      <span
        className={`font-mono transition-opacity duration-300 ${fading ? 'opacity-0' : 'opacity-100'}`}
      >
        {FACTS[idx]}
      </span>
    </div>
  );
};

export default RotatingFacts;
