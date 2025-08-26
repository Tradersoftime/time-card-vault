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
  suit: string | null;
  rank: string | null;
  era: string | null;
  image_url: string | null;
  rarity: string | null;
  trader_value: string | null; // numeric text
  time_value: number | null;
  is_pending: boolean;
  is_credited: boolean;
};

/* ---------------- helpers ---------------- */

const RARITY_ORDER = ["Degen", "Trader", "Investor", "Market Maker", "Whale"] as const;
type RarityName = typeof RARITY_ORDER[number];

const DECK_RANKS = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"] as const;
const DECK_SUITS = ["Spades","Hearts","Clubs","Diamonds"] as const;

function prettyRarity(r?: string | null): string {
  if (!r) return "—";
  const s = r.trim().toLowerCase();
  const found = RARITY_ORDER.find(
    x => x.toLowerCase() === s || s.replace(/\s+/g, "") === x.toLowerCase().replace(/\s+/g, "")
  );
  return found ?? r;
}

function rarityRank(r?: string | null): number {
  const p = prettyRarity(r);
  const idx = RARITY_ORDER.indexOf(p as RarityName);
  return idx === -1 ? -1 : idx;
}

function toNum(s?: string | null): number {
  if (!s) return 0;
  const n = Number(String(s).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}
function formatNum(n: number): string {
  return Number(n).toLocaleString();
}

function canonicalSuit(s?: string | null): typeof DECK_SUITS[number] | "—" {
  if (!s) return "—";
  const v = s.trim().toLowerCase();
  if (v.startsWith("spa")) return "Spades";
  if (v.startsWith("hea")) return "Hearts";
  if (v.startsWith("clu")) return "Clubs";
  if (v.startsWith("dia")) return "Diamonds";
  return "—";
}
function canonRank(r?: string | null): typeof DECK_RANKS[number] | null {
  if (!r) return null;
  const v = r.trim().toLowerCase();
  if (v === "a" || v === "ace") return "A";
  if (v === "k" || v === "king") return "K";
  if (v === "q" || v === "queen") return "Q";
  if (v === "j" || v === "jack") return "J";
  if (v === "10" || v === "t" || v === "ten") return "10";
  if (/^[2-9]$/.test(v)) return v.toUpperCase() as any;
  return null;
}
function humanRank(r?: string | null): string {
  if (!r) return "—";
  const v = r.trim().toUpperCase();
  if (v === "A") return "Ace";
  if (v === "K") return "King";
  if (v === "Q") return "Queen";
  if (v === "J") return "Jack";
  return r;
}
function rankOfSuit(rank?: string | null, suit?: string | null): string {
  const s = canonicalSuit(suit);
  const rr = humanRank(rank);
  if (s === "—" && rr === "—") return "—";
  if (s === "—") return rr;
  if (rr === "—") return s;
  return `${rr} of ${s}`;
}

/** Build the best 52-card deck by bucket (rank × suit), picking the highest TLV in each bucket. */
function buildBestDeck52(all: Row[]) {
  const bestByBucket = new Map<string, Row>();
  for (const row of all) {
    const s = canonicalSuit(row.suit);
    const r = canonRank(row.rank);
    if (s === "—" || !r) continue; // only valid buckets
    const key = `${s}|${r}`;
    const curr = bestByBucket.get(key);
    if (!curr || toNum(row.trader_value) > toNum(curr.trader_value)) {
      bestByBucket.set(key, row);
    }
  }
  const chosen: Row[] = [];
  for (const s of DECK_SUITS) {
    for (const r of DECK_RANKS) {
      const hit = bestByBucket.get(`${s}|${r}`);
      if (hit) chosen.push(hit);
    }
  }
  const totalTLV = chosen.reduce((sum, c) => sum + toNum(c.trader_value), 0);
  return { chosen, totalTLV };
}

/* ---------------- page ---------------- */

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

  // Search + sort
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
        case "name":
          aValue = (a.name ?? "").toLowerCase(); bValue = (b.name ?? "").toLowerCase(); break;
        case "era":
          aValue = (a.era ?? "").toLowerCase(); bValue = (b.era ?? "").toLowerCase(); break;
        case "suit":
          aValue = canonicalSuit(a.suit); bValue = canonicalSuit(b.suit); break;
        case "rank":
          aValue = (a.rank ?? "").toString().toLowerCase(); bValue = (b.rank ?? "").toString().toLowerCase(); break;
        case "rarity":
          aValue = rarityRank(a.rarity); bValue = rarityRank(b.rarity); break;
        case "time_value":
          aValue = a.time_value || 0; bValue = b.time_value || 0; break;
        case "trader_value":
          aValue = toNum(a.trader_value); bValue = toNum(b.trader_value); break;
        case "claimed_at":
        default:
          aValue = new Date(a.claimed_at).getTime(); bValue = new Date(b.claimed_at).getTime(); break;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  };

  const processCards = (cards: Row[]) => sortCards(filterCards(cards));

  // Groups (with search + sort)
  const ready    = useMemo(() => processCards(rows.filter(r => !r.is_pending && !r.is_credited)), [rows, searchTerm, sortBy, sortDirection]);
  const pending  = useMemo(() => processCards(rows.filter(r =>  r.is_pending && !r.is_credited)), [rows, searchTerm, sortBy, sortDirection]);
  const credited = useMemo(() => processCards(rows.filter(r =>  r.is_credited)),                  [rows, searchTerm, sortBy, sortDirection]);

  // Totals
  const timeOf = (list: Row[]) => list.reduce((s, r) => s + (r.time_value ?? 0), 0);
  const totalCards         = rows.length;
  const totalTimeAll       = timeOf(rows);
  const totalTimeCredited  = timeOf(credited);
  const totalTimeReady     = timeOf(ready);
  const totalTimePending   = timeOf(pending);

  // Best 52-card deck (by buckets rank×suit; highest TLV each bucket)
  const { chosen: deck52, totalTLV: deck52TLV } = useMemo(() => buildBestDeck52(rows), [rows]);

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

        {/* Best Deck (52) TLV */}
        <div className="glass-panel p-6 rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-semibold text-foreground">
                {formatNum(deck52TLV)} TLV
              </div>
              <div className="text-sm text-muted-foreground">
                Best 52-Card Deck TLV (using {deck52.length}/52 slots)
              </div>
            </div>
            {deck52.length < 52 && (
              <div className="text-xs text-muted-foreground">
                Missing {52 - deck52.length} rank×suit slot{52 - deck52.length === 1 ? "" : "s"}
              </div>
            )}
          </div>
        </div>

        {msg && (
          <div className="glass-panel p-4 rounded-lg border-l-4 border-l-primary">
            <div className="text-primary text-sm">{msg}</div>
          </div>
        )}

        {/* Search and Sort Controls */}
        <div className="glass-panel p-6 rounded-2xl">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Filter & Sort Collection</h3>
              <p className="text-sm text-muted-foreground">Search and organize your cards</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              {/* Search */}
              <div className="relative flex-1 sm:min-w-[300px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, era, suit, rank, rarity..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-background/50 border-primary/20 focus:border-primary"
                />
              </div>
              
              {/* Sort */}
              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[200px] bg-background/50 border-primary/20">
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
                    <SelectItem value="trader_value">Trader Leverage (TLV)</SelectItem>
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
          
          {/* Results Summary */}
          {searchTerm && (
            <div className="mt-4 pt-4 border-t border-primary/20">
              <div className="text-sm text-muted-foreground">
                Search results: <span className="text-primary font-medium">{ready.length + pending.length + credited.length}</span> cards found
                {searchTerm && (
                  <span className="ml-2">
                    for "<span className="text-foreground font-medium">{searchTerm}</span>"
                    <button 
                      onClick={() => setSearchTerm("")}
                      className="ml-2 text-primary hover:text-primary/80 text-xs underline"
                    >
                      Clear
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

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
                      checked ? 'border-2 border-primary glow-primary bg-primary/5' : 'hover:bg-muted/10'
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
                      <div className="text-sm text-muted-foreground">{`${r.era ?? "—"} ${prettyRarity(r.rarity)}`}</div>
                      <div className="text-sm text-muted-foreground">{rankOfSuit(r.rank, r.suit)}</div>
                      <div className="text-sm text-foreground">{formatNum(toNum(r.trader_value))} TLV</div>
                      <div className="text-sm text-primary">{(r.time_value ?? 0).toLocaleString()} TIME</div>
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
                    <div className="text-sm text-muted-foreground">{`${r.era ?? "—"} ${prettyRarity(r.rarity)}`}</div>
                    <div className="text-sm text-muted-foreground">{rankOfSuit(r.rank, r.suit)}</div>
                    <div className="text-sm text-foreground">{formatNum(toNum(r.trader_value))} TLV</div>
                    <div className="text-sm text-primary">{(r.time_value ?? 0).toLocaleString()} TIME</div>
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
                    <div className="text-sm text-muted-foreground">{`${r.era ?? "—"} ${prettyRarity(r.rarity)}`}</div>
                    <div className="text-sm text-muted-foreground">{rankOfSuit(r.rank, r.suit)}</div>
                    <div className="text-sm text-foreground">{formatNum(toNum(r.trader_value))} TLV</div>
                    <div className="text-sm text-primary">{(r.time_value ?? 0).toLocaleString()} TIME</div>
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
