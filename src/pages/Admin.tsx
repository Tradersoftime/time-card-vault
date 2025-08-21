// src/pages/Admin.tsx
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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

export default function Admin() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<RedItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Admin tools messaging + blocked list state
  const [toolMsg, setToolMsg] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<BlockedRow[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);

  // Check admin
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
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (isAdmin !== true) return;
    loadQueue();
    loadBlocked();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  async function loadQueue() {
    setLoading(true);
    setError(null);
    setToolMsg(null);
    const { data, error } = await supabase
      .from("redemptions")
      .select(`
        id,
        user_id,
        status,
        submitted_at,
        redemption_cards (
          card_id,
          cards (
            name,
            image_url,
            era,
            suit,
            rank,
            rarity,
            trader_value
          )
        )
      `)
      .eq("status", "pending")
      .order("submitted_at", { ascending: true });

    if (error) setError(error.message);
    setItems((data as any) ?? []);
    setLoading(false);
  }

  async function loadBlocked() {
    setLoadingBlocked(true);
    const { data, error } = await supabase.rpc("admin_list_blocked");
    if (error) setToolMsg(error.message);
    setBlocked((data as BlockedRow[]) ?? []);
    setLoadingBlocked(false);
  }

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
    await loadQueue();
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
    await loadQueue();
  }

  async function unblock(email: string) {
    setToolMsg(null);
    const { data, error } = await supabase.rpc("admin_unblock_user_by_email", {
      p_email: email,
    });
    if (error) setToolMsg(error.message);
    else if (data?.ok) {
      setToolMsg(`✅ Unblocked ${email}`);
      await loadBlocked();
    } else {
      setToolMsg("Could not unblock user.");
    }
  }

  if (isAdmin === null) return <div className="p-6">Loading…</div>;
  if (isAdmin === false) return <div className="p-6">Not authorized.</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin — Redemptions</h1>
        <button onClick={loadQueue} className="border rounded px-3 py-1">
          Refresh
        </button>
      </div>

      {/* Admin tools */}
      <div className="border rounded-xl p-3">
        <div className="text-sm font-medium mb-2">Admin Tools</div>
        <BlockTool onMsg={setToolMsg} onChanged={loadBlocked} />
        {toolMsg && <div className="mt-2 text-sm opacity-90">{toolMsg}</div>}
      </div>

      {/* Blocked users list */}
      <section className="border rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Blocked users</h2>
          <button onClick={loadBlocked} className="border rounded px-3 py-1 text-sm">
            Refresh list
          </button>
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
                  <th className="py-2 pr-3"></th>
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
                          onClick={() => unblock(b.email!)}
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

      {/* Redemption queue */}
      {loading ? (
        <div>Loading queue…</div>
      ) : items.length === 0 ? (
        <div className="opacity-70">No pending redemptions.</div>
      ) : (
        <div className="space-y-4">
          {items.map((r) => (
            <div key={r.id} className="border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="font-medium">
                  Redemption <span className="opacity-70">{r.id.slice(0, 8)}…</span>
                </div>
                <div className="text-sm opacity-70">
                  Submitted {new Date(r.submitted_at).toLocaleString()}
                </div>
              </div>

              <div className="text-sm opacity-80 mb-2">
                User: <code className="opacity-90">{r.user_id}</code> • Cards: {r.redemption_cards?.length ?? 0}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                {r.redemption_cards?.map((rc) => {
                  const c = rc.cards || {};
                  return (
                    <div key={rc.card_id} className="border rounded-lg overflow-hidden">
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
                  );
                })}
              </div>

              <div className="flex gap-2">
                <button onClick={() => markCredited(r.id)} className="border rounded px-3 py-1">
                  Mark Credited
                </button>
                <button onClick={() => markRejected(r.id)} className="border rounded px-3 py-1">
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
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
