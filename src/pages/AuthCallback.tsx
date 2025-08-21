import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function AuthCallback() {
  const navigate = useNavigate();
  const qs = new URLSearchParams(useLocation().search);
  const next = qs.get("next") || "/";
  const mode = qs.get("mode"); // "admin" when coming from AdminLogin

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) return;

      if (mode === "admin" || next === "/admin") {
        const { data: adm } = await supabase
          .from("admins")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!adm) {
          // not an admin -> bounce to home
          navigate("/", { replace: true });
          return;
        }
      }

      navigate(next, { replace: true });
    })();
  }, [navigate, mode, next]);

  return <div className="p-8 text-center opacity-80">Finishing sign-in…</div>;
}
