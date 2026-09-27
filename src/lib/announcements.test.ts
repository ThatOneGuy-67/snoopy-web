import { describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

import { isAnnouncementActive, type Announcement } from './announcements';

const currentTime = Date.parse('2026-09-26T12:00:00.000Z');
const baseAnnouncement: Announcement = {
  id: 'announcement-1',
  title: 'Test announcement',
  message: 'Test message',
  enabled: true,
  starts_at: null,
  ends_at: null,
};

describe('isAnnouncementActive', () => {
  it('keeps enabled announcements active when dates are null', () => {
    expect(isAnnouncementActive(baseAnnouncement, currentTime)).toBe(true);
  });

  it('excludes disabled announcements', () => {
    expect(isAnnouncementActive({ ...baseAnnouncement, enabled: false }, currentTime)).toBe(false);
  });

  it('includes announcements at their start and end instants', () => {
    expect(isAnnouncementActive({ ...baseAnnouncement, starts_at: new Date(currentTime).toISOString() }, currentTime)).toBe(true);
    expect(isAnnouncementActive({ ...baseAnnouncement, ends_at: new Date(currentTime).toISOString() }, currentTime)).toBe(true);
  });

  it('excludes announcements before their start or after their end', () => {
    expect(isAnnouncementActive({ ...baseAnnouncement, starts_at: new Date(currentTime + 1).toISOString() }, currentTime)).toBe(false);
    expect(isAnnouncementActive({ ...baseAnnouncement, ends_at: new Date(currentTime - 1).toISOString() }, currentTime)).toBe(false);
  });
});