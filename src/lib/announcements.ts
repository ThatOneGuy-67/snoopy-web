import { supabase } from '@/integrations/supabase/client';

export interface Announcement {
  id: string;
  title: string;
  message: string;
  enabled: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

export function isAnnouncementActive(announcement: Announcement, now = Date.now()): boolean {
  const startsAt = announcement.starts_at ? Date.parse(announcement.starts_at) : null;
  const endsAt = announcement.ends_at ? Date.parse(announcement.ends_at) : null;

  return announcement.enabled
    && (startsAt === null || startsAt <= now)
    && (endsAt === null || endsAt >= now);
}

export async function loadAnnouncements(enabledOnly = false): Promise<Announcement[]> {
  let query = supabase.from('announcements' as never).select('*');
  if (enabledOnly) query = query.eq('enabled', true);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as Announcement[];
}