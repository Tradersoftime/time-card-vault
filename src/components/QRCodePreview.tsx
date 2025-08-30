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
}

export const QRCodePreview = ({
  code,
  qrDark = '#000000',
  qrLight = '#FFFFFF',
  onColorChange,
  showColorControls = false,
  size = 200,
  className = ''
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
      const url = `${window.location.origin}/claim/${code}`;
      const dataUrl = await QRCode.toDataURL(url, {
        width: size,
        margin: 2,
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

  // Download QR code
  const downloadQR = async (format: 'png' | 'svg' = 'png', downloadSize = 512) => {
    if (!code) return;

    try {
      const url = `${window.location.origin}/claim/${code}`;
      let dataUrl: string;

      if (format === 'svg') {
        const svgString = await QRCode.toString(url, {
          type: 'svg',
          width: downloadSize,
          margin: 2,
          color: {
            dark: darkColor,
            light: lightColor
          }
        });
        dataUrl = `data:image/svg+xml;base64,${btoa(svgString)}`;
      } else {
        dataUrl = await QRCode.toDataURL(url, {
          width: downloadSize,
          margin: 2,
          color: {
            dark: darkColor,
            light: lightColor
          }
        });
      }

      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `qr-${code}-${downloadSize}px.${format}`;
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
            variant="outline"
            size="sm"
            onClick={() => downloadQR('png', 256)}
            className="text-xs"
          >
            <Download className="h-3 w-3 mr-1" />
            256px PNG
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadQR('png', 512)}
            className="text-xs"
          >
            <Download className="h-3 w-3 mr-1" />
            512px PNG
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadQR('png', 1024)}
            className="text-xs"
          >
            <Download className="h-3 w-3 mr-1" />
            1024px PNG
          </Button>
          <Button
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
        </div>
      )}
    </div>
  );
};