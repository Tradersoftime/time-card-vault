// src/pages/Admin.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QrCode, RefreshCw, Shield, AlertTriangle } from "lucide-react";

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

export default function Admin() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<RedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toolMsg, setToolMsg] = useState<string | null>(null);

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
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (isAdmin !== true) return;
    loadQueue();
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

  async function markCredited(id: string) {
    const amtStr = window.prompt("TIME amount to credit?", "0");
    if (amtStr === null) return; // cancelled
    const amount = Number(amtStr);
    if (!Number.isFinite(amount)) {
      alert("Please enter a valid number.");
      return;
    }
    const ref = window.prompt("External reference / note (optional)") || null;

    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) {
      alert("Not signed in.");
      return;
    }

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

  if (isAdmin === null) return <div className="p-6 text-foreground">Loading…</div>;
  if (isAdmin === false) return <div className="p-6 text-foreground">Not authorized.</div>;
  if (error) return <div className="p-6 text-destructive">Error: {error}</div>;

  return (
    <div className="p-6 space-y-4 bg-background text-foreground">
      {/* Header with QR Generator link */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
          <Shield className="h-6 w-6 text-destructive" />
          Admin — Redemptions
        </h1>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/qr">
              <QrCode className="h-4 w-4 mr-2" />
              QR Generator
            </Link>
          </Button>
          <Button onClick={loadQueue} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Admin tools */}
      <div className="glass-panel rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-3">
        <BlockTool onMsg={setToolMsg} />
        <UnclaimTool onMsg={setToolMsg} />
      </div>
      {toolMsg && <div className="text-sm text-foreground bg-muted p-3 rounded-lg">{toolMsg}</div>}

      {loading ? (
        <div className="text-foreground">Loading queue…</div>
      ) : items.length === 0 ? (
        <div className="text-muted-foreground">No pending redemptions.</div>
      ) : (
        <div className="space-y-4">
          {items.map((r) => (
            <div key={r.id} className="glass-panel rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="font-medium text-foreground">
                  Redemption <span className="text-muted-foreground">{r.id.slice(0, 8)}…</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Submitted {new Date(r.submitted_at).toLocaleString()}
                </div>
              </div>

              <div className="text-sm text-muted-foreground mb-2">
                User: <code className="text-foreground bg-muted px-1 rounded">{r.user_id}</code> • Cards:{" "}
                {r.redemption_cards?.length ?? 0}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                {r.redemption_cards?.map((rc) => {
                  const c = rc.cards || {};
                  return (
                    <div key={rc.card_id} className="glass-panel rounded-lg overflow-hidden">
                      {c.image_url && (
                        <img
                          src={c.image_url}
                          alt={c.name ?? "Card"}
                          className="w-full aspect-[3/4] object-cover"
                        />
                      )}
                      <div className="p-2 text-sm">
                        <div className="font-medium truncate text-foreground">
                          {c.name ?? "—"}
                        </div>
                        <div className="text-muted-foreground">
                          {c.era ?? "—"} • {c.suit ?? "—"} {c.rank ?? "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Rarity: {c.rarity ?? "—"} · Value: {c.trader_value ?? "—"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => markCredited(r.id)}
                  variant="default"
                  size="sm"
                >
                  Mark Credited
                </Button>
                <Button
                  onClick={() => markRejected(r.id)}
                  variant="destructive"
                  size="sm"
                >
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Admin helper components ---------------- */

function BlockTool({ onMsg }: { onMsg: (m: string | null) => void }) {
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function doBlock() {
    onMsg(null);
    if (!email.trim()) {
      onMsg("Enter an email.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.rpc("admin_block_user_by_email", {
      p_email: email.trim(),
      p_reason: reason.trim() || null,
    });
    setBusy(false);
    if (error) onMsg(error.message);
    else if (data?.ok) onMsg("✅ User blocked.");
    else onMsg("Could not block user.");
  }

  async function doUnblock() {
    onMsg(null);
    if (!email.trim()) {
      onMsg("Enter an email.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.rpc("admin_unblock_user_by_email", {
      p_email: email.trim(),
    });
    setBusy(false);
    if (error) onMsg(error.message);
    else if (data?.ok) onMsg("✅ User unblocked.");
    else onMsg("Could not unblock user.");
  }

  return (
    <div className="flex flex-col md:flex-row md:items-center gap-2 w-full">
      <div className="text-sm font-medium whitespace-nowrap text-foreground flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-destructive" />
        Block / Unblock
      </div>
      <Input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="user@email.com"
        className="w-full md:w-64 text-foreground"
      />
      <Input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (optional)"
        className="w-full md:w-64 text-foreground"
      />
      <div className="flex gap-2">
        <Button onClick={doBlock} disabled={busy} variant="destructive" size="sm">
          {busy ? "Blocking…" : "Block"}
        </Button>
        <Button onClick={doUnblock} disabled={busy} variant="outline" size="sm">
          {busy ? "Unblocking…" : "Unblock"}
        </Button>
      </div>
    </div>
  );
}

function UnclaimTool({ onMsg }: { onMsg: (m: string | null) => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function unclaim() {
    onMsg(null);
    if (!code.trim()) {
      onMsg("Enter a code.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.rpc("admin_unclaim_card", {
      p_code: code.trim(),
    });
    setBusy(false);
    if (error) {
      onMsg(error.message);
      return;
    }
    if (data?.ok) onMsg("✅ Unclaimed (or wasn’t owned).");
    else if (data?.error === "credited_cannot_unclaim")
      onMsg("❌ Card has credited TIME; cannot unclaim.");
    else if (data?.error === "not_found") onMsg("Card not found.");
    else if (data?.error === "forbidden") onMsg("Not authorized.");
    else onMsg("Something went wrong.");
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Enter card code (e.g., TOT-ABCD...)"
        className="text-foreground"
      />
      <Button onClick={unclaim} disabled={busy} variant="outline" size="sm">
        {busy ? "Working…" : "Unclaim"}
      </Button>
    </div>
  );
}
