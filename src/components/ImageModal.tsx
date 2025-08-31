import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: {
    id: string;
    name: string;
    suit: string;
    rank: string;
    era: string;
    rarity?: string;
    trader_value?: string | number;
    time_value?: number;
    image_url?: string;
    description?: string;
  };
}

export function ImageModal({ isOpen, onClose, card }: ImageModalProps) {
  const getSuitColor = (suit: string) => {
    switch (suit.toLowerCase()) {
      case 'hearts':
      case 'diamonds':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'clubs':
      case 'spades':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-primary/20 text-primary border-primary/30';
    }
  };

  const getEraColor = (era: string) => {
    const colors = [
      'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'bg-green-500/20 text-green-400 border-green-500/30', 
      'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'bg-orange-500/20 text-orange-400 border-orange-500/30',
      'bg-pink-500/20 text-pink-400 border-pink-500/30',
    ];
    const index = era.length % colors.length;
    return colors[index];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{card.name}</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Image */}
          <div className="bg-gradient-to-br from-muted/50 to-muted rounded-lg overflow-hidden">
            {card.image_url ? (
              <img 
                src={card.image_url} 
                alt={card.name}
                className="w-full h-auto object-contain max-h-[60vh]"
              />
            ) : (
              <div className="aspect-[3/4] flex items-center justify-center">
                <div className="text-6xl font-bold text-muted-foreground/50">
                  {card.rank}
                </div>
              </div>
            )}
          </div>

          {/* Card Details */}
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={getSuitColor(card.suit)}>
                {card.suit} {card.rank}
              </Badge>
              <Badge variant="outline" className={getEraColor(card.era)}>
                {card.era}
              </Badge>
              {card.rarity && (
                <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                  {card.rarity}
                </Badge>
              )}
            </div>

            <div className="space-y-3">
              {card.trader_value && (
                <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm font-medium">TLV (Trader Leverage Value)</span>
                  <span className="text-lg font-bold text-primary">{card.trader_value}</span>
                </div>
              )}
              
              {card.time_value && (
                <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm font-medium">TIME Value</span>
                  <span className="text-lg font-bold text-primary">{card.time_value}</span>
                </div>
              )}
            </div>

            {card.description && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Description</h4>
                <p className="text-sm text-muted-foreground">{card.description}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}