export const ERA_QR_COLORS: Record<string, { qr_dark: string; qr_light: string }> = {
  'Ancient': { qr_dark: '#b76201', qr_light: '#000000' },
  'Prehistoric': { qr_dark: '#7d3421', qr_light: '#000000' },
  'Medieval': { qr_dark: '#f00c00', qr_light: '#000000' },
  'Modern': { qr_dark: '#787773', qr_light: '#000000' },
  'Future': { qr_dark: '#0b8c8e', qr_light: '#000000' },
};

export const DEFAULT_QR_COLORS = { qr_dark: '#000000', qr_light: '#FFFFFF' };

export function getQRColorsForEra(era: string): { qr_dark: string; qr_light: string } {
  return ERA_QR_COLORS[era] || DEFAULT_QR_COLORS;
}
