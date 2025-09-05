import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, LayoutGrid, List, QrCode, Eye, Filter, ArrowUpDown, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSearchParams } from 'react-router-dom';
import { AdminTradingCard } from '@/components/AdminTradingCard';
import { CardEditModal } from '@/components/CardEditModal';
import { CardCreateModal } from '@/components/CardCreateModal';
import { CSVOperations } from '@/components/CSVOperations';
import { QRCodePreview } from '@/components/QRCodePreview';
import { ImageDownloadButton } from '@/components/ImageDownloadButton';
import { BulkActionsBar } from '@/components/BulkActionsBar';
import { cn } from '@/lib/utils';
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
  image_code?: string | null;
  description: string | null;
  status: string;
  is_active: boolean;
  created_at: string;
  current_target?: string | null;
  qr_dark?: string | null;
  qr_light?: string | null;
  claim_token?: string | null; // Added for secure token-based claiming
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
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [qrCodes, setQrCodes] = useState<Map<string, string>>(new Map());
  
  // View mode state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => 
    (localStorage.getItem('adminCards_viewMode') as 'grid' | 'list') || 'grid'
  );
  const [cardSize, setCardSize] = useState<'sm' | 'md' | 'lg'>(() => 
    (localStorage.getItem('adminCards_cardSize') as 'sm' | 'md' | 'lg') || 'md'
  );
  
  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState('');
  const [modalImageName, setModalImageName] = useState('');

  // Sorting state
  const [sortField, setSortField] = useState<string>(() => 
    localStorage.getItem('adminCards_sortField') || 'created_at'
  );
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(() => 
    (localStorage.getItem('adminCards_sortDirection') as 'asc' | 'desc') || 'desc'
  );

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
      // Use tot.cards domain for production QRs
      const baseUrl = import.meta.env.PUBLIC_CLAIM_BASE_URL || 'https://tot.cards/claim?token=';
      const shortUrl = import.meta.env.PUBLIC_SHORT_CLAIM_BASE_URL;
      
      const claimUrl = shortUrl ? `${shortUrl}${code}` : `${baseUrl}${code}`;
      
      return await QRCode.toDataURL(claimUrl, {
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
      // Use claim_token for QR code generation, fallback to code if no claim_token
      const token = card.claim_token || card.code;
      const qrDataUrl = await generateQRCode(token, card.qr_dark, card.qr_light);
      setQrCodes(prev => new Map(prev).set(card.id, qrDataUrl));
    }
  };

  const fetchCards = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cards')
        .select('*, qr_dark, qr_light, image_code, claim_token')
        .is('deleted_at', null)
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

  // View mode functions
  const setViewModeAndSave = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('adminCards_viewMode', mode);
  };

  const setCardSizeAndSave = (size: 'sm' | 'md' | 'lg') => {
    setCardSize(size);
    localStorage.setItem('adminCards_cardSize', size);
  };

  // Modal functions
  const handleEditCard = (card: CardData) => {
    setSelectedCard(card);
    setShowEditModal(true);
  };

  const handleViewQR = (card: CardData) => {
    setSelectedCard(card);
    setShowQRModal(true);
    loadQRCode(card);
  };

  const handleViewImage = (imageUrl: string, cardName: string) => {
    setModalImageUrl(imageUrl);
    setModalImageName(cardName);
    setShowImageModal(true);
  };

  const handleModalClose = () => {
    setShowEditModal(false);
    setShowCreateModal(false);
    setShowQRModal(false);
    setShowImageModal(false);
    setSelectedCard(null);
    setModalImageUrl('');
    setModalImageName('');
  };

  const handleSaveCard = () => {
    fetchCards();
    handleModalClose();
  };

  const handleDeleteCard = async (cardId: string) => {
    try {
      const { data, error } = await supabase.rpc('admin_soft_delete_card', {
        p_card_id: cardId
      });

      if (error) throw error;

      if (data.ok) {
        toast({
          title: "Success",
          description: "Card deleted successfully",
        });
        fetchCards();
      } else {
        throw new Error(data.error || 'Delete failed');
      }
    } catch (error) {
      console.error('Error deleting card:', error);
      toast({
        title: "Error",
        description: "Failed to delete card",
        variant: "destructive",
      });
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

  const toggleSelectAll = () => {
    if (selectedCards.size === filteredCards.length && selectedCards.size > 0) {
      deselectAllCards();
    } else {
      selectAllCards();
    }
  };

  const isAllSelected = filteredCards.length > 0 && selectedCards.size === filteredCards.length;

  // Get status counts for filter badges
  const statusCounts = {
    all: cards.length,
    complete: cards.filter(card => card.status === 'active' && card.name !== 'Unknown').length,
    draft: cards.filter(card => card.status === 'draft' || card.name === 'Unknown').length,
    active: cards.filter(card => card.is_active).length,
    inactive: cards.filter(card => !card.is_active).length
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
          <div className="text-foreground">Loading card collection...</div>
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
                Card Collection Manager
              </h1>
              <p className="text-muted-foreground">Visual card management with CSV operations and modal editing</p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Card
              </Button>
              <CSVOperations 
                selectedCards={filteredCards.filter(card => selectedCards.has(card.id))}
                onImportComplete={fetchCards}
              />
            </div>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="glass-panel p-4 rounded-2xl mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-1">
              {/* Select All Checkbox */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={toggleSelectAll}
                    className="h-5 w-5 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <div 
                    className="absolute -inset-2 cursor-pointer" 
                    onClick={toggleSelectAll}
                  />
                </div>
                <label 
                  className="text-sm text-muted-foreground cursor-pointer select-none"
                  onClick={toggleSelectAll}
                >
                  Select All ({filteredCards.length})
                </label>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search cards..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-60"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cards ({statusCounts.all})</SelectItem>
                  <SelectItem value="active">Active ({statusCounts.active})</SelectItem>
                  <SelectItem value="inactive">Inactive ({statusCounts.inactive})</SelectItem>
                  <SelectItem value="complete">Complete ({statusCounts.complete})</SelectItem>
                  <SelectItem value="draft">Draft ({statusCounts.draft})</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select value={sortField} onValueChange={(value) => handleSortChange(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
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
                className="flex items-center gap-2"
              >
                <ArrowUpDown className="h-4 w-4" />
                {sortDirection === 'asc' ? 'Asc' : 'Desc'}
              </Button>
            </div>

            {/* View Controls */}
            <div className="flex items-center gap-2">
              {/* Selection Controls */}
              {selectedCards.size > 0 && (
                <div className="flex items-center gap-2 mr-4">
                  <Badge variant="secondary">{selectedCards.size} selected</Badge>
                  <Button variant="outline" size="sm" onClick={deselectAllCards}>
                    Clear
                  </Button>
                </div>
              )}

              {/* Card Size */}
              <Select value={cardSize} onValueChange={(value: 'sm' | 'md' | 'lg') => setCardSizeAndSave(value)}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sm">SM</SelectItem>
                  <SelectItem value="md">MD</SelectItem>
                  <SelectItem value="lg">LG</SelectItem>
                </SelectContent>
              </Select>

              {/* View Mode Toggle */}
              <div className="flex bg-muted/20 rounded-lg p-1">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewModeAndSave('grid')}
                  className="h-8 px-3"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewModeAndSave('list')}
                  className="h-8 px-3"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

        </div>

        {/* Main Content */}
        {viewMode === 'grid' ? (
          <div className="glass-panel p-6 rounded-2xl">
            <div className="grid gap-4 justify-items-center" style={{
              gridTemplateColumns: `repeat(auto-fill, minmax(${cardSize === 'sm' ? '160px' : cardSize === 'md' ? '200px' : '250px'}, 1fr))`
            }}>
              {filteredCards.map(card => (
                <AdminTradingCard
                  key={card.id}
                  card={card}
                  baseWidth={cardSize === 'sm' ? 160 : cardSize === 'md' ? 200 : 250}
                  isSelected={selectedCards.has(card.id)}
                  onSelect={toggleCardSelection}
                  onEdit={handleEditCard}
                  onViewQR={handleViewQR}
                  onViewImage={handleViewImage}
                  onDelete={handleDeleteCard}
                  onCopyToken={(token) => {
                    navigator.clipboard.writeText(token);
                    toast({
                      title: "Copied",
                      description: "Claim token copied to clipboard",
                    });
                  }}
                />
              ))}
            </div>

            {filteredCards.length === 0 && (
              <div className="text-center py-12">
                <div className="text-muted-foreground mb-4">No cards found</div>
                {searchTerm && (
                  <Button variant="outline" onClick={() => setSearchTerm('')}>
                    Clear search
                  </Button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center text-muted-foreground">
              List view coming soon - use grid view for now
            </div>
          </div>
        )}

        {/* Modals */}
        <CardEditModal
          card={selectedCard}
          isOpen={showEditModal}
          onClose={handleModalClose}
          onSave={handleSaveCard}
        />

        <CardCreateModal
          isOpen={showCreateModal}
          onClose={handleModalClose}
          onSave={handleSaveCard}
        />

        {/* QR Code Modal */}
        <Dialog open={showQRModal} onOpenChange={() => setShowQRModal(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>QR Code: {selectedCard?.name}</DialogTitle>
            </DialogHeader>
            {selectedCard && (
              <div className="space-y-4">
                <QRCodePreview
                  code={selectedCard.claim_token || selectedCard.code}
                  qrDark={selectedCard.qr_dark}
                  qrLight={selectedCard.qr_light}
                  showColorControls={false}
                  size={250}
                />
                <div className="text-sm text-muted-foreground text-center space-y-1">
                  <p>Card ID: {selectedCard.id}</p>
                  <p>Code: {selectedCard.code}</p>
                  {selectedCard.claim_token && (
                    <div className="flex items-center justify-center gap-2">
                      <span>Claim Token: {selectedCard.claim_token}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedCard.claim_token!);
                          toast({
                            title: "Copied",
                            description: "Claim token copied to clipboard",
                          });
                        }}
                        className="h-6 px-2 text-xs"
                      >
                        Copy
                      </Button>
                    </div>
                  )}
                  <p>QR URL: {import.meta.env.PUBLIC_CLAIM_BASE_URL || 'https://tot.cards/claim?token='}{selectedCard.claim_token || selectedCard.code}</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Image Modal */}
        <Dialog open={showImageModal} onOpenChange={() => setShowImageModal(false)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                {modalImageName}
                <ImageDownloadButton 
                  imageUrl={modalImageUrl} 
                  filename={`${modalImageName.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`}
                />
              </DialogTitle>
            </DialogHeader>
            <div className="flex justify-center">
              <img 
                src={modalImageUrl} 
                alt={modalImageName}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* Bulk Actions Bar */}
        {selectedCards.size > 0 && (
          <BulkActionsBar
            selectedCount={selectedCards.size}
            selectedCardIds={Array.from(selectedCards)}
            onClearSelection={deselectAllCards}
            onRefresh={fetchCards}
          />
        )}
      </div>
    </div>
  );
};

export default AdminCards;