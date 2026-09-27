import { useEffect, useState } from 'react';
import { Bell, Megaphone, X } from 'lucide-react';
import { isAnnouncementActive, loadAnnouncements, type Announcement } from '@/lib/announcements';

const DISMISSED_KEY = 'snoopy.announcements.dismissed';

function readDismissedIds(): string[] {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(DISMISSED_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

const AnnouncementList = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>(readDismissedIds);

  useEffect(() => {
    let cancelled = false;

    loadAnnouncements(true)
      .then(items => {
        if (!cancelled) setAnnouncements(items.filter(item => isAnnouncementActive(item)));
      })
      .catch(error => console.error('Failed to load announcements:', error));

    return () => { cancelled = true; };
  }, []);

  const visibleAnnouncements = announcements.filter(item => !dismissedIds.includes(item.id));
  if (!visibleAnnouncements.length) return null;

  const dismiss = () => {
    const nextDismissedIds = [...new Set([...dismissedIds, ...visibleAnnouncements.map(item => item.id)])];
    setDismissedIds(nextDismissedIds);
    try {
      sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(nextDismissedIds));
    } catch {
      // Keep the dismissal for this mount when session storage is unavailable.
    }
  };

  return (
    <section aria-label="Announcements" className="fixed inset-x-0 top-0 z-[100] px-3 pt-3 sm:px-6 sm:pt-4">
      <div className="glass-panel relative mx-auto max-h-[40vh] w-full max-w-5xl space-y-2 overflow-y-auto border-primary/30 bg-background/95 px-4 py-3 pr-14 shadow-2xl backdrop-blur-xl sm:px-6 sm:py-4 sm:pr-16">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close announcements"
          title="Close announcements"
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-lg border border-border/60 bg-background/70 text-muted-foreground transition hover:border-primary/50 hover:text-foreground sm:right-4 sm:top-4"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
        {visibleAnnouncements.map(announcement => (
          <article key={announcement.id} className="flex gap-3 border-b border-border/40 px-1 py-2 last:border-b-0 last:pb-1">
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
      </div>
    </section>
  );
};

export default AnnouncementList;