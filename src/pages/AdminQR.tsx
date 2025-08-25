// src/pages/AdminQR.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import QRCode from "qrcode";
import JSZip from "jszip";
import Papa from "papaparse";

/* ---------------- Types ---------------- */

type CardRow = {
  id: string;
  code: string;
  name: string | null;
  suit: string | null;
  rank: string | null;
  era: string | null;
  rarity: string | null;
  trader_value: string | null;
  time_value: number | null;
  image_url: string | null;
  current_target?: string | null; // dynamic redirect (preferred)
  redirect_url?: string | null;   // legacy redirect (if your table uses this)
  status: string | null;
  created_at: string;
};

type CardMinimal = {
  code: string;
  name?: string | null;
  is_active?: boolean | null;
  current_target?: string | null;
  redirect_url?: string | null;
};

type CardUpsert = {
  code: string;
  name?: string | null;
  suit?: string | null;
  rank?: string | null;
  era?: string | null;
  rarity?: string | null;
  trader_value?: string | null;
  time_value?: number | null;
  image_url?: string | null;
  description?: string | null;
  current_target?: string | null;
  status?: string | null;
  is_active?: boolean;
};

type CsvRow = Partial<CardUpsert> & { code?: string | null };

/* ---------------- RecentCardsPanel ---------------- */

