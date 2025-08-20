import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function Redeem() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleRedeem = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to redeem cards.",
        variant: "destructive",
      });
      return;
    }

    if (!code.trim()) {
      toast({
        title: "Code Required",
        description: "Please enter a redemption code.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('claim_card', { p_code: code.trim() });
      
      if (error) {
        throw error;
      }

      if (data?.ok) {
        toast({
          title: "Success!",
          description: "Card added to your collection!",
        });
        setCode('');
      } else if (data?.error === 'already_claimed') {
        toast({
          title: "Already Claimed",
          description: "This card has already been claimed.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Invalid Code",
          description: "The redemption code is invalid or inactive.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to redeem card.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Redeem Card</CardTitle>
            <CardDescription>
              Enter your card code to add it to your collection
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="Enter redemption code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="uppercase"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleRedeem();
                  }
                }}
              />
            </div>
            <Button 
              onClick={handleRedeem} 
              disabled={loading || !code.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Redeeming...
                </>
              ) : (
                'Redeem Card'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}