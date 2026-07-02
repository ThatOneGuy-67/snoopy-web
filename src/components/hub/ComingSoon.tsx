import { Construction, type LucideIcon } from 'lucide-react';

interface Props {
  title: string;
  description?: string;
  icon?: LucideIcon;
}

const ComingSoon = ({ title, description, icon: Icon = Construction }: Props) => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center animate-fade-in">
      <div
        className="p-5 rounded-3xl mb-6"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--primary) / 0.25), hsl(var(--primary) / 0.05))',
          boxShadow: '0 0 40px hsl(var(--glow-primary) / 0.25), inset 0 1px 0 hsl(var(--primary) / 0.35)',
        }}
      >
        <Icon className="w-10 h-10 text-primary" />
      </div>
      <h1 className="text-3xl md:text-4xl font-bold glow-text tracking-tight mb-2">{title}</h1>
      <p className="text-muted-foreground text-sm font-mono mb-6">// coming soon</p>
      {description && (
        <p className="text-sm text-foreground/70 max-w-md">{description}</p>
      )}
      <div className="mt-8 glass-panel px-4 py-2 text-[11px] font-mono text-muted-foreground">
        under construction — check back later
      </div>
    </div>
  );
};

export default ComingSoon;
