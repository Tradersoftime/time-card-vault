import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Mail, Loader2, Shield, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const nextUrl = searchParams.get('next') || '/admin';

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/auth/callback${nextUrl !== '/admin' ? `?next=${encodeURIComponent(nextUrl)}` : '?next=/admin'}`;
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) throw error;

      setEmailSent(true);
      toast({
        title: "Admin magic link sent!",
        description: "Check your email for the admin sign-in link.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen hero-gradient flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="glass-panel p-8 rounded-2xl border border-destructive/20">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-destructive to-destructive/80 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="h-8 w-8 text-destructive-foreground" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Check your email</h1>
              <p className="text-muted-foreground">
                We've sent an admin magic link to <span className="text-foreground font-medium">{email}</span>
              </p>
            </div>

            <div className="space-y-4">
              <div className="glass-panel p-4 rounded-lg border-l-4 border-l-destructive">
                <p className="text-sm text-muted-foreground">
                  Click the link in your email to access the admin panel. The link will expire in 1 hour.
                </p>
              </div>

              <Button
                variant="ghost"
                onClick={() => {
                  setEmailSent(false);
                  setEmail('');
                }}
                className="w-full"
              >
                Send to different email
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen hero-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="glass-panel p-8 rounded-2xl border border-destructive/20">
          {/* Header */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center space-x-2 mb-6 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Back to home</span>
            </Link>
            <div className="w-16 h-16 bg-gradient-to-br from-destructive to-destructive/80 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-destructive-foreground" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Admin Access</h1>
            <p className="text-muted-foreground">
              Sign in with your admin email to access the control panel
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Admin Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your admin email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="glass-panel"
              />
            </div>

            <Button
              type="submit"
              variant="destructive"
              size="lg"
              className="w-full"
              disabled={loading || !email}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending admin link...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send admin magic link
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Authorized personnel only. Contact system administrator if you need access.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}