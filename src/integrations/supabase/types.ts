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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_read: boolean
          severity: string
          source: string | null
          title: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_read?: boolean
          severity?: string
          source?: string | null
          title: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_read?: boolean
          severity?: string
          source?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          company_type: Database["public"]["Enums"]["company_type"] | null
          created_at: string
          deal_lead: string | null
          description: string | null
          ebitda_ltm: number | null
          id: string
          industry: string | null
          name: string
          pipeline_stage: string | null
          revenue_ltm: number | null
          status: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          company_type?: Database["public"]["Enums"]["company_type"] | null
          created_at?: string
          deal_lead?: string | null
          description?: string | null
          ebitda_ltm?: number | null
          id?: string
          industry?: string | null
          name: string
          pipeline_stage?: string | null
          revenue_ltm?: number | null
          status?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          company_type?: Database["public"]["Enums"]["company_type"] | null
          created_at?: string
          deal_lead?: string | null
          description?: string | null
          ebitda_ltm?: number | null
          id?: string
          industry?: string | null
          name?: string
          pipeline_stage?: string | null
          revenue_ltm?: number | null
          status?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          category: Database["public"]["Enums"]["contact_category"] | null
          company_id: string | null
          created_at: string
          email: string | null
          first_name: string
          id: string
          last_name: string
          lender_type: string | null
          notes: string | null
          phone: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["contact_category"] | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          lender_type?: string | null
          notes?: string | null
          phone?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["contact_category"] | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          lender_type?: string | null
          notes?: string | null
          phone?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_pipeline: {
        Row: {
          company_name: string
          created_at: string
          deal_type: string
          ev_ebitda: number | null
          ev_range: string | null
          id: string
          industry: string
          notes: string | null
          priority: string
          source: string | null
          stage: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name: string
          created_at?: string
          deal_type?: string
          ev_ebitda?: number | null
          ev_range?: string | null
          id?: string
          industry: string
          notes?: string | null
          priority?: string
          source?: string | null
          stage?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_name?: string
          created_at?: string
          deal_type?: string
          ev_ebitda?: number | null
          ev_range?: string | null
          id?: string
          industry?: string
          notes?: string | null
          priority?: string
          source?: string | null
          stage?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      deals: {
        Row: {
          assigned_to: string | null
          company_id: string | null
          created_at: string
          deal_value: number | null
          description: string | null
          ebitda: number | null
          enterprise_value: number | null
          id: string
          name: string
          next_step: string | null
          next_step_date: string | null
          priority: string | null
          revenue: number | null
          stage: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          company_id?: string | null
          created_at?: string
          deal_value?: number | null
          description?: string | null
          ebitda?: number | null
          enterprise_value?: number | null
          id?: string
          name: string
          next_step?: string | null
          next_step_date?: string | null
          priority?: string | null
          revenue?: number | null
          stage?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          company_id?: string | null
          created_at?: string
          deal_value?: number | null
          description?: string | null
          ebitda?: number | null
          enterprise_value?: number | null
          id?: string
          name?: string
          next_step?: string | null
          next_step_date?: string | null
          priority?: string | null
          revenue?: number | null
          stage?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      document_comments: {
        Row: {
          content: string
          created_at: string
          document_id: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          document_id: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          document_id?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_comments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          company_id: string
          created_at: string
          doc_status: Database["public"]["Enums"]["document_status"] | null
          file_path: string
          file_size: number | null
          file_type: string | null
          folder: string | null
          id: string
          name: string
          notes: string | null
          owner_id: string | null
          subfolder: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          doc_status?: Database["public"]["Enums"]["document_status"] | null
          file_path: string
          file_size?: number | null
          file_type?: string | null
          folder?: string | null
          id?: string
          name: string
          notes?: string | null
          owner_id?: string | null
          subfolder?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          doc_status?: Database["public"]["Enums"]["document_status"] | null
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          folder?: string | null
          id?: string
          name?: string
          notes?: string | null
          owner_id?: string | null
          subfolder?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      economic_indicators: {
        Row: {
          as_of_date: string
          category: string
          change_pct: number | null
          created_at: string
          current_value: number
          id: string
          indicator_name: string
          previous_value: number | null
          source: string | null
          unit: string
          user_id: string
        }
        Insert: {
          as_of_date?: string
          category?: string
          change_pct?: number | null
          created_at?: string
          current_value: number
          id?: string
          indicator_name: string
          previous_value?: number | null
          source?: string | null
          unit?: string
          user_id: string
        }
        Update: {
          as_of_date?: string
          category?: string
          change_pct?: number | null
          created_at?: string
          current_value?: number
          id?: string
          indicator_name?: string
          previous_value?: number | null
          source?: string | null
          unit?: string
          user_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          company_name: string | null
          created_at: string
          description: string | null
          event_date: string
          event_type: string
          id: string
          title: string
          user_id: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          description?: string | null
          event_date: string
          event_type?: string
          id?: string
          title: string
          user_id: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          description?: string | null
          event_date?: string
          event_type?: string
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      ma_transactions: {
        Row: {
          acquirer_name: string
          announced_date: string
          created_at: string
          deal_value: number | null
          ev_ebitda: number | null
          ev_revenue: number | null
          id: string
          industry: string
          status: string
          target_name: string
          user_id: string
        }
        Insert: {
          acquirer_name: string
          announced_date: string
          created_at?: string
          deal_value?: number | null
          ev_ebitda?: number | null
          ev_revenue?: number | null
          id?: string
          industry: string
          status?: string
          target_name: string
          user_id: string
        }
        Update: {
          acquirer_name?: string
          announced_date?: string
          created_at?: string
          deal_value?: number | null
          ev_ebitda?: number | null
          ev_revenue?: number | null
          id?: string
          industry?: string
          status?: string
          target_name?: string
          user_id?: string
        }
        Relationships: []
      }
      models: {
        Row: {
          assumptions: Json | null
          company_id: string
          created_at: string
          historical_data: Json | null
          id: string
          interview_responses: Json | null
          model_data: Json | null
          model_type: string
          name: string
          status: string | null
          updated_at: string
          user_id: string
          version: number | null
        }
        Insert: {
          assumptions?: Json | null
          company_id: string
          created_at?: string
          historical_data?: Json | null
          id?: string
          interview_responses?: Json | null
          model_data?: Json | null
          model_type: string
          name: string
          status?: string | null
          updated_at?: string
          user_id: string
          version?: number | null
        }
        Update: {
          assumptions?: Json | null
          company_id?: string
          created_at?: string
          historical_data?: Json | null
          id?: string
          interview_responses?: Json | null
          model_data?: Json | null
          model_type?: string
          name?: string
          status?: string | null
          updated_at?: string
          user_id?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "models_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pe_funds: {
        Row: {
          created_at: string
          dpi: number | null
          fund_name: string
          fund_size: number
          id: string
          irr: number | null
          manager: string
          status: string
          strategy: string
          tvpi: number | null
          user_id: string
          vintage_year: number
        }
        Insert: {
          created_at?: string
          dpi?: number | null
          fund_name: string
          fund_size: number
          id?: string
          irr?: number | null
          manager: string
          status?: string
          strategy: string
          tvpi?: number | null
          user_id: string
          vintage_year: number
        }
        Update: {
          created_at?: string
          dpi?: number | null
          fund_name?: string
          fund_size?: number
          id?: string
          irr?: number | null
          manager?: string
          status?: string
          strategy?: string
          tvpi?: number | null
          user_id?: string
          vintage_year?: number
        }
        Relationships: []
      }
      portfolio_assets: {
        Row: {
          company_name: string
          created_at: string
          current_value: number
          ebitda_ltm: number | null
          employee_count: number | null
          health_score: number | null
          id: string
          industry: string
          investment_amount: number
          investment_date: string
          ownership_pct: number
          revenue_ltm: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name: string
          created_at?: string
          current_value: number
          ebitda_ltm?: number | null
          employee_count?: number | null
          health_score?: number | null
          id?: string
          industry: string
          investment_amount: number
          investment_date: string
          ownership_pct: number
          revenue_ltm?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_name?: string
          created_at?: string
          current_value?: number
          ebitda_ltm?: number | null
          employee_count?: number | null
          health_score?: number | null
          id?: string
          industry?: string
          investment_amount?: number
          investment_date?: string
          ownership_pct?: number
          revenue_ltm?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      portfolio_covenants: {
        Row: {
          asset_id: string | null
          company_name: string
          covenant_type: string
          created_at: string
          current_value: number
          id: string
          next_test_date: string | null
          status: string
          threshold: number
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_id?: string | null
          company_name: string
          covenant_type: string
          created_at?: string
          current_value: number
          id?: string
          next_test_date?: string | null
          status?: string
          threshold: number
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_id?: string | null
          company_name?: string
          covenant_type?: string
          created_at?: string
          current_value?: number
          id?: string
          next_test_date?: string | null
          status?: string
          threshold?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_covenants_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "portfolio_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "member" | "viewer"
      company_type: "pipeline" | "portfolio" | "prospect" | "passed"
      contact_category:
        | "lender"
        | "executive"
        | "board"
        | "legal"
        | "vendor"
        | "team"
        | "other"
      document_status: "needs_review" | "approved" | "pending" | "rejected"
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
      app_role: ["admin", "member", "viewer"],
      company_type: ["pipeline", "portfolio", "prospect", "passed"],
      contact_category: [
        "lender",
        "executive",
        "board",
        "legal",
        "vendor",
        "team",
        "other",
      ],
      document_status: ["needs_review", "approved", "pending", "rejected"],
    },
  },
} as const
