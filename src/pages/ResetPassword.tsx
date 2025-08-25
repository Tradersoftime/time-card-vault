import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function updatePwd(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    setMsg(error ? error.message : "Password updated. You can close this tab and sign in.");
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
          
          {msg && (
            <div className="mt-6 glass-panel p-4 rounded-lg border-l-4 border-l-primary">
              <div className="text-primary text-sm">{msg}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}