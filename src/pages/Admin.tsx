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

  useEffect(() => {
    if (isAdmin !== true) return;
    loadQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  async function loadQueue() {
    setLoading(true);
    setError(null);
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

    if (error) setError(error.message);
    setItems((data as any) ?? []);
    setLoading(false);
  }

  async function markCredited(id: string) {
    const amtStr = window.prompt("TIME amount to credit?", "0");
    if (amtStr === null) return; // cancelled
    const amount = Number(amtStr);
    if (!Number.isFinite(amount)) {
      alert("Please enter a valid number.");
      return;
    }
    const ref = window.prompt("External reference / note (optional)") || null;

    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) {
      alert("Not signed in.");
      return;
    }

    const { error } = await supabase
      .from("redemptions")
      .update({
        status: "credited",
        credited_amount: amount,
        external_ref: ref,
        credited_at: new Date().toISOString(),
        credited_by: u.user.id,
      })
      .eq("id", id);

    if (error) alert(error.message);
    await loadQueue();
  }

  async function markRejected(id: string) {
    const reason = window.prompt("Reason (optional)") || null;

    const { error } = await supabase
      .from("redemptions")
      .update({
        status: "rejected",
        admin_notes: reason,
        credited_amount: null,
        credited_at: null,
        credited_by: null,
      })
      .eq("id", id);

    if (error) alert(error.message);
    await loadQueue();
  }

  if (isAdmin === null) return <div className="p-6">Loading…</div>;
  if (isAdmin === false) return <div className="p-6">Not authorized.</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin — Redemptions</h1>
        <button onClick={loadQueue} className="border rounded px-3 py-1">
          Refresh
        </button>
      </div>

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

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
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

              <div className="flex gap-2">
                <button
                  onClick={() => markCredited(r.id)}
                  className="border rounded px-3 py-1"
                >
                  Mark Credited
                </button>
                <button
                  onClick={() => markRejected(r.id)}
                  className="border rounded px-3 py-1"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
