import { supabase } from "@/integrations/supabase/client";

const VISITOR_KEY = "tog_visitor_id";
const SESSION_KEY = "tog_session_id";
const STARTED_KEY = "tog_session_started_at";
const HEARTBEAT_MS = 30_000;

const trackingClient = supabase;

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

async function ensureVisitor(client: typeof trackingClient, visitorId: string) {
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
  client: typeof trackingClient,
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
  client: typeof trackingClient,
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
  const client = trackingClient;

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
  const { data, error } = await (trackingClient as any).rpc("is_current_visitor_banned");
  if (error) {
    console.warn("Visitor ban check failed:", error);
    return false;
  }
  return data === true;
}
