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
          asset_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_read: boolean | null
          severity: string
          title: string
        }
        Insert: {
          asset_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_read?: boolean | null
          severity: string
          title: string
        }
        Update: {
          asset_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_read?: boolean | null
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "portfolio_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      cached_api_data: {
        Row: {
          cache_key: string
          cache_type: string
          created_at: string | null
          data: Json
          entity_id: string | null
          entity_type: string | null
          expires_at: string | null
          fetched_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cache_key: string
          cache_type: string
          created_at?: string | null
          data: Json
          entity_id?: string | null
          entity_type?: string | null
          expires_at?: string | null
          fetched_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cache_key?: string
          cache_type?: string
          created_at?: string | null
          data?: Json
          entity_id?: string | null
          entity_type?: string | null
          expires_at?: string | null
          fetched_at?: string | null
          id?: string
          updated_at?: string | null
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
      company_data_fields: {
        Row: {
          company_id: string
          confidence: number | null
          created_at: string | null
          extracted_at: string | null
          field_category: string
          field_name: string
          id: string
          is_verified: boolean | null
          source_excerpt: string | null
          source_id: string | null
          source_name: string | null
          source_type: string
          source_url: string | null
          updated_at: string | null
          user_id: string
          value: Json
          value_type: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          company_id: string
          confidence?: number | null
          created_at?: string | null
          extracted_at?: string | null
          field_category: string
          field_name: string
          id?: string
          is_verified?: boolean | null
          source_excerpt?: string | null
          source_id?: string | null
          source_name?: string | null
          source_type: string
          source_url?: string | null
          updated_at?: string | null
          user_id: string
          value: Json
          value_type: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          company_id?: string
          confidence?: number | null
          created_at?: string | null
          extracted_at?: string | null
          field_category?: string
          field_name?: string
          id?: string
          is_verified?: boolean | null
          source_excerpt?: string | null
          source_id?: string | null
          source_name?: string | null
          source_type?: string
          source_url?: string | null
          updated_at?: string | null
          user_id?: string
          value?: Json
          value_type?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_data_fields_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_notes: {
        Row: {
          category: string
          company_id: string
          content: string
          created_at: string
          id: string
          pinned: boolean
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          company_id: string
          content: string
          created_at?: string
          id?: string
          pinned?: boolean
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          company_id?: string
          content?: string
          created_at?: string
          id?: string
          pinned?: boolean
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_team_assignments: {
        Row: {
          assigned_at: string
          company_id: string
          id: string
          role: string
          team_member_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          company_id: string
          id?: string
          role?: string
          team_member_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          company_id?: string
          id?: string
          role?: string
          team_member_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_team_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_team_assignments_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
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
          role_at_company: string | null
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
          role_at_company?: string | null
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
          role_at_company?: string | null
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
          asking_multiple: number | null
          company_name: string
          created_at: string | null
          ebitda: number | null
          fit_score: string | null
          id: string
          revenue: number | null
          sector: string | null
          stage: string | null
        }
        Insert: {
          asking_multiple?: number | null
          company_name: string
          created_at?: string | null
          ebitda?: number | null
          fit_score?: string | null
          id?: string
          revenue?: number | null
          sector?: string | null
          stage?: string | null
        }
        Update: {
          asking_multiple?: number | null
          company_name?: string
          created_at?: string | null
          ebitda?: number | null
          fit_score?: string | null
          id?: string
          revenue?: number | null
          sector?: string | null
          stage?: string | null
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
          category: string | null
          change_value: number | null
          current_value: string
          id: string
          indicator_name: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          change_value?: number | null
          current_value: string
          id?: string
          indicator_name: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          change_value?: number | null
          current_value?: string
          id?: string
          indicator_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string | null
          event_date: string
          event_type: string
          id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          event_date: string
          event_type: string
          id?: string
          title: string
        }
        Update: {
          created_at?: string | null
          event_date?: string
          event_type?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      extraction_history: {
        Row: {
          company_id: string
          created_at: string | null
          error_message: string | null
          extracted_data: Json | null
          extraction_type: string
          fields_extracted: number | null
          fields_updated: number | null
          id: string
          source_name: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          error_message?: string | null
          extracted_data?: Json | null
          extraction_type: string
          fields_extracted?: number | null
          fields_updated?: number | null
          id?: string
          source_name?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          error_message?: string | null
          extracted_data?: Json | null
          extraction_type?: string
          fields_extracted?: number | null
          fields_updated?: number | null
          id?: string
          source_name?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "extraction_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ma_transactions: {
        Row: {
          acquirer_name: string | null
          created_at: string | null
          ebitda_multiple: number | null
          enterprise_value: number | null
          id: string
          sector: string | null
          target_name: string
          transaction_date: string | null
        }
        Insert: {
          acquirer_name?: string | null
          created_at?: string | null
          ebitda_multiple?: number | null
          enterprise_value?: number | null
          id?: string
          sector?: string | null
          target_name: string
          transaction_date?: string | null
        }
        Update: {
          acquirer_name?: string | null
          created_at?: string | null
          ebitda_multiple?: number | null
          enterprise_value?: number | null
          id?: string
          sector?: string | null
          target_name?: string
          transaction_date?: string | null
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
          created_at: string | null
          current_size: number | null
          fund_name: string
          fund_type: string
          id: string
          manager_name: string
          prior_fund_irr: number | null
          prior_fund_moic: number | null
          status: string | null
          target_size: number | null
        }
        Insert: {
          created_at?: string | null
          current_size?: number | null
          fund_name: string
          fund_type: string
          id?: string
          manager_name: string
          prior_fund_irr?: number | null
          prior_fund_moic?: number | null
          status?: string | null
          target_size?: number | null
        }
        Update: {
          created_at?: string | null
          current_size?: number | null
          fund_name?: string
          fund_type?: string
          id?: string
          manager_name?: string
          prior_fund_irr?: number | null
          prior_fund_moic?: number | null
          status?: string | null
          target_size?: number | null
        }
        Relationships: []
      }
      portfolio_assets: {
        Row: {
          asset_type: string
          created_at: string | null
          current_value: number | null
          debt_service_coverage: number | null
          ebitda_margin: number | null
          health_score: number | null
          id: string
          invested_capital: number | null
          irr: number | null
          moic: number | null
          name: string
          revenue_growth: number | null
          sector: string | null
          vintage_year: number | null
        }
        Insert: {
          asset_type: string
          created_at?: string | null
          current_value?: number | null
          debt_service_coverage?: number | null
          ebitda_margin?: number | null
          health_score?: number | null
          id?: string
          invested_capital?: number | null
          irr?: number | null
          moic?: number | null
          name: string
          revenue_growth?: number | null
          sector?: string | null
          vintage_year?: number | null
        }
        Update: {
          asset_type?: string
          created_at?: string | null
          current_value?: number | null
          debt_service_coverage?: number | null
          ebitda_margin?: number | null
          health_score?: number | null
          id?: string
          invested_capital?: number | null
          irr?: number | null
          moic?: number | null
          name?: string
          revenue_growth?: number | null
          sector?: string | null
          vintage_year?: number | null
        }
        Relationships: []
      }
      portfolio_covenants: {
        Row: {
          asset_id: string | null
          covenant_type: string
          created_at: string | null
          current_value: number
          id: string
          is_warning: boolean | null
          limit_value: number
        }
        Insert: {
          asset_id?: string | null
          covenant_type: string
          created_at?: string | null
          current_value: number
          id?: string
          is_warning?: boolean | null
          limit_value: number
        }
        Update: {
          asset_id?: string | null
          covenant_type?: string
          created_at?: string | null
          current_value?: number
          id?: string
          is_warning?: boolean | null
          limit_value?: number
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
      subtasks: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          id: string
          sort_order: number | null
          task_id: string
          title: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          sort_order?: number | null
          task_id: string
          title: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          sort_order?: number | null
          task_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subtasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          author_id: string | null
          content: string
          created_at: string | null
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_contact_id: string | null
          assignee_id: string | null
          assignee_type: string | null
          assignee_user_id: string | null
          company_id: string | null
          completed_at: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          due_time: string | null
          id: string
          priority: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assignee_contact_id?: string | null
          assignee_id?: string | null
          assignee_type?: string | null
          assignee_user_id?: string | null
          company_id?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          priority?: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assignee_contact_id?: string | null
          assignee_id?: string | null
          assignee_type?: string | null
          assignee_user_id?: string | null
          company_id?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          priority?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_contact_id_fkey"
            columns: ["assignee_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string
          role: string
          title: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          name: string
          role?: string
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          role?: string
          title?: string | null
          updated_at?: string
          user_id?: string | null
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
