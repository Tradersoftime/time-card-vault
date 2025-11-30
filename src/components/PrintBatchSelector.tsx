import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PrintBatch } from "@/types/printBatch";

interface PrintBatchSelectorProps {
  value: string | null;
  onChange: (batchId: string | null) => void;
  showAllOption?: boolean;
  showUnassignedOption?: boolean;
  className?: string;
  autoSelectFallback?: boolean;
  batches?: PrintBatch[]; // Optional pre-loaded batches
}

export function PrintBatchSelector({
  value,
  onChange,
  showAllOption = true,
  showUnassignedOption = true,
  className,
  autoSelectFallback = true,
  batches: preloadedBatches,
}: PrintBatchSelectorProps) {
  const [internalBatches, setInternalBatches] = useState<PrintBatch[]>([]);
  const [inactiveBatch, setInactiveBatch] = useState<PrintBatch | null>(null);
  const [loading, setLoading] = useState(!preloadedBatches);
  
  // Use preloaded batches if provided, otherwise use internal state
  const batches = preloadedBatches || internalBatches;

  useEffect(() => {
    // Only load batches if not provided from parent
    if (!preloadedBatches) {
      loadBatches();
    }
  }, [preloadedBatches]);

  useEffect(() => {
    // If value is a UUID and not in the active batches, load it separately
    if (value && value !== 'all' && value !== 'unassigned' && !batches.find(b => b.id === value)) {
      loadInactiveBatch(value);
    } else {
      setInactiveBatch(null);
    }
  }, [value, batches]);

  const loadBatches = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("print_batches")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (!error && data) {
      setInternalBatches(data);
    }

    setLoading(false);
  };

  const loadInactiveBatch = async (batchId: string) => {
    const { data, error } = await supabase
      .from("print_batches")
      .select("*")
      .eq("id", batchId)
      .single();

    if (!error && data) {
      setInactiveBatch(data);
    }
  };

  const selectedValue = autoSelectFallback
    ? value || (showUnassignedOption ? "unassigned" : showAllOption ? "all" : undefined)
    : (value === null ? undefined : value); // Properly convert null to undefined for Radix

  // Show loading skeleton if batches aren't ready yet
  if (loading && batches.length === 0) {
    return (
      <div className={className}>
        <div className="h-10 bg-muted animate-pulse rounded-md" />
      </div>
    );
  }

  return (
    <Select 
      value={selectedValue} 
      onValueChange={(val) => onChange(val === "all" || val === "unassigned" ? null : val)}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder="Select batch..." />
      </SelectTrigger>
      <SelectContent>
        {showAllOption && (
          <SelectItem value="all">All Batches</SelectItem>
        )}
        {showUnassignedOption && (
          <SelectItem value="unassigned">Unassigned Cards</SelectItem>
        )}
        {inactiveBatch && (
          <SelectItem value={inactiveBatch.id}>
            {inactiveBatch.name} (inactive)
          </SelectItem>
        )}
        {batches.map((batch) => (
          <SelectItem key={batch.id} value={batch.id}>
            {batch.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
