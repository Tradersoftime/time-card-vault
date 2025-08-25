import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Search, Edit, Trash2 } from 'lucide-react';

interface CardData {
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
}

const AdminCards = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form state for creating/editing cards
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    suit: '',
    rank: '',
    era: '',
    rarity: '',
    time_value: 0,
    trader_value: '',
    image_url: '',
    description: '',
    status: 'active',
    is_active: true
  });

  useEffect(() => {
    if (user) {
      fetchCards();
    }
  }, [user]);

  const fetchCards = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCards(data || []);
    } catch (error) {
      console.error('Error fetching cards:', error);
      toast({
        title: "Error",
        description: "Failed to fetch cards",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredCards = cards.filter(card =>
    card.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.suit.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.era.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      suit: '',
      rank: '',
      era: '',
      rarity: '',
      time_value: 0,
      trader_value: '',
      image_url: '',
      description: '',
      status: 'active',
      is_active: true
    });
    setSelectedCard(null);
    setIsEditing(false);
  };

  const handleEdit = (card: CardData) => {
    setSelectedCard(card);
    setFormData({
      code: card.code,
      name: card.name,
      suit: card.suit,
      rank: card.rank,
      era: card.era,
      rarity: card.rarity || '',
      time_value: card.time_value,
      trader_value: card.trader_value || '',
      image_url: card.image_url || '',
      description: card.description || '',
      status: card.status,
      is_active: card.is_active
    });
    setIsEditing(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isEditing && selectedCard) {
        // Update existing card
        const { error } = await supabase
          .from('cards')
          .update({
            name: formData.name,
            suit: formData.suit,
            rank: formData.rank,
            era: formData.era,
            rarity: formData.rarity || null,
            time_value: formData.time_value,
            trader_value: formData.trader_value || null,
            image_url: formData.image_url || null,
            description: formData.description || null,
            status: formData.status,
            is_active: formData.is_active
          })
          .eq('id', selectedCard.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Card updated successfully",
        });
      } else {
        // Create new card
        const { error } = await supabase
          .from('cards')
          .insert([{
            code: formData.code,
            name: formData.name,
            suit: formData.suit,
            rank: formData.rank,
            era: formData.era,
            rarity: formData.rarity || null,
            time_value: formData.time_value,
            trader_value: formData.trader_value || null,
            image_url: formData.image_url || null,
            description: formData.description || null,
            status: formData.status,
            is_active: formData.is_active
          }]);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Card created successfully",
        });
      }

      resetForm();
      fetchCards();
    } catch (error) {
      console.error('Error saving card:', error);
      toast({
        title: "Error",
        description: "Failed to save card",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (card: CardData) => {
    if (!confirm(`Are you sure you want to delete "${card.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('cards')
        .delete()
        .eq('id', card.id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Card deleted successfully",
      });
      
      fetchCards();
    } catch (error) {
      console.error('Error deleting card:', error);
      toast({
        title: "Error",
        description: "Failed to delete card",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Card Management</h1>
        <Button onClick={() => setIsEditing(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add New Card
        </Button>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">Card List</TabsTrigger>
          <TabsTrigger value="form">
            {isEditing ? (selectedCard ? 'Edit Card' : 'Add Card') : 'Card Form'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search cards by name, code, suit, or era..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCards.map((card) => (
              <Card key={card.id} className="relative">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{card.name}</CardTitle>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(card)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(card)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="secondary">{card.code}</Badge>
                    <Badge variant={card.is_active ? "default" : "destructive"}>
                      {card.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div><strong>Suit:</strong> {card.suit}</div>
                    <div><strong>Rank:</strong> {card.rank}</div>
                    <div><strong>Era:</strong> {card.era}</div>
                    {card.rarity && <div><strong>Rarity:</strong> {card.rarity}</div>}
                    <div><strong>TIME Value:</strong> {card.time_value}</div>
                    {card.trader_value && <div><strong>Trader Value:</strong> {card.trader_value}</div>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="form">
          <Card>
            <CardHeader>
              <CardTitle>
                {isEditing ? (selectedCard ? 'Edit Card' : 'Add New Card') : 'Card Form'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="code">Code</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      required
                      disabled={isEditing && selectedCard !== null}
                    />
                  </div>
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="suit">Suit</Label>
                    <Input
                      id="suit"
                      value={formData.suit}
                      onChange={(e) => setFormData({ ...formData, suit: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="rank">Rank</Label>
                    <Input
                      id="rank"
                      value={formData.rank}
                      onChange={(e) => setFormData({ ...formData, rank: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="era">Era</Label>
                    <Input
                      id="era"
                      value={formData.era}
                      onChange={(e) => setFormData({ ...formData, era: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="rarity">Rarity</Label>
                    <Input
                      id="rarity"
                      value={formData.rarity}
                      onChange={(e) => setFormData({ ...formData, rarity: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="time_value">TIME Value</Label>
                    <Input
                      id="time_value"
                      type="number"
                      value={formData.time_value}
                      onChange={(e) => setFormData({ ...formData, time_value: parseInt(e.target.value) || 0 })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="trader_value">Trader Value</Label>
                    <Input
                      id="trader_value"
                      value={formData.trader_value}
                      onChange={(e) => setFormData({ ...formData, trader_value: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="image_url">Image URL</Label>
                    <Input
                      id="image_url"
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
                <div className="flex gap-2">
                  <Button type="submit">
                    {isEditing && selectedCard ? 'Update Card' : 'Create Card'}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminCards;