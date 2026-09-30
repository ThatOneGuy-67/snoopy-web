import { supabase } from "@/integrations/supabase/client";

const VISITOR_KEY = "tog_visitor_id";
const SESSION_KEY = "tog_session_id";
const STARTED_KEY = "tog_session_started_at";
const HEARTBEAT_MS = 30_000;

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

async function ensureVisitor(visitorId: string) {
  const now = new Date().toISOString();

  const { data } = await (supabase as any)
    .from("visitors")
    .select("id, visit_count")
    .eq("visitor_id", visitorId)
    .maybeSingle();

  if (data) {
    await (supabase as any)
      .from("visitors")
      .update({
        last_seen: now,
        visit_count: (Number(data.visit_count) || 0) + 1,
      })
      .eq("id", data.id);
    return;
  }

  await (supabase as any)
    .from("visitors")
    .insert({
      visitor_id: visitorId,
      first_seen: now,
      last_seen: now,
      visit_count: 1,
    });
}

async function ensureSession(visitorId: string, sessionId: string) {
  const now = new Date().toISOString();
  const startedAt = sessionStorage.getItem(STARTED_KEY) || now;

  const { data } = await (supabase as any)
    .from("sessions")
    .select("id")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (data) {
    await heartbeat(sessionId, visitorId);
    return;
  }

  await (supabase as any)
    .from("sessions")
    .insert({
      session_id: sessionId,
      visitor_id: visitorId,
      started_at: startedAt,
      last_heartbeat: now,
      current_path: window.location.pathname,
    });
}

async function heartbeat(sessionId: string, visitorId: string) {
  await (supabase as any)
    .from("sessions")
    .update({
      visitor_id: visitorId,
      last_heartbeat: new Date().toISOString(),
      current_path: window.location.pathname,
    })
    .eq("session_id", sessionId);

  await (supabase as any)
    .from("visitors")
    .update({ last_seen: new Date().toISOString() })
    .eq("visitor_id", visitorId);
}

export function startVisitorTracking() {
  if (typeof window === "undefined") return () => {};

  const visitorId = getVisitorId();
  const sessionId = getSessionId();

  void ensureVisitor(visitorId).catch(error => {
    console.warn("Visitor tracking failed:", error);
  });

  void ensureSession(visitorId, sessionId).catch(error => {
    console.warn("Session tracking failed:", error);
  });

  const heartbeatTimer = window.setInterval(() => {
    void heartbeat(sessionId, visitorId).catch(error => {
      console.warn("Visitor heartbeat failed:", error);
    });
  }, HEARTBEAT_MS);

  const handlePageChange = () => {
    void heartbeat(sessionId, visitorId);
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
