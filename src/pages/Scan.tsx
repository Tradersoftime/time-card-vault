// src/pages/Scan.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Html5QRScanner } from "@/components/Html5QRScanner";
import { Camera } from "lucide-react";

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

  // scanner state
  const processingRef = useRef<boolean>(false);

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [isFullScreenScannerOpen, setIsFullScreenScannerOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string>("");
  const [cooldownActive, setCooldownActive] = useState(false);
  const [cooldownTimer, setCooldownTimer] = useState(0);

  // live log
  const [log, setLog] = useState<LogItem[]>([]);
  const cooldownRef = useRef<Record<string, number>>({});
  const globalCooldownRef = useRef<number>(0);
  const COOLDOWN_MS = 2000; // 2 second cooldown for same code
  const GLOBAL_COOLDOWN_MS = 500; // 0.5 second between any scans

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
    
    // Global cooldown check
    if (t - globalCooldownRef.current < GLOBAL_COOLDOWN_MS) return false;
    
    // Code-specific cooldown check
    const last = cooldownRef.current[code] ?? 0;
    if (t - last < COOLDOWN_MS) return false;
    
    // If processing another scan, don't allow new ones
    if (processingRef.current) return false;
    
    return true;
  }

  function extractCodeOrToken(text: string): { value: string; type: 'code' | 'token' } | null {
    if (!text) return null;
    const s = text.trim();

    // Full URL? Check for different formats
    if (/^https?:\/\//i.test(s)) {
      try {
        const url = new URL(s);
        
        // New format: /claim?token=ABC123XYZ
        if (url.pathname === '/claim' && url.searchParams.has('token')) {
          const token = url.searchParams.get('token');
          if (token) return { value: token, type: 'token' };
        }
        
        // Old format: /r/:code
        const rMatch = url.pathname.match(/\/r\/([^/]+)$/i);
        if (rMatch?.[1]) {
          return { value: decodeURIComponent(rMatch[1]), type: 'code' };
        }
        
        // Fallback: last path part (old format)
        const parts = url.pathname.split("/").filter(Boolean);
        if (parts.length > 0) {
          return { value: decodeURIComponent(parts[parts.length - 1]), type: 'code' };
        }
      } catch { /* ignore */ }
    }

    // Otherwise allow letters/digits/_/- (assume it's a direct code)
    const m = s.match(/[A-Za-z0-9\-_]+/);
    return m ? { value: m[0], type: 'code' } : null;
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

  async function claimByCodeOrToken(value: string, type: 'code' | 'token') {
    // Set processing flag to prevent concurrent scans
    processingRef.current = true;
    const t = now();
    
    try {
      // session may expire mid-scan
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) { navigate("/auth/login?next=/scan", { replace: true }); return; }

      let data, error;

      if (type === 'token') {
        // Use new token-based claiming
        const result = await supabase.rpc("claim_card_by_token", {
          p_token: value,
        });
        data = result.data;
        error = result.error;
      } else {
        // Use old code-based claiming
        const result = await supabase.rpc("claim_card_and_log", {
          p_code: value,
          p_source: "scan",
        });
        data = result.data;
        error = result.error;
      }

      if (error) {
        const item: LogItem = {
          id: crypto.randomUUID(),
          ts: now(),
          code: value,
          status: "error",
          message: error.message || "Error claiming card",
        };
        feedback(item.status);
        pushLog(item);
        return;
      }

      if (data?.ok) {
        let status: LogItem["status"];
        let message: string;
        
        if (type === 'token') {
          // Handle token-based response
          status = data.already_claimed_by_you ? "already_owner" : "claimed";
          message = status === "claimed" ? "Added to your collection" : "Already in your collection";
        } else {
          // Handle code-based response
          status = data.already_owner ? "already_owner" : "claimed";
          message = status === "claimed" ? "Added to your collection" : "Already in your collection";
        }

        const card = data.card_id ? await fetchCardById(data.card_id) : undefined;
        const item: LogItem = {
          id: crypto.randomUUID(),
          ts: now(),
          code: value,
          status,
          message,
          card,
        };
        feedback(item.status);
        pushLog(item);
        return;
      }

      // not ok → map errors
      let status: LogItem["status"] = "error";
      let message = "Something went wrong.";
      
      if (type === 'token') {
        // Handle token-based errors
        switch (data?.error) {
          case "token_not_found":           status = "not_found";      message = "Card not found."; break;
          case "already_claimed_by_other":  status = "owned_by_other"; message = "Already claimed by another user."; break;
          case "blocked":                   status = "blocked";        message = "Your account is blocked from claiming cards."; break;
          case "not_authenticated":         navigate("/auth/login?next=/scan", { replace: true }); return;
        }
      } else {
        // Handle code-based errors
        switch (data?.error) {
          case "not_found":      status = "not_found";      message = "Card not found."; break;
          case "owned_by_other": status = "owned_by_other"; message = "Already claimed by another user."; break;
          case "blocked":        status = "blocked";        message = "Your account is blocked from claiming cards."; break;
          case "not_signed_in":  navigate("/auth/login?next=/scan", { replace: true }); return;
        }
      }

      const card = status === "owned_by_other" ? undefined : await fetchCardByCodeLike(value);
      const item: LogItem = {
        id: crypto.randomUUID(),
        ts: now(),
        code: value,
        status,
        message,
        card,
      };
      feedback(item.status);
      pushLog(item);
    } finally {
      // Update cooldowns and processing flag
      cooldownRef.current[value] = t;
      globalCooldownRef.current = t;
      processingRef.current = false;
      
      // Start visual cooldown feedback
      setLastScannedCode(value);
      setCooldownActive(true);
      
      // Countdown timer for visual feedback
      let timeLeft = COOLDOWN_MS / 1000;
      setCooldownTimer(timeLeft);
      
      const countdownInterval = setInterval(() => {
        timeLeft -= 0.1;
        setCooldownTimer(Math.max(0, timeLeft));
        
        if (timeLeft <= 0) {
          clearInterval(countdownInterval);
          setCooldownActive(false);
          setLastScannedCode("");
        }
      }, 100);
    }
  }

  /* ---------- QR Scanner handlers ---------- */
  const handleScan = useCallback(async (result: any) => {
    if (!result || isPaused) return;
    
    const text = result[0]?.rawValue || result;
    const extracted = extractCodeOrToken(text);
    if (extracted && shouldProcess(extracted.value)) {
      await claimByCodeOrToken(extracted.value, extracted.type);
      // Auto-close the scanner after successful scan
      setIsFullScreenScannerOpen(false);
    }
  }, [isPaused]);

  const handleError = useCallback((error: any) => {
    // Only set error for significant issues, not common scanning noise
    if (error?.name === "NotAllowedError") {
      setError("Camera access denied. Please enable camera permissions.");
    } else if (error?.name === "NotFoundError") {
      setError("No camera found. Please connect a camera.");
    }
    // Ignore other scanning errors to avoid spam
  }, []);

  /* ---------- UI ---------- */
  const tips = useMemo(() => [
    "Use the full-screen scanner for best results with small QR codes",
    "Ensure good lighting - use the torch button if needed",
    "Wait 2 seconds between scans to avoid duplicates",
    "Position the QR code within the scanning frame and hold steady",
  ], []);

  function StatusPill({ s }: { s: LogItem["status"] }) {
    const map: Record<LogItem["status"], string> = {
      claimed: "bg-primary/20 text-primary border border-primary/30 glow-primary",
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
    return <span className={`inline-block text-xs px-3 py-1 rounded-full font-medium ${map[s]}`}>{label[s]}</span>;
  }

  return (
    <div className="min-h-screen hero-gradient">
      <div className="p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent mb-2">
            Scan Trading Cards
          </h1>
          <p className="text-muted-foreground">Point your camera at any card QR code to add it to your collection</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Scanner Launch */}
          <div className="space-y-4">
            <div className="glass-panel p-6 rounded-2xl glow-primary">
              <div className="text-center space-y-6">
                <div className="w-32 h-32 mx-auto bg-gradient-to-br from-primary/20 to-primary-glow/20 rounded-2xl border border-primary/30 flex items-center justify-center">
                  <Camera className="w-16 h-16 text-primary" />
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold mb-2">Full-Screen Scanner</h3>
                  <p className="text-muted-foreground text-sm">
                    Open the full-screen camera for the best scanning experience with small QR codes on trading cards.
                  </p>
                </div>

                <Button
                  onClick={() => setIsFullScreenScannerOpen(true)}
                  variant="hero"
                  size="lg"
                  className="w-full text-lg py-6"
                  disabled={isPaused}
                >
                  <Camera className="w-5 h-5 mr-2" />
                  Open Camera Scanner
                </Button>

                {error && (
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-destructive text-sm">{error}</p>
                  </div>
                )}
              </div>

              {/* Cooldown Indicator */}
              {cooldownActive && (
                <div className="mt-4 glass-panel p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-primary">
                      Cooldown active for: {lastScannedCode}
                    </span>
                    <span className="text-sm font-mono text-primary">
                      {cooldownTimer.toFixed(1)}s
                    </span>
                  </div>
                  <div className="mt-2 w-full bg-primary/20 rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-100"
                      style={{ width: `${(cooldownTimer / (COOLDOWN_MS / 1000)) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Scanner Controls */}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button
                  onClick={() => setIsPaused(!isPaused)}
                  variant={isPaused ? "default" : "secondary"}
                  size="sm"
                >
                  {isPaused ? "▶️ Resume" : "⏸️ Pause"}
                </Button>
                
                <Button
                  onClick={() => setError(null)}
                  variant="outline"
                  size="sm"
                >
                  🔄 Clear Errors
                </Button>
              </div>
            </div>
          </div>

          {/* Log */}
          <div className="space-y-4">
            <div className="glass-panel p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-foreground">Scan Activity</h2>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => navigate("/me/cards")} 
                    variant="default"
                    size="sm"
                  >
                    My Collection
                  </Button>
                  <Button 
                    onClick={() => setLog([])} 
                    variant="secondary"
                    size="sm"
                  >
                    Clear
                  </Button>
                </div>
              </div>

              {log.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-muted-foreground">No scans yet. Use the camera scanner to get started.</div>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {log.map((row) => (
                    <div key={row.id} className="glass-panel p-4 rounded-lg flex gap-3 items-center hover:bg-muted/5 transition-colors">
                      <div className="w-12 h-16 bg-muted/20 rounded overflow-hidden flex-shrink-0">
                        {row.card?.image_url && row.status !== "owned_by_other" && (
                          <img src={row.card.image_url} alt={row.card?.name ?? "Card"} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="font-medium truncate text-foreground">
                            {row.status === "owned_by_other" ? "Card Already Claimed" : (row.card?.name ?? row.code)}
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
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl">
          <h3 className="font-semibold mb-3 text-foreground">Scanning Tips</h3>
          <ul className="space-y-2">
            {tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Full Screen Scanner Modal */}
      <Html5QRScanner
        isOpen={isFullScreenScannerOpen}
        onClose={() => setIsFullScreenScannerOpen(false)}
        onScan={handleScan}
        onError={handleError}
        isPaused={isPaused}
      />
    </div>
  );
}
