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

/* ===========================
   Small helpers (inline)
=========================== */
type SortDir = "asc" | "desc";

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
function exportToCsv(opts: { filename: string; headers: string[]; rows: (string|number|boolean|null|undefined)[][] }) {
  const { filename, headers, rows } = opts;
  const escape = (v:any) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
  };
  const csv = [headers.map(escape).join(","), ...rows.map(r=>r.map(escape).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename.endsWith(".csv")?filename:`${filename}.csv`; a.click();
  URL.revokeObjectURL(url);
}
function clsx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

/* ===========================
   Types
=========================== */
type ScanLogRow = {
  id: string;
  cardId: string;
  cardCode: string;
  userId: string;
  userEmail: string;
  scannedAt: string; // ISO
  source: "QR" | "manual" | "bulk";
};
type CreditedLogRow = {
  id: string;
  cardId: string;
  cardCode: string; // REQUIRED visible “code” column
  userId: string;
  userEmail: string;
  creditedAt: string; // ISO
  creditedBy: string; // email or id
  amountTIME: number;
};

/* ===========================
   Mock data (inline)
=========================== */
// deterministic-ish random
let seed = 42;
function rnd() { seed ^= seed<<13; seed ^= seed>>17; seed ^= seed<<5; return Math.abs(seed)/0x7fffffff; }
function pick<T>(arr: T[]) { return arr[Math.floor(rnd()*arr.length)]; }
function id(prefix: string) { return `${prefix}_${Math.floor(rnd()*1e9).toString(36)}`; }
function isoWithinDays(days:number) {
  const now = Date.now();
  const delta = Math.floor(rnd()*days*24*60*60*1000);
  return new Date(now - delta).toISOString();
}
const ERAS = ["Genesis", "Classic", "Modern", "Futures"];
const RARITIES = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];
const SOURCES: ("QR" | "manual" | "bulk")[] = ["QR", "manual", "bulk"];

const USERS = Array.from({length:120}).map((_,i)=>({ id: id("u"), email: `user${i+1}@example.com` }));
const CARDS = Array.from({length:2000}).map(()=>({
  id: id("card"),
  code: `T${Math.floor(rnd()*1e8).toString(36).toUpperCase()}`,
  era: pick(ERAS),
  title: `Trader #${Math.floor(rnd()*9000)+1000}`,
  rarity: pick(RARITIES),
}));

const SCANS: ScanLogRow[] = Array.from({length:1600}).map(()=> {
  const u = pick(USERS); const c = pick(CARDS);
  return {
    id: id("scan"),
    cardId: c.id,
    cardCode: c.code,
    userId: u.id,
    userEmail: u.email,
    scannedAt: isoWithinDays(120),
    source: pick(SOURCES),
  };
});

const CREDITED: CreditedLogRow[] = Array.from({length:1100}).map(()=> {
  const u = pick(USERS); const c = pick(CARDS);
  const amt = [1,2,3,5,8][Math.floor(rnd()*5)];
  return {
    id: id("cred"),
    cardId: c.id,
    cardCode: c.code,
    userId: u.id,
    userEmail: u.email,
    creditedAt: isoWithinDays(120),
    creditedBy: pick(USERS).email,
    amountTIME: amt,
  };
});

