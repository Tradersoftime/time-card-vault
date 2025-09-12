import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X, Zap, ZapOff, Plus, Minus } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface UltraScannerProps {
  onDetected: (text: string) => void;
  onError?: (error: string) => void;
  onClose: () => void;
}

// Global type for BarcodeDetector
declare global {
  interface Window {
    BarcodeDetector?: {
      new (config?: { formats: string[] }): {
        detect(imageData: ImageBitmapSource): Promise<{ rawValue: string; }[]>;
      };
    };
  }
}

export function UltraScanner({ onDetected, onError, onClose }: UltraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);
  const detectorRef = useRef<any>(null);
  const zxingRef = useRef<any>(null);
  
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [maxZoom, setMaxZoom] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  
  const isMobile = useIsMobile();

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsReady(false);
  }, []);

  const toggleFlash = useCallback(async () => {
    if (!streamRef.current) return;
    
    try {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack && 'applyConstraints' in videoTrack) {
        await videoTrack.applyConstraints({
          advanced: [{ torch: !isFlashOn } as any]
        });
        setIsFlashOn(!isFlashOn);
      }
    } catch (err) {
      console.warn('Flash toggle failed:', err);
    }
  }, [isFlashOn]);

  const adjustZoom = useCallback(async (newZoom: number) => {
    if (!streamRef.current) return;
    
    try {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack && 'applyConstraints' in videoTrack) {
        await videoTrack.applyConstraints({
          advanced: [{ zoom: newZoom } as any]
        });
        setZoom(newZoom);
      }
    } catch (err) {
      console.warn('Zoom adjustment failed:', err);
    }
  }, []);

  const detectWithBarcodeDetector = useCallback(async () => {
    if (!detectorRef.current || !videoRef.current || !canvasRef.current) return;
    
    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      
      const codes = await detectorRef.current.detect(canvas);
      if (codes.length > 0) {
        onDetected(codes[0].rawValue);
      }
    } catch (err) {
      // Silent fail for BarcodeDetector
    }
  }, [onDetected]);

  const detectWithZXing = useCallback(async () => {
    if (!zxingRef.current || !videoRef.current || !canvasRef.current) return;
    
    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const result = await zxingRef.current.decodeFromImageData(imageData);
      
      if (result) {
        onDetected(result.text);
      }
    } catch (err) {
      // Silent fail for ZXing
    }
  }, [onDetected]);

  const scanLoop = useCallback(async () => {
    if (!scanningRef.current) return;
    
    // Try BarcodeDetector first, then ZXing
    await detectWithBarcodeDetector();
    if (scanningRef.current) {
      await detectWithZXing();
    }
    
    if (scanningRef.current) {
      requestAnimationFrame(scanLoop);
    }
  }, [detectWithBarcodeDetector, detectWithZXing]);

  const startScanning = useCallback(async () => {
    // Initialize detectors
    try {
      if (window.BarcodeDetector) {
        detectorRef.current = new window.BarcodeDetector({ formats: ['qr_code'] });
      }
    } catch (err) {
      console.warn('BarcodeDetector not available:', err);
    }
    
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      zxingRef.current = new BrowserMultiFormatReader();
    } catch (err) {
      console.warn('ZXing not available:', err);
    }
    
    scanningRef.current = true;
    requestAnimationFrame(scanLoop);
  }, [scanLoop]);

  useEffect(() => {
    const initCamera = async () => {
      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: 'environment',
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            focusMode: 'continuous',
            exposureMode: 'continuous',
            whiteBalanceMode: 'continuous'
          } as any
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          
          // Check capabilities
          const videoTrack = stream.getVideoTracks()[0];
          if (videoTrack) {
            const capabilities = videoTrack.getCapabilities?.() as any;
            
            if (capabilities?.torch) {
              setHasFlash(true);
            }
            
            if (capabilities?.zoom) {
              setMaxZoom(capabilities.zoom.max || 3);
            }
          }
          
          setIsReady(true);
          await startScanning();
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Camera access failed';
        setError(errorMsg);
        onError?.(errorMsg);
      }
    };

    initCamera();

    return () => {
      stopCamera();
    };
  }, [startScanning, stopCamera, onError]);

  if (!isMobile) {
    return (
      <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="text-center p-6">
          <h2 className="text-2xl font-semibold mb-4">Mobile Device Required</h2>
          <p className="text-muted-foreground mb-6">
            The ultra scanner is optimized for mobile devices with high-quality cameras.
            Please use your phone or tablet to scan cards.
          </p>
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Video Feed */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
          autoPlay
        />
        <canvas
          ref={canvasRef}
          className="hidden"
        />
        
        {/* Controls Overlay */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Top Controls */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-auto">
            <Button
              variant="secondary"
              size="icon"
              onClick={onClose}
              className="bg-black/50 hover:bg-black/70 text-white border-white/20"
            >
              <X className="h-6 w-6" />
            </Button>
            
            <div className="flex gap-2">
              {hasFlash && (
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={toggleFlash}
                  className="bg-black/50 hover:bg-black/70 text-white border-white/20"
                >
                  {isFlashOn ? <Zap className="h-5 w-5" /> : <ZapOff className="h-5 w-5" />}
                </Button>
              )}
            </div>
          </div>

          {/* Bottom Controls */}
          {maxZoom > 1 && (
            <div className="absolute bottom-4 left-4 right-4 pointer-events-auto">
              <div className="flex items-center justify-center gap-4 bg-black/50 rounded-lg p-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => adjustZoom(Math.max(1, zoom - 0.5))}
                  disabled={zoom <= 1}
                  className="text-white hover:bg-white/20"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                
                <span className="text-white text-sm min-w-[4ch] text-center">
                  {zoom.toFixed(1)}x
                </span>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => adjustZoom(Math.min(maxZoom, zoom + 0.5))}
                  disabled={zoom >= maxZoom}
                  className="text-white hover:bg-white/20"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Status Messages */}
          {error && (
            <div className="absolute bottom-20 left-4 right-4 pointer-events-auto">
              <div className="bg-destructive/90 text-destructive-foreground p-3 rounded-lg text-center">
                {error}
              </div>
            </div>
          )}

          {!isReady && !error && (
            <div className="absolute bottom-20 left-4 right-4 pointer-events-auto">
              <div className="bg-black/50 text-white p-3 rounded-lg text-center">
                Initializing camera...
              </div>
            </div>
          )}

          {isReady && (
            <div className="absolute bottom-20 left-4 right-4 pointer-events-auto">
              <div className="bg-primary/90 text-primary-foreground p-3 rounded-lg text-center">
                <div className="animate-pulse">🎯 Scanning for QR codes...</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}