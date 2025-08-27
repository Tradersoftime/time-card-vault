// src/pages/CardEditMulti.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams, useNavigate, Link } from "react-router-dom";

type CardRow = {
  id: number;
  code: string | null;
  name: string | null;
  status: string | null;
  rank: string | null;
  rarity: string | null;
  is_active: boolean | null;
  image_url: string | null;
  qr_dark: string | null;
  qr_light: string | null;
};

type Editable = {
  name: string;
  status: string;
  rank: string;
  rarity: string;
  is_active: boolean;
  qr_dark: string;
  qr_light: string;
};

export default function CardEditMulti() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const idsParam = params.get("ids") ?? "";
  const ids = useMemo(
    () =>
      idsParam
        .split(",")
        .map((x) => Number(x.trim()))
        .filter((n) => Number.isFinite(n)),
    [idsParam]
  );

  const [rows, setRows] = useState<CardRow[]>([]);
  const [forms, setForms] = useState<Record<number, Editable>>({});
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const currentId = ids[idx];

  useEffect(() => {
    (async () => {
      if (!ids.length) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("cards")
        .select("id, code, name, status, rank, rarity, is_active, image_url, qr_dark, qr_light")
        .in("id", ids);
      if (error) console.error(error);
      const fetched = (data ?? []).sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
      setRows(fetched);
      const initial: Record<number, Editable> = {};
      for (const r of fetched) {
        initial[r.id] = {
          name: r.name ?? "",
          status: r.status ?? "",
          rank: r.rank ?? "",
          rarity: r.rarity ?? "",
          is_active: !!r.is_active,
          qr_dark: (r.qr_dark ?? "#000000").trim(),
          qr_light: (r.qr_light ?? "#ffffff").trim(),
        };
      }
      setForms(initial);
      setLoading(false);
    })();
  }, [ids.length]);

  const current = currentId ? forms[currentId] : undefined;

  async function saveOne(id: number) {
    const f = forms[id];
    const { error } = await supabase
      .from("cards")
      .update({
        name: f.name || null,
        status: f.status || null,
        rank: f.rank || null,
        rarity: f.rarity || null,
        is_active: f.is_active,
        qr_dark: f.qr_dark?.trim() || null,
        qr_light: f.qr_light?.trim() || null,
      })
      .eq("id", id);

    if (error) {
      alert(`Save failed for #${id}: ${error.message}`);
    } else {
      // optional: toast
    }
  }

  async function saveAll() {
    for (const id of ids) await saveOne(id);
    navigate("/admin/cards"); // back to management
  }

  if (!ids.length) {
    return (
      <div className="p-6">
        <p>No ids provided. <Link to="/admin/cards" className="text-blue-600 underline">Back</Link></p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Edit Cards</h1>
        <div className="flex gap-2">
          <button
            className="px-3 py-2 rounded bg-gray-200"
            onClick={() => navigate("/admin/cards")}
          >
            Back to Cards
          </button>
          <button
            className="px-3 py-2 rounded bg-green-600 text-white"
            onClick={saveAll}
          >
            Save All & Return
          </button>
        </div>
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : (
        <>
          {/* “Tabs” (simple) */}
          <div className="flex flex-wrap gap-2">
            {rows.map((r, i) => (
              <button
                key={r.id}
                onClick={() => setIdx(i)}
                className={
                  "px-3 py-1 rounded border " +
                  (i === idx ? "bg-blue-600 text-white" : "bg-white")
                }
              >
                #{r.id} {r.name || ""}
              </button>
            ))}
          </div>

          {/* Current card form */}
          {current && (
            <div className="border rounded-xl p-4 space-y-4 max-w-3xl">
              <div className="grid grid-cols-2 gap-4">
                <label className="space-y-1">
                  <div className="text-sm opacity-70">Name</div>
                  <input
                    className="w-full border rounded px-2 py-1"
                    value={current.name}
                    onChange={(e) =>
                      setForms({ ...forms, [currentId]: { ...current, name: e.target.value } })
                    }
                  />
                </label>

                <label className="space-y-1">
                  <div className="text-sm opacity-70">Status</div>
                  <input
                    className="w-full border rounded px-2 py-1"
                    value={current.status}
                    onChange={(e) =>
                      setForms({ ...forms, [currentId]: { ...current, status: e.target.value } })
                    }
                  />
                </label>

                <label className="space-y-1">
                  <div className="text-sm opacity-70">Rank</div>
                  <input
                    className="w-full border rounded px-2 py-1"
                    value={current.rank}
                    onChange={(e) =>
                      setForms({ ...forms, [currentId]: { ...current, rank: e.target.value } })
                    }
                  />
                </label>

                <label className="space-y-1">
                  <div className="text-sm opacity-70">Rarity</div>
                  <input
                    className="w-full border rounded px-2 py-1"
                    value={current.rarity}
                    onChange={(e) =>
                      setForms({ ...forms, [currentId]: { ...current, rarity: e.target.value } })
                    }
                  />
                </label>

                <label className="space-y-1">
                  <div className="text-sm opacity-70">QR Dark</div>
                  <input
                    className="w-full border rounded px-2 py-1 font-mono"
                    value={current.qr_dark}
                    onChange={(e) =>
                      setForms({ ...forms, [currentId]: { ...current, qr_dark: e.target.value } })
                    }
                  />
                </label>

                <label className="space-y-1">
                  <div className="text-sm opacity-70">QR Light</div>
                  <input
                    className="w-full border rounded px-2 py-1 font-mono"
                    value={current.qr_light}
                    onChange={(e) =>
                      setForms({ ...forms, [currentId]: { ...current, qr_light: e.target.value } })
                    }
                  />
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={current.is_active}
                    onChange={(e) =>
                      setForms({ ...forms, [currentId]: { ...current, is_active: e.target.checked } })
                    }
                  />
                  <span>Active</span>
                </label>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-2 rounded bg-blue-600 text-white"
                  onClick={() => saveOne(currentId)}
                >
                  Save This Card
                </button>

                <button
                  className="px-3 py-2 rounded bg-gray-200"
                  onClick={() => setIdx(Math.min(idx + 1, ids.length - 1))}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
