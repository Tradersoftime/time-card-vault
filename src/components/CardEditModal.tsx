import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ImageUpload } from '@/components/ImageUpload';
import { QRCodePreview } from '@/components/QRCodePreview';
import { Loader2, AlertTriangle } from 'lucide-react';

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
}

interface CardEditModalProps {
  card: CardData | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function CardEditModal({ card, isOpen, onClose, onSave }: CardEditModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
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
    current_target: '',
    qr_dark: '#000000',
    qr_light: '#FFFFFF'
  });

  useEffect(() => {
    if (card) {
      setFormData({
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
        current_target: card.current_target || '',
        qr_dark: card.qr_dark || '#000000',
        qr_light: card.qr_light || '#FFFFFF'
      });
    }
  }, [card]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!card) return;
    
    setLoading(true);
    try {
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
          current_target: formData.current_target || null,
          qr_dark: formData.qr_dark || null,
          qr_light: formData.qr_light || null
        })
        .eq('id', card.id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: `Card "${formData.name}" updated successfully`,
      });
      
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving card:', error);
      toast({
        title: "Error",
        description: "Failed to save card",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleColorChange = (qrDark: string, qrLight: string) => {
    setFormData(prev => ({
      ...prev,
      qr_dark: qrDark,
      qr_light: qrLight
    }));
  };

  if (!card) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edit Card: {card.name}
            <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">
              Code: {card.code}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {card.is_active && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-yellow-500">Active Card Warning</p>
              <p className="text-muted-foreground">
                This card is active and users may be relying on its data for authentication. 
                Changes will be reflected immediately.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Card Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="suit">Suit *</Label>
                  <Select value={formData.suit} onValueChange={(value) => setFormData(prev => ({ ...prev, suit: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select suit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Hearts">
                        <span className="flex items-center gap-2">
                          <span className="text-red-500 text-lg font-bold">♥</span>
                          Hearts
                        </span>
                      </SelectItem>
                      <SelectItem value="Diamonds">
                        <span className="flex items-center gap-2">
                          <span className="text-red-500 text-lg font-bold">♦</span>
                          Diamonds
                        </span>
                      </SelectItem>
                      <SelectItem value="Clubs">
                        <span className="flex items-center gap-2">
                          <span className="text-success text-lg font-bold">♣</span>
                          Clubs
                        </span>
                      </SelectItem>
                      <SelectItem value="Spades">
                        <span className="flex items-center gap-2">
                          <span className="text-success text-lg font-bold">♠</span>
                          Spades
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rank">Rank *</Label>
                  <Select value={formData.rank} onValueChange={(value) => setFormData(prev => ({ ...prev, rank: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select rank" />
                    </SelectTrigger>
                    <SelectContent>
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
                      <SelectItem value="Ace">Ace</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="era">Era *</Label>
                  <Select value={formData.era} onValueChange={(value) => setFormData(prev => ({ ...prev, era: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select era" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Prehistoric" className="bg-amber-800/20 text-amber-700 border-amber-800/30">
                        🦕 Prehistoric
                      </SelectItem>
                      <SelectItem value="Ancient" className="bg-yellow-400/20 text-yellow-300 border-yellow-400/30">
                        🏛️ Ancient
                      </SelectItem>
                      <SelectItem value="Medieval" className="bg-red-800/20 text-red-600 border-red-800/30">
                        ⚔️ Medieval
                      </SelectItem>
                      <SelectItem value="Modern" className="bg-slate-900/20 text-slate-300 border-slate-900/30">
                        🏢 Modern
                      </SelectItem>
                      <SelectItem value="Future" className="bg-teal-500/20 text-teal-400 border-teal-500/30">
                        🚀 Future
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rarity">Rarity</Label>
                  <Select value={formData.rarity} onValueChange={(value) => setFormData(prev => ({ ...prev, rarity: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select rarity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Degen" className="bg-black/20 text-slate-100 border-black/30">
                        🗑️ Degen
                      </SelectItem>
                      <SelectItem value="Trader" className="bg-slate-300/20 text-slate-400 border-slate-300/30">
                        📈 Trader
                      </SelectItem>
                      <SelectItem value="Investor" className="bg-amber-600/20 text-amber-500 border-amber-600/30">
                        💼 Investor
                      </SelectItem>
                      <SelectItem value="Market Maker" className="bg-rose-400/20 text-rose-300 border-rose-400/30">
                        🏦 Market Maker
                      </SelectItem>
                      <SelectItem value="Whale" className="bg-yellow-400/20 text-yellow-300 border-yellow-400/30">
                        🐋 Whale
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="time_value">TIME Value</Label>
                  <Input
                    id="time_value"
                    type="number"
                    value={formData.time_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, time_value: parseInt(e.target.value) || 0 }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="trader_value">Trader Value</Label>
                  <Input
                    id="trader_value"
                    value={formData.trader_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, trader_value: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="current_target">Redirect URL</Label>
                <Input
                  id="current_target"
                  type="url"
                  value={formData.current_target}
                  onChange={(e) => setFormData(prev => ({ ...prev, current_target: e.target.value }))}
                  placeholder="https://example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Card Image</Label>
                <ImageUpload
                  onImageUploaded={(url) => setFormData(prev => ({ ...prev, image_url: url }))}
                  currentImageUrl={formData.image_url}
                  cardCode={card.code}
                  className="h-80"
                />
              </div>

              {/* Image Code Display */}
              <div className="space-y-2">
                <Label htmlFor="image_code_display">Image Code</Label>
                <div className="p-3 bg-muted/50 border rounded-md">
                  <div className="text-sm font-mono text-muted-foreground">
                    {card.image_code || '—'}
                  </div>
                  {card.image_code && (
                    <div className="text-xs text-muted-foreground mt-1">
                      From CSV import
                    </div>
                  )}
                  {!card.image_code && (
                    <div className="text-xs text-muted-foreground mt-1">
                      No image code assigned
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>QR Code Preview</Label>
                <QRCodePreview
                  code={card.code}
                  qrDark={formData.qr_dark}
                  qrLight={formData.qr_light}
                  onColorChange={handleColorChange}
                  showColorControls={true}
                  size={200}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="is_active">Card is Active</Label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}