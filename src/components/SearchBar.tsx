import { useState, KeyboardEvent } from 'react';
import { Search, ArrowRight, ChevronDown } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  searchEngine?: string;
  onSearchEngineChange?: (engine: string) => void;
}

const SearchBar = ({ onSearch, searchEngine = 'duckduckgo', onSearchEngineChange }: SearchBarProps) => {
  const [query, setQuery] = useState('');

  const handleSearch = () => {
    if (query.trim()) {
      onSearch(query.trim());
      setQuery('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="glass-panel p-2 w-full max-w-2xl mx-auto group focus-within:glow-border transition-all duration-300">
      <div className="flex items-center gap-3">
        <Search className="w-5 h-5 text-muted-foreground ml-2" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter URL or search..."
          className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground py-3 text-lg"
        />
        {onSearchEngineChange && <div className="relative shrink-0"><select value={searchEngine} onChange={e => onSearchEngineChange(e.target.value)} aria-label="Search engine" className="appearance-none bg-secondary/50 border border-border rounded-lg pl-3 pr-7 py-2 text-xs font-medium outline-none cursor-pointer"><option value="duckduckgo">DuckDuckGo</option><option value="google">Google</option><option value="bing">Bing</option><option value="custom">Custom</option></select><ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3" /></div>}
        <button
          onClick={handleSearch}
          aria-label="Search or visit URL"
          className="p-3 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary transition-all duration-200 hover:scale-105"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default SearchBar;
