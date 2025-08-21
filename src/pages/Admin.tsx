// src/pages/Admin.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
    if (!Number.isFinite(amount)) {
      alert("Please enter a valid number.");
      return;
    }
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

  if (isAdmin === null) return <div className="p-6 text-foreground">Loading…</div>;
  if (isAdmin === false) return <div className="p-6 text-foreground">Not authorized.</div>;
  if (error) return <div className="p-6 text-destructive">Error: {error}</div>;

  return (
    <div className="min-h-screen bg-background text-foreground p-6 space-y-6">
      {/* Header with QR Generator link */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">Admin — Redemptions</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link to="/admin/qr">QR Generator</Link>
              </Button>
              <Button variant="outline" onClick={loadQueue}>Refresh</Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Admin tools */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <BlockTool onMsg={setToolMsg} onChanged={loadBlocked} />
            <UnclaimTool onMsg={setToolMsg} />
          </div>
          {toolMsg && <div className="text-sm text-muted-foreground mt-4">{toolMsg}</div>}
        </CardContent>
      </Card>

      {/* Blocked users list */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Blocked users</CardTitle>
            <Button variant="outline" size="sm" onClick={loadBlocked}>
              Refresh list
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingBlocked ? (
            <div className="text-muted-foreground text-sm">Loading blocked users…</div>
          ) : blocked.length === 0 ? (
            <div className="text-muted-foreground text-sm">No one is blocked.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Blocked at</TableHead>
                    <TableHead>Blocked by</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blocked.map((b) => (
                    <TableRow key={b.user_id}>
                      <TableCell>{b.email ?? "—"}</TableCell>
                      <TableCell>{b.reason ?? "—"}</TableCell>
                      <TableCell>
                        {new Date(b.blocked_at).toLocaleString()}
                      </TableCell>
                      <TableCell>{b.blocked_by_email ?? "—"}</TableCell>
                      <TableCell>
                        {b.email && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => unblock(b.email!)}
                          >
                            Unblock
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Redemption queue */}
      {loading ? (
        <div className="text-foreground">Loading queue…</div>
      ) : items.length === 0 ? (
        <div className="text-muted-foreground">No pending redemptions.</div>
      ) : (
        <div className="space-y-4">
          {items.map((r) => (
            <Card key={r.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-medium text-foreground">
                    Redemption <span className="text-muted-foreground">{r.id.slice(0, 8)}…</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Submitted {new Date(r.submitted_at).toLocaleString()}
                  </div>
                </div>

                <div className="text-sm text-muted-foreground mb-2">
                  User: <code className="text-foreground">{r.user_id}</code> • Cards: {r.redemption_cards?.length ?? 0}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  {r.redemption_cards?.map((rc) => {
                    const c = rc.cards || {};
                    return (
                      <Card key={rc.card_id} className="overflow-hidden">
                        {c.image_url && (
                          <img
                            src={c.image_url}
                            alt={c.name ?? "Card"}
                            className="w-full aspect-[3/4] object-cover"
                          />
                        )}
                        <CardContent className="p-2">
                          <div className="text-sm">
                            <div className="font-medium truncate text-foreground">{c.name ?? "—"}</div>
                            <div className="text-muted-foreground">
                              {c.era ?? "—"} • {c.suit ?? "—"} {c.rank ?? "—"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Rarity: {c.rarity ?? "—"} · Value: {c.trader_value ?? "—"}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <Button variant="default" onClick={() => markCredited(r.id)}>
                    Mark Credited
                  </Button>
                  <Button variant="outline" onClick={() => markRejected(r.id)}>
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Admin helper components ---------------- */

function BlockTool({ onMsg, onChanged }: { onMsg: (m: string | null) => void; onChanged: () => void }) {
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function doBlock() {
    onMsg(null);
    if (!email.trim()) { onMsg("Enter an email."); return; }
    setBusy(true);
    const { data, error } = await supabase.rpc("admin_block_user_by_email", {
      p_email: email.trim(),
      p_reason: reason.trim() || null,
    });
    setBusy(false);
    if (error) onMsg(error.message);
    else if (data?.ok) {
      onMsg(`✅ Blocked ${email.trim()}.`);
      onChanged();
    } else onMsg("Could not block user.");
  }

  async function doUnblock() {
    onMsg(null);
    if (!email.trim()) { onMsg("Enter an email."); return; }
    setBusy(true);
    const { data, error } = await supabase.rpc("admin_unblock_user_by_email", {
      p_email: email.trim(),
    });
    setBusy(false);
    if (error) onMsg(error.message);
    else if (data?.ok) {
      onMsg(`✅ Unblocked ${email.trim()}.`);
      onChanged();
    } else onMsg("Could not unblock user.");
  }

  return (
    <div className="flex flex-col md:flex-row md:items-center gap-2 w-full">
      <div className="text-sm font-medium whitespace-nowrap text-foreground">Block / Unblock</div>
      <Input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="user@email.com"
        className="w-full md:w-64"
      />
      <Input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (optional)"
        className="w-full md:w-64"
      />
      <div className="flex gap-2">
        <Button variant="default" size="sm" onClick={doBlock} disabled={busy}>
          {busy ? "Blocking…" : "Block"}
        </Button>
        <Button variant="outline" size="sm" onClick={doUnblock} disabled={busy}>
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
    if (!code.trim()) { onMsg("Enter a code."); return; }
    setBusy(true);
    const { data, error } = await supabase.rpc("admin_unclaim_card", { p_code: code.trim() });
    setBusy(false);
    if (error) { onMsg(error.message); return; }
    if (data?.ok) onMsg("✅ Unclaimed (or wasn’t owned).");
    else if (data?.error === "credited_cannot_unclaim") onMsg("❌ Card has credited TIME; cannot unclaim.");
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
        className="w-full"
      />
      <Button variant="outline" size="sm" onClick={unclaim} disabled={busy}>
        {busy ? "Working…" : "Unclaim"}
      </Button>
    </div>
  );
}
