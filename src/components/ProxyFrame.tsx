interface ProxyFrameProps {
  url: string;
}

const ProxyFrame = ({ url }: ProxyFrameProps) => {
  // For demo purposes, we'll use an approach that works for many sites
  // In production, you'd need a proper proxy server
  const proxyUrl = url.startsWith('http') ? url : `https://${url}`;

  return (
    <div className="w-full h-full glass-panel overflow-hidden">
      <iframe
        src={proxyUrl}
        className="w-full h-full border-none"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
        referrerPolicy="no-referrer"
        title="Proxy Content"
      />
    </div>
  );
};

export default ProxyFrame;
