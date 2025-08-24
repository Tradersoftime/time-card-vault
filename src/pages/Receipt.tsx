// src/pages/Receipt.tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type CardObj = {
  card_id: string;
  name: string | null;
  image_url: string | null;
  era: string | null;
  suit: string | null;
  rank: string | null;
  rarity: string | null;
  trader_value: string | null;
};

type ReceiptRow = {
  id: string;
  status: "pending" | "credited" | "rejected";
  submitted_at: string;
  credited_amount: number | null;
  credited_at: string | null;
  external_ref: string | null;
  admin_notes: string | null;
  user_id: string;
  user_email: string | null;
  cards: CardObj[] | null;
};

export default function Receipt() {
  const { id } = useParams();
  const [row, setRow] = useState<ReceiptRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!id) { setMsg("Missing receipt id."); setLoading(false); return; }
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) {
        // Let anonymous view? Uncomment next line to require login:
        // window.location.href = `/auth/login?next=/receipt/${encodeURIComponent(id)}`;
      }
      const { data, error } = await supabase.rpc("redemption_receipt", { p_id: id });
      if (!mounted) return;
      if (error) setMsg(error.message);
      else if (!data || (Array.isArray(data) && data.length === 0)) setMsg("Not found or not authorized.");
      else setRow((Array.isArray(data) ? data[0] : data) as ReceiptRow);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [id]);

  function copyLink() {
    const url = window.location.href;
    navigator.clipboard?.writeText(url);
    setMsg("Link copied to clipboard.");
  }

  function StatusBadge({ s }: { s: ReceiptRow["status"] }) {
    const map: Record<ReceiptRow["status"], string> = {
      pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
      credited: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
      rejected: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
    };
    return <span className={`inline-block text-xs px-2 py-0.5 rounded ${map[s]}`}>{s.toUpperCase()}</span>;
  }

  if (loading) return <div className="p-6">Loading receipt…</div>;
  if (msg && !row) return <div className="p-6 text-red-600">{msg}</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Redemption Receipt</h1>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="border rounded px-3 py-1 text-sm">Print</button>
          <button onClick={copyLink} className="border rounded px-3 py-1 text-sm">Copy Link</button>
        </div>
      </div>

      {msg && <div className="text-sm px-3 py-2 rounded bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200">{msg}</div>}

      {row && (
        <div className="border rounded-xl p-4 space-y-2 bg-background/50">
          <div className="flex items-center justify-between">
            <div className="text-sm">Receipt ID: <span className="font-mono">{row.id}</span></div>
            <StatusBadge s={row.status} />
          </div>

          <div className="grid md:grid-cols-2 gap-2 text-sm">
            <div>Submitted: {new Date(row.submitted_at).toLocaleString()}</div>
            <div>User: {row.user_email ?? row.user_id}</div>
            <div>Credited Amount: {row.credited_amount ?? "—"}</div>
            <div>Credited At: {row.credited_at ? new Date(row.credited_at).toLocaleString() : "—"}</div>
            <div>External Ref: {row.external_ref ?? "—"}</div>
            <div>Admin Notes: {row.admin_notes ?? "—"}</div>
          </div>

          <div className="mt-3">
            <div className="font-medium mb-2">Cards in this redemption</div>
            {(!row.cards || row.cards.length === 0) ? (
              <div className="opacity-70 text-sm">No cards found.</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {row.cards.map((c) => (
                  <div key={c.card_id} className="border rounded-lg overflow-hidden">
                    {c.image_url && (
                      <img src={c.image_url} alt={c.name ?? "Card"} className="w-full aspect-[3/4] object-cover" />
                    )}
                    <div className="p-2 text-sm">
                      <div className="font-medium truncate">{c.name ?? "—"}</div>
                      <div className="opacity-70">
                        {c.era ?? "—"} • {c.suit ?? "—"} {c.rank ?? "—"}
                      </div>
                      <div className="text-xs opacity-60">
                        Rarity: {c.rarity ?? "—"} · Value: {c.trader_value ?? "—"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
