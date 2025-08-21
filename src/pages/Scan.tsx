import { useState, useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Scan() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      // Cleanup scanner when component unmounts
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, []);

  const startScanning = async () => {
    try {
      setIsScanning(true);
      setScanResult(null);

      // Clear any existing scanner
      if (scannerRef.current) {
        await scannerRef.current.clear();
      }

      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        false
      );

      scannerRef.current = scanner;

      scanner.render(
        (decodedText) => {
          // Success callback
          setScanResult(decodedText);
          setIsScanning(false);
          scanner.clear();
          
          toast({
            title: "QR Code Detected!",
            description: "Processing scan result...",
          });

          // Check if it's a card redemption URL
          if (decodedText.includes('/r/') || decodedText.includes('/claim')) {
            const url = new URL(decodedText);
            navigate(url.pathname + url.search);
          } else {
            // Handle other QR code types
            console.log("Scanned QR Code:", decodedText);
          }
        },
        (errorMessage) => {
          // Error callback - we can ignore most errors as they're just scanning attempts
          console.log("QR Scanner Error:", errorMessage);
        }
      );
    } catch (error) {
      console.error("Failed to start scanner:", error);
      setIsScanning(false);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.clear();
        setIsScanning(false);
      } catch (error) {
        console.error("Error stopping scanner:", error);
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold gradient-text">QR Code Scanner</h1>
          <p className="text-muted-foreground">
            Scan QR codes on trading cards to claim or redeem them
          </p>
        </div>

        {/* Scanner Card */}
        <Card className="card-premium p-6">
          <div className="space-y-4">
            {!isScanning && !scanResult && (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                  <Camera className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Ready to Scan</h3>
                  <p className="text-muted-foreground text-sm">
                    Click the button below to start scanning QR codes
                  </p>
                </div>
                <Button onClick={startScanning} className="w-full" size="lg">
                  <Camera className="w-4 h-4 mr-2" />
                  Start Scanning
                </Button>
              </div>
            )}

            {isScanning && (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">Scanning...</h3>
                  <p className="text-muted-foreground text-sm">
                    Point your camera at a QR code
                  </p>
                </div>
                
                {/* Scanner Container */}
                <div className="relative">
                  <div 
                    id="qr-reader" 
                    className="w-full rounded-lg overflow-hidden border border-border"
                  />
                </div>

                <Button 
                  onClick={stopScanning} 
                  variant="outline" 
                  className="w-full"
                >
                  Stop Scanning
                </Button>
              </div>
            )}

            {scanResult && (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Scan Complete!</h3>
                  <p className="text-muted-foreground text-sm break-all">
                    {scanResult}
                  </p>
                </div>
                <Button onClick={startScanning} className="w-full">
                  Scan Another
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Instructions */}
        <Card className="glass-panel p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <AlertCircle className="w-4 h-4" />
              <h4 className="font-semibold">Scanning Tips</h4>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Make sure the QR code is well-lit and clearly visible</li>
              <li>• Hold your device steady and at arm's length</li>
              <li>• Allow camera permissions when prompted</li>
              <li>• The scanner will automatically detect and process QR codes</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}