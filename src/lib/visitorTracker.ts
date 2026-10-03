<<<<<<< HEAD
import { supabase } from "@/integrations/supabase/client";

const VISITOR_KEY = "snoopy.visitor_id";
const SESSION_KEY = "snoopy.session_id";
const SESSION_VISITOR_KEY = "snoopy.session_visitor_id";
const SESSION_HEARTBEAT_KEY = "snoopy.session_last_heartbeat";
const LAST_ACTIVITY_KEY = "snoopy.last_activity";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const PAGE_CHANGE_EVENT = "snoopy:visitor-page-change";

type VisitorActivityArgs = {
  p_visitor_id: string;
  p_session_id: string;
  p_device_type: string;
  p_operating_system: string;
  p_browser: string;
  p_current_path: string;
  p_referrer_domain: string | null;
  p_is_online: boolean;
  p_last_activity: string;
};

type VisitorActivityRpc = {
  rpc: (name: "record_visitor_activity", args: VisitorActivityArgs) => Promise<{ error: { message: string } | null }>;
};

export function notifyVisitorPageChange(): void {
  window.dispatchEvent(new Event(PAGE_CHANGE_EVENT));
}

function randomId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

function getOrCreateVisitorId(): string {
  let value = localStorage.getItem(VISITOR_KEY);

  if (!value) {
    value = randomId();
    localStorage.setItem(VISITOR_KEY, value);
  }

  return value;
}

function getOrCreateSessionId(visitorId: string): string {
  let value = localStorage.getItem(SESSION_KEY);
  const sessionVisitorId = localStorage.getItem(SESSION_VISITOR_KEY);
  const previousHeartbeat = Number(localStorage.getItem(SESSION_HEARTBEAT_KEY));
  const sessionExpired = Number.isFinite(previousHeartbeat)
    && previousHeartbeat > 0
    && Date.now() - previousHeartbeat > SESSION_TIMEOUT_MS;

  if (!value || sessionExpired || (sessionVisitorId && sessionVisitorId !== visitorId)) {
    value = randomId();
    localStorage.setItem(SESSION_KEY, value);
  }
  localStorage.setItem(SESSION_VISITOR_KEY, visitorId);

  return value;
}

function classifyDevice(userAgent: string): string {
  const iPadDesktopMode = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  if (iPadDesktopMode || /iPad|Tablet|PlayBook|Silk/i.test(userAgent) || (/Android/i.test(userAgent) && !/Mobile/i.test(userAgent))) {
    return "Tablet";
  }
  if (/Mobile|iPhone|Android|iPod/i.test(userAgent)) return "Mobile";
  return "Desktop";
}

function classifyOperatingSystem(userAgent: string): string {
  if (/Windows NT 10/i.test(userAgent)) return "Windows 10/11";
  if (/Windows NT 6\.3/i.test(userAgent)) return "Windows 8.1";
  if (/Windows NT 6\.1/i.test(userAgent)) return "Windows 7";
  if (/Windows/i.test(userAgent)) return "Windows";
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "iOS";
  if (/Android/i.test(userAgent)) return "Android";
  if (/CrOS/i.test(userAgent)) return "ChromeOS";
  if (/Mac OS X|Macintosh/i.test(userAgent)) return "macOS";
  if (/Linux/i.test(userAgent)) return "Linux";
  return "Unknown";
}

