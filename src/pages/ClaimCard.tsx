import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { TradingCard } from '@/components/TradingCard';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Plus, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CardPreview {
  id: string;
  code: string;
  name: string;
  suit: string;
  rank: string;
  era: string;
  image_url?: string;
  description?: string;
  is_claimed: boolean;
}

interface ClaimResponse {
  ok: boolean;
  error?: string;
}

export default function ClaimCard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [card, setCard] = useState<CardPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const code = searchParams.get('code');

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/auth/login?next=${encodeURIComponent(`/claim?code=${code}`)}`);
    }
  }, [user, authLoading, code, navigate]);

  // Load card preview
  useEffect(() => {
    if (!code || !user) return;

    const loadCardPreview = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase.rpc('card_preview', {
          p_code: code
        });

        if (error) throw error;

        if (!data || data.length === 0) {
          setError('Card not found or inactive');
          return;
        }

        setCard(data[0]);
      } catch (err: any) {
        console.error('Error loading card preview:', err);
        setError(err.message || 'Failed to load card');
      } finally {
        setLoading(false);
      }
    };

    loadCardPreview();
  }, [code, user]);

  const handleClaimCard = async () => {
    if (!code || !card) return;

    setClaiming(true);
    try {
      const { data, error } = await supabase.rpc('claim_card', {
        p_code: code
      });

      if (error) throw error;

      const result = data as unknown as ClaimResponse;

      if (result?.ok) {
        toast({
          title: "Card claimed!",
          description: `${card.name} has been added to your collection.`,
        });
        setCard(prev => prev ? { ...prev, is_claimed: true } : null);
      } else {
        const errorMessage = result?.error || 'Failed to claim card';
        if (errorMessage === 'already_claimed') {
          toast({
            title: "Already claimed",
            description: "This card is already in your collection.",
            variant: "destructive",
          });
          setCard(prev => prev ? { ...prev, is_claimed: true } : null);
        } else {
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
          });
        }
      }
    } catch (err: any) {
      console.error('Error claiming card:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to claim card",
        variant: "destructive",
      });
    } finally {
      setClaiming(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen hero-gradient flex items-center justify-center p-4">
        <div className="text-center">
          <div className="glass-panel p-8 rounded-2xl max-w-md mx-auto">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading card...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen hero-gradient flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="glass-panel p-8 rounded-2xl text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Card Not Found</h1>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Link to="/">
              <Button variant="hero">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!card) return null;

  return (
    <div className="min-h-screen hero-gradient">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link 
              to="/me/cards" 
              className="inline-flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Back to Collection</span>
            </Link>
            <h1 className="text-3xl font-bold">
              {card.is_claimed ? 'Card Already Claimed' : 'Claim Your Card'}
            </h1>
            <p className="text-muted-foreground mt-2">
              {card.is_claimed 
                ? 'This card is already in your collection.' 
                : 'Add this card to your digital collection.'
              }
            </p>
          </div>

          {/* Card Display */}
          <div className="glass-panel p-8 rounded-2xl">
            <div className="flex flex-col lg:flex-row gap-8 items-center">
              {/* Card Preview */}
              <div className="flex-shrink-0">
                <TradingCard 
                  card={card} 
                  size="lg" 
                  showClaimedBadge={card.is_claimed}
                />
              </div>

              {/* Card Details */}
              <div className="flex-1 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{card.name}</h2>
                  <p className="text-muted-foreground">
                    {card.suit} {card.rank} • {card.era}
                  </p>
                </div>

                {card.description && (
                  <div>
                    <h3 className="font-semibold mb-2">Description</h3>
                    <p className="text-muted-foreground">{card.description}</p>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold mb-2">Card Code</h3>
                  <code className="bg-muted px-3 py-1 rounded text-sm">{card.code}</code>
                </div>

                {/* Action Button */}
                <div className="pt-4">
                  {card.is_claimed ? (
                    <div className="flex items-center space-x-2 text-primary">
                      <Check className="h-5 w-5" />
                      <span className="font-medium">Already in your collection</span>
                    </div>
                  ) : (
                    <Button
                      onClick={handleClaimCard}
                      disabled={claiming}
                      variant="hero"
                      size="lg"
                      className="w-full lg:w-auto"
                    >
                      {claiming ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Claiming...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Add to My Collection
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          {card.is_claimed && (
            <div className="mt-8 glass-panel p-6 rounded-xl">
              <h3 className="font-semibold mb-4">What's Next?</h3>
              <div className="space-y-3">
                <Link to="/me/cards">
                  <Button variant="ghost" className="w-full justify-start">
                    View your complete collection
                  </Button>
                </Link>
                <Button variant="ghost" className="w-full justify-start">
                  Scan another card
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}