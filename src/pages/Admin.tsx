// src/pages/Admin.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/* ---------- Virtualized table deps ---------- */
import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";

/* =========================================================
   Inline helpers: debounce + CSV + DataTable + column defs
   ========================================================= */

/** Debounce any value for simple search UX inside DataTable */
function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/** Simple CSV export of the current filtered+visible view */
function exportToCsv(opts: {
  filename: string;
  headers: string[];
  rows: (string | number | boolean | null | undefined)[][];
}) {
  const { filename, headers, rows } = opts;
  const esc = (v: any) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    headers.map(esc).join(","),
    ...rows.map((r) => r.map(esc).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Generic, virtualized, searchable, sortable table */
type DataTableProps<TData> = {
  title: string;
  data: TData[];
  columns: ColumnDef<TData, any>[];
  totalCount: number;
  heightPx?: number; // internal scroll area height
  csvFilename: string;
};
function DataTable<TData>({
  title,
  data,
  columns,
  totalCount,
  heightPx = 560,
  csvFilename,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [global, setGlobal] = React.useState("");
  const debounced = useDebouncedValue(global, 300);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const globalFilterFn = React.useCallback(
    (row: any, _colId: string, filterValue: string) => {
      if (!filterValue) return true;
      const q = String(filterValue).toLowerCase();
      const cells = row.getVisibleCells?.() || [];
      for (const c of cells) {
        const v = c.getValue?.();
        if (v == null) continue;
        const s =
          typeof v === "string"
            ? v
            : typeof v === "number"
              ? v.toString()
              : JSON.stringify(v);
        if (s.toLowerCase().includes(q)) return true;
      }
      return false;
    },
    []
  );

  const selectCol: ColumnDef<TData, any> = React.useMemo(
    () => ({
      id: "_select",
      enableSorting: false,
      enableHiding: false,
      header: ({ table }) => (
        <input
          type="checkbox"
          aria-label="Select all"
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() ? undefined : false)
          }
          onChange={(e) =>
            table.toggleAllPageRowsSelected(e.currentTarget.checked)
          }
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          aria-label="Select row"
          checked={row.getIsSelected()}
          onChange={(e) => row.toggleSelected(e.currentTarget.checked)}
        />
      ),
      size: 40,
    }),
    []
  );

  const table = useReactTable({
    data,
    columns: React.useMemo(() => [selectCol, ...columns], [columns, selectCol]),
    state: {
      sorting,
      globalFilter: debounced,
      columnVisibility,
      rowSelection,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobal,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn,
  });

  const rows = table.getRowModel().rows;
  const parentRef = React.useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 8,
  });
  const vItems = rowVirtualizer.getVirtualItems();
  const visibleCols = table.getVisibleLeafColumns().filter((c) => c.id !== "_select");
  const filteredCount = rows.length;

  function handleExportCSV() {
    exportToCsv({
      filename: csvFilename,
      headers: visibleCols.map((c) => c.id || c.accessorKey?.toString() || "col"),
      rows: rows.map((r) =>
        visibleCols.map((c) => r.getValue(c.id ?? (c.accessorKey as string)))
      ),
    });
  }

  return (
    <div className="w-full border rounded-xl">
      {/* panel header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between p-3 border-b">
        <div className="font-semibold">
          {title} — {totalCount.toLocaleString()}{" "}
          <span className="text-xs opacity-70">
            (filtered: {filteredCount.toLocaleString()})
          </span>
        </div>
        <div className="flex gap-2 items-center">
          <input
            value={global}
            onChange={(e) => setGlobal(e.target.value)}
            placeholder="Search visible columns…"
            className="h-9 w-[220px] border rounded px-2"
          />
          {/* simple column toggle */}
          <details className="relative">
            <summary className="h-9 px-3 border rounded cursor-pointer list-none select-none">
              Columns
            </summary>
            <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-zinc-900 border rounded p-1 shadow">
              {table
                .getAllLeafColumns()
                .filter((c) => c.id !== "_select")
                .map((col) => (
                  <label
                    key={col.id}
                    className="flex items-center gap-2 px-2 py-1 text-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={col.getIsVisible()}
                      onChange={(e) => col.toggleVisibility(e.currentTarget.checked)}
                    />
                    <span className="capitalize">{col.id}</span>
                  </label>
                ))}
            </div>
          </details>
          <button className="h-9 px-3 border rounded" onClick={handleExportCSV}>
            Export CSV
          </button>
          <button className="h-9 px-3 border rounded opacity-60 cursor-not-allowed">
            Bulk actions (…)
          </button>
        </div>
      </div>

      {/* table container with sticky header + internal scroll */}
      <div ref={parentRef} className="relative overflow-auto" style={{ height: `${heightPx}px` }}>
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead className="sticky top-0 z-10 bg-background">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b">
                {hg.headers.map((h) => {
                  const canSort = h.column.getCanSort();
                  const sortDir = h.column.getIsSorted() as false | "asc" | "desc";
                  return (
                    <th
                      key={h.id}
                      className={
                        "text-left font-medium py-2 px-2 border-b bg-background " +
                        (canSort ? "cursor-pointer select-none" : "")
                      }
                      onClick={canSort ? h.column.getToggleSortingHandler() : undefined}
                      aria-sort={
                        sortDir === "asc"
                          ? "ascending"
                          : sortDir === "desc"
                            ? "descending"
                            : "none"
                      }
                      style={{ width: h.getSize() }}
                    >
                      {h.isPlaceholder
                        ? null
                        : flexRender(h.column.columnDef.header, h.getContext())}
                      {canSort && (
                        <span className="ml-1 opacity-70">
                          {sortDir === "asc" ? "▲" : sortDir === "desc" ? "▼" : "↕"}
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          <tbody>
            <tr>
              <td colSpan={table.getAllLeafColumns().length} className="p-0">
                <div
                  className="relative"
                  style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}
                >
                  {vItems.map((vi) => {
                    const row = rows[vi.index];
                    return (
                      <div
                        key={row.id}
                        className="absolute left-0 right-0"
                        style={{ height: vi.size, transform: `translateY(${vi.start}px)` }}
                      >
                        <table className="w-full text-sm border-separate border-spacing-0">
                          <tbody>
                            <tr className="border-b hover:bg-muted/50">
                              {row.getVisibleCells().map((cell) => (
                                <td key={cell.id} className="py-2 px-2">
                                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </td>
                              ))}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
                {filteredCount === 0 && (
                  <div className="p-6 text-center text-sm opacity-70">No results.</div>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="p-2 text-xs opacity-70 border-t">
        Selected rows: {Object.keys(rowSelection).length}
      </div>
    </div>
  );
}

/** Pretty date cell */
function dateCell(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

/** Column defs for the two logs (match your RPC shapes) */
type ScanRowUI = {
  created_at: string;
  email: string | null;
  code: string;
  user_id: string | null;
  outcome: string; // claimed, already_owner, etc
  card_id: string | null;
};

const SCAN_COLS: ColumnDef<ScanRowUI>[] = [
  {
    id: "created_at",
    accessorKey: "created_at",
    header: "when",
    cell: ({ row }) => <span className="font-medium">{dateCell(row.original.created_at)}</span>,
    sortingFn: "alphanumeric",
  },
  { id: "code", accessorKey: "code", header: "code" },
  { id: "email", accessorKey: "email", header: "email" },
  { id: "user_id", accessorKey: "user_id", header: "userId" },
  { id: "outcome", accessorKey: "outcome", header: "outcome" },
  { id: "card_id", accessorKey: "card_id", header: "cardId" },
];

type CreditedRowUI = {
  id: string;
  user_id: string;
  email: string | null;
  credited_amount: number | null;
  credited_at: string | null;
  // Optional fields we can fill when your RPC returns them:
  card_code?: string | null;   // per-card code
  credited_by?: string | null; // admin email/id
};

const CREDITED_COLS: ColumnDef<CreditedRowUI>[] = [
  {
    id: "credited_at",
    accessorKey: "credited_at",
    header: "creditedAt",
    cell: ({ row }) => <span className="font-medium">{dateCell(row.original.credited_at)}</span>,
    sortingFn: "alphanumeric",
  },
  { id: "card_code", accessorKey: "card_code", header: "cardCode" }, // shows "—" until wired
  { id: "email", accessorKey: "email", header: "userEmail" },
  { id: "user_id", accessorKey: "user_id", header: "userId" },
  { id: "credited_by", accessorKey: "credited_by", header: "creditedBy" },
  {
    id: "credited_amount",
    accessorKey: "credited_amount",
    header: "amountTIME",
    cell: ({ getValue }) => <span className="tabular-nums">{getValue<number>() ?? "—"}</span>,
    sortingFn: "basic",
  },
];

/* =========================================================
   Your existing page state/types (kept as-is where possible)
   ========================================================= */

/* ---------- Types ---------- */
type PendingCard = {
  card_id: string;
  name: string | null;
  image_url: string | null;
  era: string | null;
  suit: string | null;
  rank: string | null;
  rarity: string | null;
  trader_value: string | null;
  time_value: number | null;
};

type PendingRedemption = {
  id: string;
  user_id: string;
  email: string | null;
  submitted_at: string;
  card_count: number;
  total_time_value: number;
  cards: PendingCard[];
};

type BlockedRow = {
  user_id: string;
  email: string | null;
  reason: string | null;
  blocked_at: string;
  blocked_by: string | null;
  blocked_by_email: string | null;
};

type ScanRow = {
  created_at: string;
  user_id: string;
  email: string | null;
  code: string;
  card_id: string | null;
  outcome:
    | "claimed"
    | "already_owner"
    | "owned_by_other"
    | "not_found"
    | "blocked"
    | "error";
};

type RecentRow = {
  id: string;
  user_id: string;
  email: string | null;
  credited_amount: number | null;
  credited_at: string | null;
};

/* ---------- Page ---------- */
export default function Admin() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Pending redemptions (grouped by user)
  const [pending, setPending] = useState<PendingRedemption[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [selectedReds, setSelectedReds] = useState<Record<string, boolean>>({});
  const [toolMsg, setToolMsg] = useState<string | null>(null);

  // Per-redemption per-card selection
  // shape: { redemptionId: { cardId: true } }
  const [cardSel, setCardSel] = useState<Record<string, Record<string, boolean>>>({});

  // Blocked users
  const [blocked, setBlocked] = useState<BlockedRow[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);

  // Scan log
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [loadingScans, setLoadingScans] = useState(false);
  const [scanOutcome, setScanOutcome] = useState<ScanRow["outcome"] | "all">("all");

  // Receipt banner
  const [lastReceiptUrl, setLastReceiptUrl] = useState<string | null>(null);

  // Recent credited
  const [recent, setRecent] = useState<RecentRow[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  /* ---- Admin check ---- */
  useEffect(() => {
    let mounted = true;
    (async () => {
      setError(null);
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) {
        if (mounted) setIsAdmin(false);
        return;
      }
      const { data, error } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", u.user.id)
        .maybeSingle();
      if (!mounted) return;
      if (error) setError(error.message);
      setIsAdmin(!!data);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (isAdmin !== true) return;
    loadPending();
    loadBlocked();
    loadScans();
    loadRecent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  /* ---- Loaders ---- */
  async function loadPending() {
    setLoadingPending(true);
    setSelectedReds({});
    setCardSel({});
    setError(null);
    const { data, error } = await supabase.rpc("admin_pending_redemptions");
    if (error) setError(error.message);
    const rows = (data as PendingRedemption[]) ?? [];
    // default: select all cards per redemption
    const initSel: Record<string, Record<string, boolean>> = {};
    rows.forEach((r) => {
      const m: Record<string, boolean> = {};
      r.cards?.forEach((c) => {
        if (c.card_id) m[c.card_id] = true;
      });
      initSel[r.id] = m;
    });
    setCardSel(initSel);
    setPending(rows);
    setLoadingPending(false);
  }

  async function loadBlocked() {
    setLoadingBlocked(true);
    const { data, error } = await supabase.rpc("admin_list_blocked");
    if (error) setToolMsg(error.message);
    setBlocked((data as BlockedRow[]) ?? []);
    setLoadingBlocked(false);
  }

  async function loadScans() {
    setLoadingScans(true);
    const { data, error } = await supabase.rpc("admin_scan_events", { p_limit: 200 });
    if (error) setToolMsg(error.message);
    setScans((data as ScanRow[]) ?? []);
    setLoadingScans(false);
  }

  async function loadRecent() {
    setLoadingRecent(true);
    const { data, error } = await supabase.rpc("admin_recent_credited", { p_limit: 25 });
    if (error) setToolMsg(error.message);
    setRecent((data as RecentRow[]) ?? []);
    setLoadingRecent(false);
  }

  /* ---- Selection helpers (redemptions) ---- */
  function toggleRed(id: string) {
    setSelectedReds((s) => ({ ...s, [id]: !s[id] }));
  }
  function selectAllUserReds(userId: string) {
    const next = { ...selectedReds };
    pending
      .filter((r) => r.user_id === userId)
      .forEach((r) => {
        next[r.id] = true;
      });
    setSelectedReds(next);
  }
  function clearRedSelection() {
    setSelectedReds({});
  }

  /* ---- Per-card selection helpers ---- */
  function toggleCard(redId: string, cardId: string) {
    setCardSel((map) => ({
      ...map,
      [redId]: { ...(map[redId] || {}), [cardId]: !(map[redId]?.[cardId]) },
    }));
  }
  function selectAllCards(redId: string, cards: PendingCard[]) {
    const next: Record<string, boolean> = {};
    cards.forEach((c) => {
      if (c.card_id) next[c.card_id] = true;
    });
    setCardSel((map) => ({ ...map, [redId]: next }));
  }
  function selectNoneCards(redId: string) {
    setCardSel((map) => ({ ...map, [redId]: {} }));
  }

  function selectedSummary(red: PendingRedemption) {
    const m = cardSel[red.id] || {};
    let count = 0,
      total = 0;
    for (const c of red.cards || []) {
      if (c.card_id && m[c.card_id]) {
        count++;
        total += c.time_value ?? 0;
      }
    }
    return { count, total };
  }

  /* ---- Bulk approve selected redemptions with suggested totals ---- */
  async function approveSelectedSuggested() {
    const items = pending.filter((r) => selectedReds[r.id]);
    if (items.length === 0) {
      setToolMsg("Select at least one redemption.");
      return;
    }

    const grandTotal = items.reduce((sum, it) => sum + (it.total_time_value || 0), 0);
    const proceed = window.confirm(
      `Approve ${items.length} redemption(s) with their suggested totals?\n\n` +
        items
          .map(
            (it) =>
              `${(it.email ?? it.user_id).slice(0, 40)} — ${it.card_count} card(s), TIME ${it.total_time_value}`
          )
          .join("\n") +
        `\n\nGrand total: ${grandTotal}`
    );
    if (!proceed) return;

    const ref = window.prompt("External reference / note for all (optional)") || null;

    for (const it of items) {
      const allIds = (it.cards || []).map((c) => c.card_id!).filter(Boolean);
      const { error } = await supabase.rpc("admin_credit_selected_cards", {
        p_source_redemption_id: it.id,
        p_selected_card_ids: allIds,
        p_ref: ref,
        p_amount_override: null,
      });
      if (error) {
        setToolMsg(error.message);
        return;
      }
    }

    setToolMsg(
      `✅ Credited ${items.length} redemption(s) using suggested totals (grand total ${grandTotal}).`
    );
    await loadPending();
    await loadRecent();
  }

  /* ---- Finalize a single redemption: credit selected, leave others pending ---- */
  async function finalizeRedemption(red: PendingRedemption) {
    const m = cardSel[red.id] || {};
    const selectedIds = Object.entries(m)
      .filter(([, v]) => v)
      .map(([id]) => id);
    if (selectedIds.length === 0) {
      setToolMsg("Select at least one card to credit.");
      return;
    }

    // Compute suggested TIME for the checked cards
    let suggested = 0;
    for (const c of red.cards || []) {
      if (c.card_id && m[c.card_id]) suggested += c.time_value ?? 0;
    }

    const ref =
      window.prompt(
        `Credit ${selectedIds.length} card(s) for TIME ${suggested}. Add an external reference / note (optional):`
      ) || null;

    const { data, error } = await supabase.rpc("admin_credit_selected_cards", {
      p_source_redemption_id: red.id,
      p_selected_card_ids: selectedIds,
      p_ref: ref,
      p_amount_override: null,
    });

    if (error) {
      setToolMsg(error.message);
      return;
    }

    const newId = data?.[0]?.new_redemption_id as string | undefined;
    if (newId) {
      const receiptUrl = `${window.location.origin}/receipt/${newId}`;
      setLastReceiptUrl(receiptUrl);
      try {
        await navigator.clipboard.writeText(receiptUrl);
        alert(`Credited.\nReceipt link copied to clipboard:\n${receiptUrl}`);
      } catch {
        alert(`Credited.\nReceipt:\n${receiptUrl}`);
      }
    } else {
      setToolMsg("Credited, but no receipt id returned.");
    }

    await loadPending();
    await loadRecent();
  }

  async function rejectAll(red: PendingRedemption) {
    const reason = window.prompt("Reason (optional)") || null;
    // Set the header to rejected
    const { error: e1 } = await supabase
      .from("redemptions")
      .update({
        status: "rejected",
        admin_notes: reason,
        credited_amount: null,
        credited_at: null,
        credited_by: null,
      })
      .eq("id", red.id);
    if (e1) {
      setToolMsg(e1.message);
      return;
    }

    // Mark all (still pending) cards as rejected
    const { error: e2 } = await supabase
      .from("redemption_cards")
      .update({ decision: "rejected", decided_at: new Date().toISOString() })
      .eq("redemption_id", red.id)
      .eq("decision", "pending");
    if (e2) {
      setToolMsg(e2.message);
      return;
    }

    await loadPending();
  }

  /* ---- Group pending by user_id ---- */
  const pendingGroups = useMemo<Record<string, PendingRedemption[]>>(() => {
    const map: Record<string, PendingRedemption[]> = {};
    for (const r of pending) {
      const key = r.user_id;
      if (!map[key]) map[key] = [];
      map[key].push(r);
    }
    return map;
  }, [pending]);

  /* ---- Apply outcome filter to scans (DataTable will handle search/sort) ---- */
  const scansForTable = useMemo<ScanRowUI[]>(() => {
    const filtered =
      scanOutcome === "all"
        ? scans
        : scans.filter((s) => s.outcome === scanOutcome);
    // shape fits DataTable columns
    return filtered as unknown as ScanRowUI[];
  }, [scans, scanOutcome]);

  /* ---- Map recent to CreditedRowUI, add placeholders for missing fields ---- */
  const recentForTable = useMemo<CreditedRowUI[]>(() => {
    return (recent as any[]).map((r) => ({
      ...r,
      card_code: (r as any).card_code ?? "—", // until RPC returns per-card codes
      credited_by: (r as any).credited_by ?? "—",
    })) as CreditedRowUI[];
  }, [recent]);

  if (isAdmin === null) return <div className="p-6">Loading…</div>;
  if (isAdmin === false) return <div className="p-6">Not authorized.</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <div className="flex gap-2">
          <Link to="/admin/qr" className="border rounded px-3 py-1">
            QR Generator
          </Link>
          <button
            onClick={() => {
              loadPending();
              loadScans();
              loadRecent();
              loadBlocked();
            }}
            className="border rounded px-3 py-1"
          >
            Refresh
          </button>
        </div>
      </div>

      {toolMsg && (
        <div className="text-sm px-3 py-2 rounded bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200">
          {toolMsg}
        </div>
      )}

      {lastReceiptUrl && (
        <div className="text-sm px-3 py-2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200 flex items-center gap-3">
          <span>Receipt ready:</span>
          <a href={lastReceiptUrl} target="_blank" rel="noreferrer" className="underline">
            Open receipt
          </a>
          <button
            onClick={() => navigator.clipboard.writeText(lastReceiptUrl)}
            className="border rounded px-2 py-0.5 text-xs"
          >
            Copy link
          </button>
          <button onClick={() => setLastReceiptUrl(null)} className="border rounded px-2 py-0.5 text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* ---------- Pending Redemptions (grouped by user) ---------- */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Pending Redemptions</h2>
          <div className="flex items-center gap-2">
            <button onClick={approveSelectedSuggested} className="border rounded px-3 py-1">
              Approve Selected (suggested totals)
            </button>
            <button onClick={clearRedSelection} className="border rounded px-3 py-1">
              Clear Selection
            </button>
          </div>
        </div>

        {loadingPending ? (
          <div>Loading pending…</div>
        ) : pending.length === 0 ? (
          <div className="opacity-70">No pending redemptions.</div>
        ) : (
          Object.entries(pendingGroups).map(([userId, reds]) => {
            const selectedCount = reds.filter((r) => selectedReds[r.id]).length;
            const email = reds[0]?.email ?? null;

            return (
              <div key={userId} className="border rounded-xl p-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                  <div>
                    <div className="font-medium">User: {email ?? userId}</div>
                    <div className="text-xs opacity-70">Redemptions: {reds.length}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => selectAllUserReds(userId)}
                      className="border rounded px-3 py-1 text-sm"
                    >
                      Select All ({reds.length})
                    </button>
                    {selectedCount > 0 && (
                      <div className="text-xs opacity-80">Selected: {selectedCount}</div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {reds.map((r) => {
                    const m = cardSel[r.id] || {};
                    const { count, total } = selectedSummary(r);
                    return (
                      <div key={r.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={!!selectedReds[r.id]}
                              onChange={() => toggleRed(r.id)}
                            />
                            <span className="font-medium">
                              Redemption <span className="opacity-70">{r.id.slice(0, 8)}…</span>
                              {" · "}
                              <span className="opacity-80">{r.email ?? r.user_id}</span>
                            </span>
                          </label>
                          <div className="text-xs opacity-70">
                            {r.card_count} card(s) • Suggested TIME: <b>{r.total_time_value}</b> •{" "}
                            Submitted {new Date(r.submitted_at).toLocaleString()}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs mb-2">
                          <button
                            onClick={() => selectAllCards(r.id, r.cards)}
                            className="border rounded px-2 py-0.5"
                          >
                            Select All Cards
                          </button>
                          <button
                            onClick={() => selectNoneCards(r.id)}
                            className="border rounded px-2 py-0.5"
                          >
                            Select None
                          </button>
                          <div className="opacity-80">
                            Selected: <b>{count}</b> • Selected TIME: <b>{total}</b>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {r.cards?.map((c) => {
                            const checked = !!m[c.card_id || ""];
                            return (
                              <label
                                key={c.card_id}
                                className={`border rounded-lg overflow-hidden block ${
                                  checked ? "ring-2 ring-emerald-500" : ""
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  className="hidden"
                                  checked={checked}
                                  onChange={() => c.card_id && toggleCard(r.id, c.card_id)}
                                />
                                {c.image_url && (
                                  <img
                                    src={c.image_url}
                                    alt={c.name ?? "Card"}
                                    className="w-full aspect-[3/4] object-cover"
                                  />
                                )}
                                <div className="p-2 text-sm">
                                  <div className="font-medium truncate">{c.name ?? "—"}</div>
                                  <div className="opacity-70">
                                    {c.era ?? "—"} • {c.suit ?? "—"} {c.rank ?? "—"}
                                  </div>
                                  <div className="text-xs opacity-60">
                                    Rarity: {c.rarity ?? "—"} · Value: {c.trader_value ?? "—"} · TIME:{" "}
                                    {c.time_value ?? 0}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>

                        <div className="flex gap-2 mt-3">
                          <Link
                            to={`/receipt/${r.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="border rounded px-3 py-1"
                          >
                            View receipt
                          </Link>
                          <button
                            onClick={() => finalizeRedemption(r)}
                            className="border rounded px-3 py-1"
                          >
                            Credit selected (leave others pending)
                          </button>
                          <button onClick={() => rejectAll(r)} className="border rounded px-3 py-1">
                            Reject all
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* ---------- Credited Log (virtualized) ---------- */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Credited Log</h2>
          <button onClick={loadRecent} className="border rounded px-3 py-1 text-sm">
            Refresh
          </button>
        </div>
        {loadingRecent ? (
          <div>Loading…</div>
        ) : (
          <DataTable
            title="Credited Log"
            data={recentForTable}
            columns={CREDITED_COLS}
            totalCount={recent.length}
            heightPx={560}
            csvFilename="credited-log.csv"
          />
        )}
      </section>

      {/* ---------- Scan Log (virtualized, outcome filter) ---------- */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Scan Log (latest 200)</h2>
          <button onClick={loadScans} className="border rounded px-3 py-1 text-sm">
            Refresh
          </button>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <label className="text-sm">Outcome:</label>
          <select
            value={scanOutcome}
            onChange={(e) => setScanOutcome(e.target.value as any)}
            className="border rounded px-2 py-1"
          >
            <option value="all">All outcomes</option>
            <option value="claimed">claimed</option>
            <option value="already_owner">already_owner</option>
            <option value="owned_by_other">owned_by_other</option>
            <option value="not_found">not_found</option>
            <option value="blocked">blocked</option>
            <option value="error">error</option>
          </select>
        </div>

        {loadingScans ? (
          <div>Loading…</div>
        ) : (
          <DataTable
            title="Scan Log"
            data={scansForTable}
            columns={SCAN_COLS}
            totalCount={scans.length}
            heightPx={560}
            csvFilename="scan-log.csv"
          />
        )}
      </section>

      {/* ---------- Blocked users ---------- */}
      <section className="border rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Blocked users</h2>
          <button onClick={loadBlocked} className="border rounded px-3 py-1 text-sm">
            Refresh list
          </button>
        </div>

        <div className="mb-3">
          <BlockTool onMsg={setToolMsg} onChanged={loadBlocked} />
        </div>

        {loadingBlocked ? (
          <div className="opacity-70 text-sm">Loading blocked users…</div>
        ) : blocked.length === 0 ? (
          <div className="opacity-70 text-sm">No one is blocked.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Reason</th>
                  <th className="py-2 pr-3">Blocked at</th>
                  <th className="py-2 pr-3">Blocked by</th>
                  <th className="py-2 pr-0"></th>
                </tr>
              </thead>
              <tbody>
                {blocked.map((b) => (
                  <tr key={b.user_id} className="border-b last:border-b-0">
                    <td className="py-2 pr-3">{b.email ?? "—"}</td>
                    <td className="py-2 pr-3">{b.reason ?? "—"}</td>
                    <td className="py-2 pr-3">{new Date(b.blocked_at).toLocaleString()}</td>
                    <td className="py-2 pr-3">{b.blocked_by_email ?? "—"}</td>
                    <td className="py-2 pr-0">
                      {b.email && (
                        <button
                          onClick={async () => {
                            const { data, error } = await supabase.rpc(
                              "admin_unblock_user_by_email",
                              { p_email: b.email! }
                            );
                            if (error) setToolMsg(error.message);
                            else if (data?.ok) {
                              setToolMsg(`✅ Unblocked ${b.email}`);
                              await loadBlocked();
                            }
                          }}
                          className="border rounded px-2 py-1 text-xs"
                        >
                          Unblock
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

/* ---------------- Admin helper: Block / Unblock ---------------- */
function BlockTool({
  onMsg,
  onChanged,
}: {
  onMsg: (m: string | null) => void;
  onChanged: () => void;
}) {
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function doBlock() {
    onMsg(null);
    const e = email.trim();
    if (!e) {
      onMsg("Enter an email.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.rpc("admin_block_user_by_email", {
      p_email: e,
      p_reason: reason.trim() || null,
    });
    setBusy(false);
    if (error) {
      onMsg(error.message);
      return;
    }
    if (data?.ok) {
      onMsg(`✅ Blocked ${e}.`);
      onChanged();
    } else if (data?.error === "not_found") {
      onMsg(`❌ No auth user found with email: ${e}`);
    } else if (data?.error === "forbidden") {
      onMsg("❌ You are not authorized as admin.");
    } else {
      onMsg("Could not block user.");
    }
  }

  async function doUnblock() {
    onMsg(null);
    const e = email.trim();
    if (!e) {
      onMsg("Enter an email.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.rpc("admin_unblock_user_by_email", {
      p_email: e,
    });
    setBusy(false);
    if (error) {
      onMsg(error.message);
      return;
    }
    if (data?.ok) {
      onMsg(`✅ Unblocked ${e}.`);
      onChanged();
    } else if (data?.error === "not_found") {
      onMsg(`❌ No auth user found with email: ${e}`);
    } else if (data?.error === "forbidden") {
      onMsg("❌ You are not authorized as admin.");
    } else {
      onMsg("Could not unblock user.");
    }
  }

  return (
    <div className="flex flex-col md:flex-row md:items-center gap-2">
      <div className="text-sm font-medium whitespace-nowrap">Block / Unblock</div>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="user@email.com"
        className="border rounded px-2 py-1 w-full md:w-64"
      />
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (optional)"
        className="border rounded px-2 py-1 w-full md:w-64"
      />
      <div className="flex gap-2">
        <button onClick={doBlock} disabled={busy} className="border rounded px-3 py-1 text-sm">
          {busy ? "Blocking…" : "Block"}
        </button>
        <button onClick={doUnblock} disabled={busy} className="border rounded px-3 py-1 text-sm">
          {busy ? "Unblocking…" : "Unblock"}
        </button>
      </div>
    </div>
  );
}
