import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Search, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSearchParams } from 'react-router-dom';
import { CardEditModal } from '@/components/CardEditModal';
import { CardCreateModal } from '@/components/CardCreateModal';
import { CSVOperations } from '@/components/CSVOperations';
import { QRCodePreview } from '@/components/QRCodePreview';
import { ImageDownloadButton } from '@/components/ImageDownloadButton';
import { BulkActionsBar } from '@/components/BulkActionsBar';
import { BatchSection } from '@/components/BatchSection';
import { BatchCreateForm } from '@/components/BatchCreateForm';
import { PrintBatch } from '@/types/printBatch';
import { CardActivityTimeline } from '@/components/CardActivityTimeline';

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
  claim_token?: string | null;
  print_batch_id?: string | null;
  owner_user_id?: string | null;
  owner_email?: string | null;
  is_in_pending_redemption?: boolean;
  is_credited?: boolean;
}

const AdminCards = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [cards, setCards] = useState<CardData[]>([]);
  const [batches, setBatches] = useState<PrintBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
  
  // View mode state
  const [cardSize, setCardSize] = useState<'sm' | 'md' | 'lg'>(() => 
    (localStorage.getItem('adminCards_cardSize') as 'sm' | 'md' | 'lg') || 'md'
  );
  
  // Search and sort state
  const [globalSearch, setGlobalSearch] = useState('');
  const [sortBy, setSortBy] = useState<string>(() => 
    localStorage.getItem('adminCards_sortBy') || 'created_at'
  );
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(() => 
    (localStorage.getItem('adminCards_sortDirection') as 'asc' | 'desc') || 'desc'
  );
  
  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState('');
  const [modalImageName, setModalImageName] = useState('');
  const [csvImportBatchId, setCsvImportBatchId] = useState<string | null>(null);
  const [showCsvImportDialog, setShowCsvImportDialog] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyCardId, setHistoryCardId] = useState<string | null>(null);
  
  // Assign card modal state
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assignCardId, setAssignCardId] = useState<string | null>(null);
  const [assignEmail, setAssignEmail] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);
  
  // Release card modal state
  const [showReleaseDialog, setShowReleaseDialog] = useState(false);
  const [releaseCardData, setReleaseCardData] = useState<{
    cardId: string;
    cardName: string;
    ownerEmail: string;
  } | null>(null);
  const [releaseReason, setReleaseReason] = useState('');
  const [releaseLoading, setReleaseLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Load expanded state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('adminCards_expandedBatches');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setExpandedBatches(new Set(parsed));
      } catch (e) {
        console.error('Failed to parse expanded batches:', e);
      }
    }
  }, []);

  // Save expanded state to localStorage
  useEffect(() => {
    localStorage.setItem('adminCards_expandedBatches', JSON.stringify(Array.from(expandedBatches)));
  }, [expandedBatches]);

  // Save sort preferences to localStorage
  useEffect(() => {
    localStorage.setItem('adminCards_sortBy', sortBy);
    localStorage.setItem('adminCards_sortDirection', sortDirection);
  }, [sortBy, sortDirection]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Check admin access first
      const { data: adminCheck, error: adminError } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (adminError) throw adminError;
      
      if (!adminCheck) {
        toast({
          title: "Access Denied",
          description: "Admin access required",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      // Load batches
      const { data: batchesData, error: batchesError } = await supabase
        .from('print_batches')
        .select('*')
        .eq('is_active', true)
        .order('print_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (batchesError) throw batchesError;
      
      // Load cards using admin RPC (bypasses RLS)
      const { data: cardsData, error: cardsError } = await supabase.rpc('admin_list_cards', {
        p_search: '',
        p_limit: 1000,
        p_offset: 0,
        p_include_deleted: false
      });

      if (cardsError) throw cardsError;
      
      console.log('RPC returned', cardsData?.length, 'cards');

      // Transform RPC response to match CardData interface
      const transformedCards = cardsData?.map((card: any) => ({
        id: card.id,
        code: card.code,
        name: card.name,
        suit: card.suit,
        rank: card.rank,
        era: card.era,
        rarity: card.rarity,
        trader_value: card.trader_value,
        time_value: card.time_value,
        image_url: card.image_url,
        current_target: card.redirect || '',
        is_active: card.is_active,
        status: card.status,
        created_at: card.created_at,
        owner_user_id: card.owner_user_id,
        owner_email: card.owner_email,
        is_in_pending_redemption: card.is_in_pending_redemption || false,
        is_credited: card.is_credited || false,
        // Fields now provided by RPC
        image_code: card.image_code || null,
        description: card.description || null,
        qr_dark: card.qr_dark || null,
        qr_light: card.qr_light || null,
        claim_token: card.claim_token || null,
        print_batch_id: card.print_batch_id || null,
        batch_sort_order: card.batch_sort_order || null,
        deleted_at: card.deleted_at || null,
        deleted_by: card.deleted_by || null
      })) || [];

      setBatches(batchesData || []);
      setCards(transformedCards);

      // Auto-expand most recent batch on first load
      if (batchesData && batchesData.length > 0 && expandedBatches.size === 0) {
        setExpandedBatches(new Set([batchesData[0].id]));
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      const errorMsg = error?.message || '';
      const errorDetails = error?.details || '';
      const errorCode = error?.code || '';
      const errorHint = error?.hint || '';
      
      toast({
        title: "Error",
        description: `Failed to load data${errorMsg ? ': ' + errorMsg : ''}${errorDetails ? ' - ' + errorDetails : ''}${errorCode ? ' ['+errorCode+']' : ''}${errorHint ? ' ('+errorHint+')' : ''}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort cards, then group by batch
  const cardsByBatch = useMemo(() => {
    // Filter cards by global search
    let filteredCards = cards;
    if (globalSearch.trim()) {
      const searchLower = globalSearch.toLowerCase();
      filteredCards = cards.filter(card => 
        card.code.toLowerCase().includes(searchLower) ||
        card.name.toLowerCase().includes(searchLower) ||
        card.suit.toLowerCase().includes(searchLower) ||
        card.rank.toLowerCase().includes(searchLower) ||
        card.era.toLowerCase().includes(searchLower) ||
        (card.rarity && card.rarity.toLowerCase().includes(searchLower))
      );
    }

    // Sort cards
    const sortedCards = [...filteredCards].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'code':
          comparison = a.code.localeCompare(b.code);
          break;
        case 'suit':
          const suitOrder = { 'spades': 1, 'hearts': 2, 'diamonds': 3, 'clubs': 4 };
          comparison = (suitOrder[a.suit.toLowerCase() as keyof typeof suitOrder] || 999) - 
                      (suitOrder[b.suit.toLowerCase() as keyof typeof suitOrder] || 999);
          break;
        case 'rank':
          const rankOrder: Record<string, number> = { 
            'ace': 1, 'king': 2, 'queen': 3, 'jack': 4, 
            '10': 5, '9': 6, '8': 7, '7': 8, '6': 9, '5': 10, '4': 11, '3': 12, '2': 13 
          };
          comparison = (rankOrder[a.rank.toLowerCase()] || 999) - 
                      (rankOrder[b.rank.toLowerCase()] || 999);
          break;
        case 'era':
          comparison = a.era.localeCompare(b.era);
          break;
        case 'rarity':
          const rarityOrder: Record<string, number> = { 
            'degen': 1, 'trader': 2, 'investor': 3, 'market maker': 4, 'whale': 5 
          };
          comparison = (rarityOrder[(a.rarity || '').toLowerCase()] || 999) - 
                      (rarityOrder[(b.rarity || '').toLowerCase()] || 999);
          break;
        case 'time_value':
          comparison = a.time_value - b.time_value;
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'created_at':
        default:
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    // Group sorted/filtered cards by batch
    const grouped = new Map<string, CardData[]>();
    
    batches.forEach(batch => {
      grouped.set(batch.id, sortedCards.filter(c => c.print_batch_id === batch.id));
    });
    
    // Unassigned cards
    grouped.set('unassigned', sortedCards.filter(c => !c.print_batch_id));
    
    return grouped;
  }, [cards, batches, globalSearch, sortBy, sortDirection]);

  // Count total filtered cards
  const totalFilteredCards = useMemo(() => {
    let count = 0;
    cardsByBatch.forEach(cards => count += cards.length);
    return count;
  }, [cardsByBatch]);

  const toggleBatch = (batchId: string) => {
    setExpandedBatches(prev => {
      const newSet = new Set(prev);
      if (newSet.has(batchId)) {
        newSet.delete(batchId);
      } else {
        newSet.add(batchId);
      }
      return newSet;
    });
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
    loadData();
    handleModalClose();
  };

  const handleAssignCard = (cardId: string) => {
    setAssignCardId(cardId);
    setAssignEmail('');
    setShowAssignDialog(true);
  };

  const confirmAssign = async () => {
    if (!assignCardId || !assignEmail.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setAssignLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_assign_card', {
        p_card_id: assignCardId,
        p_user_email: assignEmail.trim()
      });

      if (error) throw error;

      if (data.ok) {
        toast({
          title: "Success",
          description: data.already_owned 
            ? "User already owns this card"
            : `Card assigned to ${assignEmail}`,
        });
        setShowAssignDialog(false);
        loadData();
      } else {
        const errorMsg = data.error === 'user_not_found' 
          ? "User not found with that email"
          : data.error === 'user_blocked'
          ? "Cannot assign to blocked user"
          : "Failed to assign card";
        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error assigning card:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to assign card",
        variant: "destructive",
      });
    } finally {
      setAssignLoading(false);
    }
  };

  const handleReleaseCard = (cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (!card || !card.owner_email) return;

    setReleaseCardData({
      cardId,
      cardName: card.name,
      ownerEmail: card.owner_email
    });
    setReleaseReason('');
    setShowReleaseDialog(true);
  };

  const confirmRelease = async () => {
    if (!releaseCardData) return;

    setReleaseLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_release_card', {
        p_card_id: releaseCardData.cardId,
        p_reason: releaseReason.trim() || 'Admin released card'
      });

      if (error) throw error;

      if (data.ok) {
        const warningMsg = data.had_pending_redemption 
          ? " (Warning: Card had pending redemption)"
          : "";
        toast({
          title: "Success",
          description: `Card released from ${releaseCardData.ownerEmail}${warningMsg}`,
        });
        setShowReleaseDialog(false);
        loadData();
      } else {
        const errorMsg = data.error === 'not_owned'
          ? "Card is not currently owned"
          : "Failed to release card";
        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error releasing card:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to release card",
        variant: "destructive",
      });
    } finally {
      setReleaseLoading(false);
    }
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
        loadData();
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

  const deselectAllCards = () => {
    setSelectedCards(new Set());
  };

  const handleEditBatch = async (batch: PrintBatch) => {
    const name = prompt('Batch name:', batch.name);
    if (!name) return;

    try {
      const { error } = await supabase
        .from('print_batches')
        .update({ name: name.trim() })
        .eq('id', batch.id);

      if (error) throw error;

      toast({ title: "Success", description: "Batch updated" });
      loadData();
    } catch (error) {
      console.error('Error updating batch:', error);
      toast({ title: "Error", description: "Failed to update batch", variant: "destructive" });
    }
  };

  const handleArchiveBatch = async (batch: PrintBatch) => {
    if (!confirm(`Archive "${batch.name}"? It will be hidden from this view.`)) return;

    try {
      const { error } = await supabase
        .from('print_batches')
        .update({ is_active: false })
        .eq('id', batch.id);

      if (error) throw error;

      toast({ title: "Success", description: "Batch archived" });
      loadData();
    } catch (error) {
      console.error('Error archiving batch:', error);
      toast({ title: "Error", description: "Failed to archive batch", variant: "destructive" });
    }
  };

  const handleDeleteBatch = async (batch: PrintBatch) => {
    if (!confirm(`Delete "${batch.name}"? This cannot be undone.`)) return;

    try {
      const { error } = await supabase
        .from('print_batches')
        .delete()
        .eq('id', batch.id);

      if (error) throw error;

      toast({ title: "Success", description: "Batch deleted" });
      loadData();
    } catch (error) {
      console.error('Error deleting batch:', error);
      toast({ title: "Error", description: "Failed to delete batch", variant: "destructive" });
    }
  };

  const handleImportCSV = (batchId: string | null) => {
    setCsvImportBatchId(batchId);
    setShowCsvImportDialog(true);
  };

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
          <div className="flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent mb-2">
                  📦 Card Management
                </h1>
                <p className="text-muted-foreground">Organize cards by print batches</p>
              </div>
              <div className="flex gap-2 items-center flex-wrap">
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
                
                <Button 
                  onClick={() => setShowCreateModal(true)}
                  className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Card
                </Button>
                <CSVOperations 
                  selectedCards={[]}
                  onImportComplete={loadData}
                  currentBatchId={csvImportBatchId}
                  showBatchContext={!!csvImportBatchId}
                  isOpen={showCsvImportDialog}
                  onOpenChange={setShowCsvImportDialog}
                />
              </div>
            </div>

            {/* Search and Sort Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Global Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search all cards by code, name, suit, rank, era, rarity..."
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  className="pl-9 pr-9"
                />
                {globalSearch && (
                  <button
                    onClick={() => setGlobalSearch('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Sort Controls */}
              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">Created Date</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="code">Code</SelectItem>
                    <SelectItem value="suit">Suit</SelectItem>
                    <SelectItem value="rank">Rank</SelectItem>
                    <SelectItem value="era">Era</SelectItem>
                    <SelectItem value="rarity">Rarity</SelectItem>
                    <SelectItem value="time_value">Time Value</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={sortDirection} onValueChange={(value: 'asc' | 'desc') => setSortDirection(value)}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Results Count */}
            <div className="text-sm text-muted-foreground">
              {globalSearch ? (
                <span>Showing {totalFilteredCards} of {cards.length} cards</span>
              ) : (
                <span>Showing all {cards.length} cards</span>
              )}
            </div>
          </div>
        </div>

        {/* Batch Creation Form */}
        <BatchCreateForm onBatchCreated={loadData} batchCount={batches.length} />

        {/* Batch Sections */}
        <div className="space-y-4">
          {batches.map((batch) => (
            <BatchSection
              key={batch.id}
              batch={batch}
              cards={cardsByBatch.get(batch.id) || []}
              isExpanded={expandedBatches.has(batch.id)}
              onToggle={() => toggleBatch(batch.id)}
              onEdit={handleEditBatch}
              onArchive={handleArchiveBatch}
              onDelete={handleDeleteBatch}
              onImportCSV={() => handleImportCSV(batch.id)}
              cardSize={cardSize}
              selectedCards={selectedCards}
              onSelectCard={toggleCardSelection}
              onEditCard={handleEditCard}
              onViewQR={handleViewQR}
              onViewImage={handleViewImage}
              onDeleteCard={handleDeleteCard}
              onCopyToken={(token) => {
                navigator.clipboard.writeText(token);
                toast({ title: "Copied", description: "Claim token copied to clipboard" });
              }}
              onViewHistory={(cardId) => {
                setHistoryCardId(cardId);
                setShowHistoryModal(true);
              }}
              onAssignCard={handleAssignCard}
              onReleaseCard={handleReleaseCard}
            />
          ))}

          {/* Unassigned Cards Section */}
          {(cardsByBatch.get('unassigned')?.length || 0) > 0 && (
            <BatchSection
              cards={cardsByBatch.get('unassigned') || []}
              isExpanded={expandedBatches.has('unassigned')}
              onToggle={() => toggleBatch('unassigned')}
              onImportCSV={() => handleImportCSV(null)}
              cardSize={cardSize}
              selectedCards={selectedCards}
              onSelectCard={toggleCardSelection}
              onEditCard={handleEditCard}
              onViewQR={handleViewQR}
              onViewImage={handleViewImage}
              onDeleteCard={handleDeleteCard}
              onCopyToken={(token) => {
                navigator.clipboard.writeText(token);
                toast({ title: "Copied", description: "Claim token copied to clipboard" });
              }}
              onViewHistory={(cardId) => {
                setHistoryCardId(cardId);
                setShowHistoryModal(true);
              }}
              onAssignCard={handleAssignCard}
              onReleaseCard={handleReleaseCard}
              isUnassigned
            />
          )}

          {/* Empty State */}
          {batches.length === 0 && cards.length === 0 && (
            <div className="glass-panel p-12 rounded-2xl text-center">
              <div className="text-muted-foreground mb-4">
                No batches or cards yet. Create your first batch above to get started.
              </div>
            </div>
          )}
        </div>

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

        {/* Card History Modal */}
        <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Card Ownership History</DialogTitle>
            </DialogHeader>
            {historyCardId && (
              <CardActivityTimeline cardId={historyCardId} />
            )}
          </DialogContent>
        </Dialog>

        {/* Assign Card Dialog */}
        <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Card to User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">User Email:</label>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={assignEmail}
                  onChange={(e) => setAssignEmail(e.target.value)}
                  disabled={assignLoading}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowAssignDialog(false)}
                  disabled={assignLoading}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={confirmAssign}
                  disabled={assignLoading || !assignEmail.trim()}
                >
                  {assignLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Assign Card
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Release Card Dialog */}
        <Dialog open={showReleaseDialog} onOpenChange={setShowReleaseDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Release Card to Wild</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {releaseCardData && (
                <>
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-md p-3">
                    <p className="text-sm">
                      <strong>Card:</strong> {releaseCardData.cardName}
                    </p>
                    <p className="text-sm">
                      <strong>Current Owner:</strong> {releaseCardData.ownerEmail}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Reason (optional):</label>
                    <Input
                      placeholder="e.g., Admin correction, duplicate claim..."
                      value={releaseReason}
                      onChange={(e) => setReleaseReason(e.target.value)}
                      disabled={releaseLoading}
                    />
                  </div>
                </>
              )}
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowReleaseDialog(false)}
                  disabled={releaseLoading}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={confirmRelease}
                  disabled={releaseLoading}
                  variant="destructive"
                >
                  {releaseLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Release Card
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Bulk Actions Bar */}
        {selectedCards.size > 0 && (
          <BulkActionsBar
            selectedCount={selectedCards.size}
            selectedCardIds={Array.from(selectedCards)}
            onClearSelection={deselectAllCards}
            onRefresh={loadData}
          />
        )}
      </div>
    </div>
  );
};

export default AdminCards;
