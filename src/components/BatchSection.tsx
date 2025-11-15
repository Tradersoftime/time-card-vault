import { useState, useEffect, useMemo } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Upload, GripVertical } from 'lucide-react';
import { PrintBatch } from '@/types/printBatch';
import { BatchHeader } from './BatchHeader';
import { AdminTradingCard } from './AdminTradingCard';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BatchFilters, BatchFiltersState } from './BatchFilters';
import { DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  batch_sort_order?: number | null;
  claimed_by?: string | null;
  owner_user_id?: string | null;
  owner_email?: string | null;
  is_in_pending_redemption?: boolean;
  is_credited?: boolean;
}

interface BatchSectionProps {
  batch?: PrintBatch;
  cards: CardData[];
  isExpanded: boolean;
  onToggle: () => void;
  onEdit?: (batch: PrintBatch) => void;
  onArchive?: (batch: PrintBatch) => void;
  onDelete?: (batch: PrintBatch) => void;
  onImportCSV: () => void;
  cardSize: 'sm' | 'md' | 'lg';
  selectedCards: Set<string>;
  onSelectCard: (cardId: string) => void;
  onEditCard: (card: CardData) => void;
  onViewQR: (card: CardData) => void;
  onViewImage: (imageUrl: string, cardName: string) => void;
  onDeleteCard: (cardId: string) => void;
  onCopyToken: (token: string) => void;
  onViewHistory: (cardId: string) => void;
  onAssignCard?: (cardId: string) => void;
  onReleaseCard?: (cardId: string) => void;
  isUnassigned?: boolean;
}

// Wrapper component for sortable cards
function SortableCard({ 
  card, 
  isSelected, 
  onSelect, 
  onEdit, 
  onViewQR, 
  onViewImage, 
  onDelete, 
  onCopyToken, 
  onViewHistory, 
  onAssignCard, 
  onReleaseCard, 
  baseWidth, 
  isDragEnabled 
}: {
  card: CardData;
  isSelected: boolean;
  onSelect: (cardId: string) => void;
  onEdit: (card: CardData) => void;
  onViewQR: (card: CardData) => void;
  onViewImage: (imageUrl: string, cardName: string) => void;
  onDelete: (cardId: string) => void;
  onCopyToken: (token: string) => void;
  onViewHistory: (cardId: string) => void;
  onAssignCard?: (cardId: string) => void;
  onReleaseCard?: (cardId: string) => void;
  baseWidth: number;
  isDragEnabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: card.id,
    disabled: !isDragEnabled
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {isDragEnabled && (
        <div 
          {...attributes} 
          {...listeners}
          className="absolute -left-6 top-1/2 -translate-y-1/2 z-10 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="w-5 h-5 text-muted-foreground" />
        </div>
      )}
      <AdminTradingCard
        card={card}
        isSelected={isSelected}
        onSelect={onSelect}
        onEdit={onEdit}
        onViewQR={onViewQR}
        onViewImage={onViewImage}
        onDelete={onDelete}
        onCopyToken={onCopyToken}
        onViewHistory={onViewHistory}
        onAssignCard={onAssignCard}
        onReleaseCard={onReleaseCard}
        baseWidth={baseWidth}
      />
    </div>
  );
}

