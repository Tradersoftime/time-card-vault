// src/pages/AdminQR.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import QRCode from "qrcode";
import JSZip from "jszip";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ChevronRight, Copy, Download, Edit, Eye, Image as ImageIcon, Palette, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ImageLibraryView } from '@/components/ImageLibraryView';

/* ---------------- Types ---------------- */

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
  current_target?: string | null; // dynamic redirect (preferred)
  redirect_url?: string | null;   // legacy redirect (if your table uses this)
  status: string | null;
  created_at: string;
  qr_dark?: string | null;
  qr_light?: string | null;
};

type CardMinimal = {
  code: string;
  name?: string | null;
  is_active?: boolean | null;
  current_target?: string | null;
  redirect_url?: string | null;
  qr_dark?: string | null;
  qr_light?: string | null;
};

type CardUpsert = {
  code: string;
  name?: string | null;
  suit?: string | null;
  rank?: string | null;
  era?: string | null;
  rarity?: string | null;
  trader_value?: string | null;
  time_value?: number | null;
  image_url?: string | null;
  description?: string | null;
  current_target?: string | null;
  status?: string | null;
  is_active?: boolean;
  qr_dark?: string | null;
  qr_light?: string | null;
};

type CsvRow = Partial<CardUpsert> & { code?: string | null; image_code?: string | null };

type ImageMapping = {
  code: string;
  url: string;
  filename: string;
};

type QrColors = {
  dark: string;
  light: string;
};

/* ---------------- RecentCardsPanel ---------------- */

