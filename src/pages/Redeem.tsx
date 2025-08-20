// src/pages/Redeem.tsx
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

type ClaimedRow = {
  card_id: string;            // we'll map this from the join
  claimed_at: string;
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

export default function Redeem() {
  const [rows, setRows] = useState<ClaimedRow[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  // Load claimed cards for the current user
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setMsg(null);

      // Need the user id to create the redemption later
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        navigate("/auth/login?next=/redeem", { replace: true });
        return;
      }

      // Join user_cards -> cards to show thumbnails + meta
      const { data, error } = await supabase
        .from("user_cards")
        .select(
          `
          claimed_at,
          card_id,
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

      if (error) {
        setMsg(error.message);
      } else {
        setRows((data as any[])?.map((r) => ({ ...r })) ?? []);
      }
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  function toggle(cardId: string) {
    setSelected((s) => ({ ...s, [cardId]: !s[cardId] }));
  }

  function selectAll() {
    const next: Record<string, boolean> = {};
    rows.forEach((r) => (next[r.card_id] = true));
    setSelected(next);
  }

  function clearAll() {
    setSelected({});
  }

  async function submitRedemption() {
    setMsg(null);
    const chosen = Object.keys(selected).filter((id) => selected[id]);
    if (chosen.length === 0) {
      setMsg("Select at least one card.");
      return;
    }

    // Get user id
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      setMsg("Not signed in.");
      return;
    }

    // 1) Create a redemption row (must set user_id = auth.uid())
    const { data: redRow, error: redErr } = await supabase
      .from("redemptions")
      .insert({ user_id: userData.user.id }) // RLS: must equal auth.uid()
      .select("id")
      .single();

    if (redErr || !redRow?.id) {
      setMsg(redErr?.message || "Could not create redemption.");
      return;
    }

    // 2) Attach selected cards
    const payload = chosen.map((card_id) => ({
      redemption_id: redRow.id,
      card_id,
    }));

    const { error: linkErr } = await supabase
      .from("redemption_cards")
      .insert(payload);

    if (linkErr) {
      setMsg(linkErr.message);
      return;
    }

    setMsg("✅ Submitted for TIME review!");
    // Optional: go to a simple “submitted” screen or back to collection
    // navigate("/me/cards"); 
  }

  if (loading) return <div className="p-6">Loading…</div>;
  if (msg) <div className="p-6 text-sm">{msg}</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Submit cards for TIME</h1>

      <div className="flex gap-2">
        <button onClick={selectAll} className="border rounded px-3 py-1">
          Select All
        </button>
        <button onClick={clearAll} className="border rounded px-3 py-1">
          Clear
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="opacity-70">No claimed cards yet.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {rows.map((r, i) => {
            const c = r.cards || {};
            const checked = !!selected[r.card_id];
            return (
              <label
                key={i}
                className={`border rounded-xl overflow-hidden cursor-pointer block ${
                  checked ? "ring-2 ring-emerald-500" : ""
                }`}
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={checked}
                  onChange={() => toggle(r.card_id)}
                />
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
              </label>
            );
          })}
        </div>
      )}

      <button
        onClick={submitRedemption}
        className="border rounded px-4 py-2"
      >
        Submit for TIME
      </button>

      {msg && <div className="text-sm opacity-90">{msg}</div>}
    </div>
  );
}
