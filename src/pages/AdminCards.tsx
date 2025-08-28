import { useEffect, useMemo, useState } from "react";
import { listCards, Card } from "@/lib/cards";
import { toPNG, downloadDataUrl, normalizeHex } from "@/lib/qr";
import JSZip from "jszip";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

function useIsAdmin() {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) { setOk(false); return; }
      const { data } = await supabase.from("admins").select("user_id").eq("user_id", u.user.id).maybeSingle();
      setOk(!!data);
    })();
  }, []);
  return ok;
}

export default function AdminCards() {
  const isAdmin = useIsAdmin();
  const [rows, setRows] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [sortKey, setSortKey] = useState<"code"|"updated_at">("updated_at");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("desc");
  const nav = useNavigate();

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  async function load() {
    setLoading(true);
    try {
      const data = await listCards({ search: q });
      setRows(data);
    } catch (e:any) { alert(e.message || String(e)); }
    setLoading(false);
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const arr = !s ? rows : rows.filter(r =>
      (r.code||"").toLowerCase().includes(s) ||
      (r.name||"").toLowerCase().includes(s)
    );
    const dir = sortDir === "asc" ? 1 : -1;
    return [...arr].sort((a,b) => {
      if (sortKey === "code") return (a.code > b.code ? 1 : -1) * dir;
      const at = a.updated_at || a.created_at;
      const bt = b.updated_at || b.created_at;
      return ((new Date(at).getTime()) - (new Date(bt).getTime())) * dir;
    });
  }, [rows, q, sortKey, sortDir]);

  const selectedIds = useMemo(() => Object.keys(selected).filter(id => selected[id]), [selected]);

  async function downloadOne(card: Card) {
    const url = `${window.location.origin}/r/${encodeURIComponent(card.code)}`;
    const png = await toPNG({
      data: url,
      label: card.code,
      dark: card.qr_dark || "#000000",
      light: card.qr_light || "#ffffff",
      width: 512
    });
    downloadDataUrl(`${card.code}.png`, png);
  }

  async function downloadZipSelected() {
    if (selectedIds.length === 0) { alert("Select at least one row."); return; }
    const zip = new JSZip();
    const folder = zip.folder("qrs")!;
    for (const id of selectedIds) {
      const c = rows.find(r => r.id === id)!;
      const url = `${window.location.origin}/r/${encodeURIComponent(c.code)}`;
      const png = await toPNG({
        data: url,
        label: c.code,
        dark: c.qr_dark || "#000000",
        light: c.qr_light || "#ffffff",
      });
      folder.file(`${c.code}.png`, png.split(",")[1], { base64: true });
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `cards-qrs-${selectedIds.length}.zip`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  if (isAdmin === null) return <div className="p-6">Loading…</div>;
  if (isAdmin === false) return <div className="p-6">Not authorized.</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin — Card Management</h1>
        <div className="flex gap-2">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search code or name…" className="border rounded px-2 py-1" />
          <button onClick={load} className="border rounded px-3 py-1">Search</button>
          <button onClick={()=>nav(`/admin/cards/edit?ids=${selectedIds.join(",")}`)} disabled={selectedIds.length===0} className="border rounded px-3 py-1 disabled:opacity-50">
            Edit {selectedIds.length||""} selected
          </button>
          <button onClick={downloadZipSelected} disabled={selectedIds.length===0} className="border rounded px-3 py-1 disabled:opacity-50">
            Download ZIP ({selectedIds.length||0})
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b sticky top-0 bg-background">
            <tr className="text-left">
              <th className="py-2 pr-3"><input type="checkbox"
                checked={filtered.length>0 && filtered.every(r => selected[r.id])}
                onChange={(e)=> {
                  const v = e.target.checked; const m: Record<string,boolean> = {...selected};
                  filtered.forEach(r => m[r.id]=v); setSelected(m);
                }}/></th>
              <Th label="Code" active={sortKey==="code"} dir={sortDir}
                onClick={()=>{setSortKey("code"); setSortDir(d=>d==="asc"?"desc":"asc");}}/>
              <th className="py-2 pr-3">Trader</th>
              <th className="py-2 pr-3">Era</th>
              <th className="py-2 pr-3">Suit</th>
              <th className="py-2 pr-3">Rank</th>
              <th className="py-2 pr-3">Rarity</th>
              <th className="py-2 pr-3">Value</th>
              <th className="py-2 pr-3">TIME</th>
              <Th label="Updated" active={sortKey==="updated_at"} dir={sortDir}
                onClick={()=>{setSortKey("updated_at"); setSortDir(d=>d==="asc"?"desc":"asc");}}/>
              <th className="py-2 pr-3">Redirect</th>
              <th className="py-2 pr-3">QR Colors</th>
              <th className="py-2 pr-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="py-4" colSpan={13}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="py-4" colSpan={13} className="opacity-70">No results.</td></tr>
            ) : filtered.map(c => (
              <tr key={c.id} className="border-b align-top">
                <td className="py-2 pr-3"><input type="checkbox" checked={!!selected[c.id]} onChange={()=>setSelected(s=>({...s,[c.id]:!s[c.id]}))}/></td>
                <td className="py-2 pr-3 font-mono">{c.code}</td>
                <td className="py-2 pr-3">{c.name??"—"}</td>
                <td className="py-2 pr-3">{c.era??"—"}</td>
                <td className="py-2 pr-3">{c.suit??"—"}</td>
                <td className="py-2 pr-3">{c.rank??"—"}</td>
                <td className="py-2 pr-3">{c.rarity??"—"}</td>
                <td className="py-2 pr-3">{c.trader_value??"—"}</td>
                <td className="py-2 pr-3">{c.time_value??0}</td>
                <td className="py-2 pr-3">{new Date(c.updated_at||c.created_at).toLocaleString()}</td>
                <td className="py-2 pr-3 max-w-[240px] truncate">
                  {c.redirect_url ? <a className="underline" href={c.redirect_url} target="_blank" rel="noreferrer">{c.redirect_url}</a> : "—"}
                </td>
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-5 h-5 rounded border" style={{background: normalizeHex(c.qr_dark || "#000000")}} title={`dark ${c.qr_dark||"#000000"}`}/>
                    <span className="inline-block w-5 h-5 rounded border" style={{background: normalizeHex(c.qr_light|| "#ffffff")}} title={`light ${c.qr_light||"#ffffff"}`}/>
                  </div>
                </td>
                <td className="py-2 pr-3">
                  <div className="flex gap-2">
                    <button className="border rounded px-2 py-0.5 text-xs" onClick={()=>downloadOne(c)}>Download QR</button>
                    <button className="border rounded px-2 py-0.5 text-xs" onClick={()=>nav(`/admin/cards/edit?ids=${c.id}`)}>Edit</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({label, active, dir, onClick}:{label:string;active?:boolean;dir?:"asc"|"desc";onClick?:()=>void}) {
  return (
    <th className="py-2 pr-3 cursor-pointer select-none" onClick={onClick}
        aria-sort={active ? (dir==="asc" ? "ascending" : "descending") : "none"}>
      {label} {active ? (dir==="asc" ? "▲" : "▼") : ""}
    </th>
  );
}
