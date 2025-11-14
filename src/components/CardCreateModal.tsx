import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ImageUpload } from '@/components/ImageUpload';
import { QRCodePreview } from '@/components/QRCodePreview';
import { Loader2, Plus } from 'lucide-react';
import { getQRColorsForEra } from '@/lib/qr-colors';

interface CardCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function CardCreateModal({ isOpen, onClose, onSave }: CardCreateModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
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
    status: 'draft',
    is_active: false,
    current_target: '',
    qr_dark: '#000000',
    qr_light: '#FFFFFF'
  });

  const generateCardCode = () => {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `CARD-${timestamp}-${random}`;
  };

  const resetForm = () => {
    setFormData({
      code: generateCardCode(),
      name: '',
      suit: '',
      rank: '',
      era: '',
      rarity: '',
      time_value: 0,
      trader_value: '',
      image_url: '',
      description: '',
      status: 'draft',
      is_active: false,
      current_target: '',
      qr_dark: '#000000',
      qr_light: '#FFFFFF'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.suit || !formData.rank || !formData.era) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (Name, Suit, Rank, Era)",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cards')
        .insert({
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
          current_target: formData.current_target || null,
          qr_dark: formData.qr_dark || null,
          qr_light: formData.qr_light || null
        })
        .select()
        .single();

      if (error) throw error;
      
      toast({
        title: "Success",
        description: `Card "${formData.name}" created successfully`,
      });
      
      resetForm();
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error creating card:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create card",
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

  // Auto-update QR colors when era changes
  useEffect(() => {
    if (formData.era) {
      const colors = getQRColorsForEra(formData.era);
      setFormData(prev => ({
        ...prev,
        qr_dark: colors.qr_dark,
        qr_light: colors.qr_light
      }));
    }
  }, [formData.era]);

  const handleOpen = () => {
    if (isOpen && !formData.code) {
      resetForm();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (open) handleOpen();
      else onClose();
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Card
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Card Code *</Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="CARD-12345-ABCD"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFormData(prev => ({ ...prev, code: generateCardCode() }))}
                  >
                    Generate
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Unique identifier for this card</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Card Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter card name"
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
                      <SelectItem value="Hearts">♥️ Hearts</SelectItem>
                      <SelectItem value="Diamonds">♦️ Diamonds</SelectItem>
                      <SelectItem value="Clubs">♣️ Clubs</SelectItem>
                      <SelectItem value="Spades">♠️ Spades</SelectItem>
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
                      <SelectItem value="Jack">🤴 Jack</SelectItem>
                      <SelectItem value="Queen">👸 Queen</SelectItem>
                      <SelectItem value="King">👑 King</SelectItem>
                      <SelectItem value="Ace">🃏 Ace</SelectItem>
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
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
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
                  placeholder="Describe this card..."
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
                  cardCode={formData.code}
                />
              </div>

              <div className="space-y-2">
                <Label>QR Code Preview</Label>
                <QRCodePreview
                  code={formData.code}
                  qrDark={formData.qr_dark}
                  qrLight={formData.qr_light}
                  onColorChange={handleColorChange}
                  cardName={formData.name}
                  suit={formData.suit}
                  rank={formData.rank}
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
              Create Card
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}