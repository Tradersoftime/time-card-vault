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
import { Loader2, Plus, Search, Edit, Trash2, QrCode, ExternalLink, Copy, Eye, EyeOff, Filter, ArrowUpDown, ChevronDown } from 'lucide-react';
import QRCode from 'qrcode';
import { ImageUpload } from '@/components/ImageUpload';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSearchParams } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';
import { BulkEditCards } from '@/components/BulkEditCards';

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
  qr_dark?: string | null;
  qr_light?: string | null;
}

const AdminCards = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [qrCodes, setQrCodes] = useState<Map<string, string>>(new Map());
  const [bulkEditMode, setBulkEditMode] = useState(false);
  
  // Sorting state
  const [sortField, setSortField] = useState<string>(() => 
    localStorage.getItem('adminCards_sortField') || 'created_at'
  );
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(() => 
    (localStorage.getItem('adminCards_sortDirection') as 'asc' | 'desc') || 'desc'
  );
  
  // Image preview modal state
  const [imagePreview, setImagePreview] = useState<{
    isOpen: boolean;
    imageUrl: string;
    cardName: string;
  }>({
    isOpen: false,
    imageUrl: '',
    cardName: ''
  });

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

  // Check for query parameters on mount
  useEffect(() => {
    const codeParam = searchParams.get('code');
    if (codeParam) {
      setSearchTerm(codeParam);
    }
  }, [searchParams, cards]);

  // Utility functions
  const generateQRCode = async (code: string, qrDark?: string | null, qrLight?: string | null): Promise<string> => {
    try {
      const url = `${window.location.origin}/claim/${code}`;
      return await QRCode.toDataURL(url, {
        width: 200,
        margin: 2,
        color: {
          dark: qrDark || '#000000',
          light: qrLight || '#FFFFFF'
        }
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
      return '';
    }
  };

  const loadQRCode = async (card: CardData) => {
    if (!qrCodes.has(card.id)) {
      const qrDataUrl = await generateQRCode(card.code, card.qr_dark, card.qr_light);
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

  const fetchCards = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cards')
        .select('*, qr_dark, qr_light')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCards(data || []);
      // Load QR codes for all cards
      (data || []).forEach(card => loadQRCode(card));
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

  // Sorting function
  const sortCards = (cardsToSort: CardData[]) => {
    return [...cardsToSort].sort((a, b) => {
      let aValue: any = a[sortField as keyof CardData];
      let bValue: any = b[sortField as keyof CardData];
      
      // Handle null/undefined values
      if (aValue == null) aValue = '';
      if (bValue == null) bValue = '';
      
      // Convert to appropriate types for comparison
      if (sortField === 'time_value') {
        aValue = Number(aValue);
        bValue = Number(bValue);
      } else if (sortField === 'created_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else {
        aValue = String(aValue).toLowerCase();
        bValue = String(bValue).toLowerCase();
      }
      
      // Compare values
      let comparison = 0;
      if (aValue < bValue) comparison = -1;
      if (aValue > bValue) comparison = 1;
      
      return sortDirection === 'desc' ? -comparison : comparison;
    });
  };

  const filteredCards = sortCards(
    cards.filter(card => {
      const matchesSearch = card.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.suit.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.era.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'complete' && card.status === 'active' && card.name !== 'Unknown') ||
        (statusFilter === 'draft' && (card.status === 'draft' || card.name === 'Unknown')) ||
        (statusFilter === 'active' && card.is_active) ||
        (statusFilter === 'inactive' && !card.is_active);
        
      return matchesSearch && matchesStatus;
    })
  );

  // Get status counts for filter badges
  const statusCounts = {
    all: cards.length,
    complete: cards.filter(card => card.status === 'active' && card.name !== 'Unknown').length,
    draft: cards.filter(card => card.status === 'draft' || card.name === 'Unknown').length,
    active: cards.filter(card => card.is_active).length,
    inactive: cards.filter(card => !card.is_active).length
  };

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

  // Handle sort changes with localStorage persistence
  const handleSortChange = (field: string) => {
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(newDirection);
    localStorage.setItem('adminCards_sortField', field);
    localStorage.setItem('adminCards_sortDirection', newDirection);
  };

  const toggleSortDirection = () => {
    const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    setSortDirection(newDirection);
    localStorage.setItem('adminCards_sortDirection', newDirection);
  };

  // Open image preview modal
  const openImagePreview = (imageUrl: string, cardName: string) => {
    setImagePreview({
      isOpen: true,
      imageUrl,
      cardName
    });
  };

  // Close image preview modal
  const closeImagePreview = () => {
    setImagePreview({
      isOpen: false,
      imageUrl: '',
      cardName: ''
    });
  };

  // Sort options for the dropdown
  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'code', label: 'Code' },
    { value: 'era', label: 'Era' },
    { value: 'suit', label: 'Suit' },
    { value: 'rank', label: 'Rank' },
    { value: 'time_value', label: 'TIME Value' },
    { value: 'created_at', label: 'Created Date' },
    { value: 'status', label: 'Status' },
    { value: 'rarity', label: 'Rarity' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen hero-gradient flex items-center justify-center">
        <div className="glass-panel p-8 rounded-2xl text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
          <div className="text-foreground">Loading card management...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen hero-gradient">
      <div className="container mx-auto py-8 px-4">
        <div className="glass-panel p-6 rounded-2xl mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent mb-2">
                Card Management
              </h1>
              <p className="text-muted-foreground">Create, edit, and manage trading card database</p>
            </div>
            <Button 
              onClick={() => setIsEditing(true)} 
              className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-semibold hover:opacity-90 transition-opacity glow-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Card
            </Button>
          </div>
        </div>

        <Tabs defaultValue="list" className="w-full">
          <div className="glass-panel p-4 rounded-2xl mb-6">
            <TabsList className={`grid w-full ${bulkEditMode ? 'grid-cols-1' : 'grid-cols-2'} bg-muted/20`}>
              {!bulkEditMode && (
                <TabsTrigger value="list" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Card List
                </TabsTrigger>
              )}
              {!bulkEditMode && (
                <TabsTrigger value="form" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  {isEditing ? (selectedCard ? 'Edit Card' : 'Add Card') : 'Card Form'}
                </TabsTrigger>
              )}
              {bulkEditMode && (
                <div className="text-center py-2 text-primary font-medium">
                  Bulk Edit Mode
                </div>
              )}
            </TabsList>
          </div>

          {bulkEditMode ? (
            <BulkEditCards
              cards={filteredCards.filter(card => selectedCards.has(card.id))}
              onSave={() => {
                setBulkEditMode(false);
                setSelectedCards(new Set());
                fetchCards();
              }}
              onCancel={() => {
                setBulkEditMode(false);
                setSelectedCards(new Set());
              }}
            />
          ) : (
            <TabsContent value="list" className="space-y-4">
              <div className="glass-panel p-6 rounded-2xl">
                {/* Multi-select controls */}
                {selectedCards.size > 0 && (
                  <div className="mb-4 p-4 bg-primary/10 rounded-lg border border-primary/20">
                    <div className="flex items-center justify-between">
                      <span className="text-foreground font-medium">
                        {selectedCards.size} card{selectedCards.size !== 1 ? 's' : ''} selected
                      </span>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={deselectAllCards}
                          className="border-primary/20"
                        >
                          Deselect All
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => setBulkEditMode(true)}
                          className="bg-primary text-primary-foreground"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Selected
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search cards by name, code, suit, or era..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="max-w-sm bg-background/50 border-primary/20"
                    />
                  </div>
                  
                  {/* Sort Controls */}
                  <div className="flex items-center space-x-2">
                    <Select value={sortField} onValueChange={handleSortChange}>
                      <SelectTrigger className="w-48 bg-background/50 border-primary/20">
                        <div className="flex items-center gap-2">
                          <ArrowUpDown className="h-4 w-4" />
                          <SelectValue placeholder="Sort by..." />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {sortOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleSortDirection}
                      className="px-3 bg-background/50 border-primary/20 hover:bg-primary/10"
                      title={`Sort ${sortDirection === 'asc' ? 'Ascending' : 'Descending'}`}
                    >
                      <ArrowUpDown className={`h-4 w-4 transition-transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                    </Button>
                  </div>
                </div>
                
                 {/* Status Filter Tabs */}
                <div className="flex items-center gap-1 p-1 bg-muted/20 rounded-lg">
                  <Button
                    variant={statusFilter === 'all' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setStatusFilter('all')}
                    className={statusFilter === 'all' ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-primary/10'}
                  >
                    All ({statusCounts.all})
                  </Button>
                  <Button
                    variant={statusFilter === 'complete' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setStatusFilter('complete')}
                    className={statusFilter === 'complete' ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-primary/10'}
                  >
                    Complete ({statusCounts.complete})
                  </Button>
                  <Button
                    variant={statusFilter === 'draft' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setStatusFilter('draft')}
                    className={statusFilter === 'draft' ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-primary/10'}
                  >
                    Draft ({statusCounts.draft})
                  </Button>
                </div>
                
                {/* Select All/None Controls */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllCards}
                    className="border-primary/20 text-xs"
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={deselectAllCards}
                    className="border-primary/20 text-xs"
                  >
                    Select None
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {filteredCards.map((card) => {
                  const isSelected = selectedCards.has(card.id);
                  return (
                    <div key={card.id} className={`glass-panel p-6 rounded-xl hover:shadow-lg transition-all duration-300 border ${isSelected ? 'border-primary/50 bg-primary/5' : 'border-primary/10'}`}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-start gap-3 flex-1">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleCardSelection(card.id)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-foreground mb-2">{card.name}</h3>
                            <div className="flex gap-2 flex-wrap mb-3">
                              <Badge 
                                variant="secondary" 
                                className="cursor-pointer bg-primary/10 text-primary hover:bg-primary/20" 
                                onClick={() => copyToClipboard(card.code, 'Card Code')}
                              >
                                {card.code} <Copy className="h-3 w-3 ml-1" />
                              </Badge>
                              <Badge variant={card.is_active ? "default" : "destructive"} className="glow-primary">
                                {card.status}
                              </Badge>
                              {(card.status === 'draft' || card.name === 'Unknown') && (
                                <Badge variant="outline" className="bg-accent/20 text-accent border-accent/30">
                                  Draft
                                </Badge>
                              )}
                              {card.rarity && <Badge variant="outline" className="border-primary/30">{card.rarity}</Badge>}
                              {(card.qr_dark || card.qr_light) && (
                                <Badge variant="outline" className="border-primary/30 flex items-center gap-1">
                                  <div className="flex gap-1">
                                    {card.qr_dark && (
                                      <div 
                                        className="w-3 h-3 border border-gray-300 rounded"
                                        style={{ backgroundColor: card.qr_dark }}
                                        title={`Dark: ${card.qr_dark}`}
                                      />
                                    )}
                                    {card.qr_light && (
                                      <div 
                                        className="w-3 h-3 border border-gray-300 rounded"
                                        style={{ backgroundColor: card.qr_light }}
                                        title={`Light: ${card.qr_light}`}
                                      />
                                    )}
                                  </div>
                                  Custom QR
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(card)}
                            className="hover:bg-primary/10"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(card)}
                            className="hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Basic Info Column */}
                        <div className="space-y-3">
                          <h4 className="font-semibold text-sm uppercase tracking-wide text-primary">Basic Info</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="font-medium text-muted-foreground">Suit:</span> 
                              <span className="text-foreground">{card.suit}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-medium text-muted-foreground">Rank:</span> 
                              <span className="text-foreground">{card.rank}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-medium text-muted-foreground">Era:</span> 
                              <span className="text-foreground">{card.era}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-medium text-muted-foreground">TIME Value:</span> 
                              <span className="font-bold text-primary glow-text">{card.time_value}</span>
                            </div>
                            {card.trader_value && (
                              <div className="flex justify-between">
                                <span className="font-medium text-muted-foreground">Trader Value:</span> 
                                <span className="text-foreground">{card.trader_value}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Image Column */}
                        <div className="space-y-3">
                          <h4 className="font-semibold text-sm uppercase tracking-wide text-primary">Image Preview</h4>
                          {card.image_url ? (
                            <div className="relative">
                              <img 
                                src={card.image_url} 
                                alt={card.name}
                                className="w-full h-48 object-cover rounded-lg border border-primary/20 shadow-lg cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => openImagePreview(card.image_url!, card.name)}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="absolute top-2 right-2 bg-background/80 hover:bg-background border border-primary/20"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(card.image_url!, 'Image URL');
                                }}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="w-full h-48 bg-muted/20 rounded-lg flex items-center justify-center text-muted-foreground border border-primary/10">
                              No Image
                            </div>
                          )}
                        </div>

                        {/* QR Code Column */}
                        <div className="space-y-3">
                          <h4 className="font-semibold text-sm uppercase tracking-wide text-primary">QR Code</h4>
                          {qrCodes.has(card.id) ? (
                            <div className="relative">
                              <img 
                                src={qrCodes.get(card.id)} 
                                alt={`QR Code for ${card.name}`}
                                className="w-full max-w-48 mx-auto border border-primary/20 rounded-lg shadow-lg bg-white p-2"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="absolute top-2 right-2 bg-background/80 hover:bg-background border border-primary/20"
                                onClick={() => copyToClipboard(`${window.location.origin}/claim/${card.code}`, 'Claim URL')}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="w-full h-48 bg-muted/20 rounded-lg flex flex-col items-center justify-center text-muted-foreground border border-primary/10">
                              <QrCode className="h-12 w-12 mb-2" />
                              <span className="text-xs">Loading QR code...</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Extended Info (always visible) */}
                      <div className="mt-6 pt-6 border-t border-primary/20 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <h4 className="font-semibold text-sm uppercase tracking-wide text-primary">URLs & Links</h4>
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="font-medium text-muted-foreground">Claim URL:</span>
                                <div className="flex items-center gap-2 mt-1">
                                  <code className="bg-muted/20 px-2 py-1 rounded text-xs flex-1 border border-primary/10">
                                    {window.location.origin}/claim/{card.code}
                                  </code>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(`${window.location.origin}/claim/${card.code}`, 'Claim URL')}
                                    className="hover:bg-primary/10"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              {card.current_target && (
                                <div>
                                  <span className="font-medium text-muted-foreground">Redirect URL:</span>
                                  <div className="flex items-center gap-2 mt-1">
                                    <code className="bg-muted/20 px-2 py-1 rounded text-xs flex-1 border border-primary/10">
                                      {card.current_target}
                                    </code>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => copyToClipboard(card.current_target!, 'Redirect URL')}
                                      className="hover:bg-primary/10"
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => window.open(card.current_target!, '_blank')}
                                      className="hover:bg-primary/10"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-3">
                            <h4 className="font-semibold text-sm uppercase tracking-wide text-primary">Metadata</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="font-medium text-muted-foreground">Card ID:</span>
                                <code className="text-xs bg-muted/20 px-1 rounded border border-primary/10">{card.id}</code>
                              </div>
                              <div className="flex justify-between">
                                <span className="font-medium text-muted-foreground">Created:</span>
                                <span className="text-foreground">{new Date(card.created_at).toLocaleDateString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="font-medium text-muted-foreground">Active:</span>
                                <Badge variant={card.is_active ? "default" : "destructive"} className="text-xs">
                                  {card.is_active ? 'Yes' : 'No'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>

                        {card.description && (
                          <div className="space-y-2">
                            <h4 className="font-semibold text-sm uppercase tracking-wide text-primary">Description</h4>
                            <p className="text-sm text-muted-foreground bg-muted/20 p-3 rounded-lg border border-primary/10">
                              {card.description}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              </div>
            </TabsContent>
          )}

          <TabsContent value="form">
            <div className="glass-panel p-8 rounded-2xl">
              <div className="mb-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                  {isEditing ? (selectedCard ? 'Edit Card' : 'Add New Card') : 'Card Form'}
                </h2>
                <p className="text-muted-foreground mt-2">
                  {isEditing ? 'Update card information' : 'Create a new trading card'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* QR Code Preview Section */}
                {formData.code && (
                  <div className="bg-muted/20 p-6 rounded-lg border border-primary/20">
                    <h3 className="text-lg font-semibold mb-4 text-primary">Preview</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* QR Code Preview */}
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm text-foreground">QR Code</h4>
                        <div className="bg-white p-4 rounded-lg border border-primary/20 shadow-sm">
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/claim/${formData.code}`)}`}
                            alt="QR Code Preview"
                            className="w-full max-w-48 mx-auto"
                          />
                        </div>
                      </div>
                      
                      {/* Image Preview */}
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm text-foreground">Card Image</h4>
                        {formData.image_url ? (
                          <div className="bg-white p-2 rounded-lg border border-primary/20 shadow-sm">
                            <img 
                              src={formData.image_url} 
                              alt="Card Preview"
                              className="w-full h-32 object-cover rounded"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDIwMCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTI4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04NS4zMzMgNTJIMTE0LjY2N0M3NC42NjcgNTggOTAgNzQgOTAgNzRTMTA1LjMzMyA1OCAxMTQuNjY3IDUySDg1LjMzM1oiIGZpbGw9IiM5Q0E0QUYiLz4KPC9zdmc+Cg==';
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-full h-32 bg-muted/20 rounded-lg flex items-center justify-center text-muted-foreground border border-primary/10">
                            No Image
                          </div>
                        )}
                      </div>
                      
                      {/* Info Preview */}
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm text-foreground">Card Info</h4>
                        <div className="bg-background/50 p-4 rounded-lg border border-primary/10 space-y-2 text-sm">
                          <div><strong>Name:</strong> {formData.name || 'Unnamed Card'}</div>
                          <div><strong>Suit:</strong> {formData.suit || 'N/A'}</div>
                          <div><strong>Rank:</strong> {formData.rank || 'N/A'}</div>
                          <div><strong>Era:</strong> {formData.era || 'N/A'}</div>
                          <div><strong>TIME Value:</strong> <span className="text-primary font-bold">{formData.time_value}</span></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-primary">Basic Information</h3>
                    
                    {!isEditing && (
                      <div>
                        <Label htmlFor="code" className="text-foreground">Card Code *</Label>
                        <Input
                          id="code"
                          value={formData.code}
                          onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                          placeholder="e.g., TC001"
                          required={!isEditing}
                          className="bg-background/50 border-primary/20 focus:border-primary"
                        />
                      </div>
                    )}

                    <div>
                      <Label htmlFor="name" className="text-foreground">Card Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter card name"
                        required
                        className="bg-background/50 border-primary/20 focus:border-primary"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="suit" className="text-foreground">Suit *</Label>
                        <Select value={formData.suit} onValueChange={(value) => setFormData(prev => ({ ...prev, suit: value }))}>
                          <SelectTrigger className="bg-background/50 border-primary/20">
                            <SelectValue placeholder="Select suit" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Hearts">Hearts</SelectItem>
                            <SelectItem value="Diamonds">Diamonds</SelectItem>
                            <SelectItem value="Clubs">Clubs</SelectItem>
                            <SelectItem value="Spades">Spades</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="rank" className="text-foreground">Rank *</Label>
                        <Select value={formData.rank} onValueChange={(value) => setFormData(prev => ({ ...prev, rank: value }))}>
                          <SelectTrigger className="bg-background/50 border-primary/20">
                            <SelectValue placeholder="Select rank" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Ace">Ace</SelectItem>
                            <SelectItem value="2">2</SelectItem>
                            <SelectItem value="3">3</SelectItem>
                            <SelectItem value="4">4</SelectItem>
                            <SelectItem value="5">5</SelectItem>
                            <SelectItem value="6">6</SelectItem>
                            <SelectItem value="7">7</SelectItem>
                            <SelectItem value="8">8</SelectItem>
                            <SelectItem value="9">9</SelectItem>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="Jack">Jack</SelectItem>
                            <SelectItem value="Queen">Queen</SelectItem>
                            <SelectItem value="King">King</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="era" className="text-foreground">Era *</Label>
                      <Input
                        id="era"
                        value={formData.era}
                        onChange={(e) => setFormData(prev => ({ ...prev, era: e.target.value }))}
                        placeholder="e.g., Modern, Classic, Vintage"
                        required
                        className="bg-background/50 border-primary/20 focus:border-primary"
                      />
                    </div>
                  </div>

                  {/* Additional Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-primary">Additional Information</h3>
                    
                    <div>
                      <Label htmlFor="rarity" className="text-foreground">Rarity</Label>
                      <Select value={formData.rarity} onValueChange={(value) => setFormData(prev => ({ ...prev, rarity: value }))}>
                        <SelectTrigger className="bg-background/50 border-primary/20">
                          <SelectValue placeholder="Select rarity" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Common">Common</SelectItem>
                          <SelectItem value="Uncommon">Uncommon</SelectItem>
                          <SelectItem value="Rare">Rare</SelectItem>
                          <SelectItem value="Epic">Epic</SelectItem>
                          <SelectItem value="Legendary">Legendary</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="time_value" className="text-foreground">TIME Value *</Label>
                      <Input
                        id="time_value"
                        type="number"
                        value={formData.time_value}
                        onChange={(e) => setFormData(prev => ({ ...prev, time_value: parseInt(e.target.value) || 0 }))}
                        placeholder="Enter TIME value"
                        required
                        className="bg-background/50 border-primary/20 focus:border-primary"
                      />
                    </div>

                    <div>
                      <Label htmlFor="trader_value" className="text-foreground">Trader Value</Label>
                      <Input
                        id="trader_value"
                        value={formData.trader_value}
                        onChange={(e) => setFormData(prev => ({ ...prev, trader_value: e.target.value }))}
                        placeholder="Enter trader value"
                        className="bg-background/50 border-primary/20 focus:border-primary"
                      />
                    </div>

                    <div>
                      <Label htmlFor="current_target" className="text-foreground">Redirect URL</Label>
                      <Input
                        id="current_target"
                        value={formData.current_target}
                        onChange={(e) => setFormData(prev => ({ ...prev, current_target: e.target.value }))}
                        placeholder="https://example.com"
                        className="bg-background/50 border-primary/20 focus:border-primary"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="status" className="text-foreground">Status</Label>
                        <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                          <SelectTrigger className="bg-background/50 border-primary/20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="draft">Draft</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex items-center space-x-2 pt-6">
                        <input
                          type="checkbox"
                          id="is_active"
                          checked={formData.is_active}
                          onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                          className="rounded border-primary/20"
                        />
                        <Label htmlFor="is_active" className="text-foreground">Is Active</Label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Image Upload */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-primary">Image & Description</h3>
                  
                  <div>
                    <Label htmlFor="image_url" className="text-foreground">Image URL</Label>
                    <Input
                      id="image_url"
                      value={formData.image_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                      placeholder="https://example.com/image.jpg"
                      className="bg-background/50 border-primary/20 focus:border-primary"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description" className="text-foreground">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter card description..."
                      rows={3}
                      className="bg-background/50 border-primary/20 focus:border-primary"
                    />
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex gap-4 pt-6">
                  <Button 
                    type="submit" 
                    className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-semibold hover:opacity-90 transition-opacity glow-primary"
                  >
                    {isEditing ? 'Update Card' : 'Create Card'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={resetForm}
                    className="border-primary/20 hover:bg-primary/10"
                  >
                    {isEditing ? 'Cancel' : 'Clear'}
                  </Button>
                </div>
              </form>
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Image Preview Modal */}
        <Dialog open={imagePreview.isOpen} onOpenChange={closeImagePreview}>
          <DialogContent className="max-w-4xl bg-background/95 backdrop-blur-sm border-primary/20">
            <DialogHeader>
              <DialogTitle className="text-primary">Card Image - {imagePreview.cardName}</DialogTitle>
            </DialogHeader>
            <div className="flex justify-center">
              <img 
                src={imagePreview.imageUrl} 
                alt={imagePreview.cardName}
                className="max-w-full max-h-[70vh] object-contain rounded-lg border border-primary/20"
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminCards;