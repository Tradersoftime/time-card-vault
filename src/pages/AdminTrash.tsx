import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface DeletedCardData {
  id: string;
  code: string;
  name: string;
  suit: string;
  rank: string;
  era: string;
  rarity: string | null;
  time_value: number;
  trader_value: string | null;
  image_url: string | null;
  description: string | null;
  status: string;
  is_active: boolean;
  created_at: string;
  deleted_at: string;
  deleted_by: string | null;
  current_target?: string | null;
  qr_dark?: string | null;
  qr_light?: string | null;
}

const AdminTrash = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [cards, setCards] = useState<DeletedCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      fetchDeletedCards();
    }
  }, [user]);

  const fetchDeletedCards = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('admin_list_cards', {
        p_include_deleted: true
      });

      if (error) {
        console.error('Database error:', error);
        if (error.message?.includes('forbidden')) {
          toast({
            title: "Access Denied",
            description: "You don't have admin privileges to access trash management",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: error.message || "Failed to fetch deleted cards",
            variant: "destructive",
          });
        }
        return;
      }
      
      // Filter only deleted cards
      const deletedCards = (data || []).filter(card => card.deleted_at);
      setCards(deletedCards);
    } catch (error) {
      console.error('Error fetching deleted cards:', error);
      toast({
        title: "Error",
        description: "Failed to fetch deleted cards. Please check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleCardSelection = (cardId: string) => {
    setSelectedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  const selectAllCards = () => {
    setSelectedCards(new Set(filteredCards.map(card => card.id)));
  };

  const deselectAllCards = () => {
    setSelectedCards(new Set());
  };

  const restoreCards = async (cardIds: string[]) => {
    try {
      const { data, error } = await supabase.rpc('admin_restore_cards', {
        p_card_ids: cardIds
      });

      if (error) {
        console.error('Database error:', error);
        if (error.message?.includes('forbidden')) {
          toast({
            title: "Access Denied",
            description: "You don't have admin privileges to restore cards",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: error.message || "Failed to restore cards",
            variant: "destructive",
          });
        }
        return;
      }

      if (data && !data.ok) {
        toast({
          title: "Error",
          description: data.error || "Failed to restore cards",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Cards restored",
        description: `${cardIds.length} cards have been restored successfully`,
      });

      fetchDeletedCards();
      setSelectedCards(new Set());
    } catch (error) {
      console.error('Error restoring cards:', error);
      toast({
        title: "Error",
        description: "Failed to restore cards. Please check your connection and try again.",
        variant: "destructive",
      });
    }
  };

  const permanentlyDeleteCards = async (cardIds: string[]) => {
    try {
      const { error } = await supabase
        .from('cards')
        .delete()
        .in('id', cardIds);

      if (error) throw error;

      toast({
        title: "Cards permanently deleted",
        description: `${cardIds.length} cards have been permanently deleted`,
      });

      fetchDeletedCards();
      setSelectedCards(new Set());
    } catch (error) {
      console.error('Error permanently deleting cards:', error);
      toast({
        title: "Error",
        description: "Failed to permanently delete cards",
        variant: "destructive",
      });
    }
  };

  const filteredCards = cards.filter(card => {
    const matchesSearch = card.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.suit.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.era.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const formatDeletedDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const remainingDays = Math.max(0, 30 - diffDays);
    
    return {
      date: date.toLocaleDateString(),
      remainingDays,
      isExpiringSoon: remainingDays <= 7
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen hero-gradient flex items-center justify-center">
        <div className="glass-panel p-8 rounded-2xl text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
          <div className="text-foreground">Loading trash...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen hero-gradient">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="glass-panel p-6 rounded-2xl mb-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent mb-2">
                <Trash2 className="inline-block h-8 w-8 mr-3 text-primary" />
                Trash Management
              </h1>
              <p className="text-muted-foreground">
                Deleted cards are kept for 30 days before permanent deletion
              </p>
              {cards.length > 0 && (
                <Badge variant="outline" className="mt-2">
                  {cards.length} items in trash
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="glass-panel p-4 rounded-2xl mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-1">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search deleted cards..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-60"
                />
              </div>
            </div>

            {/* Selection Controls */}
            {selectedCards.size > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{selectedCards.size} selected</Badge>
                <Button variant="outline" size="sm" onClick={deselectAllCards}>
                  Clear
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => restoreCards(Array.from(selectedCards))}
                  className="bg-gradient-to-r from-primary to-primary-glow"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restore Selected
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Forever
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Permanently Delete Cards</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to permanently delete {selectedCards.size} selected cards? 
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => permanentlyDeleteCards(Array.from(selectedCards))}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        Delete Forever
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>

          {/* Bulk Actions */}
          {selectedCards.size === 0 && filteredCards.length > 0 && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t">
              <Button variant="outline" size="sm" onClick={selectAllCards}>
                Select All ({filteredCards.length})
              </Button>
            </div>
          )}
        </div>

        {/* Cards List */}
        <div className="glass-panel rounded-2xl">
          {filteredCards.length === 0 ? (
            <div className="p-12 text-center">
              <Trash2 className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                {searchTerm ? "No matching deleted cards" : "Trash is empty"}
              </h3>
              <p className="text-muted-foreground">
                {searchTerm ? "Try adjusting your search terms" : "No cards have been deleted"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr>
                    <th className="text-left p-4 font-medium text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={selectedCards.size === filteredCards.length && filteredCards.length > 0}
                        onChange={(e) => e.target.checked ? selectAllCards() : deselectAllCards()}
                        className="mr-2"
                      />
                      Card
                    </th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Details</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Deleted</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Recovery</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCards.map((card) => {
                    const deletedInfo = formatDeletedDate(card.deleted_at);
                    return (
                      <tr key={card.id} className="border-b hover:bg-muted/20">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selectedCards.has(card.id)}
                              onChange={() => toggleCardSelection(card.id)}
                            />
                            <div className="flex items-center gap-3">
                              {card.image_url ? (
                                <img 
                                  src={card.image_url} 
                                  alt={card.name}
                                  className="w-12 h-12 object-cover rounded-lg"
                                />
                              ) : (
                                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                                  <span className="text-lg font-bold text-muted-foreground">
                                    {card.rank}
                                  </span>
                                </div>
                              )}
                              <div>
                                <div className="font-medium">{card.name}</div>
                                <div className="text-sm text-muted-foreground">{card.code}</div>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="space-y-1 text-sm">
                            <div>{card.suit} {card.rank}</div>
                            <div className="text-muted-foreground">{card.era}</div>
                            {card.rarity && (
                              <Badge variant="outline" className="text-xs">
                                {card.rarity}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm">
                            <div>{deletedInfo.date}</div>
                            <div className={`text-xs ${deletedInfo.isExpiringSoon ? 'text-destructive' : 'text-muted-foreground'}`}>
                              {deletedInfo.remainingDays} days left
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          {deletedInfo.isExpiringSoon && (
                            <div className="flex items-center gap-1 text-destructive text-xs">
                              <AlertTriangle className="h-3 w-3" />
                              Expires soon
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => restoreCards([card.id])}
                              className="text-primary hover:bg-primary/10"
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Restore
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Permanently Delete Card</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to permanently delete "{card.name}"? 
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => permanentlyDeleteCards([card.id])}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    Delete Forever
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminTrash;