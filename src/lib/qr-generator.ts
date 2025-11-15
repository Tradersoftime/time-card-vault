// src/lib/qr-generator.ts
import QRCode from "qrcode";

export type QrColors = {
  dark: string;
  light: string;
};

// Color validation helpers
export function isValidHex(hex: string): boolean {
  return /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(hex);
}

export function normalizeHex(hex: string): string {
  if (hex.length === 4) {
    // Convert #RGB to #RRGGBB
    return "#" + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  }
  return hex.toUpperCase();
}

export function getLuminance(hex: string): number {
  const rgb = parseInt(hex.slice(1), 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = (rgb >> 0) & 0xff;
  
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  
  return (brightest + 0.05) / (darkest + 0.05);
}

export function pickTextOn(bgHex: string): string {
  // Simple luminance calculation for text contrast
  const hex = bgHex.replace('#', '');
  const r = parseInt(hex.length === 3 ? hex[0] + hex[0] : hex.slice(0, 2), 16);
  const g = parseInt(hex.length === 3 ? hex[1] + hex[1] : hex.slice(2, 4), 16);
  const b = parseInt(hex.length === 3 ? hex[2] + hex[2] : hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#000000' : '#FFFFFF';
}

// Generate QR code as SVG string
export async function toSVG(
  data: string, 
  label?: string, 
  colors?: QrColors
): Promise<string> {
  const qrColors = colors || { dark: "#000000", light: "#FFFFFF" };
  
  // Generate base QR code as SVG string
  const svgString = await QRCode.toString(data, {
    type: 'svg',
    errorCorrectionLevel: 'H',
    margin: 4,
    width: 512,
    color: {
      dark: normalizeHex(qrColors.dark),
      light: normalizeHex(qrColors.light)
    }
  });

  if (!label) return svgString;

  // Add label to SVG
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
  const svgEl = svgDoc.querySelector('svg');
  
  if (!svgEl) return svgString;
  
  const width = parseInt(svgEl.getAttribute('width') || '512');
  const height = parseInt(svgEl.getAttribute('height') || '512');
  const pad = 16;
  const fontPx = 32;
  const newHeight = height + pad + fontPx + pad;
  
  // Update SVG height
  svgEl.setAttribute('height', newHeight.toString());
  svgEl.setAttribute('viewBox', `0 0 ${width} ${newHeight}`);
  
  // Add background rectangle for label area
  const bgRect = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bgRect.setAttribute('x', '0');
  bgRect.setAttribute('y', height.toString());
  bgRect.setAttribute('width', width.toString());
  bgRect.setAttribute('height', (pad + fontPx + pad).toString());
  bgRect.setAttribute('fill', normalizeHex(qrColors.light));
  svgEl.appendChild(bgRect);
  
  // Add text label
  const textEl = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'text');
  textEl.setAttribute('x', (width / 2).toString());
  textEl.setAttribute('y', (newHeight - pad).toString());
  textEl.setAttribute('text-anchor', 'middle');
  textEl.setAttribute('font-family', 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif');
  textEl.setAttribute('font-size', fontPx.toString());
  textEl.setAttribute('fill', pickTextOn(qrColors.light));
  textEl.textContent = label;
  svgEl.appendChild(textEl);
  
  return new XMLSerializer().serializeToString(svgDoc);
}

// Generate QR code as PNG data URL
export async function toPNG(
  data: string, 
  label?: string, 
  colors?: QrColors
): Promise<string> {
  const qrColors = colors || { dark: "#000000", light: "#FFFFFF" };
  
  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, data, {
    errorCorrectionLevel: "H",
    margin: 4,
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
