// src/pages/Scan.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QrScanner } from "@yudiel/react-qr-scanner";
import { supabase } from "@/integrations/supabase/client";

export default function Scan() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [lastText, setLastText] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Ensure signed-in
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        navigate("/auth/login?next=/scan", { replace: true });
      }
    })();
  }, [navigate]);

  // Extract the code from any scanned text (URL or raw code)
  const extractCode = useCallback((text: string): string | null => {
    if (!text) return null;

    // Common patterns:
    // 1) Full URL like https://your-app.com/r/TOT-ABCD-1234
    // 2) Maybe just the code itself (TOT-ABCD-1234)
    // 3) URL with query/fragment
    try {
      let possible = text.trim();

      // If it's a URL, try to grab the last non-empty path segment after "/r/"
      if (/^https?:\/\//i.test(possible)) {
        const url = new URL(possible);
        // prefer /r/:code path part if present
        const path = url.pathname || "/";
        const rMatch = path.match(/\/r\/([^/]+)$/i);
        if (rMatch?.[1]) return decodeURIComponent(rMatch[1]);

        // fallback to last segment
        const parts = path.split("/").filter(Boolean);
        if (parts.length > 0) return decodeURIComponent(parts[parts.length - 1]);
      }

      // If not a URL, assume the whole string is the code
      // Allow letters, digits, dashes, and underscores
      const codeMatch = possible.match(/[A-Za-z0-9\-_]+/);
      if (codeMatch) return codeMatch[0];

      return null;
    } catch {
      return null;
    }
  }, []);

  const onScan = useCallback(
    async (texts: { rawValue: string }[]) => {
      if (processing) return;
      const first = texts?.[0]?.rawValue;
      if (!first) return;

      const code = extractCode(first);
      setLastText(first);

      if (!code) {
        setError("Could not recognize a card code in that QR.");
        return;
      }

      setProcessing(true);
      // Go to redirect route which auto-claims
      navigate(`/r/${encodeURIComponent(code)}`, { replace: true });
    },
    [extractCode, navigate, processing]
  );

  const onError = useCallback((err: any) => {
    // NOTE: This fires repeatedly if the camera is blocked; keep it quiet but visible
    setError(String(err?.message || err) || "Camera error");
  }, []);

  const tips = useMemo(
    () => [
      "Allow camera access when prompted.",
      "Hold your card steady so the QR fills most of the square.",
      "Good, even lighting helps the camera focus.",
    ],
    []
  );

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Scan Your Card</h1>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="border rounded-xl overflow-hidden">
            <QrScanner
              onDecode={onScan}
              onError={onError}
              constraints={{ facingMode: "environment" }} // prefer back camera on mobile
              containerStyle={{ width: "100%", aspectRatio: "1 / 1" }}
              videoStyle={{ width: "100%", height: "auto" }}
              onInit={() => setCameraReady(true)}
            />
          </div>

          {!cameraReady && (
            <div className="text-sm opacity-80">
              Initializing camera… If asked, please allow camera access.
            </div>
          )}

          {lastText && (
            <div className="text-xs opacity-70 break-all">
              Last raw scan: <code>{lastText}</code>
            </div>
          )}

          {error && (
            <div className="text-sm px-3 py-2 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
              {error}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="border rounded-xl p-3">
            <div className="font-medium mb-2">Tips</div>
            <ul className="list-disc list-inside text-sm opacity-80 space-y-1">
              {tips.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </div>

          {/* Manual fallback */}
          <ManualEntry navigateTo={(code) => navigate(`/r/${encodeURIComponent(code)}`)} />
        </div>
      </div>
    </div>
  );
}

function ManualEntry({ navigateTo }: { navigateTo: (code: string) => void }) {
  const [code, setCode] = useState("");

  return (
    <div className="border rounded-xl p-3 space-y-2">
      <div className="font-medium">Manual Code Entry</div>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Paste code or full URL (e.g., TOT-ABCD-1234)"
        className="border rounded px-2 py-1 w-full"
      />
      <button
        onClick={() => {
          const trimmed = code.trim();
          if (!trimmed) return;
          navigateTo(trimmed);
        }}
        className="border rounded px-3 py-1"
      >
        Go
      </button>
      <div className="text-xs opacity-70">
        This tries both a full URL and a raw code.
      </div>
    </div>
  );
}
