import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Volume2, VolumeX,
  Search, Music as MusicIcon, ListMusic, Heart,
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
    <div className="pb-32">
      <header className="pt-6 pb-5">
        <h1 className="text-2xl font-semibold text-foreground glow-text">Music</h1>
        <p className="text-xs font-mono text-muted-foreground mt-1">// play your library without limits</p>
      </header>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Library column */}
        <aside className="glass-panel p-4 lg:w-64 shrink-0 h-fit">
          <div className="flex items-center gap-2 mb-3">
            <ListMusic className="w-4 h-4 text-primary" />
            <h2 className="text-xs font-mono text-muted-foreground">your library</h2>
          </div>
          <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible">
            {PLAYLISTS.map(pl => (
              <button
                key={pl.id}
                onClick={() => setPlaylist(pl)}
                className={`flex items-center gap-3 rounded-lg border p-2 text-left transition-colors hover-glow min-w-[200px] lg:min-w-0 ${
                  playlist.id === pl.id ? 'border-primary/50 bg-primary/10' : 'border-border/50 bg-foreground/5'
                }`}
              >
                <img src={pl.cover} onError={onCoverError} alt="" className="w-10 h-10 rounded-md object-cover" />
                <span className="min-w-0">
                  <span className="block text-sm text-foreground truncate">{pl.name}</span>
                  <span className="block text-[11px] text-muted-foreground truncate">{pl.songs.length} songs</span>
                </span>
              </button>
            ))}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <div className="glass-panel flex items-center gap-2 px-3 py-2 mb-4">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search songs or artists"
              aria-label="Search songs or artists"
              className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {query ? (
            <section>
              <h2 className="text-sm font-mono text-muted-foreground mb-3">// results ({results.length})</h2>
              <ul className="space-y-1">
                {results.map(s => (
                  <li key={s.title}>
                    <button
                      onClick={() => {
                        const pl = playlistOf(s);
                        selectTrack(pl, pl.songs.indexOf(s));
                      }}
                      className="w-full flex items-center gap-3 rounded-lg border border-border/40 bg-foreground/5 px-3 py-2 text-left hover-glow"
                    >
                      <img src={s.cover} onError={onCoverError} alt="" className="w-9 h-9 rounded object-cover" />
                      <span className="min-w-0">
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
              <section className="mb-6">
                <h2 className="text-sm font-mono text-muted-foreground mb-3">// recently played</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                  {PLAYLISTS.map(pl => (
                    <button key={pl.id} onClick={() => selectTrack(pl, 0)} className="glass-card !p-3 text-left">
                      <img src={pl.cover} onError={onCoverError} alt="" className="w-full aspect-square rounded-lg object-cover mb-2" />
                      <p className="text-sm font-medium text-foreground truncate">{pl.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{pl.description}</p>
                    </button>
                  ))}
                </div>
              </section>

              <section className="glass-panel p-4">
                <div className="flex items-center gap-3 mb-4">
                  <img src={playlist.cover} onError={onCoverError} alt="" className="w-16 h-16 rounded-lg object-cover" />
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-foreground truncate">{playlist.name}</h2>
                    <p className="text-xs text-muted-foreground truncate">{playlist.description}</p>
                  </div>
                </div>
                <ul className="space-y-1">
                  {playlist.songs.map((s, i) => {
                    const active = current?.title === s.title;
                    return (
                      <li
                        key={s.title}
                        className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors ${
                          active ? 'border-primary/50 bg-primary/10' : 'border-transparent hover:bg-foreground/5'
                        }`}
                      >
                        <button onClick={() => selectTrack(playlist, i)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                          <span className="w-5 text-xs font-mono text-muted-foreground">{i + 1}</span>
                          <img src={s.cover} onError={onCoverError} alt="" className="w-9 h-9 rounded object-cover" />
                          <span className="min-w-0">
                            <span className="block text-sm text-foreground truncate">{s.title}</span>
                            <span className="block text-xs text-muted-foreground truncate">{s.artist}</span>
                          </span>
                        </button>
                        <button
                          onClick={() => toggleLike(s.title)}
                          aria-label={liked.includes(s.title) ? `Unlike ${s.title}` : `Like ${s.title}`}
                          className="p-1 text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Heart className={`w-4 h-4 ${liked.includes(s.title) ? 'fill-current text-primary' : ''}`} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </>
          )}
        </main>
      </div>

      {/* Player bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 px-2 pb-2">
        <div className="glass-panel p-3 flex flex-col sm:flex-row items-center gap-3 max-w-6xl mx-auto">
          <div className="flex items-center gap-3 sm:w-56 w-full min-w-0">
            {current ? (
              <img src={current.cover} onError={onCoverError} alt="" className="w-11 h-11 rounded-md object-cover" />
            ) : (
              <div className="w-11 h-11 rounded-md bg-foreground/10 grid place-items-center">
                <MusicIcon className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm text-foreground truncate">{current?.title ?? 'Nothing playing'}</p>
              <p className="text-xs text-muted-foreground truncate">{current?.artist ?? '—'}</p>
            </div>
          </div>

          <div className="flex-1 w-full min-w-0">
            <div className="flex items-center justify-center gap-4">
              <button onClick={() => setShuffle(v => !v)} aria-label="Shuffle" className={shuffle ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}>
                <Shuffle className="w-4 h-4" />
              </button>
              <button onClick={() => { setIndex(i => (i - 1 + playlist.songs.length) % playlist.songs.length); setPlaying(true); }} aria-label="Previous track" className="text-muted-foreground hover:text-foreground">
                <SkipBack className="w-5 h-5" />
              </button>
              <button
                onClick={togglePlay}
                aria-label={playing ? 'Pause' : 'Play'}
                className="w-10 h-10 rounded-full bg-primary text-primary-foreground grid place-items-center glow-border"
              >
                {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              <button onClick={playNext} aria-label="Next track" className="text-muted-foreground hover:text-foreground">
                <SkipForward className="w-5 h-5" />
              </button>
              <button onClick={() => setRepeat(v => !v)} aria-label="Repeat" className={repeat ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}>
                <Repeat className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] font-mono text-muted-foreground w-9 text-right">{formatTime(progress)}</span>
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
                className="flex-1 h-1 accent-primary bg-foreground/15 rounded-full appearance-none cursor-pointer"
              />
              <span className="text-[10px] font-mono text-muted-foreground w-9">{formatTime(duration)}</span>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 w-32">
            <button onClick={() => setMuted(m => !m)} aria-label={muted ? 'Unmute' : 'Mute'} className="text-muted-foreground hover:text-primary">
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
              className="flex-1 h-1 accent-primary bg-foreground/15 rounded-full appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicPage;
