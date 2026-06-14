import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

const FACTS = [
  'Press Esc to bail fast.',
  'Octopuses have three hearts.',
  'Honey never spoils.',
  'Sharks are older than trees.',
  'Hit / to focus search.',
  'Bananas are berries.',
  'Wombat poop is cube-shaped.',
  'A day on Venus > a year on Venus.',
  'Cloak your tab in Settings.',
  'Flamingos = a "flamboyance".',
  'Pin Snoopy as "Docs".',
  'More chess games than atoms in the universe.',
];

const TYPE_SPEED = 45;
const ERASE_SPEED = 25;
const HOLD = 2200;

const RotatingFacts = () => {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * FACTS.length));
  const [shown, setShown] = useState('');
  const [phase, setPhase] = useState<'typing' | 'holding' | 'erasing'>('typing');

  useEffect(() => {
    const fact = FACTS[idx];
    let t: ReturnType<typeof setTimeout>;
    if (phase === 'typing') {
      if (shown.length < fact.length) {
        t = setTimeout(() => setShown(fact.slice(0, shown.length + 1)), TYPE_SPEED);
      } else {
        t = setTimeout(() => setPhase('holding'), 0);
      }
    } else if (phase === 'holding') {
      t = setTimeout(() => setPhase('erasing'), HOLD);
    } else {
      if (shown.length > 0) {
        t = setTimeout(() => setShown(fact.slice(0, shown.length - 1)), ERASE_SPEED);
      } else {
        setIdx(i => (i + 1) % FACTS.length);
        setPhase('typing');
      }
    }
    return () => clearTimeout(t);
  }, [shown, phase, idx]);

  return (
    <div className="max-w-2xl mx-auto mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground min-h-[1.5rem]">
      <Sparkles className="w-4 h-4 text-primary shrink-0" />
      <span className="font-mono">
        {shown}
        <span className="inline-block w-[0.5ch] h-[0.9em] -mb-0.5 ml-0.5 bg-primary animate-pulse" />
      </span>
    </div>
  );
};

export default RotatingFacts;
