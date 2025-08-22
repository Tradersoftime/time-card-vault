// src/pages/CardRedirect.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function CardRedirect() {
  const { code = "" } = useParams();
  const navigate = useNavigate();
  const [msg, setMsg] = useState("Checking card…");

  useEffect(() => {
    (async () => {
      // Ensure signed in
      const { data: u } = await supabase.auth.getUser();
      const targetAfter = `/r/${encodeURIComponent(code)}`;
      if (!u?.user) {
        navigate(`/auth/login?next=${encodeURIComponent(targetAfter)}`, { replace: true });
        return;
      }

      // Try to claim first (robust RPC handles active + case-insensitive)
      const { data, error } = await supabase.rpc("claim_card", {
        p_code: code,
        p_source: "scan",
      });

      if (error) {
        setMsg(error.message);
        return;
      }

      if (!data?.ok) {
        switch (data?.error) {
          case "not_found":
            setMsg("❌ Card not found. Check the code and try again.");
            return;
          case "owned_by_other":
            setMsg("⚠️ This card has already been claimed by another user.");
            return;
          case "blocked":
            setMsg("🚫 Your account is blocked from claiming cards. Please contact support.");
            return;
          case "not_signed_in":
            // should not happen because we just checked, but handle anyway
            navigate(`/auth/login?next=${encodeURIComponent(targetAfter)}`, { replace: true });
            return;
          default:
            setMsg("Something went wrong trying to claim this card.");
            return;
        }
      }

      // Success: try to fetch a destination to bounce to; otherwise go to My Cards
      const { data: rows } = await supabase
        .from("cards")
        .select("current_target")
        .ilike("code", code)         // case-insensitive
        .limit(1);

      const dest = rows?.[0]?.current_target || null;

      if (dest) {
        // Claimed and has a target -> go there
        window.location.href = dest;
      } else {
        // Claimed, no target -> show collection
        navigate("/me/cards?claimed=1", { replace: true });
      }
    })();
  }, [code, navigate]);

  return (
    <div className="p-6 text-center opacity-90">
      {msg}
    </div>
  );
}
