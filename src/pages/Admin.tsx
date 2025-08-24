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

type CreditedCardRow = {
  redemption_id: string;
  credited_at: string | null;
  user_id: string;
  user_email: string | null;
  card_id: string;
  card_code: string | null;
  amount_time: number | null;
  credited_count: number;
};

/* ---------- Page ---------- */

export default function Admin() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Pending redemptions (grouped by user)
  const [pending, setPending] = useState<PendingRedemption[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);

  // Per-redemption per-card selection: { [redemptionId]: { [cardId]: true } }
  const [cardSel, setCardSel] = useState<Record<string, Record<string, boolean>>>({});

  // Blocked users
  const [blocked, setBlocked] = useState<BlockedRow[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);

  // Scan log + sort/filter
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [loadingScans, setLoadingScans] = useState(false);
  const [scanQuery, setScanQuery] = useState("");
  const [scanOutcome, setScanOutcome] = useState<ScanRow["outcome"] | "all">("all");
  const [scanSortKey, setScanSortKey] = useState<"created_at" | "email">("created_at");
  const [scanSortDir, setScanSortDir] = useState<"asc" | "desc">("desc");

  // Credited cards log + sort
  const [creditedRows, setCreditedRows] = useState<CreditedCardRow[]>([]);
  const [loadingCredited, setLoadingCredited] = useState(false);
  const [credQuery, setCredQuery] = useState("");
  const [credSortKey, setCredSortKey] = useState<"credited_at" | "card_code" | "user_email" | "credited_count" | "amount_time">("credited_at");
  const [credSortDir, setCredSortDir] = useState<"asc" | "desc">("desc");

  // UI messages + receipt
  const [toolMsg, setToolMsg] = useState<string | null>(null);
  const [lastReceiptUrl, setLastReceiptUrl] = useState<string | null>(null);

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
    loadCredited();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  /* ---- Loaders ---- */
  async function loadPending() {
    setLoadingPending(true);
    setError(null);
    setToolMsg(null);

    const { data, error } = await supabase.rpc("admin_pending_redemptions");
    if (error) setError(error.message);

    const rows = (data as PendingRedemption[]) ?? [];
    // Initialize selection (default select all for convenience)
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

  async function loadCredited() {
    setLoadingCredited(true);
    const { data, error } = await supabase.rpc("admin_recent_credited", { p_limit: 200 });
    if (error) setToolMsg(error.message);
    setCreditedRows((data as CreditedCardRow[]) ?? []);
    setLoadingCredited(false);
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

  /* ---- Credit selected cards within ONE redemption ---- */
  async function finalizeRedemption(red: PendingRedemption) {
    setToolMsg(null);
    const m = cardSel[red.id] || {};
    const selectedIds = Object.entries(m).filter(([, v]) => v).map(([id]) => id);
    if (selectedIds.length === 0) { setToolMsg("Select at least one card."); return; }

    // Suggested TIME for the checked cards
    let suggested = 0;
    for (const c of red.cards || []) {
      if (c.card_id && m[c.card_id]) suggested += c.time_value ?? 0;
    }

    const ref = window.prompt(
      `Credit ${selectedIds.length} card(s) for TIME ${suggested}. Add an external reference / note (optional):`
    ) || null;

    const { data, error } = await supabase.rpc("admin_credit_selected_cards", {
      p_source_redemption_id: red.id,
      p_selected_card_ids: selectedIds,
      p_ref: ref,
      p_amount_override: null
    });

    if (error) { setToolMsg(error.message); return; }

    const newId = (data as any)?.[0]?.new_redemption_id as string | undefined;
    if (newId) {
      const receiptUrl = `${window.location.origin}/receipt/${newId}`;
      setLastReceiptUrl(receiptUrl);
      try {
        await navigator.clipboard.writeText(receiptUrl);
        setToolMsg(`✅ Credited. Receipt copied to clipboard.`);
      } catch {
        setToolMsg(`✅ Credited. Receipt ready.`);
      }
    } else {
      setToolMsg("Credited, but no receipt id returned.");
    }

    await loadPending();
    await loadCredited();
  }

  /* ---- Credit ALL pending cards in ONE redemption ---- */
  async function creditAllInRedemption(redId: string) {
    setToolMsg(null);

    // 1) Fetch pending cards in this redemption
    const { data: rows, error: e1 } = await supabase
      .from("redemption_cards")
      .select("card_id")
      .eq("redemption_id", redId)
      .eq("decision", "pending");

    if (e1) { setToolMsg(e1.message); return; }

    const ids = (rows || []).map(r => (r as any).card_id).filter(Boolean);
    if (ids.length === 0) { setToolMsg("No pending cards to credit."); return; }

    const ref = window.prompt("External reference / note (optional)") || null;

    // 2) Credit them via RPC
    const { data, error } = await supabase.rpc("admin_credit_selected_cards", {
      p_source_redemption_id: redId,
      p_selected_card_ids: ids,
      p_ref: ref,
      p_amount_override: null
    });

    if (error) { setToolMsg(error.message); return; }

    const newId = (data as any)?.[0]?.new_redemption_id as string | undefined;
    if (newId) {
      const receiptUrl = `${window.location.origin}/receipt/${newId}`;
      setLastReceiptUrl(receiptUrl);
      try {
        await navigator.clipboard.writeText(receiptUrl);
        setToolMsg(`✅ Credited ${ids.length} card(s). Receipt copied to clipboard.`);
      } catch {
        setToolMsg(`✅ Credited ${ids.length} card(s). Receipt ready.`);
      }
    } else {
      setToolMsg(`Credited ${ids.length} card(s).`);
    }

    await loadPending();
    await loadCredited();
  }

  /* ---- Reject all (still-pending) cards in a redemption ---- */
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
    if (e1) { setToolMsg(e1.message); return; }

    const { error: e2 } = await supabase
      .from("redemption_cards")
      .update({ decision: "rejected", decided_at: new Date().toISOString() })
      .eq("redemption_id", red.id)
      .eq("decision", "pending");
    if (e2) { setToolMsg(e2.message); return; }

    await loadPending();
    await loadCredited();
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

  /* ---- Credited filtering + sorting ---- */
  const filteredCredited = useMemo(() => {
    const q = credQuery.trim().toLowerCase();
    const rows = creditedRows.filter(r => {
      if (!q) return true;
      return (
        (r.card_code ?? "").toLowerCase().includes(q) ||
        (r.user_email ?? "").toLowerCase().includes(q) ||
        r.user_id.toLowerCase().includes(q) ||
        r.redemption_id.toLowerCase().includes(q)
      );
    });
    const dir = credSortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const A = a, B = b;
      switch (credSortKey) {
        case "credited_at":
          return ((new Date(A.credited_at ?? 0).getTime()) - (new Date(B.credited_at ?? 0).getTime())) * dir;
        case "card_code":
          return ((A.card_code ?? "") > (B.card_code ?? "") ? 1 : -1) * dir;
        case "user_email":
          return ((A.user_email ?? "") > (B.user_email ?? "") ? 1 : -1) * dir;
        case "credited_count":
          return ((A.credited_count ?? 0) - (B.credited_count ?? 0)) * dir;
        case "amount_time":
          return ((A.amount_time ?? 0) - (B.amount_time ?? 0)) * dir;
        default:
          return 0;
      }
    });
  }, [creditedRows, credQuery, credSortKey, credSortDir]);

  if (isAdmin === null) return <div className="p-6">Loading…</div>;
  if (isAdmin === false) return <div className="p-6">Not authorized.</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <div className="flex gap-2">
          <Link to="/admin/qr" className="border rounded px-3 py-1">QR Generator</Link>
          <button onClick={() => { loadPending(); loadScans(); loadCredited(); }} className="border rounded px-3 py-1">
            Refresh
          </button>
        </div>
      </div>

      {toolMsg && (
        <div className="text-sm px-3 py-2 rounded bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-
