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
    <div className="container mx-auto p-4">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="sm" onClick={() => navigate('/my-cards')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to My Cards
        </Button>
        <h1 className="text-2xl font-bold">My Redemptions</h1>
        <Button variant="outline" size="sm" onClick={loadRedemptions}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {redemptions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No redemptions found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {redemptions.map((redemption) => (
            <Card key={redemption.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-3">
                      Redemption #{redemption.id.slice(0, 8)}
                      {getStatusBadge(redemption)}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Submitted {format(new Date(redemption.submitted_at), 'PPp')}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">
                      {redemption.total_cards} cards total
                    </div>
                    {redemption.approved_cards > 0 && (
                      <div className="text-sm text-emerald-600">
                        {redemption.approved_cards} approved
                      </div>
                    )}
                    {redemption.rejected_cards > 0 && (
                      <div className="text-sm text-red-600">
                        {redemption.rejected_cards} rejected
                      </div>
                    )}
                    {redemption.pending_cards > 0 && (
                      <div className="text-sm text-amber-600">
                        {redemption.pending_cards} pending
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {redemption.credited_amount && (
                  <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950 rounded-lg">
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                      Credited: {redemption.credited_amount} time tokens
                    </p>
                    {redemption.credited_at && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">
                        {format(new Date(redemption.credited_at), 'PPp')}
                      </p>
                    )}
                  </div>
                )}

                {redemption.admin_notes && (
                  <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-1">
                      Admin Notes:
                    </p>
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      {redemption.admin_notes}
                    </p>
                  </div>
                )}

                <div className={`grid gap-4 ${
                  isMobile ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
                }`}>
                  {redemption.cards.map((card) => (
                    <div key={card.card_id} className="relative">
                      {/* Selection checkbox for rejected cards */}
                      {card.decision === 'rejected' && (
                        <div className="absolute top-2 left-2 z-20">
                          <input
                            type="checkbox"
                            checked={selectedRejectedCards.has(card.card_id)}
                            onChange={() => toggleCardSelection(card.card_id)}
                            className="w-4 h-4 bg-background/80 border-2 border-primary rounded"
                          />
                        </div>
                      )}
                      
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
                        baseWidth={isMobile ? 150 : 180}
                        showFullDetails={true}
                        onClick={() => handleCardClick(card)}
                        className={`${
                          card.decision === 'rejected' && selectedRejectedCards.has(card.card_id)
                            ? 'ring-2 ring-primary'
                            : ''
                        }`}
                      />

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

                {redemption.rejected_cards > 0 && (
                  <>
                    <Separator className="my-4" />
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Click rejected cards to select them for resubmission
                        {selectedRejectedCards.size > 0 && 
                          ` (${selectedRejectedCards.size} selected)`
                        }
                      </p>
                      <Button
                        onClick={() => resubmitRejectedCards(redemption.id)}
                        disabled={selectedRejectedCards.size === 0 || resubmitting}
                        size="sm"
                      >
                        {resubmitting ? 'Resubmitting...' : 'Resubmit Selected'}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
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
    </div>
  );
}