function classifyBrowser(userAgent: string): string {
  if (/Edg\//i.test(userAgent)) return "Microsoft Edge";
  if (/OPR\//i.test(userAgent)) return "Opera";
  if (/SamsungBrowser\//i.test(userAgent)) return "Samsung Internet";
  if (/Firefox\//i.test(userAgent)) return "Firefox";
  if (/CriOS\//i.test(userAgent)) return "Chrome (iOS)";
  if (/Chrome\//i.test(userAgent)) return "Chrome";
  if (/Safari\//i.test(userAgent)) return "Safari";
  return "Unknown";
}

function getCurrentPath(): string {
  return window.location.pathname.slice(0, 2048) || "/";
}

function getReferrerDomain(): string | null {
  if (!document.referrer) return null;
  try {
    return new URL(document.referrer).hostname.slice(0, 253) || null;
  } catch {
    return null;
  }
}

function getLastActivityTime(): number {
  try {
    const stored = Number(localStorage.getItem(LAST_ACTIVITY_KEY));
    return Number.isFinite(stored) && stored > 0 ? Math.min(stored, Date.now()) : Date.now();
  } catch {
    return Date.now();
  }
}

export async function startVisitorTracking() {
  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) return () => {};

  let visitorId: string;
  let sessionId: string;
  try {
    visitorId = getOrCreateVisitorId();
    sessionId = getOrCreateSessionId(visitorId);
  } catch (error) {
    console.error("Visitor tracking storage unavailable:", error);
    return () => {};
  }

  const userAgent = navigator.userAgent;
  const deviceType = classifyDevice(userAgent);
  const operatingSystem = classifyOperatingSystem(userAgent);
  const browser = classifyBrowser(userAgent);
  let stopped = false;

  const heartbeat = async (isOnline = navigator.onLine) => {
    if (stopped) return;
    const now = Date.now();

    try {
      localStorage.setItem(SESSION_HEARTBEAT_KEY, String(now));
    } catch {
      // Tracking continues for this page if browser storage becomes unavailable.
    }

    try {
      const { error } = await (supabase as unknown as VisitorActivityRpc).rpc("record_visitor_activity", {
        p_visitor_id: visitorId,
        p_session_id: sessionId,
        p_device_type: deviceType,
        p_operating_system: operatingSystem,
        p_browser: browser,
        p_current_path: getCurrentPath(),
        p_referrer_domain: getReferrerDomain(),
        p_is_online: isOnline,
        p_last_activity: new Date(getLastActivityTime()).toISOString(),
      });
      if (error) console.error("Visitor tracking failed:", error.message);
    } catch (error) {
      console.error("Visitor tracking failed:", error);
    }
  };

  const markActivity = () => {
    try {
      localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    } catch {
      // Activity can still be tracked by the next heartbeat.
    }
  };

  const onOnline = () => { void heartbeat(true); };
  const onOffline = () => { void heartbeat(false); };
  const onPageChange = () => { void heartbeat(); };
  const activityEvents = ["pointerdown", "keydown", "scroll", "touchstart"] as const;

  activityEvents.forEach(eventName => window.addEventListener(eventName, markActivity, { passive: true }));
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  window.addEventListener("popstate", onPageChange);
  window.addEventListener("hashchange", onPageChange);
  window.addEventListener(PAGE_CHANGE_EVENT, onPageChange);
  document.addEventListener("visibilitychange", onPageChange);

  await heartbeat();
  const interval = window.setInterval(() => { void heartbeat(); }, 30_000);

  return () => {
    stopped = true;
    window.clearInterval(interval);
    activityEvents.forEach(eventName => window.removeEventListener(eventName, markActivity));
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
    window.removeEventListener("popstate", onPageChange);
    window.removeEventListener("hashchange", onPageChange);
    window.removeEventListener(PAGE_CHANGE_EVENT, onPageChange);
    document.removeEventListener("visibilitychange", onPageChange);
  };
}
=======
import { createClient } from "@supabase/supabase-js";

const VISITOR_KEY = "tog_visitor_id";
const SESSION_KEY = "tog_session_id";
const STARTED_KEY = "tog_session_started_at";
const HEARTBEAT_MS = 30_000;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

function createTrackingClient(visitorId: string, sessionId: string) {
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      headers: {
        "x-visitor-id": visitorId,
        "x-session-id": sessionId,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function getVisitorId(): string {
  const existing = localStorage.getItem(VISITOR_KEY);
  if (existing) return existing;

  const id = typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `u_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  localStorage.setItem(VISITOR_KEY, id);
  return id;
}

function getSessionId(): string {
  const existing = sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;

  const id = typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `s_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  sessionStorage.setItem(SESSION_KEY, id);
  sessionStorage.setItem(STARTED_KEY, new Date().toISOString());
  return id;
}

async function ensureVisitor(client: ReturnType<typeof createTrackingClient>, visitorId: string) {
  const now = new Date().toISOString();

  const { data, error: selectError } = await client
    .from("visitors")
    .select("id, visit_count")
    .eq("visitor_id", visitorId)
    .maybeSingle();

  if (selectError) throw selectError;

  if (data) {
    const { error } = await client
      .from("visitors")
      .update({
        last_seen: now,
        visit_count: (Number(data.visit_count) || 0) + 1,
      })
      .eq("visitor_id", visitorId);

    if (error) throw error;
    return;
  }

  const { error } = await client
    .from("visitors")
    .insert({
      visitor_id: visitorId,
      first_seen: now,
      last_seen: now,
      visit_count: 1,
    });

  if (error) throw error;
}

async function ensureSession(
  client: ReturnType<typeof createTrackingClient>,
  visitorId: string,
  sessionId: string,
) {
  const now = new Date().toISOString();
  const startedAt = sessionStorage.getItem(STARTED_KEY) || now;

  const { data, error: selectError } = await client
    .from("sessions")
    .select("id")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (selectError) throw selectError;

  if (data) {
    await heartbeat(client, sessionId, visitorId);
    return;
  }

  const { error } = await client
    .from("sessions")
    .insert({
      session_id: sessionId,
      visitor_id: visitorId,
      started_at: startedAt,
      last_heartbeat: now,
    });

  if (error) throw error;
}

async function heartbeat(
  client: ReturnType<typeof createTrackingClient>,
  sessionId: string,
  visitorId: string,
) {
  const now = new Date().toISOString();

  const { error: sessionError } = await client
    .from("sessions")
    .update({
      visitor_id: visitorId,
      last_heartbeat: now,
    })
    .eq("session_id", sessionId);

  if (sessionError) throw sessionError;

  const { error: visitorError } = await client
    .from("visitors")
    .update({ last_seen: now })
    .eq("visitor_id", visitorId);

  if (visitorError) throw visitorError;
}

export function startVisitorTracking() {
  if (typeof window === "undefined") return () => {};

  const visitorId = getVisitorId();
  const sessionId = getSessionId();
  const client = createTrackingClient(visitorId, sessionId);

  void (async () => {
    try {
      // Create/update the visitor first so a session is never recorded before its visitor.
      await ensureVisitor(client, visitorId);
      await ensureSession(client, visitorId, sessionId);
    } catch (error) {
      console.warn("Visitor tracking failed:", error);
    }
  })();

  const heartbeatTimer = window.setInterval(() => {
    void heartbeat(client, sessionId, visitorId).catch(error => {
      console.warn("Visitor heartbeat failed:", error);
    });
  }, HEARTBEAT_MS);

  const handlePageChange = () => {
    void heartbeat(client, sessionId, visitorId).catch(error => {
      console.warn("Visitor page tracking failed:", error);
    });
  };

  window.addEventListener("popstate", handlePageChange);

  return () => {
    window.clearInterval(heartbeatTimer);
    window.removeEventListener("popstate", handlePageChange);
  };
}

export function getTrackedVisitorId() {
  if (typeof window === "undefined") return null;
  return getVisitorId();
}

export async function checkVisitorBanned(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const visitorId = getVisitorId();
  const client = createTrackingClient(visitorId, "");
  const { data, error } = await client.rpc("is_current_visitor_banned");
  if (error) {
    console.warn("Visitor ban check failed:", error);
    return false;
  }
  return data === true;
}
>>>>>>> web/main
