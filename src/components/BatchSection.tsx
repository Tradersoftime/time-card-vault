import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Upload } from 'lucide-react';
import { PrintBatch } from '@/types/printBatch';
import { BatchHeader } from './BatchHeader';
import { AdminTradingCard } from './AdminTradingCard';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  isUnassigned?: boolean;
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
  isUnassigned = false,
}: BatchSectionProps) {
  const [sectionSearch, setSectionSearch] = useState('');

  const filteredCards = cards.filter(card =>
    card.name.toLowerCase().includes(sectionSearch.toLowerCase()) ||
    card.code.toLowerCase().includes(sectionSearch.toLowerCase()) ||
    card.suit.toLowerCase().includes(sectionSearch.toLowerCase())
  );

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
            <Button variant="outline" size="sm" onClick={onImportCSV}>
              <Upload className="h-4 w-4 mr-2" />
              Import CSV to {isUnassigned ? 'Unassigned' : 'This Batch'}
            </Button>
          </div>

          {/* Cards Grid */}
          <div
            className={cn(
              "grid gap-4 justify-items-center",
              filteredCards.length === 0 && "hidden"
            )}
            style={{
              gridTemplateColumns: `repeat(auto-fill, minmax(${cardWidth}px, 1fr))`,
            }}
          >
            {filteredCards.map((card) => (
              <AdminTradingCard
                key={card.id}
                card={card}
                baseWidth={cardWidth}
                isSelected={selectedCards.has(card.id)}
                onSelect={onSelectCard}
                onEdit={onEditCard}
                onViewQR={onViewQR}
                onViewImage={onViewImage}
                onDelete={onDeleteCard}
                onCopyToken={onCopyToken}
              />
            ))}
          </div>

          {/* Empty State */}
          {filteredCards.length === 0 && (
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
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
