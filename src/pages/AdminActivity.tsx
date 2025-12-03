import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Search } from "lucide-react";

type ScanRow = {
  created_at: string;
  user_id: string;
  email: string | null;
  code: string;
  card_id: string | null;
  outcome: "claimed" | "already_owner" | "owned_by_other" | "not_found" | "blocked" | "error";
};

type CreditedRow = {
  redemption_id: string;
  credited_at: string | null;
  user_id: string;
  user_email: string | null;
  card_id: string | null;
  card_code: string | null;
  amount_time: number | null;
  credited_count: number;
};

export default function AdminActivity() {
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [loadingScans, setLoadingScans] = useState(false);
  const [scanQuery, setScanQuery] = useState("");
  const [scanOutcome, setScanOutcome] = useState<ScanRow["outcome"] | "all">("all");
  const [scanSortKey, setScanSortKey] = useState<"created_at" | "email">("created_at");
  const [scanSortDir, setScanSortDir] = useState<"asc" | "desc">("desc");

  const [creditedRows, setCreditedRows] = useState<CreditedRow[]>([]);
  const [loadingCredited, setLoadingCredited] = useState(false);
  const [credQuery, setCredQuery] = useState("");
  const [credSortKey, setCredSortKey] = useState<"credited_at" | "user_email" | "credited_count" | "total_time" | "redemption_id">("credited_at");
  const [credSortDir, setCredSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    loadScans();
    loadCredited();
  }, []);

  async function loadScans() {
    setLoadingScans(true);
    const { data } = await supabase.rpc("admin_scan_events", { p_limit: 200 });
    setScans((data as ScanRow[]) ?? []);
    setLoadingScans(false);
  }

  async function loadCredited() {
    setLoadingCredited(true);
    const { data } = await supabase.rpc("admin_recent_credited", { p_limit: 500 });
    setCreditedRows((data as CreditedRow[]) ?? []);
    setLoadingCredited(false);
  }

  const filteredScans = useMemo(() => {
    const q = scanQuery.trim().toLowerCase();
    const rows = scans.filter((s) => {
      const matchQ = !q || (s.email ?? "").toLowerCase().includes(q) || s.code.toLowerCase().includes(q);
      const matchOutcome = scanOutcome === "all" || s.outcome === scanOutcome;
      return matchQ && matchOutcome;
    });
    const dir = scanSortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (scanSortKey === "created_at") {
        return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
      }
      return ((a.email ?? "") > (b.email ?? "") ? 1 : -1) * dir;
    });
  }, [scans, scanQuery, scanOutcome, scanSortKey, scanSortDir]);

  const creditedGrouped = useMemo(() => {
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

    const map = new Map<string, {
      redemption_id: string;
      credited_at: string | null;
      user_email: string | null;
      credited_count: number;
      total_time: number;
      codes: string[];
    }>();

    for (const r of base) {
      const g = map.get(r.redemption_id) ?? {
        redemption_id: r.redemption_id,
        credited_at: r.credited_at,
        user_email: r.user_email,
        credited_count: 0,
        total_time: 0,
        codes: [],
      };
      if (r.card_code) g.codes.push(r.card_code);
      g.total_time += Number(r.amount_time ?? 0);
      if (!g.credited_at || (r.credited_at && new Date(r.credited_at) > new Date(g.credited_at))) {
        g.credited_at = r.credited_at;
      }
      map.set(r.redemption_id, g);
    }

    const grouped = Array.from(map.values()).map((g) => ({
      ...g,
      credited_count: g.codes.length,
    }));

    const dir = credSortDir === "asc" ? 1 : -1;
    return grouped.sort((a, b) => {
      switch (credSortKey) {
        case "credited_at":
          return (new Date(a.credited_at ?? 0).getTime() - new Date(b.credited_at ?? 0).getTime()) * dir;
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

  const outcomeColors: Record<string, string> = {
    claimed: "bg-success/10 text-success",
    already_owner: "bg-blue-500/10 text-blue-400",
    owned_by_other: "bg-orange-500/10 text-orange-400",
    not_found: "bg-muted text-muted-foreground",
    blocked: "bg-destructive/10 text-destructive",
    error: "bg-purple-500/10 text-purple-400",
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Activity Logs</h1>
        <p className="text-muted-foreground">View scan events and credited redemptions</p>
      </div>

      <Tabs defaultValue="scans" className="space-y-4">
        <TabsList className="glass-panel">
          <TabsTrigger value="scans">Scan Activity</TabsTrigger>
          <TabsTrigger value="credited">Credited Log</TabsTrigger>
        </TabsList>

        <TabsContent value="scans">
          <Card className="glass-panel border-border/30">
            <CardHeader>
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                  <CardTitle>Scan Activity Log</CardTitle>
                  <CardDescription>Latest 200 scan events and their outcomes</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={loadScans} disabled={loadingScans}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loadingScans ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3 items-center mb-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={scanQuery}
                    onChange={(e) => setScanQuery(e.target.value)}
                    placeholder="Search by email or code..."
                    className="pl-9"
                  />
                </div>
                <Select value={scanOutcome} onValueChange={(v) => setScanOutcome(v as any)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter outcome" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All outcomes</SelectItem>
                    <SelectItem value="claimed">Claimed</SelectItem>
                    <SelectItem value="already_owner">Already Owner</SelectItem>
                    <SelectItem value="owned_by_other">Owned by Other</SelectItem>
                    <SelectItem value="not_found">Not Found</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {loadingScans ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                  <div className="text-muted-foreground">Loading...</div>
                </div>
              ) : filteredScans.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No scan events found</div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50">
                        <ThSort label="Time" active={scanSortKey === "created_at"} dir={scanSortDir} onClick={() => { setScanSortKey("created_at"); setScanSortDir(d => d === "asc" ? "desc" : "asc"); }} />
                        <ThSort label="User" active={scanSortKey === "email"} dir={scanSortDir} onClick={() => { setScanSortKey("email"); setScanSortDir(d => d === "asc" ? "desc" : "asc"); }} />
                        <th className="py-3 pr-4 text-left font-medium text-foreground">Code</th>
                        <th className="py-3 pr-4 text-left font-medium text-foreground">Outcome</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredScans.map((s, i) => (
                        <tr key={i} className="border-b border-border/30 hover:bg-muted/5">
                          <td className="py-3 pr-4 font-mono text-xs text-foreground">{new Date(s.created_at).toLocaleString()}</td>
                          <td className="py-3 pr-4 text-foreground">{s.email ?? "—"}</td>
                          <td className="py-3 pr-4">
                            <span className="px-2 py-1 rounded bg-muted text-muted-foreground text-xs font-mono">{s.code}</span>
                          </td>
                          <td className="py-3 pr-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${outcomeColors[s.outcome] || ""}`}>
                              {s.outcome.replace("_", " ").toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credited">
          <Card className="glass-panel border-border/30">
            <CardHeader>
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                  <CardTitle>Credited Log — {creditedGrouped.length}</CardTitle>
                  <CardDescription>Recently credited redemptions and card details</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={loadCredited} disabled={loadingCredited}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loadingCredited ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={credQuery}
                  onChange={(e) => setCredQuery(e.target.value)}
                  placeholder="Search codes, emails, users..."
                  className="pl-9"
                />
              </div>

              {loadingCredited ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                  <div className="text-muted-foreground">Loading...</div>
                </div>
              ) : creditedGrouped.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No credited redemptions yet</div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50">
                        <ThSort label="When" active={credSortKey === "credited_at"} dir={credSortDir} onClick={() => { setCredSortKey("credited_at"); setCredSortDir(d => d === "asc" ? "desc" : "asc"); }} />
                        <ThSort label="User" active={credSortKey === "user_email"} dir={credSortDir} onClick={() => { setCredSortKey("user_email"); setCredSortDir(d => d === "asc" ? "desc" : "asc"); }} />
                        <th className="py-3 pr-4 text-left font-medium text-foreground">Codes</th>
                        <ThSort label="# Cards" active={credSortKey === "credited_count"} dir={credSortDir} onClick={() => { setCredSortKey("credited_count"); setCredSortDir(d => d === "asc" ? "desc" : "asc"); }} />
                        <ThSort label="TIME" active={credSortKey === "total_time"} dir={credSortDir} onClick={() => { setCredSortKey("total_time"); setCredSortDir(d => d === "asc" ? "desc" : "asc"); }} />
                        <th className="py-3 pr-4 text-left font-medium text-foreground">Receipt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {creditedGrouped.map((g) => (
                        <tr key={g.redemption_id} className="border-b border-border/30 hover:bg-muted/5">
                          <td className="py-3 pr-4 text-foreground">{g.credited_at ? new Date(g.credited_at).toLocaleString() : "—"}</td>
                          <td className="py-3 pr-4 text-foreground">{g.user_email ?? "—"}</td>
                          <td className="py-3 pr-4">
                            <div className="flex flex-wrap gap-1">
                              {g.codes.slice(0, 5).map((code) => (
                                <span key={code} className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-mono">{code}</span>
                              ))}
                              {g.codes.length > 5 && <span className="text-xs text-muted-foreground">+{g.codes.length - 5}</span>}
                            </div>
                          </td>
                          <td className="py-3 pr-4 font-medium text-foreground">{g.credited_count}</td>
                          <td className="py-3 pr-4 text-primary font-semibold">{g.total_time}</td>
                          <td className="py-3 pr-4">
                            <Link to={`/receipt/${g.redemption_id}`} className="text-primary hover:underline font-mono text-xs" target="_blank">
                              {g.redemption_id.slice(0, 8)}…
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ThSort({ label, active, dir, onClick }: { label: string; active?: boolean; dir?: "asc" | "desc"; onClick?: () => void }) {
  return (
    <th className="py-3 pr-4 text-left font-medium text-foreground cursor-pointer select-none hover:text-primary" onClick={onClick}>
      {label} {active ? (dir === "asc" ? "▲" : "▼") : ""}
    </th>
  );
}
