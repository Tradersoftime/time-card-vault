// src/components/MinimalCameraScanner.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Flashlight, FlashlightOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MinimalCameraScannerProps {
  onDetected: (text: string) => void;
  onError?: (error: string) => void;
  onClose: () => void;
}

// BarcodeDetector types
declare global {
  interface Window {
    BarcodeDetector?: {
      new (config?: { formats: string[] }): {
        detect(imageData: ImageBitmapSource): Promise<Array<{ rawValue: string }>>;
      };
    };
  }
}

export const MinimalCameraScanner: React.FC<MinimalCameraScannerProps> = ({
  onDetected,
  onError,
  onClose
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);
  const detectorRef = useRef<any>(null);
  
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    scanningRef.current = false;
  }, []);

  const toggleFlash = useCallback(async () => {
    if (!streamRef.current) return;
    
    try {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      const capabilities = videoTrack.getCapabilities?.() as any;
      
      if (capabilities?.torch) {
        await videoTrack.applyConstraints({
          advanced: [{ torch: !isFlashOn } as any]
        });
        setIsFlashOn(!isFlashOn);
      }
    } catch (err) {
      console.warn('Flash toggle failed:', err);
    }
  }, [isFlashOn]);

  const detectWithBarcodeDetector = useCallback(async () => {
    if (!detectorRef.current || !videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || video.readyState !== 4) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    try {
      const barcodes = await detectorRef.current.detect(canvas);
      if (barcodes.length > 0 && scanningRef.current) {
        scanningRef.current = false; // Stop scanning immediately
        onDetected(barcodes[0].rawValue);
        return true;
      }
    } catch (err) {
      console.warn('Barcode detection failed:', err);
    }
    
    return false;
  }, [onDetected]);

  const startScanning = useCallback(async () => {
    if (!videoRef.current) return;

    scanningRef.current = true;

    // Try native BarcodeDetector first
    if (window.BarcodeDetector) {
      try {
        detectorRef.current = new window.BarcodeDetector({ formats: ['qr_code'] });
        
        const scanLoop = async () => {
          if (!scanningRef.current) return;
          
          const detected = await detectWithBarcodeDetector();
          if (!detected && scanningRef.current) {
            requestAnimationFrame(scanLoop);
          }
        };
        
        scanLoop();
        return;
      } catch (err) {
        console.warn('BarcodeDetector failed, falling back to manual detection');
      }
    }

    // Fallback: Let parent know BarcodeDetector isn't available
    onError?.('BarcodeDetector not supported - please use the advanced scanner');
  }, [detectWithBarcodeDetector, onError]);

  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        });

        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          
          // Check for flash capability
          const videoTrack = stream.getVideoTracks()[0];
          const capabilities = videoTrack.getCapabilities?.() as any;
          setHasFlash(!!capabilities?.torch);
          
          // Start scanning when video is ready
          videoRef.current.onloadedmetadata = () => {
            startScanning();
          };
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Camera access denied';
        setError(errorMsg);
        onError?.(errorMsg);
      }
    };

    initCamera();

    return () => {
      stopCamera();
    };
  }, [startScanning, stopCamera, onError]);

  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Video */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
        autoPlay
      />
      
      {/* Hidden canvas for barcode detection */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Controls overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top controls */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="bg-black/50 text-white hover:bg-black/70"
          >
            <X className="h-5 w-5" />
          </Button>
          
          {hasFlash && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFlash}
              className="bg-black/50 text-white hover:bg-black/70"
            >
              {isFlashOn ? (
                <FlashlightOff className="h-5 w-5" />
              ) : (
                <Flashlight className="h-5 w-5" />
              )}
            </Button>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="absolute bottom-20 left-4 right-4 pointer-events-auto">
            <div className="bg-destructive/90 text-destructive-foreground p-4 rounded-lg text-center">
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="absolute bottom-8 left-4 right-4 pointer-events-none">
          <div className="bg-black/50 text-white p-4 rounded-lg text-center">
            <p className="text-sm">Point camera at QR code to scan automatically</p>
          </div>
        </div>
      </div>
    </div>
  );
};