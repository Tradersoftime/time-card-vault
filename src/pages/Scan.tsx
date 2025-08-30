// src/pages/Scan.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Html5QrcodeScanner, Html5QrcodeScannerState, Html5QrcodeScanType } from "html5-qrcode";

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
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const scannerElementRef = useRef<HTMLDivElement | null>(null);
  const processingRef = useRef<boolean>(false);

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string>("");
  const [cooldownActive, setCooldownActive] = useState(false);
  const [cooldownTimer, setCooldownTimer] = useState(0);
  const [tinyQrMode, setTinyQrMode] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  // live log
  const [log, setLog] = useState<LogItem[]>([]);
  const cooldownRef = useRef<Record<string, number>>({});
  const globalCooldownRef = useRef<number>(0);
  const COOLDOWN_MS = 3000; // 3 second cooldown for same code
  const GLOBAL_COOLDOWN_MS = 1000; // 1 second between any scans

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
    // Set processing flag to prevent concurrent scans
    processingRef.current = true;
    const t = now();
    
    try {
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
    } finally {
      // Update cooldowns and processing flag
      cooldownRef.current[code] = t;
      globalCooldownRef.current = t;
      processingRef.current = false;
      
      // Start visual cooldown feedback
      setLastScannedCode(code);
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

  /* ---------- Html5QrcodeScanner setup ---------- */

  const handleScanSuccess = useCallback(async (decodedText: string) => {
    const code = extractCode(decodedText);
    if (code && shouldProcess(code)) {
      await claim(code);
    }
  }, []);

  const handleScanError = useCallback((errorMessage: string) => {
    // Ignore frequent scanning errors to avoid spam
  }, []);

  useEffect(() => {
    if (!scannerElementRef.current) return;

    const config = {
      fps: tinyQrMode ? 60 : 30, // Higher FPS for tiny codes
      qrbox: tinyQrMode ? { width: 150, height: 150 } : { width: 280, height: 280 }, // Smaller box for tiny codes
      aspectRatio: 1.0,
      disableFlip: false,
      videoConstraints: {
        facingMode: { ideal: "environment" },
        width: { ideal: tinyQrMode ? 3840 : 1920, max: tinyQrMode ? 7680 : 2560 }, // 4K-8K for tiny codes
        height: { ideal: tinyQrMode ? 2160 : 1080, max: tinyQrMode ? 4320 : 1440 },
        focusMode: { ideal: "continuous" },
        torch: true,
      },
      supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true
      },
      rememberLastUsedCamera: true,
      showTorchButtonIfSupported: true,
      showZoomSliderIfSupported: true,
    };

    try {
      const scanner = new Html5QrcodeScanner(
        "qr-scanner-container",
        config,
        false // verbose logging
      );

      scannerRef.current = scanner;
      scanner.render(handleScanSuccess, handleScanError);
      setIsScanning(true);
      setError(null);
    } catch (err: any) {
      setError(`Scanner initialization failed: ${err.message}`);
    }

    return () => {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.getState() === Html5QrcodeScannerState.SCANNING ||
              scannerRef.current.getState() === Html5QrcodeScannerState.PAUSED) {
            scannerRef.current.clear();
          }
        } catch (e) {
          // Ignore cleanup errors
        }
        scannerRef.current = null;
      }
      setIsScanning(false);
    };
  }, [handleScanSuccess, handleScanError]);

  const pauseScanning = useCallback(() => {
    if (scannerRef.current && scannerRef.current.getState() === Html5QrcodeScannerState.SCANNING) {
      scannerRef.current.pause(true);
    }
  }, []);

  const resumeScanning = useCallback(() => {
    if (scannerRef.current && scannerRef.current.getState() === Html5QrcodeScannerState.PAUSED) {
      scannerRef.current.resume();
    }
  }, []);

  const restartScanning = useCallback(() => {
    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
      } catch (e) {
        // Ignore errors
      }
    }
    
    // Force re-render by updating key
    setTimeout(() => {
      if (scannerElementRef.current) {
        const config = {
          fps: tinyQrMode ? 60 : 30,
          qrbox: tinyQrMode ? { width: 150, height: 150 } : { width: 280, height: 280 },
          aspectRatio: 1.0,
          disableFlip: false,
          videoConstraints: {
            facingMode: { ideal: "environment" },
            width: { ideal: tinyQrMode ? 3840 : 1920, max: tinyQrMode ? 7680 : 2560 },
            height: { ideal: tinyQrMode ? 2160 : 1080, max: tinyQrMode ? 4320 : 1440 },
            focusMode: { ideal: "continuous" },
            torch: true,
          },
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
          },
          rememberLastUsedCamera: true,
          showTorchButtonIfSupported: true,
          showZoomSliderIfSupported: true,
        };

        try {
          const scanner = new Html5QrcodeScanner(
            "qr-scanner-container",
            config,
            false
          );

          scannerRef.current = scanner;
          scanner.render(handleScanSuccess, handleScanError);
          setError(null);
        } catch (err: any) {
          setError(`Scanner restart failed: ${err.message}`);
        }
      }
    }, 100);
  }, [handleScanSuccess, handleScanError]);

  /* ---------- UI ---------- */

  const tips = useMemo(() => [
    tinyQrMode ? "TINY QR MODE: Move closer to the code and hold steady." : "Hold your device steady and align the QR code within the scanning area.",
    tinyQrMode ? "For phone screens: Adjust brightness and avoid glare/reflections." : "Ensure good lighting - use device torch if needed.",
    "Wait 3 seconds between scans to avoid duplicates.",
    tinyQrMode ? "Use zoom controls below to get closer to tiny codes." : "The scanner works best with clear, high-contrast QR codes.",
  ], [tinyQrMode]);

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
          {/* Camera */}
          <div className="space-y-4">
            <div className="glass-panel p-6 rounded-2xl glow-primary">
              {/* Scanner Container */}
              <div 
                id="qr-scanner-container" 
                ref={scannerElementRef}
                className="w-full bg-black rounded-xl overflow-hidden border border-primary/20"
              />

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

              {/* Tiny QR Mode Toggle */}
              <div className="mt-4 glass-panel p-3 rounded-lg bg-accent/10 border border-accent/20">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-foreground">Tiny QR Mode</label>
                  <button
                    onClick={() => {
                      setTinyQrMode(!tinyQrMode);
                      setTimeout(() => restartScanning(), 100);
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      tinyQrMode ? 'bg-primary' : 'bg-secondary'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      tinyQrMode ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
                
                {tinyQrMode && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Digital Zoom: {zoomLevel}x</label>
                      <input
                        type="range"
                        min="1"
                        max="3"
                        step="0.1"
                        value={zoomLevel}
                        onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                        className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    <div className="text-xs text-accent">
                      📱 Optimized for tiny QR codes from phone screens and small cards
                    </div>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors px-4 py-2 rounded-lg text-sm font-medium"
                  onClick={() => {
                    if (scannerRef.current?.getState() === Html5QrcodeScannerState.SCANNING) {
                      pauseScanning();
                    } else if (scannerRef.current?.getState() === Html5QrcodeScannerState.PAUSED) {
                      resumeScanning();
                    }
                  }}
                  disabled={!isScanning}
                >
                  {scannerRef.current?.getState() === Html5QrcodeScannerState.SCANNING ? "Pause" : "Resume"}
                </button>
                <button
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors px-4 py-2 rounded-lg text-sm font-medium"
                  onClick={restartScanning}
                >
                  Restart Scanner
                </button>

                <span className="ml-auto text-xs opacity-60">
                  {isScanning ? (tinyQrMode ? "Tiny QR scanner active" : "High-quality scanner active") : "Initializing scanner..."}
                  {processingRef.current && " • Processing..."}
                </span>
              </div>
            </div>

            {!isScanning && !error && (
              <div className="glass-panel p-4 rounded-lg text-center">
                <div className="text-sm text-muted-foreground">
                  Initializing {tinyQrMode ? 'tiny QR' : 'high-quality'} scanner… Please allow camera access when prompted.
                </div>
              </div>
            )}
            {error && (
              <div className="glass-panel p-4 rounded-lg border-l-4 border-l-destructive">
                <div className="text-sm text-destructive">{error}</div>
              </div>
            )}
          </div>

          {/* Log */}
          <div className="space-y-4">
            <div className="glass-panel p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-foreground">Scan Activity</h2>
                <div className="flex gap-2">
                  <button 
                    onClick={() => navigate("/me/cards")} 
                    className="bg-primary text-primary-foreground hover:bg-primary/90 transition-colors px-4 py-2 rounded-lg text-sm font-medium glow-primary"
                  >
                    My Collection
                  </button>
                  <button 
                    onClick={() => setLog([])} 
                    className="bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors px-4 py-2 rounded-lg text-sm font-medium"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {log.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-muted-foreground">No scans yet. Point the camera at a card QR code to get started.</div>
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
    </div>
  );
}
