// src/pages/MyCards.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

type Row = {
  claimed_at: string;
  card_id: string;
  name: string | null;
  suit: string | null;  // e.g., "Hearts", "♥", "H"
  rank: string | null;  // e.g., "2","10","J","Q","K","A","Ace","Jack"
  era: string | null;
  image_url: string | null;
  rarity: string | null;
  trader_value: string | null; // numeric-like string
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
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("claimed_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
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

  // ---- Helpers for parsing/formatting trader_value ----
  const toNum = (v?: string | null) =>
    Number(String(v ?? "0").replace(/[^0-9.\-]/g, "")) || 0;
  const formatNum = (n: number) => n.toLocaleString();

  // ---- Suit / Rank normalization ----
  const SUITS = ["clubs", "diamonds", "hearts", "spades"] as const;
  type SuitKey = typeof SUITS[number];

  function normSuit(s?: string | null): SuitKey | null {
    if (!s) return null;
    const x = s.toString().trim().toLowerCase();
    if (/^c(lubs)?$|^♣$/.test(x)) return "clubs";
    if (/^d(iamonds)?$|^♦$/.test(x)) return "diamonds";
    if (/^h(earts)?$|^♥$/.test(x)) return "hearts";
    if (/^s(pades)?$|^♠$/.test(x)) return "spades";
    return null;
  }

  const RANKS = ["A","K","Q","J","10","9","8","7","6","5","4","3","2"] as const; // order not used for calc, but canonical list
  type RankKey = typeof RANKS[number];

  function normRank(r?: string | null): RankKey | null {
    if (!r) return null;
    const x = r.toString().trim().toLowerCase();
    if (x === "a" || x === "ace" || x === "1") return "A"; // treat Ace like A
    if (x === "k" || x === "king") return "K";
    if (x === "q" || x === "queen") return "Q";
    if (x === "j" || x === "jack") return "J";
    if (x === "10" || x === "ten") return "10";
    if (/^[2-9]$/.test(x)) return x.toUpperCase() as RankKey;
    return null;
  }

  // Search & Sort
  const filterCards = (cards: Row[]) => {
    if (!searchTerm) return cards;
    const term = searchTerm.toLowerCase();
    return cards.filter(card =>
      (card.name?.toLowerCase().includes(term)) ||
      (card.era?.toLowerCase().includes(term)) ||
      (card.suit?.toLowerCase().includes(term)) ||
      (card.rank?.toLowerCase().includes(term)) ||
      (card.rarity?.toLowerCase().includes(term)) ||
      (card.trader_value?.toLowerCase().includes(term))
    );
  };

  const sortCards = (cards: Row[]) => {
    return [...cards].sort((a, b) => {
      let aValue: any, bValue: any;
      switch (sortBy) {
        case 'name': aValue = a.name?.toLowerCase() || ''; bValue = b.name?.toLowerCase() || ''; break;
        case 'era': aValue = a.era?.toLowerCase() || ''; bValue = b.era?.toLowerCase() || ''; break;
        case 'suit': aValue = a.suit?.toLowerCase() || ''; bValue = b.suit?.toLowerCase() || ''; break;
        case 'rank': aValue = a.rank?.toLowerCase() || ''; bValue = b.rank?.toLowerCase() || ''; break;
        case 'rarity': aValue = a.rarity?.toLowerCase() || ''; bValue = b.rarity?.toLowerCase() || ''; break;
        case 'time_value': aValue = a.time_value || 0; bValue = b.time_value || 0; break;
        case 'trader_value': aValue = toNum(a.trader_value); bValue = toNum(b.trader_value); break;
        case 'claimed_at':
        default:
          aValue = new Date(a.claimed_at).getTime();
          bValue = new Date(b.claimed_at).getTime();
          break;
      }
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const processCards = (cards: Row[]) => sortCards(filterCards(cards));

  // Groups
  const ready = useMemo(() => processCards(rows.filter(r => !r.is_pending && !r.is_credited)), [rows, searchTerm, sortBy, sortDirection]);
  const pending = useMemo(() => processCards(rows.filter(r => r.is_pending && !r.is_credited)), [rows, searchTerm, sortBy, sortDirection]);
  const credited = useMemo(() => processCards(rows.filter(r => r.is_credited)), [rows, searchTerm, sortBy, sortDirection]);

  // TIME totals
  const timeOf = (list: Row[]) => list.reduce((s, r) => s + (r.time_value ?? 0), 0);
  const totalCards = rows.length;
  const totalTimeAll = timeOf(rows);
  const totalTimeCredited = timeOf(credited);
  const totalTimeReady = timeOf(ready);
  const totalTimePending = timeOf(pending);

  // NEW: Best Full Deck (52) — one per (rank × suit), pick highest Trader Value per slot
  const bestDeck52 = useMemo(() => {
    // slot -> best card
    type SlotKey = `${RankKey}-${SuitKey}`;
    const best: Record<SlotKey, { value: number; row: Row }> = {} as any;

    for (const r of rows) {
      const rank = normRank(r.rank);
      const suit = normSuit(r.suit);
      if (!rank || !suit) continue;

      const key = `${rank}-${suit}` as SlotKey;
      const val = toNum(r.trader_value);
      const prev = best[key];
      if (!prev || val > prev.value) {
        best[key] = { value: val, row: r };
      }
    }

    // Sum all filled slots (max 52)
    let total = 0;
    let count = 0;
    for (const rank of RANKS) {
      for (const suit of SUITS) {
        const key = `${rank}-${suit}` as SlotKey;
        if (best[key]) {
          total += best[key].value;
          count += 1;
        }
      }
    }

    return { total, count }; // count may be < 52 if some slots missing
  }, [rows]);

  // Selection helpers (only for "ready")
  function toggle(cardId: string) { setSelected(s => ({ ...s, [cardId]: !s[cardId] })); }
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

        {/* NEW: Best Full Deck (52) */}
        <div className="glass-panel p-6 rounded-2xl border border-primary/20">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
            <div>
              <div className="text-sm text-muted-foreground">One per rank × suit</div>
              <div className="text-2xl font-semibold text-foreground">Best Full Deck (52) — Trader Value</div>
              <div className="text-xs text-muted-foreground">
                Picks the highest Trader Value for each slot (2–10, J, Q, K, A × ♣ ♦ ♥ ♠) from your collection
              </div>
            </div>
            <div className="text-3xl font-extrabold text-primary">
              {formatNum(bestDeck52.total)}
              <span className="ml-2 text-xs font-medium text-muted-foreground align-super">
                ({bestDeck52.count} of 52)
              </span>
            </div>
          </div>
        </div>

        {msg && (
          <div className="glass-panel p-4 rounded-lg border-l-4 border-l-primary">
            <div className="text-primary text-sm">{msg}</div>
          </div>
        )}

        {/* Filter & Sort */}
        <div className="glass-panel p-6 rounded-2xl">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Filter & Sort Collection</h3>
              <p className="text-sm text-muted-foreground">Search and organize your cards</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:min-w-[300px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, era, suit, rank, rarity..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-background/50 border-primary/20 focus:border-primary"
                />
              </div>
              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px] bg-background/50 border-primary/20">
                    <SelectValue placeholder="Sort by..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-primary/20">
                    <SelectItem value="claimed_at">Date Claimed</SelectItem>
                    <SelectItem value="name">Card Name</SelectItem>
                    <SelectItem value="era">Era</SelectItem>
                    <SelectItem value="suit">Suit</SelectItem>
                    <SelectItem value="rank">Rank</SelectItem>
                    <SelectItem value="rarity">Rarity</SelectItem>
                    <SelectItem value="time_value">TIME Value</SelectItem>
                    <SelectItem value="trader_value">Trader Value</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                  className="px-3 bg-background/50 border-primary/20 hover:bg-primary/10"
                  title={`Sort ${sortDirection === 'asc' ? 'Ascending' : 'Descending'}`}
                >
                  <ArrowUpDown className={`h-4 w-4 transition-transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                </Button>
              </div>
            </div>
          </div>
          {searchTerm && (
            <div className="mt-4 pt-4 border-t border-primary/20">
              <div className="text-sm text-muted-foreground">
                Search results: <span className="text-primary font-medium">{ready.length + pending.length + credited.length}</span> cards found
                <span className="ml-2">
                  for "<span className="text-foreground font-medium">{searchTerm}</span>"
                  <button 
                    onClick={() => setSearchTerm("")}
                    className="ml-2 text-primary hover:text-primary/80 text-xs underline"
                  >
                    Clear
                  </button>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Ready */}
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
                      checked ? 'border-2 border-primary glow-primary bg-primary/5' : 'hover:bg-muted/10'
                    }`}
                    onClick={() => toggle(r.card_id)}
                  >
                    <div className="aspect-[3/4] bg-muted/20 rounded-lg mb-3 overflow-hidden">
                      {r.image_url && (<img src={r.image_url} alt={r.name ?? "Card"} className="w-full h-full object-cover" />)}
                    </div>
                    <div className="space-y-1">
                      <div className="font-medium text-foreground truncate">{r.name ?? "Unnamed Trader"}</div>
                      <div className="text-sm text-muted-foreground">{r.era ?? "—"} • {r.suit ?? "—"} {r.rank ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">Rarity: {r.rarity ?? "—"} · Value: {r.trader_value ?? "—"}</div>
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

        {/* Pending */}
        <div className="glass-panel p-6 rounded-2xl">
          <h2 className="text-2xl font-semibold text-foreground mb-4">Submitted (Pending TIME)</h2>
          {pending.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No pending submissions.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {pending.map((r) => (
                <div key={r.card_id} className="glass-panel p-4 rounded-xl hover:bg-muted/5 transition-colors">
                  <div className="aspect-[3/4] bg-muted/20 rounded-lg mb-3 overflow-hidden">
                    {r.image_url && (<img src={r.image_url} alt={r.name ?? "Card"} className="w-full h-full object-cover" />)}
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

        {/* Credited */}
        <div className="glass-panel p-6 rounded-2xl">
          <h2 className="text-2xl font-semibold text-foreground mb-4">Claimed Cards</h2>
          {credited.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No claimed cards yet.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {credited.map((r) => (
                <div key={r.card_id} className="glass-panel p-4 rounded-xl hover:bg-muted/5 transition-colors glow-primary">
                  <div className="aspect-[3/4] bg-muted/20 rounded-lg mb-3 overflow-hidden">
                    {r.image_url && (<img src={r.image_url} alt={r.name ?? "Card"} className="w-full h-full object-cover" />)}
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
