// src/pages/Admin.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";

/* ---------- Types ---------- */

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
  const [toolMsg, setToolMsg] = useState<string | null>(null);

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
    loadBlocked();
    loadScans();
    loadCredited();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  /* ---- Loaders ---- */

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
                to="/admin/users" 
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium glow-primary"
              >
                User Management
              </Link>
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
              <Link 
                to="/admin/redemptions" 
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium glow-primary"
              >
                Redemptions
              </Link>
              <button
                onClick={() => {
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

        {/* ---------- Redemptions Section ---------- */}
        <div className="glass-panel p-6 rounded-2xl">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-1">Card Redemptions</h2>
              <p className="text-sm text-muted-foreground">Manage individual card redemption requests</p>
            </div>
            <Link 
              to="/admin/redemptions"
              className="px-4 py-2 bg-gradient-to-r from-primary to-primary-glow text-primary-foreground rounded-lg hover:opacity-90 transition-opacity font-medium glow-primary"
            >
              Manage Redemptions
            </Link>
          </div>
          
          <div className="text-center py-8">
            <div className="text-muted-foreground mb-4">
              Use the dedicated redemptions page to review and process individual card redemption requests.
            </div>
            <Link 
              to="/admin/redemptions"
              className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium glow-primary"
            >
              Go to Redemptions →
            </Link>
          </div>
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
            <ScrollArea className="h-[500px]">
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
            </ScrollArea>
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
          <ScrollArea className="h-[500px]">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <Th
                      label="Time"
                      active={scanSortKey === "created_at"}
                      dir={scanSortDir}
                      onClick={() => {
                        setScanSortKey("created_at");
                        setScanSortDir((d) => (d === "asc" ? "desc" : "asc"));
                      }}
                    />
                    <Th
                      label="User"
                      active={scanSortKey === "email"}
                      dir={scanSortDir}
                      onClick={() => {
                        setScanSortKey("email");
                        setScanSortDir((d) => (d === "asc" ? "desc" : "asc"));
                      }}
                    />
                    <th className="py-3 pr-4 text-left font-medium text-foreground">Code</th>
                    <th className="py-3 pr-4 text-left font-medium text-foreground">Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredScans.map((s, i) => (
                    <tr key={i} className="border-b border-border/30 hover:bg-muted/5 transition-colors">
                      <td className="py-3 pr-4 text-foreground font-mono text-xs">
                        {new Date(s.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 pr-4 text-foreground">{s.email ?? "—"}</td>
                      <td className="py-3 pr-4">
                        <span className="px-2 py-1 rounded bg-muted text-muted-foreground text-xs font-mono">
                          {s.code}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            s.outcome === "claimed"
                              ? "bg-green-100 text-green-800"
                              : s.outcome === "already_owner"
                              ? "bg-blue-100 text-blue-800"
                              : s.outcome === "owned_by_other"
                              ? "bg-orange-100 text-orange-800"
                              : s.outcome === "not_found"
                              ? "bg-gray-100 text-gray-800"
                              : s.outcome === "blocked"
                              ? "bg-red-100 text-red-800"
                              : "bg-purple-100 text-purple-800"
                          }`}
                        >
                          {s.outcome.replace("_", " ").toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ScrollArea>
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
