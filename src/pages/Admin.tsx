import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type RedCard = {
  card_id: string;
  cards: {
    name?: string | null;
    image_url?: string | null;
    era?: string | null;
    suit?: string | null;
    rank?: string | null;
    rarity?: string | null;
    trader_value?: string | null;
  } | null;
};

type RedItem = {
  id: string;
  user_id: string;
  status: string;
  submitted_at: string;
  redemption_cards: RedCard[];
};

export default function Admin() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<RedItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Check admin
  useEffect(() => {
    let mounted = true;
    (async () => {
      setError(null);
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) {
        if (mounted) setIsAdmin(false);
        return;
      }
      const { data, error } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", u.user.id)
        .maybeSingle();
      if (!mounted) return;
      if (error) setError(error.message);
      setIsAdmin(!!data);
    })();
    return () => { mounted = false; };
  }, []);

  // Load pending queue (after admin confirmed)
  useEffect(() => {
    if (isAdmin !== true) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("redemptions")
        .select(`
          id,
          user_id,
          status,
          submitted_at,
          redemption_cards (
            card_id,
            cards (
              name,
              image_url,
              era,
              suit,
              rank,
              rarity,
              trader_value
            )
          )
        `)
        .eq("status", "pending")
        .order("submitted_at", { ascending: true });

      if (!mounted) return;
      if (error) setError(error.message);
      setItems((data as RedItem[]) ?? []);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [isAdmin]);

  if (isAdmin === null) return <div className="p-6">Loading…</div>;
  if (isAdmin === false) return <div className="p-6">Not authorized.</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Admin — Redemptions</h1>

      {loading ? (
        <div>Loading queue…</div>
      ) : items.length === 0 ? (
        <div className="opacity-70">No pending redemptions.</div>
      ) : (
        <div className="space-y-4">
          {items.map((r) => (
            <div key={r.id} className="border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="font-medium">
                  Redemption <span className="opacity-70">{r.id.slice(0, 8)}…</span>
                </div>
                <div className="text-sm opacity-70">
                  Submitted {new Date(r.submitted_at).toLocaleString()}
                </div>
              </div>

              <div className="text-sm opacity-80 mb-2">
                User: <code className="opacity-90">{r.user_id}</code> • Cards: {r.redemption_cards?.length ?? 0}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {r.redemption_cards?.map((rc) => {
                  const c = rc.cards || {};
                  return (
                    <div key={rc.card_id} className="border rounded-lg overflow-hidden">
                      {c.image_url && (
                        <img
                          src={c.image_url}
                          alt={c.name ?? "Card"}
                          className="w-full aspect-[3/4] object-cover"
                        />
                      )}
                      <div className="p-2 text-sm">
                        <div className="font-medium truncate">{c.name ?? "—"}</div>
                        <div className="opacity-70">
                          {c.era ?? "—"} • {c.suit ?? "—"} {c.rank ?? "—"}
                        </div>
                        <div className="text-xs opacity-60">
                          Rarity: {c.rarity ?? "—"} · Value: {c.trader_value ?? "—"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Buttons to mark credited/rejected will be added next step */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
