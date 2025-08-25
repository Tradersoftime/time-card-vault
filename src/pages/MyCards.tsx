// src/pages/MyCards.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

type Row = {
  claimed_at: string;
  card_id: string;
  name: string | null;
  suit: string | null;
  rank: string | null;
  era: string | null;
  image_url: string | null;
  rarity: string | null;
  trader_value: string | null;
  time_value: number | null;
  is_pending: boolean;
  is_credited: boolean;
};

export default function MyCards() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();

  // Load
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      setMsg(null);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        navigate("/auth/login?next=/me/cards", { replace: true });
        return;
      }

      const { data, error } = await supabase.rpc("card_claims_with_time_status");
      if (!mounted) return;

      if (error) setError(error.message);
      else setRows((data as Row[]) ?? []);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [navigate]);

  async function reload() {
    setLoading(true);
    const { data, error } = await supabase.rpc("card_claims_with_time_status");
    if (error) setError(error.message);
    else setRows((data as Row[]) ?? []);
    setLoading(false);
  }

  // Groups
  const ready = useMemo(() => rows.filter(r => !r.is_pending && !r.is_credited), [rows]);
  const pending = useMemo(() => rows.filter(r => r.is_pending && !r.is_credited), [rows]);
  const credited = useMemo(() => rows.filter(r => r.is_credited), [rows]);

  // Totals
  const timeOf = (list: Row[]) => list.reduce((s, r) => s + (r.time_value ?? 0), 0);
  const totalCards = rows.length;
  const totalTimeAll = timeOf(rows);
  const totalTimeCredited = timeOf(credited);
  const totalTimeReady = timeOf(ready);
  const totalTimePending = timeOf(pending);

  // Selection helpers (only for "ready")
  function toggle(cardId: string) {
    setSelected(s => ({ ...s, [cardId]: !s[cardId] }));
  }
  function selectAllReady() {
    const next: Record<string, boolean> = {};
    ready.forEach(r => { next[r.card_id] = true; });
    setSelected(next);
  }
  function clearSelection() { setSelected({}); }

  // Submit selected cards for TIME
  async function submitSelected() {
    try {
      setMsg(null);
      const chosen = Object.keys(selected).filter(id => selected[id]);
      if (chosen.length === 0) { setMsg("Select at least one card."); return; }

      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) { setMsg("Not signed in."); return; }

      // Create a new redemption header
      const { data: redRow, error: redErr } = await supabase
        .from("redemptions")
        .insert({ user_id: userData.user.id })
        .select("id")
        .single();

      if (redErr || !redRow?.id) { setMsg(redErr?.message || "Could not create redemption."); return; }

      // Attach cards; ignore duplicates (already submitted by anyone)
      const payload = chosen.map(card_id => ({ redemption_id: redRow.id, card_id }));
      const { data: inserted, error: upsertErr } = await supabase
        .from("redemption_cards")
        .upsert(payload, { onConflict: "card_id", ignoreDuplicates: true })
        .select("card_id");

      if (upsertErr) {
        const txt = upsertErr.message || "";
        if ((upsertErr as any).code === "23505" || /duplicate key/i.test(txt)) {
          setMsg("⚠️ Already submitted or redeemed.");
        } else {
          setMsg(txt);
        }
        return;
      }

      const added = inserted?.length ?? 0;
      const skipped = chosen.length - added;

      if (added === 0) setMsg("⚠️ Already submitted or redeemed.");
      else setMsg(`✅ Submitted ${added} card${added === 1 ? "" : "s"} for TIME review${skipped > 0 ? ` (${skipped} already submitted)` : ""}!`);

      // Clear only those we actually submitted
      const nextSel = { ...selected };
      (inserted || []).forEach((row: any) => { nextSel[row.card_id] = false; });
      setSelected(nextSel);

      await reload();
    } catch (e: any) {
      const txt = e?.message || String(e);
      if (/duplicate key/i.test(txt)) setMsg("⚠️ Already submitted or redeemed.");
      else setMsg(txt);
    }
  }

  if (loading) return <div className="p-6">Loading your collection…</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  return (
    <div className="min-h-screen hero-gradient">
      <div className="container mx-auto p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent mb-3">
            My Collection
          </h1>
          <p className="text-muted-foreground">Manage your trading cards and submit them for TIME rewards</p>
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-panel p-6 rounded-2xl glow-primary">
            <div className="text-3xl font-bold text-primary">{totalTimeAll.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">Collection TIME</div>
            <div className="text-xs text-muted-foreground">{totalCards} card{totalCards === 1 ? "" : "s"}</div>
          </div>
          
          <div className="glass-panel p-6 rounded-2xl">
            <div className="text-3xl font-bold text-foreground">{totalTimeCredited.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">Credited TIME</div>
            <div className="text-xs text-muted-foreground">{credited.length} card{credited.length === 1 ? "" : "s"}</div>
          </div>
          
          <div className="glass-panel p-6 rounded-2xl glow-primary">
            <div className="text-3xl font-bold text-primary">{totalTimeReady.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">Ready to Claim</div>
            <div className="text-xs text-muted-foreground">{ready.length} card{ready.length === 1 ? "" : "s"}</div>
          </div>
          
          <div className="glass-panel p-6 rounded-2xl">
            <div className="text-3xl font-bold text-foreground">{totalTimePending.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">Pending TIME</div>
            <div className="text-xs text-muted-foreground">{pending.length} card{pending.length === 1 ? "" : "s"}</div>
          </div>
        </div>

        {msg && (
          <div className="glass-panel p-4 rounded-lg border-l-4 border-l-primary">
            <div className="text-primary text-sm">{msg}</div>
          </div>
        )}

        {/* Unsubmitted (Ready for TIME) */}
        <div className="glass-panel p-6 rounded-2xl">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-1">Ready for TIME Submission</h2>
              <p className="text-sm text-muted-foreground">Select cards to submit for TIME rewards</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={selectAllReady}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium glow-primary"
              >
                Select All ({ready.length})
              </button>
              <button
                onClick={clearSelection}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors text-sm font-medium"
              >
                Clear Selection
              </button>
              <button
                onClick={submitSelected}
                className="px-4 py-2 bg-gradient-to-r from-primary to-primary-glow text-primary-foreground rounded-lg hover:opacity-90 transition-opacity text-sm font-medium glow-primary"
              >
                Submit Selected for TIME
              </button>
            </div>
          </div>

          {ready.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No unsubmitted cards.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {ready.map((r) => {
                const checked = !!selected[r.card_id];
                return (
                  <div
                    key={r.card_id}
                    className={`glass-panel p-4 rounded-xl cursor-pointer transition-all transform hover:scale-105 ${
                      checked
                        ? 'border-2 border-primary glow-primary bg-primary/5'
                        : 'hover:bg-muted/10'
                    }`}
                    onClick={() => toggle(r.card_id)}
                  >
                    <div className="aspect-[3/4] bg-muted/20 rounded-lg mb-3 overflow-hidden">
                      {r.image_url && (
                        <img src={r.image_url} alt={r.name ?? "Card"} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="font-medium text-foreground truncate">{r.name ?? "Unnamed Trader"}</div>
                      <div className="text-sm text-muted-foreground">{r.era ?? "—"} • {r.suit ?? "—"} {r.rank ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        Rarity: {r.rarity ?? "—"} · Value: {r.trader_value ?? "—"}
                      </div>
                      <div className="text-sm font-medium text-primary">TIME: {r.time_value ?? 0}</div>
                      <div className="text-xs text-muted-foreground">Claimed {new Date(r.claimed_at).toLocaleString()}</div>
                      <span className="inline-block text-xs px-3 py-1 rounded-full font-medium bg-primary/20 text-primary border border-primary/30 glow-primary">
                        Ready
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Submitted (Pending TIME) */}
        <div className="glass-panel p-6 rounded-2xl">
          <h2 className="text-2xl font-semibold text-foreground mb-4">Submitted (Pending TIME)</h2>
          {pending.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No pending submissions.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {pending.map((r) => (
                <div key={r.card_id} className="glass-panel p-4 rounded-xl hover:bg-muted/5 transition-colors">
                  <div className="aspect-[3/4] bg-muted/20 rounded-lg mb-3 overflow-hidden">
                    {r.image_url && (
                      <img src={r.image_url} alt={r.name ?? "Card"} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="font-medium text-foreground truncate">{r.name ?? "Unnamed Trader"}</div>
                    <div className="text-sm text-muted-foreground">{r.era ?? "—"} • {r.suit ?? "—"} {r.rank ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">Rarity: {r.rarity ?? "—"} · Value: {r.trader_value ?? "—"}</div>
                    <div className="text-sm font-medium text-foreground">TIME: {r.time_value ?? 0}</div>
                    <div className="text-xs text-muted-foreground">Claimed {new Date(r.claimed_at).toLocaleString()}</div>
                    <span className="inline-block text-xs px-3 py-1 rounded-full font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                      Pending
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Claimed (Credited) */}
        <div className="glass-panel p-6 rounded-2xl">
          <h2 className="text-2xl font-semibold text-foreground mb-4">Claimed Cards</h2>
          {credited.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No claimed cards yet.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {credited.map((r) => (
                <div key={r.card_id} className="glass-panel p-4 rounded-xl hover:bg-muted/5 transition-colors glow-primary">
                  <div className="aspect-[3/4] bg-muted/20 rounded-lg mb-3 overflow-hidden">
                    {r.image_url && (
                      <img src={r.image_url} alt={r.name ?? "Card"} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="font-medium text-foreground truncate">{r.name ?? "Unnamed Trader"}</div>
                    <div className="text-sm text-muted-foreground">{r.era ?? "—"} • {r.suit ?? "—"} {r.rank ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">Rarity: {r.rarity ?? "—"} · Value: {r.trader_value ?? "—"}</div>
                    <div className="text-sm font-medium text-primary">TIME: {r.time_value ?? 0}</div>
                    <div className="text-xs text-muted-foreground">Claimed {new Date(r.claimed_at).toLocaleString()}</div>
                    <span className="inline-block text-xs px-3 py-1 rounded-full font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                      Credited
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="border rounded-xl p-3">
      <div className="text-xs opacity-70">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {sub && <div className="text-xs opacity-60">{sub}</div>}
    </div>
  );
}