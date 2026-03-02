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
      activities: {
        Row: {
          activity_type: string
          created_at: string
          description: string | null
          entity_id: string
          entity_name: string
          entity_type: string
          id: string
          metadata: Json | null
          organization_id: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          description?: string | null
          entity_id: string
          entity_name: string
          entity_type: string
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string | null
          entity_id?: string
          entity_name?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_activity_log: {
        Row: {
          action_type: string
          admin_user_id: string
          created_at: string
          description: string
          id: string
          metadata: Json | null
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action_type: string
          admin_user_id: string
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action_type?: string
          admin_user_id?: string
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: []
      }
      ai_insights: {
        Row: {
          asset_focus: string | null
          confidence: number | null
          correlation_vector: string | null
          created_at: string | null
          id: string
          impact_score: number | null
          model_version: string | null
          news_event_id: string
          related_tickers: string[] | null
          sentiment: Database["public"]["Enums"]["news_sentiment"] | null
          thesis: string | null
          updated_at: string | null
        }
        Insert: {
          asset_focus?: string | null
          confidence?: number | null
          correlation_vector?: string | null
          created_at?: string | null
          id?: string
          impact_score?: number | null
          model_version?: string | null
          news_event_id: string
          related_tickers?: string[] | null
          sentiment?: Database["public"]["Enums"]["news_sentiment"] | null
          thesis?: string | null
          updated_at?: string | null
        }
        Update: {
          asset_focus?: string | null
          confidence?: number | null
          correlation_vector?: string | null
          created_at?: string | null
          id?: string
          impact_score?: number | null
          model_version?: string | null
          news_event_id?: string
          related_tickers?: string[] | null
          sentiment?: Database["public"]["Enums"]["news_sentiment"] | null
          thesis?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_news_event_id_fkey"
            columns: ["news_event_id"]
            isOneToOne: false
            referencedRelation: "news_events"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          asset_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_read: boolean | null
          severity: string
          title: string
          user_id: string | null
        }
        Insert: {
          asset_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_read?: boolean | null
          severity: string
          title: string
          user_id?: string | null
        }
        Update: {
          asset_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_read?: boolean | null
          severity?: string
          title?: string
          user_id?: string | null
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
      api_usage_logs: {
        Row: {
          cost_estimate: number | null
          created_at: string
          endpoint: string | null
          function_name: string
          id: string
          metadata: Json | null
          method: string | null
          response_time_ms: number | null
          status_code: number | null
          tokens_used: number | null
          usage_date: string | null
          user_id: string | null
        }
        Insert: {
          cost_estimate?: number | null
          created_at?: string
          endpoint?: string | null
          function_name: string
          id?: string
          metadata?: Json | null
          method?: string | null
          response_time_ms?: number | null
          status_code?: number | null
          tokens_used?: number | null
          usage_date?: string | null
          user_id?: string | null
        }
        Update: {
          cost_estimate?: number | null
          created_at?: string
          endpoint?: string | null
          function_name?: string
          id?: string
          metadata?: Json | null
          method?: string | null
          response_time_ms?: number | null
          status_code?: number | null
          tokens_used?: number | null
          usage_date?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      arbitrage_opportunities: {
        Row: {
          actual_profit: number | null
          confidence: number | null
          details: Json | null
          detected_at: string
          executed_at: string | null
          expires_at: string | null
          id: string
          markets: string[]
          platforms: string[]
          profit_potential: number
          status: string
          type: string
        }
        Insert: {
          actual_profit?: number | null
          confidence?: number | null
          details?: Json | null
          detected_at?: string
          executed_at?: string | null
          expires_at?: string | null
          id?: string
          markets: string[]
          platforms: string[]
          profit_potential: number
          status?: string
          type: string
        }
        Update: {
          actual_profit?: number | null
          confidence?: number | null
          details?: Json | null
          detected_at?: string
          executed_at?: string | null
          expires_at?: string | null
          id?: string
          markets?: string[]
          platforms?: string[]
          profit_potential?: number
          status?: string
          type?: string
        }
        Relationships: []
      }
      asset_prices: {
        Row: {
          company_id: string
          created_at: string
          id: string
          market_cap: number | null
          price: number
          recorded_at: string
          source: string | null
          volume: number | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          market_cap?: number | null
          price: number
          recorded_at?: string
          source?: string | null
          volume?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          market_cap?: number | null
          price?: number
          recorded_at?: string
          source?: string | null
          volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_prices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_transactions: {
        Row: {
          company_id: string
          created_at: string
          id: string
          notes: string | null
          price_per_share: number | null
          shares: number | null
          total_amount: number | null
          transaction_date: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          notes?: string | null
          price_per_share?: number | null
          shares?: number | null
          total_amount?: number | null
          transaction_date?: string
          transaction_type: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          price_per_share?: number | null
          shares?: number | null
          total_amount?: number | null
          transaction_date?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_universe: {
        Row: {
          asset_type: string
          aum: number | null
          avg_daily_dollar_volume: number | null
          avg_daily_volume: number | null
          beta_spy: number | null
          category: string
          change_percent_1d: number | null
          change_percent_1m: number | null
          change_percent_1w: number | null
          change_percent_ytd: number | null
          created_at: string | null
          currency: string | null
          data_end_date: string | null
          data_start_date: string | null
          description: string | null
          expense_ratio: number | null
          industry: string | null
          is_active: boolean | null
          is_free_tier: boolean | null
          is_validated: boolean | null
          last_close: number | null
          liquidity_score: number | null
          market_cap_tier: string | null
          metadata: Json | null
          name: string
          polygon_ticker_id: string | null
          primary_exchange: string | null
          sector: string | null
          short_description: string | null
          tags: string[] | null
          ticker: string
          total_bars: number | null
          updated_at: string | null
          validation_date: string | null
          volatility_30d: number | null
        }
        Insert: {
          asset_type: string
          aum?: number | null
          avg_daily_dollar_volume?: number | null
          avg_daily_volume?: number | null
          beta_spy?: number | null
          category: string
          change_percent_1d?: number | null
          change_percent_1m?: number | null
          change_percent_1w?: number | null
          change_percent_ytd?: number | null
          created_at?: string | null
          currency?: string | null
          data_end_date?: string | null
          data_start_date?: string | null
          description?: string | null
          expense_ratio?: number | null
          industry?: string | null
          is_active?: boolean | null
          is_free_tier?: boolean | null
          is_validated?: boolean | null
          last_close?: number | null
          liquidity_score?: number | null
          market_cap_tier?: string | null
          metadata?: Json | null
          name: string
          polygon_ticker_id?: string | null
          primary_exchange?: string | null
          sector?: string | null
          short_description?: string | null
          tags?: string[] | null
          ticker: string
          total_bars?: number | null
          updated_at?: string | null
          validation_date?: string | null
          volatility_30d?: number | null
        }
        Update: {
          asset_type?: string
          aum?: number | null
          avg_daily_dollar_volume?: number | null
          avg_daily_volume?: number | null
          beta_spy?: number | null
          category?: string
          change_percent_1d?: number | null
          change_percent_1m?: number | null
          change_percent_1w?: number | null
          change_percent_ytd?: number | null
          created_at?: string | null
          currency?: string | null
          data_end_date?: string | null
          data_start_date?: string | null
          description?: string | null
          expense_ratio?: number | null
          industry?: string | null
          is_active?: boolean | null
          is_free_tier?: boolean | null
          is_validated?: boolean | null
          last_close?: number | null
          liquidity_score?: number | null
          market_cap_tier?: string | null
          metadata?: Json | null
          name?: string
          polygon_ticker_id?: string | null
          primary_exchange?: string | null
          sector?: string | null
          short_description?: string | null
          tags?: string[] | null
          ticker?: string
          total_bars?: number | null
          updated_at?: string | null
          validation_date?: string | null
          volatility_30d?: number | null
        }
        Relationships: []
      }
      brokerage_connections: {
        Row: {
          access_token: string | null
          account_mask: string | null
          account_name: string | null
          brokerage_name: string
          connection_status: string
          created_at: string
          id: string
          last_sync_at: string | null
          metadata: Json | null
          portfolio_id: string | null
          sync_error: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          account_mask?: string | null
          account_name?: string | null
          brokerage_name: string
          connection_status?: string
          created_at?: string
          id?: string
          last_sync_at?: string | null
          metadata?: Json | null
          portfolio_id?: string | null
          sync_error?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          account_mask?: string | null
          account_name?: string | null
          brokerage_name?: string
          connection_status?: string
          created_at?: string
          id?: string
          last_sync_at?: string | null
          metadata?: Json | null
          portfolio_id?: string | null
          sync_error?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brokerage_connections_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "saved_portfolios"
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
      calculation_cache: {
        Row: {
          ai_interpretation: Json | null
          ai_suggestions: Json | null
          benchmark_ticker: string | null
          calculated_at: string | null
          calculation_traces: Json | null
          data_version: number | null
          end_date: string
          expires_at: string | null
          id: string
          is_valid: boolean | null
          metrics: Json
          portfolio_hash: string
          returns_series: Json | null
          risk_free_rate: number | null
          start_date: string
          tickers: string[]
          user_id: string | null
          weights: number[]
        }
        Insert: {
          ai_interpretation?: Json | null
          ai_suggestions?: Json | null
          benchmark_ticker?: string | null
          calculated_at?: string | null
          calculation_traces?: Json | null
          data_version?: number | null
          end_date: string
          expires_at?: string | null
          id?: string
          is_valid?: boolean | null
          metrics: Json
          portfolio_hash: string
          returns_series?: Json | null
          risk_free_rate?: number | null
          start_date: string
          tickers: string[]
          user_id?: string | null
          weights: number[]
        }
        Update: {
          ai_interpretation?: Json | null
          ai_suggestions?: Json | null
          benchmark_ticker?: string | null
          calculated_at?: string | null
          calculation_traces?: Json | null
          data_version?: number | null
          end_date?: string
          expires_at?: string | null
          id?: string
          is_valid?: boolean | null
          metrics?: Json
          portfolio_hash?: string
          returns_series?: Json | null
          risk_free_rate?: number | null
          start_date?: string
          tickers?: string[]
          user_id?: string | null
          weights?: number[]
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          attachment_type: string | null
          attachment_url: string | null
          content: string
          created_at: string
          detected_tickers: string[] | null
          id: string
          is_edited: boolean
          is_premium: boolean | null
          mentioned_users: string[] | null
          reply_to: string | null
          room_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attachment_type?: string | null
          attachment_url?: string | null
          content: string
          created_at?: string
          detected_tickers?: string[] | null
          id?: string
          is_edited?: boolean
          is_premium?: boolean | null
          mentioned_users?: string[] | null
          reply_to?: string | null
          room_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string
          created_at?: string
          detected_tickers?: string[] | null
          id?: string
          is_edited?: boolean
          is_premium?: boolean | null
          mentioned_users?: string[] | null
          reply_to?: string | null
          room_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          icon: string | null
          id: string
          is_premium: boolean | null
          member_count: number
          name: string
          posting_mode: string
          requires_approval: boolean
          room_type: Database["public"]["Enums"]["room_type"]
          slug: string
          ticker: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          icon?: string | null
          id?: string
          is_premium?: boolean | null
          member_count?: number
          name: string
          posting_mode?: string
          requires_approval?: boolean
          room_type?: Database["public"]["Enums"]["room_type"]
          slug: string
          ticker?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_premium?: boolean | null
          member_count?: number
          name?: string
          posting_mode?: string
          requires_approval?: boolean
          room_type?: Database["public"]["Enums"]["room_type"]
          slug?: string
          ticker?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          asset_class: string | null
          company_type: Database["public"]["Enums"]["company_type"] | null
          cost_basis: number | null
          created_at: string
          created_by: string | null
          current_price: number | null
          deal_lead: string | null
          description: string | null
          ebitda_ltm: number | null
          exchange: string | null
          id: string
          industry: string | null
          market_value: number | null
          name: string
          organization_id: string | null
          pipeline_stage: string | null
          price_updated_at: string | null
          revenue_ltm: number | null
          shares_owned: number | null
          status: string | null
          ticker_symbol: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          asset_class?: string | null
          company_type?: Database["public"]["Enums"]["company_type"] | null
          cost_basis?: number | null
          created_at?: string
          created_by?: string | null
          current_price?: number | null
          deal_lead?: string | null
          description?: string | null
          ebitda_ltm?: number | null
          exchange?: string | null
          id?: string
          industry?: string | null
          market_value?: number | null
          name: string
          organization_id?: string | null
          pipeline_stage?: string | null
          price_updated_at?: string | null
          revenue_ltm?: number | null
          shares_owned?: number | null
          status?: string | null
          ticker_symbol?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          asset_class?: string | null
          company_type?: Database["public"]["Enums"]["company_type"] | null
          cost_basis?: number | null
          created_at?: string
          created_by?: string | null
          current_price?: number | null
          deal_lead?: string | null
          description?: string | null
          ebitda_ltm?: number | null
          exchange?: string | null
          id?: string
          industry?: string | null
          market_value?: number | null
          name?: string
          organization_id?: string | null
          pipeline_stage?: string | null
          price_updated_at?: string | null
          revenue_ltm?: number | null
          shares_owned?: number | null
          status?: string | null
          ticker_symbol?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
        ]
      }
      company_ai_summaries: {
        Row: {
          company_id: string
          content: string
          created_at: string | null
          generated_at: string | null
          id: string
          items: Json | null
          model_used: string | null
          source_document_ids: string[] | null
          summary_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          content: string
          created_at?: string | null
          generated_at?: string | null
          id?: string
          items?: Json | null
          model_used?: string | null
          source_document_ids?: string[] | null
          summary_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          content?: string
          created_at?: string | null
          generated_at?: string | null
          id?: string
          items?: Json | null
          model_used?: string | null
          source_document_ids?: string[] | null
          summary_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_ai_summaries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
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
          {
            foreignKeyName: "contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
        ]
      }
      course_enrollments: {
        Row: {
          certificate_issued: boolean | null
          completed_at: string | null
          course_id: string | null
          enrolled_at: string | null
          id: string
          last_accessed_at: string | null
          progress: number | null
          user_id: string | null
        }
        Insert: {
          certificate_issued?: boolean | null
          completed_at?: string | null
          course_id?: string | null
          enrolled_at?: string | null
          id?: string
          last_accessed_at?: string | null
          progress?: number | null
          user_id?: string | null
        }
        Update: {
          certificate_issued?: boolean | null
          completed_at?: string | null
          course_id?: string | null
          enrolled_at?: string | null
          id?: string
          last_accessed_at?: string | null
          progress?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_lessons: {
        Row: {
          content: string | null
          created_at: string | null
          description: string | null
          id: string
          is_preview: boolean | null
          module_id: string | null
          order_index: number
          title: string
          updated_at: string | null
          video_duration: number | null
          video_provider: string | null
          video_url: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_preview?: boolean | null
          module_id?: string | null
          order_index: number
          title: string
          updated_at?: string | null
          video_duration?: number | null
          video_provider?: string | null
          video_url?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_preview?: boolean | null
          module_id?: string | null
          order_index?: number
          title?: string
          updated_at?: string | null
          video_duration?: number | null
          video_provider?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      course_modules: {
        Row: {
          course_id: string | null
          created_at: string | null
          description: string | null
          id: string
          order_index: number
          title: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          order_index: number
          title: string
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          order_index?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_reviews: {
        Row: {
          course_id: string | null
          created_at: string | null
          id: string
          rating: number | null
          review: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          id?: string
          rating?: number | null
          review?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          id?: string
          rating?: number | null
          review?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          duration_hours: number | null
          id: string
          instructor_id: string | null
          is_free: boolean | null
          is_published: boolean | null
          level: string | null
          price: number | null
          rating: number | null
          student_count: number | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          duration_hours?: number | null
          id?: string
          instructor_id?: string | null
          is_free?: boolean | null
          is_published?: boolean | null
          level?: string | null
          price?: number | null
          rating?: number | null
          student_count?: number | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          duration_hours?: number | null
          id?: string
          instructor_id?: string | null
          is_free?: boolean | null
          is_published?: boolean | null
          level?: string | null
          price?: number | null
          rating?: number | null
          student_count?: number | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      data_sync_log: {
        Row: {
          bars_inserted: number | null
          bars_updated: number | null
          completed_at: string | null
          errors: Json | null
          id: number
          metadata: Json | null
          started_at: string
          status: string
          sync_type: string
          tickers_failed: number | null
          tickers_processed: number | null
          tickers_succeeded: number | null
          tickers_total: number | null
          triggered_by: string | null
          warnings: Json | null
        }
        Insert: {
          bars_inserted?: number | null
          bars_updated?: number | null
          completed_at?: string | null
          errors?: Json | null
          id?: number
          metadata?: Json | null
          started_at?: string
          status: string
          sync_type: string
          tickers_failed?: number | null
          tickers_processed?: number | null
          tickers_succeeded?: number | null
          tickers_total?: number | null
          triggered_by?: string | null
          warnings?: Json | null
        }
        Update: {
          bars_inserted?: number | null
          bars_updated?: number | null
          completed_at?: string | null
          errors?: Json | null
          id?: number
          metadata?: Json | null
          started_at?: string
          status?: string
          sync_type?: string
          tickers_failed?: number | null
          tickers_processed?: number | null
          tickers_succeeded?: number | null
          tickers_total?: number | null
          triggered_by?: string | null
          warnings?: Json | null
        }
        Relationships: []
      }
      data_sync_status: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          last_sync_at: string | null
          next_sync_at: string | null
          records_updated: number | null
          status: string | null
          sync_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          last_sync_at?: string | null
          next_sync_at?: string | null
          records_updated?: number | null
          status?: string | null
          sync_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          last_sync_at?: string | null
          next_sync_at?: string | null
          records_updated?: number | null
          status?: string | null
          sync_type?: string
          updated_at?: string
        }
        Relationships: []
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
          user_id: string | null
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
          user_id?: string | null
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
          user_id?: string | null
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
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
          {
            foreignKeyName: "deals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
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
          document_type: string | null
          file_path: string
          file_size: number | null
          file_type: string | null
          folder: string | null
          id: string
          name: string
          notes: string | null
          organization_id: string | null
          owner_id: string | null
          processed_at: string | null
          processing_error: string | null
          processing_status: string | null
          subfolder: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          doc_status?: Database["public"]["Enums"]["document_status"] | null
          document_type?: string | null
          file_path: string
          file_size?: number | null
          file_type?: string | null
          folder?: string | null
          id?: string
          name: string
          notes?: string | null
          organization_id?: string | null
          owner_id?: string | null
          processed_at?: string | null
          processing_error?: string | null
          processing_status?: string | null
          subfolder?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          doc_status?: Database["public"]["Enums"]["document_status"] | null
          document_type?: string | null
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          folder?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string | null
          owner_id?: string | null
          processed_at?: string | null
          processing_error?: string | null
          processing_status?: string | null
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
          {
            foreignKeyName: "documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
        ]
      }
      earnings_calendar: {
        Row: {
          actual_report_time: string | null
          analyst_count: number | null
          company_name: string | null
          created_at: string | null
          eps_actual: number | null
          eps_estimate: number | null
          eps_surprise_pct: number | null
          estimated_time: string | null
          fiscal_period: string | null
          fiscal_year: number | null
          id: string
          market_cap: number | null
          report_date: string
          revenue_actual: number | null
          revenue_estimate: number | null
          revenue_surprise_pct: number | null
          symbol: string
          time_of_day: string | null
          updated_at: string | null
        }
        Insert: {
          actual_report_time?: string | null
          analyst_count?: number | null
          company_name?: string | null
          created_at?: string | null
          eps_actual?: number | null
          eps_estimate?: number | null
          eps_surprise_pct?: number | null
          estimated_time?: string | null
          fiscal_period?: string | null
          fiscal_year?: number | null
          id?: string
          market_cap?: number | null
          report_date: string
          revenue_actual?: number | null
          revenue_estimate?: number | null
          revenue_surprise_pct?: number | null
          symbol: string
          time_of_day?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_report_time?: string | null
          analyst_count?: number | null
          company_name?: string | null
          created_at?: string | null
          eps_actual?: number | null
          eps_estimate?: number | null
          eps_surprise_pct?: number | null
          estimated_time?: string | null
          fiscal_period?: string | null
          fiscal_year?: number | null
          id?: string
          market_cap?: number | null
          report_date?: string
          revenue_actual?: number | null
          revenue_estimate?: number | null
          revenue_surprise_pct?: number | null
          symbol?: string
          time_of_day?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      earnings_history: {
        Row: {
          created_at: string | null
          eps_actual: number | null
          eps_estimate: number | null
          eps_surprise_pct: number | null
          fiscal_period: string | null
          id: string
          price_after: number | null
          price_before: number | null
          price_change_pct: number | null
          report_date: string
          return_1d: number | null
          return_1m: number | null
          return_1w: number | null
          return_2w: number | null
          return_3m: number | null
          return_5d: number | null
          revenue_actual: number | null
          revenue_estimate: number | null
          revenue_surprise_pct: number | null
          symbol: string
        }
        Insert: {
          created_at?: string | null
          eps_actual?: number | null
          eps_estimate?: number | null
          eps_surprise_pct?: number | null
          fiscal_period?: string | null
          id?: string
          price_after?: number | null
          price_before?: number | null
          price_change_pct?: number | null
          report_date: string
          return_1d?: number | null
          return_1m?: number | null
          return_1w?: number | null
          return_2w?: number | null
          return_3m?: number | null
          return_5d?: number | null
          revenue_actual?: number | null
          revenue_estimate?: number | null
          revenue_surprise_pct?: number | null
          symbol: string
        }
        Update: {
          created_at?: string | null
          eps_actual?: number | null
          eps_estimate?: number | null
          eps_surprise_pct?: number | null
          fiscal_period?: string | null
          id?: string
          price_after?: number | null
          price_before?: number | null
          price_change_pct?: number | null
          report_date?: string
          return_1d?: number | null
          return_1m?: number | null
          return_1w?: number | null
          return_2w?: number | null
          return_3m?: number | null
          return_5d?: number | null
          revenue_actual?: number | null
          revenue_estimate?: number | null
          revenue_surprise_pct?: number | null
          symbol?: string
        }
        Relationships: []
      }
      earnings_predictions: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          earnings_calendar_id: string | null
          generated_at: string | null
          id: string
          model_version: string | null
          predicted_outcome: string | null
          report_date: string
          signals: Json | null
          symbol: string
          user_id: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          earnings_calendar_id?: string | null
          generated_at?: string | null
          id?: string
          model_version?: string | null
          predicted_outcome?: string | null
          report_date: string
          signals?: Json | null
          symbol: string
          user_id?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          earnings_calendar_id?: string | null
          generated_at?: string | null
          id?: string
          model_version?: string | null
          predicted_outcome?: string | null
          report_date?: string
          signals?: Json | null
          symbol?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "earnings_predictions_earnings_calendar_id_fkey"
            columns: ["earnings_calendar_id"]
            isOneToOne: true
            referencedRelation: "earnings_calendar"
            referencedColumns: ["id"]
          },
        ]
      }
      economic_calendar: {
        Row: {
          actual_value: string | null
          country: string | null
          created_at: string
          currency: string | null
          description: string | null
          event_date: string
          event_name: string
          event_time: string | null
          event_type: string
          forecast_value: string | null
          id: string
          importance: string | null
          previous_value: string | null
          source: string | null
          updated_at: string
        }
        Insert: {
          actual_value?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          event_date: string
          event_name: string
          event_time?: string | null
          event_type: string
          forecast_value?: string | null
          id?: string
          importance?: string | null
          previous_value?: string | null
          source?: string | null
          updated_at?: string
        }
        Update: {
          actual_value?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          event_date?: string
          event_name?: string
          event_time?: string | null
          event_type?: string
          forecast_value?: string | null
          id?: string
          importance?: string | null
          previous_value?: string | null
          source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      economic_indicators: {
        Row: {
          category: string
          change_percent: number | null
          change_value: number | null
          current_value: number | null
          id: string
          indicator_type: string
          name: string
          previous_value: number | null
          source: string | null
          symbol: string
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          category: string
          change_percent?: number | null
          change_value?: number | null
          current_value?: number | null
          id?: string
          indicator_type: string
          name: string
          previous_value?: number | null
          source?: string | null
          symbol: string
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          change_percent?: number | null
          change_value?: number | null
          current_value?: number | null
          id?: string
          indicator_type?: string
          name?: string
          previous_value?: number | null
          source?: string | null
          symbol?: string
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_verifications: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          token: string
          user_id: string
          verified: boolean
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          token: string
          user_id: string
          verified?: boolean
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          token?: string
          user_id?: string
          verified?: boolean
          verified_at?: string | null
        }
        Relationships: []
      }
      event_alert_subscriptions: {
        Row: {
          alert_before_hours: number | null
          alert_on_release: boolean | null
          countries: string[] | null
          created_at: string | null
          email: boolean | null
          event_name: string | null
          event_type: string | null
          id: string
          importance: string[] | null
          in_app: boolean | null
          is_active: boolean | null
          push: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alert_before_hours?: number | null
          alert_on_release?: boolean | null
          countries?: string[] | null
          created_at?: string | null
          email?: boolean | null
          event_name?: string | null
          event_type?: string | null
          id?: string
          importance?: string[] | null
          in_app?: boolean | null
          is_active?: boolean | null
          push?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alert_before_hours?: number | null
          alert_on_release?: boolean | null
          countries?: string[] | null
          created_at?: string | null
          email?: boolean | null
          event_name?: string | null
          event_type?: string | null
          id?: string
          importance?: string[] | null
          in_app?: boolean | null
          is_active?: boolean | null
          push?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      event_market_correlations: {
        Row: {
          avg_price_impact: number | null
          avg_time_to_impact: unknown
          confidence_interval_high: number | null
          confidence_interval_low: number | null
          correlation_coefficient: number | null
          event_type: string
          id: string
          last_calculated: string | null
          market_category: string
          sample_size: number
        }
        Insert: {
          avg_price_impact?: number | null
          avg_time_to_impact?: unknown
          confidence_interval_high?: number | null
          confidence_interval_low?: number | null
          correlation_coefficient?: number | null
          event_type: string
          id?: string
          last_calculated?: string | null
          market_category: string
          sample_size?: number
        }
        Update: {
          avg_price_impact?: number | null
          avg_time_to_impact?: unknown
          confidence_interval_high?: number | null
          confidence_interval_low?: number | null
          correlation_coefficient?: number | null
          event_type?: string
          id?: string
          last_calculated?: string | null
          market_category?: string
          sample_size?: number
        }
        Relationships: []
      }
      event_probability_history: {
        Row: {
          actual_return: number | null
          created_at: string | null
          days_before_prediction: number | null
          event_date: string
          event_type: string
          id: string
          predicted_probability: number | null
          predicted_return: number | null
          symbol: string
          was_correct: boolean | null
        }
        Insert: {
          actual_return?: number | null
          created_at?: string | null
          days_before_prediction?: number | null
          event_date: string
          event_type: string
          id?: string
          predicted_probability?: number | null
          predicted_return?: number | null
          symbol: string
          was_correct?: boolean | null
        }
        Update: {
          actual_return?: number | null
          created_at?: string | null
          days_before_prediction?: number | null
          event_date?: string
          event_type?: string
          id?: string
          predicted_probability?: number | null
          predicted_return?: number | null
          symbol?: string
          was_correct?: boolean | null
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
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_date: string
          event_type: string
          id?: string
          title: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_date?: string
          event_type?: string
          id?: string
          title?: string
          user_id?: string | null
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
      feedback: {
        Row: {
          created_at: string | null
          email: string | null
          feedback_type: string
          id: string
          message: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          feedback_type?: string
          id?: string
          message: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          feedback_type?: string
          id?: string
          message?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      generated_alerts: {
        Row: {
          actioned_at: string | null
          ai_analysis: Json | null
          alert_type: string
          confidence: number | null
          created_at: string | null
          dismissed_at: string | null
          headline: string
          id: string
          read_at: string | null
          related_market_id: string | null
          related_news_ids: string[] | null
          related_whale_txs: string[] | null
          status: string | null
          suggested_actions: Json | null
          summary: string | null
          urgency: string | null
          user_id: string
          why_it_matters: string | null
        }
        Insert: {
          actioned_at?: string | null
          ai_analysis?: Json | null
          alert_type: string
          confidence?: number | null
          created_at?: string | null
          dismissed_at?: string | null
          headline: string
          id?: string
          read_at?: string | null
          related_market_id?: string | null
          related_news_ids?: string[] | null
          related_whale_txs?: string[] | null
          status?: string | null
          suggested_actions?: Json | null
          summary?: string | null
          urgency?: string | null
          user_id: string
          why_it_matters?: string | null
        }
        Update: {
          actioned_at?: string | null
          ai_analysis?: Json | null
          alert_type?: string
          confidence?: number | null
          created_at?: string | null
          dismissed_at?: string | null
          headline?: string
          id?: string
          read_at?: string | null
          related_market_id?: string | null
          related_news_ids?: string[] | null
          related_whale_txs?: string[] | null
          status?: string | null
          suggested_actions?: Json | null
          summary?: string | null
          urgency?: string | null
          user_id?: string
          why_it_matters?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_alerts_related_market_id_fkey"
            columns: ["related_market_id"]
            isOneToOne: false
            referencedRelation: "prediction_markets"
            referencedColumns: ["id"]
          },
        ]
      }
      historical_outcomes: {
        Row: {
          final_pre_resolution_probability: number | null
          id: string
          initial_probability: number | null
          market_id: string
          price_path: Json | null
          resolution_source: string | null
          resolution_value: number | null
          resolved_at: string
          total_volume: number | null
          unique_traders: number | null
          winning_outcome_id: string | null
        }
        Insert: {
          final_pre_resolution_probability?: number | null
          id?: string
          initial_probability?: number | null
          market_id: string
          price_path?: Json | null
          resolution_source?: string | null
          resolution_value?: number | null
          resolved_at: string
          total_volume?: number | null
          unique_traders?: number | null
          winning_outcome_id?: string | null
        }
        Update: {
          final_pre_resolution_probability?: number | null
          id?: string
          initial_probability?: number | null
          market_id?: string
          price_path?: Json | null
          resolution_source?: string | null
          resolution_value?: number | null
          resolved_at?: string
          total_volume?: number | null
          unique_traders?: number | null
          winning_outcome_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historical_outcomes_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "prediction_markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historical_outcomes_winning_outcome_id_fkey"
            columns: ["winning_outcome_id"]
            isOneToOne: false
            referencedRelation: "market_outcomes"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_plans: {
        Row: {
          created_at: string | null
          id: string
          investor_type: string | null
          investor_type_name: string | null
          name: string
          plan_content: string | null
          responses: Json | null
          risk_profile: string | null
          risk_score: number | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          investor_type?: string | null
          investor_type_name?: string | null
          name?: string
          plan_content?: string | null
          responses?: Json | null
          risk_profile?: string | null
          risk_score?: number | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          investor_type?: string | null
          investor_type_name?: string | null
          name?: string
          plan_content?: string | null
          responses?: Json | null
          risk_profile?: string | null
          risk_score?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      kol_accounts: {
        Row: {
          accuracy_score: number | null
          category: string[] | null
          display_name: string | null
          follower_count: number | null
          id: string
          influence_score: number | null
          is_verified: boolean | null
          last_updated: string | null
          metadata: Json | null
          platform: string
          platform_user_id: string | null
          username: string
        }
        Insert: {
          accuracy_score?: number | null
          category?: string[] | null
          display_name?: string | null
          follower_count?: number | null
          id?: string
          influence_score?: number | null
          is_verified?: boolean | null
          last_updated?: string | null
          metadata?: Json | null
          platform: string
          platform_user_id?: string | null
          username: string
        }
        Update: {
          accuracy_score?: number | null
          category?: string[] | null
          display_name?: string | null
          follower_count?: number | null
          id?: string
          influence_score?: number | null
          is_verified?: boolean | null
          last_updated?: string | null
          metadata?: Json | null
          platform?: string
          platform_user_id?: string | null
          username?: string
        }
        Relationships: []
      }
      kol_sentiment: {
        Row: {
          confidence: number | null
          content_hash: string | null
          content_snippet: string | null
          detected_at: string
          engagement_score: number | null
          entities: string[] | null
          full_content: string | null
          id: string
          kol_id: string
          platform: string | null
          post_url: string | null
          posted_at: string | null
          related_markets: string[] | null
          sentiment_score: number | null
          topics: string[] | null
        }
        Insert: {
          confidence?: number | null
          content_hash?: string | null
          content_snippet?: string | null
          detected_at?: string
          engagement_score?: number | null
          entities?: string[] | null
          full_content?: string | null
          id?: string
          kol_id: string
          platform?: string | null
          post_url?: string | null
          posted_at?: string | null
          related_markets?: string[] | null
          sentiment_score?: number | null
          topics?: string[] | null
        }
        Update: {
          confidence?: number | null
          content_hash?: string | null
          content_snippet?: string | null
          detected_at?: string
          engagement_score?: number | null
          entities?: string[] | null
          full_content?: string | null
          id?: string
          kol_id?: string
          platform?: string | null
          post_url?: string | null
          posted_at?: string | null
          related_markets?: string[] | null
          sentiment_score?: number | null
          topics?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "kol_sentiment_kol_id_fkey"
            columns: ["kol_id"]
            isOneToOne: false
            referencedRelation: "kol_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          id: string
          last_position: number | null
          lesson_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          last_position?: number | null
          lesson_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          last_position?: number | null
          lesson_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
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
          user_id: string | null
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
          user_id?: string | null
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
          user_id?: string | null
        }
        Relationships: []
      }
      market_daily_bars: {
        Row: {
          bar_date: string
          close: number
          created_at: string | null
          daily_return: number | null
          high: number
          id: number
          log_return: number | null
          low: number
          open: number
          ticker: string
          transactions: number | null
          updated_at: string | null
          volume: number
          vwap: number | null
        }
        Insert: {
          bar_date: string
          close: number
          created_at?: string | null
          daily_return?: number | null
          high: number
          id?: number
          log_return?: number | null
          low: number
          open: number
          ticker: string
          transactions?: number | null
          updated_at?: string | null
          volume: number
          vwap?: number | null
        }
        Update: {
          bar_date?: string
          close?: number
          created_at?: string | null
          daily_return?: number | null
          high?: number
          id?: number
          log_return?: number | null
          low?: number
          open?: number
          ticker?: string
          transactions?: number | null
          updated_at?: string | null
          volume?: number
          vwap?: number | null
        }
        Relationships: []
      }
      market_drivers: {
        Row: {
          ai_reasoning: string | null
          confidence: number | null
          created_at: string
          direction: string
          id: string
          impact_score: number
          market_id: string
          signal_id: string
        }
        Insert: {
          ai_reasoning?: string | null
          confidence?: number | null
          created_at?: string
          direction: string
          id?: string
          impact_score: number
          market_id: string
          signal_id: string
        }
        Update: {
          ai_reasoning?: string | null
          confidence?: number | null
          created_at?: string
          direction?: string
          id?: string
          impact_score?: number
          market_id?: string
          signal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_drivers_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "prediction_markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_drivers_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "raw_signals"
            referencedColumns: ["id"]
          },
        ]
      }
      market_outcomes: {
        Row: {
          current_price: number | null
          id: string
          last_trade_price: number | null
          market_id: string
          open_interest: number | null
          platform_outcome_id: string | null
          price_change_24h: number | null
          title: string
          updated_at: string
          volume_24h: number | null
          volume_total: number | null
        }
        Insert: {
          current_price?: number | null
          id?: string
          last_trade_price?: number | null
          market_id: string
          open_interest?: number | null
          platform_outcome_id?: string | null
          price_change_24h?: number | null
          title: string
          updated_at?: string
          volume_24h?: number | null
          volume_total?: number | null
        }
        Update: {
          current_price?: number | null
          id?: string
          last_trade_price?: number | null
          market_id?: string
          open_interest?: number | null
          platform_outcome_id?: string | null
          price_change_24h?: number | null
          title?: string
          updated_at?: string
          volume_24h?: number | null
          volume_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "market_outcomes_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "prediction_markets"
            referencedColumns: ["id"]
          },
        ]
      }
      market_price_history: {
        Row: {
          id: number
          market_id: string
          outcome_id: string
          price: number
          timestamp: string
          volume: number | null
        }
        Insert: {
          id?: number
          market_id: string
          outcome_id: string
          price: number
          timestamp?: string
          volume?: number | null
        }
        Update: {
          id?: number
          market_id?: string
          outcome_id?: string
          price?: number
          timestamp?: string
          volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "market_price_history_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "prediction_markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_price_history_outcome_id_fkey"
            columns: ["outcome_id"]
            isOneToOne: false
            referencedRelation: "market_outcomes"
            referencedColumns: ["id"]
          },
        ]
      }
      market_themes: {
        Row: {
          category: string
          created_at: string
          detailed_summary: string
          generated_date: string
          headlines: Json
          icon_name: string
          id: string
          impact_percent: number | null
          is_active: boolean
          sentiment_score: number | null
          summary: string
          theme_id: string
          tickers: Json
          title: string
        }
        Insert: {
          category: string
          created_at?: string
          detailed_summary: string
          generated_date?: string
          headlines?: Json
          icon_name?: string
          id?: string
          impact_percent?: number | null
          is_active?: boolean
          sentiment_score?: number | null
          summary: string
          theme_id: string
          tickers?: Json
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          detailed_summary?: string
          generated_date?: string
          headlines?: Json
          icon_name?: string
          id?: string
          impact_percent?: number | null
          is_active?: boolean
          sentiment_score?: number | null
          summary?: string
          theme_id?: string
          tickers?: Json
          title?: string
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_threads: {
        Row: {
          created_at: string
          id: string
          last_reply_at: string | null
          parent_message_id: string
          reply_count: number
          room_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_reply_at?: string | null
          parent_message_id: string
          reply_count?: number
          room_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_reply_at?: string | null
          parent_message_id?: string
          reply_count?: number
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_threads_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: true
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      metric_definitions: {
        Row: {
          category: string
          color: string | null
          display_order: number | null
          example_calculation: string | null
          formula: string
          formula_explained: string
          icon: string | null
          id: string
          interpretation: Json
          is_active: boolean | null
          name: string
          plain_english: string
          updated_at: string | null
          why_it_matters: string
        }
        Insert: {
          category: string
          color?: string | null
          display_order?: number | null
          example_calculation?: string | null
          formula: string
          formula_explained: string
          icon?: string | null
          id: string
          interpretation: Json
          is_active?: boolean | null
          name: string
          plain_english: string
          updated_at?: string | null
          why_it_matters: string
        }
        Update: {
          category?: string
          color?: string | null
          display_order?: number | null
          example_calculation?: string | null
          formula?: string
          formula_explained?: string
          icon?: string | null
          id?: string
          interpretation?: Json
          is_active?: boolean | null
          name?: string
          plain_english?: string
          updated_at?: string | null
          why_it_matters?: string
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
      narrative_timeline: {
        Row: {
          cluster_id: string | null
          created_at: string | null
          development: string
          event_date: string
          id: string
          related_article_id: string | null
          sentiment_change: number | null
          significance: string | null
        }
        Insert: {
          cluster_id?: string | null
          created_at?: string | null
          development: string
          event_date?: string
          id?: string
          related_article_id?: string | null
          sentiment_change?: number | null
          significance?: string | null
        }
        Update: {
          cluster_id?: string | null
          created_at?: string | null
          development?: string
          event_date?: string
          id?: string
          related_article_id?: string | null
          sentiment_change?: number | null
          significance?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "narrative_timeline_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "news_clusters"
            referencedColumns: ["id"]
          },
        ]
      }
      news_clusters: {
        Row: {
          article_count: number | null
          article_ids: string[] | null
          cluster_date: string
          created_at: string | null
          first_detected: string | null
          id: string
          is_emerging: boolean | null
          key_developments: Json | null
          last_updated: string | null
          main_entities: string[] | null
          market_correlation: Json | null
          momentum_score: number | null
          narrative_summary: string | null
          narrative_title: string
          related_market_ids: string[] | null
          sentiment_arc: string | null
        }
        Insert: {
          article_count?: number | null
          article_ids?: string[] | null
          cluster_date?: string
          created_at?: string | null
          first_detected?: string | null
          id?: string
          is_emerging?: boolean | null
          key_developments?: Json | null
          last_updated?: string | null
          main_entities?: string[] | null
          market_correlation?: Json | null
          momentum_score?: number | null
          narrative_summary?: string | null
          narrative_title: string
          related_market_ids?: string[] | null
          sentiment_arc?: string | null
        }
        Update: {
          article_count?: number | null
          article_ids?: string[] | null
          cluster_date?: string
          created_at?: string | null
          first_detected?: string | null
          id?: string
          is_emerging?: boolean | null
          key_developments?: Json | null
          last_updated?: string | null
          main_entities?: string[] | null
          market_correlation?: Json | null
          momentum_score?: number | null
          narrative_summary?: string | null
          narrative_title?: string
          related_market_ids?: string[] | null
          sentiment_arc?: string | null
        }
        Relationships: []
      }
      news_events: {
        Row: {
          created_at: string | null
          id: string
          published_at: string | null
          raw_concepts: Json | null
          source_id: string
          summary: string | null
          title: string
          updated_at: string | null
          url: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          published_at?: string | null
          raw_concepts?: Json | null
          source_id: string
          summary?: string | null
          title: string
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          published_at?: string | null
          raw_concepts?: Json | null
          source_id?: string
          summary?: string | null
          title?: string
          updated_at?: string | null
          url?: string | null
        }
        Relationships: []
      }
      organization_invites: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          invite_code: string
          invited_by: string | null
          organization_id: string
          role: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          invite_code: string
          invited_by?: string | null
          organization_id: string
          role?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          invite_code?: string
          invited_by?: string | null
          organization_id?: string
          role?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          id: string
          invited_at: string | null
          invited_by: string | null
          job_title: string | null
          joined_at: string | null
          organization_id: string
          role: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          job_title?: string | null
          joined_at?: string | null
          organization_id: string
          role?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          job_title?: string | null
          joined_at?: string | null
          organization_id?: string
          role?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          allow_join_requests: boolean | null
          created_at: string | null
          created_by: string | null
          default_asset_view: string | null
          enabled_asset_types: string[] | null
          id: string
          is_public: boolean | null
          logo_url: string | null
          max_companies: number | null
          max_members: number | null
          name: string
          plan: string | null
          settings: Json | null
          slug: string
          type: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          allow_join_requests?: boolean | null
          created_at?: string | null
          created_by?: string | null
          default_asset_view?: string | null
          enabled_asset_types?: string[] | null
          id?: string
          is_public?: boolean | null
          logo_url?: string | null
          max_companies?: number | null
          max_members?: number | null
          name: string
          plan?: string | null
          settings?: Json | null
          slug: string
          type?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          allow_join_requests?: boolean | null
          created_at?: string | null
          created_by?: string | null
          default_asset_view?: string | null
          enabled_asset_types?: string[] | null
          id?: string
          is_public?: boolean | null
          logo_url?: string | null
          max_companies?: number | null
          max_members?: number | null
          name?: string
          plan?: string | null
          settings?: Json | null
          slug?: string
          type?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      page_views: {
        Row: {
          id: string
          page_path: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          page_path: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          page_path?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: []
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
          user_id: string | null
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
          user_id?: string | null
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
          user_id?: string | null
        }
        Relationships: []
      }
      pinned_messages: {
        Row: {
          id: string
          message_id: string
          pinned_at: string
          pinned_by: string
          room_id: string
        }
        Insert: {
          id?: string
          message_id: string
          pinned_at?: string
          pinned_by: string
          room_id: string
        }
        Update: {
          id?: string
          message_id?: string
          pinned_at?: string
          pinned_by?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pinned_messages_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: true
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pinned_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
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
          user_id: string | null
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
          user_id?: string | null
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
          user_id?: string | null
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
          user_id: string | null
        }
        Insert: {
          asset_id?: string | null
          covenant_type: string
          created_at?: string | null
          current_value: number
          id?: string
          is_warning?: boolean | null
          limit_value: number
          user_id?: string | null
        }
        Update: {
          asset_id?: string | null
          covenant_type?: string
          created_at?: string | null
          current_value?: number
          id?: string
          is_warning?: boolean | null
          limit_value?: number
          user_id?: string | null
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
      post_comments: {
        Row: {
          content: string
          created_at: string
          detected_tickers: string[] | null
          id: string
          parent_id: string | null
          post_id: string
          updated_at: string
          upvotes: number
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          detected_tickers?: string[] | null
          id?: string
          parent_id?: string | null
          post_id: string
          updated_at?: string
          upvotes?: number
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          detected_tickers?: string[] | null
          id?: string
          parent_id?: string | null
          post_id?: string
          updated_at?: string
          upvotes?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "research_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_votes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
          vote_type: number
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
          vote_type: number
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
          vote_type?: number
        }
        Relationships: [
          {
            foreignKeyName: "post_votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "research_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      prediction_markets: {
        Row: {
          category: string
          created_at: string
          description: string | null
          embedding: string | null
          id: string
          image_url: string | null
          is_binary: boolean
          last_ai_analyzed_at: string | null
          liquidity: number | null
          metadata: Json | null
          platform: string
          platform_market_id: string
          resolution_date: string | null
          resolution_source: string | null
          resolved_at: string | null
          source_url: string | null
          status: string
          subcategory: string | null
          tags: string[] | null
          title: string
          total_volume: number | null
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          embedding?: string | null
          id?: string
          image_url?: string | null
          is_binary?: boolean
          last_ai_analyzed_at?: string | null
          liquidity?: number | null
          metadata?: Json | null
          platform: string
          platform_market_id: string
          resolution_date?: string | null
          resolution_source?: string | null
          resolved_at?: string | null
          source_url?: string | null
          status?: string
          subcategory?: string | null
          tags?: string[] | null
          title: string
          total_volume?: number | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          embedding?: string | null
          id?: string
          image_url?: string | null
          is_binary?: boolean
          last_ai_analyzed_at?: string | null
          liquidity?: number | null
          metadata?: Json | null
          platform?: string
          platform_market_id?: string
          resolution_date?: string | null
          resolution_source?: string | null
          resolved_at?: string | null
          source_url?: string | null
          status?: string
          subcategory?: string | null
          tags?: string[] | null
          title?: string
          total_volume?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      probability_screen_cache: {
        Row: {
          cache_key: string
          created_at: string | null
          expires_at: string | null
          id: string
          results: Json
          total_count: number | null
        }
        Insert: {
          cache_key: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          results: Json
          total_count?: number | null
        }
        Update: {
          cache_key?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          results?: Json
          total_count?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age_verified_at: string | null
          avatar_url: string | null
          company: string | null
          created_at: string
          current_organization_id: string | null
          full_name: string | null
          id: string
          is_age_verified: boolean | null
          job_title: string | null
          linkedin_url: string | null
          membership_tier: string | null
          onboarding_completed: boolean | null
          onboarding_step: string | null
          phone: string | null
          preferences: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age_verified_at?: string | null
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          current_organization_id?: string | null
          full_name?: string | null
          id?: string
          is_age_verified?: boolean | null
          job_title?: string | null
          linkedin_url?: string | null
          membership_tier?: string | null
          onboarding_completed?: boolean | null
          onboarding_step?: string | null
          phone?: string | null
          preferences?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age_verified_at?: string | null
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          current_organization_id?: string | null
          full_name?: string | null
          id?: string
          is_age_verified?: boolean | null
          job_title?: string | null
          linkedin_url?: string | null
          membership_tier?: string | null
          onboarding_completed?: boolean | null
          onboarding_step?: string | null
          phone?: string | null
          preferences?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_current_organization_id_fkey"
            columns: ["current_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_current_organization_id_fkey"
            columns: ["current_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          answers: Json | null
          completed_at: string | null
          id: string
          max_score: number | null
          passed: boolean | null
          quiz_id: string | null
          score: number | null
          started_at: string | null
          time_taken: number | null
          user_id: string | null
        }
        Insert: {
          answers?: Json | null
          completed_at?: string | null
          id?: string
          max_score?: number | null
          passed?: boolean | null
          quiz_id?: string | null
          score?: number | null
          started_at?: string | null
          time_taken?: number | null
          user_id?: string | null
        }
        Update: {
          answers?: Json | null
          completed_at?: string | null
          id?: string
          max_score?: number | null
          passed?: boolean | null
          quiz_id?: string | null
          score?: number | null
          started_at?: string | null
          time_taken?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_answer: string | null
          created_at: string | null
          explanation: string | null
          id: string
          options: Json | null
          order_index: number | null
          points: number | null
          question_text: string
          question_type: string | null
          quiz_id: string | null
        }
        Insert: {
          correct_answer?: string | null
          created_at?: string | null
          explanation?: string | null
          id?: string
          options?: Json | null
          order_index?: number | null
          points?: number | null
          question_text: string
          question_type?: string | null
          quiz_id?: string | null
        }
        Update: {
          correct_answer?: string | null
          created_at?: string | null
          explanation?: string | null
          id?: string
          options?: Json | null
          order_index?: number | null
          points?: number | null
          question_text?: string
          question_type?: string | null
          quiz_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          course_id: string | null
          created_at: string | null
          description: string | null
          id: string
          lesson_id: string | null
          max_attempts: number | null
          passing_score: number | null
          randomize_questions: boolean | null
          show_correct_answers: boolean | null
          time_limit: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          lesson_id?: string | null
          max_attempts?: number | null
          passing_score?: number | null
          randomize_questions?: boolean | null
          show_correct_answers?: boolean | null
          time_limit?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          lesson_id?: string | null
          max_attempts?: number | null
          passing_score?: number | null
          randomize_questions?: boolean | null
          show_correct_answers?: boolean | null
          time_limit?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      raw_signals: {
        Row: {
          content: string
          created_at: string
          embedding: string | null
          id: string
          metadata: Json | null
          published_at: string | null
          source_type: string | null
          source_url: string | null
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          published_at?: string | null
          source_type?: string | null
          source_url?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          published_at?: string | null
          source_type?: string | null
          source_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      real_world_events: {
        Row: {
          ai_classification: Json | null
          ai_extracted_entities: Json | null
          ai_market_links: Json | null
          ai_sentiment: Json | null
          category: string | null
          content_hash: string | null
          description: string | null
          detected_at: string
          duplicate_of: string | null
          entities: string[] | null
          event_date: string | null
          full_content: string | null
          id: string
          is_duplicate: boolean | null
          metadata: Json | null
          processed_at: string | null
          processing_status: string | null
          related_markets: string[] | null
          sentiment_score: number | null
          severity: string | null
          source: string | null
          source_url: string | null
          title: string
        }
        Insert: {
          ai_classification?: Json | null
          ai_extracted_entities?: Json | null
          ai_market_links?: Json | null
          ai_sentiment?: Json | null
          category?: string | null
          content_hash?: string | null
          description?: string | null
          detected_at?: string
          duplicate_of?: string | null
          entities?: string[] | null
          event_date?: string | null
          full_content?: string | null
          id?: string
          is_duplicate?: boolean | null
          metadata?: Json | null
          processed_at?: string | null
          processing_status?: string | null
          related_markets?: string[] | null
          sentiment_score?: number | null
          severity?: string | null
          source?: string | null
          source_url?: string | null
          title: string
        }
        Update: {
          ai_classification?: Json | null
          ai_extracted_entities?: Json | null
          ai_market_links?: Json | null
          ai_sentiment?: Json | null
          category?: string | null
          content_hash?: string | null
          description?: string | null
          detected_at?: string
          duplicate_of?: string | null
          entities?: string[] | null
          event_date?: string | null
          full_content?: string | null
          id?: string
          is_duplicate?: boolean | null
          metadata?: Json | null
          processed_at?: string | null
          processing_status?: string | null
          related_markets?: string[] | null
          sentiment_score?: number | null
          severity?: string | null
          source?: string | null
          source_url?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "real_world_events_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "real_world_events"
            referencedColumns: ["id"]
          },
        ]
      }
      research_posts: {
        Row: {
          comment_count: number
          content: string
          created_at: string
          detected_tickers: string[] | null
          downvotes: number
          id: string
          is_pinned: boolean
          title: string
          updated_at: string
          upvotes: number
          user_id: string
        }
        Insert: {
          comment_count?: number
          content: string
          created_at?: string
          detected_tickers?: string[] | null
          downvotes?: number
          id?: string
          is_pinned?: boolean
          title: string
          updated_at?: string
          upvotes?: number
          user_id: string
        }
        Update: {
          comment_count?: number
          content?: string
          created_at?: string
          detected_tickers?: string[] | null
          downvotes?: number
          id?: string
          is_pinned?: boolean
          title?: string
          updated_at?: string
          upvotes?: number
          user_id?: string
        }
        Relationships: []
      }
      room_members: {
        Row: {
          id: string
          joined_at: string
          role: string
          room_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: string
          room_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_read_receipts: {
        Row: {
          id: string
          last_read_at: string
          last_read_message_id: string | null
          room_id: string
          user_id: string
        }
        Insert: {
          id?: string
          last_read_at?: string
          last_read_message_id?: string | null
          room_id: string
          user_id: string
        }
        Update: {
          id?: string
          last_read_at?: string
          last_read_message_id?: string | null
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_read_receipts_last_read_message_id_fkey"
            columns: ["last_read_message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_read_receipts_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_portfolios: {
        Row: {
          allocations: Json
          created_at: string
          description: string | null
          id: string
          investor_profile: Json | null
          name: string
          portfolio_mode: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allocations?: Json
          created_at?: string
          description?: string | null
          id?: string
          investor_profile?: Json | null
          name: string
          portfolio_mode?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allocations?: Json
          created_at?: string
          description?: string | null
          id?: string
          investor_profile?: Json | null
          name?: string
          portfolio_mode?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_studies: {
        Row: {
          bars_analyzed: number | null
          created_at: string
          date_range: Json | null
          id: string
          notes: string | null
          params: Json | null
          period: string
          result: Json
          study_name: string
          study_type: string
          ticker: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bars_analyzed?: number | null
          created_at?: string
          date_range?: Json | null
          id?: string
          notes?: string | null
          params?: Json | null
          period: string
          result: Json
          study_name: string
          study_type: string
          ticker: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bars_analyzed?: number | null
          created_at?: string
          date_range?: Json | null
          id?: string
          notes?: string | null
          params?: Json | null
          period?: string
          result?: Json
          study_name?: string
          study_type?: string
          ticker?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      screened_portfolios_cache: {
        Row: {
          cagr: number
          computed_at: string | null
          created_at: string | null
          data_points: number
          expires_at: string | null
          family: string
          id: string
          lookback_years: number | null
          max_drawdown: number
          name: string
          risk_profile: string
          sharpe: number
          sortino: number
          tickers: string[]
          total_return: number
          volatility: number
          weights: number[]
        }
        Insert: {
          cagr: number
          computed_at?: string | null
          created_at?: string | null
          data_points: number
          expires_at?: string | null
          family: string
          id: string
          lookback_years?: number | null
          max_drawdown: number
          name: string
          risk_profile: string
          sharpe: number
          sortino: number
          tickers: string[]
          total_return: number
          volatility: number
          weights: number[]
        }
        Update: {
          cagr?: number
          computed_at?: string | null
          created_at?: string | null
          data_points?: number
          expires_at?: string | null
          family?: string
          id?: string
          lookback_years?: number | null
          max_drawdown?: number
          name?: string
          risk_profile?: string
          sharpe?: number
          sortino?: number
          tickers?: string[]
          total_return?: number
          volatility?: number
          weights?: number[]
        }
        Relationships: []
      }
      security_rate_limits: {
        Row: {
          action_count: number | null
          action_type: string
          created_at: string | null
          id: string
          user_id: string | null
          window_start: string | null
        }
        Insert: {
          action_count?: number | null
          action_type: string
          created_at?: string | null
          id?: string
          user_id?: string | null
          window_start?: string | null
        }
        Update: {
          action_count?: number | null
          action_type?: string
          created_at?: string | null
          id?: string
          user_id?: string | null
          window_start?: string | null
        }
        Relationships: []
      }
      stock_price_cache: {
        Row: {
          adjusted_close: number | null
          close_price: number | null
          created_at: string | null
          high_price: number | null
          id: string
          low_price: number | null
          open_price: number | null
          ticker: string
          trade_date: string
          updated_at: string | null
          volume: number | null
        }
        Insert: {
          adjusted_close?: number | null
          close_price?: number | null
          created_at?: string | null
          high_price?: number | null
          id?: string
          low_price?: number | null
          open_price?: number | null
          ticker: string
          trade_date: string
          updated_at?: string | null
          volume?: number | null
        }
        Update: {
          adjusted_close?: number | null
          close_price?: number | null
          created_at?: string | null
          high_price?: number | null
          id?: string
          low_price?: number | null
          open_price?: number | null
          ticker?: string
          trade_date?: string
          updated_at?: string | null
          volume?: number | null
        }
        Relationships: []
      }
      study_materials: {
        Row: {
          category: string | null
          course_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          download_count: number | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: string
          lesson_id: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          course_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          download_count?: number | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          lesson_id?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          course_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          download_count?: number | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          lesson_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_materials_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_materials_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      study_probability_scores: {
        Row: {
          avg_gain: number | null
          avg_loss: number | null
          calculated_at: string
          confidence_level: string | null
          created_at: string
          expected_return: number | null
          expires_at: string | null
          id: string
          is_valid: boolean | null
          last_signal_date: string | null
          lookforward_days: number
          market_cap_tier: string | null
          name: string | null
          probability_score: number
          sample_size: number
          sector: string | null
          signal_active: boolean | null
          signal_strength: number | null
          study_category: string
          study_id: string
          study_name: string
          study_params: Json | null
          ticker: string
          updated_at: string
          win_rate: number | null
        }
        Insert: {
          avg_gain?: number | null
          avg_loss?: number | null
          calculated_at?: string
          confidence_level?: string | null
          created_at?: string
          expected_return?: number | null
          expires_at?: string | null
          id?: string
          is_valid?: boolean | null
          last_signal_date?: string | null
          lookforward_days?: number
          market_cap_tier?: string | null
          name?: string | null
          probability_score: number
          sample_size?: number
          sector?: string | null
          signal_active?: boolean | null
          signal_strength?: number | null
          study_category: string
          study_id: string
          study_name: string
          study_params?: Json | null
          ticker: string
          updated_at?: string
          win_rate?: number | null
        }
        Update: {
          avg_gain?: number | null
          avg_loss?: number | null
          calculated_at?: string
          confidence_level?: string | null
          created_at?: string
          expected_return?: number | null
          expires_at?: string | null
          id?: string
          is_valid?: boolean | null
          last_signal_date?: string | null
          lookforward_days?: number
          market_cap_tier?: string | null
          name?: string | null
          probability_score?: number
          sample_size?: number
          sector?: string | null
          signal_active?: boolean | null
          signal_strength?: number | null
          study_category?: string
          study_id?: string
          study_name?: string
          study_params?: Json | null
          ticker?: string
          updated_at?: string
          win_rate?: number | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
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
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string | null
          description: string
          id: string
          priority: string
          resolution: string | null
          resolved_at: string | null
          status: string
          subject: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          created_at?: string | null
          description: string
          id?: string
          priority?: string
          resolution?: string | null
          resolved_at?: string | null
          status?: string
          subject: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string | null
          description?: string
          id?: string
          priority?: string
          resolution?: string | null
          resolved_at?: string | null
          status?: string
          subject?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      synced_positions: {
        Row: {
          asset_type: string | null
          connection_id: string | null
          cost_basis: number | null
          cost_per_share: number | null
          created_at: string
          current_price: number | null
          current_value: number | null
          id: string
          last_price_update: string | null
          name: string | null
          portfolio_id: string | null
          purchase_date: string | null
          quantity: number
          source: string
          symbol: string
          unrealized_gain: number | null
          unrealized_gain_percent: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_type?: string | null
          connection_id?: string | null
          cost_basis?: number | null
          cost_per_share?: number | null
          created_at?: string
          current_price?: number | null
          current_value?: number | null
          id?: string
          last_price_update?: string | null
          name?: string | null
          portfolio_id?: string | null
          purchase_date?: string | null
          quantity?: number
          source?: string
          symbol: string
          unrealized_gain?: number | null
          unrealized_gain_percent?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_type?: string | null
          connection_id?: string | null
          cost_basis?: number | null
          cost_per_share?: number | null
          created_at?: string
          current_price?: number | null
          current_value?: number | null
          id?: string
          last_price_update?: string | null
          name?: string | null
          portfolio_id?: string | null
          purchase_date?: string | null
          quantity?: number
          source?: string
          symbol?: string
          unrealized_gain?: number | null
          unrealized_gain_percent?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "synced_positions_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "brokerage_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "synced_positions_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "brokerage_connections_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "synced_positions_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "saved_portfolios"
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
          is_template: boolean | null
          next_occurrence_date: string | null
          organization_id: string | null
          parent_task_id: string | null
          priority: string
          recurrence_end_date: string | null
          recurrence_interval: number | null
          recurrence_pattern: string | null
          status: string
          tags: string[] | null
          template_name: string | null
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
          is_template?: boolean | null
          next_occurrence_date?: string | null
          organization_id?: string | null
          parent_task_id?: string | null
          priority?: string
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_pattern?: string | null
          status?: string
          tags?: string[] | null
          template_name?: string | null
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
          is_template?: boolean | null
          next_occurrence_date?: string | null
          organization_id?: string | null
          parent_task_id?: string | null
          priority?: string
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_pattern?: string | null
          status?: string
          tags?: string[] | null
          template_name?: string | null
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
          {
            foreignKeyName: "tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
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
      ticker_correlations: {
        Row: {
          calculated_at: string | null
          correlation: number
          period_days: number
          ticker_a: string
          ticker_b: string
        }
        Insert: {
          calculated_at?: string | null
          correlation: number
          period_days: number
          ticker_a: string
          ticker_b: string
        }
        Update: {
          calculated_at?: string | null
          correlation?: number
          period_days?: number
          ticker_a?: string
          ticker_b?: string
        }
        Relationships: []
      }
      ticker_directory: {
        Row: {
          created_at: string | null
          exchange: string | null
          industry: string | null
          is_active: boolean | null
          is_etf: boolean | null
          market_cap_tier: string | null
          name: string
          sector: string | null
          symbol: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          exchange?: string | null
          industry?: string | null
          is_active?: boolean | null
          is_etf?: boolean | null
          market_cap_tier?: string | null
          name: string
          sector?: string | null
          symbol: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          exchange?: string | null
          industry?: string | null
          is_active?: boolean | null
          is_etf?: boolean | null
          market_cap_tier?: string | null
          name?: string
          sector?: string | null
          symbol?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ticker_universe: {
        Row: {
          asset_type: string | null
          description: string | null
          industry: string | null
          is_active: boolean | null
          last_updated: string | null
          logo_url: string | null
          market_cap: number | null
          market_cap_tier: string | null
          metadata: Json | null
          name: string
          primary_exchange: string | null
          sector: string | null
          symbol: string
          website_url: string | null
        }
        Insert: {
          asset_type?: string | null
          description?: string | null
          industry?: string | null
          is_active?: boolean | null
          last_updated?: string | null
          logo_url?: string | null
          market_cap?: number | null
          market_cap_tier?: string | null
          metadata?: Json | null
          name: string
          primary_exchange?: string | null
          sector?: string | null
          symbol: string
          website_url?: string | null
        }
        Update: {
          asset_type?: string | null
          description?: string | null
          industry?: string | null
          is_active?: boolean | null
          last_updated?: string | null
          logo_url?: string | null
          market_cap?: number | null
          market_cap_tier?: string | null
          metadata?: Json | null
          name?: string
          primary_exchange?: string | null
          sector?: string | null
          symbol?: string
          website_url?: string | null
        }
        Relationships: []
      }
      tickers_map: {
        Row: {
          asset_type: string | null
          concept: string
          created_at: string | null
          id: string
          is_active: boolean | null
          sector: string | null
          ticker: string
          ticker_name: string | null
          updated_at: string | null
        }
        Insert: {
          asset_type?: string | null
          concept: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          sector?: string | null
          ticker: string
          ticker_name?: string | null
          updated_at?: string | null
        }
        Update: {
          asset_type?: string | null
          concept?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          sector?: string | null
          ticker?: string
          ticker_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          attachments: string[] | null
          created_at: string | null
          id: string
          is_staff: boolean
          message: string
          ticket_id: string
          user_id: string | null
        }
        Insert: {
          attachments?: string[] | null
          created_at?: string | null
          id?: string
          is_staff?: boolean
          message: string
          ticket_id: string
          user_id?: string | null
        }
        Update: {
          attachments?: string[] | null
          created_at?: string | null
          id?: string
          is_staff?: boolean
          message?: string
          ticket_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_idea_feedback: {
        Row: {
          action: string
          created_at: string | null
          feedback: string | null
          id: string
          idea_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          feedback?: string | null
          id?: string
          idea_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          feedback?: string | null
          id?: string
          idea_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trade_idea_feedback_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "trade_ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_ideas: {
        Row: {
          actual_return: number | null
          catalyst_events: Json | null
          category: string | null
          confidence: number | null
          counter_arguments: Json | null
          created_at: string | null
          direction: string
          divergence_score: number | null
          entry_price: number | null
          expected_value: number | null
          generated_at: string | null
          id: string
          is_public: boolean | null
          kelly_fraction: number | null
          market_id: string | null
          market_title: string | null
          max_position: number | null
          outcome: string | null
          platform: string | null
          resolved_at: string | null
          risk_level: string | null
          status: string | null
          stop_loss_price: number | null
          suggested_allocation: number | null
          supporting_evidence: Json | null
          target_price: number | null
          thesis_detailed: string | null
          thesis_summary: string | null
          time_horizon: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          actual_return?: number | null
          catalyst_events?: Json | null
          category?: string | null
          confidence?: number | null
          counter_arguments?: Json | null
          created_at?: string | null
          direction: string
          divergence_score?: number | null
          entry_price?: number | null
          expected_value?: number | null
          generated_at?: string | null
          id?: string
          is_public?: boolean | null
          kelly_fraction?: number | null
          market_id?: string | null
          market_title?: string | null
          max_position?: number | null
          outcome?: string | null
          platform?: string | null
          resolved_at?: string | null
          risk_level?: string | null
          status?: string | null
          stop_loss_price?: number | null
          suggested_allocation?: number | null
          supporting_evidence?: Json | null
          target_price?: number | null
          thesis_detailed?: string | null
          thesis_summary?: string | null
          time_horizon?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          actual_return?: number | null
          catalyst_events?: Json | null
          category?: string | null
          confidence?: number | null
          counter_arguments?: Json | null
          created_at?: string | null
          direction?: string
          divergence_score?: number | null
          entry_price?: number | null
          expected_value?: number | null
          generated_at?: string | null
          id?: string
          is_public?: boolean | null
          kelly_fraction?: number | null
          market_id?: string | null
          market_title?: string | null
          max_position?: number | null
          outcome?: string | null
          platform?: string | null
          resolved_at?: string | null
          risk_level?: string | null
          status?: string | null
          stop_loss_price?: number | null
          suggested_allocation?: number | null
          supporting_evidence?: Json | null
          target_price?: number | null
          thesis_detailed?: string | null
          thesis_summary?: string | null
          time_horizon?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      universe_probability_scores: {
        Row: {
          avg_gain: number | null
          avg_loss: number | null
          calculation_method: string | null
          confidence_level: string | null
          days_until_event: number | null
          event_type: string
          expected_return: number | null
          id: string
          last_calculated: string | null
          metadata: Json | null
          next_event_date: string | null
          probability_score: number | null
          sample_size: number | null
          symbol: string
          win_rate: number | null
        }
        Insert: {
          avg_gain?: number | null
          avg_loss?: number | null
          calculation_method?: string | null
          confidence_level?: string | null
          days_until_event?: number | null
          event_type: string
          expected_return?: number | null
          id?: string
          last_calculated?: string | null
          metadata?: Json | null
          next_event_date?: string | null
          probability_score?: number | null
          sample_size?: number | null
          symbol: string
          win_rate?: number | null
        }
        Update: {
          avg_gain?: number | null
          avg_loss?: number | null
          calculation_method?: string | null
          confidence_level?: string | null
          days_until_event?: number | null
          event_type?: string
          expected_return?: number | null
          id?: string
          last_calculated?: string | null
          metadata?: Json | null
          next_event_date?: string | null
          probability_score?: number | null
          sample_size?: number | null
          symbol?: string
          win_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "universe_probability_scores_symbol_fkey"
            columns: ["symbol"]
            isOneToOne: false
            referencedRelation: "ticker_universe"
            referencedColumns: ["symbol"]
          },
        ]
      }
      user_alerts: {
        Row: {
          alert_type: string
          channels: string[] | null
          conditions: Json
          created_at: string
          id: string
          is_active: boolean
          last_triggered: string | null
          market_id: string | null
          trigger_count: number | null
          user_id: string
        }
        Insert: {
          alert_type: string
          channels?: string[] | null
          conditions?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          last_triggered?: string | null
          market_id?: string | null
          trigger_count?: number | null
          user_id: string
        }
        Update: {
          alert_type?: string
          channels?: string[] | null
          conditions?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          last_triggered?: string | null
          market_id?: string | null
          trigger_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_alerts_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "prediction_markets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_portfolios: {
        Row: {
          added_at: string | null
          alert_threshold: number | null
          id: string
          is_watchlist: boolean | null
          notes: string | null
          ticker: string
          ticker_name: string | null
          user_id: string
          weight: number | null
        }
        Insert: {
          added_at?: string | null
          alert_threshold?: number | null
          id?: string
          is_watchlist?: boolean | null
          notes?: string | null
          ticker: string
          ticker_name?: string | null
          user_id: string
          weight?: number | null
        }
        Update: {
          added_at?: string | null
          alert_threshold?: number | null
          id?: string
          is_watchlist?: boolean | null
          notes?: string | null
          ticker?: string
          ticker_name?: string | null
          user_id?: string
          weight?: number | null
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          current_room_id: string | null
          id: string
          last_seen_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          current_room_id?: string | null
          id?: string
          last_seen_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          current_room_id?: string | null
          id?: string
          last_seen_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_presence_current_room_id_fkey"
            columns: ["current_room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
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
      user_sessions: {
        Row: {
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          last_heartbeat_at: string
          started_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          last_heartbeat_at?: string
          started_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          last_heartbeat_at?: string
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_usage: {
        Row: {
          ai_analyses_today: number | null
          alerts_today: number | null
          id: string
          last_reset_at: string | null
          portfolio_count: number | null
          quant_studies_today: number | null
          saved_screens: number | null
          screener_searches_today: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_analyses_today?: number | null
          alerts_today?: number | null
          id?: string
          last_reset_at?: string | null
          portfolio_count?: number | null
          quant_studies_today?: number | null
          saved_screens?: number | null
          screener_searches_today?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_analyses_today?: number | null
          alerts_today?: number | null
          id?: string
          last_reset_at?: string | null
          portfolio_count?: number | null
          quant_studies_today?: number | null
          saved_screens?: number | null
          screener_searches_today?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_watchlist: {
        Row: {
          added_at: string | null
          id: string
          item_id: string
          item_name: string
          item_type: string
          notes: string | null
          user_id: string
        }
        Insert: {
          added_at?: string | null
          id?: string
          item_id: string
          item_name: string
          item_type: string
          notes?: string | null
          user_id: string
        }
        Update: {
          added_at?: string | null
          id?: string
          item_id?: string
          item_name?: string
          item_type?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_watchlists: {
        Row: {
          alert_settings: Json | null
          created_at: string
          id: string
          market_ids: string[] | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_settings?: Json | null
          created_at?: string
          id?: string
          market_ids?: string[] | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_settings?: Json | null
          created_at?: string
          id?: string
          market_ids?: string[] | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      whale_transactions: {
        Row: {
          amount: number
          block_number: number | null
          id: string
          market_id: string
          outcome_id: string | null
          price: number
          side: string
          timestamp: string
          transaction_hash: string | null
          wallet_id: string
        }
        Insert: {
          amount: number
          block_number?: number | null
          id?: string
          market_id: string
          outcome_id?: string | null
          price: number
          side: string
          timestamp?: string
          transaction_hash?: string | null
          wallet_id: string
        }
        Update: {
          amount?: number
          block_number?: number | null
          id?: string
          market_id?: string
          outcome_id?: string | null
          price?: number
          side?: string
          timestamp?: string
          transaction_hash?: string | null
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whale_transactions_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "prediction_markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whale_transactions_outcome_id_fkey"
            columns: ["outcome_id"]
            isOneToOne: false
            referencedRelation: "market_outcomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whale_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "whale_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      whale_wallets: {
        Row: {
          address: string
          avg_position_size: number | null
          first_seen: string
          id: string
          is_smart_money: boolean | null
          label: string | null
          metadata: Json | null
          profitable_trades: number | null
          tags: string[] | null
          total_trades: number | null
          total_volume: number | null
          win_rate: number | null
        }
        Insert: {
          address: string
          avg_position_size?: number | null
          first_seen?: string
          id?: string
          is_smart_money?: boolean | null
          label?: string | null
          metadata?: Json | null
          profitable_trades?: number | null
          tags?: string[] | null
          total_trades?: number | null
          total_volume?: number | null
          win_rate?: number | null
        }
        Update: {
          address?: string
          avg_position_size?: number | null
          first_seen?: string
          id?: string
          is_smart_money?: boolean | null
          label?: string | null
          metadata?: Json | null
          profitable_trades?: number | null
          tags?: string[] | null
          total_trades?: number | null
          total_volume?: number | null
          win_rate?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      brokerage_connections_secure: {
        Row: {
          account_mask: string | null
          account_name: string | null
          brokerage_name: string | null
          connection_status: string | null
          created_at: string | null
          id: string | null
          last_sync_at: string | null
          portfolio_id: string | null
          sync_error: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          account_mask?: string | null
          account_name?: string | null
          brokerage_name?: string | null
          connection_status?: string | null
          created_at?: string | null
          id?: string | null
          last_sync_at?: string | null
          portfolio_id?: string | null
          sync_error?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          account_mask?: string | null
          account_name?: string | null
          brokerage_name?: string | null
          connection_status?: string | null
          created_at?: string | null
          id?: string | null
          last_sync_at?: string | null
          portfolio_id?: string | null
          sync_error?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brokerage_connections_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "saved_portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      current_user_context: {
        Row: {
          app_role: string | null
          current_organization_id: string | null
          full_name: string | null
          onboarding_completed: boolean | null
          organization_name: string | null
          organization_role: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_current_organization_id_fkey"
            columns: ["current_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_current_organization_id_fkey"
            columns: ["current_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations_public: {
        Row: {
          allow_join_requests: boolean | null
          created_at: string | null
          id: string | null
          is_public: boolean | null
          logo_url: string | null
          name: string | null
          slug: string | null
          type: string | null
          website: string | null
        }
        Insert: {
          allow_join_requests?: boolean | null
          created_at?: string | null
          id?: string | null
          is_public?: boolean | null
          logo_url?: string | null
          name?: string | null
          slug?: string | null
          type?: string | null
          website?: string | null
        }
        Update: {
          allow_join_requests?: boolean | null
          created_at?: string | null
          id?: string | null
          is_public?: boolean | null
          logo_url?: string | null
          name?: string | null
          slug?: string | null
          type?: string | null
          website?: string | null
        }
        Relationships: []
      }
      profiles_secure: {
        Row: {
          avatar_url: string | null
          company: string | null
          created_at: string | null
          current_organization_id: string | null
          full_name: string | null
          id: string | null
          job_title: string | null
          linkedin_url: string | null
          onboarding_completed: boolean | null
          onboarding_step: string | null
          phone: string | null
          preferences: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string | null
          current_organization_id?: string | null
          full_name?: string | null
          id?: string | null
          job_title?: string | null
          linkedin_url?: string | null
          onboarding_completed?: boolean | null
          onboarding_step?: string | null
          phone?: never
          preferences?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string | null
          current_organization_id?: string | null
          full_name?: string | null
          id?: string | null
          job_title?: string | null
          linkedin_url?: string | null
          onboarding_completed?: boolean | null
          onboarding_step?: string | null
          phone?: never
          preferences?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_current_organization_id_fkey"
            columns: ["current_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_current_organization_id_fkey"
            columns: ["current_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      analyze_study_confluence: {
        Args: {
          lookforward_days_filter?: number
          min_probability?: number
          only_active_signals?: boolean
        }
        Returns: {
          avg_probability: number
          name: string
          sector: string
          studies: Json
          study_count: number
          ticker: string
          total_expected_return: number
        }[]
      }
      can_view_profile: { Args: { profile_user_id: string }; Returns: boolean }
      find_similar_insights: {
        Args: { p_embedding: string; p_limit?: number; p_threshold?: number }
        Returns: {
          asset_focus: string
          insight_id: string
          news_event_id: string
          similarity: number
          thesis: string
        }[]
      }
      generate_invite_code: { Args: never; Returns: string }
      generate_slug: { Args: { name: string }; Returns: string }
      get_current_organization_id: { Args: never; Returns: string }
      get_data_freshness: {
        Args: never
        Returns: {
          days_stale: number
          last_bar_date: string
          needs_refresh: boolean
          ticker: string
        }[]
      }
      get_distinct_bar_tickers: {
        Args: { limit_count?: number }
        Returns: {
          bar_count: number
          ticker: string
        }[]
      }
      get_portfolio_news: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          impact_score: number
          matching_tickers: string[]
          news_id: string
          published_at: string
          sentiment: Database["public"]["Enums"]["news_sentiment"]
          summary: string
          thesis: string
          title: string
          url: string
        }[]
      }
      get_portfolio_returns: {
        Args: {
          p_end_date?: string
          p_start_date?: string
          p_tickers: string[]
          p_weights: number[]
        }
        Returns: {
          bar_date: string
          portfolio_return: number
        }[]
      }
      get_room_type: {
        Args: { check_room_id: string }
        Returns: Database["public"]["Enums"]["room_type"]
      }
      get_ticker_returns: {
        Args: { p_end_date?: string; p_start_date?: string; p_ticker: string }
        Returns: {
          bar_date: string
          daily_return: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_usage: {
        Args: { p_field: string; p_user_id: string }
        Returns: number
      }
      is_admin: { Args: never; Returns: boolean }
      is_org_admin: { Args: { org_id: string }; Returns: boolean }
      is_org_member: { Args: { org_id: string }; Returns: boolean }
      is_room_member: {
        Args: { check_room_id: string; check_user_id: string }
        Returns: boolean
      }
      reset_daily_usage: { Args: never; Returns: undefined }
      screen_study_probabilities: {
        Args: {
          lookforward_days_filter?: number
          market_cap_tiers?: string[]
          max_expected_return?: number
          max_probability?: number
          min_expected_return?: number
          min_probability?: number
          min_sample_size?: number
          only_active_signals?: boolean
          result_limit?: number
          result_offset?: number
          sectors?: string[]
          sort_by?: string
          sort_order?: string
          study_categories?: string[]
          study_ids?: string[]
        }
        Returns: {
          avg_gain: number
          avg_loss: number
          calculated_at: string
          confidence_level: string
          expected_return: number
          id: string
          last_signal_date: string
          lookforward_days: number
          market_cap_tier: string
          name: string
          probability_score: number
          sample_size: number
          sector: string
          signal_active: boolean
          study_category: string
          study_id: string
          study_name: string
          ticker: string
          win_rate: number
        }[]
      }
      screen_universe: {
        Args: {
          event_types?: string[]
          market_cap_tiers?: string[]
          max_days_until_event?: number
          max_expected_return?: number
          max_probability?: number
          min_expected_return?: number
          min_probability?: number
          min_sample_size?: number
          result_limit?: number
          result_offset?: number
          sectors?: string[]
          sort_by?: string
          sort_order?: string
        }
        Returns: {
          confidence_level: string
          days_until_event: number
          event_type: string
          expected_return: number
          market_cap_tier: string
          name: string
          next_event_date: string
          probability_score: number
          sample_size: number
          sector: string
          symbol: string
          win_rate: number
        }[]
      }
      search_markets_semantic: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          category: string
          id: string
          platform: string
          similarity: number
          title: string
          total_volume: number
        }[]
      }
      search_signals_semantic: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          published_at: string
          similarity: number
          source_type: string
          source_url: string
        }[]
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
      news_sentiment: "bullish" | "bearish" | "neutral"
      room_type: "public" | "stock" | "private"
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
      news_sentiment: ["bullish", "bearish", "neutral"],
      room_type: ["public", "stock", "private"],
    },
  },
} as const
