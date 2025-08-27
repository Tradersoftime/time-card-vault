// src/pages/CardManagementNew.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { makeQRDataURL, downloadDataUrl } from "@/lib/qr";
import { Link, useNavigate } from "react-router-dom";

type CardRow = {
  id: number;
  code: string | null;
  name: string | null;
  status: string | null;
  rank: string | null;
  rarity: string | null;
  is_active: boolean | null;
  image_url: string | null;
  qr_dark: string | null;   // custom QR color (dark)
  qr_light: string | null;  // custom QR color (light)
};

function QRPreview({
  value,
  dark,
  light,
  size = 128,
}: {
  value: string;
  dark?: string | null;
  light?: string | null;
  size?: number;
}) {
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    let ok = true;
    (async () => {
      try {
        const url = await makeQRDataURL(
          value,
          (dark || "#000000").trim(),
          (light || "#ffffff").trim(),
          size
        );
        if (ok) setDataUrl(url);
      } catch (e) {
        console.error("QR render error", e);
      }
    })();
    return () => { ok = false; };
  }, [value, dark, light, size]);

  if (!dataUrl) return <div className="text-xs opacity-60">Rendering…</div>;
  return <img src={dataUrl} alt="QR preview" className="rounded border" />;
}

export default function CardManagementNew() {
  const [cards, setCards] = useState<CardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("cards")
        .select("id, code, name, status, rank, rarity, is_active, image_url, qr_dark, qr_light")
        .order("id", { ascending: false });
      if (error) console.error(error);
      setCards(data ?? []);
      setLoading(false);
    })();
  }, []);

  const allSelected = useMemo(
    () => selected.size > 0 && selected.size === cards.length,
    [selected, cards.length]
  );

  const toggleAll = (checked: boolean) => {
    if (checked) setSelected(new Set(cards.map(c => c.id)));
    else setSelected(new Set());
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Card Management</h1>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-2 rounded bg-gray-200"
            onClick={() => toggleAll(!allSelected)}
          >
            {allSelected ? "Unselect All" : "Select All"}
          </button>

          <button
            className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
            disabled={selected.size === 0}
            onClick={() => {
              const ids = Array.from(selected).join(",");
              navigate(`/admin/cards/edit?ids=${ids}`);
            }}
          >
            Edit Selected ({selected.size})
          </button>
        </div>
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {cards.map((card) => {
            const valueForQR = card.code ?? String(card.id);

            return (
              <div key={card.id} className="border rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={selected.has(card.id)}
                    onChange={(e) => {
                      const next = new Set(selected);
                      if (e.target.checked) next.add(card.id);
                      else next.delete(card.id);
                      setSelected(next);
                    }}
                  />
                  <div className="font-semibold">
                    {card.name || "Untitled"}{" "}
                    <span className="text-xs opacity-60">#{card.id}</span>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-32">
                    <QRPreview value={valueForQR} dark={card.qr_dark} light={card.qr_light} />
                    <button
                      className="w-full mt-2 text-sm px-2 py-1 rounded bg-gray-100 border"
                      onClick={async () => {
                        const url = await makeQRDataURL(
                          valueForQR,
                          card.qr_dark ?? "#000000",
                          card.qr_light ?? "#ffffff",
                          1024
                        );
                        downloadDataUrl(url, `${card.name || "card"}-qr.png`);
                      }}
                    >
                      Download QR
                    </button>
                  </div>

                  <div className="flex-1 space-y-2">
                    {/* ALWAYS VISIBLE METADATA (no toggle) */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <div className="opacity-70">Code</div>
                      <div className="font-mono break-all">{card.code ?? "—"}</div>

                      <div className="opacity-70">Status</div>
                      <div>{card.status ?? "—"}</div>

                      <div className="opacity-70">Rank</div>
                      <div>{card.rank ?? "—"}</div>

                      <div className="opacity-70">Rarity</div>
                      <div>{card.rarity ?? "—"}</div>

                      <div className="opacity-70">Active</div>
                      <div>{card.is_active ? "Yes" : "No"}</div>

                      <div className="opacity-70">QR Dark</div>
                      <div className="font-mono">{card.qr_dark ?? "#000000"}</div>

                      <div className="opacity-70">QR Light</div>
                      <div className="font-mono">{card.qr_light ?? "#ffffff"}</div>
                    </div>

                    <div className="pt-1">
                      <Link
                        to={`/admin/cards/edit?ids=${card.id}`}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Edit this card
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {cards.length === 0 && (
            <div className="opacity-60">No cards found.</div>
          )}
        </div>
      )}
    </div>
  );
}
