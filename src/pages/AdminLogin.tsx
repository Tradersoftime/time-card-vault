import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);

    const emailRedirectTo =
      window.location.origin + "/auth/callback?next=/admin&mode=admin";

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo },
    });

    setBusy(false);
    setMsg(error ? error.message : "Check your email for the admin sign-in link.");
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Admin Sign In</h1>
      <p className="opacity-80 text-sm">
        Only authorized admin accounts can access the admin dashboard.
      </p>
      <form onSubmit={sendLink} className="space-y-3">
        <input
          type="email"
          required
          placeholder="admin@yourdomain.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
        <button type="submit" disabled={busy} className="border rounded px-4 py-2">
          {busy ? "Sending…" : "Send admin link"}
        </button>
      </form>
      {msg && <div className="text-sm opacity-90">{msg}</div>}
    </div>
  );
}