import { useEffect, useState } from 'react';

interface TypewriterProps {
  text: string;
  speed?: number;
  className?: string;
  startDelay?: number;
}

const Typewriter = ({ text, speed = 90, className = '', startDelay = 200 }: TypewriterProps) => {
  const [shown, setShown] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setShown('');
    setDone(false);
    let i = 0;
    let interval: ReturnType<typeof setInterval>;
    const startTimer = setTimeout(() => {
      interval = setInterval(() => {
        i++;
        setShown(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, speed);
    }, startDelay);
    return () => {
      clearTimeout(startTimer);
      if (interval!) clearInterval(interval);
    };
  }, [text, speed, startDelay]);

  return (
    <span className={className} aria-label={text}>
      {shown}
      <span
        className={`inline-block w-[0.55ch] -mb-1 ml-1 bg-primary ${done ? 'animate-pulse' : ''}`}
        style={{ height: '0.9em' }}
      />
    </span>
  );
};

export default Typewriter;
