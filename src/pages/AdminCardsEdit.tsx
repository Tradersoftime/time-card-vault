import { useEffect, useMemo, useState } from "react";
import { getCardsByIds, updateCards, Card } from "@/lib/cards";
import { toPNG, normalizeHex } from "@/lib/qr";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";

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

export default function AdminCardsEdit() {
  const isAdmin = useIsAdmin();
  const [sp] = useSearchParams();
  const ids = useMemo(() => (sp.get("ids") || "").split(",").map(s=>s.trim()).filter(Boolean), [sp]);
  const [rows, setRows] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  // Form state + "apply" toggles
  const [redirect_url, setRedirect] = useState("");
  const [status, setStatus] = useState("");
  const [time_value, setTime] = useState<string>("");
  const [image_url, setImage] = useState("");
  const [qr_dark, setQrDark] = useState("#000000");
  const [qr_light, setQrLight] = useState("#ffffff");

  const [applyRedirect, setApplyRedirect] = useState(false);
  const [applyStatus, setApplyStatus] = useState(false);
  const [applyTime, setApplyTime] = useState(false);
  const [applyImage, setApplyImage] = useState(false);
  const [applyQrDark, setApplyQrDark] = useState(false);
  const [applyQrLight, setApplyQrLight] = useState(false);

  const sampleUrl = `${window.location.origin}/r/${encodeURIComponent(rows[0]?.code || "SAMPLE")}`;

  useEffect(() => {
    (async () => {
      if (!isAdmin) return;
      if (ids.length === 0) { setLoading(false); return; }
      setLoading(true);
      try {
        const data = await getCardsByIds(ids);
        setRows(data);
      } catch (e:any) { alert(e.message || String(e)); }
      setLoading(false);
    })();
  }, [ids, isAdmin]);

  async function save() {
    if (ids.length === 0) { alert("No selected cards."); return; }
    const patch: Partial<Card> = {};
    if (applyRedirect) patch.redirect_url = redirect_url.trim() || null;
    if (applyStatus)   patch.status = status.trim() || null;
    if (applyTime)     patch.time_value = time_value ? Number(time_value) : null;
    if (applyImage)    patch.image_url = image_url.trim() || null;
    if (applyQrDark)   patch.qr_dark  = normalizeHex(qr_dark, "#000000");
    if (applyQrLight)  patch.qr_light = normalizeHex(qr_light, "#ffffff");

    if (Object.keys(patch).length === 0) { alert("Toggle at least one field to apply."); return; }

    try {
      await updateCards(ids, patch);
      alert(`Saved changes for ${ids.length} card(s).`);
      nav("/admin/cards");
    } catch (e:any) {
      alert(e.message || String(e));
    }
  }

  async function previewQR() {
    const png = await toPNG({
      data: sampleUrl,
      label: rows[0]?.code || "SAMPLE",
      dark: applyQrDark ? qr_dark : (rows[0]?.qr_dark || "#000000"),
      light: applyQrLight ? qr_light : (rows[0]?.qr_light || "#ffffff"),
      width: 384
    });
    const w = window.open("", "_blank");
    if (w) w.document.write(`<img src="${png}" style="image-rendering:pixelated;max-width:100%"/>`);
  }

  if (isAdmin === null) return <div className="p-6">Loading…</div>;
  if (isAdmin === false) return <div className="p-6">Not authorized.</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Bulk Edit Cards</h1>
      {loading ? (<div>Loading…</div>) : rows.length === 0 ? (
        <div className="opacity-70">No cards selected.</div>
      ) : (
        <>
          <div className="text-sm opacity-80">Editing {rows.length} card(s).</div>

          {/* Selected summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {rows.slice(0,8).map(c => (
              <div key={c.id} className="border rounded p-2 text-xs">
                <div className="font-mono">{c.code}</div>
                <div className="truncate">{c.name ?? "—"}</div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="inline-block w-4 h-4 rounded border" style={{background: normalizeHex(c.qr_dark || "#000")}}/>
                  <span className="inline-block w-4 h-4 rounded border" style={{background: normalizeHex(c.qr_light|| "#fff")}}/>
                </div>
              </div>
            ))}
          </div>

          {/* Form */}
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Redirect URL" apply={applyRedirect} setApply={setApplyRedirect}>
              <input value={redirect_url} onChange={e=>setRedirect(e.target.value)} placeholder="https://example/page" className="border rounded px-2 py-1 w-full"/>
            </Field>

            <Field label="Status" apply={applyStatus} setApply={setApplyStatus}>
              <input value={status} onChange={e=>setStatus(e.target.value)} placeholder="active / inactive / ..." className="border rounded px-2 py-1 w-full"/>
            </Field>

            <Field label="TIME value" apply={applyTime} setApply={setApplyTime}>
              <input type="number" value={time_value} onChange={e=>setTime(e.target.value)} placeholder="e.g. 5" className="border rounded px-2 py-1 w-full"/>
            </Field>

            <Field label="Image URL" apply={applyImage} setApply={setApplyImage}>
              <input value={image_url} onChange={e=>setImage(e.target.value)} placeholder="https://image.png" className="border rounded px-2 py-1 w-full"/>
            </Field>

            <Field label="QR Dark" apply={applyQrDark} setApply={setApplyQrDark}>
              <div className="flex items-center gap-2">
                <input type="color" value={qr_dark} onChange={e=>setQrDark(e.target.value)} />
                <input value={qr_dark} onChange={e=>setQrDark(e.target.value)} className="border rounded px-2 py-1 w-36"/>
              </div>
            </Field>

            <Field label="QR Light" apply={applyQrLight} setApply={setApplyQrLight}>
              <div className="flex items-center gap-2">
                <input type="color" value={qr_light} onChange={e=>setQrLight(e.target.value)} />
                <input value={qr_light} onChange={e=>setQrLight(e.target.value)} className="border rounded px-2 py-1 w-36"/>
              </div>
            </Field>
          </div>

          <div className="flex gap-2">
            <button onClick={previewQR} className="border rounded px-3 py-1">Preview sample QR</button>
            <button onClick={save} className="border rounded px-3 py-1 bg-primary text-primary-foreground">Save changes</button>
            <button onClick={()=>history.back()} className="border rounded px-3 py-1">Cancel</button>
          </div>
        </>
      )}
    </div>
  );
}

function Field({label, apply, setApply, children}:{label:string;apply:boolean;setApply:(b:boolean)=>void;children:React.ReactNode}) {
  return (
    <div className="border rounded p-3">
      <label className="flex items-center gap-2 mb-2">
        <input type="checkbox" checked={apply} onChange={e=>setApply(e.target.checked)}/>
        <span className="font-medium">{label} (apply to all selected)</span>
      </label>
      {children}
    </div>
  );
}


