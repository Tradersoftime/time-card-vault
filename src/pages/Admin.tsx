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
  email: string | null;
  submitted_at: string;
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

/* ---------- Page ---------- */

export default function Admin() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Pending redemptions (from RPC with emails)
  const [pending, setPending] = useState<PendingRedemption[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);

  // Selection for bulk actions (by redemption id)
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  // Admin tools messaging + blocked list
  const [toolMsg, setToolMsg] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<BlockedRow[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  /* ---- Loaders ---- */
  async function loadPending() {
    setLoadingPending(true);
    setSelected({});
    setError(null);
    const { data, error } = await supabase.rpc("admin_redemptions_pending");
    if (error) setError(error.message);
    setPending((data as PendingRedemption[]) ?? []);
    setLoadingPending(false);
  }

  async function loadBlocked() {
    setLoadingBlocked(true);
    const { data, error } = await supabase.rpc("admin_list_blocked");
    if (error) setToolMsg(error.message);
    setBlocked((data as BlockedRow[]) ?? []);
    setLoadingBlocked(false);
  }

  /* ---- Selection helpers ---- */
  function toggle(id: string) {
    setSelected(s => ({ ...s, [id]: !s[id] }));
  }
  function selectAllUser(emailKey: string) {
    const next = { ...selected };
    groups[emailKey]?.forEach(r => { next[r.id] = true; });
    setSelected(next);
  }
  function clearAll() {
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

  /* ---- Per-item approve / reject (kept for convenience) ---- */
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
    if (error) alert(error.message);
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

  /* ---- Group by user (email) ---- */
  const groups = useMemo<Record<string, PendingRedemption[]>>(() => {
    const map: Record<string, PendingRedemption[]> = {};
    for (const r of pending) {
      const key = (r.email || r.user_id);
      if (!map[key]) map[key] = [];
      map[key].push(r);
    }
    return map;
  }, [pending]);

  if (isAdmin === null) return <div className="p-6">Loading…</div>;
  if (isAdmin === false) return <div className="p-6">Not authorized.</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin — Redemptions</h1>
        <div className="flex gap-2">
          <Link to="/admin/qr" className="border rounded px-3 py-1">QR Generator</Link>
          <button onClick={loadPending} className="border rounded px-3 py-1">Refresh</button>
        </div>
      </div>

      {/* Global bulk bar */}
      <div className="border rounded-xl p-3 flex flex-wrap items-center gap-2">
        <button onClick={approveSelected} className="border rounded px-3 py-1">
          Approve Selected
        </button>
        <button onClick={clearAll} className="border rounded px-3 py-1">
          Clear Selection
        </button>
        {toolMsg && <div className="text-sm opacity-90">{toolMsg}</div>}
      </div>

      {/* Grouped pending by user */}
      <section className="space-y-5">
        {loadingPending ? (
          <div>Loading pending…</div>
        ) : pending.length === 0 ? (
          <div className="opacity-70">No pending redemptions.</div>
        ) : (
          Object.entries(groups).map(([emailKey, reds]) => {
            const email = reds[0]?.email ?? "—";
            const uid = reds[0]?.user_id ?? "—";
            const selectedCount = reds.filter(r => selected[r.id]).length;

            return (
              <div key={emailKey} className="border rounded-xl p-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                  <div>
                    <div className="font-medium">{email}</div>
                    <div className="text-xs opacity-70">User ID: {uid}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => selectAllUser(emailKey)}
                      className="border rounded px-3 py-1 text-sm"
                    >
                      Select All ({reds.length})
                    </button>
                    {selectedCount > 0 && (
                      <div className="text-xs opacity-80">
                        Selected in this user: {selectedCount}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {reds.map((r) => (
                    <div key={r.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!selected[r.id]}
                            onChange={() => toggle(r.id)}
                          />
                          <span className="font-medium">
                            Redemption <span className="opacity-70">{r.id.slice(0, 8)}…</span>
                          </span>
                        </label>
                        <div className="text-xs opacity-70">
                          Submitted {new Date(r.submitted_at).toLocaleString()}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {r.cards?.map((c) => (
                          <div key={c.card_id} className="border rounded-lg overflow-hidden">
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
                                Rarity: {c.rarity ?? "—"} · Value: {c.trader_value ?? "—"}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2 mt-3">
                        <button onClick={() => markCredited(r.id)} className="border rounded px-3 py-1">
                          Approve (single)
                        </button>
                        <button onClick={() => markRejected(r.id)} className="border rounded px-3 py-1">
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

      {/* Blocked users */}
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
