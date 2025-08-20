import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

type Card = {
  id: string;
  code: string;
  name: string | null;
  rarity: string | null;
  suit: string | null;
  rank: string | null;          // rank is text in your DB
  trader_value: string | null;
  era: string | null;
  image_url: string | null;
  status: string | null;
  created_at: string;
};

export default function ClaimCard() {
  const qs = new URLSearchParams(useLocation().search);
  const code = qs.get("code") ?? "";

  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  // Load preview info
  useEffect(() => {
    let active = true;
    (async () => {
      if (!code) {
        setMsg("Missing card code.");
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.rpc("card_preview", { p_code: code });
      if (!active) return;
      if (error) setMsg(error.message);
      else if (!data || data.length === 0) setMsg("Card not found.");
      else setCard(data[0] as Card);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [code]);

  async function handleClaim() {
    setMsg(null);
    const { data, error } = await supabase.rpc("claim_card", { p_code: code });
    if (error) {
      setMsg(error.message); // e.g., not_authenticated
    } else if (data?.ok) {
      setMsg("✅ Added to your collection!");
    } else if (data?.error === "already_claimed") {
      setMsg("⚠️ Already claimed.");
    } else {
      setMsg("Something went wrong.");
    }
  }

  if (loading) return <div className="p-8 text-center opacity-80">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {card ? (
        <div className="flex items-start gap-6">
          {card.image_url && (
            <img
              src={card.image_url}
              alt={card.name ?? "Card"}
              className="w-40 h-60 object-cover rounded-xl border"
            />
          )}
          <div className="space-y-1">
            <div className="text-2xl font-semibold">{card.name}</div>
            <div className="opacity-80">
              {card.era} • {card.suit} {card.rank}
            </div>
            <div className="opacity-80">Rarity: {card.rarity ?? "—"}</div>
            <div className="opacity-80">Trader Value: {card.trader_value ?? "—"}</div>
            {card.status !== "active" && (
              <div className="text-amber-500">Status: {card.status}</div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-4 rounded border">No card to display.</div>
      )}

      <button
        onClick={handleClaim}
        className="px-5 py-2 rounded-xl border hover:opacity-90 transition"
      >
        Add to My Collection
      </button>

      {msg && <div className="text-sm opacity-90">{msg}</div>}
    </div>
  );
}
