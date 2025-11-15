import { ChevronDown, Edit, Archive, Trash2, Package } from 'lucide-react';
import { Button } from './ui/button';
import { PrintBatch } from '@/types/printBatch';
import { cn } from '@/lib/utils';

interface BatchHeaderProps {
  batch?: PrintBatch;
  cardCount: number;
  batchStats?: { avgTimeValue: number; rarityBreakdown: Record<string, number> };
  isExpanded: boolean;
  onEdit?: (batch: PrintBatch) => void;
  onArchive?: (batch: PrintBatch) => void;
  onDelete?: (batch: PrintBatch) => void;
  isUnassigned?: boolean;
}

export function BatchHeader({
  batch,
  cardCount,
  batchStats,
  isExpanded,
  onEdit,
  onArchive,
  onDelete,
  isUnassigned = false,
}: BatchHeaderProps) {
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (batch && onEdit) onEdit(batch);
  };

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (batch && onArchive) onArchive(batch);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (batch && onDelete) onDelete(batch);
  };

  return (
    <div className="flex items-center justify-between p-6 hover:bg-accent/5 transition-colors cursor-pointer">
      <div className="flex items-center gap-4 flex-1">
        <ChevronDown
          className={cn(
            "h-5 w-5 text-muted-foreground transition-transform",
            isExpanded && "transform rotate-180"
          )}
        />
        
        <Package className="h-5 w-5 text-primary" />
        
        <div className="flex-1">
          <h3 className="text-lg font-semibold">
            {isUnassigned ? 'Unassigned Cards' : batch?.name || 'Unknown Batch'}
          </h3>
          {!isUnassigned && batch && (
            <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
              {batch.print_date && (
                <span>Print Date: {new Date(batch.print_date).toLocaleDateString()}</span>
              )}
              {batch.description && (
                <span className="hidden sm:inline">{batch.description}</span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            {cardCount} {cardCount === 1 ? 'card' : 'cards'}
          </span>
          {batchStats && (
            <>
              <span className="text-muted-foreground">•</span>
              <span className="text-sm text-muted-foreground">
                Avg: {batchStats.avgTimeValue.toFixed(1)} TIME
              </span>
              <span className="text-muted-foreground">•</span>
              <div className="flex gap-1 text-xs">
                {Object.entries(batchStats.rarityBreakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([rarity, count]) => (
                    <span key={rarity} className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {rarity}: {count}
                    </span>
                  ))}
              </div>
            </>
          )}
        </div>
      </div>

      {!isUnassigned && batch && (
        <div className="flex items-center gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
          {onEdit && (
            <Button variant="ghost" size="sm" onClick={handleEdit}>
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {onArchive && (
            <Button variant="ghost" size="sm" onClick={handleArchive}>
              <Archive className="h-4 w-4" />
            </Button>
          )}
          {onDelete && cardCount === 0 && (
            <Button variant="ghost" size="sm" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
