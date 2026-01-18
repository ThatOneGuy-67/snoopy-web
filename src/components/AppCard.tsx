import GlassCard from './GlassCard';

interface AppCardProps {
  name: string;
  icon: string;
  color: string;
  onClick: () => void;
}

const AppCard = ({ name, icon, color, onClick }: AppCardProps) => {
  return (
    <GlassCard onClick={onClick} className="flex flex-col items-center justify-center gap-3 aspect-square">
      <div 
        className="text-4xl p-4 rounded-2xl transition-transform duration-300 group-hover:scale-110"
        style={{ 
          background: `linear-gradient(135deg, ${color}30, ${color}10)`,
          boxShadow: `0 0 20px ${color}20`
        }}
      >
        {icon}
      </div>
      <span className="text-sm font-medium text-foreground/90">{name}</span>
    </GlassCard>
  );
};

export default AppCard;
