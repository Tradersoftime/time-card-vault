import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function CardRedirect() {
  const { code } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const target = `/claim?code=${encodeURIComponent(code ?? "")}`;
      if (!mounted) return;
      navigate(
        data.user ? target : `/auth/login?next=${encodeURIComponent(target)}`,
        { replace: true }
      );
    })();
    return () => {
      mounted = false;
    };
  }, [code, navigate]);

  return <div className="p-8 text-center opacity-80">Checking card…</div>;
}
