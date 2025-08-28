// src/pages/AdminCards.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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
  current_target: string | null;    // ✅ use current_target instead of redirect_url
  is_active: boolean | null;
  created_at: string;
};

export default function AdminCards() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<CardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();

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

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  async function load() {
    setLoading(true);
    setMsg(null);
    const { data, error } = await supabase
      .from("cards")
      .select(`
        id, code, name, suit, rank, era, rarity,
        trader_value, time_value, image_url,
        current_target, is_active, created_at
      `)
      .order("created_at", { ascending: false });
    if (error) setMsg(error.message);
    setRows((data as CardRow[]) ?? []);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      (r.code ?? "").toLowerCase().includes(q) ||
      (r.name ?? "").toLowerCase().includes(q) ||
      (r.era ?? "").toLowerCase().includes(q) ||
      (r.rarity ?? "").toLowerCase().includes(q) ||
      (r.current_target ?? "").toLowerCase().includes(q)
    );
  }, [rows, query]);

  const selectedIds = useMemo(
    () => Object.keys(selected).filter(id => selected[id]),
    [selected]
  );

  function toggleRow(id: string) {
    setSelected(s => ({ ...s, [id]: !s[id] }));
  }
  function selectAll() {
    const next: Record<string, boolean> = {};
    filtered.forEach(r => { next[r.id] = true; });
    setSelected(next);
  }
  function clearSel() { setSelected({}); }

  function bulkEdit() {
    if (selectedIds.length === 0) { setMsg("Select at least one card."); return; }
    navigate(`/admin/cards/edit?ids=${selectedIds.join(",")}`);
  }

  if (isAdmin === null) return <div className="p-6">Loading…</div>;
  if (isAdmin === false) return <div className="p-6">Not authorized.</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Card Management</h1>
        <div className="flex gap-2">
          <Link to="/admin/qr" className="border rounded px-3 py-1">QR Tools</Link>
          <button onClick={load} className="border rounded px-3 py-1">Refresh</button>
        </div>
      </div>

      {msg && (
        <div className="text-sm px-3 py-2 rounded bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200">
          {msg}
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by code, name, era, rarity, destination…"
          className="border rounded px-2 py-1"
        />
        <div className="ml-auto flex gap-2">
          <button onClick={selectAll} className="border rounded px-3 py-1">Select All (filtered)</button>
          <button onClick={clearSel} className="border rounded px-3 py-1">Clear</button>
          <button onClick={bulkEdit} className="border rounded px-3 py-1">Edit selected ({selectedIds.length})</button>
          <Link to="/admin/cards/edit" className="border rounded px-3 py-1">Add Card</Link>
        </div>
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="opacity-70">No cards found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-3"><input type="checkbox" onChange={(e) => {
                  if (e.currentTarget.checked) selectAll(); else clearSel();
                }} /></th>
                <th className="py-2 pr-3">Created</th>
                <th className="py-2 pr-3">Code</th>
                <th className="py-2 pr-3">Trader</th>
                <th className="py-2 pr-3">Era</th>
                <th className="py-2 pr-3">Suit / Rank</th>
                <th className="py-2 pr-3">Rarity</th>
                <th className="py-2 pr-3">Value</th>
                <th className="py-2 pr-3">TIME</th>
                <th className="py-2 pr-3">Destination</th>
                <th className="py-2 pr-3">Active</th>
                <th className="py-2 pr-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-b last:border-b-0 align-top">
                  <td className="py-2 pr-3">
                    <input type="checkbox" checked={!!selected[r.id]} onChange={() => toggleRow(r.id)} />
                  </td>
                  <td className="py-2 pr-3">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="py-2 pr-3 font-mono">{r.code}</td>
                  <td className="py-2 pr-3">{r.name ?? "—"}</td>
                  <td className="py-2 pr-3">{r.era ?? "—"}</td>
                  <td className="py-2 pr-3">{r.suit ?? "—"} {r.rank ?? ""}</td>
                  <td className="py-2 pr-3">{r.rarity ?? "—"}</td>
                  <td className="py-2 pr-3">{r.trader_value ?? "—"}</td>
                  <td className="py-2 pr-3">{r.time_value ?? 0}</td>
                  <td className="py-2 pr-3 max-w-[280px] truncate">
                    {r.current_target ? (
                      <a className="underline" href={r.current_target} target="_blank" rel="noreferrer">
                        {r.current_target}
                      </a>
                    ) : "—"}
                  </td>
                  <td className="py-2 pr-3">{r.is_active ? "Yes" : "No"}</td>
                  <td className="py-2 pr-3">
                    <div className="flex flex-wrap gap-2">
                      <a
                        className="border rounded px-2 py-0.5 text-xs"
                        href={`/r/${encodeURIComponent(r.code)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open /r/{r.code}
                      </a>
                      <button
                        className="border rounded px-2 py-0.5 text-xs"
                        onClick={() => navigator.clipboard.writeText(r.code)}
                      >
                        Copy code
                      </button>
                      <Link
                        className="border rounded px-2 py-0.5 text-xs"
                        to={`/admin/cards/edit?ids=${r.id}`}
                      >
                        Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
