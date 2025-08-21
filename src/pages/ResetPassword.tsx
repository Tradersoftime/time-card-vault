import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Set a new password</h1>
      <form onSubmit={updatePwd} className="space-y-3">
        <input
          type="password"
          required
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
        <button type="submit" disabled={busy} className="border rounded px-4 py-2">
          {busy ? "Saving…" : "Save password"}
        </button>
      </form>
      {msg && <div className="text-sm opacity-90">{msg}</div>}
    </div>
  );
}