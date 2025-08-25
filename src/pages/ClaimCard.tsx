import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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

  // Load preview info from Supabase RPC
  useEffect(() => {
    let active = true;
    (async () => {
      setMsg(null);
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
    return () => { active = false; };
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

  if (loading) {
    return (
      <div className="min-h-screen hero-gradient flex items-center justify-center p-6">
        <div className="glass-panel p-8 rounded-2xl text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
          <div className="text-foreground">Loading card details...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen hero-gradient flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent mb-2">
            Claim Your Card
          </h1>
          <p className="text-muted-foreground">Add this trading card to your collection</p>
        </div>
        
        {loading ? (
          <div className="glass-panel p-8 rounded-2xl text-center">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
            <div className="text-foreground">Loading card details...</div>
          </div>
        ) : (
          <div className="glass-panel p-8 rounded-2xl">
            {card ? (
              <div className="flex flex-col lg:flex-row items-start gap-8">
                <div className="flex-shrink-0 mx-auto lg:mx-0">
                  {card.image_url && (
                    <div className="glass-panel p-4 rounded-xl glow-primary">
                      <img
                        src={card.image_url}
                        alt={card.name ?? "Card"}
                        className="w-64 h-80 object-cover rounded-lg"
                      />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 space-y-4">
                  <div>
                    <h2 className="text-3xl font-bold text-foreground mb-2">{card.name}</h2>
                    <div className="text-lg text-muted-foreground mb-4">
                      {card.era} • {card.suit} {card.rank}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="glass-panel p-4 rounded-lg">
                      <div className="text-sm text-muted-foreground">Rarity</div>
                      <div className="text-lg font-medium text-foreground">{card.rarity ?? "—"}</div>
                    </div>
                    <div className="glass-panel p-4 rounded-lg">
                      <div className="text-sm text-muted-foreground">Trader Value</div>
                      <div className="text-lg font-medium text-foreground">{card.trader_value ?? "—"}</div>
                    </div>
                  </div>
                  
                  {card.status !== "active" && (
                    <div className="glass-panel p-4 rounded-lg border-l-4 border-l-amber-500">
                      <div className="text-amber-500">Status: {card.status}</div>
                    </div>
                  )}
                  
                  <button
                    onClick={handleClaim}
                    className="w-full py-4 px-6 bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-semibold rounded-xl hover:opacity-90 transition-opacity glow-primary"
                  >
                    Add to My Collection
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-muted-foreground">No card to display.</div>
              </div>
            )}

            {msg && (
              <div className="mt-6 glass-panel p-4 rounded-lg border-l-4 border-l-primary">
                <div className="text-primary">{msg}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
