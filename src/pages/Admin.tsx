// src/pages/Admin.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/* ---------- Types ---------- */

type PendingCard = {
  card_id: string;
  name: string | null;
  image_url: string | null;
  era: string | null;
  suit: string | null;
  rank: string | null;
  rarity: string | null;
  trader_value: string | null;
  time_value: number | null;
};

type PendingRedemption = {
  id: string;
  user_id: string;
  email: string | null;
  submitted_at: string;
  card_count: number;
  total_time_value: number;
  cards: PendingCard[];
};

type BlockedRow = {
  user_id: string;
  email: string | null;
  reason: string | null;
  blocked_at: string;
  blocked_by: string | null;
  blocked_by_email: string | null;
};

type ScanRow = {
  created_at: string;
  user_id: string;
  email: string | null;
  code: string;
  card_id: string | null;
  outcome:
    | "claimed"
    | "already_owner"
    | "owned_by_other"
    | "not_found"
    | "blocked"
    | "error";
};

/** Raw rows from admin_recent_credited (one row per credited card) */
type CreditedRow = {
  redemption_id: string;
  credited_at: string | null;
  user_id: string;
  user_email: string | null;
  card_id: string | null;
  card_code: string | null;
  amount_time: number | null;
  credited_count: number; // total cards in the redemption (same number repeated per row)
};

/* ---------- Page ---------- */

