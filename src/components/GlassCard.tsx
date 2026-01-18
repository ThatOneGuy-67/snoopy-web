import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}

const GlassCard = ({ children, onClick, className = '' }: GlassCardProps) => {
  return (
    <div 
      className={`glass-card ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default GlassCard;
