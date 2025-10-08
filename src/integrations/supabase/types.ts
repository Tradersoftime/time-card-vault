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
      card_redemptions: {
        Row: {
          admin_notes: string | null
          card_id: string
          created_at: string
          credited_amount: number | null
          credited_at: string | null
          credited_by: string | null
          decided_at: string | null
          decided_by: string | null
          external_ref: string | null
          id: string
          status: string
          submitted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          card_id: string
          created_at?: string
          credited_amount?: number | null
          credited_at?: string | null
          credited_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          external_ref?: string | null
          id?: string
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          card_id?: string
          created_at?: string
          credited_amount?: number | null
          credited_at?: string | null
          credited_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          external_ref?: string | null
          id?: string
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cards: {
        Row: {
          batch_sort_order: number | null
          claim_token: string
          claimed_at: string | null
          claimed_by: string | null
          code: string
          created_at: string
          current_target: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          era: string
          id: string
          image_code: string | null
          image_url: string | null
          is_active: boolean
          is_claimed: boolean
          name: string
          print_batch_id: string | null
          qr_dark: string | null
          qr_light: string | null
          rank: string
          rarity: string | null
          status: string
          suit: string
          time_value: number
          trader_value: string | null
        }
        Insert: {
          batch_sort_order?: number | null
          claim_token?: string
          claimed_at?: string | null
          claimed_by?: string | null
          code: string
          created_at?: string
          current_target?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          era: string
          id?: string
          image_code?: string | null
          image_url?: string | null
          is_active?: boolean
          is_claimed?: boolean
          name: string
          print_batch_id?: string | null
          qr_dark?: string | null
          qr_light?: string | null
          rank: string
          rarity?: string | null
          status?: string
          suit: string
          time_value?: number
          trader_value?: string | null
        }
        Update: {
          batch_sort_order?: number | null
          claim_token?: string
          claimed_at?: string | null
          claimed_by?: string | null
          code?: string
          created_at?: string
          current_target?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          era?: string
          id?: string
          image_code?: string | null
          image_url?: string | null
          is_active?: boolean
          is_claimed?: boolean
          name?: string
          print_batch_id?: string | null
          qr_dark?: string | null
          qr_light?: string | null
          rank?: string
          rarity?: string | null
          status?: string
          suit?: string
          time_value?: number
          trader_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cards_print_batch_id_fkey"
            columns: ["print_batch_id"]
            isOneToOne: false
            referencedRelation: "print_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      image_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          filename: string
          id: string
          public_url: string
          storage_path: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          filename: string
          id?: string
          public_url: string
          storage_path: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          filename?: string
          id?: string
          public_url?: string
          storage_path?: string
        }
        Relationships: []
      }
      print_batches: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          print_date: string | null
          sort_order: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          print_date?: string | null
          sort_order?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          print_date?: string | null
          sort_order?: number
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
      accept_card_rejection: {
        Args: { p_redemption_id: string }
        Returns: Json
      }
      admin_block_user_by_email: {
        Args: { p_email: string; p_reason?: string }
        Returns: Json
      }
      admin_bulk_decision_cards: {
        Args: {
          p_action: string
          p_admin_notes?: string
          p_credited_amount?: number
          p_external_ref?: string
          p_redemption_ids: string[]
        }
        Returns: Json
      }
      admin_bulk_set_active: {
        Args: { p_card_ids: string[]; p_is_active: boolean }
        Returns: Json
      }
      admin_bulk_soft_delete: {
        Args: { p_card_ids: string[] }
        Returns: Json
      }
      admin_delete_pending_redemptions: {
        Args: { p_redemption_ids: string[] }
        Returns: Json
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
        Args:
          | {
              p_include_deleted?: boolean
              p_limit?: number
              p_offset?: number
              p_search?: string
            }
          | { p_limit?: number; p_offset?: number; p_search?: string }
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
      admin_list_users: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_status_filter?: string
        }
        Returns: {
          block_reason: string
          blocked_at: string
          blocked_by_email: string
          created_at: string
          credited_redemptions: number
          email: string
          email_confirmed_at: string
          is_blocked: boolean
          last_activity: string
          last_sign_in_at: string
          pending_redemptions: number
          total_cards_owned: number
          total_scans: number
          total_time_credited: number
          total_time_owned: number
          user_id: string
        }[]
      }
      admin_pending_card_redemptions: {
        Args: Record<PropertyKey, never>
        Returns: {
          card_era: string
          card_id: string
          card_image_url: string
          card_name: string
          card_rank: string
          card_rarity: string
          card_suit: string
          redemption_id: string
          submitted_at: string
          time_value: number
          trader_value: string
          user_email: string
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
      admin_restore_cards: {
        Args: { p_card_ids: string[] }
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
      admin_soft_delete_card: {
        Args: { p_card_id: string }
        Returns: Json
      }
      admin_soft_delete_cards: {
        Args: { p_card_ids: string[] }
        Returns: Json
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
      claim_card_by_token: {
        Args: { p_token: string }
        Returns: Json
      }
      cleanup_old_deleted_cards: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      delete_user_card: {
        Args: { p_card_id: string }
        Returns: Json
      }
      generate_card_code: {
        Args: { p_batch_id?: string; p_rank: string; p_suit: string }
        Returns: string
      }
      generate_claim_token: {
        Args: Record<PropertyKey, never>
        Returns: string
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
      resolve_image_code: {
        Args: { p_code: string }
        Returns: string
      }
      resubmit_rejected_card: {
        Args: { p_redemption_id: string }
        Returns: Json
      }
      submit_card_for_redemption: {
        Args: { p_card_id: string }
        Returns: Json
      }
      user_card_collection: {
        Args: Record<PropertyKey, never>
        Returns: {
          admin_notes: string
          card_id: string
          claimed_at: string
          credited_amount: number
          decided_at: string
          era: string
          image_url: string
          name: string
          rank: string
          rarity: string
          redemption_id: string
          redemption_status: string
          suit: string
          time_value: number
          trader_value: string
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
