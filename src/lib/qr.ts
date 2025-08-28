import QRCode from "qrcode";

/** Ensure a hex color is #RRGGBB */
export function normalizeHex(hex?: string | null, fallback = "#000000") {
  const s = (hex || "").trim();
  if (!s) return fallback;
  const withHash = s.startsWith("#") ? s : `#${s}`;
  const m = withHash.match(/^#([0-9a-fA-F]{6})$/);
  return m ? `#${m[1].toLowerCase()}` : fallback;
}

/** 0..255 luminance for choosing black/white text */
function luma(hex: string) {
  const h = normalizeHex(hex, "#ffffff").slice(1);
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  // perceived luminance
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function readableTextColor(bg: string) {
  return luma(bg) > 160 ? "#000000" : "#ffffff";
}

type ToPNGOpts = {
  data: string;              // URL or text to encode
  label?: string;            // text under QR
  dark?: string;             // QR "dark" hex
  light?: string;            // QR "light" hex
  width?: number;            // QR size (square)
};

export async function toPNG(opts: ToPNGOpts): Promise<string> {
  const width = opts.width ?? 512;
  const dark  = normalizeHex(opts.dark, "#000000");
  const light = normalizeHex(opts.light, "#ffffff");

  // 1) draw QR to an offscreen canvas
  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, opts.data, {
    errorCorrectionLevel: "M",
    margin: 2,
    width,
    color: { dark, light }
  });

  // 2) If no label, just return QR
  if (!opts.label) return qrCanvas.toDataURL("image/png");

  // 3) Compose label on a taller canvas
  const pad = 16;
  const fontPx = Math.round(width * 0.06); // scale label size with width
  const W = qrCanvas.width;
  const H = qrCanvas.height + pad + fontPx + pad;

  const out = document.createElement("canvas");
  out.width = W;
  out.height = H;
  const ctx = out.getContext("2d")!;

  // label background = QR light color
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, W, H);

  // draw QR
  ctx.drawImage(qrCanvas, 0, 0);

  // label text
  ctx.fillStyle = readableTextColor(light);
  ctx.font = `${fontPx}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText(opts.label, W / 2, H - pad);

  return out.toDataURL("image/png");
}

/** Trigger a download from a dataURL */
export function downloadDataUrl(filename: string, dataUrl: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
