// src/pages/Scan.tsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Scan() {
  const nav = useNavigate();
  const ref = useRef<HTMLDivElement | null>(null);
  const [msg, setMsg] = useState<string>("Allow camera access to scan a QR code.");
  const [starting, setStarting] = useState(false);

  // Extract our card code from either a full URL or a raw code
  function extractCode(text: string): string {
    try {
      const url = new URL(text);
      const parts = url.pathname.split("/").filter(Boolean);
      const idx = parts.indexOf("r");
      if (idx >= 0 && parts[idx + 1]) return decodeURIComponent(parts[idx + 1]);
    } catch {
      /* not a URL, fall through */
    }
    return text; // assume the QR contained just the code
  }

  useEffect(() => {
    let html5QrCode: any;
    let cancelled = false;

    (async () => {
      setStarting(true);
      setMsg("Starting camera…");
      try {
        // dynamic import to keep bundle slim
        const m = await import("html5-qrcode");
        const { Html5Qrcode } = m as any;

        if (!ref.current) return;
        html5QrCode = new Html5Qrcode(ref.current.id);

        await html5QrCode.start(
          { facingMode: "environment" },                           // back camera
          { fps: 10, qrbox: { width: 280, height: 280 } },         // scan box
          (decodedText: string) => {
            if (cancelled) return;
            // Stop the camera before navigating
            html5QrCode.stop().catch(() => {});
            const code = extractCode(decodedText.trim());
            setMsg(`Found code: ${code}. Redirecting…`);
            nav(`/r/${encodeURIComponent(code)}`, { replace: true });
          },
          () => {} // ignore scan failure callbacks (noise)
        );

        setMsg("Point your camera at a TOT card QR.");
      } catch (e: any) {
        setMsg(e?.message || "Could not start camera. Check permissions.");
      } finally {
        setStarting(false);
      }
    })();

    return () => {
      cancelled = true;
      if (html5QrCode) {
        html5QrCode.stop().catch(() => {});
        html5QrCode.clear?.().catch(() => {});
      }
    };
  }, [nav]);

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Scan a Card</h1>
      <div id="qr-reader" ref={ref} className="w-full overflow-hidden rounded-xl border aspect-square" />
      <div className="text-sm opacity-80">{starting ? "Starting…" : msg}</div>
      <div className="text-xs opacity-60">
        Tip: If your browser blocks the camera, allow permission and refresh.
      </div>
    </div>
  );
}
