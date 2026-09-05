import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Volume2, VolumeX,
  Search, Music as MusicIcon, ListMusic, Heart, Home, Plus, ArrowRight,
} from 'lucide-react';
import { PLAYLISTS, ALL_SONGS, FALLBACK_COVER, formatTime, type Song, type Playlist } from '@/lib/music';

const LIKED_KEY = 'snoopy-music-liked';

const MusicPage = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playlist, setPlaylist] = useState<Playlist>(PLAYLISTS[0]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [query, setQuery] = useState('');
  const [liked, setLiked] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(LIKED_KEY) || '[]'); } catch { return []; }
  });

  const current: Song | undefined = playlist.songs[index];

  if (!audioRef.current && typeof Audio !== 'undefined') audioRef.current = new Audio();

  // Load the current track
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (audio.src !== current.src) {
      audio.src = current.src;
      audio.load();
    }
    if (playing) void audio.play().catch(() => setPlaying(false));
  }, [current, playing]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = muted ? 0 : volume;
  }, [volume, muted]);

  const playNext = useCallback(() => {
    setIndex(i => {
      if (shuffle) return Math.floor(Math.random() * playlist.songs.length);
      return (i + 1) % playlist.songs.length;
    });
    setPlaying(true);
  }, [shuffle, playlist.songs.length]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setProgress(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onEnd = () => {
      if (repeat) { audio.currentTime = 0; void audio.play(); return; }
      playNext();
    };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended', onEnd);
    };
  }, [repeat, playNext]);

  useEffect(() => () => { audioRef.current?.pause(); }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false)); }
  };

  const selectTrack = (pl: Playlist, i: number) => {
    setPlaylist(pl);
    setIndex(i);
    setPlaying(true);
  };

  const toggleLike = (title: string) => {
    setLiked(prev => {
      const next = prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title];
      localStorage.setItem(LIKED_KEY, JSON.stringify(next));
      return next;
    });
  };

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return ALL_SONGS.filter(s => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q));
  }, [query]);

  const playlistOf = (s: Song) => PLAYLISTS.find(p => p.songs.includes(s)) || PLAYLISTS[0];

  const onCoverError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (e.currentTarget.src !== FALLBACK_COVER) e.currentTarget.src = FALLBACK_COVER;
  };

  return (
    <div className="music-spotify min-h-full text-foreground">
      <div className="flex flex-col lg:flex-row gap-2 p-2 pb-36">
        {/* Spotify-style sidebar */}
        <aside className="w-full lg:w-72 shrink-0 flex flex-col gap-2">
          <div className="glass-panel p-5 rounded-lg">
            <nav className="space-y-4">
              <button className="flex items-center gap-4 text-sm font-bold text-foreground hover:text-primary transition-colors">
                <Home className="w-6 h-6" />
                Home
              </button>
              <button className="flex items-center gap-4 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">
                <Search className="w-6 h-6" />
                Search
              </button>
            </nav>
          </div>

          <div className="glass-panel flex-1 p-4 rounded-lg min-h-[200px]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3 text-muted-foreground">
                <ListMusic className="w-6 h-6" />
                <span className="text-sm font-bold">Your Library</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-1 text-muted-foreground hover:text-foreground transition-colors" aria-label="Create playlist">
                  <Plus className="w-5 h-5" />
                </button>
                <button className="p-1 text-muted-foreground hover:text-foreground transition-colors" aria-label="Open queue">
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="bg-secondary/60 rounded-lg p-4 mb-4">
              <p className="text-sm font-bold mb-1">Create your first playlist</p>
              <p className="text-xs text-muted-foreground mb-4">It's easy, we'll help you</p>
              <button className="px-4 py-1.5 rounded-full bg-foreground text-background text-xs font-bold hover:scale-105 transition-transform">
                Create playlist
              </button>
            </div>

            <div className="flex flex-col gap-1">
              {PLAYLISTS.map(pl => (
                <button
                  key={pl.id}
                  onClick={() => setPlaylist(pl)}
                  className={`flex items-center gap-3 rounded-md p-2 text-left transition-colors ${
                    playlist.id === pl.id ? 'bg-primary/20 text-primary' : 'hover:bg-secondary text-foreground'
                  }`}
                >
                  <img src={pl.cover} onError={onCoverError} alt="" className="w-12 h-12 rounded-md object-cover" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium truncate">{pl.name}</span>
                    <span className="block text-xs text-muted-foreground truncate">{pl.songs.length} songs</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 glass-panel rounded-lg overflow-hidden">
          {/* Sticky nav */}
          <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 bg-background/95 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <button className="w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors" aria-label="Back">
                <SkipBack className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 max-w-md mx-4">
              <div className="flex items-center gap-2 bg-foreground/10 rounded-full px-4 py-2.5">
                <Search className="w-4 h-4 text-muted-foreground" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search songs or artists"
                  aria-label="Search songs or artists"
                  className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="px-4 py-1.5 rounded-full bg-foreground text-background text-xs font-bold hover:scale-105 transition-transform">
                Song Request
              </button>
              <button className="w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center text-foreground hover:bg-foreground/20 transition-colors" aria-label="Profile">
                <MusicIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="px-6 pb-8">
            {query ? (
              <section className="mt-6">
                <h2 className="text-2xl font-bold mb-4">Search results</h2>
                <ul className="space-y-2">
                  {results.map(s => (
                    <li key={s.title}>
                      <button
                        onClick={() => {
                          const pl = playlistOf(s);
                          selectTrack(pl, pl.songs.indexOf(s));
                        }}
                        className="w-full flex items-center gap-4 rounded-md p-3 text-left hover:bg-secondary transition-colors group"
                      >
                        <Play className="w-4 h-4 text-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        <img src={s.cover} onError={onCoverError} alt="" className="w-10 h-10 rounded object-cover" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm text-foreground truncate">{s.title}</span>
                          <span className="block text-xs text-muted-foreground truncate">{s.artist}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                  {results.length === 0 && (
                    <li className="text-sm text-muted-foreground">No songs matched that search.</li>
                  )}
                </ul>
              </section>
            ) : (
              <>
                <section className="pt-6 mb-8">
                  <h2 className="text-2xl font-bold mb-4">Recently played</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                    {PLAYLISTS.map(pl => (
                      <button key={pl.id} onClick={() => selectTrack(pl, 0)} className="glass-card !p-4 text-left group">
                        <div className="relative mb-4">
                          <img src={pl.cover} onError={onCoverError} alt="" className="w-full aspect-square rounded-lg object-cover shadow-lg" />
                          <div className="absolute bottom-2 right-2 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all shadow-xl">
                            <Play className="w-5 h-5 ml-0.5" />
                          </div>
                        </div>
                        <p className="text-base font-bold text-foreground truncate mb-1">{pl.name}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">{pl.description}</p>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="glass-panel p-6 rounded-lg">
                  <div className="flex items-center gap-4 mb-6">
                    <img src={playlist.cover} onError={onCoverError} alt="" className="w-36 h-36 rounded-lg object-cover shadow-2xl" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wider text-foreground mb-2">Playlist</p>
                      <h2 className="text-4xl md:text-5xl font-black text-foreground truncate mb-2">{playlist.name}</h2>
                      <p className="text-sm text-muted-foreground">{playlist.description} · {playlist.songs.length} songs</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mb-6">
                    <button
                      onClick={togglePlay}
                      className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:scale-105 transition-transform shadow-xl"
                      aria-label={playing ? 'Pause' : 'Play'}
                    >
                      {playing ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
                    </button>
                  </div>

                  <ul className="space-y-1">
                    {playlist.songs.map((s, i) => {
                      const active = current?.title === s.title;
                      return (
                        <li
                          key={s.title}
                          className={`flex items-center gap-4 rounded-md px-4 py-3 transition-colors group ${
                            active ? 'bg-primary/10' : 'hover:bg-secondary'
                          }`}
                        >
                          <button onClick={() => selectTrack(playlist, i)} className="flex items-center gap-4 flex-1 min-w-0 text-left">
                            <span className="w-5 text-sm font-mono text-muted-foreground group-hover:hidden">{i + 1}</span>
                            <Play className="w-4 h-4 text-foreground hidden group-hover:block" />
                            <img src={s.cover} onError={onCoverError} alt="" className="w-10 h-10 rounded object-cover" />
                            <span className="min-w-0 flex-1">
                              <span className={`block text-sm truncate ${active ? 'text-primary' : 'text-foreground'}`}>{s.title}</span>
                              <span className="block text-xs text-muted-foreground truncate">{s.artist}</span>
                            </span>
                          </button>
                          <button
                            onClick={() => toggleLike(s.title)}
                            aria-label={liked.includes(s.title) ? `Unlike ${s.title}` : `Like ${s.title}`}
                            className="p-2 text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Heart className={`w-5 h-5 ${liked.includes(s.title) ? 'fill-current text-primary' : ''}`} />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Spotify-style player bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 px-2 pb-2">
        <div className="glass-panel p-3 flex flex-col sm:flex-row items-center gap-3 max-w-7xl mx-auto rounded-lg">
          {/* Album info */}
          <div className="flex items-center gap-3 sm:w-72 w-full min-w-0">
            {current ? (
              <img src={current.cover} onError={onCoverError} alt="" className="w-14 h-14 rounded-md object-cover shadow-md" />
            ) : (
              <div className="w-14 h-14 rounded-md bg-secondary grid place-items-center">
                <MusicIcon className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{current?.title ?? 'Nothing playing'}</p>
              <p className="text-xs text-muted-foreground truncate">{current?.artist ?? '—'}</p>
            </div>
            {current && (
              <button
                onClick={() => toggleLike(current.title)}
                className="ml-2 p-2 text-muted-foreground hover:text-primary transition-colors"
                aria-label={liked.includes(current.title) ? 'Unlike' : 'Like'}
              >
                <Heart className={`w-4 h-4 ${liked.includes(current.title) ? 'fill-current text-primary' : ''}`} />
              </button>
            )}
          </div>

          {/* Player controls */}
          <div className="flex-1 w-full min-w-0">
            <div className="flex items-center justify-center gap-6">
              <button onClick={() => setShuffle(v => !v)} aria-label="Shuffle" className={shuffle ? 'text-primary' : 'text-muted-foreground hover:text-foreground transition-colors'}>
                <Shuffle className="w-4 h-4" />
              </button>
              <button onClick={() => { setIndex(i => (i - 1 + playlist.songs.length) % playlist.songs.length); setPlaying(true); }} aria-label="Previous track" className="text-muted-foreground hover:text-foreground transition-colors">
                <SkipBack className="w-5 h-5" />
              </button>
              <button
                onClick={togglePlay}
                aria-label={playing ? 'Pause' : 'Play'}
                className="w-9 h-9 rounded-full bg-foreground text-background grid place-items-center hover:scale-105 transition-transform"
              >
                {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>
              <button onClick={playNext} aria-label="Next track" className="text-muted-foreground hover:text-foreground transition-colors">
                <SkipForward className="w-5 h-5" />
              </button>
              <button onClick={() => setRepeat(v => !v)} aria-label="Repeat" className={repeat ? 'text-primary' : 'text-muted-foreground hover:text-foreground transition-colors'}>
                <Repeat className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 mt-2 max-w-md mx-auto">
              <span className="text-[11px] font-mono text-muted-foreground w-10 text-right">{formatTime(progress)}</span>
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={progress}
                aria-label="Seek"
                onChange={e => {
                  const t = Number(e.target.value);
                  if (audioRef.current) audioRef.current.currentTime = t;
                  setProgress(t);
                }}
                className="flex-1 h-1 bg-foreground/20 rounded-full appearance-none cursor-pointer"
              />
              <span className="text-[11px] font-mono text-muted-foreground w-10">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Volume controls */}
          <div className="hidden sm:flex items-center gap-2 w-32">
            <button onClick={() => setMuted(m => !m)} aria-label={muted ? 'Unmute' : 'Mute'} className="text-muted-foreground hover:text-primary transition-colors">
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={muted ? 0 : volume}
              aria-label="Volume"
              onChange={e => { setVolume(Number(e.target.value)); setMuted(false); }}
              className="flex-1 h-1 bg-foreground/20 rounded-full appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicPage;
