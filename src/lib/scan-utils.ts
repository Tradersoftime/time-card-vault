// src/lib/scan-utils.ts
import { supabase } from "@/integrations/supabase/client";

export type LogItem = {
  id: string;
  ts: number;
  code: string;
  status: "claimed" | "already_owner" | "owned_by_other" | "not_found" | "blocked" | "error";
  message: string;
  card?: {
    id?: string;
    name?: string | null;
    image_url?: string | null;
    era?: string | null;
    suit?: string | null;
    rank?: string | null;
    rarity?: string | null;
    trader_value?: string | null;
  };
};

export type ClaimResult = {
  success: boolean;
  status: LogItem["status"];
  message: string;
  card?: LogItem["card"];
  shouldAutoClose?: boolean;
};

// Audio feedback
let audioCtxRef: AudioContext | null = null;

export function beep(freq = 880, ms = 120) {
  try {
    if (!audioCtxRef) audioCtxRef = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = audioCtxRef!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = freq;
    g.gain.value = 0.0001;
    o.start();
    const t = ctx.currentTime;
    g.gain.exponentialRampToValueAtTime(0.2, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
    o.stop(t + ms / 1000);
  } catch { /* ignore */ }
}

export function haptic(pattern: number | number[]) {
  try { navigator.vibrate?.(pattern as any); } catch { /* ignore */ }
}

export function feedback(status: LogItem["status"]) {
  switch (status) {
    case "claimed":        beep(880, 120);  haptic(60); break;
    case "already_owner":  beep(660, 100);  haptic(40); break;
    case "owned_by_other": beep(440, 200);  haptic([120, 60, 120]); break;
    case "not_found":      beep(330, 160);  haptic(80); break;
    case "blocked":        beep(220, 220);  haptic([180, 80, 180]); break;
    case "error":          beep(200, 250);  haptic([200, 80, 200]); break;
  }
}

export function extractCodeOrToken(text: string): { value: string; type: 'code' | 'token' } | null {
  if (!text) return null;
  const s = text.trim();

  // Full URL? Check for different formats
  if (/^https?:\/\//i.test(s)) {
    try {
      const url = new URL(s);
      
      // New format: /claim?token=ABC123XYZ
      if (url.pathname === '/claim' && url.searchParams.has('token')) {
        const token = url.searchParams.get('token');
        if (token) return { value: token, type: 'token' };
      }
      
      // Old format: /r/:code
      const rMatch = url.pathname.match(/\/r\/([^/]+)$/i);
      if (rMatch?.[1]) {
        return { value: decodeURIComponent(rMatch[1]), type: 'code' };
      }
      
      // Fallback: last path part (old format)
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length > 0) {
        return { value: decodeURIComponent(parts[parts.length - 1]), type: 'code' };
      }
    } catch { /* ignore */ }
  }

  // Otherwise allow letters/digits/_/- (assume it's a direct code)
  const m = s.match(/[A-Za-z0-9\-_]+/);
  return m ? { value: m[0], type: 'code' } : null;
}

async function fetchCardById(id: string) {
  const { data } = await supabase
    .from("cards")
    .select("id,name,image_url,era,suit,rank,rarity,trader_value")
    .eq("id", id)
    .limit(1)
    .maybeSingle();
  return data || undefined;
}

async function fetchCardByCodeLike(code: string) {
  const { data } = await supabase
    .from("cards")
    .select("id,name,image_url,era,suit,rank,rarity,trader_value")
    .ilike("code", code)
    .limit(1)
    .maybeSingle();
  return data || undefined;
}

export async function claimByCodeOrToken(
  value: string, 
  type: 'code' | 'token',
  onAuthRequired?: () => void
): Promise<ClaimResult> {
  try {
    // Check authentication
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) { 
      onAuthRequired?.();
      return { success: false, status: "error", message: "Authentication required" };
    }

    let data, error;

    if (type === 'token') {
      // Use new token-based claiming
      const result = await supabase.rpc("claim_card_by_token", {
        p_token: value,
      });
      data = result.data;
      error = result.error;
    } else {
      // Use old code-based claiming
      const result = await supabase.rpc("claim_card_and_log", {
        p_code: value,
        p_source: "scan",
      });
      data = result.data;
      error = result.error;
    }

    if (error) {
      return {
        success: false,
        status: "error",
        message: error.message || "Error claiming card"
      };
    }

    if (data?.ok) {
      let status: LogItem["status"];
      let message: string;
      
      if (type === 'token') {
        // Handle token-based response
        status = data.already_claimed_by_you ? "already_owner" : "claimed";
        message = status === "claimed" ? "Added to your collection" : "Already in your collection";
      } else {
        // Handle code-based response
        status = data.already_owner ? "already_owner" : "claimed";
        message = status === "claimed" ? "Added to your collection" : "Already in your collection";
      }

      const card = data.card_id ? await fetchCardById(data.card_id) : undefined;
      
      return {
        success: true,
        status,
        message,
        card,
        shouldAutoClose: status === "claimed" || status === "already_owner"
      };
    }

    // not ok → map errors
    let status: LogItem["status"] = "error";
    let message = "Something went wrong.";
    
    if (type === 'token') {
      // Handle token-based errors
      switch (data?.error) {
        case "token_not_found":           status = "not_found";      message = "Card not found."; break;
        case "already_claimed_by_other":  status = "owned_by_other"; message = "Already claimed by another user."; break;
        case "blocked":                   status = "blocked";        message = "Your account is blocked from claiming cards."; break;
        case "not_authenticated":         
          onAuthRequired?.();
          return { success: false, status: "error", message: "Authentication required" };
      }
    } else {
      // Handle code-based errors
      switch (data?.error) {
        case "not_found":      status = "not_found";      message = "Card not found."; break;
        case "owned_by_other": status = "owned_by_other"; message = "Already claimed by another user."; break;
        case "blocked":        status = "blocked";        message = "Your account is blocked from claiming cards."; break;
        case "not_signed_in":  
          onAuthRequired?.();
          return { success: false, status: "error", message: "Authentication required" };
      }
    }

    const card = status === "owned_by_other" ? undefined : await fetchCardByCodeLike(value);
    
    return {
      success: false,
      status,
      message,
      card
    };
  } catch (err) {
    return {
      success: false,
      status: "error",
      message: err instanceof Error ? err.message : "Unknown error"
    };
  }
}
