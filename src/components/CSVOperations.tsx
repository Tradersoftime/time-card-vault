/**
 * CSVOperations Component
 * 
 * Provides standardized CSV export/import functionality for trading cards.
 * 
 * SUPPORTED CSV FORMATS:
 * 1. SIMPLIFIED FORMAT (Recommended for new cards):
 *    name,suit,rank,era,rarity,time_value,image_code,description
 *    - Auto-generates: code, card_id, claim_token
 *    - Assigns to selected print batch automatically
 * 
 * 2. FULL FORMAT (For updates or manual control):
 *    card_id,code,name,suit,rank,era,rarity,time_value,trader_value,image_code,image_url,description,status,is_active,current_target,qr_dark,qr_light
 * 
 * KEY FEATURES:
 * - Simplified Format: Only include essential fields (name, suit, rank, era)
 * - Auto-Generation: System generates unique codes like SPA-ACE-001
 * - Batch Assignment: Cards automatically assigned to selected batch
 * - Image Code Support: Use image_code (e.g., "a1") instead of full URLs
 * - Automatic Resolution: image_code is resolved to image_url during import
 * - Reverse Lookup: During export, image_url is converted to image_code if found
 * 
 * IMPORT BEHAVIOR:
 * - Simplified: Leave code blank, system auto-generates unique codes
 * - Updates: Provide card_id to update existing cards
 * - Batch Assignment: Cards assigned to currentBatchId if provided
 * - Image Resolution: image_code takes priority over image_url
 * 
 * EXPORT BEHAVIOR:
 * - Always exports full format for maximum compatibility
 * - Prioritizes image_code over image_url in CSV output
 */

import { useState, useEffect } from 'react';
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
  image_code?: string | null; // Added for standardization
  description: string | null;
  status: string;
  is_active: boolean;
  created_at: string;
  current_target?: string | null;
  qr_dark?: string | null;
  qr_light?: string | null;
  claim_token?: string | null; // Added for secure token-based claiming
}

interface CSVOperationsProps {
  selectedCards: CardData[];
  onImportComplete: () => void;
  currentBatchId?: string | null; // Added for batch-aware import
  showBatchContext?: boolean; // Show batch context in import dialog
  isOpen?: boolean; // External dialog control
  onOpenChange?: (open: boolean) => void; // External dialog control
}

