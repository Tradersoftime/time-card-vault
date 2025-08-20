import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CreditCard } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }

        if (data.session) {
          const nextUrl = searchParams.get('next') || '/';
          toast({
            title: "Welcome!",
            description: "You've been signed in successfully.",
          });
          navigate(nextUrl);
        } else {
          // Handle the case where there's no session (e.g., expired link)
          toast({
            title: "Sign in failed",
            description: "The link may have expired. Please try again.",
            variant: "destructive",
          });
          navigate('/auth/login');
        }
      } catch (error: any) {
        console.error('Auth callback error:', error);
        toast({
          title: "Authentication error",
          description: error.message || "Something went wrong during sign in.",
          variant: "destructive",
        });
        navigate('/auth/login');
      }
    };

    handleAuthCallback();
  }, [navigate, searchParams, toast]);

  return (
    <div className="min-h-screen hero-gradient flex items-center justify-center p-4">
      <div className="text-center">
        <div className="glass-panel p-8 rounded-2xl max-w-md mx-auto">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-glow rounded-full flex items-center justify-center mx-auto mb-6">
            <CreditCard className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-4">Signing you in...</h1>
          <div className="flex items-center justify-center space-x-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Please wait while we verify your account</span>
          </div>
        </div>
      </div>
    </div>
  );
}