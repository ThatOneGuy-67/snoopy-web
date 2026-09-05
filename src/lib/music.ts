/**
 * Music library for the Hub Music page.
 * Audio + artwork are served from the Snoopys-Spotify repo via jsDelivr,
 * so no large media files live in this project.
 *
 * To add a song: add a `song(...)` entry to a playlist below.
 */
export const MUSIC_CDN = 'https://cdn.jsdelivr.net/gh/ThatOneGuy-67/Snoopys-Spotify@main/';

export const cdn = (path: string) => MUSIC_CDN + encodeURI(path);

export interface Song {
  title: string;
  artist: string;
  src: string;
  cover: string;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  cover: string;
  songs: Song[];
}

const song = (title: string, artist: string, src: string, cover = 'assets/EX.jpg'): Song => ({
  title,
  artist,
  src: cdn(src),
  cover: cdn(cover),
});

export const PLAYLISTS: Playlist[] = [
  {
    id: 'global',
    name: 'Top 50 - Global',
    description: 'Your daily update of the most played tracks.',
    cover: cdn('assets/card1img.jpeg'),
    songs: [
      song('California Girls', 'Snoop Dogg / Katy Perry', 'music/California Gurls.mp3', 'assets/Cal.jpg'),
      song('Never Gonna Give U Up', 'Rick Astley', 'music/Never Gonna Give You Up.mp3', 'assets/rick.jpg'),
      song('Crank That', 'Soulja Boy', 'music/Crank That.mp3', 'assets/SB.jpg'),
      song('Stand By Me', 'Ben E. King', 'music/Stand by me.mp3', 'assets/Stan.jpg'),
      song("Steve's Lava Chicken", 'Mojang', "music/Steve's Lava Chicken.mp3", 'assets/MM.jpg'),
      song('Murder Business', 'YoungBoy', 'music/Murder business -YoungBoy.mp3', 'assets/YB.jpg'),
      song('Hot Now', 'YoungBoy', 'music/Hot Now -YoungBoy.mp3', 'assets/YB2.jpg'),
    ],
  },
  {
    id: 'tupac',
    name: '2Pac',
    description: '2Pac essentials.',
    cover: cdn('assets/2pac.jpg'),
    songs: [
      song('Bomb First', '2Pac', 'music/Bomb First (My Second Reply).mp3', 'assets/2pac.jpg'),
      song("Can't C Me", '2Pac', 'music/Can_t C Me.mp3', 'assets/2pac.jpg'),
      song('Definition Of A Thug Nigga', '2Pac', 'music/Definition Of A Thug Nigga.mp3', 'assets/2pac.jpg'),
      song('Ambitionz Az A Ridah', '2Pac', 'music/Ambitionz Az A Ridah.mp3', 'assets/2pac.jpg'),
      song('Dear Mama', '2Pac', 'music/Dear Mama.mp3', 'assets/2pac.jpg'),
      song('All Eyez On Me', '2Pac', 'music/All Eyez On Me (ft. Big Syke).mp3', 'assets/2pac.jpg'),
    ],
  },
];

export const ALL_SONGS: Song[] = PLAYLISTS.flatMap(p => p.songs);

export const FALLBACK_COVER = cdn('assets/EX.jpg');

export const formatTime = (secs: number) => {
  if (!Number.isFinite(secs) || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};