export function BatchSection({
  batch,
  cards,
  isExpanded,
  onToggle,
  onEdit,
  onArchive,
  onDelete,
  onImportCSV,
  cardSize,
  selectedCards,
  onSelectCard,
  onEditCard,
  onViewQR,
  onViewImage,
  onDeleteCard,
  onCopyToken,
  onViewHistory,
  onAssignCard,
  onReleaseCard,
  isUnassigned = false,
}: BatchSectionProps) {
  const { toast } = useToast();
  const [sectionSearch, setSectionSearch] = useState('');
  const [reorderMode, setReorderMode] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [localCards, setLocalCards] = useState(cards);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    setLocalCards(cards);
  }, [cards]);
  
  // Get storage key for this batch
  const storageKey = `batch-filters-${batch?.id || 'unassigned'}`;
  
  // Initialize filters from localStorage
  const [filters, setFilters] = useState<BatchFiltersState>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {
          suits: [],
          ranks: [],
          eras: [],
          rarities: [],
          statuses: [],
          timeValueMin: null,
          timeValueMax: null,
          traderValues: [],
          claimedStatus: 'all' as const,
        };
      }
    }
    return {
      suits: [],
      ranks: [],
      eras: [],
      rarities: [],
      statuses: [],
      timeValueMin: null,
      timeValueMax: null,
      traderValues: [],
      claimedStatus: 'all' as const,
    };
  });

  // Save filters to localStorage
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(filters));
  }, [filters, storageKey]);

  // Extract unique options for dynamic filters
  const availableOptions = useMemo(() => {
    const eras = [...new Set(cards.map(c => c.era).filter(Boolean))].sort();
    const traderValues = [...new Set(cards.map(c => c.trader_value).filter(Boolean))].sort() as string[];
    return { eras, traderValues };
  }, [cards]);

  // Apply all filters
  const filteredCards = useMemo(() => {
    return localCards.filter(card => {
      // Text search
      const matchesSearch = 
        card.name.toLowerCase().includes(sectionSearch.toLowerCase()) ||
        card.code.toLowerCase().includes(sectionSearch.toLowerCase()) ||
        card.suit.toLowerCase().includes(sectionSearch.toLowerCase());
      
      if (!matchesSearch) return false;

      // Suit filter
      if (filters.suits.length > 0 && !filters.suits.includes(card.suit)) return false;

      // Rank filter
      if (filters.ranks.length > 0 && !filters.ranks.includes(card.rank)) return false;

      // Era filter
      if (filters.eras.length > 0 && !filters.eras.includes(card.era)) return false;

      // Rarity filter
      if (filters.rarities.length > 0) {
        if (!card.rarity || !filters.rarities.includes(card.rarity)) return false;
      }

      // Status filter
      if (filters.statuses.length > 0) {
        const cardStatus = card.is_active ? 'Active' : 'Inactive';
        if (!filters.statuses.includes(cardStatus)) return false;
      }

      // Time Value range
      if (filters.timeValueMin !== null && card.time_value < filters.timeValueMin) return false;
      if (filters.timeValueMax !== null && card.time_value > filters.timeValueMax) return false;

      // Trader Value filter
      if (filters.traderValues.length > 0) {
        if (!card.trader_value || !filters.traderValues.includes(card.trader_value)) return false;
      }

      // Claimed status
      if (filters.claimedStatus !== 'all') {
        const isClaimed = !!card.claimed_by;
        if (filters.claimedStatus === 'claimed' && !isClaimed) return false;
        if (filters.claimedStatus === 'unclaimed' && isClaimed) return false;
      }

      return true;
    });
  }, [localCards, sectionSearch, filters]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id || !batch?.id) {
      return;
    }

    const oldIndex = localCards.findIndex(c => c.id === active.id);
    const newIndex = localCards.findIndex(c => c.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Reorder locally
    const reordered = [...localCards];
    const [movedCard] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, movedCard);

    // Assign new batch_sort_order values (10, 20, 30...)
    const updates = reordered.map((card, index) => ({
      id: card.id,
      batch_sort_order: (index + 1) * 10
    }));

    // Optimistically update UI
    setLocalCards(reordered.map((card, index) => ({
      ...card,
      batch_sort_order: (index + 1) * 10
    })));

    // Persist to database
    setReordering(true);
    try {
      for (const update of updates) {
        const { error } = await supabase
          .from('cards')
          .update({ batch_sort_order: update.batch_sort_order })
          .eq('id', update.id);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Card order updated",
      });
    } catch (error: any) {
      console.error('Error reordering cards:', error);
      toast({
        title: "Error",
        description: "Failed to update card order",
        variant: "destructive",
      });
      // Revert on error
      setLocalCards(cards);
    } finally {
      setReordering(false);
    }
  };

  const cardWidth = cardSize === 'sm' ? 160 : cardSize === 'md' ? 200 : 250;

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle} className="glass-panel rounded-2xl overflow-hidden">
      <CollapsibleTrigger className="w-full">
        <BatchHeader
          batch={batch}
          cardCount={cards.length}
          isExpanded={isExpanded}
          onEdit={onEdit}
          onArchive={onArchive}
          onDelete={onDelete}
          isUnassigned={isUnassigned}
        />
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="border-t border-border/50 p-6 space-y-4">
          {/* Advanced Filters */}
          <BatchFilters
            filters={filters}
            onChange={setFilters}
            availableOptions={availableOptions}
          />

          {/* Batch Actions */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Search in ${isUnassigned ? 'unassigned cards' : batch?.name}...`}
                value={sectionSearch}
                onChange={(e) => setSectionSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            {batch?.id && (
              <Button
                variant={reorderMode ? "default" : "outline"}
                size="sm"
                onClick={() => setReorderMode(!reorderMode)}
                disabled={reordering}
              >
                {reordering ? "Reordering..." : reorderMode ? "Done Reordering" : "Reorder"}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onImportCSV}>
              <Upload className="h-4 w-4 mr-2" />
              Import CSV to {isUnassigned ? 'Unassigned' : 'This Batch'}
            </Button>
          </div>

          {/* Results Counter */}
          {filteredCards.length !== cards.length && (
            <div className="text-sm text-muted-foreground">
              Showing {filteredCards.length} of {cards.length} cards
            </div>
          )}

          {/* Cards Grid */}
          {filteredCards.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                {sectionSearch 
                  ? `No cards match "${sectionSearch}"` 
                  : isUnassigned 
                    ? 'No unassigned cards' 
                    : 'No cards in this batch yet'}
              </div>
              {sectionSearch && (
                <Button variant="outline" onClick={() => setSectionSearch('')}>
                  Clear search
                </Button>
              )}
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={filteredCards.map(c => c.id)} strategy={verticalListSortingStrategy}>
                <div
                  className={cn(
                    "grid gap-4 justify-items-center",
                    reorderMode && "grid-cols-1"
                  )}
                  style={reorderMode ? {} : {
                    gridTemplateColumns: `repeat(auto-fill, minmax(${cardWidth}px, 1fr))`,
                  }}
                >
                  {filteredCards.map((card) => (
                    <div key={card.id} className="group relative pl-6 w-full">
                      <SortableCard
                        card={card}
                        isSelected={selectedCards.has(card.id)}
                        onSelect={onSelectCard}
                        onEdit={onEditCard}
                        onViewQR={onViewQR}
                        onViewImage={onViewImage}
                        onDelete={onDeleteCard}
                        onCopyToken={onCopyToken}
                        onViewHistory={onViewHistory}
                        onAssignCard={onAssignCard}
                        onReleaseCard={onReleaseCard}
                        baseWidth={cardWidth}
                        isDragEnabled={reorderMode && !!batch?.id}
                      />
                    </div>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
