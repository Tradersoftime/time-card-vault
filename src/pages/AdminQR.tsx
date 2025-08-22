// src/pages/AdminQR.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import QRCode from "qrcode";
import JSZip from "jszip";

type CardMinimal = {
  code: string;
  name?: string | null;
  is_active?: boolean | null;
  current_target?: string | null;
};

export default function AdminQR() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // Single QR
  const [singleCode, setSingleCode] = useState("");
  const [singleLabel, setSingleLabel] = useState("");
  const [pngDataUrl, setPngDataUrl] = useState<string | null>(null);

  // Bulk random
  const [prefix, setPrefix] = useState("TOT");
  const [count, setCount] = useState(10);
  const [saving, setSaving] = useState(false);

  // Edit redirect
  const [editCode, setEditCode] = useState("");
  const [editTarget, setEditTarget] = useState("");
  const [editFound, setEditFound] = useState<CardMinimal | null>(null);

  const baseUrl = useMemo(() => {
    // Where QR should point: https://your-site/r/<CODE>
    return `${window.location.origin}/r/`;
  }, []);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) { setIsAdmin(false); return; }
      const { data } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", u.user.id)
        .maybeSingle();
      setIsAdmin(!!data);
    })();
  }, []);

  if (isAdmin === null) return <div className="p-6">Loading…</div>;
  if (isAdmin === false) return <div className="p-6">Not authorized.</div>;

  /* -------------- Helpers -------------- */

  function randomCode(prefix: string) {
    // Example: TOT-4K9V-7XQ2
    const block = () => Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(2, 6);
    return `${prefix}-${block()}-${block()}`;
  }

  async function toPNG(data: string, label?: string) {
    // Make a nice, crisp PNG data URL with QR + optional label below
    const qrCanvas = document.createElement("canvas");
    await QRCode.toCanvas(qrCanvas, data, { errorCorrectionLevel: "M", margin: 2, width: 512 });

    if (!label) return qrCanvas.toDataURL("image/png");

    // draw label onto a taller canvas
    const pad = 16;
    const fontPx = 32;
    const w = qrCanvas.width;
    const h = qrCanvas.height + pad + fontPx + pad;
    const out = document.createElement("canvas");
    out.width = w;
    out.height = h;
    const ctx = out.getContext("2d")!;
    // background white
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    // draw qr
    ctx.drawImage(qrCanvas, 0, 0);
    // label
    ctx.fillStyle = "#000";
    ctx.font = `${fontPx}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(label, w / 2, h - pad);
    return out.toDataURL("image/png");
  }

  async function downloadDataUrl(filename: string, dataUrl: string) {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  /* -------------- Single QR -------------- */

  async function buildSingle() {
    setMsg(null);
    const code = singleCode.trim();
    if (!code) { setMsg("Enter a card code."); return; }
    const url = baseUrl + encodeURIComponent(code);
    const dataUrl = await toPNG(url, singleLabel || code);
    setPngDataUrl(dataUrl);
  }

  /* -------------- Bulk random generate + ZIP -------------- */

  async function bulkGenerate() {
    setMsg(null);
    if (!prefix.trim()) { setMsg("Enter a prefix (e.g., TOT)."); return; }
    if (count <= 0 || count > 1000) { setMsg("Enter a count between 1 and 1000."); return; }

    // Make codes
    const codes: string[] = [];
    const seen = new Set<string>();
    while (codes.length < count) {
      const c = randomCode(prefix.trim().toUpperCase());
      if (seen.has(c)) continue;
      seen.add(c);
      codes.push(c);
    }

    // Save to DB (minimal rows; upsert by code)
    setSaving(true);
    const rows = codes.map(code => ({
      code,
      is_active: true,
      // you can prefill metadata later in Admin/CMS
    }));
    const { error } = await supabase
      .from("cards")
      .upsert(rows, { onConflict: "code", ignoreDuplicates: true });
    setSaving(false);
    if (error) { setMsg(error.message); return; }

    // Build ZIP of PNGs
    const zip = new JSZip();
    const folder = zip.folder("qrs")!;
    for (const code of codes) {
      const url = baseUrl + encodeURIComponent(code);
      const png = await toPNG(url, code);
      const base64 = png.split(",")[1];
      folder.file(`${code}.png`, base64, { base64: true });
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tot-cards-qrs-${prefix}-${codes.length}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    setMsg(`✅ Generated ${codes.length} codes, saved to DB, and downloaded ZIP.`);
  }

  /* -------------- Edit redirect (current_target) -------------- */

  async function lookupCode() {
    setMsg(null);
    const code = editCode.trim();
    if (!code) { setMsg("Enter a code to look up."); return; }
    const { data, error } = await supabase
      .from("cards")
      .select("code, is_active, current_target, name")
      .ilike("code", code)
      .maybeSingle();
    if (error) { setMsg(error.message); return; }
    setEditFound(data as CardMinimal);
    setEditTarget((data?.current_target as string) || "");
  }

  async function saveRedirect() {
    setMsg(null);
    const code = editCode.trim();
    const target = editTarget.trim() || null;
    if (!code) { setMsg("Enter a code."); return; }
    const { error } = await supabase
      .from("cards")
      .update({ current_target: target })
      .ilike("code", code);
    if (error) { setMsg(error.message); return; }
    setMsg("✅ Updated redirect.");
  }

  /* -------------- UI -------------- */

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Admin — QR Tools</h1>
      {msg && (
        <div className="text-sm px-3 py-2 rounded bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200">
          {msg}
        </div>
      )}

      {/* Single QR */}
      <section className="border rounded-xl p-4 space-y-3">
        <h2 className="text-lg font-semibold">Single QR</h2>
        <div className="grid md:grid-cols-3 gap-3">
          <input
            value={singleCode}
            onChange={(e) => setSingleCode(e.target.value)}
            placeholder="Card code (e.g., TOT-ABCD-1234)"
            className="border rounded px-2 py-1"
          />
          <input
            value={singleLabel}
            onChange={(e) => setSingleLabel(e.target.value)}
            placeholder="Label under QR (optional)"
            className="border rounded px-2 py-1"
          />
          <button onClick={buildSingle} className="border rounded px-3 py-1">
            Build Preview
          </button>
        </div>
        {pngDataUrl && (
          <div className="space-y-2">
            <img src={pngDataUrl} alt="QR preview" className="w-64 border rounded" />
            <div>
              <button
                onClick={() => downloadDataUrl(`${singleCode || "qr"}.png`, pngDataUrl)}
                className="border rounded px-3 py-1"
              >
                Download PNG
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Bulk random generate */}
      <section className="border rounded-xl p-4 space-y-3">
        <h2 className="text-lg font-semibold">Bulk Generate Codes + ZIP</h2>
        <div className="grid md:grid-cols-4 gap-3">
          <input
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            placeholder="Prefix (e.g., TOT)"
            className="border rounded px-2 py-1"
          />
          <input
            type="number"
            value={count}
            min={1}
            max={1000}
            onChange={(e) => setCount(parseInt(e.target.value || "0", 10))}
            placeholder="How many?"
            className="border rounded px-2 py-1"
          />
          <div className="col-span-2 flex items-center">
            <button onClick={bulkGenerate} disabled={saving} className="border rounded px-3 py-1">
              {saving ? "Saving…" : "Generate + Download ZIP"}
            </button>
          </div>
        </div>
        <div className="text-xs opacity-70">
          Creates codes like <code>{prefix}-4K9V-7XQ2</code>, saves them as active cards in Supabase, and downloads a ZIP of PNG QRs pointing to <code>{baseUrl}&lt;code&gt;</code>.
        </div>
      </section>

      {/* Edit redirect */}
      <section className="border rounded-xl p-4 space-y-3">
        <h2 className="text-lg font-semibold">Edit Card Redirect</h2>
        <div className="grid md:grid-cols-3 gap-3">
          <input
            value={editCode}
            onChange={(e) => setEditCode(e.target.value)}
            placeholder="Card code"
            className="border rounded px-2 py-1"
          />
          <button onClick={lookupCode} className="border rounded px-3 py-1">Lookup</button>
        </div>

        {editFound && (
          <div className="space-y-2">
            <div className="text-sm">
              <span className="font-medium">Code:</span> {editFound.code} ·{" "}
              <span className="font-medium">Active:</span>{" "}
              {editFound.is_active ? "Yes" : "No"} {editFound.name ? `· ${editFound.name}` : ""}
            </div>
            <input
              value={editTarget}
              onChange={(e) => setEditTarget(e.target.value)}
              placeholder="https://destination.example/page (optional)"
              className="border rounded px-2 py-1 w-full"
            />
            <div className="flex gap-2">
              <button onClick={saveRedirect} className="border rounded px-3 py-1">Save Redirect</button>
              {editTarget && (
                <a
                  href={editTarget}
                  target="_blank"
                  rel="noreferrer"
                  className="border rounded px-3 py-1"
                >
                  Open Current Target
                </a>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
