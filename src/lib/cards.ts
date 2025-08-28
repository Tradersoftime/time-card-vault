import { supabase } from "@/integrations/supabase/client";

export type Card = {
  id: string;
  code: string;
  name: string | null;
  suit: string | null;
  rank: string | null;
  era: string | null;
  rarity: string | null;
  trader_value: string | null;
  time_value: number | null;
  image_url: string | null;
  redirect_url: string | null;
  status: string | null;
  qr_dark: string | null;
  qr_light: string | null;
  created_at: string;
  updated_at: string | null;
};

const BASE_COLS = `
  id, code, name, suit, rank, era, rarity, trader_value, time_value,
  image_url, redirect_url, status, qr_dark, qr_light, created_at, updated_at
`;

export async function listCards(opts?: { search?: string }) {
  let q = supabase.from("cards").select(BASE_COLS).order("updated_at", { ascending: false }).order("created_at", { ascending: false });
  if (opts?.search) {
    const s = opts.search.trim();
    if (s) q = q.or(`code.ilike.%${s}%,name.ilike.%${s}%`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as Card[];
}

export async function getCardsByIds(ids: string[]) {
  const { data, error } = await supabase.from("cards").select(BASE_COLS).in("id", ids);
  if (error) throw error;
  return (data || []) as Card[];
}

export async function updateCards(ids: string[], patch: Partial<Card>) {
  const { error } = await supabase.from("cards").update(patch).in("id", ids);
  if (error) throw error;
}

export async function upsertCards(rows: Partial<Card>[]) {
  const { error } = await supabase.from("cards").upsert(rows, { onConflict: "code" });
  if (error) throw error;
}

