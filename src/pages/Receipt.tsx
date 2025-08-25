// src/pages/Receipt.tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type CardObj = {
  card_id: string;
  name: string | null;
  image_url: string | null;
  era: string | null;
  suit: string | null;
  rank: string | null;
  rarity: string | null;
  trader_value: string | null;
};

type ReceiptRow = {
  id: string;
  status: "pending" | "credited" | "rejected";
  submitted_at: string;
  credited_amount: number | null;
  credited_at: string | null;
  external_ref: string | null;
  admin_notes: string | null;
  user_id: string;
  user_email: string | null;
  cards: CardObj[] | null;
};

export default function Receipt() {
  const { id } = useParams();
  const [row, setRow] = useState<ReceiptRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!id) { setMsg("Missing receipt id."); setLoading(false); return; }
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) {
        // Let anonymous view? Uncomment next line to require login:
        // window.location.href = `/auth/login?next=/receipt/${encodeURIComponent(id)}`;
      }
      const { data, error } = await supabase.rpc("redemption_receipt", { p_id: id });
      if (!mounted) return;
      if (error) setMsg(error.message);
      else if (!data || (Array.isArray(data) && data.length === 0)) setMsg("Not found or not authorized.");
      else setRow((Array.isArray(data) ? data[0] : data) as ReceiptRow);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [id]);

  function copyLink() {
    const url = window.location.href;
    navigator.clipboard?.writeText(url);
    setMsg("Link copied to clipboard.");
  }

  function StatusBadge({ s }: { s: ReceiptRow["status"] }) {
    const map: Record<ReceiptRow["status"], string> = {
      pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 border border-amber-200 dark:border-amber-800",
      credited: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 glow-primary",
      rejected: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200 border border-rose-200 dark:border-rose-800",
    };
    return <span className={`inline-block text-sm px-3 py-1 rounded-full font-medium ${map[s]}`}>{s.toUpperCase()}</span>;
  }

  if (loading) return (
    <div className="min-h-screen hero-gradient flex items-center justify-center p-6">
      <div className="glass-panel p-8 rounded-2xl text-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
        <div className="text-foreground">Loading receipt...</div>
      </div>
    </div>
  );
  if (msg && !row) return (
    <div className="min-h-screen hero-gradient flex items-center justify-center p-6">
      <div className="glass-panel p-8 rounded-2xl text-center">
        <div className="text-destructive">{msg}</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen hero-gradient">
      <div className="container mx-auto p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent mb-2">
            Redemption Receipt
          </h1>
          <p className="text-muted-foreground">Your TIME redemption summary and details</p>
        </div>

        <div className="flex justify-center gap-4">
          <button 
            onClick={() => window.print()} 
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors text-sm font-medium"
          >
            Print Receipt
          </button>
          <button 
            onClick={copyLink} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium glow-primary"
          >
            Copy Link
          </button>
        </div>

        {msg && (
          <div className="glass-panel p-4 rounded-lg border-l-4 border-l-primary">
            <div className="text-primary text-sm">{msg}</div>
          </div>
        )}

        {row && (
          <div className="glass-panel p-8 rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="text-sm text-muted-foreground">
                Receipt ID: <span className="font-mono text-foreground">{row.id}</span>
              </div>
              <StatusBadge s={row.status} />
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="glass-panel p-4 rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Submitted</div>
                <div className="text-foreground">{new Date(row.submitted_at).toLocaleString()}</div>
              </div>
              <div className="glass-panel p-4 rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">User</div>
                <div className="text-foreground">{row.user_email ?? row.user_id}</div>
              </div>
              <div className="glass-panel p-4 rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Credited Amount</div>
                <div className="text-2xl font-bold text-primary">{row.credited_amount ?? "—"}</div>
              </div>
              <div className="glass-panel p-4 rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Credited At</div>
                <div className="text-foreground">{row.credited_at ? new Date(row.credited_at).toLocaleString() : "—"}</div>
              </div>
              <div className="glass-panel p-4 rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">External Ref</div>
                <div className="text-foreground">{row.external_ref ?? "—"}</div>
              </div>
              <div className="glass-panel p-4 rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Admin Notes</div>
                <div className="text-foreground">{row.admin_notes ?? "—"}</div>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-xl">
              <h3 className="text-xl font-semibold text-foreground mb-4">Cards in this Redemption</h3>
              {(!row.cards || row.cards.length === 0) ? (
                <div className="text-center py-8 text-muted-foreground">No cards found.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {row.cards.map((c) => (
                    <div key={c.card_id} className="glass-panel p-4 rounded-lg hover:bg-muted/5 transition-colors">
                      <div className="aspect-[3/4] bg-muted/20 rounded-lg mb-3 overflow-hidden">
                        {c.image_url && (
                          <img src={c.image_url} alt={c.name ?? "Card"} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="font-medium text-foreground truncate">{c.name ?? "—"}</div>
                        <div className="text-sm text-muted-foreground">
                          {c.era ?? "—"} • {c.suit ?? "—"} {c.rank ?? "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Rarity: {c.rarity ?? "—"} · Value: {c.trader_value ?? "—"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