function RecentCardsPanel() {
  const [rows, setRows] = useState<CardRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("cards")
      .select(
        "id,code,name,suit,rank,era,rarity,trader_value,time_value,image_url,current_target,redirect_url,status,created_at"
      )
      .order("created_at", { ascending: false })
      .limit(25);

    if (!error) setRows((data as CardRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">Recent cards (latest 25)</h3>
        <button onClick={load} className="border rounded px-3 py-1 text-sm">
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="opacity-70 text-sm">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="opacity-70 text-sm">No cards yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr className="text-left">
                <th className="py-2 pr-3">Created</th>
                <th className="py-2 pr-3">Code</th>
                <th className="py-2 pr-3">Trader</th>
                <th className="py-2 pr-3">Era</th>
                <th className="py-2 pr-3">Suit</th>
                <th className="py-2 pr-3">Rank</th>
                <th className="py-2 pr-3">Rarity</th>
                <th className="py-2 pr-3">Value</th>
                <th className="py-2 pr-3">TIME</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Redirect</th>
                <th className="py-2 pr-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const redirect = r.current_target ?? r.redirect_url ?? null;
                return (
                  <tr key={r.id} className="border-b last:border-b-0 align-top">
                    <td className="py-2 pr-3">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="py-2 pr-3 font-mono">{r.code}</td>
                    <td className="py-2 pr-3">{r.name ?? "—"}</td>
                    <td className="py-2 pr-3">{r.era ?? "—"}</td>
                    <td className="py-2 pr-3">{r.suit ?? "—"}</td>
                    <td className="py-2 pr-3">{r.rank ?? "—"}</td>
                    <td className="py-2 pr-3">{r.rarity ?? "—"}</td>
                    <td className="py-2 pr-3">{r.trader_value ?? "—"}</td>
                    <td className="py-2 pr-3">{r.time_value ?? 0}</td>
                    <td className="py-2 pr-3">{r.status ?? "—"}</td>
                    <td className="py-2 pr-3 max-w-[280px] truncate">
                      {redirect ? (
                        <a className="underline" href={redirect} target="_blank" rel="noreferrer">
                          {redirect}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex gap-2">
                        <a
                          className="border rounded px-2 py-0.5 text-xs"
                          href={`/claim/${encodeURIComponent(r.code)}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open /claim/{r.code}
                        </a>
                        {r.image_url && (
                          <a
                            className="border rounded px-2 py-0.5 text-xs"
                            href={r.image_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Image
                          </a>
                        )}
                        <button
                          className="border rounded px-2 py-0.5 text-xs"
                          onClick={() => navigator.clipboard.writeText(r.code)}
                        >
                          Copy code
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ---------------- Page: AdminQR ---------------- */

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
  // which column to update for redirect (auto-detected on lookup)
  const [redirectField, setRedirectField] = useState<"current_target" | "redirect_url">("current_target");

  // CSV Import
  const [csvText, setCsvText] = useState("");
  const [csvRows, setCsvRows] = useState<CardUpsert[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [csvBusy, setCsvBusy] = useState(false);

  const baseUrl = useMemo(() => `${window.location.origin}/claim/`, []);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) {
        setIsAdmin(false);
        return;
      }
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

  function norm(s?: string | null) {
    return (s ?? "").trim();
  }

  function parseBool(v: any): boolean | undefined {
    if (v === undefined || v === null || v === "") return undefined;
    const s = String(v).trim().toLowerCase();
    if (["true", "t", "1", "yes", "y"].includes(s)) return true;
    if (["false", "f", "0", "no", "n"].includes(s)) return false;
    return undefined;
  }

  function randomCode(pref: string) {
    const block = () =>
      Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(2, 6);
    return `${pref}-${block()}-${block()}`;
  }

  async function toPNG(data: string, label?: string) {
    const qrCanvas = document.createElement("canvas");
    await QRCode.toCanvas(qrCanvas, data, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 512,
    });

    if (!label) return qrCanvas.toDataURL("image/png");

    // draw label onto taller canvas
    const pad = 16;
    const fontPx = 32;
    const w = qrCanvas.width;
    const h = qrCanvas.height + pad + fontPx + pad;
    const out = document.createElement("canvas");
    out.width = w;
    out.height = h;
    const ctx = out.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(qrCanvas, 0, 0);
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
    const code = norm(singleCode);
    if (!code) {
      setMsg("Enter a card code.");
      return;
    }
    const url = baseUrl + encodeURIComponent(code);
    const dataUrl = await toPNG(url, singleLabel || code);
    setPngDataUrl(dataUrl);
  }

  /* -------------- Bulk random generate + ZIP -------------- */

  async function bulkGenerate() {
    setMsg(null);
    if (!norm(prefix)) {
      setMsg("Enter a prefix (e.g., TOT).");
      return;
    }
    if (count <= 0 || count > 1000) {
      setMsg("Enter a count between 1 and 1000.");
      return;
    }

    // Make unique codes
    const codes: string[] = [];
    const seen = new Set<string>();
    while (codes.length < count) {
      const c = randomCode(norm(prefix).toUpperCase());
      if (seen.has(c)) continue;
      seen.add(c);
      codes.push(c);
    }

    // Save to DB as active bare cards
    setSaving(true);
    const rows = codes.map((code) => ({ 
      code, 
      is_active: true, 
      status: 'active',
      time_value: 0
    }));
    const { error } = await supabase
      .from("cards")
      .upsert(rows, { onConflict: "code", ignoreDuplicates: true });
    setSaving(false);
    if (error) {
      setMsg(error.message);
      return;
    }

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

  /* -------------- Edit redirect -------------- */

  async function lookupCode() {
    setMsg(null);
    const code = norm(editCode);
    if (!code) {
      setMsg("Enter a code to look up.");
      return;
    }
    // Try selecting both possible redirect columns; whichever exists will come back.
    const { data, error } = await supabase
      .from("cards")
      .select("code, is_active, name, current_target, redirect_url")
      .ilike("code", code)
      .maybeSingle();

    if (error) {
      setMsg(error.message);
      return;
    }

    if (!data) {
      setEditFound(null);
      setMsg("Not found.");
      return;
    }

    // Decide which column to use when saving
    if (data.current_target !== undefined) {
      setRedirectField("current_target");
      setEditTarget((data.current_target as string) || "");
    } else {
      setRedirectField("redirect_url");
      setEditTarget((data.redirect_url as string) || "");
    }

    setEditFound(data as CardMinimal);
  }

  async function saveRedirect() {
    setMsg(null);
    const code = norm(editCode);
    const target = norm(editTarget) || null;
    if (!code) {
      setMsg("Enter a code.");
      return;
    }

    // Build dynamic update based on detected field
    const updateObj: Record<string, any> = {};
    updateObj[redirectField] = target;

    const { error } = await supabase.from("cards").update(updateObj).ilike("code", code);
    if (error) {
      setMsg(error.message);
      return;
    }
    setMsg("✅ Updated redirect.");
  }

  /* -------------- CSV Import -------------- */

  function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setCsvText(""); // clear paste box
    setCsvErrors([]);
    Papa.parse<CsvRow>(f, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        if (res.errors?.length) {
          setCsvErrors(res.errors.map((er) => `Row ${er.row}: ${er.message}`));
        }
        ingestCsv(res.data);
      },
    });
    e.currentTarget.value = ""; // reset input
  }

  function validateAndNormalize(rows: CsvRow[]): { ok: CardUpsert[]; errors: string[] } {
    const errors: string[] = [];
    const ok: CardUpsert[] = [];
    const seen = new Set<string>();

    rows.forEach((r, idx) => {
      const line = idx + 2; // header = line 1
      const codeRaw = norm(r.code ?? "");
      if (!codeRaw) {
        errors.push(`Line ${line}: missing code`);
        return;
      }
      const code = codeRaw;

      if (seen.has(code.toLowerCase())) {
        errors.push(`Line ${line}: duplicate code in file (${code})`);
        return;
      }
      seen.add(code.toLowerCase());

      // Validate required fields for complete cards
      const name = r.name ? norm(r.name) : undefined;
      const suit = r.suit ? norm(r.suit) : undefined;
      const rank = r.rank ? norm(r.rank) : undefined;
      const era = r.era ? norm(r.era) : undefined;

      // If any card details are provided, warn about missing required fields
      if ((name || suit || rank || era) && (!name || !suit || !rank || !era)) {
        if (!name) errors.push(`Line ${line}: missing name (required for complete cards)`);
        if (!suit) errors.push(`Line ${line}: missing suit (required for complete cards)`);
        if (!rank) errors.push(`Line ${line}: missing rank (required for complete cards)`);
        if (!era) errors.push(`Line ${line}: missing era (required for complete cards)`);
      }

      const row: CardUpsert = {
        code,
        name,
        suit,
        rank,
        era,
        rarity: r.rarity ? norm(r.rarity) : undefined,
        trader_value: r.trader_value ? norm(r.trader_value) : undefined,
        time_value: r.time_value ? Number(r.time_value) || 0 : 0,
        image_url: r.image_url ? norm(r.image_url) : undefined,
        description: r.description ? norm(r.description) : undefined,
        current_target: r.current_target ? norm(r.current_target) : undefined,
        status: r.status ? norm(r.status) : 'active',
        is_active: true, // Default to active
      };
      
      // Override is_active if explicitly provided
      const b = parseBool((r as any).is_active);
      if (b !== undefined) row.is_active = b;

      ok.push(row);
    });

    return { ok, errors };
  }

  function ingestCsv(data: CsvRow[]) {
    const { ok, errors } = validateAndNormalize(data);
    setCsvRows(ok);
    setCsvErrors(errors);
    setMsg(
      errors.length
        ? `Parsed with ${errors.length} issue(s).`
        : `Parsed ${ok.length} row(s).`
    );
  }

  function handleCsvPaste() {
    setCsvErrors([]);
    Papa.parse<CsvRow>(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        if (res.errors?.length) {
          setCsvErrors(res.errors.map((er) => `Row ${er.row}: ${er.message}`));
        }
        ingestCsv(res.data);
      },
    });
  }

  async function upsertCsv() {
    if (csvRows.length === 0) {
      setMsg("Nothing to upsert.");
      return;
    }
    setCsvBusy(true);
    const { error } = await supabase.from("cards").upsert(csvRows, { onConflict: "code" });
    setCsvBusy(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    setMsg(`✅ Upserted ${csvRows.length} card(s) to database.`);
  }

  async function downloadZipFromCsv() {
    if (csvRows.length === 0) {
      setMsg("No parsed rows.");
      return;
    }
    const zip = new JSZip();
    const folder = zip.folder("qrs")!;
    for (const r of csvRows) {
      const code = r.code!;
      const url = baseUrl + encodeURIComponent(code);
      const png = await toPNG(url, code);
      const base64 = png.split(",")[1];
      folder.file(`${code}.png`, base64, { base64: true });
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tot-cards-qrs-csv-${csvRows.length}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  /* -------------- UI -------------- */

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Admin — QR Tools</h1>
      {msg && (
        <div className="glass-panel text-sm px-3 py-2 rounded border-l-4 border-l-primary text-foreground">
          {msg}
        </div>
      )}

      {/* Single QR */}
      <section className="card-premium rounded-xl p-4 space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Single QR</h2>
        <div className="grid md:grid-cols-3 gap-3">
          <input
            value={singleCode}
            onChange={(e) => setSingleCode(e.target.value)}
            placeholder="Card code (e.g., TOT-ABCD-1234)"
            className="glass-panel border border-border rounded px-2 py-1 text-foreground placeholder:text-muted-foreground"
          />
        <input
            value={singleLabel}
            onChange={(e) => setSingleLabel(e.target.value)}
            placeholder="Label under QR (optional)"
            className="glass-panel border border-border rounded px-2 py-1 text-foreground placeholder:text-muted-foreground"
          />
          <button
            onClick={buildSingle}
            className="bg-primary text-primary-foreground border border-border rounded px-3 py-1 hover:bg-primary/90 transition-colors"
          >
            Build Preview
          </button>
        </div>
        {pngDataUrl && (
          <div className="space-y-2">
            <img src={pngDataUrl} alt="QR preview" className="w-64 border border-border rounded" />
            <div>
              <button
                onClick={() => downloadDataUrl(`${singleCode || "qr"}.png`, pngDataUrl)}
                className="bg-secondary text-secondary-foreground border border-border rounded px-3 py-1 hover:bg-secondary/80 transition-colors"
              >
                Download PNG
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Bulk random generate */}
      <section className="card-premium rounded-xl p-4 space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Bulk Generate Codes + ZIP</h2>
        <div className="grid md:grid-cols-4 gap-3">
          <input
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            placeholder="Prefix (e.g., TOT)"
            className="glass-panel border border-border rounded px-2 py-1 text-foreground placeholder:text-muted-foreground"
          />
          <input
            type="number"
            value={count}
            min={1}
            max={1000}
            onChange={(e) => setCount(parseInt(e.target.value || "0", 10))}
            placeholder="How many?"
            className="glass-panel border border-border rounded px-2 py-1 text-foreground placeholder:text-muted-foreground"
          />
          <div className="col-span-2 flex items-center">
            <button
              onClick={bulkGenerate}
              disabled={saving}
              className="bg-primary text-primary-foreground border border-border rounded px-3 py-1 hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : "Generate + Download ZIP"}
            </button>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Creates codes like{" "}
          <code className="bg-muted px-1 rounded">{prefix}-4K9V-7XQ2</code>, saves them as
          active cards in Supabase, and downloads a ZIP of PNG QRs pointing to{" "}
          <code className="bg-muted px-1 rounded">{baseUrl}&lt;code&gt;</code>.
        </div>
      </section>

      {/* CSV Import */}
      <section className="card-premium rounded-xl p-4 space-y-3">
        <h2 className="text-lg font-semibold text-foreground">CSV Import</h2>
        <div className="text-sm text-muted-foreground">
          Required column: <code className="bg-muted px-1 rounded">code</code>. Optional:{" "}
          <code className="bg-muted px-1 rounded">
            name,suit,rank,era,rarity,trader_value,time_value,description,image_url,current_target,status,is_active
          </code>
          <br />
          <span className="text-xs mt-1 block">
            For complete cards, provide: name, suit, rank, era. Default time_value: 0, status: 'active'
          </span>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleCsvFile}
            className="glass-panel border border-border rounded px-2 py-1 text-foreground"
          />
          <button
            onClick={handleCsvPaste}
            className="bg-secondary text-secondary-foreground border border-border rounded px-3 py-1 hover:bg-secondary/80 transition-colors"
          >
            Parse Pasted CSV
          </button>
        </div>

        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          placeholder={`code,name,suit,rank,era,rarity,trader_value,time_value,description,image_url,current_target,status,is_active
TOT-4K9V-7XQ2,Ada Lovelace,Hearts,A,Victorian,Legendary,100,10,Famous mathematician and programmer,https://.../ada.png,https://your-site/trader/ada,active,true`}
          rows={6}
          className="w-full glass-panel border border-border rounded px-2 py-1 font-mono text-xs text-foreground placeholder:text-muted-foreground"
        />

        {csvErrors.length > 0 && (
          <div className="glass-panel text-sm px-3 py-2 rounded border-l-4 border-l-destructive text-destructive-foreground">
            {csvErrors.slice(0, 5).map((e, i) => (
              <div key={i}>{e}</div>
            ))}
            {csvErrors.length > 5 && <div>…and {csvErrors.length - 5} more</div>}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={upsertCsv}
            disabled={csvBusy || csvRows.length === 0}
            className="bg-primary text-primary-foreground border border-border rounded px-3 py-1 hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {csvBusy ? "Upserting…" : `Upsert ${csvRows.length} row(s)`}
          </button>
          <button
            onClick={downloadZipFromCsv}
            disabled={csvRows.length === 0}
            className="bg-secondary text-secondary-foreground border border-border rounded px-3 py-1 hover:bg-secondary/80 transition-colors disabled:opacity-50"
          >
            Download QR ZIP for parsed rows
          </button>
        </div>

        {csvRows.length > 0 && (
          <>
            <div className="text-xs text-muted-foreground">
              Showing first {Math.min(csvRows.length, 10)} of {csvRows.length} parsed rows:
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="py-1 pr-3 text-foreground">code</th>
                    <th className="py-1 pr-3 text-foreground">name</th>
                    <th className="py-1 pr-3 text-foreground">suit</th>
                    <th className="py-1 pr-3 text-foreground">rank</th>
                    <th className="py-1 pr-3 text-foreground">era</th>
                    <th className="py-1 pr-3 text-foreground">rarity</th>
                    <th className="py-1 pr-3 text-foreground">time_value</th>
                    <th className="py-1 pr-3 text-foreground">status</th>
                    <th className="py-1 pr-3 text-foreground">is_active</th>
                  </tr>
                </thead>
                <tbody>
                  {csvRows.slice(0, 10).map((r, i) => (
                    <tr key={i} className="border-b border-border last:border-b-0">
                      <td className="py-1 pr-3 font-mono text-foreground">{r.code}</td>
                      <td className="py-1 pr-3 text-foreground">{r.name ?? "—"}</td>
                      <td className="py-1 pr-3 text-foreground">{r.suit ?? "—"}</td>
                      <td className="py-1 pr-3 text-foreground">{r.rank ?? "—"}</td>
                      <td className="py-1 pr-3 text-foreground">{r.era ?? "—"}</td>
                      <td className="py-1 pr-3 text-foreground">{r.rarity ?? "—"}</td>
                      <td className="py-1 pr-3 text-foreground">{r.time_value ?? 0}</td>
                      <td className="py-1 pr-3 text-foreground">{r.status ?? "active"}</td>
                      <td className="py-1 pr-3 text-foreground">{String(r.is_active ?? "")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* Edit redirect */}
      <section className="card-premium rounded-xl p-4 space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Edit Card Redirect</h2>
        <div className="grid md:grid-cols-3 gap-3">
          <input
            value={editCode}
            onChange={(e) => setEditCode(e.target.value)}
            placeholder="Card code"
            className="glass-panel border border-border rounded px-2 py-1 text-foreground placeholder:text-muted-foreground"
          />
          <button
            onClick={lookupCode}
            className="bg-secondary text-secondary-foreground border border-border rounded px-3 py-1 hover:bg-secondary/80 transition-colors"
          >
            Lookup
          </button>
        </div>

        {editFound && (
          <div className="space-y-2">
            <div className="text-sm text-foreground">
              <span className="font-medium">Code:</span> {editFound.code} ·{" "}
              <span className="font-medium">Active:</span> {editFound.is_active ? "Yes" : "No"}{" "}
              {editFound.name ? `· ${editFound.name}` : ""}
            </div>
            <input
              value={editTarget}
              onChange={(e) => setEditTarget(e.target.value)}
              placeholder="https://destination.example/page (optional)"
              className="glass-panel border border-border rounded px-2 py-1 w-full text-foreground placeholder:text-muted-foreground"
            />
            <div className="flex gap-2">
              <button
                onClick={saveRedirect}
                className="bg-primary text-primary-foreground border border-border rounded px-3 py-1 hover:bg-primary/90 transition-colors"
              >
                Save Redirect
              </button>
              {editTarget && (
                <a
                  href={editTarget}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-secondary text-secondary-foreground border border-border rounded px-3 py-1 hover:bg-secondary/80 transition-colors inline-block"
                >
                  Open Current Target
                </a>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Recent cards table */}
      <RecentCardsPanel />
    </div>
  );
}

