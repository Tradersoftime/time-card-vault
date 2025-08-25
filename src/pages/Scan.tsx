// src/pages/Scan.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// --- TS helper for BarcodeDetector without extra deps ---
declare global {
  interface Window { BarcodeDetector?: any; }
}

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

  // camera / decoding state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const rafRef = useRef<number | null>(null);
  const detectorRef = useRef<any | null>(null);

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [running, setRunning] = useState(true);

  // advanced camera features
  const [supportsDetector, setSupportsDetector] = useState<boolean>(false);
  const [supportsTorch, setSupportsTorch] = useState<boolean>(false);
  const [supportsZoom, setSupportsZoom] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1);
  const [zoomRange, setZoomRange] = useState<{ min: number; max: number; step: number }>({ min: 1, max: 1, step: 0.1 });
  const [torchOn, setTorchOn] = useState(false);

  // live log
  const [log, setLog] = useState<LogItem[]>([]);
  const cooldownRef = useRef<Record<string, number>>({});
  const COOLDOWN_MS = 1500;

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
  }

  /* ---------- High-res camera setup with zoom/torch ---------- */

  useEffect(() => {
    setSupportsDetector(!!window.BarcodeDetector);
    if (window.BarcodeDetector) {
      detectorRef.current = new window.BarcodeDetector({ formats: ["qr_code"] });
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startCamera() {
    stopCamera();
    setError(null);
    setCameraReady(false);

    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: { ideal: "environment" as any },
        width: { ideal: 2560, max: 3840 },
        height: { ideal: 1440, max: 2160 },
        frameRate: { ideal: 60 },
      },
      audio: false,
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();

      const [track] = stream.getVideoTracks();
      trackRef.current = track;

      const caps = track.getCapabilities ? track.getCapabilities() : ({} as any);

      // Continuous autofocus
      if (caps.focusMode && Array.isArray(caps.focusMode) && caps.focusMode.includes("continuous")) {
        try { await track.applyConstraints({ advanced: [{ focusMode: "continuous" as any }] as any }); } catch { /* ignore */ }
      }

      // Zoom
      if (caps.zoom && (caps.zoom.min !== undefined || typeof caps.zoom === "number")) {
        const min = caps.zoom.min ?? 1;
        const max = caps.zoom.max ?? Math.max(1, Number(caps.zoom) || 1);
        const step = caps.zoom.step ?? 0.1;
        setSupportsZoom(max > min);
        setZoomRange({ min, max, step });
        // start at ~60% of range to help tiny QRs
        const start = Math.min(max, Math.max(min, min + (max - min) * 0.6));
        try { await track.applyConstraints({ advanced: [{ zoom: start }] as any }); setZoom(start); } catch { setSupportsZoom(false); }
      } else {
        setSupportsZoom(false);
      }

      // Torch
      setSupportsTorch(!!caps.torch);

      setCameraReady(true);
      setRunning(true);
      loop();
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  function stopCamera() {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    trackRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    trackRef.current = null;
  }

  async function setTorch(on: boolean) {
    const track = trackRef.current;
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: on } as any] as any });
      setTorchOn(on);
    } catch {
      setSupportsTorch(false);
      setError("Torch not supported on this device/camera.");
    }
  }

  async function setZoomLevel(z: number) {
    const track = trackRef.current;
    if (!track) return;
    try { await track.applyConstraints({ advanced: [{ zoom: z }] as any }); setZoom(z); }
    catch { setSupportsZoom(false); }
  }

  /* ---------- Decode loop ---------- */

  function loop() {
    if (!running) return;
    rafRef.current = requestAnimationFrame(tick);
  }

  async function tick() {
    try {
      const video = videoRef.current;
      const detector = detectorRef.current;
      if (video && detector && video.readyState >= 2) {
        const barcodes = await detector.detect(video);
        if (barcodes?.length) {
          const first = barcodes.find((b: any) => !!b.rawValue) || barcodes[0];
          const raw = String(first.rawValue || "").trim();
          const code = extractCode(raw);
          if (code && shouldProcess(code)) await claim(code);
        }
      }
    } catch {
      // ignore per-frame errors
    } finally {
      loop();
    }
  }

  /* ---------- UI ---------- */

  const tips = useMemo(() => [
    "Use the rear camera and good, even light.",
    "If the QR is tiny, increase the camera Zoom.",
    "Turn on Torch in low light for faster focus.",
  ], []);

  // Manual entry
  const [manual, setManual] = useState("");

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
              <div className="aspect-square bg-black rounded-xl overflow-hidden border border-primary/20 relative">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className="w-full h-full object-cover"
                />
                {/* guide box */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="w-40 h-40 border-2 border-emerald-400/80 rounded-md"></div>
                </div>
              </div>

              {/* Controls */}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors px-4 py-2 rounded-lg text-sm font-medium"
                  onClick={() => {
                    if (running) { setRunning(false); }
                    else { setRunning(true); loop(); }
                  }}
                >
                  {running ? "Pause" : "Resume"}
                </button>
                <button
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors px-4 py-2 rounded-lg text-sm font-medium"
                  onClick={() => startCamera()}
                >
                  Restart (hi-res)
                </button>

                {supportsTorch && (
                  <button
                    className="bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors px-4 py-2 rounded-lg text-sm font-medium"
                    onClick={() => setTorch(!torchOn)}
                  >
                    {torchOn ? "Torch Off" : "Torch On"}
                  </button>
                )}

                {supportsZoom && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs opacity-70">Zoom</span>
                    <input
                      type="range"
                      min={zoomRange.min}
                      max={zoomRange.max}
                      step={zoomRange.step}
                      value={zoom}
                      onChange={(e) => setZoomLevel(Number(e.target.value))}
                    />
                    <span className="text-xs tabular-nums">{zoom.toFixed(2)}×</span>
                  </div>
                )}

                <span className="ml-auto text-xs opacity-60">
                  {cameraReady ? "Camera ready" : "Starting…"} {supportsDetector ? "• Fast decode" : "• Add fallback for older browsers"}
                </span>
              </div>
            </div>

            {!cameraReady && (
              <div className="glass-panel p-4 rounded-lg text-center">
                <div className="text-sm text-muted-foreground">Initializing camera… If asked, please allow camera access.</div>
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

              {/* Manual entry */}
              <div className="glass-panel p-4 rounded-lg mb-4">
                <div className="font-medium mb-2">Manual test</div>
                <div className="flex gap-2">
                  <input
                    value={manual}
                    onChange={(e) => setManual(e.target.value)}
                    placeholder="Enter code (ex: TOT-ABCD-1234 or https://…/r/TOT-ABCD-1234)"
                    className="border rounded px-2 py-1 w-full"
                  />
                  <button
                    className="border rounded px-3 py-1"
                    onClick={() => {
                      const code = extractCode(manual.trim());
                      if (code && shouldProcess(code)) claim(code);
                      setManual("");
                    }}
                  >
                    Submit
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
