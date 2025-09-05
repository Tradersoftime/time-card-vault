import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export default function ClaimToken() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [msg, setMsg] = useState("Checking token...");
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setMsg("❌ No token provided");
      return;
    }

    (async () => {
      // Ensure signed in
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) {
        navigate(`/auth/login?next=${encodeURIComponent(`/claim?token=${token}`)}`, { replace: true });
        return;
      }

      // Try to claim using the token
      const { data, error } = await supabase.rpc("claim_card_by_token", {
        p_token: token,
      });

      if (error) {
        console.error("Claim error:", error);
        setMsg(`❌ Error: ${error.message}`);
        return;
      }

      if (!data?.ok) {
        switch (data?.error) {
          case "token_not_found":
            setMsg("❌ Invalid or expired token. This card may no longer be available.");
            return;
          case "already_claimed_by_other":
            setMsg("⚠️ This card has already been claimed by another user.");
            return;
          case "blocked":
            setMsg("🚫 Your account is blocked from claiming cards. Please contact support.");
            return;
          case "not_authenticated":
            navigate(`/auth/login?next=${encodeURIComponent(`/claim?token=${token}`)}`, { replace: true });
            return;
          default:
            setMsg("Something went wrong trying to claim this card.");
            return;
        }
      }

      // Success or already claimed by this user
      if (data?.already_claimed_by_you) {
        setMsg("✅ You have already claimed this card!");
        setTimeout(() => navigate("/me/cards", { replace: true }), 2000);
      } else {
        setMsg("🎉 Card claimed successfully!");
        setTimeout(() => navigate("/me/cards?claimed=1", { replace: true }), 2000);
      }
    })();
  }, [token, navigate]);

  return (
    <div className="min-h-screen hero-gradient flex items-center justify-center p-6">
      <div className="glass-panel p-8 rounded-2xl text-center max-w-md">
        <div className="mb-6">
          <LoadingSpinner />
        </div>
        <div className="text-foreground text-lg">{msg}</div>
        {msg.includes("successfully") && (
          <div className="text-muted-foreground text-sm mt-2">
            Redirecting to your collection...
          </div>
        )}
      </div>
    </div>
  );
}