import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { toast } from "@/hooks/use-toast";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setSessionReady(true);
        setError(null);
      } else if (event === "SIGNED_IN" && session) {
        // Session established from URL token
        setSessionReady(true);
        setError(null);
      }
    });

    // Check if we already have a session (user may have refreshed the page)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      }
    });

    // Set a timeout to show error if no session is established
    const timeout = setTimeout(() => {
      if (!sessionReady) {
        setError("This password reset link is invalid or has expired. Please request a new one.");
      }
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [sessionReady]);

  async function updatePwd(e: React.FormEvent) {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive"
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters.",
        variant: "destructive"
      });
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (error) {
      toast({
        title: "Error updating password",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Password updated!",
        description: "You can now sign in with your new password."
      });
      // Sign out and redirect to login
      await supabase.auth.signOut();
      navigate("/login");
    }
  }

  // Show loading while waiting for session
  if (!sessionReady && !error) {
    return (
      <div className="min-h-screen hero-gradient flex items-center justify-center p-6">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying your reset link...</p>
        </div>
      </div>
    );
  }

  // Show error if link is invalid/expired
  if (error) {
    return (
      <div className="min-h-screen hero-gradient flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="glass-panel p-8 rounded-2xl">
            <h1 className="text-2xl font-bold text-destructive mb-4">Link Expired</h1>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => navigate("/login")} className="w-full">
              Back to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen hero-gradient flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent mb-2">
            Set New Password
          </h1>
          <p className="text-muted-foreground">Create a secure password for your account</p>
        </div>
        
        <div className="glass-panel p-8 rounded-2xl">
          <form onSubmit={updatePwd} className="space-y-6">
            <div>
              <Input
                type="password"
                required
                placeholder="Enter your new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="glass-panel border-muted/30 focus:border-primary"
                minLength={6}
              />
            </div>
            <div>
              <Input
                type="password"
                required
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="glass-panel border-muted/30 focus:border-primary"
                minLength={6}
              />
            </div>
            <Button 
              type="submit" 
              disabled={busy} 
              className="w-full py-3 bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-semibold hover:opacity-90 transition-opacity glow-primary"
            >
              {busy ? "Saving Password..." : "Save New Password"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
