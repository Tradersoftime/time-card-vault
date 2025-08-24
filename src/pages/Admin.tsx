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
};

type PendingRedemption = {
  id: string;
  user_id: string;
  email: string | null; // we fetch emails via RPC below (for pending we still use old join)
  submitted_at: string;
  cards: PendingCard[];
};

type RedCard = {
  card_id: string;
  cards: {
    name?: string | null;
    image_url?: string | null;
    era?: string | null;
    suit?: string | null;
    rank?: string | null;
    rarity?: string | null;
    trader_value?: string | null;
  } | null;
};

type RedItem = {
  id: string;
  user_id: string;
  status: string;
  submitted_at: string;
  redemption_cards: RedCard[];
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

/* ---------- Page ---------- */

export default function Admin() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  // -------- Pending redemptions (grouped by user) --------
  const [pending, setPending] = useState<PendingRedemption[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [toolMsg, setToolMsg] = useState<string | null>(null);

  // -------- Blocked users --------
  const [blocked, setBlocked] = useState<BlockedRow[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);

  // -------- Scan log --------
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [loadingScans, setLoadingScans] = useState(false);
  const [scanQuery, setScanQuery] = useState("");
  const [scanOutcome, setScanOutcome] = useState<ScanRow["outcome"] | "all">("all");

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  /* ---- Loaders ---- */
  async function loadPending() {
    setLoadingPending(true);
    setSelected({});
    setError(null);
    // Use the existing table join for pending redemptions (no emails here)
    const { data, error } = await supabase
      .from("redemptions")
      .select(`
        id,
        user_id,
        status,
        submitted_at,
        redemption_cards (
          card_id,
          cards ( name, image_url, era, suit, rank, rarity, trader_value )
        )
      `)
      .eq("status", "pending")
      .order("submitted_at", { ascending: true });

    if (error) setError(error.message);
    const items = (data as RedItem[]) ?? [];
    // Map into PendingRedemption (email will be blank here; grouped by user_id works fine)
    const mapped: PendingRedemption[] = items.map(r => ({
      id: r.id,
      user_id: r.user_id,
      email: null,
      submitted_at: r.submitted_at,
      cards: (r.redemption_cards || []).map(rc => ({
        card_id: rc.card_id,
        name: rc.cards?.name ?? null,
        image_url: rc.cards?.image_url ?? null,
        era: rc.cards?.era ?? null,
        suit: rc.cards?.suit ?? null,
        rank: rc.cards?.rank ?? null,
        rarity: rc.cards?.rarity ?? null,
        trader_value: rc.cards?.trader_value ?? null,
      })),
    }));

    setPending(mapped);
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

  /* ---- Selection helpers (pending) ---- */
  function toggle(id: string) {
    setSelected(s => ({ ...s, [id]: !s[id] }));
  }
  function selectAllUser(userId: string) {
    const next = { ...selected };
    pending.filter(r => r.user_id === userId).forEach(r => { next[r.id] = true; });
    setSelected(next);
  }
  function clearSelection() {
    setSelected({});
  }

  /* ---- Bulk approve ---- */
  async function approveSelected() {
    const ids = Object.keys(selected).filter(id => selected[id]);
    if (ids.length === 0) { setToolMsg("Select at least one redemption."); return; }
    const amtStr = window.prompt("TIME amount PER redemption?", "0");
    if (amtStr === null) return;
    const amount = Number(amtStr);
    if (!Number.isFinite(amount)) { setToolMsg("Enter a valid number."); return; }
    const ref = window.prompt("External reference / note (optional)") || null;

    const { data, error } = await supabase.rpc("admin_bulk_credit", {
      p_ids: ids,
      p_amount: amount,
      p_ref: ref,
    });
    if (error) { setToolMsg(error.message); return; }
    if (data?.ok) {
      setToolMsg(`✅ Credited ${data.updated ?? ids.length} redemption(s).`);
      await loadPending();
    } else {
      setToolMsg("Could not credit.");
    }
  }

  /* ---- Per-item approve / reject ---- */
async function markCredited(id: string) {
  const amtStr = window.prompt("TIME amount to credit?", "0");
  if (amtStr === null) return;
  const amount = Number(amtStr);
  if (!Number.isFinite(amount)) { alert("Please enter a valid number."); return; }
  const ref = window.prompt("External reference / note (optional)") || null;

  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) { alert("Not signed in."); return; }

  const { error } = await supabase
    .from("redemptions")
    .update({
      status: "credited",
      credited_amount: amount,
      external_ref: ref,
      credited_at: new Date().toISOString(),
      credited_by: u.user.id,
    })
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  // 👇 Show + copy the receipt link
  const receiptUrl = `${window.location.origin}/receipt/${id}`;
  try {
    await navigator.clipboard.writeText(receiptUrl);
    // If you have setToolMsg in this component, use it. Otherwise keep alert.
    // setToolMsg(`✅ Credited. Receipt link copied: ${receiptUrl}`);
    alert(`Credited.\nReceipt link copied to clipboard:\n${receiptUrl}`);
  } catch {
    // setToolMsg(`✅ Credited. Receipt: ${receiptUrl}`);
    alert(`Credited.\nReceipt:\n${receiptUrl}`);
  }

  await loadPending();
}


  async function markRejected(id: string) {
    const reason = window.prompt("Reason (optional)") || null;
    const { error } = await supabase
      .from("redemptions")
      .update({
        status: "rejected",
        admin_notes: reason,
        credited_amount: null,
        credited_at: null,
        credited_by: null,
      })
      .eq("id", id);
    if (error) alert(error.message);
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

  /* ---- Filtered scans ---- */
  const filteredScans = useMemo(() => {
    const q = scanQuery.trim().toLowerCase();
    return scans.filter(s => {
      const matchQ =
        !q ||
        (s.email ?? "").toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q);
      const matchOutcome = (scanOutcome === "all") || s.outcome === scanOutcome;
      return matchQ && matchOutcome;
    });
  }, [scans, scanQuery, scanOutcome]);

  if (isAdmin === null) return <div className="p-6">Loading…</div>;
  if (isAdmin === false) return <div className="p-6">Not authorized.</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <div className="flex gap-2">
          <Link to="/admin/qr" className="bg-secondary text-secondary-foreground border border-border rounded px-3 py-1 hover:bg-secondary/80 transition-colors">QR Generator</Link>
          <button onClick={() => { loadPending(); loadScans(); }} className="bg-primary text-primary-foreground border border-border rounded px-3 py-1 hover:bg-primary/90 transition-colors">
            Refresh
          </button>
        </div>
      </div>

      {toolMsg && (
        <div className="glass-panel text-sm px-3 py-2 rounded border-l-4 border-l-primary text-foreground">
          {toolMsg}
        </div>
      )}

      {/* ---------- Pending Redemptions (group by user) ---------- */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Pending Redemptions</h2>
          <div className="flex items-center gap-2">
            <button onClick={approveSelected} className="bg-primary text-primary-foreground border border-border rounded px-3 py-1 hover:bg-primary/90 transition-colors">Approve Selected</button>
            <button onClick={clearSelection} className="bg-secondary text-secondary-foreground border border-border rounded px-3 py-1 hover:bg-secondary/80 transition-colors">Clear Selection</button>
          </div>
        </div>

        {loadingPending ? (
          <div>Loading pending…</div>
        ) : pending.length === 0 ? (
          <div className="opacity-70">No pending redemptions.</div>
        ) : (
          Object.entries(pendingGroups).map(([userId, reds]) => {
            const selectedCount = reds.filter(r => selected[r.id]).length;
            return (
              <div key={userId} className="card-premium rounded-xl p-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                  <div>
                    <div className="font-medium text-foreground">User ID: {userId}</div>
                    <div className="text-xs text-muted-foreground">Redemptions: {reds.length}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => selectAllUser(userId)} className="bg-secondary text-secondary-foreground border border-border rounded px-3 py-1 text-sm hover:bg-secondary/80 transition-colors">
                      Select All ({reds.length})
                    </button>
                    {selectedCount > 0 && (
                      <div className="text-xs text-muted-foreground">Selected: {selectedCount}</div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {reds.map((r) => (
                    <div key={r.id} className="glass-panel border border-border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-2 text-foreground">
                          <input
                            type="checkbox"
                            checked={!!selected[r.id]}
                            onChange={() => toggle(r.id)}
                            className="accent-primary"
                          />
                          <span className="font-medium">
                            Redemption <span className="text-muted-foreground">{r.id.slice(0, 8)}…</span>
                          </span>
                        </label>
                        <div className="text-xs text-muted-foreground">
                          Submitted {new Date(r.submitted_at).toLocaleString()}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {r.cards?.map((c) => (
                          <div key={c.card_id} className="card-premium border border-border rounded-lg overflow-hidden">
                            {c.image_url && (
                              <img
                                src={c.image_url}
                                alt={c.name ?? "Card"}
                                className="w-full aspect-[3/4] object-cover"
                              />
                            )}
                            <div className="p-2 text-sm">
                              <div className="font-medium truncate text-foreground">{c.name ?? "—"}</div>
                              <div className="text-muted-foreground">
                                {c.era ?? "—"} • {c.suit ?? "—"} {c.rank ?? "—"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Rarity: {c.rarity ?? "—"} · Value: {c.trader_value ?? "—"}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2 mt-3">
                        <button onClick={() => markCredited(r.id)} className="bg-primary text-primary-foreground border border-border rounded px-3 py-1 hover:bg-primary/90 transition-colors">
                          Approve (single)
                        </button>
                        <button onClick={() => markRejected(r.id)} className="bg-destructive text-destructive-foreground border border-border rounded px-3 py-1 hover:bg-destructive/90 transition-colors">
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* ---------- Scan Log ---------- */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Scan Log (latest 200)</h2>
          <button onClick={loadScans} className="bg-secondary text-secondary-foreground border border-border rounded px-3 py-1 text-sm hover:bg-secondary/80 transition-colors">Refresh</button>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <input
            value={scanQuery}
            onChange={(e) => setScanQuery(e.target.value)}
            placeholder="Search by email or code…"
            className="glass-panel border border-border rounded px-2 py-1 text-foreground placeholder:text-muted-foreground"
          />
          <select
            value={scanOutcome}
            onChange={(e) => setScanOutcome(e.target.value as any)}
            className="glass-panel border border-border rounded px-2 py-1 text-foreground"
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
          <div>Loading scan log…</div>
        ) : filteredScans.length === 0 ? (
          <div className="opacity-70 text-sm">No scans match your filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">When</th>
                  <th className="py-2 pr-3">Email</th>
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
        )}
      </section>

      {/* ---------- Blocked users ---------- */}
      <section className="card-premium rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-foreground">Blocked users</h2>
          <button onClick={loadBlocked} className="bg-secondary text-secondary-foreground border border-border rounded px-3 py-1 text-sm hover:bg-secondary/80 transition-colors">
            Refresh list
          </button>
        </div>

        <div className="mb-3">
          <BlockTool onMsg={setToolMsg} onChanged={loadBlocked} />
        </div>

        {loadingBlocked ? (
          <div className="text-muted-foreground text-sm">Loading blocked users…</div>
        ) : blocked.length === 0 ? (
          <div className="text-muted-foreground text-sm">No one is blocked.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-border">
                  <th className="py-2 pr-3 text-foreground">Email</th>
                  <th className="py-2 pr-3 text-foreground">Reason</th>
                  <th className="py-2 pr-3 text-foreground">Blocked at</th>
                  <th className="py-2 pr-3 text-foreground">Blocked by</th>
                  <th className="py-2 pr-0"></th>
                </tr>
              </thead>
              <tbody>
                {blocked.map((b) => (
                  <tr key={b.user_id} className="border-b border-border last:border-b-0">
                    <td className="py-2 pr-3 text-foreground">{b.email ?? "—"}</td>
                    <td className="py-2 pr-3 text-foreground">{b.reason ?? "—"}</td>
                    <td className="py-2 pr-3 text-foreground">{new Date(b.blocked_at).toLocaleString()}</td>
                    <td className="py-2 pr-3 text-foreground">{b.blocked_by_email ?? "—"}</td>
                    <td className="py-2 pr-0">
                      {b.email && (
                        <button
                          onClick={async () => {
                            const { data, error } = await supabase.rpc("admin_unblock_user_by_email", { p_email: b.email! });
                            if (error) setToolMsg(error.message);
                            else if (data?.ok) { setToolMsg(`✅ Unblocked ${b.email}`); await loadBlocked(); }
                          }}
                          className="bg-destructive text-destructive-foreground border border-border rounded px-2 py-1 text-xs hover:bg-destructive/90 transition-colors"
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
    const { data, error } = await supabase.rpc("admin_unblock_user_by_email", {
      p_email: e,
    });
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
      <div className="text-sm font-medium whitespace-nowrap text-foreground">Block / Unblock</div>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="user@email.com"
        className="glass-panel border border-border rounded px-2 py-1 w-full md:w-64 text-foreground placeholder:text-muted-foreground"
      />
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (optional)"
        className="glass-panel border border-border rounded px-2 py-1 w-full md:w-64 text-foreground placeholder:text-muted-foreground"
      />
      <div className="flex gap-2">
        <button onClick={doBlock} disabled={busy} className="bg-destructive text-destructive-foreground border border-border rounded px-3 py-1 text-sm hover:bg-destructive/90 transition-colors disabled:opacity-50">
          {busy ? "Blocking…" : "Block"}
        </button>
        <button onClick={doUnblock} disabled={busy} className="bg-primary text-primary-foreground border border-border rounded px-3 py-1 text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
          {busy ? "Unblocking…" : "Unblock"}
        </button>
      </div>
    </div>
  );
}
