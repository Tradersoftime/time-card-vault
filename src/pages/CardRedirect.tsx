import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function CardRedirect() {
  const { code } = useParams<{ code: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      // Redirect to login with next parameter pointing to claim page
      navigate(`/auth/login?next=${encodeURIComponent(`/claim?code=${code}`)}`);
    } else {
      // User is signed in, redirect to claim page
      navigate(`/claim?code=${code}`);
    }
  }, [user, loading, code, navigate]);

  return (
    <div className="min-h-screen hero-gradient flex items-center justify-center p-4">
      <div className="text-center">
        <div className="glass-panel p-8 rounded-2xl max-w-md mx-auto">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    </div>
  );
}