export interface PrintBatch {
  id: string;
  name: string;
  description?: string;
  print_date?: string;
  created_at: string;
  created_by?: string;
  is_active: boolean;
  sort_order: number;
  card_count?: number;
}
