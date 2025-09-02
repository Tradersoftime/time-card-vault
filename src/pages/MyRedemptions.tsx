import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { EnhancedTradingCard } from '@/components/EnhancedTradingCard';
import { ImageModal } from '@/components/ImageModal';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';

interface RedemptionCard {
  card_id: string;
  name: string;
  image_url: string;
  era: string;
  suit: string;
  rank: string;
  rarity: string;
  trader_value: string;
  time_value: number;
  decision: string;
  decided_at: string | null;
}

interface RedemptionHistory {
  id: string;
  status: string;
  submitted_at: string;
  credited_at: string | null;
  credited_amount: number | null;
  admin_notes: string | null;
  total_cards: number;
  approved_cards: number;
  rejected_cards: number;
  pending_cards: number;
  cards: RedemptionCard[];
}

export default function MyRedemptions() {
  const [redemptions, setRedemptions] = useState<RedemptionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRejectedCards, setSelectedRejectedCards] = useState<Set<string>>(new Set());
  const [selectedCard, setSelectedCard] = useState<RedemptionCard | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [resubmitting, setResubmitting] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const loadRedemptions = async () => {
    try {
      const { data, error } = await supabase.rpc('user_redemption_history');
      if (error) throw error;
      setRedemptions(data || []);
    } catch (error) {
      console.error('Error loading redemptions:', error);
      toast({
        title: "Error",
        description: "Failed to load redemption history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRedemptions();
  }, []);

  const getStatusBadge = (redemption: RedemptionHistory) => {
    if (redemption.status === 'credited') {
      if (redemption.rejected_cards > 0) {
        return <Badge variant="secondary">Partially Credited</Badge>;
      }
      return <Badge className="bg-emerald-500 text-white">Credited</Badge>;
    }
    if (redemption.status === 'rejected') {
      return <Badge variant="destructive">Rejected</Badge>;
    }
    return <Badge variant="outline">Pending</Badge>;
  };

  const toggleCardSelection = (cardId: string) => {
    const newSelection = new Set(selectedRejectedCards);
    if (newSelection.has(cardId)) {
      newSelection.delete(cardId);
    } else {
      newSelection.add(cardId);
    }
    setSelectedRejectedCards(newSelection);
  };

  const resubmitRejectedCards = async (redemptionId: string) => {
    if (selectedRejectedCards.size === 0) {
      toast({
        title: "No cards selected",
        description: "Please select cards to resubmit",
        variant: "destructive",
      });
      return;
    }

    setResubmitting(true);
    try {
      const { data, error } = await supabase.rpc('resubmit_rejected_cards', {
        p_original_redemption_id: redemptionId,
        p_card_ids: Array.from(selectedRejectedCards)
      });

      if (error) throw error;

      if (data?.ok) {
        toast({
          title: "Cards resubmitted",
          description: "Your rejected cards have been resubmitted for review",
        });
        setSelectedRejectedCards(new Set());
        loadRedemptions();
      } else {
        throw new Error(data?.error || 'Failed to resubmit');
      }
    } catch (error) {
      console.error('Error resubmitting cards:', error);
      toast({
        title: "Error",
        description: "Failed to resubmit cards",
        variant: "destructive",
      });
    } finally {
      setResubmitting(false);
    }
  };

  const handleCardClick = (card: RedemptionCard) => {
    setSelectedCard(card);
    setImageModalOpen(true);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" onClick={() => navigate('/my-cards')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to My Cards
          </Button>
          <h1 className="text-2xl font-bold">My Redemptions</h1>
        </div>
        <div className="text-center py-8">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="flex h-14 items-center gap-4 px-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/my-cards')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            My Cards
          </Button>
          <h1 className="text-lg font-semibold">My Redemptions</h1>
          <div className="ml-auto">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadRedemptions}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-2 py-4 sm:px-4">
        {redemptions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No redemption history found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {redemptions.map((redemption) => (
              <div key={redemption.id} className="space-y-3">
                {/* Compact Redemption Header */}
                <div className="sticky top-14 z-20 bg-background/95 backdrop-blur border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-sm">#{redemption.id.slice(0, 8)}</h3>
                      {getStatusBadge(redemption)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(redemption.submitted_at), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  
                  {/* Compact Stats Row */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground">{redemption.total_cards} total</span>
                      <span className="text-emerald-600">{redemption.approved_cards} ✓</span>
                      <span className="text-red-600">{redemption.rejected_cards} ✗</span>
                      {redemption.pending_cards > 0 && (
                        <span className="text-yellow-600">{redemption.pending_cards} pending</span>
                      )}
                    </div>
                    {redemption.credited_amount && (
                      <span className="text-emerald-700 font-medium">
                        {redemption.credited_amount} tokens
                      </span>
                    )}
                  </div>

                  {/* Admin Notes (if present) */}
                  {redemption.admin_notes && (
                    <div className="mt-2 p-2 bg-amber-50 rounded text-xs">
                      <span className="font-medium text-amber-700">Note: </span>
                      <span className="text-amber-600">{redemption.admin_notes}</span>
                    </div>
                  )}
                </div>

                {/* Compact Card Grid */}
                {redemption.cards && redemption.cards.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2 sm:gap-3">
                    {redemption.cards.map((card) => (
                      <div key={card.card_id} className="relative">
                        <EnhancedTradingCard
                          card={{
                            id: card.card_id,
                            name: card.name,
                            suit: card.suit,
                            rank: card.rank,
                            era: card.era,
                            rarity: card.rarity,
                            trader_value: card.trader_value,
                            time_value: card.time_value,
                            image_url: card.image_url,
                            is_claimed: true
                          }}
                          baseWidth={isMobile ? 100 : 120}
                          showFullDetails={false}
                          onClick={() => handleCardClick(card)}
                          className={`
                            cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105
                            ${card.decision === 'rejected' && selectedRejectedCards.has(card.card_id)
                              ? 'ring-2 ring-primary' 
                              : ''
                            }
                          `}
                        />
                        
                        {/* Rejection selection checkbox */}
                        {card.decision === 'rejected' && (
                          <div 
                            className="absolute top-1 left-1 z-10"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCardSelection(card.card_id);
                            }}
                          >
                            <div className={`
                              w-5 h-5 rounded border-2 cursor-pointer flex items-center justify-center
                              ${selectedRejectedCards.has(card.card_id)
                                ? 'bg-primary border-primary text-primary-foreground' 
                                : 'bg-background border-muted-foreground'
                              }
                            `}>
                              {selectedRejectedCards.has(card.card_id) && (
                                <span className="text-xs">✓</span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Status Badge */}
                        <div className="absolute top-1 right-1 z-10">
                          {card.decision === 'approved' || card.decision === 'credited' ? (
                            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                          ) : card.decision === 'rejected' ? (
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          ) : (
                            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Rejected cards resubmission section */}
                {redemption.rejected_cards > 0 && selectedRejectedCards.size > 0 && (
                  <div className="sticky bottom-4 z-20 p-3 border border-destructive/50 bg-destructive/5 backdrop-blur rounded-lg">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-destructive">
                        Resubmit {selectedRejectedCards.size} rejected cards
                      </p>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => resubmitRejectedCards(redemption.id)}
                          disabled={resubmitting}
                          size="sm"
                          className="bg-primary hover:bg-primary/90"
                        >
                          {resubmitting ? 'Resubmitting...' : 'Resubmit'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedRejectedCards(new Set())}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Image Modal */}
        {selectedCard && (
          <ImageModal
            isOpen={imageModalOpen}
            onClose={() => setImageModalOpen(false)}
            card={{
              id: selectedCard.card_id,
              name: selectedCard.name,
              suit: selectedCard.suit,
              rank: selectedCard.rank,
              era: selectedCard.era,
              rarity: selectedCard.rarity,
              trader_value: selectedCard.trader_value,
              time_value: selectedCard.time_value,
              image_url: selectedCard.image_url
            }}
          />
        )}
      </main>
    </div>
  );
}