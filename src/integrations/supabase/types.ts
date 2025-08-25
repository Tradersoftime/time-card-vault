export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          blocked_at: string
          blocked_by: string | null
          reason: string | null
          user_id: string
        }
        Insert: {
          blocked_at?: string
          blocked_by?: string | null
          reason?: string | null
          user_id: string
        }
        Update: {
          blocked_at?: string
          blocked_by?: string | null
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      cards: {
        Row: {
          code: string
          created_at: string
          description: string | null
          era: string
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          rank: string
          rarity: string | null
          status: string
          suit: string
          time_value: number
          trader_value: string | null
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          era: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          rank: string
          rarity?: string | null
          status?: string
          suit: string
          time_value?: number
          trader_value?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          era?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          rank?: string
          rarity?: string | null
          status?: string
          suit?: string
          time_value?: number
          trader_value?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      redemption_cards: {
        Row: {
          amount_time: number | null
          card_id: string
          decided_at: string | null
          decision: string
          id: string
          redemption_id: string
        }
        Insert: {
          amount_time?: number | null
          card_id: string
          decided_at?: string | null
          decision?: string
          id?: string
          redemption_id: string
        }
        Update: {
          amount_time?: number | null
          card_id?: string
          decided_at?: string | null
          decision?: string
          id?: string
          redemption_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "redemption_cards_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: true
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redemption_cards_redemption_id_fkey"
            columns: ["redemption_id"]
            isOneToOne: false
            referencedRelation: "redemptions"
            referencedColumns: ["id"]
          },
        ]
      }
      redemptions: {
        Row: {
          admin_notes: string | null
          credited_amount: number | null
          credited_at: string | null
          credited_by: string | null
          external_ref: string | null
          id: string
          status: string
          submitted_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          credited_amount?: number | null
          credited_at?: string | null
          credited_by?: string | null
          external_ref?: string | null
          id?: string
          status?: string
          submitted_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          credited_amount?: number | null
          credited_at?: string | null
          credited_by?: string | null
          external_ref?: string | null
          id?: string
          status?: string
          submitted_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scan_events: {
        Row: {
          card_id: string | null
          code: string
          created_at: string
          id: string
          outcome: string
          source: string
          user_id: string
        }
        Insert: {
          card_id?: string | null
          code: string
          created_at?: string
          id?: string
          outcome: string
          source?: string
          user_id: string
        }
        Update: {
          card_id?: string | null
          code?: string
          created_at?: string
          id?: string
          outcome?: string
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      user_cards: {
        Row: {
          card_id: string
          claim_source: string
          claimed_at: string
          id: string
          user_id: string
        }
        Insert: {
          card_id: string
          claim_source?: string
          claimed_at?: string
          id?: string
          user_id: string
        }
        Update: {
          card_id?: string
          claim_source?: string
          claimed_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_cards_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: true
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          created_at: string
          data: Json
          event_type: string
          id: string
          processed: boolean
        }
        Insert: {
          created_at?: string
          data: Json
          event_type: string
          id?: string
          processed?: boolean
        }
        Update: {
          created_at?: string
          data?: Json
          event_type?: string
          id?: string
          processed?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_block_user_by_email: {
        Args: { p_email: string; p_reason?: string }
        Returns: Json
      }
      admin_bulk_credit: {
        Args: { p_amount: number; p_ids: string[]; p_ref: string }
        Returns: Json
      }
      admin_credit_selected_cards: {
        Args: {
          p_amount_override?: number
          p_ref?: string
          p_selected_card_ids: string[]
          p_source_redemption_id: string
        }
        Returns: {
          credited_amount: number
          credited_count: number
          new_redemption_id: string
        }[]
      }
      admin_finalize_redemption: {
        Args: {
          p_amount_override?: number
          p_redemption_id: string
          p_ref: string
          p_selected_card_ids: string[]
        }
        Returns: {
          credited_amount: number
          ok: boolean
        }[]
      }
      admin_list_blocked: {
        Args: Record<PropertyKey, never>
        Returns: {
          blocked_at: string
          blocked_by: string
          blocked_by_email: string
          email: string
          reason: string
          user_id: string
        }[]
      }
      admin_list_cards: {
        Args: { p_limit?: number; p_offset?: number; p_search?: string }
        Returns: {
          code: string
          created_at: string
          era: string
          id: string
          image_url: string
          is_active: boolean
          is_credited: boolean
          is_in_pending_redemption: boolean
          name: string
          owner_email: string
          owner_user_id: string
          rank: string
          rarity: string
          redirect: string
          status: string
          suit: string
          time_value: number
          trader_value: string
        }[]
      }
      admin_pending_redemptions: {
        Args: Record<PropertyKey, never>
        Returns: {
          card_count: number
          cards: Json
          email: string
          id: string
          submitted_at: string
          total_time_value: number
          user_id: string
        }[]
      }
      admin_recent_credited: {
        Args: { p_limit?: number }
        Returns: {
          amount_time: number
          card_code: string
          card_id: string
          credited_at: string
          credited_count: number
          redemption_id: string
          user_email: string
          user_id: string
        }[]
      }
      admin_redemptions_pending: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      admin_scan_events: {
        Args: { p_limit?: number }
        Returns: {
          card_id: string
          code: string
          created_at: string
          email: string
          outcome: string
          user_id: string
        }[]
      }
      admin_unblock_user_by_email: {
        Args: { p_email: string }
        Returns: Json
      }
      admin_update_card: {
        Args: {
          p_id: string
          p_is_active?: boolean
          p_name?: string
          p_redirect?: string
          p_status?: string
          p_time_value?: number
        }
        Returns: undefined
      }
      card_claims_with_time_status: {
        Args: Record<PropertyKey, never>
        Returns: {
          card_id: string
          claimed_at: string
          era: string
          image_url: string
          is_credited: boolean
          is_pending: boolean
          name: string
          rank: string
          rarity: string
          suit: string
          time_value: number
          trader_value: string
        }[]
      }
      card_preview: {
        Args: { p_code: string }
        Returns: {
          code: string
          created_at: string
          era: string
          id: string
          image_url: string
          name: string
          rank: string
          rarity: string
          status: string
          suit: string
          trader_value: string
        }[]
      }
      claim_card: {
        Args: { p_code: string } | { p_code: string; p_source?: string }
        Returns: Json
      }
      claim_card_and_log: {
        Args: { p_code: string; p_source?: string }
        Returns: Json
      }
      redemption_receipt: {
        Args: { p_id: string }
        Returns: {
          admin_notes: string
          cards: Json
          credited_amount: number
          credited_at: string
          external_ref: string
          id: string
          status: string
          submitted_at: string
          user_email: string
          user_id: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