function RecentCardsPanel() {
  const [rows, setRows] = useState<CardRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("cards")
      .select(
        "id,code,name,suit,rank,era,rarity,trader_value,time_value,image_url,current_target,redirect_url,status,created_at,qr_dark,qr_light"
      )
      .order("created_at", { ascending: false })
      .limit(25);

    if (!error) setRows((data as CardRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">Recent cards (latest 25)</h3>
        <button onClick={load} className="border rounded px-3 py-1 text-sm">
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="opacity-70 text-sm">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="opacity-70 text-sm">No cards yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr className="text-left">
                <th className="py-2 pr-3">Created</th>
                <th className="py-2 pr-3">Code</th>
                <th className="py-2 pr-3">Trader</th>
                <th className="py-2 pr-3">Era</th>
                <th className="py-2 pr-3">Suit</th>
                <th className="py-2 pr-3">Rank</th>
                <th className="py-2 pr-3">Rarity</th>
                <th className="py-2 pr-3">Value</th>
                <th className="py-2 pr-3">TIME</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">QR Colors</th>
                <th className="py-2 pr-3">Redirect</th>
                <th className="py-2 pr-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const redirect = r.current_target ?? r.redirect_url ?? null;
                return (
                  <tr key={r.id} className="border-b last:border-b-0 align-top">
                    <td className="py-2 pr-3">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="py-2 pr-3 font-mono">{r.code}</td>
                    <td className="py-2 pr-3">{r.name ?? "—"}</td>
                    <td className="py-2 pr-3">{r.era ?? "—"}</td>
                    <td className="py-2 pr-3">{r.suit ?? "—"}</td>
                    <td className="py-2 pr-3">{r.rank ?? "—"}</td>
                    <td className="py-2 pr-3">{r.rarity ?? "—"}</td>
                    <td className="py-2 pr-3">{r.trader_value ?? "—"}</td>
                    <td className="py-2 pr-3">{r.time_value ?? 0}</td>
                    <td className="py-2 pr-3">{r.status ?? "—"}</td>
                    <td className="py-2 pr-3">
                      {(r.qr_dark || r.qr_light) ? (
                        <div className="flex gap-1">
                          {r.qr_dark && (
                            <div 
                              className="w-4 h-4 border border-gray-300 rounded"
                              style={{ backgroundColor: r.qr_dark }}
                              title={`Dark: ${r.qr_dark}`}
                            />
                          )}
                          {r.qr_light && (
                            <div 
                              className="w-4 h-4 border border-gray-300 rounded"
                              style={{ backgroundColor: r.qr_light }}
                              title={`Light: ${r.qr_light}`}
                            />
                          )}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2 pr-3 max-w-[280px] truncate">
                      {redirect ? (
                        <a className="underline" href={redirect} target="_blank" rel="noreferrer">
                          {redirect}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex gap-2">
                        <a
                          className="border rounded px-2 py-0.5 text-xs"
                          href={`/claim/${encodeURIComponent(r.code)}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open /claim/{r.code}
                        </a>
                        {r.image_url && (
                          <a
                            className="border rounded px-2 py-0.5 text-xs"
                            href={r.image_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Image
                          </a>
                        )}
                        <button
                          className="border rounded px-2 py-0.5 text-xs"
                          onClick={() => navigator.clipboard.writeText(r.code)}
                        >
                          Copy code
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ---------------- Page: AdminQR ---------------- */

export default function AdminQR() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // QR Color state with localStorage persistence
  const [qrDark, setQrDark] = useState("#000000");
  const [qrLight, setQrLight] = useState("#FFFFFF");
  const [qrDarkError, setQrDarkError] = useState("");
  const [qrLightError, setQrLightError] = useState("");

  // Single QR
  const [singleCode, setSingleCode] = useState("");
  const [singleLabel, setSingleLabel] = useState("");
  const [pngDataUrl, setPngDataUrl] = useState<string | null>(null);
  const [createdCardId, setCreatedCardId] = useState<string | null>(null);

  // Image Code Mapping
  const [imageMappings, setImageMappings] = useState<ImageMapping[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [showImageLibrary, setShowImageLibrary] = useState(false);

  // Edit redirect
  const [editCode, setEditCode] = useState("");
  const [editTarget, setEditTarget] = useState("");
  const [editFound, setEditFound] = useState<CardMinimal | null>(null);
  // which column to update for redirect (auto-detected on lookup)
  const [redirectField, setRedirectField] = useState<"current_target" | "redirect_url">("current_target");

  // CSV Import
  const [csvText, setCsvText] = useState("");
  const [csvRows, setCsvRows] = useState<CardUpsert[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [csvBusy, setCsvBusy] = useState(false);

  const baseUrl = useMemo(() => `${window.location.origin}/claim/`, []);

  // Load colors from localStorage on mount
  useEffect(() => {
    const savedDark = localStorage.getItem("qr_dark");
    const savedLight = localStorage.getItem("qr_light");
    if (savedDark) setQrDark(savedDark);
    if (savedLight) setQrLight(savedLight);
  }, []);

  // Save colors to localStorage when they change
  useEffect(() => {
    localStorage.setItem("qr_dark", qrDark);
  }, [qrDark]);

  useEffect(() => {
    localStorage.setItem("qr_light", qrLight);
  }, [qrLight]);

  const colorsValid = !qrDarkError && !qrLightError && isValidHex(qrDark) && isValidHex(qrLight);

  // Auto-refresh QR preview when colors change
  useEffect(() => {
    if (pngDataUrl && singleCode && colorsValid) {
      const refreshPreview = async () => {
        const url = baseUrl + encodeURIComponent(singleCode);
        const dataUrl = await toPNG(url, singleLabel || singleCode);
        setPngDataUrl(dataUrl);
      };
      refreshPreview();
    }
  }, [qrDark, qrLight, colorsValid, pngDataUrl, singleCode, singleLabel, baseUrl]);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) {
        setIsAdmin(false);
        return;
      }
      const { data } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", u.user.id)
        .maybeSingle();
      setIsAdmin(!!data);
    })();
  }, []);

  if (isAdmin === null) return (
    <div className="min-h-screen hero-gradient flex items-center justify-center p-6">
      <div className="glass-panel p-8 rounded-2xl text-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
        <div className="text-foreground">Loading QR generator...</div>
      </div>
    </div>
  );
  if (isAdmin === false) return (
    <div className="min-h-screen hero-gradient flex items-center justify-center p-6">
      <div className="glass-panel p-8 rounded-2xl text-center">
        <div className="text-destructive text-lg font-medium">Access Denied</div>
        <div className="text-muted-foreground mt-2">You are not authorized to access the QR generator.</div>
      </div>
    </div>
  );

  /* -------------- Helpers -------------- */

  function norm(s?: string | null) {
    return (s ?? "").trim();
  }

  function parseBool(v: any): boolean | undefined {
    if (v === undefined || v === null || v === "") return undefined;
    const s = String(v).trim().toLowerCase();
    if (["true", "t", "1", "yes", "y"].includes(s)) return true;
    if (["false", "f", "0", "no", "n"].includes(s)) return false;
    return undefined;
  }

  function randomCode(pref: string) {
    const block = () =>
      Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(2, 6);
    return `${pref}-${block()}-${block()}`;
  }

  // Color validation helpers
  function isValidHex(hex: string): boolean {
    return /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(hex);
  }

  function normalizeHex(hex: string): string {
    if (hex.length === 4) {
      // Convert #RGB to #RRGGBB
      return "#" + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    }
    return hex.toUpperCase();
  }

  function pickTextOn(bgHex: string): string {
    // Simple luminance calculation for text contrast
    const hex = bgHex.replace('#', '');
    const r = parseInt(hex.length === 3 ? hex[0] + hex[0] : hex.slice(0, 2), 16);
    const g = parseInt(hex.length === 3 ? hex[1] + hex[1] : hex.slice(2, 4), 16);
    const b = parseInt(hex.length === 3 ? hex[2] + hex[2] : hex.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? '#000000' : '#FFFFFF';
  }

  function handleColorChange(value: string, type: 'dark' | 'light') {
    if (type === 'dark') {
      setQrDark(value);
      if (!isValidHex(value)) {
        setQrDarkError("Invalid hex color format (#RGB or #RRGGBB)");
      } else {
        setQrDarkError("");
      }
    } else {
      setQrLight(value);
      if (!isValidHex(value)) {
        setQrLightError("Invalid hex color format (#RGB or #RRGGBB)");
      } else {
        setQrLightError("");
      }
    }
  }

  function resetColors() {
    setQrDark("#000000");
    setQrLight("#FFFFFF");
    setQrDarkError("");
    setQrLightError("");
  }

  // Refactored toPNG function with color support
  async function toPNG(data: string, label?: string, colors?: QrColors): Promise<string> {
    const qrColors = colors || { dark: qrDark, light: qrLight };
    
    const qrCanvas = document.createElement("canvas");
    await QRCode.toCanvas(qrCanvas, data, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 512,
      color: {
        dark: normalizeHex(qrColors.dark),
        light: normalizeHex(qrColors.light)
      }
    });

    if (!label) return qrCanvas.toDataURL("image/png");

    // Draw label onto taller canvas with background color
    const pad = 16;
    const fontPx = 32;
    const w = qrCanvas.width;
    const h = qrCanvas.height + pad + fontPx + pad;
    const out = document.createElement("canvas");
    out.width = w;
    out.height = h;
    const ctx = out.getContext("2d")!;
    
    // Fill entire background with light color
    ctx.fillStyle = normalizeHex(qrColors.light);
    ctx.fillRect(0, 0, w, h);
    
    // Draw QR code
    ctx.drawImage(qrCanvas, 0, 0);
    
    // Draw label with auto-contrast
    ctx.fillStyle = pickTextOn(qrColors.light);
    ctx.font = `${fontPx}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(label, w / 2, h - pad);
    
    return out.toDataURL("image/png");
  }

  async function downloadDataUrl(filename: string, dataUrl: string) {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  /* -------------- Single QR -------------- */

  async function buildSingle() {
    setMsg(null);
    const code = norm(singleCode);
    if (!code) {
      setMsg("Enter a card code.");
      return;
    }

    try {
      // Create draft card record
      const { data: existingCard } = await supabase
        .from("cards")
        .select("id")
        .eq("code", code)
        .maybeSingle();

      let cardId = existingCard?.id;

      if (!existingCard) {
        const { data: newCard, error } = await supabase
          .from("cards")
          .insert({
            code,
            name: singleLabel || code,
            suit: "Unknown",
            rank: "Unknown", 
            era: "Unknown",
            status: "unprinted",
            is_active: true,
            time_value: 0
          })
          .select("id")
          .single();

        if (error) {
          console.error('Database error creating card:', error);
          setMsg(`Error creating card: ${error.message}`);
          return;
        }
        cardId = newCard.id;
      }

      setCreatedCardId(cardId);
      const url = baseUrl + encodeURIComponent(code);
      const dataUrl = await toPNG(url, singleLabel || code);
      setPngDataUrl(dataUrl);
      setMsg("✅ QR code generated and draft card created!");
    } catch (error) {
      console.error('Unexpected error in buildSingle:', error);
      setMsg(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /* -------------- Image Code Mapping -------------- */

  async function handleImageUpload(files: FileList) {
    setUploadingImages(true);
    const timestamp = Date.now();
    const newMappings: ImageMapping[] = [];

    try {
      // Get the next available code number
      const { data: existingCodes } = await supabase
        .from('image_codes')
        .select('code')
        .order('created_at', { ascending: false })
        .limit(1);
      
      const lastCode = existingCodes?.[0]?.code || 'a0';
      const lastNumber = parseInt(lastCode.replace(/[a-z]/g, '')) || 0;
      let nextNumber = lastNumber + 1;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const extension = file.name.split('.').pop() || 'jpg';
        const imageCode = `a${nextNumber + i}`;
        const fileName = `batch-${timestamp}/${imageCode}.${extension}`;

        const { data, error } = await supabase.storage
          .from('card-images')
          .upload(fileName, file);

        if (error) {
          console.error('Upload error:', error);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('card-images')
          .getPublicUrl(fileName);

        // Store in database for persistence
        const { data: user } = await supabase.auth.getUser();
        const { error: dbError } = await supabase
          .from('image_codes')
          .insert({
            code: imageCode,
            storage_path: fileName,
            public_url: publicUrl,
            filename: file.name,
            created_by: user.user?.id
          });

        if (dbError) {
          console.error('Database error:', dbError);
          continue;
        }

        newMappings.push({
          code: imageCode,
          url: publicUrl,
          filename: file.name
        });
      }

      setImageMappings(prev => [...prev, ...newMappings]);
      setMsg(`✅ Uploaded ${newMappings.length} images with codes ${newMappings.map(m => m.code).join(', ')} and saved to database`);
    } catch (error) {
      setMsg('Error uploading images');
    } finally {
      setUploadingImages(false);
    }
  }

  function clearImageMappings() {
    setImageMappings([]);
    setMsg("Image mappings cleared.");
  }

  /* -------------- Edit redirect -------------- */

  async function lookupCode() {
    setMsg(null);
    const code = norm(editCode);
    if (!code) {
      setMsg("Enter a code to look up.");
      return;
    }
    // Try selecting both possible redirect columns; whichever exists will come back.
    const { data, error } = await supabase
      .from("cards")
      .select("code, is_active, name, current_target, redirect_url")
      .ilike("code", code)
      .maybeSingle();

    if (error) {
      setMsg(error.message);
      return;
    }

    if (!data) {
      setEditFound(null);
      setMsg("Not found.");
      return;
    }

    // Decide which column to use when saving
    if (data.current_target !== undefined) {
      setRedirectField("current_target");
      setEditTarget((data.current_target as string) || "");
    } else {
      setRedirectField("redirect_url");
      setEditTarget((data.redirect_url as string) || "");
    }

    setEditFound(data as CardMinimal);
  }

  async function saveRedirect() {
    setMsg(null);
    const code = norm(editCode);
    const target = norm(editTarget) || null;
    if (!code) {
      setMsg("Enter a code.");
      return;
    }

    // Build dynamic update based on detected field
    const updateObj: Record<string, any> = {};
    updateObj[redirectField] = target;

    const { error } = await supabase.from("cards").update(updateObj).ilike("code", code);
    if (error) {
      setMsg(error.message);
      return;
    }
    setMsg("✅ Updated redirect.");
  }

  /* -------------- CSV Import -------------- */

  function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setCsvText(""); // clear paste box
    setCsvErrors([]);
    Papa.parse<CsvRow>(f, {
      header: true,
      skipEmptyLines: true,
      complete: async (res) => {
        if (res.errors?.length) {
          setCsvErrors(res.errors.map((er) => `Row ${er.row}: ${er.message}`));
        }
        await ingestCsv(res.data);
      },
    });
    e.currentTarget.value = ""; // reset input
  }

  async function validateAndNormalize(rows: CsvRow[]): Promise<{ ok: CardUpsert[]; errors: string[] }> {
    const errors: string[] = [];
    const ok: CardUpsert[] = [];
    const seen = new Set<string>();

    for (let idx = 0; idx < rows.length; idx++) {
      const r = rows[idx];
      const line = idx + 2; // header = line 1
      const codeRaw = norm(r.code ?? "");
      if (!codeRaw) {
        errors.push(`Line ${line}: missing code`);
        return;
      }
      const code = codeRaw;

      if (seen.has(code.toLowerCase())) {
        errors.push(`Line ${line}: duplicate code in file (${code})`);
        return;
      }
      seen.add(code.toLowerCase());

      // Validate required fields for complete cards
      const name = r.name ? norm(r.name) : undefined;
      const suit = r.suit ? norm(r.suit) : undefined;
      const rank = r.rank ? norm(r.rank) : undefined;
      const era = r.era ? norm(r.era) : undefined;

      // If any card details are provided, warn about missing required fields
      if ((name || suit || rank || era) && (!name || !suit || !rank || !era)) {
        if (!name) errors.push(`Line ${line}: missing name (required for complete cards)`);
        if (!suit) errors.push(`Line ${line}: missing suit (required for complete cards)`);
        if (!rank) errors.push(`Line ${line}: missing rank (required for complete cards)`);
        if (!era) errors.push(`Line ${line}: missing era (required for complete cards)`);
      }

      // Handle image code to URL conversion
      let imageUrl = r.image_url ? norm(r.image_url) : undefined;
      const imageCode = r.image_code ? norm(r.image_code) : undefined;
      
      if (imageCode && !imageUrl) {
        // Try to resolve from database first
        const { data: resolvedUrl } = await supabase
          .rpc('resolve_image_code', { p_code: imageCode });
        
        if (resolvedUrl) {
          imageUrl = resolvedUrl;
        } else {
          // Fallback to local mappings
          const mapping = imageMappings.find(m => m.code === imageCode);
          if (mapping) {
            imageUrl = mapping.url;
          } else {
            errors.push(`Line ${line}: image code "${imageCode}" not found in database or local mappings`);
          }
        }
      }
      
      // Handle short codes in image_url field (like a1, a2)
      if (imageUrl && !imageUrl.startsWith('http') && /^[a-z]\d+$/.test(imageUrl)) {
        const { data: resolvedUrl } = await supabase
          .rpc('resolve_image_code', { p_code: imageUrl });
        
        if (resolvedUrl) {
          imageUrl = resolvedUrl;
        } else {
          errors.push(`Line ${line}: image code "${imageUrl}" not found in database`);
        }
      }

      // Handle QR colors
      let qrDarkColor: string | undefined;
      let qrLightColor: string | undefined;
      
      if (r.qr_dark) {
        const color = norm(r.qr_dark);
        if (isValidHex(color)) {
          qrDarkColor = normalizeHex(color);
        } else {
          errors.push(`Line ${line}: invalid qr_dark color "${color}" (must be #RGB or #RRGGBB)`);
        }
      }
      
      if (r.qr_light) {
        const color = norm(r.qr_light);
        if (isValidHex(color)) {
          qrLightColor = normalizeHex(color);
        } else {
          errors.push(`Line ${line}: invalid qr_light color "${color}" (must be #RGB or #RRGGBB)`);
        }
      }

      const row: CardUpsert = {
        code,
        name,
        suit,
        rank,
        era,
        rarity: r.rarity ? norm(r.rarity) : undefined,
        trader_value: r.trader_value ? norm(r.trader_value) : undefined,
        time_value: r.time_value ? Number(r.time_value) || 0 : 0,
        image_url: imageUrl,
        description: r.description ? norm(r.description) : undefined,
        current_target: r.current_target ? norm(r.current_target) : undefined,
        status: r.status ? norm(r.status) : 'active',
        is_active: true, // Default to active
        qr_dark: qrDarkColor,
        qr_light: qrLightColor,
      };
      
      // Override is_active if explicitly provided
      const b = parseBool((r as any).is_active);
      if (b !== undefined) row.is_active = b;

      ok.push(row);
    }

    return { ok, errors };
  }

  async function ingestCsv(data: CsvRow[]) {
    const { ok, errors } = await validateAndNormalize(data);
    setCsvRows(ok);
    setCsvErrors(errors);
    setMsg(
      errors.length
        ? `Parsed with ${errors.length} issue(s).`
        : `Parsed ${ok.length} row(s).`
    );
  }

  async function handleCsvPaste() {
    setCsvErrors([]);
    Papa.parse<CsvRow>(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: async (res) => {
        if (res.errors?.length) {
          setCsvErrors(res.errors.map((er) => `Row ${er.row}: ${er.message}`));
        }
        await ingestCsv(res.data);
      },
    });
  }

  async function upsertCsv() {
    if (csvRows.length === 0) {
      setMsg("Nothing to upsert.");
      return;
    }
    setCsvBusy(true);
    const { error } = await supabase.from("cards").upsert(csvRows, { onConflict: "code" });
    setCsvBusy(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    setMsg(`✅ Upserted ${csvRows.length} card(s) to database.`);
  }

  async function downloadZipFromCsv() {
    if (csvRows.length === 0) {
      setMsg("No parsed rows.");
      return;
    }
    const zip = new JSZip();
    const folder = zip.folder("qrs")!;
    
    for (const r of csvRows) {
      const code = r.code!;
      const url = baseUrl + encodeURIComponent(code);
      
      // Use per-row colors if available, otherwise fall back to global defaults
      const colors: QrColors = {
        dark: r.qr_dark || qrDark,
        light: r.qr_light || qrLight
      };
      
      const png = await toPNG(url, code, colors);
      const base64 = png.split(",")[1];
      folder.file(`${code}.png`, base64, { base64: true });
    }
    
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tot-cards-qrs-csv-${csvRows.length}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  /* -------------- UI -------------- */

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Admin — QR Tools</h1>
      {msg && (
        <div className="glass-panel text-sm px-3 py-2 rounded border-l-4 border-l-primary text-foreground">
          {msg}
        </div>
      )}

      {/* QR Color Controls */}
      <section className="card-premium rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <Palette className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">QR Color Settings (Global Defaults)</h2>
          <Button
            onClick={resetColors}
            variant="ghost"
            size="sm"
            className="ml-auto"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset to defaults
          </Button>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">QR Color (dark)</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={qrDark}
                onChange={(e) => handleColorChange(e.target.value, 'dark')}
                className="w-10 h-8 rounded border border-border cursor-pointer"
              />
              <div 
                className="w-8 h-8 rounded border border-border"
                style={{ backgroundColor: qrDark }}
                title={qrDark}
              />
              <input
                type="text"
                value={qrDark}
                onChange={(e) => handleColorChange(e.target.value, 'dark')}
                placeholder="#000000"
                className="glass-panel border border-border rounded px-2 py-1 text-sm font-mono text-foreground placeholder:text-muted-foreground flex-1"
              />
            </div>
            {qrDarkError && (
              <div className="text-xs text-destructive">{qrDarkError}</div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Background (light)</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={qrLight}
                onChange={(e) => handleColorChange(e.target.value, 'light')}
                className="w-10 h-8 rounded border border-border cursor-pointer"
              />
              <div 
                className="w-8 h-8 rounded border border-border"
                style={{ backgroundColor: qrLight }}
                title={qrLight}
              />
              <input
                type="text"
                value={qrLight}
                onChange={(e) => handleColorChange(e.target.value, 'light')}
                placeholder="#FFFFFF"
                className="glass-panel border border-border rounded px-2 py-1 text-sm font-mono text-foreground placeholder:text-muted-foreground flex-1"
              />
            </div>
            {qrLightError && (
              <div className="text-xs text-destructive">{qrLightError}</div>
            )}
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Colors persist across page reloads. CSV import can override colors per card using <code className="bg-muted px-1 rounded">qr_dark</code> and <code className="bg-muted px-1 rounded">qr_light</code> columns.
        </div>
      </section>

      {/* Single QR */}
      <section className="card-premium rounded-xl p-4 space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Single QR</h2>
        <div className="grid md:grid-cols-3 gap-3">
          <input
            value={singleCode}
            onChange={(e) => setSingleCode(e.target.value)}
            placeholder="Card code (e.g., TOT-ABCD-1234)"
            className="glass-panel border border-border rounded px-2 py-1 text-foreground placeholder:text-muted-foreground"
          />
        <input
            value={singleLabel}
            onChange={(e) => setSingleLabel(e.target.value)}
            placeholder="Label under QR (optional)"
            className="glass-panel border border-border rounded px-2 py-1 text-foreground placeholder:text-muted-foreground"
          />
          <button
            onClick={buildSingle}
            disabled={!colorsValid}
            className="bg-primary text-primary-foreground border border-border rounded px-3 py-1 hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            Generate QR & Create Card
          </button>
        </div>
        {pngDataUrl && (
          <div className="space-y-3">
            <img src={pngDataUrl} alt="QR preview" className="w-64 border border-border rounded" />
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={() => downloadDataUrl(`${singleCode || "qr"}.png`, pngDataUrl)}
                variant="secondary"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PNG
              </Button>
              <Button
                onClick={() => navigate(`/admin/cards?code=${encodeURIComponent(singleCode)}`)}
                variant="outline"
                size="sm"
              >
                <Edit className="w-4 h-4 mr-2" />
                Add Card Details
              </Button>
              <Button
                onClick={() => navigate('/admin/cards')}
                variant="ghost"
                size="sm"
              >
                <Eye className="w-4 h-4 mr-2" />
                View in Card List
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Image Upload & Mapping */}
      <section className="card-premium rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Image Upload & Mapping</h2>
            <div className="text-sm text-muted-foreground">
              Upload multiple images and assign codes (a1, a2, a3...) for use in CSV import.
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowImageLibrary(!showImageLibrary)}
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            {showImageLibrary ? 'Hide' : 'View'} Library
          </Button>
        </div>
        
        <div className="space-y-3">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
            className="glass-panel border border-border rounded px-2 py-1 text-foreground"
            disabled={uploadingImages}
          />
          
          {uploadingImages && (
            <div className="text-sm text-muted-foreground">Uploading images...</div>
          )}

          {showImageLibrary && (
            <div className="border rounded-lg p-4 bg-muted/10">
              <ImageLibraryView />
            </div>
          )}
          
          {imageMappings.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{imageMappings.length} Images Mapped:</span>
                <Button onClick={clearImageMappings} variant="outline" size="sm">
                  Clear All
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                {imageMappings.map((mapping) => (
                  <div key={mapping.code} className="glass-panel p-2 rounded border border-border">
                    <div className="flex items-center justify-between">
                      <code className="bg-muted px-1 rounded text-xs font-mono">{mapping.code}</code>
                      <Button
                        onClick={() => navigator.clipboard.writeText(mapping.code)}
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground truncate mt-1" title={mapping.filename}>
                      {mapping.filename}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="glass-panel p-2 rounded border border-border">
                <div className="text-xs font-medium mb-1">Copy for Excel:</div>
                <code className="text-xs bg-muted p-1 rounded block">
                  {imageMappings.map(m => m.code).join(', ')}
                </code>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* CSV Import */}
      <section className="card-premium rounded-xl p-4 space-y-3">
        <h2 className="text-lg font-semibold text-foreground">CSV Import</h2>
        <div className="text-sm text-muted-foreground">
          Required column: <code className="bg-muted px-1 rounded">code</code>. Optional:{" "}
          <code className="bg-muted px-1 rounded">
            name,suit,rank,era,rarity,trader_value,time_value,description,image_url,image_code,current_target,status,is_active,qr_dark,qr_light
          </code>
          <br />
          <span className="text-xs mt-1 block">
            For complete cards, provide: name, suit, rank, era. Use <code className="bg-muted px-1 rounded">image_code</code> (a1, a2...) instead of full URLs. Default time_value: 0, status: 'active'
          </span>
          <span className="text-xs mt-1 block">
            Use <code className="bg-muted px-1 rounded">qr_dark</code> and <code className="bg-muted px-1 rounded">qr_light</code> columns to set custom QR colors per card (#RGB or #RRGGBB format).
          </span>
          {imageMappings.length > 0 && (
            <span className="text-xs mt-1 block text-primary">
              💡 {imageMappings.length} image codes available: {imageMappings.map(m => m.code).join(', ')}
            </span>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleCsvFile}
            className="glass-panel border border-border rounded px-2 py-1 text-foreground"
          />
          <button
            onClick={handleCsvPaste}
            className="bg-secondary text-secondary-foreground border border-border rounded px-3 py-1 hover:bg-secondary/80 transition-colors"
          >
            Parse Pasted CSV
          </button>
        </div>

        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          placeholder={`code,name,suit,rank,era,rarity,trader_value,time_value,description,image_code,current_target,status,is_active
TOT-4K9V-7XQ2,Ada Lovelace,Hearts,A,Victorian,Legendary,100,10,Famous mathematician and programmer,a1,https://your-site/trader/ada,active,true`}
          rows={6}
          className="w-full glass-panel border border-border rounded px-2 py-1 font-mono text-xs text-foreground placeholder:text-muted-foreground"
        />

        {csvErrors.length > 0 && (
          <div className="glass-panel text-sm px-3 py-2 rounded border-l-4 border-l-destructive text-destructive-foreground">
            {csvErrors.slice(0, 5).map((e, i) => (
              <div key={i}>{e}</div>
            ))}
            {csvErrors.length > 5 && <div>…and {csvErrors.length - 5} more</div>}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={upsertCsv}
            disabled={csvBusy || csvRows.length === 0}
            className="bg-primary text-primary-foreground border border-border rounded px-3 py-1 hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {csvBusy ? "Upserting…" : `Upsert ${csvRows.length} row(s)`}
          </button>
          <button
            onClick={downloadZipFromCsv}
            disabled={csvRows.length === 0}
            className="bg-secondary text-secondary-foreground border border-border rounded px-3 py-1 hover:bg-secondary/80 transition-colors disabled:opacity-50"
          >
            Download QR ZIP for parsed rows
          </button>
        </div>

        {csvRows.length > 0 && (
          <>
            <div className="text-xs text-muted-foreground">
              Showing first {Math.min(csvRows.length, 10)} of {csvRows.length} parsed rows:
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="py-1 pr-3 text-foreground">code</th>
                    <th className="py-1 pr-3 text-foreground">name</th>
                    <th className="py-1 pr-3 text-foreground">suit</th>
                    <th className="py-1 pr-3 text-foreground">rank</th>
                    <th className="py-1 pr-3 text-foreground">era</th>
                    <th className="py-1 pr-3 text-foreground">rarity</th>
                    <th className="py-1 pr-3 text-foreground">time_value</th>
                    <th className="py-1 pr-3 text-foreground">status</th>
                    <th className="py-1 pr-3 text-foreground">is_active</th>
                  </tr>
                </thead>
                <tbody>
                  {csvRows.slice(0, 10).map((r, i) => (
                    <tr key={i} className="border-b border-border last:border-b-0">
                      <td className="py-1 pr-3 font-mono text-foreground">{r.code}</td>
                      <td className="py-1 pr-3 text-foreground">{r.name ?? "—"}</td>
                      <td className="py-1 pr-3 text-foreground">{r.suit ?? "—"}</td>
                      <td className="py-1 pr-3 text-foreground">{r.rank ?? "—"}</td>
                      <td className="py-1 pr-3 text-foreground">{r.era ?? "—"}</td>
                      <td className="py-1 pr-3 text-foreground">{r.rarity ?? "—"}</td>
                      <td className="py-1 pr-3 text-foreground">{r.time_value ?? 0}</td>
                      <td className="py-1 pr-3 text-foreground">{r.status ?? "active"}</td>
                      <td className="py-1 pr-3 text-foreground">{String(r.is_active ?? "")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* Edit redirect */}
      <section className="card-premium rounded-xl p-4 space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Edit Card Redirect</h2>
        <div className="grid md:grid-cols-3 gap-3">
          <input
            value={editCode}
            onChange={(e) => setEditCode(e.target.value)}
            placeholder="Card code"
            className="glass-panel border border-border rounded px-2 py-1 text-foreground placeholder:text-muted-foreground"
          />
          <button
            onClick={lookupCode}
            className="bg-secondary text-secondary-foreground border border-border rounded px-3 py-1 hover:bg-secondary/80 transition-colors"
          >
            Lookup
          </button>
        </div>

        {editFound && (
          <div className="space-y-2">
            <div className="text-sm text-foreground">
              <span className="font-medium">Code:</span> {editFound.code} ·{" "}
              <span className="font-medium">Active:</span> {editFound.is_active ? "Yes" : "No"}{" "}
              {editFound.name ? `· ${editFound.name}` : ""}
            </div>
            <input
              value={editTarget}
              onChange={(e) => setEditTarget(e.target.value)}
              placeholder="https://destination.example/page (optional)"
              className="glass-panel border border-border rounded px-2 py-1 w-full text-foreground placeholder:text-muted-foreground"
            />
            <div className="flex gap-2">
              <button
                onClick={saveRedirect}
                className="bg-primary text-primary-foreground border border-border rounded px-3 py-1 hover:bg-primary/90 transition-colors"
              >
                Save Redirect
              </button>
              {editTarget && (
                <a
                  href={editTarget}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-secondary text-secondary-foreground border border-border rounded px-3 py-1 hover:bg-secondary/80 transition-colors inline-block"
                >
                  Open Current Target
                </a>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Recent cards table */}
      <RecentCardsPanel />
    </div>
  );
}

