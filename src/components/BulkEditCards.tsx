import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Save, X, ArrowLeft, Palette } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { QRCodePreview } from '@/components/QRCodePreview';
import { getQRColorsForEra } from '@/lib/qr-colors';

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

interface BulkEditCardsProps {
  cards: CardData[];
  onSave: () => void;
  onCancel: () => void;
}

export const BulkEditCards = ({ cards, onSave, onCancel }: BulkEditCardsProps) => {
  const { toast } = useToast();
  const [editedCards, setEditedCards] = useState<Map<string, Partial<CardData>>>(new Map());
  const [saving, setSaving] = useState(false);

  const updateCard = (cardId: string, field: keyof CardData, value: any) => {
    setEditedCards(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(cardId) || {};
      newMap.set(cardId, { ...existing, [field]: value });
      return newMap;
    });
  };

  const getCardValue = (card: CardData, field: keyof CardData) => {
    const edited = editedCards.get(card.id);
    return edited?.[field] !== undefined ? edited[field] : card[field];
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const updates = Array.from(editedCards.entries()).map(([cardId, changes]) => ({
        id: cardId,
        ...changes
      }));

      if (updates.length === 0) {
        toast({
          title: "No Changes",
          description: "No cards were modified",
        });
        onCancel();
        return;
      }

      for (const update of updates) {
        const { error } = await supabase
          .from('cards')
          .update(update)
          .eq('id', update.id);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Updated ${updates.length} cards successfully`,
      });
      
      onSave();
    } catch (error) {
      console.error('Error updating cards:', error);
      toast({
        title: "Error",
        description: "Failed to update cards",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Bulk Edit Cards
          </h2>
          <p className="text-muted-foreground">Editing {cards.length} selected cards</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to List
          </Button>
          <Button onClick={handleSaveAll} disabled={saving}>
            {saving ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save All Changes
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {cards.map((card) => (
          <Card key={card.id} className="glass-panel border-primary/20">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{card.name}</CardTitle>
                  <Badge variant="secondary" className="mt-1">{card.code}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {editedCards.has(card.id) ? 'Modified' : 'No changes'}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`name-${card.id}`}>Name</Label>
                  <Input
                    id={`name-${card.id}`}
                    value={getCardValue(card, 'name') as string}
                    onChange={(e) => updateCard(card.id, 'name', e.target.value)}
                    className="bg-background/50 border-primary/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`suit-${card.id}`}>Suit</Label>
                  <Input
                    id={`suit-${card.id}`}
                    value={getCardValue(card, 'suit') as string}
                    onChange={(e) => updateCard(card.id, 'suit', e.target.value)}
                    className="bg-background/50 border-primary/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`rank-${card.id}`}>Rank</Label>
                  <Input
                    id={`rank-${card.id}`}
                    value={getCardValue(card, 'rank') as string}
                    onChange={(e) => updateCard(card.id, 'rank', e.target.value)}
                    className="bg-background/50 border-primary/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`era-${card.id}`}>Era</Label>
                  <Select 
                    value={getCardValue(card, 'era') as string}
                    onValueChange={(value) => {
                      const colors = getQRColorsForEra(value);
                      updateCard(card.id, 'era', value);
                      updateCard(card.id, 'qr_dark', colors.dark);
                      updateCard(card.id, 'qr_light', colors.light);
                    }}
                  >
                    <SelectTrigger className="bg-background/50 border-primary/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Prehistoric">🦕 Prehistoric</SelectItem>
                      <SelectItem value="Ancient">🏛️ Ancient</SelectItem>
                      <SelectItem value="Medieval">⚔️ Medieval</SelectItem>
                      <SelectItem value="Modern">🏢 Modern</SelectItem>
                      <SelectItem value="Future">🚀 Future</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`rarity-${card.id}`}>Rarity</Label>
                  <Input
                    id={`rarity-${card.id}`}
                    value={(getCardValue(card, 'rarity') as string) || ''}
                    onChange={(e) => updateCard(card.id, 'rarity', e.target.value || null)}
                    className="bg-background/50 border-primary/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`time_value-${card.id}`}>TIME Value</Label>
                  <Input
                    id={`time_value-${card.id}`}
                    type="number"
                    value={getCardValue(card, 'time_value') as number}
                    onChange={(e) => updateCard(card.id, 'time_value', parseInt(e.target.value) || 0)}
                    className="bg-background/50 border-primary/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`trader_value-${card.id}`}>Trader Value</Label>
                  <Input
                    id={`trader_value-${card.id}`}
                    value={(getCardValue(card, 'trader_value') as string) || ''}
                    onChange={(e) => updateCard(card.id, 'trader_value', e.target.value || null)}
                    className="bg-background/50 border-primary/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`status-${card.id}`}>Status</Label>
                  <Select 
                    value={getCardValue(card, 'status') as string}
                    onValueChange={(value) => updateCard(card.id, 'status', value)}
                  >
                    <SelectTrigger className="bg-background/50 border-primary/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="unprinted">Unprinted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Checkbox
                      checked={getCardValue(card, 'is_active') as boolean}
                      onCheckedChange={(checked) => updateCard(card.id, 'is_active', checked)}
                    />
                    Active
                  </Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`image_url-${card.id}`}>Image URL</Label>
                <Input
                  id={`image_url-${card.id}`}
                  value={(getCardValue(card, 'image_url') as string) || ''}
                  onChange={(e) => updateCard(card.id, 'image_url', e.target.value || null)}
                  className="bg-background/50 border-primary/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`current_target-${card.id}`}>Redirect URL</Label>
                <Input
                  id={`current_target-${card.id}`}
                  value={(getCardValue(card, 'current_target') as string) || ''}
                  onChange={(e) => updateCard(card.id, 'current_target', e.target.value || null)}
                  className="bg-background/50 border-primary/20"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`qr_dark-${card.id}`}>QR Dark Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={(getCardValue(card, 'qr_dark') as string) || '#000000'}
                      onChange={(e) => updateCard(card.id, 'qr_dark', e.target.value)}
                      className="w-12 h-8 p-1 border rounded"
                    />
                    <Input
                      id={`qr_dark-${card.id}`}
                      value={(getCardValue(card, 'qr_dark') as string) || '#000000'}
                      onChange={(e) => updateCard(card.id, 'qr_dark', e.target.value || null)}
                      placeholder="#000000"
                      className="bg-background/50 border-primary/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`qr_light-${card.id}`}>QR Light Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={(getCardValue(card, 'qr_light') as string) || '#FFFFFF'}
                      onChange={(e) => updateCard(card.id, 'qr_light', e.target.value)}
                      className="w-12 h-8 p-1 border rounded"
                    />
                    <Input
                      id={`qr_light-${card.id}`}
                      value={(getCardValue(card, 'qr_light') as string) || '#FFFFFF'}
                      onChange={(e) => updateCard(card.id, 'qr_light', e.target.value || null)}
                      placeholder="#FFFFFF"
                      className="bg-background/50 border-primary/20"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>QR Code Preview</Label>
                <QRCodePreview
                  code={card.code}
                  qrDark={(getCardValue(card, 'qr_dark') as string) || '#000000'}
                  qrLight={(getCardValue(card, 'qr_light') as string) || '#FFFFFF'}
                  size={150}
                  cardName={getCardValue(card, 'name') as string}
                  suit={getCardValue(card, 'suit') as string}
                  rank={getCardValue(card, 'rank') as string}
                  className="max-w-48"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`description-${card.id}`}>Description</Label>
                <Textarea
                  id={`description-${card.id}`}
                  value={(getCardValue(card, 'description') as string) || ''}
                  onChange={(e) => updateCard(card.id, 'description', e.target.value || null)}
                  className="bg-background/50 border-primary/20"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};