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

      // Require login
      const { data: u } = await supabase.auth.getUser();
      const target = `${window.location.pathname}${window.location.search}`;
      if (!u?.user) {
        navigate(`/auth/login?next=${encodeURIComponent(target)}`, { replace: true });
        return;
      }

      // Look up the card to get current_target (for post-claim redirect)
      const { data: card, error: cardErr } = await supabase
        .from("cards")
        .select("id,current_target,status")
        .eq("code", code)
        .maybeSingle();

      if (!mounted) return;

      if (cardErr || !card) {
        setMsg("Card not found.");
        return;
      }
      if (card.status !== "active") {
        setMsg("This card is not active yet.");
        return;
      }

      setMsg("Claiming this card for your collection…");

      // Auto-claim
      const { data, error } = await supabase.rpc("claim_card", { p_code: code });
      if (!mounted) return;

      if (error) {
        setMsg(error.message);
        return;
      }

      // ok or already owned by this user => success
      const success = data?.ok || data?.already_owned;
      if (success) {
        // If admin set a destination, go there after claim
        const dest = card.current_target?.trim();
        if (dest) {
          window.location.href = dest;
          return;
        }
        // Otherwise go to collection with a “just claimed” flag
        navigate("/me/cards?claimed=1", { replace: true });
        return;
      }

      if (data?.error === "claimed_by_other") {
        setMsg("⚠️ This card has already been claimed by another user.");
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
