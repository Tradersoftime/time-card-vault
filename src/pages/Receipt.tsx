import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Download, Home, Calendar, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ReceiptCard {
  id: string;
  name: string;
  suit: string;
  rank: string;
  rarity: string;
  trader_value: number;
  image_url: string;
}

interface ReceiptData {
  id: string;
  created_at: string;
  total_value: number;
  status: string;
  cards: ReceiptCard[];
}

export default function Receipt() {
  const { receiptId } = useParams();
  const { user } = useAuth();
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!receiptId) return;
    
    const fetchReceipt = async () => {
      try {
        // Fetch redemption details with cards
        const { data, error } = await supabase
          .from('redemptions')
          .select(`
            id,
            created_at,
            total_value,
            status,
            redemption_cards (
              cards (
                id,
                name,
                suit,
                rank,
                rarity,
                trader_value,
                image_url
              )
            )
          `)
          .eq('id', receiptId)
          .single();

        if (error) throw error;

        // Transform the data to match our interface
        const transformedData: ReceiptData = {
          id: data.id,
          created_at: data.created_at,
          total_value: data.total_value,
          status: data.status,
          cards: data.redemption_cards.map((rc: any) => rc.cards)
        };

        setReceipt(transformedData);
      } catch (err) {
        console.error('Error fetching receipt:', err);
        setError('Failed to load receipt details');
      } finally {
        setLoading(false);
      }
    };

    fetchReceipt();
  }, [receiptId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading receipt...</p>
        </div>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error || 'Receipt not found'}</p>
          <Link to="/me/cards">
            <Button variant="outline">
              <Home className="mr-2 h-4 w-4" />
              Back to Collection
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-primary-glow rounded-full mb-4">
            <CheckCircle className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold mb-2">
            <span className="gradient-text">Submission Complete!</span>
          </h1>
          <p className="text-muted-foreground">
            Your cards have been successfully submitted for TIME evaluation
          </p>
        </div>

        {/* Receipt Card */}
        <Card className="card-premium p-6 mb-6">
          {/* Receipt Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold mb-1">Receipt</h2>
              <p className="text-sm text-muted-foreground">#{receipt.id.slice(0, 8)}</p>
            </div>
            <Badge variant={receipt.status === 'pending' ? 'secondary' : 'default'}>
              {receipt.status}
            </Badge>
          </div>

          {/* Date and Total */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Submitted</p>
                <p className="font-medium">{formatDate(receipt.created_at)}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="font-bold text-primary">{receipt.total_value} TIME</p>
              </div>
            </div>
          </div>

          <Separator className="mb-6" />

          {/* Cards List */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Cards Submitted ({receipt.cards.length})
            </h3>
            
            {receipt.cards.map((card) => (
              <div key={card.id} className="flex items-center space-x-4 p-3 rounded-lg bg-muted/20">
                <img 
                  src={card.image_url} 
                  alt={card.name}
                  className="w-12 h-16 object-cover rounded-md"
                />
                <div className="flex-1">
                  <h4 className="font-medium">{card.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {card.suit} • {card.rank} • {card.rarity}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{card.trader_value} TIME</p>
                </div>
              </div>
            ))}
          </div>

          <Separator className="my-6" />

          {/* Total */}
          <div className="flex justify-between items-center text-lg font-bold">
            <span>Total</span>
            <span className="text-primary">{receipt.total_value} TIME</span>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button variant="outline" className="flex-1">
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
          <Link to="/me/cards" className="flex-1">
            <Button className="w-full">
              <Home className="mr-2 h-4 w-4" />
              Back to Collection
            </Button>
          </Link>
        </div>

        {/* Additional Info */}
        <div className="mt-8 p-4 glass-panel rounded-lg">
          <h3 className="font-semibold mb-2">What happens next?</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Your cards are being evaluated by our TIME assessment team</li>
            <li>• You'll receive your TIME tokens within 2-3 business days</li>
            <li>• Check your email for detailed evaluation results</li>
            <li>• Track your submission status in your collection</li>
          </ul>
        </div>
      </div>
    </div>
  );
}