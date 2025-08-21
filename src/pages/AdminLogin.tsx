import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

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
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Admin Sign In</h1>
      <p className="opacity-80 text-sm">Only authorized admin accounts can access the admin dashboard.</p>

      <form onSubmit={signIn} className="space-y-3">
        <input
          type="email"
          required
          placeholder="admin@yourdomain.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
        <input
          type="password"
          required
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
        <button type="submit" disabled={busy} className="border rounded px-4 py-2">
          {busy ? "Signing in…" : "Sign in as Admin"}
        </button>
      </form>

      <button onClick={sendReset} className="text-sm underline opacity-80 hover:opacity-100">
        Forgot password?
      </button>

      {msg && <div className="text-sm opacity-90">{msg}</div>}
    </div>
  );
}