import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, Loader2 } from "lucide-react";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMsg(error.message);
      setBusy(false);
      return;
    }

    // allow only admins
    const user = data.user;
    const { data: adm } = await supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!adm) {
      await supabase.auth.signOut();
      setMsg("Not authorized as admin.");
      setBusy(false);
      return;
    }

    navigate("/admin", { replace: true });
  }

  async function sendReset() {
    if (!email) {
      setMsg("Enter your admin email first.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/auth/reset",
    });
    setMsg(error ? error.message : "Password reset email sent.");
  }

  return (
    <div className="min-h-screen hero-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="glass-panel p-8 rounded-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-destructive to-destructive/80 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-destructive-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Admin Sign In</h1>
            <p className="text-muted-foreground text-sm">
              Only authorized admin accounts can access the admin dashboard.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={signIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Admin Email</Label>
              <Input
                id="email"
                type="email"
                required
                placeholder="admin@yourdomain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="glass-panel text-foreground placeholder:text-muted-foreground"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <Input
                id="password"
                type="password"
                required
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="glass-panel text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <Button
              type="submit"
              disabled={busy}
              variant="destructive"
              size="lg"
              className="w-full"
            >
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Sign in as Admin
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={sendReset}
              className="text-muted-foreground hover:text-foreground"
            >
              Forgot password?
            </Button>
          </div>

          {msg && (
            <div className="mt-4 p-3 glass-panel rounded-lg border-l-4 border-l-destructive">
              <p className="text-sm text-foreground">{msg}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}