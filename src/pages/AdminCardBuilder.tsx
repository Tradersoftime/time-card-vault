import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Download, Plus, Database } from 'lucide-react';
import { PrintBatchSelector } from '@/components/PrintBatchSelector';
import { RarityDistributionSection } from '@/components/CardBuilder/RarityDistributionSection';
import type { RarityDistribution } from '@/components/CardBuilder/utils';
import { TraderNameRow } from '@/components/CardBuilder/TraderNameRow';
import { EraRow } from '@/components/CardBuilder/EraRow';
import { SuitsRow } from '@/components/CardBuilder/SuitsRow';
import { TLVRow } from '@/components/CardBuilder/TLVRow';
import { generateCardsFromRows, exportToCSV, RARITY_OPTIONS, TRADER_LEVERAGE_RANGES, RowBasedCardConfig } from '@/components/CardBuilder/utils';
import { supabase } from '@/integrations/supabase/client';
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
  
  // Rarity distributions (quantity-based with percentage calculation)
  const [rarityDistributions, setRarityDistributions] = useState<RarityDistribution[]>([
    { rarity: 'Degen', quantity: 44, traderLeverageRange: TRADER_LEVERAGE_RANGES['Degen'] },
    { rarity: 'Day Trader', quantity: 24, traderLeverageRange: TRADER_LEVERAGE_RANGES['Day Trader'] },
    { rarity: 'Investor', quantity: 17, traderLeverageRange: TRADER_LEVERAGE_RANGES['Investor'] },
    { rarity: 'Market Maker', quantity: 11, traderLeverageRange: TRADER_LEVERAGE_RANGES['Market Maker'] },
    { rarity: 'Whale', quantity: 4, traderLeverageRange: TRADER_LEVERAGE_RANGES['Whale'] },
  ]);
  
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
  
  // Minimal validation for CSV export
  const validateForCSV = (): boolean => {
    if (totalCards <= 0) {
      toast({
        title: 'Invalid Card Count',
        description: 'Total cards must be greater than 0',
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  // Smart validation for database generation with warnings
  const validateForDatabase = (): { isValid: boolean; warnings: string[] } => {
    const warnings: string[] = [];
    
    // Hard requirement: batch selection
    if (!selectedBatchId) {
      toast({
        title: 'No Batch Selected',
        description: 'Please select or create a print batch',
        variant: 'destructive',
      });
      return { isValid: false, warnings: [] };
    }
    
    // Hard requirement: total cards > 0
    if (totalCards <= 0) {
      toast({
        title: 'Invalid Card Count',
        description: 'Total cards must be greater than 0',
        variant: 'destructive',
      });
      return { isValid: false, warnings: [] };
    }
    
    // Soft validations (warnings only)
    const allocatedTotal = rarityDistributions.reduce((sum, d) => sum + d.quantity, 0);
    if (allocatedTotal !== totalCards) {
      warnings.push(`Rarity quantities total ${allocatedTotal} (will be proportionally adjusted to ${totalCards})`);
    }
    
    const validTraderNames = traderNames.filter(n => n.trim());
    if (validTraderNames.length === 0) {
      warnings.push('No trader names specified (name and description will be blank)');
    }
    
    if (selectedEras.length === 0) {
      warnings.push('No eras selected (will use all eras evenly)');
    }
    
    if (selectedSuits.length === 0) {
      warnings.push('No suits selected (will use all suits evenly)');
    }
    
    if (!imageCode.trim()) {
      warnings.push('No image code specified (cards will have empty image code)');
    }
    
    const suitTotal = Object.values(suitCardCounts).reduce((sum, count) => sum + count, 0);
    if (suitTotal > 0 && suitTotal !== totalCards) {
      warnings.push(`Suit counts total ${suitTotal} (will be proportionally adjusted to ${totalCards})`);
    }
    
    const eraTotal = Object.values(eraCardCounts).reduce((sum, count) => sum + count, 0);
    if (eraTotal > 0 && eraTotal !== totalCards) {
      warnings.push(`Era counts total ${eraTotal} (will be proportionally adjusted to ${totalCards})`);
    }
    
    // Check TLV ranges
    for (const rarity of RARITY_OPTIONS) {
      const range = tlvRanges[rarity];
      if (range && range.max <= range.min) {
        warnings.push(`${rarity} TLV range invalid (will swap min/max or use default)`);
      }
    }
    
    return { isValid: true, warnings };
  };

  // Helper to build config with smart defaults
  const buildConfigWithDefaults = (): RowBasedCardConfig => {
    // Convert quantity-based distributions to percentage-based config
    const allocatedTotal = rarityDistributions.reduce((sum, d) => sum + d.quantity, 0);
    const rarityPercentages = Object.fromEntries(
      rarityDistributions.map(d => [
        d.rarity,
        allocatedTotal > 0 ? (d.quantity / allocatedTotal) * 100 : 0
      ])
    );
    
    // Use valid trader names
    const validTraderNames = traderNames.filter(n => n.trim());
    const finalTraderNames = validTraderNames;
    
    // Use selected eras or all eras
    const finalEras = selectedEras.length > 0 
      ? selectedEras 
      : ['Prehistoric', 'Ancient', 'Medieval', 'Modern', 'Future'];
    
    // Use selected suits or all suits
    const finalSuits = selectedSuits.length > 0 
      ? selectedSuits 
      : ['Spades', 'Hearts', 'Diamonds', 'Clubs'];
    
    // Normalize era/suit counts if needed
    const eraTotal = Object.values(eraCardCounts).reduce((sum, count) => sum + count, 0);
    const normalizedEraCardCounts = eraTotal > 0 && eraTotal !== totalCards
      ? Object.fromEntries(
          Object.entries(eraCardCounts).map(([era, count]) => [
            era,
            Math.round((count / eraTotal) * totalCards)
          ])
        )
      : eraCardCounts;
    
    const suitTotal = Object.values(suitCardCounts).reduce((sum, count) => sum + count, 0);
    const normalizedSuitCardCounts = suitTotal > 0 && suitTotal !== totalCards
      ? Object.fromEntries(
          Object.entries(suitCardCounts).map(([suit, count]) => [
            suit,
            Math.round((count / suitTotal) * totalCards)
          ])
        )
      : suitCardCounts;
    
    // Fix invalid TLV ranges
    const fixedTlvRanges = Object.fromEntries(
      Object.entries(tlvRanges).map(([rarity, range]) => [
        rarity,
        range.max <= range.min 
          ? { min: range.min, max: range.min + 10 }
          : range
      ])
    );
    
    return {
      totalCards,
      rarityPercentages: rarityPercentages,
      traderNames: finalTraderNames,
      eras: finalEras,
      suits: finalSuits,
      eraCardCounts: normalizedEraCardCounts,
      suitCardCounts: normalizedSuitCardCounts,
      tlvRanges: fixedTlvRanges,
      tlvMultiplier,
      imageCode: imageCode.trim(),
      batchId: selectedBatchId,
      status,
    };
  };
  
  const handleGenerateAndAddToBatch = async () => {
    const { isValid, warnings } = validateForDatabase();
    if (!isValid) return;
    
    // Show warnings if any exist
    if (warnings.length > 0) {
      toast({
        title: 'Configuration Warnings',
        description: `${warnings.length} warning(s): ${warnings[0]}${warnings.length > 1 ? ` (+${warnings.length - 1} more)` : ''}`,
        variant: 'default',
      });
    }
    
    setIsGenerating(true);
    
    try {
      const config = buildConfigWithDefaults();
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
    if (!validateForCSV()) return;
    
    const config = buildConfigWithDefaults();
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
          
          {/* Rarity Distribution */}
          <RarityDistributionSection
            rarityDistributions={rarityDistributions}
            totalCards={totalCards}
            onChange={setRarityDistributions}
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
            rarityPercentages={Object.fromEntries(
              rarityDistributions.map(d => [
                d.rarity,
                totalCards > 0 ? (d.quantity / totalCards) * 100 : 0
              ])
            )}
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
