// src/pages/AdminCardsEdit.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type CardEditable = {
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
  current_target: string | null; // ✅ destination field
  is_active: boolean | null;
};

export default function AdminCardsEdit() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [cards, setCards] = useState<CardEditable[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const ids = useMemo(() => {
    const raw = params.get("ids");
    if (!raw) return [];
    return raw.split(",").map(s => s.trim()).filter(Boolean);
  }, [params]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) { if (mounted) setIsAdmin(false); return; }
      const { data } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", u.user.id)
        .maybeSingle();
      if (mounted) setIsAdmin(!!data);
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  async function load() {
    setLoading(true);
    setMsg(null);
    if (ids.length === 0) { setCards([]); setLoading(false); return; }

    const { data, error } = await supabase
      .from("cards")
      .select(`
        id, code, name, suit, rank, era, rarity,
        trader_value, time_value, image_url,
        current_target, is_active
      `)
      .in("id", ids);
    if (error) setMsg(error.message);
    setCards((data as CardEditable[]) ?? []);
    setLoading(false);
  }

  // Basic edit state (bulk editor: values apply to all selected when non-empty)
  const [form, setForm] = useState<Partial<CardEditable>>({});
  function onChange<K extends keyof CardEditable>(k: K, v: CardEditable[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function save() {
    if (ids.length === 0) { setMsg("No cards selected."); return; }

    // Build update object only with fields user filled
    const update: any = {};
    const keys: (keyof CardEditable)[] = [
      "name", "suit", "rank", "era", "rarity",
      "trader_value", "time_value", "image_url",
      "current_target", "is_active"
    ];
    for (const k of keys) {
      const v = (form as any)[k];
      if (v !== undefined && v !== "") update[k] = v;
    }
    if (Object.keys(update).length === 0) { setMsg("Nothing to update."); return; }

    const { error } = await supabase
      .from("cards")
      .update(update)
      .in("id", ids);
    if (error) { setMsg(error.message); return; }

    setMsg(`✅ Updated ${ids.length} card(s).`);
    navigate("/admin/cards");
  }

  if (isAdmin === null) return <div className="p-6">Loading…</div>;
  if (isAdmin === false) return <div className="p-6">Not authorized.</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {ids.length ? `Edit ${ids.length} card(s)` : "Add Card"}
        </h1>
        <div className="flex gap-2">
          <button onClick={save} className="border rounded px-3 py-1">
            Save
          </button>
        </div>
      </div>

      {msg && (
        <div className="text-sm px-3 py-2 rounded bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200">
          {msg}
        </div>
      )}

      {loading ? (
        <div>Loading…</div>
      ) : (
        <>
          {ids.length > 0 && cards.length > 0 && (
            <div className="text-xs opacity-70">
              Editing codes: {cards.map(c => c.code).join(", ")}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Name">
              <input className="border rounded px-2 py-1 w-full" placeholder="Trader name"
                onChange={(e) => onChange("name", e.target.value)} />
            </Field>

            <Field label="Era">
              <input className="border rounded px-2 py-1 w-full" placeholder="Era"
                onChange={(e) => onChange("era", e.target.value)} />
            </Field>

            <Field label="Suit">
              <input className="border rounded px-2 py-1 w-full" placeholder="Suit"
                onChange={(e) => onChange("suit", e.target.value)} />
            </Field>

            <Field label="Rank">
              <input className="border rounded px-2 py-1 w-full" placeholder="Rank"
                onChange={(e) => onChange("rank", e.target.value)} />
            </Field>

            <Field label="Rarity">
              <input className="border rounded px-2 py-1 w-full" placeholder="Rarity"
                onChange={(e) => onChange("rarity", e.target.value)} />
            </Field>

            <Field label="Trader Value">
              <input className="border rounded px-2 py-1 w-full" placeholder="e.g. 100"
                onChange={(e) => onChange("trader_value", e.target.value)} />
            </Field>

            <Field label="TIME Value">
              <input type="number" className="border rounded px-2 py-1 w-full" placeholder="e.g. 5"
                onChange={(e) => onChange("time_value", e.target.value === "" ? null : Number(e.target.value))} />
            </Field>

            <Field label="Image URL">
              <input className="border rounded px-2 py-1 w-full" placeholder="https://…"
                onChange={(e) => onChange("image_url", e.target.value)} />
            </Field>

            <Field label="Destination (current_target)">
              <input className="border rounded px-2 py-1 w-full" placeholder="https://destination.example/page"
                onChange={(e) => onChange("current_target", e.target.value)} />
            </Field>

            <Field label="Active">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isActive"
                  onChange={(e) => onChange("is_active", e.target.checked)} />
                <label htmlFor="isActive">Card is active</label>
              </div>
            </Field>
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs opacity-70 mb-1">{label}</div>
      {children}
    </label>
  );
}

