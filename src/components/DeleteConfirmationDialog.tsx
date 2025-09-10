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
import { AlertTriangle, Clock } from "lucide-react";

interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  isLoading?: boolean;
  imageUrl?: string;
  cardCount?: number;
}

export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = "DELETE",
  isLoading = false,
  imageUrl,
  cardCount
}: DeleteConfirmationDialogProps) {
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
      <DialogContent className="sm:max-w-[425px]" onPointerDownOutside={(e) => e.preventDefault()}>
        {step === 'initial' && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <DialogTitle className="text-destructive">Confirm Deletion</DialogTitle>
              </div>
              <DialogDescription className="text-left space-y-2">
                <div className="font-medium">{title}</div>
                <div className="text-sm text-muted-foreground">{description}</div>
                {cardCount && cardCount > 1 && (
                  <div className="text-sm font-medium text-destructive">
                    This will delete {cardCount} card{cardCount === 1 ? '' : 's'}.
                  </div>
                )}
              </DialogDescription>
            </DialogHeader>
            
            {imageUrl && (
              <div className="flex justify-center py-4">
                <img 
                  src={imageUrl} 
                  alt="Card preview" 
                  className="h-20 w-auto rounded-lg border border-border/50"
                />
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleInitialConfirm}>
                Delete
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'confirm' && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <DialogTitle className="text-destructive">Final Confirmation Required</DialogTitle>
              </div>
              <DialogDescription className="text-left">
                This action cannot be undone. Type <strong>{confirmText}</strong> below to confirm deletion.
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
                variant="destructive"
                onClick={handleFinalConfirm}
                disabled={!isVerificationComplete || countdownActive || isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Deleting...
                  </>
                ) : (
                  'Confirm Delete'
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}