export default function Admin() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Pending redemptions (grouped by user)
  const [pending, setPending] = useState<PendingRedemption[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [selectedReds, setSelectedReds] = useState<Record<string, boolean>>({});
  const [toolMsg, setToolMsg] = useState<string | null>(null);

  // Per-redemption per-card selection
  const [cardSel, setCardSel] = useState<Record<string, Record<string, boolean>>>({});

  // Blocked users
  const [blocked, setBlocked] = useState<BlockedRow[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);

  // Scan log + sort
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [loadingScans, setLoadingScans] = useState(false);
  const [scanQuery, setScanQuery] = useState("");
  const [scanOutcome, setScanOutcome] = useState<ScanRow["outcome"] | "all">("all");
  const [scanSortKey, setScanSortKey] = useState<"created_at" | "email">("created_at");
  const [scanSortDir, setScanSortDir] = useState<"asc" | "desc">("desc");

  // Receipt banner
  const [lastReceiptUrl, setLastReceiptUrl] = useState<string | null>(null);

  // Credited log (rows per card) + filter/sort
  const [creditedRows, setCreditedRows] = useState<CreditedRow[]>([]);
  const [loadingCredited, setLoadingCredited] = useState(false);
  const [credQuery, setCredQuery] = useState("");
  const [credSortKey, setCredSortKey] = useState<
    "credited_at" | "user_email" | "credited_count" | "total_time" | "redemption_id"
  >("credited_at");
  const [credSortDir, setCredSortDir] = useState<"asc" | "desc">("desc");

  /* ---- Admin check ---- */
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
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (isAdmin !== true) return;
    loadPending();
    loadBlocked();
    loadScans();
    loadCredited();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  /* ---- Loaders ---- */
  async function loadPending() {
    setLoadingPending(true);
    setSelectedReds({});
    setCardSel({});
    setError(null);
    const { data, error } = await supabase.rpc("admin_pending_redemptions");
    if (error) setError(error.message);
    const rows = (data as PendingRedemption[]) ?? [];
    // default select all cards per redemption
    const initSel: Record<string, Record<string, boolean>> = {};
    rows.forEach((r) => {
      const m: Record<string, boolean> = {};
      r.cards?.forEach((c) => {
        if (c.card_id) m[c.card_id] = true;
      });
      initSel[r.id] = m;
    });
    setCardSel(initSel);
    setPending(rows);
    setLoadingPending(false);
  }

  async function loadBlocked() {
    setLoadingBlocked(true);
    const { data, error } = await supabase.rpc("admin_list_blocked");
    if (error) setToolMsg(error.message);
    setBlocked((data as BlockedRow[]) ?? []);
    setLoadingBlocked(false);
  }

  async function loadScans() {
    setLoadingScans(true);
    const { data, error } = await supabase.rpc("admin_scan_events", { p_limit: 200 });
    if (error) setToolMsg(error.message);
    setScans((data as ScanRow[]) ?? []);
    setLoadingScans(false);
  }

  async function loadCredited() {
    setLoadingCredited(true);
    const { data, error } = await supabase.rpc("admin_recent_credited", { p_limit: 500 });
    if (error) setToolMsg(error.message);
    setCreditedRows((data as CreditedRow[]) ?? []);
    setLoadingCredited(false);
  }

  /* ---- Selection helpers (redemptions) ---- */
  function toggleRed(id: string) {
    setSelectedReds((s) => ({ ...s, [id]: !s[id] }));
  }
  function selectAllUserReds(userId: string) {
    const next = { ...selectedReds };
    pending.filter((r) => r.user_id === userId).forEach((r) => {
      next[r.id] = true;
    });
    setSelectedReds(next);
  }
  function clearRedSelection() {
    setSelectedReds({});
  }

  /* ---- Per-card selection helpers ---- */
  function toggleCard(redId: string, cardId: string) {
    setCardSel((map) => ({
      ...map,
      [redId]: { ...(map[redId] || {}), [cardId]: !(map[redId]?.[cardId]) },
    }));
  }
  function selectAllCards(redId: string, cards: PendingCard[]) {
    const next: Record<string, boolean> = {};
    cards.forEach((c) => {
      if (c.card_id) next[c.card_id] = true;
    });
    setCardSel((map) => ({ ...map, [redId]: next }));
  }
  function selectNoneCards(redId: string) {
    setCardSel((map) => ({ ...map, [redId]: {} }));
  }

  function selectedSummary(red: PendingRedemption) {
    const m = cardSel[red.id] || {};
    let count = 0,
      total = 0;
    for (const c of red.cards || []) {
      if (c.card_id && m[c.card_id]) {
        count++;
        total += c.time_value ?? 0;
      }
    }
    return { count, total };
  }

  /* ---- Bulk approve selected redemptions (use suggested totals) ---- */
  async function approveSelectedSuggested() {
    const items = pending.filter((r) => selectedReds[r.id]);
    if (items.length === 0) {
      setToolMsg("Select at least one redemption.");
      return;
    }

    const grandTotal = items.reduce((sum, it) => sum + (it.total_time_value || 0), 0);
    const proceed = window.confirm(
      `Approve ${items.length} redemption(s) with their suggested totals?\n\n` +
        items
          .map(
            (it) =>
              `${(it.email ?? it.user_id).slice(0, 40)} — ${it.card_count} card(s), TIME ${it.total_time_value}`
          )
          .join("\n") +
        `\n\nGrand total: ${grandTotal}`
    );
    if (!proceed) return;

    const ref = window.prompt("External reference / note for all (optional)") || null;

    for (const it of items) {
      const allIds = (it.cards || [])
        .map((c) => c.card_id!)
        .filter(Boolean);
      const { error } = await supabase.rpc("admin_credit_selected_cards", {
        p_source_redemption_id: it.id,
        p_selected_card_ids: allIds,
        p_ref: ref,
        p_amount_override: null,
      });
      if (error) {
        setToolMsg(error.message);
        return;
      }
    }

    setToolMsg(`✅ Credited ${items.length} redemption(s) using suggested totals (grand total ${grandTotal}).`);
    await loadPending();
    await loadCredited();
  }

  /* ---- Finalize a single redemption: credit selected cards, leave others pending ---- */
  async function finalizeRedemption(red: PendingRedemption) {
    const m = cardSel[red.id] || {};
    const selectedIds = Object.entries(m)
      .filter(([, v]) => v)
      .map(([id]) => id);
    if (selectedIds.length === 0) {
      setToolMsg("Select at least one card to credit.");
      return;
    }

    // Compute suggested TIME for the checked cards
    let suggested = 0;
    for (const c of red.cards || []) {
      if (c.card_id && m[c.card_id]) suggested += c.time_value ?? 0;
    }

    const ref =
      window.prompt(
        `Credit ${selectedIds.length} card(s) for TIME ${suggested}. Add an external reference / note (optional):`
      ) || null;

    const { data, error } = await supabase.rpc("admin_credit_selected_cards", {
      p_source_redemption_id: red.id,
      p_selected_card_ids: selectedIds,
      p_ref: ref,
      p_amount_override: null,
    });

    if (error) {
      setToolMsg(error.message);
      return;
    }

    const newId = (data as any)?.[0]?.new_redemption_id as string | undefined;
    if (newId) {
      const receiptUrl = `${window.location.origin}/receipt/${newId}`;
      setLastReceiptUrl(receiptUrl);
      try {
        await navigator.clipboard.writeText(receiptUrl);
        alert(`Credited.\nReceipt link copied to clipboard:\n${receiptUrl}`);
      } catch {
        alert(`Credited.\nReceipt:\n${receiptUrl}`);
      }
    } else {
      setToolMsg("Credited, but no receipt id returned.");
    }

    await loadPending();
    await loadCredited();
  }

  async function rejectAll(red: PendingRedemption) {
    const reason = window.prompt("Reason (optional)") || null;

    const { error: e1 } = await supabase
      .from("redemptions")
      .update({
        status: "rejected",
        admin_notes: reason,
        credited_amount: null,
        credited_at: null,
        credited_by: null,
      })
      .eq("id", red.id);
    if (e1) {
      setToolMsg(e1.message);
      return;
    }

    const { error: e2 } = await supabase
      .from("redemption_cards")
      .update({ decision: "rejected", decided_at: new Date().toISOString() })
      .eq("redemption_id", red.id)
      .eq("decision", "pending");
    if (e2) {
      setToolMsg(e2.message);
      return;
    }

    await loadPending();
  }

  /* ---- Group pending by user_id ---- */
  const pendingGroups = useMemo<Record<string, PendingRedemption[]>>(() => {
    const map: Record<string, PendingRedemption[]> = {};
    for (const r of pending) {
      const key = r.user_id;
      if (!map[key]) map[key] = [];
      map[key].push(r);
    }
    return map;
  }, [pending]);

  /* ---- Scan filtering + sorting ---- */
  const filteredScans = useMemo(() => {
    const q = scanQuery.trim().toLowerCase();
    const rows = scans.filter((s) => {
      const matchQ =
        !q || (s.email ?? "").toLowerCase().includes(q) || s.code.toLowerCase().includes(q);
      const matchOutcome = scanOutcome === "all" || s.outcome === scanOutcome;
      return matchQ && matchOutcome;
    });
    const dir = scanSortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (scanSortKey === "created_at") {
        return (
          (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir
        );
      } else {
        return ((a.email ?? "") > (b.email ?? "") ? 1 : -1) * dir;
      }
    });
  }, [scans, scanQuery, scanOutcome, scanSortKey, scanSortDir]);

  /* ---- Credited Log: filter (text) and group by redemption ---- */
  const creditedGrouped = useMemo(() => {
    // 1) text filter at row level first (so we can filter by any card_code/email/id)
    const q = credQuery.trim().toLowerCase();
    const base = !q
      ? creditedRows
      : creditedRows.filter((r) => {
          return (
            (r.user_email ?? "").toLowerCase().includes(q) ||
            (r.card_code ?? "").toLowerCase().includes(q) ||
            r.user_id.toLowerCase().includes(q) ||
            r.redemption_id.toLowerCase().includes(q)
          );
        });

    // 2) group
    const map = new Map<
      string,
      {
        redemption_id: string;
        credited_at: string | null;
        user_email: string | null;
        credited_count: number;
        total_time: number;
        codes: string[];
      }
    >();

    for (const r of base) {
      const g =
        map.get(r.redemption_id) ??
        {
          redemption_id: r.redemption_id,
          credited_at: r.credited_at,
          user_email: r.user_email,
          credited_count: 0,
          total_time: 0,
          codes: [],
        };
      if (r.card_code) g.codes.push(r.card_code);
      g.total_time += Number(r.amount_time ?? 0);
      // prefer the latest credited_at
      if (!g.credited_at || (r.credited_at && new Date(r.credited_at) > new Date(g.credited_at))) {
        g.credited_at = r.credited_at;
      }
      map.set(r.redemption_id, g);
    }

    // set credited_count from codes length (per redemption)
    const grouped = Array.from(map.values()).map((g) => ({
      ...g,
      credited_count: g.codes.length,
    }));

    // 3) sort by selected key
    const dir = credSortDir === "asc" ? 1 : -1;
    return grouped.sort((a, b) => {
      switch (credSortKey) {
        case "credited_at":
          return (
            (new Date(a.credited_at ?? 0).getTime() - new Date(b.credited_at ?? 0).getTime()) *
            dir
          );
        case "user_email":
          return ((a.user_email ?? "") > (b.user_email ?? "") ? 1 : -1) * dir;
        case "credited_count":
          return (a.credited_count - b.credited_count) * dir;
        case "total_time":
          return (a.total_time - b.total_time) * dir;
        case "redemption_id":
          return (a.redemption_id > b.redemption_id ? 1 : -1) * dir;
        default:
          return 0;
      }
    });
  }, [creditedRows, credQuery, credSortKey, credSortDir]);

  if (isAdmin === null) return (
    <div className="min-h-screen hero-gradient flex items-center justify-center p-6">
      <div className="glass-panel p-8 rounded-2xl text-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
        <div className="text-foreground">Loading admin dashboard...</div>
      </div>
    </div>
  );
  if (isAdmin === false) return (
    <div className="min-h-screen hero-gradient flex items-center justify-center p-6">
      <div className="glass-panel p-8 rounded-2xl text-center">
        <div className="text-destructive text-lg font-medium">Access Denied</div>
        <div className="text-muted-foreground mt-2">You are not authorized to access the admin dashboard.</div>
      </div>
    </div>
  );
  if (error) return (
    <div className="min-h-screen hero-gradient flex items-center justify-center p-6">
      <div className="glass-panel p-8 rounded-2xl text-center">
        <div className="text-destructive text-lg font-medium">Error: {error}</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen hero-gradient">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="glass-panel p-6 rounded-2xl">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent mb-2">
                Admin Dashboard
              </h1>
              <p className="text-muted-foreground">Manage redemptions, cards, and user activity</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link 
                to="/admin/qr" 
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium glow-primary"
              >
                QR Generator
              </Link>
              <Link 
                to="/admin/cards" 
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors font-medium"
              >
                Card Management
              </Link>
              <button
                onClick={() => {
                  loadPending();
                  loadScans();
                  loadCredited();
                }}
                className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors font-medium"
              >
                Refresh All
              </button>
            </div>
          </div>
        </div>

        {toolMsg && (
          <div className="glass-panel p-4 rounded-lg border-l-4 border-l-primary">
            <div className="text-primary text-sm">{toolMsg}</div>
          </div>
        )}

        {lastReceiptUrl && (
          <div className="glass-panel p-4 rounded-lg border-l-4 border-l-emerald-500">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-emerald-600 font-medium">Receipt ready:</span>
              <a href={lastReceiptUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                Open receipt
              </a>
              <button
                onClick={() => navigator.clipboard.writeText(lastReceiptUrl)}
                className="px-3 py-1 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
              >
                Copy link
              </button>
              <button
                onClick={() => setLastReceiptUrl(null)}
                className="px-3 py-1 bg-muted text-muted-foreground rounded hover:bg-muted/80 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* ---------- Pending Redemptions (grouped by user) ---------- */}
        <div className="glass-panel p-6 rounded-2xl">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-1">Pending Redemptions</h2>
              <p className="text-sm text-muted-foreground">Review and approve TIME redemption requests</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={approveSelectedSuggested} 
                className="px-4 py-2 bg-gradient-to-r from-primary to-primary-glow text-primary-foreground rounded-lg hover:opacity-90 transition-opacity font-medium glow-primary"
              >
                Approve Selected
              </button>
              <button 
                onClick={clearRedSelection} 
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors font-medium"
              >
                Clear Selection
              </button>
            </div>
          </div>

          {loadingPending ? (
            <div className="text-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
              <div className="text-muted-foreground">Loading pending redemptions...</div>
            </div>
          ) : pending.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No pending redemptions.</div>
          ) : (
            <div className="space-y-4">
              {Object.entries(pendingGroups).map(([userId, reds]) => {
                const selectedCount = reds.filter((r) => selectedReds[r.id]).length;
                const email = reds[0]?.email ?? null;

                return (
                  <div key={userId} className="glass-panel p-4 rounded-xl">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                      <div>
                        <div className="font-semibold text-foreground">User: {email ?? userId}</div>
                        <div className="text-sm text-muted-foreground">Redemptions: {reds.length}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => selectAllUserReds(userId)}
                          className="px-3 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors text-sm font-medium"
                        >
                          Select All ({reds.length})
                        </button>
                        {selectedCount > 0 && (
                          <div className="text-sm text-muted-foreground">Selected: {selectedCount}</div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      {reds.map((r) => {
                        const m = cardSel[r.id] || {};
                        const { count, total } = selectedSummary(r);
                        return (
                          <div key={r.id} className="glass-panel p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                              <label className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={!!selectedReds[r.id]}
                                  onChange={() => toggleRed(r.id)}
                                  className="w-4 h-4 rounded border-muted"
                                />
                                <span className="font-medium text-foreground">
                                  Redemption <span className="text-muted-foreground">{r.id.slice(0, 8)}…</span>
                                  {" • "}
                                  <span className="text-muted-foreground">{r.email ?? r.user_id}</span>
                                </span>
                              </label>
                              <div className="text-sm text-muted-foreground">
                                {r.card_count} card(s) • Suggested TIME: <span className="font-semibold text-primary">{r.total_time_value}</span> • Submitted{" "}
                                {new Date(r.submitted_at).toLocaleString()}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-sm mb-4">
                              <button
                                onClick={() => selectAllCards(r.id, r.cards)}
                                className="px-3 py-1 bg-muted text-muted-foreground rounded hover:bg-muted/80 transition-colors"
                              >
                                Select All Cards
                              </button>
                              <button 
                                onClick={() => selectNoneCards(r.id)} 
                                className="px-3 py-1 bg-muted text-muted-foreground rounded hover:bg-muted/80 transition-colors"
                              >
                                Select None
                              </button>
                              <div className="text-muted-foreground">
                                Selected: <span className="font-semibold text-primary">{count}</span> • Selected TIME: <span className="font-semibold text-primary">{total}</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                              {r.cards?.map((c) => {
                                const checked = !!m[c.card_id || ""];
                                return (
                                  <label
                                    key={c.card_id}
                                    className={`glass-panel rounded-lg overflow-hidden block cursor-pointer transition-all hover:scale-105 ${
                                      checked ? "border-2 border-primary glow-primary" : "hover:bg-muted/5"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      className="hidden"
                                      checked={checked}
                                      onChange={() => c.card_id && toggleCard(r.id, c.card_id)}
                                    />
                                    <div className="aspect-[3/4] bg-muted/20 overflow-hidden">
                                      {c.image_url && (
                                        <img
                                          src={c.image_url}
                                          alt={c.name ?? "Card"}
                                          className="w-full h-full object-cover"
                                        />
                                      )}
                                    </div>
                                    <div className="p-3 space-y-1">
                                      <div className="font-medium text-foreground truncate">{c.name ?? "—"}</div>
                                      <div className="text-sm text-muted-foreground">
                                        {c.era ?? "—"} • {c.suit ?? "—"} {c.rank ?? "—"}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        Rarity: {c.rarity ?? "—"} · Value: {c.trader_value ?? "—"}
                                      </div>
                                      <div className="text-sm font-medium text-primary">TIME: {c.time_value ?? 0}</div>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Link
                                to={`/receipt/${r.id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors font-medium"
                              >
                                View Receipt
                              </Link>
                              <button 
                                onClick={() => finalizeRedemption(r)} 
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium glow-primary"
                              >
                                Credit Selected
                              </button>
                              <button 
                                onClick={() => rejectRedemption(r.id)} 
                                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors font-medium"
                              >
                                Reject All
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ---------- Credited Log ---------- */}
        <div className="glass-panel p-6 rounded-2xl">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-1">
                Credited Log — {creditedGrouped.length}
              </h2>
              <p className="text-sm text-muted-foreground">Recently credited redemptions and card details</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                value={credQuery}
                onChange={(e) => setCredQuery(e.target.value)}
                placeholder="Search codes, emails, users..."
                className="px-3 py-2 glass-panel border-muted/30 rounded-lg focus:border-primary text-foreground placeholder:text-muted-foreground"
              />
              <button 
                onClick={loadCredited} 
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors font-medium"
              >
                Refresh
              </button>
            </div>
          </div>

          {loadingCredited ? (
            <div className="text-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
              <div className="text-muted-foreground">Loading credited log...</div>
            </div>
          ) : creditedGrouped.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No credited redemptions yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <Th
                      label="When"
                      active={credSortKey === "credited_at"}
                      dir={credSortDir}
                      onClick={() => {
                        setCredSortKey("credited_at");
                        setCredSortDir((d) => (d === "asc" ? "desc" : "asc"));
                      }}
                    />
                    <Th
                      label="User"
                      active={credSortKey === "user_email"}
                      dir={credSortDir}
                      onClick={() => {
                        setCredSortKey("user_email");
                        setCredSortDir((d) => (d === "asc" ? "desc" : "asc"));
                      }}
                    />
                    <th className="py-3 pr-4 text-left font-medium text-foreground">Codes</th>
                    <Th
                      label="# Credited"
                      active={credSortKey === "credited_count"}
                      dir={credSortDir}
                      onClick={() => {
                        setCredSortKey("credited_count");
                        setCredSortDir((d) => (d === "asc" ? "desc" : "asc"));
                      }}
                    />
                    <Th
                      label="TIME Total"
                      active={credSortKey === "total_time"}
                      dir={credSortDir}
                      onClick={() => {
                        setCredSortKey("total_time");
                        setCredSortDir((d) => (d === "asc" ? "desc" : "asc"));
                      }}
                    />
                    <Th
                      label="Redemption"
                      active={credSortKey === "redemption_id"}
                      dir={credSortDir}
                      onClick={() => {
                        setCredSortKey("redemption_id");
                        setCredSortDir((d) => (d === "asc" ? "desc" : "asc"));
                      }}
                    />
                  </tr>
                </thead>
                <tbody>
                  {creditedGrouped.map((g) => (
                    <tr key={g.redemption_id} className="border-b border-border/30 hover:bg-muted/5 transition-colors">
                      <td className="py-3 pr-4 text-foreground">
                        {g.credited_at ? new Date(g.credited_at).toLocaleString() : "—"}
                      </td>
                      <td className="py-3 pr-4 text-foreground">{g.user_email ?? "—"}</td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-1">
                          {g.codes.slice(0, 10).map((code) => (
                            <span key={code} className="px-2 py-1 rounded bg-primary/10 text-primary text-xs font-mono">
                              {code}
                            </span>
                          ))}
                          {g.codes.length > 10 && (
                            <span className="text-xs text-muted-foreground">+{g.codes.length - 10} more</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-foreground font-medium">{g.credited_count}</td>
                      <td className="py-3 pr-4 text-primary font-semibold">{g.total_time}</td>
                      <td className="py-3 pr-4">
                        <Link 
                          to={`/receipt/${g.redemption_id}`} 
                          className="text-primary hover:underline font-mono text-sm" 
                          target="_blank" 
                          rel="noreferrer"
                        >
                          {g.redemption_id.slice(0, 8)}…
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ---------- Scan Log ---------- */}
        <div className="glass-panel p-6 rounded-2xl">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-1">Scan Activity Log</h2>
              <p className="text-sm text-muted-foreground">Latest 200 scan events and their outcomes</p>
            </div>
            <button 
              onClick={loadScans} 
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors font-medium"
            >
              Refresh Log
            </button>
          </div>

          <div className="flex flex-wrap gap-3 items-center mb-6">
            <input
              value={scanQuery}
              onChange={(e) => setScanQuery(e.target.value)}
              placeholder="Search by email or code..."
              className="flex-1 min-w-[200px] px-3 py-2 glass-panel border-muted/30 rounded-lg focus:border-primary text-foreground placeholder:text-muted-foreground"
            />
            <select
              value={scanOutcome}
              onChange={(e) => setScanOutcome(e.target.value as any)}
              className="px-3 py-2 glass-panel border-muted/30 rounded-lg focus:border-primary text-foreground"
            >
              <option value="all">All outcomes</option>
              <option value="claimed">claimed</option>
              <option value="already_owner">already_owner</option>
              <option value="owned_by_other">owned_by_other</option>
              <option value="not_found">not_found</option>
              <option value="blocked">blocked</option>
              <option value="error">error</option>
            </select>
          </div>

          {loadingScans ? (
            <div className="text-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
              <div className="text-muted-foreground">Loading scan activity...</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="py-3 pr-4 text-left font-medium text-foreground">When</th>
                    <th className="py-3 pr-4 text-left font-medium text-foreground">Email</th>
                    <th className="py-3 pr-4 text-left font-medium text-foreground">Code</th>
                    <th className="py-3 pr-4 text-left font-medium text-foreground">Outcome</th>
                    <th className="py-3 pr-4 text-left font-medium text-foreground">Card ID</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredScans.map((s, idx) => (
                    <tr key={`${s.created_at}-${idx}`} className="border-b border-border/30 hover:bg-muted/5 transition-colors">
                      <td className="py-3 pr-4 text-foreground">{new Date(s.created_at).toLocaleString()}</td>
                      <td className="py-3 pr-4 text-foreground">{s.email ?? "—"}</td>
                      <td className="py-3 pr-4 font-mono text-primary">{s.code}</td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          s.outcome === 'claimed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' :
                          s.outcome === 'already_owner' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200' :
                          s.outcome === 'owned_by_other' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' :
                          s.outcome === 'not_found' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-200' :
                          s.outcome === 'blocked' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200' :
                          'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
                        }`}>
                          {s.outcome}
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-mono text-muted-foreground">{s.card_id ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ---------- Blocked Users ---------- */}
        <div className="glass-panel p-6 rounded-2xl">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-1">Blocked Users</h2>
              <p className="text-sm text-muted-foreground">Manage user access restrictions</p>
            </div>
            <button 
              onClick={loadBlocked} 
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors font-medium"
            >
              Refresh List
            </button>
          </div>

          <div className="mb-6">
            <BlockTool onMsg={setToolMsg} onChanged={loadBlocked} />
          </div>

          {loadingBlocked ? (
            <div className="text-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
              <div className="text-muted-foreground">Loading blocked users...</div>
            </div>
          ) : blocked.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No users are currently blocked.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="py-3 pr-4 text-left font-medium text-foreground">Email</th>
                    <th className="py-3 pr-4 text-left font-medium text-foreground">Reason</th>
                    <th className="py-3 pr-4 text-left font-medium text-foreground">Blocked At</th>
                    <th className="py-3 pr-4 text-left font-medium text-foreground">Blocked By</th>
                    <th className="py-3 pr-4 text-left font-medium text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {blocked.map((b) => (
                    <tr key={b.user_id} className="border-b border-border/30 hover:bg-muted/5 transition-colors">
                      <td className="py-3 pr-4 text-foreground font-medium">{b.email ?? "—"}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{b.reason ?? "—"}</td>
                      <td className="py-3 pr-4 text-foreground">{new Date(b.blocked_at).toLocaleString()}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{b.blocked_by_email ?? "—"}</td>
                      <td className="py-3 pr-4">
                        {b.email && (
                          <button
                            onClick={async () => {
                              const { data, error } = await supabase.rpc("admin_unblock_user_by_email", {
                                p_email: b.email!,
                              });
                              if (error) setToolMsg(error.message);
                              else if ((data as any)?.ok) {
                                setToolMsg(`✅ Unblocked ${b.email}`);
                                await loadBlocked();
                              }
                            }}
                            className="px-3 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors text-sm font-medium"
                          >
                            Unblock
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Helpers ---------- */

function Th({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active?: boolean;
  dir?: "asc" | "desc";
  onClick?: () => void;
}) {
  return (
    <th
      className="py-2 pr-3 cursor-pointer select-none"
      onClick={onClick}
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
      title={active ? (dir === "asc" ? "Sorted asc" : "Sorted desc") : "Click to sort"}
    >
      {label} {active ? (dir === "asc" ? "▲" : "▼") : ""}
    </th>
  );
}

/* ---------------- Admin helper: Block / Unblock ---------------- */

function BlockTool({
  onMsg,
  onChanged,
}: {
  onMsg: (m: string | null) => void;
  onChanged: () => void;
}) {
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function doBlock() {
    onMsg(null);
    const e = email.trim();
    if (!e) {
      onMsg("Enter an email.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.rpc("admin_block_user_by_email", {
      p_email: e,
      p_reason: reason.trim() || null,
    });
    setBusy(false);
    if (error) {
      onMsg(error.message);
      return;
    }
    if ((data as any)?.ok) {
      onMsg(`✅ Blocked ${e}.`);
      onChanged();
    } else if ((data as any)?.error === "not_found") {
      onMsg(`❌ No auth user found with email: ${e}`);
    } else if ((data as any)?.error === "forbidden") {
      onMsg("❌ You are not authorized as admin.");
    } else {
      onMsg("Could not block user.");
    }
  }

  async function doUnblock() {
    onMsg(null);
    const e = email.trim();
    if (!e) {
      onMsg("Enter an email.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.rpc("admin_unblock_user_by_email", { p_email: e });
    setBusy(false);
    if (error) {
      onMsg(error.message);
      return;
    }
    if ((data as any)?.ok) {
      onMsg(`✅ Unblocked ${e}.`);
      onChanged();
    } else if ((data as any)?.error === "not_found") {
      onMsg(`❌ No auth user found with email: ${e}`);
    } else if ((data as any)?.error === "forbidden") {
      onMsg("❌ You are not authorized as admin.");
    } else {
      onMsg("Could not unblock user.");
    }
  }

  return (
    <div className="flex flex-col md:flex-row md:items-center gap-2">
      <div className="text-sm font-medium whitespace-nowrap">Block / Unblock</div>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="user@email.com"
        className="border rounded px-2 py-1 w-full md:w-64"
      />
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (optional)"
        className="border rounded px-2 py-1 w-full md:w-64"
      />
      <div className="flex gap-2">
        <button onClick={doBlock} disabled={busy} className="border rounded px-3 py-1 text-sm">
          {busy ? "Blocking…" : "Block"}
        </button>
        <button onClick={doUnblock} disabled={busy} className="border rounded px-3 py-1 text-sm">
          {busy ? "Unblocking…" : "Unblock"}
        </button>
      </div>
    </div>
  );
}
