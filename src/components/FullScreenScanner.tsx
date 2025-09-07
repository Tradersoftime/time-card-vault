import React, { useCallback, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Scanner } from "@yudiel/react-qr-scanner";
import { X, Flashlight, FlashlightOff } from "lucide-react";

interface FullScreenScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (result: any) => void;
  onError: (error: any) => void;
  isPaused: boolean;
}

export function FullScreenScanner({ isOpen, onClose, onScan, onError, isPaused }: FullScreenScannerProps) {
  const [torchEnabled, setTorchEnabled] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const toggleTorch = useCallback(async () => {
    if (!videoRef.current) return;
    
    try {
      const stream = videoRef.current.srcObject as MediaStream;
      if (stream) {
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack && 'applyConstraints' in videoTrack) {
          await videoTrack.applyConstraints({
            advanced: [{ torch: !torchEnabled } as any]
          });
          setTorchEnabled(!torchEnabled);
        }
      }
    } catch (error) {
      console.log("Torch not supported on this device");
    }
  }, [torchEnabled]);

  const handleScanSuccess = useCallback((result: any) => {
    onScan(result);
  }, [onScan]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-0 m-0 max-w-none w-screen h-screen border-0 bg-black">
        <div className="relative w-full h-full overflow-hidden">
          {/* Scanner */}
          {!isPaused && (
            <Scanner
              onScan={handleScanSuccess}
              onError={onError}
              constraints={{
                facingMode: "environment",
                width: { ideal: 1920, max: 3840 },
                height: { ideal: 1080, max: 2160 }
              }}
              scanDelay={300}
              allowMultiple={false}
              styles={{
                container: { 
                  width: "100%", 
                  height: "100%",
                  position: "relative"
                },
                video: { 
                  width: "100%", 
                  height: "100%",
                  objectFit: "cover"
                }
              }}
            />
          )}

          {/* Scanning Overlay */}
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
            
            {/* Center scanning line animation */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-primary/30 rounded-lg">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse"></div>
            </div>
          </div>

          {/* Top Controls */}
          <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent pointer-events-auto">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
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
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent pointer-events-none">
            <div className="text-center text-white space-y-2">
              <p className="text-lg font-medium">Position QR code within the frame</p>
              <p className="text-sm opacity-80">Hold steady for best results</p>
            </div>
          </div>

          {/* Paused State */}
          {isPaused && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center pointer-events-auto">
              <div className="text-center text-white space-y-4">
                <h3 className="text-2xl font-semibold">Scanner Paused</h3>
                <Button
                  variant="outline"
                  onClick={onClose}
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