import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  claimed_at: string;
  card_id: string;
  name: string | null;
  suit: string | null;
  rank: string | null;          // rank is text in your DB
  era: string | null;
  image_url: string | null;
  rarity: string | null;
  trader_value: string | null;
  is_pending: boolean;
  is_credited: boolean;
};

export default function MyCards() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);

      // Call the helper RPC that returns each claimed card with TIME status
      const { data, error } = await supabase
        .rpc("card_claims_with_time_status");

      if (!mounted) return;

      if (error) setError(error.message);
      else setRows((data as Row[]) ?? []);
      setLoading(false);
    })();

    return () => { mounted = false; };
  }, []);

  if (loading) return <div className="p-6">Loading your collection…</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  return (
    <div className="p-6">
      <div className="text-lg font-semibold mb-4">
        You have {rows.length} card{rows.length === 1 ? "" : "s"}
      </div>

      {rows.length === 0 ? (
        <div className="opacity-70">No cards yet — scan one to get started.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {rows.map((r, i) => {
            const badge = r.is_credited
              ? { text: "TIME: Credited", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200" }
              : r.is_pending
              ? { text: "TIME: Pending", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" }
              : { text: "TIME: Not submitted", cls: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200" };

            return (
              <div key={i} className="border rounded-xl overflow-hidden">
                {r.image_url && (
                  <img
                    src={r.image_url}
                    alt={r.name ?? "Card"}
                    className="w-full aspect-[3/4] object-cover"
                  />
                )}
                <div className="p-3 space-y-1">
                  <div className="font-medium">{r.name ?? "Unnamed Trader"}</div>
                  <div className="text-sm opacity-80">
                    {r.era ?? "—"} • {r.suit ?? "—"} {r.rank ?? "—"}
                  </div>
                  <div className="text-xs opacity-70">
                    Rarity: {r.rarity ?? "—"} · Value: {r.trader_value ?? "—"}
                  </div>
                  <div className="text-xs opacity-60">
                    Claimed {new Date(r.claimed_at).toLocaleString()}
                  </div>
                  <span className={`inline-block text-xs px-2 py-0.5 rounded ${badge.cls}`}>
                    {badge.text}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
