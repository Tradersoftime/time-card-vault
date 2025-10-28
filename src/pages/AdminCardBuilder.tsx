import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Download } from 'lucide-react';
import { TemplateForm } from '@/components/CardBuilder/TemplateForm';
import { QuickFillButtons } from '@/components/CardBuilder/QuickFillButtons';
import { UnifiedSpreadsheetTable } from '@/components/CardBuilder/UnifiedSpreadsheetTable';
import { generateCards, exportToCSV, RANK_OPTIONS, RankDistribution } from '@/components/CardBuilder/utils';

const AdminCardBuilder = () => {
  const { toast } = useToast();
  
  // Template state
  const [baseName, setBaseName] = useState('');
  const [imageCode, setImageCode] = useState('');
  const [namePattern, setNamePattern] = useState('{rank} {baseName} of {suit}');
  const [descriptionPattern, setDescriptionPattern] = useState('A {era} era {rank} featuring {baseName}');
  const [defaultStatus, setDefaultStatus] = useState('active');
  
  // Distribution state
  const [totalCards, setTotalCards] = useState(100);
  const [distributions, setDistributions] = useState<RankDistribution[]>(
    RANK_OPTIONS.map(rank => ({
      rank,
      quantity: 0,
      suits: [],
      eras: [],
      rarities: [],
      traderLeverage: 10,
      multiplier: 1,
      traderValue: 'Standard',
    }))
  );
  
  
  const handleExport = () => {
    // Validation
    if (!baseName.trim()) {
      toast({
        title: 'Missing Character Name',
        description: 'Please enter a character name',
        variant: 'destructive',
      });
      return;
    }
    
    if (!imageCode.trim()) {
      toast({
        title: 'Missing Image Code',
        description: 'Please enter an image code',
        variant: 'destructive',
      });
      return;
    }
    
    const allocatedTotal = distributions.reduce((sum, d) => sum + d.quantity, 0);
    if (allocatedTotal !== totalCards) {
      toast({
        title: 'Invalid Distribution',
        description: `Allocated ${allocatedTotal} cards but target is ${totalCards}`,
        variant: 'destructive',
      });
      return;
    }
    
    if (allocatedTotal === 0) {
      toast({
        title: 'No Cards to Generate',
        description: 'Please allocate quantities to ranks',
        variant: 'destructive',
      });
      return;
    }
    
    // Generate cards
    const cards = generateCards({
      baseName,
      namePattern,
      imageCode,
      descriptionPattern,
      defaultStatus,
      rankDistributions: distributions.filter(d => d.quantity > 0),
    });
    
    // Export to CSV
    const filename = `${baseName.toLowerCase().replace(/\s+/g, '_')}_cards_${totalCards}_${new Date().toISOString().split('T')[0]}.csv`;
    exportToCSV(cards, filename);
    
    toast({
      title: 'Export Successful',
      description: `Generated ${cards.length} cards and exported to ${filename}`,
    });
  };
  
  const allocatedTotal = distributions.reduce((sum, d) => sum + d.quantity, 0);
  const isValid = allocatedTotal === totalCards;
  
  return (
    <div className="min-h-screen hero-gradient">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="glass-panel p-6 rounded-2xl mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent mb-2">
            🎨 Card Builder
          </h1>
          <p className="text-muted-foreground">
            Generate multiple card variations from a single template
          </p>
        </div>
        
        {/* Main Content */}
        <div className="glass-panel p-6 rounded-2xl">
          <Tabs defaultValue="distribution" className="space-y-6">
            <TabsList>
              <TabsTrigger value="distribution">Custom Distribution</TabsTrigger>
            </TabsList>
            
            <TabsContent value="distribution" className="space-y-6">
              {/* Template Form */}
              <TemplateForm
                baseName={baseName}
                onBaseNameChange={setBaseName}
                imageCode={imageCode}
                onImageCodeChange={setImageCode}
                namePattern={namePattern}
                onNamePatternChange={setNamePattern}
                descriptionPattern={descriptionPattern}
                onDescriptionPatternChange={setDescriptionPattern}
                defaultStatus={defaultStatus}
                onDefaultStatusChange={setDefaultStatus}
              />
              
              {/* Total Cards & Quick Fill */}
              <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="totalCards" className="whitespace-nowrap">
                      Total Cards to Generate:
                    </Label>
                    <Input
                      id="totalCards"
                      type="number"
                      min="1"
                      value={totalCards}
                      onChange={(e) => setTotalCards(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-24"
                    />
                  </div>
                  
                  <QuickFillButtons
                    totalCards={totalCards}
                    onDistribute={setDistributions}
                  />
                </div>
              </div>
              
              {/* Unified Spreadsheet Table */}
              <UnifiedSpreadsheetTable
                distributions={distributions}
                totalCards={totalCards}
                onChange={setDistributions}
              />
              
              {/* Export Button */}
              <div className="flex justify-end gap-3">
                <Button
                  onClick={handleExport}
                  disabled={!isValid || allocatedTotal === 0}
                  className="bg-gradient-to-r from-primary to-primary-glow"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export to CSV
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AdminCardBuilder;
