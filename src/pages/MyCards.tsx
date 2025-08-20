import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  claimed_at: string;
  // Supabase returns the related "cards" row (one-to-one) thanks to the FK.
  // We'll type it loosely to avoid TS mismatches across setups.
  cards: {
    name?: string | null;
    suit?: string | null;
    rank?: string | null;
    era?: string | null;
    image_url?: string | null;
    rarity?: string | null;
    trader_value?: string | null;
  } | any;
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
      const { data, error } = await supabase
        .from("user_cards")
        .select(
          `
          claimed_at,
          cards(
            name,
            suit,
            rank,
            era,
            image_url,
            rarity,
            trader_value
          )
        `
        )
        .order("claimed_at", { ascending: false });

      if (!mounted) return;

      if (error) setError(error.message);
      else setRows((data as Row[]) ?? []);
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
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
            const c = r.cards || {};
            return (
              <div key={i} className="border rounded-xl overflow-hidden">
                {c.image_url && (
                  <img
                    src={c.image_url}
                    alt={c.name ?? "Card"}
                    className="w-full aspect-[3/4] object-cover"
                  />
                )}
                <div className="p-3">
                  <div className="font-medium">{c.name ?? "Unnamed Trader"}</div>
                  <div className="text-sm opacity-80">
                    {c.era ?? "—"} • {c.suit ?? "—"} {c.rank ?? "—"}
                  </div>
                  <div className="text-xs opacity-70">
                    Rarity: {c.rarity ?? "—"} · Value: {c.trader_value ?? "—"}
                  </div>
                  <div className="text-xs opacity-60 mt-1">
                    Claimed {new Date(r.claimed_at).toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
