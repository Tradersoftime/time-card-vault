import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Palette, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QRCodePreviewProps {
  code: string;
  qrDark?: string | null;
  qrLight?: string | null;
  onColorChange?: (dark: string, light: string) => void;
  showColorControls?: boolean;
  size?: number;
  className?: string;
  cardName?: string;
  suit?: string;
  rank?: string;
  printRun?: string;
}

export const QRCodePreview = ({
  code,
  qrDark = '#000000',
  qrLight = '#FFFFFF',
  onColorChange,
  showColorControls = false,
  size = 200,
  className = '',
  cardName,
  suit,
  rank,
  printRun
}: QRCodePreviewProps) => {
  const { toast } = useToast();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [darkColor, setDarkColor] = useState(qrDark || '#000000');
  const [lightColor, setLightColor] = useState(qrLight || '#FFFFFF');
  const [generating, setGenerating] = useState(false);

  // Update local state when props change
  useEffect(() => {
    setDarkColor(qrDark || '#000000');
    setLightColor(qrLight || '#FFFFFF');
  }, [qrDark, qrLight]);

  // Generate QR code
  const generateQR = async () => {
    if (!code) return;
    
    setGenerating(true);
    try {
      // Use tot.cards domain for production QRs
      const baseUrl = import.meta.env.PUBLIC_CLAIM_BASE_URL || 'https://tot.cards/claim?token=';
      const shortUrl = import.meta.env.PUBLIC_SHORT_CLAIM_BASE_URL;
      
      const claimUrl = shortUrl ? `${shortUrl}${code}` : `${baseUrl}${code}`;
      
      const dataUrl = await QRCode.toDataURL(claimUrl, {
        width: size,
        margin: 4,
        errorCorrectionLevel: 'H',
        color: {
          dark: darkColor,
          light: lightColor
        }
      });
      setQrDataUrl(dataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        title: "Error",
        description: "Failed to generate QR code",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  // Generate QR when code or colors change
  useEffect(() => {
    generateQR();
  }, [code, darkColor, lightColor, size]);

  // Handle color changes
  const handleDarkColorChange = (value: string) => {
    setDarkColor(value);
    if (onColorChange) {
      onColorChange(value, lightColor);
    }
  };

  const handleLightColorChange = (value: string) => {
    setLightColor(value);
    if (onColorChange) {
      onColorChange(darkColor, value);
    }
  };

  // Reset to default colors
  const resetColors = () => {
    setDarkColor('#000000');
    setLightColor('#FFFFFF');
    if (onColorChange) {
      onColorChange('#000000', '#FFFFFF');
    }
  };

  // Sanitize filename - remove special characters and limit length
  const sanitizeFilename = (name: string): string => {
    return name
      .replace(/[^a-zA-Z0-9-_]/g, '-') // Replace special chars with hyphen
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
      .substring(0, 50); // Limit length
  };

  // Download QR code
  const downloadQR = async (format: 'png' | 'svg' = 'png', downloadSize = 512) => {
    if (!code) return;

    try {
      // Use tot.cards domain for production QRs
      const baseUrl = import.meta.env.PUBLIC_CLAIM_BASE_URL || 'https://tot.cards/claim?token=';
      const shortUrl = import.meta.env.PUBLIC_SHORT_CLAIM_BASE_URL;
      
      const claimUrl = shortUrl ? `${shortUrl}${code}` : `${baseUrl}${code}`;
      let dataUrl: string;

      if (format === 'svg') {
        const svgString = await QRCode.toString(claimUrl, {
          type: 'svg',
          width: downloadSize,
          margin: 4,
          errorCorrectionLevel: 'H',
          color: {
            dark: darkColor,
            light: lightColor
          }
        });
        dataUrl = `data:image/svg+xml;base64,${btoa(svgString)}`;
      } else {
        dataUrl = await QRCode.toDataURL(claimUrl, {
          width: downloadSize,
          margin: 4,
          errorCorrectionLevel: 'H',
          color: {
            dark: darkColor,
            light: lightColor
          }
        });
      }

      // Build predictable filename: {name}_{print_run}.{format}
      let filename = sanitizeFilename(cardName || 'card');
      if (printRun) {
        filename += `_${sanitizeFilename(printRun)}`;
      }
      filename += `.${format}`;

      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast({
        title: "Downloaded",
        description: `QR code downloaded as ${downloadSize}px ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Error downloading QR code:', error);
      toast({
        title: "Error",
        description: "Failed to download QR code",
        variant: "destructive",
      });
    }
  };

  // Validate hex color
  const isValidHex = (hex: string): boolean => {
    return /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(hex);
  };

  // Calculate contrast ratio for accessibility
  const getContrastRatio = (color1: string, color2: string): number => {
    const getLuminance = (hex: string): number => {
      const rgb = parseInt(hex.slice(1), 16);
      const r = (rgb >> 16) & 0xff;
      const g = (rgb >> 8) & 0xff;
      const b = (rgb >> 0) & 0xff;
      
      const [rs, gs, bs] = [r, g, b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      
      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    };

    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    
    return (brightest + 0.05) / (darkest + 0.05);
  };

  const contrastRatio = isValidHex(darkColor) && isValidHex(lightColor) 
    ? getContrastRatio(darkColor, lightColor) 
    : null;
  const hasLowContrast = contrastRatio !== null && contrastRatio < 4.5;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* QR Code Preview */}
      <div className="flex flex-col items-center space-y-3">
        <div className="relative">
          {generating ? (
            <div 
              className="flex items-center justify-center bg-muted rounded-lg border"
              style={{ width: size, height: size }}
            >
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : qrDataUrl ? (
            <img 
              src={qrDataUrl} 
              alt={`QR Code for ${code}`}
              className="rounded-lg border shadow-sm"
              style={{ width: size, height: size }}
            />
          ) : (
            <div 
              className="flex items-center justify-center bg-muted text-muted-foreground rounded-lg border"
              style={{ width: size, height: size }}
            >
              No QR Code
            </div>
          )}
        </div>

        {/* Color Preview Swatches */}
        {qrDataUrl && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <div 
                className="w-4 h-4 rounded border border-gray-300"
                style={{ backgroundColor: darkColor }}
                title={`Dark: ${darkColor}`}
              />
              <span>Dark</span>
            </div>
            <div className="flex items-center gap-1">
              <div 
                className="w-4 h-4 rounded border border-gray-300"
                style={{ backgroundColor: lightColor }}
                title={`Light: ${lightColor}`}
              />
              <span>Light</span>
            </div>
          </div>
        )}
      </div>

      {/* Download Buttons */}
      {qrDataUrl && (
        <div className="flex flex-wrap gap-2 justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => downloadQR('png', 256)}
            className="text-xs"
          >
            <Download className="h-3 w-3 mr-1" />
            256px PNG
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => downloadQR('png', 512)}
            className="text-xs"
          >
            <Download className="h-3 w-3 mr-1" />
            512px PNG
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => downloadQR('png', 1024)}
            className="text-xs"
          >
            <Download className="h-3 w-3 mr-1" />
            1024px PNG
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => downloadQR('png', 2048)}
            className="text-xs"
          >
            <Download className="h-3 w-3 mr-1" />
            2048px PNG
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => downloadQR('png', 4096)}
            className="text-xs"
          >
            <Download className="h-3 w-3 mr-1" />
            4096px PNG
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => downloadQR('svg')}
            className="text-xs"
          >
            <Download className="h-3 w-3 mr-1" />
            SVG
          </Button>
        </div>
      )}

      {/* Color Controls */}
      {showColorControls && (
        <div className="space-y-4 p-4 bg-muted/20 rounded-lg border">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Palette className="h-4 w-4" />
              QR Colors
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetColors}
              className="text-xs"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="qr-dark-color" className="text-xs">Dark Color</Label>
              <div className="flex gap-2">
                <Input
                  id="qr-dark-color"
                  type="color"
                  value={darkColor}
                  onChange={(e) => handleDarkColorChange(e.target.value)}
                  className="w-12 h-8 p-1 border rounded"
                />
                <Input
                  value={darkColor}
                  onChange={(e) => handleDarkColorChange(e.target.value)}
                  placeholder="#000000"
                  className={`text-xs ${!isValidHex(darkColor) ? 'border-destructive' : ''}`}
                />
              </div>
              {!isValidHex(darkColor) && (
                <p className="text-xs text-destructive">Invalid hex color</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="qr-light-color" className="text-xs">Light Color</Label>
              <div className="flex gap-2">
                <Input
                  id="qr-light-color"
                  type="color"
                  value={lightColor}
                  onChange={(e) => handleLightColorChange(e.target.value)}
                  className="w-12 h-8 p-1 border rounded"
                />
                <Input
                  value={lightColor}
                  onChange={(e) => handleLightColorChange(e.target.value)}
                  placeholder="#FFFFFF"
                  className={`text-xs ${!isValidHex(lightColor) ? 'border-destructive' : ''}`}
                />
              </div>
              {!isValidHex(lightColor) && (
                <p className="text-xs text-destructive">Invalid hex color</p>
              )}
            </div>
          </div>

          {/* Contrast Warning */}
          {hasLowContrast && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
              <div className="flex items-start gap-2">
                <span className="text-destructive text-sm font-medium">⚠️ Low Contrast Warning</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Contrast ratio: {contrastRatio?.toFixed(2)}:1 (recommended: 4.5:1+)
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Low contrast QR codes may fail to scan. Use darker/lighter colors for better reliability.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};