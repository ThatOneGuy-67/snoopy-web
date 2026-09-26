const SUPABASE_FUNCTION_URL =
  "https://ekttqgsxrywyvlnspipg.supabase.co/functions/v1/track-visitor";

const VISITOR_KEY = "snoopy.visitor_id";
const SESSION_KEY = "snoopy.session_id";

function randomId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

function getOrCreate(key: string): string {
  let value = localStorage.getItem(key);

  if (!value) {
    value = randomId();
    localStorage.setItem(key, value);
  }

  return value;
}

export async function startVisitorTracking() {
  const visitor_id = getOrCreate(VISITOR_KEY);
  const session_id = getOrCreate(SESSION_KEY);

  async function heartbeat() {
    try {
      await fetch(SUPABASE_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          visitor_id,
          session_id,
        }),
      });
    } catch (error) {
      console.error("Visitor tracking failed:", error);
    }
  }

  // Track immediately.
  await heartbeat();

  // Keep the session alive.
  const interval = setInterval(heartbeat, 30_000);

  return () => clearInterval(interval);
}
