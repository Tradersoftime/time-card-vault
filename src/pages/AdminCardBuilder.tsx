import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Download, Plus, Database } from 'lucide-react';
import { PrintBatchSelector } from '@/components/PrintBatchSelector';
import { RarityRow } from '@/components/CardBuilder/RarityRow';
import { TraderNameRow } from '@/components/CardBuilder/TraderNameRow';
import { EraRow } from '@/components/CardBuilder/EraRow';
import { SuitsRow } from '@/components/CardBuilder/SuitsRow';
import { TLVRow } from '@/components/CardBuilder/TLVRow';
import { generateCardsFromRows, exportToCSV, RARITY_OPTIONS, TRADER_LEVERAGE_RANGES, RowBasedCardConfig } from '@/components/CardBuilder/utils';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

const AdminCardBuilder = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Batch state
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Row-based configuration state
  const [totalCards, setTotalCards] = useState(100);
  const [imageCode, setImageCode] = useState('');
  const [status, setStatus] = useState('active');
  
  // Rarity percentages (must total 100%)
  const [rarityPercentages, setRarityPercentages] = useState<Record<string, number>>(
    RARITY_OPTIONS.reduce((acc, rarity) => ({ ...acc, [rarity]: 20 }), {})
  );
  
  // Trader names
  const [traderNames, setTraderNames] = useState<string[]>(['']);
  
  // Eras and Suits
  const [selectedEras, setSelectedEras] = useState<string[]>(['Ancient', 'Modern', 'Future']);
  const [eraCardCounts, setEraCardCounts] = useState<Record<string, number>>({
    'Ancient': 33,
    'Modern': 33,
    'Future': 34,
  });
  
  const [selectedSuits, setSelectedSuits] = useState<string[]>(['Spades', 'Hearts', 'Diamonds', 'Clubs']);
  const [suitCardCounts, setSuitCardCounts] = useState<Record<string, number>>({
    'Spades': 25,
    'Hearts': 25,
    'Diamonds': 25,
    'Clubs': 25,
  });
  
  // TLV multiplier and ranges
  const [tlvMultiplier, setTlvMultiplier] = useState(10);
  const [tlvRanges, setTlvRanges] = useState<Record<string, { min: number; max: number }>>(
    Object.fromEntries(
      Object.entries(TRADER_LEVERAGE_RANGES).map(([rarity, range]) => [
        rarity,
        { min: range.min, max: range.max },
      ])
    )
  );
  
  const validateConfig = (): boolean => {
    if (!selectedBatchId) {
      toast({
        title: 'No Batch Selected',
        description: 'Please select or create a print batch',
        variant: 'destructive',
      });
      return false;
    }
    
    if (totalCards <= 0) {
      toast({
        title: 'Invalid Card Count',
        description: 'Total cards must be greater than 0',
        variant: 'destructive',
      });
      return false;
    }
    
    const totalPercentage = Object.values(rarityPercentages).reduce((sum, val) => sum + val, 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      toast({
        title: 'Invalid Rarity Distribution',
        description: `Rarity percentages must total 100% (currently ${totalPercentage.toFixed(2)}%)`,
        variant: 'destructive',
      });
      return false;
    }
    
    const validTraderNames = traderNames.filter(n => n.trim());
    if (validTraderNames.length === 0) {
      toast({
        title: 'No Trader Names',
        description: 'Please add at least one trader name',
        variant: 'destructive',
      });
      return false;
    }
    
    if (selectedEras.length === 0) {
      toast({
        title: 'No Eras Selected',
        description: 'Please select at least one era',
        variant: 'destructive',
      });
      return false;
    }
    
    if (selectedSuits.length === 0) {
      toast({
        title: 'No Suits Selected',
        description: 'Please select at least one suit',
        variant: 'destructive',
      });
      return false;
    }
    
    if (!imageCode.trim()) {
      toast({
        title: 'Missing Image Code',
        description: 'Please enter an image code',
        variant: 'destructive',
      });
      return false;
    }
    
    // Validate suit card counts
    const suitTotal = Object.values(suitCardCounts).reduce((sum, count) => sum + count, 0);
    if (suitTotal !== totalCards) {
      toast({
        title: 'Invalid Suit Distribution',
        description: `Suit card counts must total ${totalCards} (currently ${suitTotal})`,
        variant: 'destructive',
      });
      return false;
    }
    
    // Validate era card counts
    const eraTotal = Object.values(eraCardCounts).reduce((sum, count) => sum + count, 0);
    if (eraTotal !== totalCards) {
      toast({
        title: 'Invalid Era Distribution',
        description: `Era card counts must total ${totalCards} (currently ${eraTotal})`,
        variant: 'destructive',
      });
      return false;
    }
    
    // Validate TLV ranges
    for (const rarity of RARITY_OPTIONS) {
      const range = tlvRanges[rarity];
      if (range && range.max <= range.min) {
        toast({
          title: 'Invalid TLV Range',
          description: `${rarity}: Max TLV must be greater than Min TLV`,
          variant: 'destructive',
        });
        return false;
      }
    }
    
    return true;
  };
  
  const handleGenerateAndAddToBatch = async () => {
    if (!validateConfig()) return;
    
    setIsGenerating(true);
    
    try {
      const config: RowBasedCardConfig = {
        totalCards,
        rarityPercentages,
        traderNames: traderNames.filter(n => n.trim()),
        eras: selectedEras,
        suits: selectedSuits,
        eraCardCounts,
        suitCardCounts,
        tlvRanges,
        tlvMultiplier,
        imageCode,
        batchId: selectedBatchId,
        status,
      };
      
      const cards = generateCardsFromRows(config);
      
      // Insert cards into database with batch_id
      const cardsToInsert = cards.map(card => ({
        ...card,
        print_batch_id: selectedBatchId,
      }));
      
      const { data, error } = await supabase
        .from('cards')
        .insert(cardsToInsert)
        .select();
      
      if (error) throw error;
      
      toast({
        title: 'Cards Generated Successfully',
        description: `Added ${cards.length} cards to the batch`,
      });
      
      // Optionally navigate to AdminCards
      // navigate('/admin/cards');
    } catch (error: any) {
      console.error('Error generating cards:', error);
      toast({
        title: 'Generation Failed',
        description: error.message || 'Failed to add cards to batch',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleExportToCSV = () => {
    if (!validateConfig()) return;
    
    const config: RowBasedCardConfig = {
      totalCards,
      rarityPercentages,
      traderNames: traderNames.filter(n => n.trim()),
      eras: selectedEras,
      suits: selectedSuits,
      eraCardCounts,
      suitCardCounts,
      tlvRanges,
      tlvMultiplier,
      imageCode,
      batchId: selectedBatchId,
      status,
    };
    
    const cards = generateCardsFromRows(config);
    const filename = `cards_${totalCards}_${new Date().toISOString().split('T')[0]}.csv`;
    exportToCSV(cards, filename);
    
    toast({
      title: 'Export Successful',
      description: `Generated ${cards.length} cards and exported to ${filename}`,
    });
  };
  
  return (
    <div className="min-h-screen hero-gradient">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header */}
        <div className="glass-panel p-6 rounded-2xl mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent mb-2">
            🎨 Card Builder
          </h1>
          <p className="text-muted-foreground">
            Build cards row by row and add them to a batch
          </p>
        </div>
        
        {/* Batch Selection */}
        <div className="glass-panel p-6 rounded-2xl mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-3 flex-1 min-w-[300px]">
              <Database className="h-5 w-5 text-primary" />
              <Label className="whitespace-nowrap">Print Batch:</Label>
              <PrintBatchSelector
                value={selectedBatchId}
                onChange={setSelectedBatchId}
                showAllOption={false}
                showUnassignedOption={false}
                className="flex-1"
              />
            </div>
            <Button
              onClick={() => navigate('/admin/batches')}
              variant="outline"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Manage Batches
            </Button>
          </div>
        </div>
        
        {/* Configuration Section */}
        <div className="space-y-6">
          {/* Total Cards & Basic Info */}
          <div className="glass-panel p-6 rounded-2xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalCards">Total Cards</Label>
                <Input
                  id="totalCards"
                  type="number"
                  min="1"
                  value={totalCards}
                  onChange={(e) => setTotalCards(Math.max(1, parseInt(e.target.value) || 1))}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imageCode">Image Code</Label>
                <Input
                  id="imageCode"
                  value={imageCode}
                  onChange={(e) => setImageCode(e.target.value)}
                  placeholder="e.g., ANUBIS-001"
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Card Status</Label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="unprinted">Unprinted</option>
                  <option value="printed">Printed</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Rarity Row */}
          <RarityRow
            totalCards={totalCards}
            rarityPercentages={rarityPercentages}
            onChange={setRarityPercentages}
          />
          
          {/* Trader Names Row */}
          <TraderNameRow
            traderNames={traderNames}
            totalCards={totalCards}
            onChange={setTraderNames}
          />
          
          {/* Era Row */}
          <EraRow
            selectedEras={selectedEras}
            eraCardCounts={eraCardCounts}
            totalCards={totalCards}
            onChange={(newEras, newCounts) => {
              setSelectedEras(newEras);
              setEraCardCounts(newCounts);
            }}
          />
          
          {/* Suits Row */}
          <SuitsRow
            selectedSuits={selectedSuits}
            suitCardCounts={suitCardCounts}
            totalCards={totalCards}
            onChange={(newSuits, newCounts) => {
              setSelectedSuits(newSuits);
              setSuitCardCounts(newCounts);
            }}
          />
          
          {/* TLV Row */}
          <TLVRow
            multiplier={tlvMultiplier}
            rarityPercentages={rarityPercentages}
            totalCards={totalCards}
            tlvRanges={tlvRanges}
            onChange={(newMultiplier, newRanges) => {
              setTlvMultiplier(newMultiplier);
              setTlvRanges(newRanges);
            }}
          />
          
          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button
              onClick={handleExportToCSV}
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
              Export to CSV
            </Button>
            <Button
              onClick={handleGenerateAndAddToBatch}
              disabled={isGenerating || !selectedBatchId}
              className="bg-gradient-to-r from-primary to-primary-glow"
            >
              {isGenerating ? 'Generating...' : 'Generate & Add to Batch'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCardBuilder;
