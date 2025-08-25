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
import { Loader2, Plus, Search, Edit, Trash2, QrCode, ExternalLink, Copy, Eye, EyeOff } from 'lucide-react';
import QRCode from 'qrcode';

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
  current_target?: string | null;
}

const AdminCards = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [qrCodes, setQrCodes] = useState<Map<string, string>>(new Map());

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
    is_active: true,
    current_target: ''
  });

  useEffect(() => {
    if (user) {
      fetchCards();
    }
  }, [user]);

  // Utility functions
  const generateQRCode = async (code: string): Promise<string> => {
    try {
      const url = `${window.location.origin}/claim/${code}`;
      return await QRCode.toDataURL(url, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
      return '';
    }
  };

  const loadQRCode = async (card: CardData) => {
    if (!qrCodes.has(card.id)) {
      const qrDataUrl = await generateQRCode(card.code);
      setQrCodes(prev => new Map(prev).set(card.id, qrDataUrl));
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied!",
        description: `${type} copied to clipboard`,
      });
    });
  };

  const toggleCardExpansion = (cardId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

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
      is_active: true,
      current_target: ''
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
      is_active: card.is_active,
      current_target: card.current_target || ''
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
            is_active: formData.is_active,
            current_target: formData.current_target || null
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
            is_active: formData.is_active,
            current_target: formData.current_target || null
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

          <div className="grid grid-cols-1 gap-6">
            {filteredCards.map((card) => {
              const isExpanded = expandedCards.has(card.id);
              return (
                <Card key={card.id} className="relative border-2">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">{card.name}</CardTitle>
                        <div className="flex gap-2 flex-wrap mb-3">
                          <Badge variant="secondary" className="cursor-pointer" onClick={() => copyToClipboard(card.code, 'Card Code')}>
                            {card.code} <Copy className="h-3 w-3 ml-1" />
                          </Badge>
                          <Badge variant={card.is_active ? "default" : "destructive"}>
                            {card.status}
                          </Badge>
                          {card.rarity && <Badge variant="outline">{card.rarity}</Badge>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            toggleCardExpansion(card.id);
                            if (!isExpanded) loadQRCode(card);
                          }}
                        >
                          {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
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
                  </CardHeader>
                  
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Basic Info Column */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Basic Info</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="font-medium">Suit:</span> 
                            <span>{card.suit}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium">Rank:</span> 
                            <span>{card.rank}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium">Era:</span> 
                            <span>{card.era}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium">TIME Value:</span> 
                            <span className="font-bold text-primary">{card.time_value}</span>
                          </div>
                          {card.trader_value && (
                            <div className="flex justify-between">
                              <span className="font-medium">Trader Value:</span> 
                              <span>{card.trader_value}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Image Column */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Image Preview</h4>
                        {card.image_url ? (
                          <div className="relative">
                            <img 
                              src={card.image_url} 
                              alt={card.name}
                              className="w-full h-48 object-cover rounded-lg border shadow-sm"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute top-2 right-2 bg-white/80 hover:bg-white"
                              onClick={() => copyToClipboard(card.image_url!, 'Image URL')}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                            No Image
                          </div>
                        )}
                      </div>

                      {/* QR Code Column */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">QR Code</h4>
                        {isExpanded && qrCodes.has(card.id) ? (
                          <div className="relative">
                            <img 
                              src={qrCodes.get(card.id)} 
                              alt={`QR Code for ${card.name}`}
                              className="w-full max-w-48 mx-auto border rounded-lg shadow-sm bg-white p-2"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute top-2 right-2 bg-white/80 hover:bg-white"
                              onClick={() => copyToClipboard(`${window.location.origin}/claim/${card.code}`, 'Claim URL')}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                            <QrCode className="h-12 w-12 mb-2" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Extended Info (when expanded) */}
                    {isExpanded && (
                      <div className="mt-6 pt-6 border-t space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">URLs & Links</h4>
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="font-medium">Claim URL:</span>
                                <div className="flex items-center gap-2 mt-1">
                                  <code className="bg-muted px-2 py-1 rounded text-xs flex-1">
                                    {window.location.origin}/claim/{card.code}
                                  </code>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(`${window.location.origin}/claim/${card.code}`, 'Claim URL')}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              {card.current_target && (
                                <div>
                                  <span className="font-medium">Redirect URL:</span>
                                  <div className="flex items-center gap-2 mt-1">
                                    <code className="bg-muted px-2 py-1 rounded text-xs flex-1">
                                      {card.current_target}
                                    </code>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => copyToClipboard(card.current_target!, 'Redirect URL')}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => window.open(card.current_target!, '_blank')}
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-3">
                            <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Metadata</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="font-medium">Card ID:</span>
                                <code className="text-xs bg-muted px-1 rounded">{card.id}</code>
                              </div>
                              <div className="flex justify-between">
                                <span className="font-medium">Created:</span>
                                <span>{new Date(card.created_at).toLocaleDateString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="font-medium">Active:</span>
                                <Badge variant={card.is_active ? "default" : "destructive"} className="text-xs">
                                  {card.is_active ? 'Yes' : 'No'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>

                        {card.description && (
                          <div className="space-y-2">
                            <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Description</h4>
                            <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                              {card.description}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
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
                    <Label htmlFor="current_target">Redirect URL</Label>
                    <Input
                      id="current_target"
                      value={formData.current_target}
                      onChange={(e) => setFormData({ ...formData, current_target: e.target.value })}
                      placeholder="https://example.com"
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