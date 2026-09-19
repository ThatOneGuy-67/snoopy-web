const CHAT_URL = `${import.meta.env.BASE_URL}chat.html`;

const ChatPage = () => {
  return (
    <div className="relative w-full h-[calc(100vh-5rem)] min-h-[620px]">
      <div className="absolute inset-0 pointer-events-none rounded-2xl bg-[radial-gradient(ellipse_at_top,rgba(85,232,135,0.08),transparent_50%)]" />
      <div className="relative z-10 h-full overflow-hidden rounded-2xl border border-border/50 bg-background/20 shadow-2xl backdrop-blur-sm">
        <iframe
          title="Snoopy's Chat"
          src={CHAT_URL}
          className="block w-full h-full border-0 bg-transparent"
          allow="clipboard-read; clipboard-write"
        />
      </div>
    </div>
  );
};

export default ChatPage;
