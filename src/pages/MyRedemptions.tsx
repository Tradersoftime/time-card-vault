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

      <main className="container mx-auto px-4 py-6">
        {redemptions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No redemption history found.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {redemptions.map((redemption) => (
              <Card key={redemption.id} className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold">Redemption #{redemption.id.slice(0, 8)}</h3>
                      <p className="text-sm text-muted-foreground">
                        Submitted: {format(new Date(redemption.submitted_at), 'PPp')}
                      </p>
                    </div>
                    {getStatusBadge(redemption)}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="text-center p-2 bg-muted/30 rounded">
                      <div className="font-medium">{redemption.total_cards}</div>
                      <div className="text-muted-foreground text-xs">Total</div>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded">
                      <div className="font-medium text-green-700">{redemption.approved_cards}</div>
                      <div className="text-green-600 text-xs">Approved</div>
                    </div>
                    <div className="text-center p-2 bg-red-50 rounded">
                      <div className="font-medium text-red-700">{redemption.rejected_cards}</div>
                      <div className="text-red-600 text-xs">Rejected</div>
                    </div>
                    <div className="text-center p-2 bg-yellow-50 rounded">
                      <div className="font-medium text-yellow-700">{redemption.pending_cards}</div>
                      <div className="text-yellow-600 text-xs">Pending</div>
                    </div>
                  </div>

                  {redemption.credited_amount && (
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-sm font-medium text-green-700">
                        Credited: {redemption.credited_amount} time tokens
                      </p>
                      {redemption.credited_at && (
                        <p className="text-xs text-green-600">
                          {format(new Date(redemption.credited_at), 'PPp')}
                        </p>
                      )}
                    </div>
                  )}

                  {redemption.admin_notes && (
                    <div className="p-3 bg-amber-50 rounded-lg">
                      <p className="text-sm font-medium text-amber-700 mb-1">
                        Admin Notes:
                      </p>
                      <p className="text-sm text-amber-600">
                        {redemption.admin_notes}
                      </p>
                    </div>
                  )}

                  {redemption.cards && redemption.cards.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3">Cards in this redemption:</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
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
                              baseWidth={160}
                              showFullDetails={true}
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
                                className="absolute top-2 left-2 z-10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleCardSelection(card.card_id);
                                }}
                              >
                                <div className={`
                                  w-6 h-6 rounded border-2 cursor-pointer flex items-center justify-center
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
                            <div className="absolute top-2 right-2 z-10">
                              {card.decision === 'approved' || card.decision === 'credited' ? (
                                <Badge className="bg-emerald-500 text-white text-xs">
                                  Approved
                                </Badge>
                              ) : card.decision === 'rejected' ? (
                                <Badge variant="destructive" className="text-xs">
                                  Rejected
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  Pending
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rejected cards resubmission section */}
                  {redemption.rejected_cards > 0 && selectedRejectedCards.size > 0 && (
                    <div className="mt-4 p-4 border border-destructive/50 bg-destructive/5 rounded-lg">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-destructive">
                          Resubmit Selected Rejected Cards ({selectedRejectedCards.size})
                        </p>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => resubmitRejectedCards(redemption.id)}
                            disabled={resubmitting}
                            size="sm"
                            className="bg-primary hover:bg-primary/90"
                          >
                            {resubmitting ? 'Resubmitting...' : 'Resubmit Selected'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedRejectedCards(new Set())}
                          >
                            Clear Selection
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
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