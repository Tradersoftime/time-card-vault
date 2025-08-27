// src/lib/qr.ts
import QRCode from "qrcode";

export async function makeQRDataURL(
  value: string,
  dark = "#000000",
  light = "#ffffff",
  size = 512
): Promise<string> {
  return QRCode.toDataURL(value, {
    width: size,
    margin: 1,
    color: { dark, light },
  });
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
