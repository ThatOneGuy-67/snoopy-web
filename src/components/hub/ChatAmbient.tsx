import { useMemo } from 'react';

/**
 * Scoped ambient background for the Chat page: the same subtle animated stars,
 * noise texture and soft glow accents used on the proxy screens.
 */
const ChatAmbient = ({ stars = 40 }: { stars?: number }) => {
  const dots = useMemo(
    () =>
      Array.from({ length: stars }, (_, id) => ({
        id,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        duration: `${2 + Math.random() * 4}s`,
        delay: `${Math.random() * 4}s`,
        opacity: 0.2 + Math.random() * 0.5,
      })),
    [stars],
  );

  return (
    <div className="chat-ambient" aria-hidden="true">
      {dots.map((d) => (
        <span
          key={d.id}
          className="chat-star"
          style={
            {
              left: d.left,
              top: d.top,
              '--duration': d.duration,
              '--delay': d.delay,
              '--opacity': d.opacity,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
};

export default ChatAmbient;
