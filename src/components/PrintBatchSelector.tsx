import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PrintBatch } from "@/types/printBatch";

interface PrintBatchSelectorProps {
  value: string | null;
  onChange: (batchId: string | null) => void;
  showAllOption?: boolean;
  showUnassignedOption?: boolean;
  className?: string;
}

export function PrintBatchSelector({
  value,
  onChange,
  showAllOption = true,
  showUnassignedOption = true,
  className,
}: PrintBatchSelectorProps) {
  const [batches, setBatches] = useState<PrintBatch[]>([]);

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    const { data, error } = await supabase
      .from("print_batches")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (!error && data) {
      setBatches(data);
    }
  };

  return (
    <Select value={value || "all"} onValueChange={(val) => onChange(val === "all" || val === "unassigned" ? null : val)}>
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
        {batches.map((batch) => (
          <SelectItem key={batch.id} value={batch.id}>
            {batch.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
