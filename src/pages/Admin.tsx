import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Admin = () => {
  const [online, setOnline] = useState<number | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      const { data, error } = await supabase.rpc(
        "get_online_count" as never
    );

      if (error) {
        console.error("Failed to get online count:", error);
        return;
      }

      setOnline(data);
    };

    loadStats();
  }, []);

  return (
    <div className="min-h-screen bg-[#090a0d] text-white p-8">
      <h1 className="text-3xl font-bold mb-6">
        Snoopy's Web Admin
      </h1>

      <div className="rounded-xl border border-white/10 bg-white/5 p-6 max-w-sm">
        <p className="text-gray-400">
          People Online
        </p>

        <p className="text-4xl font-bold mt-2">
          {online ?? "..."}
        </p>
      </div>
    </div>
  );
};

export default Admin;