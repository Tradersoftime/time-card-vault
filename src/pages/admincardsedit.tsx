// src/pages/AdminCardsEdit.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/* -------- minimal shared types -------- */
type Card = {
  id: string;
  code: string;
  redirect_url: string | null;
  status: string | null;
  time_value: number | null;
  image_url: string | null;
  qr_dark: string | null;
  qr_light: string | null;
  created_at: string;
  updated_at: string | null;
};

/* -------- tiny data helpers (inline to keep this file self-contained) -------- */
const COLS = `
  id, code, redirect_url, status, time_value, image_url,
  qr_dark, qr_light, created_at, updated_at
`;

async function getCardsByIds(ids: string[]): Promise<Card[]> {
  const { data, error } = await supabase.from("cards").select(COLS).in("id", ids);
  if (error) throw error;
  return (data || []) as Card[];
}
async function updateCards(ids: string[], patch: Partial<Card>) {
  const { error } = await supabase.from("cards").update(patch).in("id", ids);
  if (error) throw error;
}

/* -------- admin check -------- */
function useIsAdmin() {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) { setOk(false); return; }
      const { data } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", u.user.id)
        .maybeSingle();
      setOk(!!data);
    })();
  }, []);
  return ok;
}

/* -------- UI -------- */
export default function AdminCardsEdit() {
  const isAdmin = useIsAdmin();
  const [sp] = useSearchParams();
  const ids = useMemo(
    () => (sp.get("ids") || "").split(",").map(s => s.trim()).filter(Boolean),
    [sp]
  );

  const [rows, setRows] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  // form fields + apply toggles
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

  useEffect(() => {
    (async () => {
      if (isAdmin !== true) return;
      if (ids.length === 0) { setLoading(false); return; }
      setLoading(true);
      try {
        const data = await getCardsByIds(ids);
        setRows(data);
      } catch (e: any) {
        alert(e.message || String(e));
      }
      setLoading(false);
    })();
  }, [ids, isAdmin]);

  async function save() {
    if (ids.length === 0) { alert("No selected cards."); return; }
    const patch: Partial<Card> = {};
    if (applyRedirect) patch.redirect_url = redirect_url.trim() || null;
    if (applyStatus)   patch.status = status.trim() || null;
    if (applyTime)     patch.time_value = time_value === "" ? null : Number(time_value);
    if (applyImage)    patch.image_url = image_url.trim() || null;
    if (applyQrDark)   patch.qr_dark  = normalizeHex(qr_dark, "#000000");
    if (applyQrLight)  patch.qr_light = normalizeHex(qr_light, "#ffffff");
    if (Object.keys(patch).length === 0) { alert("Toggle at least one field to apply."); return; }

    try {
      await updateCards(ids, patch);
      alert(`Saved changes for ${ids.length} card(s).`);
      nav("/admin/cards");
    } catch (e: any) {
      alert(e.message || String(e));
    }
  }

  if (isAdmin === null) return <div className="p-6">Loading…</div>;
  if (isAdmin === false) return <div className="p-6">Not authorized.</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Bulk Edit Cards</h1>

      {loading ? (
        <div>Loading…</div>
      ) : rows.length === 0 ? (
        <div className="opacity-70">No cards selected.</div>
      ) : (
        <>
          <div className="text-sm opacity-80">Editing {rows.length} card(s).</div>

          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Redirect URL" apply={applyRedirect} setApply={setApplyRedirect}>
              <input
                value={redirect_url}
                onChange={e=>setRedirect(e.target.value)}
                placeholder="https://example/page"
                className="border rounded px-2 py-1 w-full"
              />
            </Field>

            <Field label="Status" apply={applyStatus} setApply={setApplyStatus}>
              <input
                value={status}
                onChange={e=>setStatus(e.target.value)}
                placeholder="active / inactive / …"
                className="border rounded px-2 py-1 w-full"
              />
            </Field>

            <Field label="TIME value" apply={applyTime} setApply={setApplyTime}>
              <input
                type="number"
                value={time_value}
                onChange={e=>setTime(e.target.value)}
                placeholder="e.g. 5"
                className="border rounded px-2 py-1 w-full"
              />
            </Field>

            <Field label="Image URL" apply={applyImage} setApply={setApplyImage}>
              <input
                value={image_url}
                onChange={e=>setImage(e.target.value)}
                placeholder="https://image.png"
                className="border rounded px-2 py-1 w-full"
              />
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
            <button onClick={save} className="border rounded px-3 py-1 bg-primary text-primary-foreground">
              Save changes
            </button>
            <button onClick={()=>history.back()} className="border rounded px-3 py-1">
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* -------- small helpers -------- */
function Field({
  label, apply, setApply, children
}:{
  label: string;
  apply: boolean;
  setApply: (b:boolean)=>void;
  children: React.ReactNode;
}) {
  return (
    <div className="border rounded p-3">
      <label className="flex items-center gap-2 mb-2">
        <input type="checkbox" checked={apply} onChange={e=>setApply(e.target.checked)} />
        <span className="font-medium">{label} (apply to all selected)</span>
      </label>
      {children}
    </div>
  );
}

/* Ensure hex like #RRGGBB; fallback if invalid */
function normalizeHex(hex?: string | null, fallback = "#000000") {
  const s = (hex || "").trim();
  if (!s) return fallback;
  const withHash = s.startsWith("#") ? s : `#${s}`;
  const m = withHash.match(/^#([0-9a-fA-F]{6})$/);
  return m ? `#${m[1].toLowerCase()}` : fallback;
}
