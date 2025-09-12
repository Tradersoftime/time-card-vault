// src/pages/QuickScan.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { MinimalCameraScanner } from '@/components/MinimalCameraScanner';
import { extractCodeOrToken, claimByCodeOrToken, feedback } from '@/lib/scan-utils';
import { useToast } from '@/hooks/use-toast';
import { Monitor, Smartphone } from 'lucide-react';

export default function QuickScan() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    // Redirect if not authenticated
    if (!user) {
      navigate('/auth/login?next=/quick-scan', { replace: true });
      return;
    }
  }, [user, navigate]);

  const handleDetected = async (text: string) => {
    if (processing) return;
    
    setProcessing(true);
    setMessage('Processing...');

    try {
      const extracted = extractCodeOrToken(text);
      if (!extracted) {
        setMessage('Invalid QR code format');
        setTimeout(() => {
          setMessage('');
          setProcessing(false);
        }, 2000);
        return;
      }

      const result = await claimByCodeOrToken(
        extracted.value,
        extracted.type,
        () => navigate('/auth/login?next=/quick-scan', { replace: true })
      );

      // Provide feedback
      feedback(result.status);

      if (result.shouldAutoClose) {
        // Success - show toast and navigate
        toast({
          title: result.status === 'claimed' ? 'Card Claimed!' : 'Already Yours',
          description: result.message,
        });
        
        // Navigate to collection with success indicator
        navigate('/me/cards?claimed=1', { replace: true });
        return;
      } else {
        // Error or card owned by someone else - show message and allow retry
        setMessage(result.message);
        setTimeout(() => {
          setMessage('');
          setProcessing(false);
        }, 3000);
      }
    } catch (error) {
      setMessage('Scan failed. Please try again.');
      feedback('error');
      setTimeout(() => {
        setMessage('');
        setProcessing(false);
      }, 2000);
    }
  };

  const handleError = (error: string) => {
    setMessage(error);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleClose = () => {
    navigate('/', { replace: true });
  };

  // Show mobile requirement message on desktop
  if (!isMobile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <Monitor className="h-16 w-16 mx-auto mb-6 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-4">Mobile Device Required</h1>
          <p className="text-muted-foreground mb-6">
            QR code scanning requires a mobile device with a camera. 
            Please use your phone to access this feature.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Smartphone className="h-4 w-4" />
            <span>Open this page on your phone</span>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while authenticating
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-48 mx-auto mb-2"></div>
            <div className="h-4 bg-muted rounded w-32 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <MinimalCameraScanner
        onDetected={handleDetected}
        onError={handleError}
        onClose={handleClose}
      />
      
      {/* Processing overlay */}
      {(processing || message) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-background/90 text-foreground p-6 rounded-lg shadow-lg max-w-sm mx-4 text-center pointer-events-auto">
            {processing && !message.includes('Processing') && (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            )}
            <p className="text-sm">{message}</p>
          </div>
        </div>
      )}
    </div>
  );
}