import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Redemption = {
  id: string;
  user_id: string;
  status: string;
  submitted_at: string;
  credited_amount: string | number | null;
  external_ref: string | null;
  admin_notes: string | null;
};

export default function Admin() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null); // null = loading
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setError(null);
      // get current user
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) {
        setIsAdmin(false);
        return;
      }
      // check if in admins table
      const { data, error } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", u.user.id)
        .maybeSingle();

      if (!mounted) return;
      if (error) setError(error.message);
      setIsAdmin(!!data);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (isAdmin === null) return <div className="p-6">Loading…</div>;
  if (isAdmin === false) return <div className="p-6">Not authorized.</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  // Skeleton UI for now — we'll fill in the queue next step
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Admin — Redemptions</h1>
      <div className="opacity-70">Pending redemptions will appear here.</div>
    </div>
  );
}
