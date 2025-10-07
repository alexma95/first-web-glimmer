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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      assignments: {
        Row: {
          created_at: string
          enrollment_id: string
          id: string
          notes: string | null
          product_id: string
          proof_file_id: string | null
          status: Database["public"]["Enums"]["assignment_status_type"]
          text_option_id: string
          text_snapshot_md: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          enrollment_id: string
          id?: string
          notes?: string | null
          product_id: string
          proof_file_id?: string | null
          status?: Database["public"]["Enums"]["assignment_status_type"]
          text_option_id: string
          text_snapshot_md: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          enrollment_id?: string
          id?: string
          notes?: string | null
          product_id?: string
          proof_file_id?: string | null
          status?: Database["public"]["Enums"]["assignment_status_type"]
          text_option_id?: string
          text_snapshot_md?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_new"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_proof_file_id_fkey"
            columns: ["proof_file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_text_option_id_fkey"
            columns: ["text_option_id"]
            isOneToOne: false
            referencedRelation: "product_text_options"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns_new: {
        Row: {
          created_at: string
          id: string
          name: string
          payment_instructions_md: string | null
          required_products_count: number
          status: string
          support_email: string
          updated_at: string
          welcome_text_md: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          payment_instructions_md?: string | null
          required_products_count?: number
          status?: string
          support_email?: string
          updated_at?: string
          welcome_text_md?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          payment_instructions_md?: string | null
          required_products_count?: number
          status?: string
          support_email?: string
          updated_at?: string
          welcome_text_md?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          campaign_id: string
          created_at: string
          email: string
          id: string
          state: Database["public"]["Enums"]["enrollment_state"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          email: string
          id?: string
          state?: Database["public"]["Enums"]["enrollment_state"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          email?: string
          id?: string
          state?: Database["public"]["Enums"]["enrollment_state"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns_new"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          created_at: string
          id: string
          mime_type: string
          original_filename: string
          size_bytes: number
          storage_key: string
        }
        Insert: {
          created_at?: string
          id?: string
          mime_type: string
          original_filename: string
          size_bytes: number
          storage_key: string
        }
        Update: {
          created_at?: string
          id?: string
          mime_type?: string
          original_filename?: string
          size_bytes?: number
          storage_key?: string
        }
        Relationships: []
      }
      payment_info: {
        Row: {
          address_full: string | null
          bank_account_number: string | null
          bank_details: string | null
          email: string | null
          enrollment_id: string
          full_name: string | null
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          submitted_at: string
        }
        Insert: {
          address_full?: string | null
          bank_account_number?: string | null
          bank_details?: string | null
          email?: string | null
          enrollment_id: string
          full_name?: string | null
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          submitted_at?: string
        }
        Update: {
          address_full?: string | null
          bank_account_number?: string | null
          bank_details?: string | null
          email?: string | null
          enrollment_id?: string
          full_name?: string | null
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_info_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: true
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      product_text_options: {
        Row: {
          assigned_at: string | null
          assigned_to_email: string | null
          created_at: string
          id: string
          product_id: string
          status: Database["public"]["Enums"]["text_option_status"]
          text_md: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_to_email?: string | null
          created_at?: string
          id?: string
          product_id: string
          status?: Database["public"]["Enums"]["text_option_status"]
          text_md: string
        }
        Update: {
          assigned_at?: string | null
          assigned_to_email?: string | null
          created_at?: string
          id?: string
          product_id?: string
          status?: Database["public"]["Enums"]["text_option_status"]
          text_md?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_text_options_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_new"
            referencedColumns: ["id"]
          },
        ]
      }
      products_new: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          position: number
          resource_link_url: string
          review_link_url: string
          status: Database["public"]["Enums"]["product_status"]
          title: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          position: number
          resource_link_url: string
          review_link_url: string
          status?: Database["public"]["Enums"]["product_status"]
          title: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          position?: number
          resource_link_url?: string
          review_link_url?: string
          status?: Database["public"]["Enums"]["product_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_new_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns_new"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_text_option: {
        Args: { p_email: string; p_product_id: string }
        Returns: string
      }
      clone_campaign: {
        Args: { p_campaign_id: string }
        Returns: string
      }
    }
    Enums: {
      assignment_status_type:
        | "assigned"
        | "proof_uploaded"
        | "accepted"
        | "rejected"
      enrollment_state:
        | "assigned"
        | "in_progress"
        | "submitted"
        | "approved"
        | "paid"
      payment_method: "paypal" | "wise" | "bank_wire"
      product_status: "active" | "hidden"
      text_option_status: "available" | "assigned" | "disabled"
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
    Enums: {
      assignment_status_type: [
        "assigned",
        "proof_uploaded",
        "accepted",
        "rejected",
      ],
      enrollment_state: [
        "assigned",
        "in_progress",
        "submitted",
        "approved",
        "paid",
      ],
      payment_method: ["paypal", "wise", "bank_wire"],
      product_status: ["active", "hidden"],
      text_option_status: ["available", "assigned", "disabled"],
    },
  },
} as const
