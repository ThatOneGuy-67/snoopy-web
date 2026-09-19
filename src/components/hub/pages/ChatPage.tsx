import { ExternalLink, MessageCircle } from 'lucide-react';

const ChatPage = () => {
  return (
    <div className="relative w-full h-[calc(100vh-5rem)] min-h-[620px]">
      <div className="absolute inset-0 pointer-events-none rounded-2xl bg-[radial-gradient(ellipse_at_top,rgba(85,232,135,0.08),transparent_50%)]" />
      <div className="relative z-10 h-full overflow-hidden rounded-2xl border border-border/50 bg-background/30 shadow-2xl backdrop-blur-sm">
        <div className="h-10 px-3 flex items-center justify-between border-b border-border/50 bg-background/50">
          <div className="flex items-center gap-2 text-sm font-medium">
            <MessageCircle className="w-4 h-4 text-primary" />
            Snoopy's Chat
          </div>
          <a
            href="/chat.html"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition"
          >
            Open full chat <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
        <iframe
          title="Snoopy's Chat"
          src="/chat.html"
          className="block w-full h-[calc(100%-2.5rem)] border-0"
          allow="clipboard-read; clipboard-write"
        />
      </div>
    </div>
  );
};

export default ChatPage;
