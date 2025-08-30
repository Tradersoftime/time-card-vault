import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Download, Upload, FileText, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

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

interface CSVOperationsProps {
  selectedCards: CardData[];
  onImportComplete: () => void;
}

export function CSVOperations({ selectedCards, onImportComplete }: CSVOperationsProps) {
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const exportToCSV = () => {
    if (selectedCards.length === 0) {
      toast({
        title: "No cards selected",
        description: "Please select cards to export",
        variant: "destructive",
      });
      return;
    }

    // CSV headers - Card ID is first and prominently positioned
    const headers = [
      'card_id', // Immutable identifier - always first
      'code',
      'name',
      'suit',
      'rank',
      'era',
      'rarity',
      'time_value',
      'trader_value',
      'image_url',
      'description',
      'status',
      'is_active',
      'current_target',
      'qr_dark',
      'qr_light'
    ];

    // Convert cards to CSV rows
    const rows = selectedCards.map(card => [
      card.id, // Card ID - the immutable anchor
      card.code,
      card.name,
      card.suit,
      card.rank,
      card.era,
      card.rarity || '',
      card.time_value,
      card.trader_value || '',
      card.image_url || '',
      card.description || '',
      card.status,
      card.is_active,
      card.current_target || '',
      card.qr_dark || '#000000',
      card.qr_light || '#FFFFFF'
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(field => 
        typeof field === 'string' && (field.includes(',') || field.includes('"') || field.includes('\n'))
          ? `"${field.replace(/"/g, '""')}"` // Escape quotes and wrap in quotes if needed
          : field
      ).join(','))
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `cards_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export successful",
      description: `Exported ${selectedCards.length} cards to CSV`,
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target?.result as string;
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        // Validate that card_id is the first column
        if (headers[0] !== 'card_id') {
          toast({
            title: "Invalid CSV format",
            description: "First column must be 'card_id' for data integrity",
            variant: "destructive",
          });
          return;
        }

        const data = lines.slice(1)
          .filter(line => line.trim())
          .map(line => {
            const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
            const row: any = {};
            headers.forEach((header, index) => {
              row[header] = values[index] || '';
            });
            return row;
          });

        setImportPreview(data);
        setShowImportDialog(true);
      } catch (error) {
        toast({
          title: "Error reading file",
          description: "Failed to parse CSV file",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  const executeImport = async () => {
    setIsImporting(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const row of importPreview) {
        try {
          // Update by card_id - the immutable identifier
          const { error } = await supabase
            .from('cards')
            .update({
              name: row.name,
              suit: row.suit,
              rank: row.rank,
              era: row.era,
              rarity: row.rarity || null,
              time_value: parseInt(row.time_value) || 0,
              trader_value: row.trader_value || null,
              image_url: row.image_url || null,
              description: row.description || null,
              status: row.status,
              is_active: row.is_active === 'true' || row.is_active === true,
              current_target: row.current_target || null,
              qr_dark: row.qr_dark || null,
              qr_light: row.qr_light || null
            })
            .eq('id', row.card_id);

          if (error) {
            console.error(`Error updating card ${row.card_id}:`, error);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (error) {
          console.error(`Error processing card ${row.card_id}:`, error);
          errorCount++;
        }
      }

      toast({
        title: "Import completed",
        description: `Successfully updated ${successCount} cards${errorCount > 0 ? `, ${errorCount} errors` : ''}`,
        variant: errorCount > 0 ? "destructive" : "default",
      });

      if (successCount > 0) {
        onImportComplete();
      }
      
      setShowImportDialog(false);
      setImportPreview([]);
    } catch (error) {
      toast({
        title: "Import failed",
        description: "Failed to import CSV data",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={exportToCSV}
        disabled={selectedCards.length === 0}
        className="bg-background/50"
      >
        <Download className="h-4 w-4 mr-2" />
        Export CSV ({selectedCards.length})
      </Button>

      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="bg-background/50">
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Import Cards from CSV</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-blue-500">CSV Import Requirements</p>
                  <ul className="text-muted-foreground mt-1 space-y-1 list-disc list-inside">
                    <li>First column must be <code className="bg-muted px-1 rounded">card_id</code> (immutable identifier)</li>
                    <li>Cards will be updated based on their Card ID</li>
                    <li>Missing fields will be set to default values</li>
                    <li>Use the exported CSV format as a template</li>
                  </ul>
                </div>
              </div>
            </div>

            {importPreview.length === 0 ? (
              <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
                <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground mb-4">Select a CSV file to import</p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">Import Preview</h3>
                  <Badge variant="outline">
                    {importPreview.length} cards to update
                  </Badge>
                </div>
                
                <div className="max-h-60 overflow-y-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="p-2 text-left">Card ID</th>
                        <th className="p-2 text-left">Name</th>
                        <th className="p-2 text-left">Suit</th>
                        <th className="p-2 text-left">Rank</th>
                        <th className="p-2 text-left">Era</th>
                        <th className="p-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.map((row, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-2 font-mono text-xs">{row.card_id}</td>
                          <td className="p-2">{row.name}</td>
                          <td className="p-2">{row.suit}</td>
                          <td className="p-2">{row.rank}</td>
                          <td className="p-2">{row.era}</td>
                          <td className="p-2">
                            <Badge variant={row.is_active === 'true' ? 'default' : 'secondary'} className="text-xs">
                              {row.status} {row.is_active === 'true' ? '(Active)' : '(Inactive)'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowImportDialog(false)}
                    disabled={isImporting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={executeImport}
                    disabled={isImporting}
                    className="bg-gradient-to-r from-primary to-primary-glow"
                  >
                    {isImporting ? 'Importing...' : 'Import Cards'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}