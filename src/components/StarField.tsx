import { useEffect, useState } from 'react';

interface Star {
  id: number;
  left: string;
  top: string;
  duration: string;
  delay: string;
  opacity: number;
}

const StarField = () => {
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    const generateStars = () => {
      const newStars: Star[] = [];
      for (let i = 0; i < 100; i++) {
        newStars.push({
          id: i,
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          duration: `${2 + Math.random() * 4}s`,
          delay: `${Math.random() * 4}s`,
          opacity: 0.3 + Math.random() * 0.7,
        });
      }
      setStars(newStars);
    };

    generateStars();
  }, []);

  return (
    <div className="stars-container">
      {stars.map((star) => (
        <div
          key={star.id}
          className="star"
          style={{
            left: star.left,
            top: star.top,
            '--duration': star.duration,
            '--delay': star.delay,
            '--opacity': star.opacity,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
};

export default StarField;
