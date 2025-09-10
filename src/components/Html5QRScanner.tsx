import React, { useEffect, useRef, useState, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";
import { X, Flashlight, FlashlightOff } from "lucide-react";

interface Html5QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (result: any) => void;
  onError: (error: any) => void;
  isPaused: boolean;
}

export function Html5QRScanner({ isOpen, onClose, onScan, onError, isPaused }: Html5QRScannerProps) {
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const elementId = "qr-scanner-container";

  const toggleTorch = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (torchEnabled) {
          await (scannerRef.current as any).applyVideoConstraints({
            advanced: [{ torch: false } as any]
          });
        } else {
          await (scannerRef.current as any).applyVideoConstraints({
            advanced: [{ torch: true } as any]
          });
        }
        setTorchEnabled(!torchEnabled);
      } catch (error) {
        console.log("Torch not supported on this device");
      }
    }
  }, [torchEnabled]);

  const handleScanSuccess = useCallback((decodedText: string, decodedResult: any) => {
    if (!isPaused) {
      console.log("QR Scan Success:", { decodedText, decodedResult }); // Debug logging
      // Normalize the result format for consistent handling
      const normalizedResult = {
        text: decodedText,
        rawValue: decodedText,
        result: decodedResult
      };
      onScan(normalizedResult);
    }
  }, [onScan, isPaused]);

  const handleScanError = useCallback((errorMessage: string) => {
    // Filter out common scanning noise to avoid spam
    const ignoredErrors = [
      "NotFoundException", 
      "No QR code found", 
      "QR code parse error",
      "Unable to detect a square finder pattern"
    ];
    
    const shouldIgnore = ignoredErrors.some(err => 
      errorMessage.includes(err) || errorMessage.toLowerCase().includes(err.toLowerCase())
    );
    
    if (!shouldIgnore) {
      console.warn("QR Scanner Error:", errorMessage); // Debug logging
      onError(errorMessage);
    }
  }, [onError]);

  const startScanner = useCallback(() => {
    if (scannerRef.current || !isOpen || isPaused) return;

    // Responsive qrbox size - 30% of screen width, min 200px, max 300px
    const screenWidth = window.innerWidth;
    const qrboxSize = Math.min(300, Math.max(200, screenWidth * 0.3));

    const config = {
      fps: 7, // Reduced for better mobile performance
      qrbox: { width: qrboxSize, height: qrboxSize },
      aspectRatio: 1.0,
      disableFlip: false,
      videoConstraints: {
        facingMode: "environment",
        width: { ideal: 640, max: 1280 }, // Reduced resolution for better performance
        height: { ideal: 480, max: 720 },
        frameRate: { ideal: 15, max: 30 } // Add frame rate constraint
      },
      supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
      // Add fallback constraints for older devices
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true
      }
    };

    try {
      const scanner = new Html5QrcodeScanner(elementId, config, false);
      scannerRef.current = scanner;
      scanner.render(handleScanSuccess, handleScanError);
      setIsScanning(true);
    } catch (error) {
      console.error("Failed to start scanner:", error);
      onError(error);
    }
  }, [isOpen, isPaused, handleScanSuccess, handleScanError, onError]);

  const stopScanner = useCallback(() => {
    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
        scannerRef.current = null;
        setIsScanning(false);
        setTorchEnabled(false);
      } catch (error) {
        console.error("Error stopping scanner:", error);
      }
    }
  }, []);

  useEffect(() => {
    if (isOpen && !isPaused) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(startScanner, 100);
      return () => clearTimeout(timer);
    } else {
      stopScanner();
    }
  }, [isOpen, isPaused, startScanner, stopScanner]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  const handleClose = useCallback(() => {
    stopScanner();
    onClose();
  }, [stopScanner, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="p-0 m-0 max-w-none w-screen h-screen border-0 bg-black">
        <div className="relative w-full h-full overflow-hidden">
          {/* Scanner Container */}
          <div className="absolute inset-0">
            <div 
              id={elementId} 
              className="w-full h-full"
              style={{
                background: 'transparent'
              }}
            />
          </div>

          {/* Scanning Overlay - Only show when actively scanning */}
          {isScanning && !isPaused && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Corner indicators */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64">
                {/* Top-left corner */}
                <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-primary"></div>
                {/* Top-right corner */}
                <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-primary"></div>
                {/* Bottom-left corner */}
                <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-primary"></div>
                {/* Bottom-right corner */}
                <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-primary"></div>
              </div>
              
              {/* Center scanning line animation - responsive size */}
              <div 
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-2 border-primary/30 rounded-lg"
                style={{ 
                  width: Math.min(300, Math.max(200, window.innerWidth * 0.3)), 
                  height: Math.min(300, Math.max(200, window.innerWidth * 0.3))
                }}
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse"></div>
              </div>
            </div>
          )}

          {/* Top Controls */}
          <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent pointer-events-auto z-50">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="text-white hover:bg-white/20"
              >
                <X className="h-6 w-6" />
              </Button>
              
              <h2 className="text-white text-lg font-semibold">
                Scan QR Code
              </h2>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTorch}
                className="text-white hover:bg-white/20"
                disabled={!isScanning}
              >
                {torchEnabled ? (
                  <FlashlightOff className="h-6 w-6" />
                ) : (
                  <Flashlight className="h-6 w-6" />
                )}
              </Button>
            </div>
          </div>

          {/* Bottom Instructions */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent pointer-events-none z-50">
            <div className="text-center text-white space-y-2">
              <p className="text-lg font-medium">Position QR code within the frame</p>
              <p className="text-sm opacity-80">Hold steady • Scanner stays open for multiple cards</p>
              {!isScanning && (
                <p className="text-xs opacity-60">Starting camera...</p>
              )}
            </div>
          </div>

          {/* Paused State */}
          {isPaused && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center pointer-events-auto z-50">
              <div className="text-center text-white space-y-4">
                <h3 className="text-2xl font-semibold">Scanner Paused</h3>
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="text-white border-white hover:bg-white/20"
                >
                  Close Scanner
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}