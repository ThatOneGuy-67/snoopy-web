import { LucideIcon } from 'lucide-react';
import GlassCard from './GlassCard';

interface AppCardProps {
  name: string;
  icon: LucideIcon;
  color: string;
  onClick: () => void;
}

const AppCard = ({ name, icon: Icon, color, onClick }: AppCardProps) => {
  return (
    <GlassCard onClick={onClick} className="flex flex-col items-center justify-center gap-3 aspect-square">
      <div
        className="p-4 rounded-2xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
        style={{
          background: `linear-gradient(135deg, ${color}30, ${color}10)`,
          boxShadow: `0 0 24px ${color}25, inset 0 1px 0 ${color}30`,
        }}
      >
        <Icon className="w-8 h-8" style={{ color, filter: `drop-shadow(0 0 6px ${color}80)` }} />
      </div>
      <span className="text-sm font-medium text-foreground/90">{name}</span>
    </GlassCard>
  );
};

export default AppCard;
