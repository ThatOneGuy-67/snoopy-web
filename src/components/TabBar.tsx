import { X, Plus, Home } from 'lucide-react';

interface Tab {
  id: string;
  title: string;
  url: string;
}

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string | null;
  onTabClick: (id: string) => void;
  onTabClose: (id: string) => void;
  onNewTab: () => void;
  onHomeClick: () => void;
}

const TabBar = ({ tabs, activeTabId, onTabClick, onTabClose, onNewTab, onHomeClick }: TabBarProps) => {
  return (
    <div className="glass-panel p-2 flex items-center gap-2 overflow-x-auto">
      <button
        onClick={onHomeClick}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 shrink-0
          ${activeTabId === null 
            ? 'bg-primary/20 text-primary' 
            : 'hover:bg-secondary/50 text-muted-foreground hover:text-foreground'
          }`}
      >
        <Home className="w-4 h-4" />
        <span className="text-sm font-medium">Home</span>
      </button>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 min-w-0 shrink-0
            ${activeTabId === tab.id 
              ? 'bg-primary/20 text-primary' 
              : 'hover:bg-secondary/50 text-muted-foreground hover:text-foreground'
            }`}
        >
          <button
            onClick={() => onTabClick(tab.id)}
            className="text-sm font-medium truncate max-w-32"
          >
            {tab.title}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTabClose(tab.id);
            }}
            className="p-1 rounded hover:bg-destructive/20 hover:text-destructive transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}

      <button
        onClick={onNewTab}
        className="p-2 rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-all duration-200 shrink-0"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
};

export default TabBar;
