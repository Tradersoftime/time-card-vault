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
  outcome: "claimed" | "already_owner" | "owned_by_other" | "not_found" | "blocked" | "error";
};

type RecentRow = {
  id: string;
  user_id: string;
  email: string | null;
  credited_amount: number | null;
  credited_at: string | null;
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
  const [cardSel, setCardSel] = useState<Record<string, Record<string, boolean>>>({}); // { redemptionId: { cardId: true } }

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

  // Recent credited + sort
  const [recent, setRecent] = useState<RecentRow[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [recentSortKey, setRecentSortKey] = useState<"credited_at" | "email" | "amount">("credited_at");
  const [recentSortDir, setRecentSortDir] = useState<"asc" | "desc">("desc");

  /* ---- Admin check ---- */
  useEffect(() => {
    let mounted = true;
    (async () => {
      setError(null);
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) { if (mounted) setIsAdmin(false); return; }
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
    loadPending();
    loadBlocked();
    loadScans();
    loadRecent();
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
    // default: select all cards per redemption
    const initSel: Record<string, Record<string, boolean>> = {};
    rows.forEach(r => {
      const m: Record<string, boolean> = {};
      r.cards?.forEach(c => { if (c.card_id) m[c.card_id] = true; });
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

  async function loadRecent() {
    setLoadingRecent(true);
    const { data, error } = await supabase.rpc("admin_recent_credited", { p_limit: 25 });
    if (error) setToolMsg(error.message);
    setRecent((data as RecentRow[]) ?? []);
    setLoadingRecent(false);
  }

  /* ---- Selection helpers (redemptions) ---- */
  function toggleRed(id: string) {
    setSelectedReds(s => ({ ...s, [id]: !s[id] }));
  }
  function selectAllUserReds(userId: string) {
    const next = { ...selectedReds };
    pending.filter(r => r.user_id === userId).forEach(r => { next[r.id] = true; });
    setSelectedReds(next);
  }
  function clearRedSelection() {
    setSelectedReds({});
  }

  /* ---- Per-card selection helpers ---- */
  function toggleCard(redId: string, cardId: string) {
    setCardSel(map => ({
      ...map,
      [redId]: { ...(map[redId] || {}), [cardId]: !(map[redId]?.[cardId]) }
    }));
  }
  function selectAllCards(redId: string, cards: PendingCard[]) {
    const next: Record<string, boolean> = {};
    cards.forEach(c => { if (c.card_id) next[c.card_id] = true; });
    setCardSel(map => ({ ...map, [redId]: next }));
  }
  function selectNoneCards(redId: string) {
    setCardSel(map => ({ ...map, [redId]: {} }));
  }

  function selectedSummary(red: PendingRedemption) {
    const m = cardSel[red.id] || {};
    let count = 0, total = 0;
    for (const c of red.cards || []) {
      if (c.card_id && m[c.card_id]) {
        count++;
        total += c.time_value ?? 0;
      }
    }
    return { count, total };
  }

  /* ---- Bulk approve (use each row's suggested total) ---- */
  async function approveSelectedSuggested() {
    const items = pending.filter(r => selectedReds[r.id]);
    if (items.length === 0) { setToolMsg("Select at least one redemption."); return; }

    const grandTotal = items.reduce((sum, it) => sum + (it.total_time_value || 0), 0);
    const proceed = window.confirm(
      `Approve ${items.length} redemption(s) with their suggested totals?\n\n` +
      items.map(it => `${(it.email ?? it.user_id).slice(0, 40)} — ${it.card_count} card(s), TIME ${it.total_time_value}`).join("\n") +
      `\n\nGrand total: ${grandTotal}`
    );
    if (!proceed) return;

    const ref = window.prompt("External reference / note for all (optional)") || null;

    for (const it of items) {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) { setToolMsg("Not signed in."); return; }
      const { error } = await supabase
        .from("redemptions")
        .update({
          status: "credited",
          credited_amount: it.total_time_value,
          external_ref: ref,
          credited_at: new Date().toISOString(),
          credited_by: u.user.id,
        })
        .eq("id", it.id);
      if (error) { setToolMsg(error.message); return; }
    }

    setToolMsg(`✅ Credited ${items.length} redemption(s) using suggested totals (grand total ${grandTotal}).`);
    await loadPending();
    await loadRecent();
  }

  /* ---- Finalize a single redemption: credit selected cards, reject others ---- */
  async function finalizeRedemption(red: PendingRedemption) {
    const { count, total } = selectedSummary(red);
    if (count === 0) {
      setToolMsg("Select at least one card to credit (or Reject).");
      return;
    }
    const ref = window.prompt(
      `Credit ${count} card(s) for TIME ${total}. Add an external reference / note (optional):`
    ) || null;

    const selectedIds = Object.entries(cardSel[red.id] || {})
      .filter(([, v]) => v)
      .map(([cardId]) => cardId);

    const { data, error } = await supabase.rpc("admin_finalize_redemption", {
      p_redemption_id: red.id,
      p_selected_card_ids: selectedIds,
      p_ref: ref,
      p_amount_override: null
    });

    if (error) { setToolMsg(error.message); return; }
    const receiptUrl = `${window.location.origin}/receipt/${red.id}`;
    setLastReceiptUrl(receiptUrl);
    try {
      await navigator.clipboard.writeText(receiptUrl);
      alert(`Credited.\nReceipt link copied to clipboard:\n${receiptUrl}`);
    } catch {
      alert(`Credited.\nReceipt:\n${receiptUrl}`);
    }

    await loadPending();
    await loadRecent();
  }

  async function rejectAll(red: PendingRedemption) {
    const reason = window.prompt("Reason (optional)") || null;
    // set all to rejected, and header to rejected
    const { error } = await supabase
      .from("redemptions")
      .update({
        status: "rejected",
        admin_notes: reason,
        credited_amount: null,
        credited_at: null,
        credited_by: null,
      })
      .eq("id", red.id);
    if (error) { setToolMsg(error.message); return; }

    // Mark all cards as rejected
    await supabase
      .from("redemption_cards")
      .update({ decision: "rejected", decided_at: new Date().toISOString() })
      .eq("redemption_id", red.id);

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
    const rows = scans.filter(s => {
      const matchQ =
        !q ||
        (s.email ?? "").toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q);
      const matchOutcome = (scanOutcome === "all") || s.outcome === scanOutcome;
      return matchQ && matchOutcome;
    });
    const dir = scanSortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (scanSortKey === "created_at") {
        return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
      } else {
        return ((a.email ?? "") > (b.email ?? "") ? 1 : -1) * dir;
      }
    });
  }, [scans, scanQuery, scanOutcome, scanSortKey, scanSortDir]);

  /* ---- Recent credited sorting ---- */
  const recentSorted = useMemo(() => {
    const dir = recentSortDir === "asc" ? 1 : -1;
    return [...recent].sort((a, b) => {
      if (recentSortKey === "credited_at") {
        return (new Date(a.credited_at ?? 0).getTime() - new Date(b.credited_at ?? 0).getTime()) * dir;
      } else if (recentSortKey === "email") {
        return ((a.email ?? "") > (b.email ?? "") ? 1 : -1) * dir;
      } else {
        return ((a.credited_amount ?? 0) - (b.credited_amount ?? 0)) * dir;
      }
    });
  }, [recent, recentSortKey, recentSortDir]);

  if (isAdmin === null) return <div className="p-6">Loading…</div>;
  if (isAdmin === false) return <div className="p-6">Not authorized.</div>;
  if (error) return <div className="p-6 text-destructive">Error: {error}</div>;

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <div className="flex gap-2">
          <Link to="/admin/qr" className="border rounded px-3 py-1">QR Generator</Link>
          <button onClick={() => { loadPending(); loadScans(); loadRecent(); }} className="border rounded px-3 py-1">
            Refresh
          </button>
        </div>
      </div>

      {toolMsg && (
        <div className="text-sm px-3 py-2 rounded bg-muted text-muted-foreground border">
          {toolMsg}
        </div>
      )}

      {lastReceiptUrl && (
        <div className="text-sm px-3 py-2 rounded bg-accent text-accent-foreground border flex items-center gap-3">
          <span>Receipt ready:</span>
          <a href={lastReceiptUrl} target="_blank" rel="noreferrer" className="underline">Open receipt</a>
          <button
            onClick={() => navigator.clipboard.writeText(lastReceiptUrl)}
            className="border rounded px-2 py-0.5 text-xs hover:bg-muted"
          >
            Copy link
          </button>
          <button
            onClick={() => setLastReceiptUrl(null)}
            className="border rounded px-2 py-0.5 text-xs hover:bg-muted"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ---------- Pending Redemptions (grouped by user) ---------- */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Pending Redemptions</h2>
          <div className="flex items-center gap-2">
            <button onClick={approveSelectedSuggested} className="border rounded px-3 py-1">
              Approve Selected (suggested totals)
            </button>
            <button onClick={clearRedSelection} className="border rounded px-3 py-1">Clear Selection</button>
          </div>
        </div>

        {loadingPending ? (
          <div>Loading pending…</div>
        ) : pending.length === 0 ? (
          <div className="opacity-70">No pending redemptions.</div>
        ) : (
          Object.entries(pendingGroups).map(([userId, reds]) => {
            const selectedCount = reds.filter(r => selectedReds[r.id]).length;
            const email = reds[0]?.email ?? null;

            return (
              <div key={userId} className="border rounded-xl p-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                  <div>
                    <div className="font-medium">User: {email ?? userId}</div>
                    <div className="text-xs opacity-70">Redemptions: {reds.length}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => selectAllUserReds(userId)} className="border rounded px-3 py-1 text-sm">
                      Select All ({reds.length})
                    </button>
                    {selectedCount > 0 && (
                      <div className="text-xs opacity-80">Selected: {selectedCount}</div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {reds.map((r) => {
                    const { count, total } = selectedSummary(r);
                    return (
                      <div key={r.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={!!selectedReds[r.id]}
                              onChange={() => toggleRed(r.id)}
                            />
                            <span className="font-medium">
                              Redemption <span className="opacity-70">{r.id.slice(0, 8)}…</span>
                              {" · "}
                              <span className="opacity-80">{r.email ?? r.user_id}</span>
                            </span>
                          </label>
                          <div className="text-xs opacity-70">
                            {r.card_count} card(s) • Suggested TIME: <b>{r.total_time_value}</b> •
                            {" "}Submitted {new Date(r.submitted_at).toLocaleString()}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs mb-2">
                          <button onClick={() => selectAllCards(r.id, r.cards)} className="border rounded px-2 py-0.5">
                            Select All Cards
                          </button>
                          <button onClick={() => selectNoneCards(r.id)} className="border rounded px-2 py-0.5">
                            Select None
                          </button>
                          <div className="opacity-80">
                            Selected: <b>{count}</b> • Selected TIME: <b>{total}</b>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {r.cards?.map((c) => {
                            const checked = !!cardSel[r.id]?.[c.card_id || ""];
                            return (
                              <label key={c.card_id} className={`border rounded-lg overflow-hidden block ${checked ? "ring-2 ring-emerald-500" : ""}`}>
                                <input
                                  type="checkbox"
                                  className="hidden"
                                  checked={checked}
                                  onChange={() => c.card_id && toggleCard(r.id, c.card_id)}
                                />
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
                                    Rarity: {c.rarity ?? "—"} · Value: {c.trader_value ?? "—"} · TIME: {c.time_value ?? 0}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>

                        <div className="flex gap-2 mt-3">
                          <Link
                            to={`/receipt/${r.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="border rounded px-3 py-1"
                          >
                            View receipt
                          </Link>
                          <button onClick={() => finalizeRedemption(r)} className="border rounded px-3 py-1">
                            Credit selected & reject rest
                          </button>
                          <button onClick={() => rejectAll(r)} className="border rounded px-3 py-1">
                            Reject all
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* ---------- Recent Credited (sortable) ---------- */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Credited</h2>
          <button onClick={loadRecent} className="border rounded px-3 py-1 text-sm">Refresh</button>
        </div>

        {loadingRecent ? (
          <div>Loading…</div>
        ) : recentSorted.length === 0 ? (
          <div className="opacity-70 text-sm">No credited redemptions yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3 cursor-pointer"
                      onClick={() => { setRecentSortKey("credited_at"); setRecentSortDir(d => d === "asc" ? "desc" : "asc"); }}>
                    When {recentSortKey === "credited_at" ? (recentSortDir === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th className="py-2 pr-3 cursor-pointer"
                      onClick={() => { setRecentSortKey("email"); setRecentSortDir(d => d === "asc" ? "desc" : "asc"); }}>
                    User {recentSortKey === "email" ? (recentSortDir === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th className="py-2 pr-3 cursor-pointer"
                      onClick={() => { setRecentSortKey("amount"); setRecentSortDir(d => d === "asc" ? "desc" : "asc"); }}>
                    Amount {recentSortKey === "amount" ? (recentSortDir === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th className="py-2 pr-3">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {recentSorted.map(r => (
                  <tr key={r.id} className="border-b last:border-b-0">
                    <td className="py-2 pr-3">{r.credited_at ? new Date(r.credited_at).toLocaleString() : "—"}</td>
                    <td className="py-2 pr-3">{r.email ?? r.user_id}</td>
                    <td className="py-2 pr-3">{r.credited_amount ?? "—"}</td>
                    <td className="py-2 pr-3">
                      <a className="underline" href={`/receipt/${r.id}`} target="_blank" rel="noreferrer">
                        View receipt
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ---------- Scan Log (sortable) ---------- */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Scan Log (latest 200)</h2>
          <button onClick={loadScans} className="border rounded px-3 py-1 text-sm">Refresh</button>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <input
            value={scanQuery}
            onChange={(e) => setScanQuery(e.target.value)}
            placeholder="Search by email or code…"
            className="border rounded px-2 py-1"
          />
          <select
            value={scanOutcome}
            onChange={(e) => setScanOutcome(e.target.value as any)}
            className="border rounded px-2 py-1"
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

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-3 cursor-pointer"
                    onClick={() => { setScanSortKey("created_at"); setScanSortDir(d => d === "asc" ? "desc" : "asc"); }}>
                  When {scanSortKey === "created_at" ? (scanSortDir === "asc" ? "▲" : "▼") : ""}
                </th>
                <th className="py-2 pr-3 cursor-pointer"
                    onClick={() => { setScanSortKey("email"); setScanSortDir(d => d === "asc" ? "desc" : "asc"); }}>
                  Email {scanSortKey === "email" ? (scanSortDir === "asc" ? "▲" : "▼") : ""}
                </th>
                <th className="py-2 pr-3">Code</th>
                <th className="py-2 pr-3">Outcome</th>
                <th className="py-2 pr-3">Card ID</th>
              </tr>
            </thead>
            <tbody>
              {filteredScans.map((s, idx) => (
                <tr key={`${s.created_at}-${idx}`} className="border-b last:border-b-0">
                  <td className="py-2 pr-3">{new Date(s.created_at).toLocaleString()}</td>
                  <td className="py-2 pr-3">{s.email ?? "—"}</td>
                  <td className="py-2 pr-3 font-mono">{s.code}</td>
                  <td className="py-2 pr-3">{s.outcome}</td>
                  <td className="py-2 pr-3 font-mono">{s.card_id ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------- Blocked users ---------- */}
      <section className="border rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Blocked users</h2>
          <button onClick={loadBlocked} className="border rounded px-3 py-1 text-sm">
            Refresh list
          </button>
        </div>

        <div className="mb-3">
          <BlockTool onMsg={setToolMsg} onChanged={loadBlocked} />
        </div>

        {loadingBlocked ? (
          <div className="opacity-70 text-sm">Loading blocked users…</div>
        ) : blocked.length === 0 ? (
          <div className="opacity-70 text-sm">No one is blocked.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Reason</th>
                  <th className="py-2 pr-3">Blocked at</th>
                  <th className="py-2 pr-3">Blocked by</th>
                  <th className="py-2 pr-0"></th>
                </tr>
              </thead>
              <tbody>
                {blocked.map((b) => (
                  <tr key={b.user_id} className="border-b last:border-b-0">
                    <td className="py-2 pr-3">{b.email ?? "—"}</td>
                    <td className="py-2 pr-3">{b.reason ?? "—"}</td>
                    <td className="py-2 pr-3">{new Date(b.blocked_at).toLocaleString()}</td>
                    <td className="py-2 pr-3">{b.blocked_by_email ?? "—"}</td>
                    <td className="py-2 pr-0">
                      {b.email && (
                        <button
                          onClick={async () => {
                            const { data, error } = await supabase.rpc("admin_unblock_user_by_email", { p_email: b.email! });
                            if (error) setToolMsg(error.message);
                            else if (data?.ok) { setToolMsg(`✅ Unblocked ${b.email}`); await loadBlocked(); }
                          }}
                          className="border rounded px-2 py-1 text-xs"
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
      </section>
    </div>
  );
}

/* ---------------- Admin helper: Block / Unblock ---------------- */

function BlockTool({ onMsg, onChanged }: { onMsg: (m: string | null) => void; onChanged: () => void }) {
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function doBlock() {
    onMsg(null);
    const e = email.trim();
    if (!e) { onMsg("Enter an email."); return; }
    setBusy(true);
    const { data, error } = await supabase.rpc("admin_block_user_by_email", {
      p_email: e,
      p_reason: reason.trim() || null,
    });
    setBusy(false);
    if (error) { onMsg(error.message); return; }
    if (data?.ok) {
      onMsg(`✅ Blocked ${e}.`);
      onChanged();
    } else if (data?.error === "not_found") {
      onMsg(`❌ No auth user found with email: ${e}`);
    } else if (data?.error === "forbidden") {
      onMsg("❌ You are not authorized as admin.");
    } else {
      onMsg("Could not block user.");
    }
  }

  async function doUnblock() {
    onMsg(null);
    const e = email.trim();
    if (!e) { onMsg("Enter an email."); return; }
    setBusy(true);
    const { data, error } = await supabase.rpc("admin_unblock_user_by_email", { p_email: e });
    setBusy(false);
    if (error) { onMsg(error.message); return; }
    if (data?.ok) {
      onMsg(`✅ Unblocked ${e}.`);
      onChanged();
    } else if (data?.error === "not_found") {
      onMsg(`❌ No auth user found with email: ${e}`);
    } else if (data?.error === "forbidden") {
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
