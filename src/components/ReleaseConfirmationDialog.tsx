import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Clock, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ReleaseConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  cardName: string;
  confirmText?: string;
  isLoading?: boolean;
  imageUrl?: string;
  isPending?: boolean;
  isCredited?: boolean;
}

export function ReleaseConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  cardName,
  confirmText = "RELEASE",
  isLoading = false,
  imageUrl,
  isPending = false,
  isCredited = false
}: ReleaseConfirmationDialogProps) {
  const [step, setStep] = useState<'initial' | 'confirm'>('initial');
  const [verification, setVerification] = useState('');
  const [countdown, setCountdown] = useState(3);
  const [countdownActive, setCountdownActive] = useState(false);

  const handleInitialConfirm = () => {
    setStep('confirm');
    setCountdownActive(true);
    setCountdown(3);
    
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCountdownActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleFinalConfirm = () => {
    if (verification.toUpperCase() === confirmText.toUpperCase() && !countdownActive) {
      onConfirm();
      handleClose();
    }
  };

  const handleClose = () => {
    setStep('initial');
    setVerification('');
    setCountdown(3);
    setCountdownActive(false);
    onOpenChange(false);
  };

  const isVerificationComplete = verification.toUpperCase() === confirmText.toUpperCase();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]" onPointerDownOutside={(e) => e.preventDefault()}>
        {step === 'initial' && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-primary/10">
                  <Send className="h-5 w-5 text-primary" />
                </div>
                <DialogTitle>Release Card to Wild</DialogTitle>
              </div>
              <DialogDescription className="text-left space-y-3 pt-2">
                <div className="font-medium text-foreground">
                  Release "{cardName}"?
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong>This card will become available for anyone to scan and claim.</strong>
                    </div>
                  </div>
                  
                  {isCredited && (
                    <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                      <div className="font-medium text-success mb-1">✓ TIME Already Credited</div>
                      <div className="text-xs text-muted-foreground">
                        You've already received TIME rewards for this card. The new owner cannot submit it again for TIME.
                      </div>
                    </div>
                  )}
                  
                  {isPending && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <div className="font-medium text-destructive mb-1">⚠ Pending Redemption</div>
                      <div className="text-xs text-muted-foreground">
                        This card cannot be released while it has a pending TIME redemption. Please wait for admin review.
                      </div>
                    </div>
                  )}

                  {!isCredited && !isPending && (
                    <div className="p-3 rounded-lg bg-muted/50 border border-border">
                      <div className="text-xs text-muted-foreground">
                        <strong>What happens next:</strong>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                          <li>Card ownership transfers to whoever scans it next</li>
                          <li>You lose access to this card permanently</li>
                          <li>Card history and redemption records are preserved</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </DialogDescription>
            </DialogHeader>
            
            {imageUrl && (
              <div className="flex justify-center py-3">
                <img 
                  src={imageUrl} 
                  alt="Card preview" 
                  className="h-24 w-auto rounded-lg border border-border/50"
                />
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                variant="default" 
                onClick={handleInitialConfirm}
                disabled={isPending}
                className="bg-gradient-to-r from-primary to-primary-glow"
              >
                <Send className="h-4 w-4 mr-2" />
                Release to Wild
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'confirm' && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-primary/10">
                  <AlertTriangle className="h-5 w-5 text-primary" />
                </div>
                <DialogTitle>Final Confirmation Required</DialogTitle>
              </div>
              <DialogDescription className="text-left">
                This action cannot be undone. Type <strong>{confirmText}</strong> below to confirm release.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="verification" className="text-sm font-medium">
                  Type "{confirmText}" to confirm:
                </Label>
                <Input
                  id="verification"
                  value={verification}
                  onChange={(e) => setVerification(e.target.value)}
                  placeholder={confirmText}
                  className="text-center font-mono"
                  autoFocus
                />
              </div>

              {countdownActive && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Please wait {countdown} second{countdown === 1 ? '' : 's'}...</span>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleFinalConfirm}
                disabled={!isVerificationComplete || countdownActive || isLoading}
                className="bg-gradient-to-r from-primary to-primary-glow"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Releasing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Confirm Release
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
