export const ERA_QR_COLORS: Record<string, { dark: string; light: string }> = {
  'Ancient': { dark: '#b76201', light: '#000000' },
  'Prehistoric': { dark: '#7d3421', light: '#000000' },
  'Medieval': { dark: '#f00c00', light: '#000000' },
  'Modern': { dark: '#787773', light: '#000000' },
  'Future': { dark: '#0b8c8e', light: '#000000' },
};

export const DEFAULT_QR_COLORS = { dark: '#000000', light: '#FFFFFF' };

export function getQRColorsForEra(era: string): { dark: string; light: string } {
  return ERA_QR_COLORS[era] || DEFAULT_QR_COLORS;
}
