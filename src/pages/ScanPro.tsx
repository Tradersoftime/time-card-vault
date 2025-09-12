import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UltraScanner } from '@/components/UltraScanner';
import { extractCodeOrToken, claimByCodeOrToken, feedback } from '@/lib/scan-utils';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle, XCircle, Clock, Zap } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface ScanSession {
  id: string;
  timestamp: number;
  code: string;
  status: 'success' | 'already_owned' | 'error' | 'not_found';
  message: string;
  cardName?: string;
}

export default function ScanPro() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [isScanning, setIsScanning] = useState(false);
  const [scanSession, setScanSession] = useState<ScanSession[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { replace: true });
    }
  }, [user, loading, navigate]);

  const addToSession = (session: ScanSession) => {
    setScanSession(prev => [session, ...prev.slice(0, 9)]); // Keep last 10
  };

  const handleDetected = async (text: string) => {
    if (isProcessing) return; // Prevent double processing
    
    setIsProcessing(true);
    setProcessingMessage('Processing...');

    try {
      const extracted = extractCodeOrToken(text);
      if (!extracted) {
        addToSession({
          id: Date.now().toString(),
          timestamp: Date.now(),
          code: text.slice(0, 20) + '...',
          status: 'error',
          message: 'Invalid QR code format'
        });
        feedback('error');
        setProcessingMessage('');
        setIsProcessing(false);
        return;
      }

      setProcessingMessage('Claiming card...');
      
      const result = await claimByCodeOrToken(
        extracted.value,
        extracted.type,
        () => navigate('/login')
      );

      const sessionEntry: ScanSession = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        code: extracted.value,
        status: result.success ? 
          (result.status === 'already_owner' ? 'already_owned' : 'success') : 
          (result.status === 'not_found' ? 'not_found' : 'error'),
        message: result.message,
        cardName: result.card?.name
      };

      addToSession(sessionEntry);
      feedback(result.status);

      if (result.success) {
        toast({
          title: result.status === 'already_owner' ? 'Already in Collection' : 'Card Claimed!',
          description: result.card?.name ? `${result.card.name} - ${result.message}` : result.message,
        });
      } else {
        toast({
          title: 'Scan Result',
          description: result.message,
          variant: result.status === 'not_found' ? 'default' : 'destructive'
        });
      }

    } catch (error) {
      addToSession({
        id: Date.now().toString(),
        timestamp: Date.now(),
        code: text.slice(0, 20) + '...',
        status: 'error',
        message: 'Failed to process scan'
      });
      feedback('error');
      
      toast({
        title: 'Scan Error',
        description: 'Failed to process the scanned code',
        variant: 'destructive'
      });
    }

    setProcessingMessage('');
    setIsProcessing(false);
  };

  const handleError = (error: string) => {
    toast({
      title: 'Scanner Error',
      description: error,
      variant: 'destructive'
    });
  };

  const handleClose = () => {
    setIsScanning(false);
  };

  const getStatusIcon = (status: ScanSession['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'already_owned': return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'not_found': return <XCircle className="h-4 w-4 text-orange-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isMobile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">Pro Scanner</h1>
          <p className="text-muted-foreground mb-6">
            The Pro Scanner is optimized for mobile devices. Please use your phone or tablet for the best scanning experience.
          </p>
          <Button variant="outline" onClick={() => navigate('/')} className="w-full">
            Back to Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Scanner Interface */}
      {isScanning && (
        <UltraScanner
          onDetected={handleDetected}
          onError={handleError}
          onClose={handleClose}
        />
      )}

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center">
          <Card className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm">{processingMessage}</p>
          </Card>
        </div>
      )}

      {/* Main Interface */}
      {!isScanning && (
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Pro Scanner</h1>
            <p className="text-muted-foreground">
              High-resolution scanning optimized for small QR codes
            </p>
          </div>

          {/* Start Scanning Button */}
          <div className="text-center">
            <Button
              onClick={() => setIsScanning(true)}
              size="lg"
              className="w-full max-w-sm"
            >
              <Zap className="h-5 w-5 mr-2" />
              Start Scanning
            </Button>
          </div>

          {/* Quick Stats */}
          {scanSession.length > 0 && (
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Session Stats</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500">
                    {scanSession.filter(s => s.status === 'success').length}
                  </div>
                  <div className="text-muted-foreground">Claimed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {scanSession.length}
                  </div>
                  <div className="text-muted-foreground">Total Scans</div>
                </div>
              </div>
            </Card>
          )}

          {/* Recent Scans */}
          {scanSession.length > 0 && (
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Recent Scans</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {scanSession.map((scan) => (
                  <div key={scan.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                    {getStatusIcon(scan.status)}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {scan.cardName || scan.code}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {scan.message}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {new Date(scan.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Instructions */}
          <Card className="p-4">
            <h3 className="font-semibold mb-2">Tips for Best Results</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Hold your device steady and close to the card</li>
              <li>• Ensure good lighting or use the flash</li>
              <li>• The scanner works continuously - no need to tap</li>
              <li>• Use zoom for very small QR codes</li>
              <li>• Keep scanning to claim multiple cards</li>
            </ul>
          </Card>

          {/* Navigation */}
          <div className="space-y-3">
            <Button 
              variant="outline" 
              onClick={() => navigate('/me/cards')} 
              className="w-full"
            >
              View My Collection
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')} 
              className="w-full"
            >
              Back to Home
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}