export function CSVOperations({ 
  selectedCards, 
  onImportComplete, 
  currentBatchId, 
  showBatchContext = true, 
  isOpen, 
  onOpenChange 
}: CSVOperationsProps) {
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [internalShowDialog, setInternalShowDialog] = useState(false);
  const [imageCodeMappings, setImageCodeMappings] = useState<Record<string, string>>({});
  const [useSimplifiedFormat, setUseSimplifiedFormat] = useState(false);

  // Use external control if provided, otherwise use internal state
  const showImportDialog = isOpen !== undefined ? isOpen : internalShowDialog;
  const setShowImportDialog = onOpenChange || setInternalShowDialog;

  // Load image code mappings on component mount
  const loadImageCodeMappings = async () => {
    try {
      const { data, error } = await supabase
        .from('image_codes')
        .select('code, public_url');
      
      if (error) throw error;
      
      const mappings: Record<string, string> = {};
      data?.forEach(item => {
        mappings[item.code] = item.public_url;
      });
      setImageCodeMappings(mappings);
    } catch (error) {
      console.error('Error loading image code mappings:', error);
    }
  };

  // Load mappings on mount
  useEffect(() => {
    loadImageCodeMappings();
  }, []);

  // Helper function to resolve image_code to image_url or extract image_code from image_url
  const resolveImageField = (card: CardData): { image_url: string | null; image_code: string | null } => {
    // If card has image_url, try to find corresponding image_code
    if (card.image_url) {
      const imageCode = Object.entries(imageCodeMappings).find(([_, url]) => url === card.image_url)?.[0];
      return { 
        image_url: card.image_url, 
        image_code: imageCode || null 
      };
    }
    return { image_url: null, image_code: null };
  };

  const exportToCSV = () => {
    if (selectedCards.length === 0) {
      toast({
        title: "No cards selected",
        description: "Please select cards to export",
        variant: "destructive",
      });
      return;
    }

    // Standardized CSV headers - consistent field order across all exports
    const headers = [
      'card_id',       // Primary identifier for updates
      'code',          // Required for new card creation
      'name',          // Core fields
      'suit',
      'rank', 
      'era',
      'rarity',
      'time_value',    // Value fields
      'trader_value',
      'image_code',    // Media fields - prioritize image_code over image_url
      'image_url',     
      'description',   // Meta fields
      'status',
      'is_active',
      'current_target',
      'qr_dark',       // QR customization fields
      'qr_light',
      'claim_token'    // Secure claiming token
    ];

    // Convert cards to CSV rows with standardized field order
    const rows = selectedCards.map(card => {
      const { image_url, image_code } = resolveImageField(card);
      
      return [
        card.id,                    // card_id - immutable identifier
        card.code,                  // code - required for creation
        card.name,                  // Core fields
        card.suit,
        card.rank,
        card.era,
        card.rarity || '',
        card.time_value,            // Value fields
        card.trader_value || '',
        image_code || '',           // Media fields - image_code prioritized
        image_url || '',
        card.description || '',     // Meta fields
        card.status,
        card.is_active,
        card.current_target || '',
        card.qr_dark || '#000000',  // QR fields
        card.qr_light || '#FFFFFF',
        card.claim_token || ''      // Secure claiming token
      ];
    });

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
        
        // Check if this is simplified format (no card_id/code column)
        const hasFullFormat = headers.includes('card_id') || headers.includes('code');
        const hasSimplifiedFormat = headers.includes('name') && headers.includes('suit') && headers.includes('rank');
        
        if (!hasFullFormat && !hasSimplifiedFormat) {
          toast({
            title: "Invalid CSV format",
            description: "CSV must have either full format (with card_id/code) or simplified format (with name, suit, rank, era)",
            variant: "destructive",
          });
          return;
        }

        setUseSimplifiedFormat(!hasFullFormat && hasSimplifiedFormat);

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

  // Valid status values according to database constraint
  const VALID_STATUS_VALUES = ['unprinted', 'printed', 'active', 'retired'];

  const validateAndCleanStatus = (status: string): string => {
    if (!status || typeof status !== 'string') return 'active';
    
    const cleanStatus = status.toString().trim().toLowerCase();
    return VALID_STATUS_VALUES.includes(cleanStatus) ? cleanStatus : 'active';
  };

  const executeImport = async () => {
    setIsImporting(true);
    try {
      let createdCount = 0;
      let updatedCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // Process rows in batch using upsert
      const processedRows = await Promise.all(
        importPreview.map(async (row, index) => {
          try {
            // Clean and trim text fields
            const cleanRow = Object.keys(row).reduce((acc, key) => {
              acc[key] = typeof row[key] === 'string' ? row[key].trim() : row[key];
              return acc;
            }, {} as any);

            // Resolve image_code to image_url if provided
            let resolvedImageUrl = cleanRow.image_url || null;
            if (cleanRow.image_code && imageCodeMappings[cleanRow.image_code]) {
              resolvedImageUrl = imageCodeMappings[cleanRow.image_code];
            }

            // Generate code for simplified format
            let generatedCode = cleanRow.code;
            if (useSimplifiedFormat && (!cleanRow.code || !cleanRow.code.trim())) {
              // Call database function to generate unique code
              if (!cleanRow.suit || !cleanRow.rank) {
                errors.push(`Row ${index + 1}: Missing suit or rank for code generation`);
                return null;
              }
              
              const { data: codeData, error: codeError } = await supabase
                .rpc('generate_card_code', { 
                  p_suit: cleanRow.suit, 
                  p_rank: cleanRow.rank,
                  p_batch_id: currentBatchId 
                });
              
              if (codeError || !codeData) {
                errors.push(`Row ${index + 1}: Failed to generate card code`);
                return null;
              }
              
              generatedCode = codeData;
            }

            // Validate required fields for new cards
            const hasCardId = cleanRow.card_id && cleanRow.card_id.trim();
            if (!hasCardId) {
              // New card - validate required fields
              const missing = [];
              if (!generatedCode) missing.push('code');
              if (!cleanRow.name) missing.push('name');
              if (!cleanRow.suit) missing.push('suit');
              if (!cleanRow.rank) missing.push('rank');
              if (!cleanRow.era) missing.push('era');
              
              if (missing.length > 0) {
                errors.push(`Row ${index + 1}: Missing required fields: ${missing.join(', ')}`);
                return null;
              }
            }

            // Validate and clean status
            const validatedStatus = validateAndCleanStatus(cleanRow.status);
            
            // Prepare card data for upsert
            const cardData: any = {
              code: generatedCode,
              name: cleanRow.name || null,
              suit: cleanRow.suit || null,
              rank: cleanRow.rank || null,
              era: cleanRow.era || null,
              rarity: cleanRow.rarity || null,
              time_value: parseInt(cleanRow.time_value) || 0,
              trader_value: cleanRow.trader_value || null,
              image_url: resolvedImageUrl,
              description: cleanRow.description || null,
              status: validatedStatus,
              is_active: cleanRow.is_active === 'true' || cleanRow.is_active === true || cleanRow.is_active === 1,
              current_target: cleanRow.current_target || null,
              qr_dark: cleanRow.qr_dark || null,
              qr_light: cleanRow.qr_light || null,
              print_batch_id: currentBatchId || null, // Assign to current batch
              ...(cleanRow.claim_token && { claim_token: cleanRow.claim_token })
            };

            // Add card_id if provided (for updates)
            if (hasCardId) {
              cardData.id = row.card_id;
            }

            return { cardData, isUpdate: hasCardId, rowIndex: index + 1 };
          } catch (error) {
            errors.push(`Row ${index + 1}: Error processing data - ${error instanceof Error ? error.message : 'Unknown error'}`);
            return null;
          }
        })
      );

      const validRows = processedRows.filter(row => row !== null);

      if (errors.length > 0) {
        toast({
          title: "Validation errors",
          description: `${errors.length} row(s) had validation errors. Check console for details.`,
          variant: "destructive",
        });
        console.error('CSV Import Validation Errors:', errors);
        errorCount = errors.length;
      }

      if (validRows.length > 0) {
        // Use upsert with onConflict for code to handle both create and update
        const { data, error } = await supabase
          .from('cards')
          .upsert(
            validRows.map(row => row!.cardData),
            { 
              onConflict: 'code'
            }
          );

        if (error) {
          console.error('Upsert error:', error);
          toast({
            title: "Import failed",
            description: `Database error: ${error.message}`,
            variant: "destructive",
          });
        } else {
          // Count creates vs updates (approximation based on whether card_id was provided)
          createdCount = validRows.filter(row => !row!.isUpdate).length;
          updatedCount = validRows.filter(row => row!.isUpdate).length;

          const successMessage = [];
          if (createdCount > 0) successMessage.push(`${createdCount} cards created`);
          if (updatedCount > 0) successMessage.push(`${updatedCount} cards updated`);

          toast({
            title: "Import successful",
            description: successMessage.join(', '),
          });

          onImportComplete();
        }
      }
      
      setShowImportDialog(false);
      setImportPreview([]);
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import failed",
        description: "An unexpected error occurred during import",
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
                      <li><strong>Simplified Format (Recommended):</strong> Only include: <code className="bg-muted px-1 rounded">name, suit, rank, era</code> - system auto-generates codes!</li>
                      <li><strong>Full Format:</strong> Leave <code className="bg-muted px-1 rounded">card_id</code> blank for new cards, include <code className="bg-muted px-1 rounded">code</code></li>
                      <li><strong>Update Cards:</strong> Provide <code className="bg-muted px-1 rounded">card_id</code> to update existing cards</li>
                      <li>Use <code className="bg-muted px-1 rounded">image_code</code> to reference images from your library</li>
                      {currentBatchId && <li><strong>Batch Assignment:</strong> Cards will be added to the currently selected batch</li>}
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
                    {importPreview.filter(row => row.card_id && row.card_id.trim()).length} to update, {importPreview.filter(row => !row.card_id || !row.card_id.trim()).length} to create
                  </Badge>
                </div>
                
                <div className="max-h-60 overflow-y-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="p-2 text-left">Action</th>
                        <th className="p-2 text-left">Code</th>
                        <th className="p-2 text-left">Name</th>
                        <th className="p-2 text-left">Suit</th>
                        <th className="p-2 text-left">Rank</th>
                        <th className="p-2 text-left">Era</th>
                        <th className="p-2 text-left">Image</th>
                        <th className="p-2 text-left">Token</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.map((row, index) => {
                        const isUpdate = row.card_id && row.card_id.trim();
                        const hasRequiredFields = useSimplifiedFormat 
                          ? (row.name && row.suit && row.rank && row.era) // Simplified: code not required
                          : (row.code && row.name && row.suit && row.rank && row.era); // Full: code required
                        const isValid = isUpdate || hasRequiredFields;
                        
                        return (
                          <tr key={index} className={`border-t ${!isValid ? 'bg-destructive/10' : ''}`}>
                            <td className="p-2">
                              <Badge variant={isUpdate ? 'secondary' : 'default'} className="text-xs">
                                {isUpdate ? 'Update' : 'Create'}
                              </Badge>
                              {!isValid && (
                                <div className="text-xs text-destructive mt-1">
                                  {isUpdate ? 'Invalid ID' : 'Missing required fields'}
                                </div>
                              )}
                            </td>
                            <td className="p-2 font-mono text-sm">{row.code || row.card_id}</td>
                            <td className="p-2">{row.name || '—'}</td>
                            <td className="p-2">{row.suit || '—'}</td>
                            <td className="p-2">{row.rank || '—'}</td>
                            <td className="p-2">{row.era || '—'}</td>
                            <td className="p-2 text-xs">
                              {row.image_code ? (
                                <span className="bg-blue-100 text-blue-800 px-1 rounded">
                                  {row.image_code}
                                </span>
                              ) : row.image_url ? (
                                <span className="text-muted-foreground">URL</span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="p-2 text-xs">
                              {row.claim_token ? (
                                <span className="bg-green-100 text-green-800 px-1 rounded font-mono">
                                  {row.claim_token.substring(0, 8)}...
                                </span>
                              ) : (
                                <span className="text-muted-foreground">Auto-generated</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
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