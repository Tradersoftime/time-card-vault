import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function CardRedirect() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [msg, setMsg] = useState("Checking card…");

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!code) return;

      // 1) Require login
      const { data: u } = await supabase.auth.getUser();
      const target = `${window.location.pathname}${window.location.search}`;
      if (!u?.user) {
        navigate(`/auth/login?next=${encodeURIComponent(target)}`, { replace: true });
        return;
      }

      setMsg("Claiming this card for your collection…");

      // 2) Auto-claim
      const { data, error } = await supabase.rpc("claim_card", { p_code: code });

      if (!mounted) return;

      if (error) {
        setMsg(error.message);
        return;
      }

      // Expect data like: { ok: true } or { ok:false, error:'claimed_by_other' } etc.
      if (data?.ok) {
        navigate("/me/cards?claimed=1", { replace: true });
        return;
      }

      if (data?.error === "claimed_by_other") {
        setMsg("⚠️ This card has already been claimed by another user.");
        return;
      }

      if (data?.error === "inactive") {
        setMsg("This card is not active yet.");
        return;
      }

      if (data?.error === "not_found") {
        setMsg("Card not found. Double-check the code.");
        return;
      }

      // already_owned -> treat as success
      if (data?.already_owned) {
        navigate("/me/cards", { replace: true });
        return;
      }

      setMsg("Something went wrong. Please try again.");
    })();

    return () => { mounted = false; };
  }, [code, navigate]);

  return (
    <div className="p-8 text-center opacity-80">
      {msg}
      <div className="mt-4">
        <button onClick={() => navigate("/", { replace: true })} className="border rounded px-3 py-1">
          Go Home
        </button>
      </div>
    </div>
  );
}
