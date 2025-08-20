import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(<App />);
// --- Inline RedirectByCode page (temporary) ---
import { createClient } from '@supabase/supabase-js';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const supabase_inline = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

function RedirectByCode() {
  const { code } = useParams();
  const nav = useNavigate();

  useEffect(() => {
    (async () => {
      const { data } = await supabase_inline.auth.getUser();
      const target = `/claim?code=${encodeURIComponent(code ?? '')}`;
      if (!data.user) {
        nav(`/auth/login?next=${encodeURIComponent(target)}`, { replace: true });
      } else {
        nav(target, { replace: true });
      }
    })();
  }, [code, nav]);

  return <div className="p-6 text-center opacity-80">Checking card…</div>;
}
// --- end inline page ---