/* ===========================
   Generic Virtualized Table
=========================== */
type DataTableProps<TData> = {
  title: string;
  data: TData[];
  columns: ColumnDef<TData, any>[];
  totalCount: number;
  heightPx?: number;
  csvFilename: string;
};
function DataTable<TData>({
  title, data, columns, totalCount, heightPx = 560, csvFilename
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [global, setGlobal] = React.useState("");
  const debounced = useDebouncedValue(global, 300);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const globalFilterFn = React.useCallback((row:any, _colId:string, filterValue:string) => {
    if (!filterValue) return true;
    const q = String(filterValue).toLowerCase();
    const cells = row.getVisibleCells?.() || [];
    for (const c of cells) {
      const v = c.getValue?.();
      if (v == null) continue;
      const s = typeof v === "string" ? v : typeof v === "number" ? v.toString() : JSON.stringify(v);
      if (s.toLowerCase().includes(q)) return true;
    }
    return false;
  }, []);

  // selection column
  const selectCol: ColumnDef<TData, any> = React.useMemo(()=>({
    id: "_select",
    enableSorting: false,
    enableHiding: false,
    header: ({ table }) => (
      <input
        type="checkbox"
        aria-label="Select all"
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() ? undefined : false)}
        onChange={(e)=>table.toggleAllPageRowsSelected(e.currentTarget.checked)}
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        aria-label="Select row"
        checked={row.getIsSelected()}
        onChange={(e)=>row.toggleSelected(e.currentTarget.checked)}
      />
    ),
    size: 40,
  }),[]);

  const table = useReactTable({
    data,
    columns: React.useMemo(()=> [selectCol, ...columns], [columns, selectCol]),
    state: { sorting, globalFilter: debounced, columnVisibility, rowSelection },
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
    getScrollElement: ()=> parentRef.current,
    estimateSize: ()=> 56,
    overscan: 8,
  });
  const vItems = rowVirtualizer.getVirtualItems();
  const visibleCols = table.getVisibleLeafColumns().filter(c=>c.id !== "_select");
  const filteredCount = rows.length;

  function handleExportCSV() {
    exportToCsv({
      filename: csvFilename,
      headers: visibleCols.map(c => c.id || (c.columnDef as any).accessorKey?.toString() || "col"),
      rows: rows.map(r => visibleCols.map(c => r.getValue(c.id ?? ((c.columnDef as any).accessorKey as string)))),
    });
  }

  return (
    <div className="w-full border rounded-xl">
      {/* panel header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between p-3 border-b">
        <div className="font-semibold">
          {title} — {totalCount.toLocaleString()}
          <span className="text-xs opacity-70 ml-2">(filtered: {filteredCount.toLocaleString()})</span>
        </div>
        <div className="flex gap-2 items-center">
          <input
            value={global}
            onChange={(e)=>setGlobal(e.target.value)}
            placeholder="Search visible columns…"
            className="h-9 w-[220px] border rounded px-2"
          />
          {/* Column visibility menu (simple <details>) */}
          <details className="relative">
            <summary className="h-9 px-3 border rounded cursor-pointer list-none select-none">Columns</summary>
            <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-zinc-900 border rounded p-1 shadow">
              {table.getAllLeafColumns().filter(c=>c.id!=="_select").map(col => (
                <label key={col.id} className="flex items-center gap-2 px-2 py-1 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={col.getIsVisible()}
                    onChange={(e)=>col.toggleVisibility(e.currentTarget.checked)}
                  />
                  <span className="capitalize">{col.id}</span>
                </label>
              ))}
            </div>
          </details>
          <button className="h-9 px-3 border rounded" onClick={handleExportCSV}>Export CSV</button>
          <button className="h-9 px-3 border rounded opacity-60 cursor-not-allowed" title="placeholder">
            Bulk actions (…)
          </button>
        </div>
      </div>

      {/* table container with sticky header + internal scroll */}
      <div ref={parentRef} className="relative overflow-auto" style={{ height: `${heightPx}px` }}>
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead className="sticky top-0 z-10 bg-background">
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id} className="border-b">
                {hg.headers.map(h => {
                  const canSort = h.column.getCanSort();
                  const sortDir = h.column.getIsSorted() as false | "asc" | "desc";
                  return (
                    <th
                      key={h.id}
                      className={clsx("text-left font-medium py-2 px-2 border-b bg-background",
                        canSort && "cursor-pointer select-none")}
                      onClick={canSort ? h.column.getToggleSortingHandler() : undefined}
                      aria-sort={sortDir === "asc" ? "ascending" : sortDir === "desc" ? "descending" : "none"}
                      style={{ width: h.getSize() }}
                    >
                      {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                      {canSort && <span className="ml-1 opacity-70">{sortDir === "asc" ? "▲" : sortDir === "desc" ? "▼" : "↕"}</span>}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          <tbody>
            <tr><td colSpan={table.getAllLeafColumns().length} className="p-0">
              <div className="relative" style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}>
                {vItems.map(vi => {
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
                            {row.getVisibleCells().map(cell => (
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
            </td></tr>
          </tbody>
        </table>
      </div>

      <div className="p-2 text-xs opacity-70 border-t">
        Selected rows: {Object.keys(rowSelection).length}
      </div>
    </div>
  );
}

/* ===========================
   Column defs + Panels
=========================== */
function dateCell(iso: string) {
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

const SCAN_COLS: ColumnDef<ScanLogRow>[] = [
  { id: "scannedAt", accessorKey: "scannedAt", header: "scannedAt",
    cell: ({ row }) => <span className="font-medium">{dateCell(row.original.scannedAt)}</span>,
    sortingFn: "alphanumeric" },
  { id: "cardCode", accessorKey: "cardCode", header: "cardCode" },
  { id: "userEmail", accessorKey: "userEmail", header: "userEmail" },
  { id: "userId", accessorKey: "userId", header: "userId" },
  { id: "source", accessorKey: "source", header: "source" },
];

const CREDITED_COLS: ColumnDef<CreditedLogRow>[] = [
  { id: "creditedAt", accessorKey: "creditedAt", header: "creditedAt",
    cell: ({ row }) => <span className="font-medium">{dateCell(row.original.creditedAt)}</span>,
    sortingFn: "alphanumeric" },
  // REQUIRED: “code” column shown, searchable, sortable
  { id: "cardCode", accessorKey: "cardCode", header: "cardCode" },
  { id: "userEmail", accessorKey: "userEmail", header: "userEmail" },
  { id: "userId", accessorKey: "userId", header: "userId" },
  { id: "creditedBy", accessorKey: "creditedBy", header: "creditedBy" },
  { id: "amountTIME", accessorKey: "amountTIME", header: "amountTIME",
    cell: ({ getValue }) => <span className="tabular-nums">{getValue<number>()}</span>,
    sortingFn: "basic" },
];

/* ===========================
   Single-page Admin Logs
=========================== */
export default function AdminLogs() {
  // Optional global filters (simple selects to avoid extra UI deps)
  const [era, setEra] = React.useState<string>("all");
  const [rarity, setRarity] = React.useState<string>("all");

  // panel searches (debounced)
  const [scanSearch, setScanSearch] = React.useState("");
  const [credSearch, setCredSearch] = React.useState("");
  const scanQ = useDebouncedValue(scanSearch, 300);
  const credQ = useDebouncedValue(credSearch, 300);

  // derived filtered datasets (client-side)
  const scanRows = React.useMemo(()=> {
    const eraSet = era==="all" ? null : new Set(CARDS.filter(c=>c.era===era).map(c=>c.id));
    const rarSet = rarity==="all" ? null : new Set(CARDS.filter(c=>c.rarity===rarity).map(c=>c.id));
    let rows = SCANS.filter(r => (!eraSet || eraSet.has(r.cardId)) && (!rarSet || rarSet.has(r.cardId)));
    if (scanQ) {
      const q = scanQ.toLowerCase();
      rows = rows.filter(r =>
        r.cardCode.toLowerCase().includes(q) ||
        r.userEmail.toLowerCase().includes(q) ||
        r.userId.toLowerCase().includes(q) ||
        r.source.toLowerCase().includes(q) ||
        r.scannedAt.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [era, rarity, scanQ]);

  const credRows = React.useMemo(()=> {
    const eraSet = era==="all" ? null : new Set(CARDS.filter(c=>c.era===era).map(c=>c.id));
    const rarSet = rarity==="all" ? null : new Set(CARDS.filter(c=>c.rarity===rarity).map(c=>c.id));
    let rows = CREDITED.filter(r => (!eraSet || eraSet.has(r.cardId)) && (!rarSet || rarSet.has(r.cardId)));
    if (credQ) {
      const q = credQ.toLowerCase();
      rows = rows.filter(r =>
        r.cardCode.toLowerCase().includes(q) ||
        r.userEmail.toLowerCase().includes(q) ||
        r.userId.toLowerCase().includes(q) ||
        r.creditedBy.toLowerCase().includes(q) ||
        String(r.amountTIME).includes(q) ||
        r.creditedAt.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [era, rarity, credQ]);

  // totals (from underlying datasets)
  const stats = React.useMemo(()=> ({
    totalCards: CARDS.length,
    scannedTotal: SCANS.length,
    creditedTotal: CREDITED.length,
  }), []);

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header / Controls */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin — Cards & Logs</h1>
        <button className="border rounded px-3 py-1" onClick={()=> { /* mock page; nothing to refetch */ }}>
          Refresh
        </button>
      </div>

      {/* Global filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select value={era} onChange={(e)=>setEra(e.target.value)} className="border rounded h-9 px-2">
          <option value="all">All Eras</option>
          {ERAS.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <select value={rarity} onChange={(e)=>setRarity(e.target.value)} className="border rounded h-9 px-2">
          <option value="all">All Rarities</option>
          {RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <button className="ml-auto border rounded h-9 px-3" onClick={()=>{ setEra("all"); setRarity("all"); }}>
          Clear filters
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid md:grid-cols-3 gap-3">
        <Stat label="Total Cards" value={stats.totalCards} />
        <Stat label="Scanned Total" value={stats.scannedTotal} />
        <Stat label="Credited Total" value={stats.creditedTotal} />
      </div>

      {/* Scan Log panel */}
      <div className="border rounded-xl">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="font-semibold">Scan Log — {SCANS.length.toLocaleString()}</div>
          <input
            className="h-9 w-[260px] border rounded px-2"
            placeholder="Search scan log…"
            value={scanSearch}
            onChange={(e)=>setScanSearch(e.target.value)}
          />
        </div>
        <div className="p-3">
          <DataTable
            title="Scan Log"
            data={scanRows}
            columns={SCAN_COLS}
            totalCount={SCANS.length}
            heightPx={560}
            csvFilename="scan-log.csv"
          />
        </div>
      </div>

      {/* Credited Log panel */}
      <div className="border rounded-xl">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="font-semibold">Credited Log — {CREDITED.length.toLocaleString()}</div>
          <input
            className="h-9 w-[260px] border rounded px-2"
            placeholder="Search credited log…"
            value={credSearch}
            onChange={(e)=>setCredSearch(e.target.value)}
          />
        </div>
        <div className="p-3">
          <DataTable
            title="Credited Log"
            data={credRows}
            columns={CREDITED_COLS}
            totalCount={CREDITED.length}
            heightPx={560}
            csvFilename="credited-log.csv"
          />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border rounded-xl p-4">
      <div className="text-xs opacity-70">{label}</div>
      <div className="text-2xl font-semibold tabular-nums">{value.toLocaleString()}</div>
    </div>
  );
}
