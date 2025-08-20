import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

export default function CardRedirect() {
  const { code } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const target = `/claim?code=${encodeURIComponent(code ?? "")}`;
      if (!data.user) {
        navigate(`/auth/login?next=${encodeURIComponent(target)}`, { replace: true });
      } else {
        navigate(target, { replace: true });
      }
    })();
  }, [code, navigate]);

  return (
    <div className="p-8 text-center opacity-80">
      Checking card…
    </div>
  );
}
