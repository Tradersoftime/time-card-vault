// src/pages/Scan.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Scanner } from "@yudiel/react-qr-scanner";
import { supabase } from "@/integrations/supabase/client";

type LogItem = {
  id: string;
  ts: number;
  code: string;
  status: "claimed" | "already_owner" | "owned_by_other" | "not_found" | "blocked" | "error";
  message: string;
  card?: {
    id?: string;
    name?: string | null;
    image_url?: string | null;
    era?: string | null;
    suit?: string | null;
    rank?: string | null;
    rarity?: string | null;
    trader_value?: string | null;
  };
};

export default function Scan() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  // live log
  const [log, setLog] = useState<LogItem[]>([]);
  // per-code cooldown so the same QR doesn’t spam
  const cooldownRef = useRef<Record<string, number>>({});
  const COOLDOWN_MS = 3000;

  // Ensure signed in
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) navigate("/auth/login?next=/scan", { replace: true });
    })();
  }, [navigate]);

  /* ---------- tiny feedback: beep + vibrate ---------- */
  const audioCtxRef = useRef<AudioContext | null>(null);
  function beep(freq = 880, ms = 120) {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = audioCtxRef.current!;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = freq;
      g.gain.value = 0.0001;
      o.start();
      const t = ctx.currentTime;
      g.gain.exponentialRampToValueAtTime(0.2, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
      o.stop(t + ms / 1000);
    } catch { /* ignore */ }
  }
  function haptic(pattern: number | number[]) {
    try { navigator.vibrate?.(pattern as any); } catch { /* ignore */ }
  }
  function feedback(status: LogItem["status"]) {
    switch (status) {
      case "claimed":        beep(880, 120);  haptic(60); break;
      case "already_owner":  beep(660, 100);  haptic(40); break;
      case "owned_by_other": beep(440, 200);  haptic([120, 60, 120]); break;
      case "not_found":      beep(330, 160);  haptic(80); break;
      case "blocked":        beep(220, 220);  haptic([180, 80, 180]); break;
      case "error":          beep(200, 250);  haptic([200, 80, 200]); break;
    }
  }

  /* ---------- helpers ---------- */
  const now = () => Date.now();

  const pushLog = useCallback((item: LogItem) => {
    setLog(prev => [item, ...prev].slice(0, 30)); // keep last 30
  }, []);

  function shouldProcess(code: string) {
    const t = now();
    const last = cooldownRef.current[code] ?? 0;
    if (t - last < COOLDOWN_MS) return false;
    cooldownRef.current[code] = t;
    return true;
  }

  function extractCode(text: string): string | null {
    if (!text) return null;
    const s = text.trim();

    // Full URL? Try /r/:code or last path part
    if (/^https?:\/\//i.test(s)) {
      try {
        const url = new URL(s);
        const rMatch = url.pathname.match(/\/r\/([^/]+)$/i);
        if (rMatch?.[1]) return decodeURIComponent(rMatch[1]);
        const parts = url.pathname.split("/").filter(Boolean);
        if (parts.length > 0) return decodeURIComponent(parts[parts.length - 1]);
      } catch { /* ignore */ }
    }

    // Otherwise allow letters/digits/_/-
    const m = s.match(/[A-Za-z0-9\-_]+/);
    return m ? m[0] : null;
  }

  async function fetchCardById(id: string) {
    const { data } = await supabase
      .from("cards")
      .select("id,name,image_url,era,suit,rank,rarity,trader_value")
      .eq("id", id)
      .limit(1)
      .maybeSingle();
    return data || undefined;
  }

  async function fetchCardByCodeLike(code: string) {
    const { data } = await supabase
      .from("cards")
      .select("id,name,image_url,era,suit,rank,rarity,trader_value")
      .ilike("code", code)
      .limit(1)
      .maybeSingle();
    return data || undefined;
  }

  async function claim(code: string) {
    // session may expire mid-scan
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) { navigate("/auth/login?next=/scan", { replace: true }); return; }

    const { data, error } = await supabase.rpc("claim_card_and_log", {
      p_code: code,
      p_source: "scan",
    });

    if (error) {
      const item: LogItem = {
        id: crypto.randomUUID(),
        ts: now(),
        code,
        status: "error",
        message: error.message || "Error claiming card",
      };
      feedback(item.status);
      pushLog(item);
      return;
    }

    // ok or not_ok from RPC
    if (data?.ok) {
      const status: LogItem["status"] = data.already_owner ? "already_owner" : "claimed";
      const card = data.card_id ? await fetchCardById(data.card_id) : undefined;
      const item: LogItem = {
        id: crypto.randomUUID(),
        ts: now(),
        code,
        status,
        message: status === "claimed" ? "Added to your collection" : "Already in your collection",
        card,
      };
      feedback(item.status);
      pushLog(item);
      return;
    }

    // not ok → map
    let status: LogItem["status"] = "error";
    let message = "Something went wrong.";
    switch (data?.error) {
      case "not_found":      status = "not_found";      message = "Card not found."; break;
      case "owned_by_other": status = "owned_by_other"; message = "Already claimed by another user."; break;
      case "blocked":        status = "blocked";        message = "Your account is blocked from claiming cards."; break;
      case "not_signed_in":  navigate("/auth/login?next=/scan", { replace: true }); return;
    }

    // Don't fetch card details for owned_by_other to prevent information leakage
    const card = status === "owned_by_other" ? undefined : await fetchCardByCodeLike(code);
    const item: LogItem = {
      id: crypto.randomUUID(),
      ts: now(),
      code,
      status,
      message,
      card,
    };
    feedback(item.status);
    pushLog(item);
  }

  /* ---------- scanner callbacks ---------- */
  const onScan = useCallback(async (detectedCodes: any[]) => {
    const raw = detectedCodes?.[0]?.rawValue;
    if (!raw) return;
    const code = extractCode(raw);
    if (!code) { setError("Could not read a card code from that QR."); return; }
    if (!shouldProcess(code)) return; // debounce
    await claim(code);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onError = useCallback((err: any) => {
    setError(String(err?.message || err) || "Camera error");
  }, []);

  const tips = useMemo(() => [
    "Allow camera access when prompted.",
    "Hold the QR steady; fill most of the square.",
    "Good, even lighting helps focus and decode.",
  ], []);

  /* ---------- UI ---------- */
  function StatusPill({ s }: { s: LogItem["status"] }) {
    const map: Record<LogItem["status"], string> = {
      claimed: "bg-primary/20 text-primary border border-primary/30",
      already_owner: "bg-secondary/20 text-secondary-foreground border border-secondary/30",
      owned_by_other: "bg-muted/20 text-muted-foreground border border-muted/30",
      not_found: "bg-accent/20 text-accent-foreground border border-accent/30",
      blocked: "bg-destructive/20 text-destructive border border-destructive/30",
      error: "bg-destructive/20 text-destructive border border-destructive/30",
    };
    const label: Record<LogItem["status"], string> = {
      claimed: "Claimed",
      already_owner: "Already Yours",
      owned_by_other: "Owned by Another",
      not_found: "Not Found",
      blocked: "Blocked",
      error: "Error",
    };
    return <span className={`inline-block text-xs px-2 py-0.5 rounded ${map[s]}`}>{label[s]}</span>;
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Scan Cards</h1>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Camera */}
        <div className="space-y-3">
          <div className="card-premium border border-border rounded-xl overflow-hidden">
            <Scanner
              onScan={onScan}
              onError={onError}
              constraints={{ facingMode: "environment" }}
            />
          </div>

          {!cameraReady && (
            <div className="text-sm text-muted-foreground">Initializing camera… If asked, please allow camera access.</div>
          )}
          {error && (
            <div className="glass-panel text-sm px-3 py-2 rounded border-l-4 border-l-destructive text-destructive-foreground">
              {error}
            </div>
          )}
        </div>

        {/* Log */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-medium text-foreground">Scan Log</div>
            <div className="flex gap-2">
              <button onClick={() => navigate("/me/cards")} className="bg-primary text-primary-foreground border border-border rounded px-3 py-1 text-sm hover:bg-primary/90 transition-colors">
                Open My Collection
              </button>
              <button onClick={() => setLog([])} className="bg-secondary text-secondary-foreground border border-border rounded px-3 py-1 text-sm hover:bg-secondary/80 transition-colors">
                Clear Log
              </button>
            </div>
          </div>

          {log.length === 0 ? (
            <div className="text-muted-foreground text-sm">No scans yet. Point the camera at a card QR code.</div>
          ) : (
            <ul className="space-y-2">
              {log.map((row) => (
                <li key={row.id} className="card-premium border border-border rounded-lg p-2 flex gap-3 items-center">
                  <div className="w-12 h-16 bg-muted/40 rounded overflow-hidden flex-shrink-0">
                    {row.card?.image_url && row.status !== "owned_by_other" && (
                      <img src={row.card.image_url} alt={row.card?.name ?? "Card"} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-medium truncate text-foreground">
                        {row.status === "owned_by_other" ? row.code : (row.card?.name ?? row.code)}
                      </div>
                      <StatusPill s={row.status} />
                    </div>
                    {row.card && row.status !== "owned_by_other" && (
                      <div className="text-xs text-muted-foreground truncate">
                        {(row.card.era ?? "—")} • {(row.card.suit ?? "—")} {(row.card.rank ?? "—")}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">{row.message} · {new Date(row.ts).toLocaleTimeString()}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card-premium border border-border rounded-xl p-3">
        <div className="font-medium mb-2 text-foreground">Tips</div>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
          {tips.map((t, i) => <li key={i}>{t}</li>)}
        </ul>
      </div>
    </div>
  );
}

