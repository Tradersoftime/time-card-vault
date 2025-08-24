// src/pages/MyCards.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";

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
  const location = useLocation();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();

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

  async function submitSelected() {
    try {
      setMsg(null);
      const chosen = Object.keys(selected).filter(id => selected[id]);
      if (chosen.length === 0) { setMsg("Select at least one card."); return; }

      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) { setMsg("Not signed in."); return; }

      const { data: redRow, error: redErr } = await supabase
        .from("redemptions")
        .insert({ user_id: userData.user.id })
        .select("id")
        .single();

      if (redErr || !redRow?.id) { setMsg(redErr?.message || "Could not create redemption."); return; }

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
  if (error) return <div className="p-6 text-destructive">Error: {error}</div>;

  return (
    <div className="p-6 space-y-8">
      {/* Summary */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Collection TIME" value={totalTimeAll} sub={`${totalCards} card${totalCards===1?"":"s"}`} />
        <Stat label="Credited TIME" value={totalTimeCredited} sub={`${credited.length} card${credited.length===1?"":"s"}`} />
        <Stat label="Ready to claim TIME" value={totalTimeReady} sub={`${ready.length} card${ready.length===1?"":"s"}`} />
        <Stat label="Pending TIME" value={totalTimePending} sub={`${pending.length} card${pending.length===1?"":"s"}`} />
      </section>

      {msg && (
        <div className="text-sm px-3 py-2 rounded bg-muted text-muted-foreground border">
          {msg}
        </div>
      )}

      {/* Unsubmitted (Ready for TIME) */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Unsubmitted (Ready for TIME)</h2>
          <div className="flex items-center gap-2">
            <button onClick={selectAllReady} className="border rounded px-3 py-1">
              Select All
            </button>
            <button onClick={clearSelection} className="border rounded px-3 py-1">
              Clear
            </button>
            <button onClick={submitSelected} className="border rounded px-3 py-1">
              Submit selected for TIME
            </button>
          </div>
        </div>

        {ready.length === 0 ? (
          <div className="opacity-70">No unsubmitted cards.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {ready.map((r) => {
              const checked = !!selected[r.card_id];
              return (
                <label
                  key={r.card_id}
                  className={`border rounded-xl overflow-hidden block cursor-pointer ${checked ? "ring-2 ring-emerald-500" : ""}`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={checked}
                    onChange={() => toggle(r.card_id)}
                  />
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
                      Rarity: {r.rarity ?? "—"} · Value: {r.trader_value ?? "—"} · TIME: {r.time_value ?? 0}
                    </div>
                    <div className="text-xs opacity-60">
                      Claimed {new Date(r.claimed_at).toLocaleString()}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </section>

      {/* Submitted (Pending TIME) */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Submitted (Pending TIME)</h2>
        {pending.length === 0 ? (
          <div className="opacity-70">No pending submissions.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {pending.map((r) => (
              <div key={r.card_id} className="border rounded-xl overflow-hidden">
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
                    Rarity: {r.rarity ?? "—"} · Value: {r.trader_value ?? "—"} · TIME: {r.time_value ?? 0}
                  </div>
                  <div className="text-xs opacity-60">
                    Claimed {new Date(r.claimed_at).toLocaleString()}
                  </div>
                  <span className="inline-block text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground border">
                    TIME: Pending
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Credited (Collection) */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Credited (Collection)</h2>
        {credited.length === 0 ? (
          <div className="opacity-70">No credited cards yet.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {credited.map((r) => (
              <div key={r.card_id} className="border rounded-xl overflow-hidden">
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
                    Rarity: {r.rarity ?? "—"} · Value: {r.trader_value ?? "—"} · TIME: {r.time_value ?? 0}
                  </div>
                  <div className="text-xs opacity-60">
                    Claimed {new Date(r.claimed_at).toLocaleString()}
                  </div>
                  <span className="inline-block text-xs px-2 py-0.5 rounded bg-accent text-accent-foreground border">
                    TIME: Credited
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ---- Tiny stat component ---- */
function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="border rounded-xl p-3">
      <div className="text-xs opacity-70">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {sub && <div className="text-xs opacity-60">{sub}</div>}
    </div>
  );
}
