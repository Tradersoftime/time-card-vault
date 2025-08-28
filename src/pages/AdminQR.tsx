import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import JSZip from "jszip";
import Papa from "papaparse";
import { toPNG, downloadDataUrl, normalizeHex } from "@/lib/qr";

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
  redirect_url: string | null;
  status: string | null;
  qr_dark: string | null;
  qr_light: string | null;
  created_at: string;
};

/* ---------------- Recent list ---------------- */
function RecentCardsPanel() {
  const [rows, setRows] = useState<CardRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("cards")
      .select("id,code,name,suit,rank,era,rarity,trader_value,time_value,image_url,redirect_url,status,qr_dark,qr_light,created_at")
      .order("created_at", { ascending: false })
      .limit(25);
    if (error) console.error(error);
    setRows((data as CardRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">Recent cards (latest 25)</h3>
        <button onClick={load} className="border rounded px-3 py-1 text-sm">Refresh</button>
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
                <th className="py-2 pr-3">QR</th>
                <th className="py-2 pr-3">Redirect</th>
                <th className="py-2 pr-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
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
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-5 h-5 rounded border" style={{background: normalizeHex(r.qr_dark||"#000")}}/>
                      <span className="inline-block w-5 h-5 rounded border" style={{background: normalizeHex(r.qr_light||"#fff")}}/>
                    </div>
                  </td>
                  <td className="py-2 pr-3 max-w-[280px] truncate">
                    {r.redirect_url ? (
                      <a className="underline" href={r.redirect_url} target="_blank" rel="noreferrer">
                        {r.redirect_url}
                      </a>
                    ) : "—"}
                  </td>
                  <td className="py-2 pr-3">
                    <div className="flex gap-2">
                      <a className="border rounded px-2 py-0.5 text-xs" href={`/r/${encodeURIComponent(r.code)}`} target="_blank" rel="noreferrer">
                        Open /r/{r.code}
                      </a>
                      <button
                        className="border rounded px-2 py-0.5 text-xs"
                        onClick={async ()=>{
                          const url = `${window.location.origin}/r/${encodeURIComponent(r.code)}`;
                          const png = await toPNG({ data:url, label:r.code, dark:r.qr_dark||"#000", light:r.qr_light||"#fff" });
                          const a = document.createElement("a");
                          a.href = png; a.download = `${r.code}.png`; document.body.appendChild(a); a.click(); a.remove();
                        }}
                      >
                        Download QR
                      </button>
                      <button
                        className="border rounded px-2 py-0.5 text-xs"
                        onClick={()=>navigator.clipboard.writeText(r.code)}
                      >
                        Copy code
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ---------------- Page ---------------- */
type CsvRow = Partial<Pick<CardRow,"code"|"name"|"suit"|"rank"|"era"|"rarity"|"trader_value"|"time_value"|"image_url"|"redirect_url"|"status"|"qr_dark"|"qr_light">> & { code?: string|null };

export default function AdminQR() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // Single QR
  const [singleCode, setSingleCode] = useState("");
  const [singleLabel, setSingleLabel] = useState("");
  const [singleDark, setSingleDark] = useState(localStorage.getItem("qr_dark_default") || "#000000");
  const [singleLight, setSingleLight] = useState(localStorage.getItem("qr_light_default") || "#ffffff");
  const [pngDataUrl, setPngDataUrl] = useState<string | null>(null);

  // Bulk random
  const [prefix, setPrefix] = useState("TOT");
  const [count, setCount] = useState(10);
  const [saving, setSaving] = useState(false);

  // Edit redirect
  const [editCode, setEditCode] = useState("");
  const [editTarget, setEditTarget] = useState("");
  const [editFound, setEditFound] = useState<Pick<CardRow,"code"|"name"|"qr_dark"|"qr_light"|"redirect_url"> | null>(null);

  // CSV Import
  const [csvText, setCsvText] = useState("");
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [csvBusy, setCsvBusy] = useState(false);

  const baseUrl = useMemo(() => `${window.location.origin}/r/`, []);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) { setIsAdmin(false); return; }
      const { data } = await supabase.from("admins").select("user_id").eq("user_id", u.user.id).maybeSingle();
      setIsAdmin(!!data);
    })();
  }, []);

  function setDefaults(dark: string, light: string) {
    setSingleDark(dark); setSingleLight(light);
    localStorage.setItem("qr_dark_default", dark);
    localStorage.setItem("qr_light_default", light);
  }

  function norm(s?: string | null) { return (s ?? "").trim(); }
  function randomCode(prefix: string) {
    const block = () => Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(2, 6);
    return `${prefix}-${block()}-${block()}`;
  }

  if (isAdmin === null) return <div className="p-6">Loading…</div>;
  if (isAdmin === false) return <div className="p-6">Not authorized.</div>;

  /* -------------- Single QR -------------- */
  async function buildSingle() {
    setMsg(null);
    const code = norm(singleCode);
    if (!code) { setMsg("Enter a card code."); return; }
    const url = baseUrl + encodeURIComponent(code);
    const dataUrl = await toPNG({ data: url, label: singleLabel || code, dark: singleDark, light: singleLight, width: 512 });
    setPngDataUrl(dataUrl);
  }

  /* -------------- Bulk random generate + ZIP -------------- */
  async function bulkGenerate() {
    setMsg(null);
    if (!norm(prefix)) { setMsg("Enter a prefix (e.g., TOT)."); return; }
    if (count <= 0 || count > 1000) { setMsg("Enter a count between 1 and 1000."); return; }

    // Make codes
    const codes: string[] = [];
    const seen = new Set<string>();
    while (codes.length < count) {
      const c = randomCode(norm(prefix).toUpperCase());
      if (seen.has(c)) continue;
      seen.add(c);
      codes.push(c);
    }

    // Save to DB with default colors
    setSaving(true);
    const rows = codes.map(code => ({
      code,
      qr_dark: normalizeHex(singleDark, "#000000"),
      qr_light: normalizeHex(singleLight, "#ffffff"),
      status: "active"
    }));
    const { error } = await supabase.from("cards").upsert(rows, { onConflict: "code", ignoreDuplicates: true });
    setSaving(false);
    if (error) { setMsg(error.message); return; }

    // Build ZIP of PNGs
    const zip = new JSZip();
    const folder = zip.folder("qrs")!;
    for (const code of codes) {
      const url = baseUrl + encodeURIComponent(code);
      const png = await toPNG({ data: url, label: code, dark: singleDark, light: singleLight });
      folder.file(`${code}.png`, png.split(",")[1], { base64: true });
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `tot-cards-qrs-${prefix}-${codes.length}.zip`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);

    setMsg(`✅ Generated ${codes.length} codes with colors, saved to DB, and downloaded ZIP.`);
  }

  /* -------------- Edit redirect -------------- */
  async function lookupCode() {
    setMsg(null);
    const code = norm(editCode);
    if (!code) { setMsg("Enter a code to look up."); return; }
    const { data, error } = await supabase
      .from("cards")
      .select("code,name,redirect_url,qr_dark,qr_light")
      .ilike("code", code)
      .maybeSingle();
    if (error) { setMsg(error.message); return; }
    setEditFound(data as any);
    setEditTarget((data?.redirect_url as string) || "");
  }

  async function saveRedirect() {
    setMsg(null);
    const code = norm(editCode);
    const target = norm(editTarget) || null;
    if (!code) { setMsg("Enter a code."); return; }
    const { error } = await supabase.from("cards").update({ redirect_url: target }).ilike("code", code);
    if (error) { setMsg(error.message); return; }
    setMsg("✅ Updated redirect.");
  }

  /* -------------- CSV Import -------------- */
  function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setCsvText(""); setCsvErrors([]);
    Papa.parse<CsvRow>(f, { header: true, skipEmptyLines: true, complete: (res) => {
      if (res.errors?.length) setCsvErrors(res.errors.map(er => `Row ${er.row}: ${er.message}`));
      ingestCsv(res.data);
    }});
    e.currentTarget.value = "";
  }

  function ingestCsv(data: CsvRow[]) {
    const errors: string[] = [];
    const ok: CsvRow[] = [];
    const seen = new Set<string>();

    data.forEach((r, idx) => {
      const line = idx + 2;
      const codeRaw = norm(r.code ?? "");
      if (!codeRaw) { errors.push(`Line ${line}: missing code`); return; }
      const key = codeRaw.toLowerCase();
      if (seen.has(key)) { errors.push(`Line ${line}: duplicate code in file (${codeRaw})`); return; }
      seen.add(key);

      // normalize hex if provided
      if (r.qr_dark)  r.qr_dark  = normalizeHex(r.qr_dark,  "#000000");
      if (r.qr_light) r.qr_light = normalizeHex(r.qr_light, "#ffffff");

      ok.push({ ...r, code: codeRaw });
    });

    setCsvRows(ok);
    setCsvErrors(errors);
    setMsg(errors.length ? `Parsed with ${errors.length} issue(s).` : `Parsed ${ok.length} row(s).`);
  }

  async function upsertCsv() {
    if (csvRows.length === 0) { setMsg("Nothing to upsert."); return; }
    setCsvBusy(true);
    const { error } = await supabase.from("cards").upsert(csvRows, { onConflict: "code" });
    setCsvBusy(false);
    if (error) { setMsg(error.message); return; }
    setMsg(`✅ Upserted ${csvRows.length} card(s) to database.`);
  }

  async function downloadZipFromCsv() {
    if (csvRows.length === 0) { setMsg("No parsed rows."); return; }
    const zip = new JSZip();
    const folder = zip.folder("qrs")!;
    for (const r of csvRows) {
      const code = r.code!;
      const url = baseUrl + encodeURIComponent(code);
      const png = await toPNG({
        data: url,
        label: code,
        dark: r.qr_dark || singleDark,
        light: r.qr_light || singleLight
      });
      folder.file(`${code}.png`, png.split(",")[1], { base64: true });
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `tot-cards-qrs-csv-${csvRows.length}.zip`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  /* -------------- UI -------------- */
  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Admin — QR Tools</h1>
      {msg && <div className="text-sm px-3 py-2 rounded bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200">{msg}</div>}

      {/* Global QR color defaults */}
      <section className="border rounded-xl p-4 space-y-3">
        <h2 className="text-lg font-semibold">Default QR Colors</h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm opacity-80 w-16">Dark</label>
            <input type="color" value={singleDark} onChange={e=>setDefaults(e.target.value, singleLight)} />
            <input className="border rounded px-2 py-1 w-32" value={singleDark} onChange={e=>setDefaults(e.target.value, singleLight)} />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm opacity-80 w-16">Light</label>
            <input type="color" value={singleLight} onChange={e=>setDefaults(singleDark, e.target.value)} />
            <input className="border rounded px-2 py-1 w-32" value={singleLight} onChange={e=>setDefaults(singleDark, e.target.value)} />
          </div>
        </div>
        <div className="text-xs opacity-70">These defaults are used for bulk generate and CSV rows without per-card colors.</div>
      </section>

      {/* Single QR */}
      <section className="border rounded-xl p-4 space-y-3">
        <h2 className="text-lg font-semibold">Single QR</h2>
        <div className="grid md:grid-cols-3 gap-3">
          <input value={singleCode} onChange={e=>setSingleCode(e.target.value)} placeholder="Card code (e.g., TOT-ABCD-1234)" className="border rounded px-2 py-1"/>
          <input value={singleLabel} onChange={e=>setSingleLabel(e.target.value)} placeholder="Label under QR (optional)" className="border rounded px-2 py-1"/>
          <button onClick={buildSingle} className="border rounded px-3 py-1">Build Preview</button>
        </div>
        {pngDataUrl && (
          <div className="space-y-2">
            <img src={pngDataUrl} alt="QR preview" className="w-64 border rounded" />
            <div>
              <button onClick={()=>downloadDataUrl(`${singleCode || "qr"}.png`, pngDataUrl)} className="border rounded px-3 py-1">Download PNG</button>
            </div>
          </div>
        )}
      </section>

      {/* Bulk random generate */}
      <section className="border rounded-xl p-4 space-y-3">
        <h2 className="text-lg font-semibold">Bulk Generate Codes + ZIP</h2>
        <div className="grid md:grid-cols-4 gap-3">
          <input value={prefix} onChange={e=>setPrefix(e.target.value)} placeholder="Prefix (e.g., TOT)" className="border rounded px-2 py-1"/>
          <input type="number" value={count} min={1} max={1000} onChange={e=>setCount(parseInt(e.target.value||"0",10))} placeholder="How many?" className="border rounded px-2 py-1"/>
          <div className="col-span-2 flex items-center">
            <button onClick={bulkGenerate} disabled={saving} className="border rounded px-3 py-1 disabled:opacity-50">
              {saving ? "Saving…" : "Generate + Download ZIP"}
            </button>
          </div>
        </div>
      </section>

      {/* CSV Import */}
      <section className="border rounded-xl p-4 space-y-3">
        <h2 className="text-lg font-semibold">CSV Import</h2>
        <div className="text-sm opacity-80">
          Required: <code>code</code>. Optional: <code>name,suit,rank,era,rarity,trader_value,time_value,image_url,redirect_url,status,qr_dark,qr_light</code>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <input type="file" accept=".csv,text/csv" onChange={handleCsvFile} className="border rounded px-2 py-1" />
          <button onClick={()=>{
            setCsvErrors([]);
            Papa.parse<CsvRow>(csvText, { header:true, skipEmptyLines:true, complete:(res)=>{
              if (res.errors?.length) setCsvErrors(res.errors.map(er=>`Row ${er.row}: ${er.message}`));
              ingestCsv(res.data);
            }});
          }} className="border rounded px-3 py-1">
            Parse Pasted CSV
          </button>
        </div>

        <textarea value={csvText} onChange={e=>setCsvText(e.target.value)} rows={6}
          placeholder={`code,name,qr_dark,qr_light\nTOT-4K9V-7XQ2,Ada,#000000,#ffffff`} className="w-full border rounded px-2 py-1 font-mono text-xs"/>

        {csvErrors.length>0 && (
          <div className="text-sm px-3 py-2 rounded bg-red-100 text-red-800">
            {csvErrors.slice(0,5).map((e,i)=><div key={i}>{e}</div>)}
            {csvErrors.length>5 && <div>…and {csvErrors.length-5} more</div>}
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={upsertCsv} disabled={csvBusy || csvRows.length===0} className="border rounded px-3 py-1 disabled:opacity-50">
            {csvBusy ? "Upserting…" : `Upsert ${csvRows.length} row(s)`}
          </button>
          <button onClick={async ()=>{
            if (csvRows.length===0) { setMsg("No parsed rows."); return; }
            // build zip from parsed rows with per-row colors or defaults
            const zip = new JSZip();
            const folder = zip.folder("qrs")!;
            for (const r of csvRows) {
              const code = r.code!;
              const url = `${window.location.origin}/r/${encodeURIComponent(code)}`;
              const png = await toPNG({ data:url, label:code, dark:r.qr_dark||singleDark, light:r.qr_light||singleLight });
              folder.file(`${code}.png`, png.split(",")[1], { base64: true });
            }
            const blob = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a"); a.href=url; a.download=`tot-cards-qrs-csv-${csvRows.length}.zip`;
            document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
          }} disabled={csvRows.length===0} className="border rounded px-3 py-1 disabled:opacity-50">
            Download QR ZIP for parsed rows
          </button>
        </div>

        {csvRows.length>0 && (
          <div className="text-xs opacity-70">Showing first {Math.min(csvRows.length, 10)} of {csvRows.length} parsed rows:</div>
        )}
        {csvRows.length>0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="py-1 pr-3">code</th>
                  <th className="py-1 pr-3">name</th>
                  <th className="py-1 pr-3">qr_dark</th>
                  <th className="py-1 pr-3">qr_light</th>
                </tr>
              </thead>
              <tbody>
                {csvRows.slice(0,10).map((r,i)=>(
                  <tr key={i} className="border-b last:border-b-0">
                    <td className="py-1 pr-3 font-mono">{r.code}</td>
                    <td className="py-1 pr-3">{r.name ?? "—"}</td>
                    <td className="py-1 pr-3"><div className="flex items-center gap-2">
                      <span className="inline-block w-5 h-5 rounded border" style={{background: normalizeHex(r.qr_dark||"#000")}}/>
                      <span className="font-mono">{normalizeHex(r.qr_dark||"#000")}</span>
                    </div></td>
                    <td className="py-1 pr-3"><div className="flex items-center gap-2">
                      <span className="inline-block w-5 h-5 rounded border" style={{background: normalizeHex(r.qr_light||"#fff")}}/>
                      <span className="font-mono">{normalizeHex(r.qr_light||"#fff")}</span>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <RecentCardsPanel />
    </div>
  );
}
