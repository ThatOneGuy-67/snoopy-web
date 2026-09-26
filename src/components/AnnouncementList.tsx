import { useEffect, useState } from 'react';
import { Bell, Megaphone } from 'lucide-react';
import { isAnnouncementActive, loadAnnouncements, type Announcement } from '@/lib/announcements';

const AnnouncementList = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    let cancelled = false;

    loadAnnouncements(true)
      .then(items => {
        if (!cancelled) setAnnouncements(items.filter(item => isAnnouncementActive(item)));
      })
      .catch(error => console.error('Failed to load announcements:', error));

    return () => { cancelled = true; };
  }, []);

  if (!announcements.length) return null;

  return (
    <section aria-label="Announcements" className="mx-auto w-full max-w-5xl space-y-3 px-1 pt-4">
      {announcements.map(announcement => (
        <article key={announcement.id} className="glass-panel flex gap-3 border-primary/25 px-4 py-3 sm:px-5">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Megaphone className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Bell className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              {announcement.title}
            </h2>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
              {announcement.message}
            </p>
          </div>
        </article>
      ))}
    </section>
  );
};

export default AnnouncementList;