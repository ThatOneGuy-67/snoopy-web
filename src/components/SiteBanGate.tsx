import { useEffect, useState, type ReactNode } from "react";
import { checkVisitorBanned } from "@/lib/visitorTracker";

const SiteBanGate = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<"checking" | "allowed" | "banned">("checking");

  useEffect(() => {
    let active = true;
    const check = () => void checkVisitorBanned().then(banned => {
      if (active) setStatus(banned ? "banned" : "allowed");
    });
    check();
    const timer = window.setInterval(check, 3_000);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);

  if (status === "checking") {
    return <main className="min-h-screen bg-[#090a0d] text-white grid place-items-center">Checking access…</main>;
  }

  if (status === "banned") {
    return (
      <main className="min-h-screen bg-[#090a0d] text-white grid place-items-center p-6">
        <section className="w-full max-w-lg rounded-2xl border border-red-400/30 bg-red-400/10 p-8 text-center">
          <h1 className="text-3xl font-bold">Access blocked</h1>
          <p className="mt-3 text-white/70">This visitor has been banned from using this site.</p>
          <p className="mt-2 text-sm text-white/45">If you believe this is a mistake, contact the site administrator.</p>
        </section>
      </main>
    );
  }

  return <>{children}</>;
};

export default SiteBanGate;
