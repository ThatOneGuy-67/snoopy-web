import { ReactNode } from 'react';

interface WidgetProps {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

const Widget = ({ title, icon, action, children, className = '' }: WidgetProps) => {
  return (
    <div className={`glass-panel p-4 flex flex-col gap-3 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          {icon}
          <span>{title}</span>
        </div>
        {action}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
};

export default Widget;
