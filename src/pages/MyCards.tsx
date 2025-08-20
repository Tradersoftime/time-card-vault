import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { TradingCard } from '@/components/TradingCard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Scan, Package, Loader2 } from 'lucide-react';

interface UserCard {
  id: string;
  claimed_at: string;
  cards: {
    id: string;
    name: string;
    suit: string;
    rank: string;
    era: string;
    image_url?: string;
    description?: string;
  }[];
}

export default function MyCards() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [cards, setCards] = useState<UserCard[]>([]);
  const [filteredCards, setFilteredCards] = useState<UserCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSuit, setSelectedSuit] = useState<string>('all');
  const [selectedEra, setSelectedEra] = useState<string>('all');

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth/login');
    }
  }, [user, authLoading, navigate]);

  // Load user's cards
  useEffect(() => {
    if (!user) return;

    const loadCards = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('user_cards')
          .select(`
            id,
            claimed_at,
            cards!inner (
              id,
              name,
              suit,
              rank,
              era,
              image_url,
              description
            )
          `)
          .order('claimed_at', { ascending: false });

        if (error) throw error;

        setCards(data || []);
      } catch (err: any) {
        console.error('Error loading cards:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCards();
  }, [user]);

  // Filter cards
  useEffect(() => {
    let filtered = cards;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(userCard =>
        userCard.cards[0]?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        userCard.cards[0]?.suit.toLowerCase().includes(searchTerm.toLowerCase()) ||
        userCard.cards[0]?.rank.toLowerCase().includes(searchTerm.toLowerCase()) ||
        userCard.cards[0]?.era.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Suit filter
    if (selectedSuit !== 'all') {
      filtered = filtered.filter(userCard =>
        userCard.cards[0]?.suit.toLowerCase() === selectedSuit.toLowerCase()
      );
    }

    // Era filter
    if (selectedEra !== 'all') {
      filtered = filtered.filter(userCard =>
        userCard.cards[0]?.era.toLowerCase() === selectedEra.toLowerCase()
      );
    }

    setFilteredCards(filtered);
  }, [cards, searchTerm, selectedSuit, selectedEra]);

  // Get unique values for filters
  const uniqueSuits = [...new Set(cards.map(card => card.cards[0]?.suit).filter(Boolean))];
  const uniqueEras = [...new Set(cards.map(card => card.cards[0]?.era).filter(Boolean))];

  if (authLoading || loading) {
    return (
      <div className="min-h-screen hero-gradient flex items-center justify-center p-4">
        <div className="text-center">
          <div className="glass-panel p-8 rounded-2xl max-w-md mx-auto">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading your collection...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen hero-gradient">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">My Collection</h1>
              <p className="text-muted-foreground">
                You have <span className="text-foreground font-semibold">{cards.length}</span> cards
              </p>
            </div>
            <Button variant="hero" className="w-full sm:w-auto">
              <Scan className="mr-2 h-4 w-4" />
              Scan New Card
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="glass-panel p-6 rounded-xl">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search cards..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filters */}
              <div className="flex gap-2">
                <select
                  value={selectedSuit}
                  onChange={(e) => setSelectedSuit(e.target.value)}
                  className="px-3 py-2 rounded-md border border-input bg-background text-sm"
                >
                  <option value="all">All Suits</option>
                  {uniqueSuits.map(suit => (
                    <option key={suit} value={suit}>{suit}</option>
                  ))}
                </select>

                <select
                  value={selectedEra}
                  onChange={(e) => setSelectedEra(e.target.value)}
                  className="px-3 py-2 rounded-md border border-input bg-background text-sm"
                >
                  <option value="all">All Eras</option>
                  {uniqueEras.map(era => (
                    <option key={era} value={era}>{era}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active Filters */}
            {(searchTerm || selectedSuit !== 'all' || selectedEra !== 'all') && (
              <div className="flex flex-wrap gap-2 mt-4">
                {searchTerm && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Search: {searchTerm}
                    <button 
                      onClick={() => setSearchTerm('')}
                      className="ml-1 hover:text-foreground"
                    >
                      ×
                    </button>
                  </Badge>
                )}
                {selectedSuit !== 'all' && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Suit: {selectedSuit}
                    <button 
                      onClick={() => setSelectedSuit('all')}
                      className="ml-1 hover:text-foreground"
                    >
                      ×
                    </button>
                  </Badge>
                )}
                {selectedEra !== 'all' && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Era: {selectedEra}
                    <button 
                      onClick={() => setSelectedEra('all')}
                      className="ml-1 hover:text-foreground"
                    >
                      ×
                    </button>
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Cards Grid */}
        {filteredCards.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl text-center">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {cards.length === 0 ? 'No cards yet' : 'No cards match your filters'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {cards.length === 0 
                ? 'Scan your first physical card to get started building your collection.'
                : 'Try adjusting your search or filter criteria.'
              }
            </p>
            {cards.length === 0 && (
              <Button variant="hero">
                <Scan className="mr-2 h-4 w-4" />
                Scan Your First Card
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredCards.map((userCard) => (
              <div key={userCard.id} className="relative">
                <TradingCard 
                  card={{
                    ...userCard.cards[0],
                    is_claimed: true
                  }}
                  size="sm"
                  showClaimedBadge={false}
                />
                <div className="mt-2 text-center">
                  <p className="text-xs text-muted-foreground">
                    Claimed {new Date(userCard.claimed_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats Footer */}
        {cards.length > 0 && (
          <div className="mt-12 glass-panel p-6 rounded-xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">{cards.length}</div>
                <div className="text-sm text-muted-foreground">Total Cards</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">{uniqueSuits.length}</div>
                <div className="text-sm text-muted-foreground">Different Suits</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">{uniqueEras.length}</div>
                <div className="text-sm text-muted-foreground">Eras Collected</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">
                  {cards.length > 0 ? Math.round((cards.length / 500) * 100) : 0}%
                </div>
                <div className="text-sm text-muted-foreground">Collection Complete</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}