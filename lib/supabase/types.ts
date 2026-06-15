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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_email_campaigns: {
        Row: {
          created_at: string
          error_count: number
          errors: Json | null
          id: string
          recipient_count: number
          send_to_filter: string | null
          sent_by: string | null
          subject: string
          success_count: number
        }
        Insert: {
          created_at?: string
          error_count?: number
          errors?: Json | null
          id?: string
          recipient_count?: number
          send_to_filter?: string | null
          sent_by?: string | null
          subject: string
          success_count?: number
        }
        Update: {
          created_at?: string
          error_count?: number
          errors?: Json | null
          id?: string
          recipient_count?: number
          send_to_filter?: string | null
          sent_by?: string | null
          subject?: string
          success_count?: number
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author: string
          author_image: string | null
          category: string[]
          content: string
          created_at: string
          description: string
          featured: boolean
          id: string
          image: string | null
          publish_date: string | null
          read_time: string | null
          slug: string
          status: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          author: string
          author_image?: string | null
          category?: string[]
          content: string
          created_at?: string
          description: string
          featured?: boolean
          id?: string
          image?: string | null
          publish_date?: string | null
          read_time?: string | null
          slug: string
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          author?: string
          author_image?: string | null
          category?: string[]
          content?: string
          created_at?: string
          description?: string
          featured?: boolean
          id?: string
          image?: string | null
          publish_date?: string | null
          read_time?: string | null
          slug?: string
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      boosts: {
        Row: {
          amount: number
          boost_end_time: string | null
          boost_start_time: string | null
          boost_type: string
          created_at: string
          currency: string
          id: string
          is_active: boolean
          listing_id: string
          listing_type: string
          payment_status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          boost_end_time?: string | null
          boost_start_time?: string | null
          boost_type: string
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          listing_id: string
          listing_type: string
          payment_status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          boost_end_time?: string | null
          boost_start_time?: string | null
          boost_type?: string
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          listing_id?: string
          listing_type?: string
          payment_status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      boosts_log: {
        Row: {
          boost_level: string
          created_at: string
          expired_at: string
          id: string
          listing_id: string
          listing_type: string
        }
        Insert: {
          boost_level: string
          created_at?: string
          expired_at?: string
          id?: string
          listing_id: string
          listing_type: string
        }
        Update: {
          boost_level?: string
          created_at?: string
          expired_at?: string
          id?: string
          listing_id?: string
          listing_type?: string
        }
        Relationships: []
      }
      breed_alerts_log: {
        Row: {
          breed: string
          created_at: string
          email_sent_at: string
          id: string
          listing_id: string
          listing_type: string
          user_id: string
        }
        Insert: {
          breed: string
          created_at?: string
          email_sent_at?: string
          id?: string
          listing_id: string
          listing_type: string
          user_id: string
        }
        Update: {
          breed?: string
          created_at?: string
          email_sent_at?: string
          id?: string
          listing_id?: string
          listing_type?: string
          user_id?: string
        }
        Relationships: []
      }
      business_listing_drafts: {
        Row: {
          created_at: string
          draft_name: string
          email: string | null
          form_data: Json
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          draft_name?: string
          email?: string | null
          form_data?: Json
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          draft_name?: string
          email?: string | null
          form_data?: Json
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      business_listings: {
        Row: {
          about_us: string | null
          address: string
          admin_approved: boolean
          admin_notes: string | null
          banner_image: string | null
          coordinates: Json | null
          county: string
          created_at: string
          description: string
          eircode: string | null
          email: string | null
          gallery_images: Json | null
          id: string
          is_vet_partner: boolean
          logo_image: string | null
          name: string
          opening_hours: Json | null
          partner: boolean
          phone: string
          profile_image_url: string | null
          rating: number | null
          refund_policy: string | null
          reviews: number | null
          reviews_list: Json | null
          slug: string
          social: Json | null
          status: string
          subscription_tier: string | null
          type: string
          updated_at: string
          user_id: string
          vet_partner_tier: string | null
          views: number | null
          website: string | null
        }
        Insert: {
          about_us?: string | null
          address: string
          admin_approved?: boolean
          admin_notes?: string | null
          banner_image?: string | null
          coordinates?: Json | null
          county: string
          created_at?: string
          description: string
          eircode?: string | null
          email?: string | null
          gallery_images?: Json | null
          id?: string
          is_vet_partner?: boolean
          logo_image?: string | null
          name: string
          opening_hours?: Json | null
          partner?: boolean
          phone: string
          profile_image_url?: string | null
          rating?: number | null
          refund_policy?: string | null
          reviews?: number | null
          reviews_list?: Json | null
          slug: string
          social?: Json | null
          status?: string
          subscription_tier?: string | null
          type: string
          updated_at?: string
          user_id: string
          vet_partner_tier?: string | null
          views?: number | null
          website?: string | null
        }
        Update: {
          about_us?: string | null
          address?: string
          admin_approved?: boolean
          admin_notes?: string | null
          banner_image?: string | null
          coordinates?: Json | null
          county?: string
          created_at?: string
          description?: string
          eircode?: string | null
          email?: string | null
          gallery_images?: Json | null
          id?: string
          is_vet_partner?: boolean
          logo_image?: string | null
          name?: string
          opening_hours?: Json | null
          partner?: boolean
          phone?: string
          profile_image_url?: string | null
          rating?: number | null
          refund_policy?: string | null
          reviews?: number | null
          reviews_list?: Json | null
          slug?: string
          social?: Json | null
          status?: string
          subscription_tier?: string | null
          type?: string
          updated_at?: string
          user_id?: string
          vet_partner_tier?: string | null
          views?: number | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_listings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_listings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_reviews: {
        Row: {
          business_id: string
          business_name: string | null
          business_type: string | null
          comment: string | null
          created_at: string
          id: string
          rating: number
          reviewer_email: string | null
          reviewer_name: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          business_id: string
          business_name?: string | null
          business_type?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          reviewer_email?: string | null
          reviewer_name: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          business_id?: string
          business_name?: string | null
          business_type?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          reviewer_email?: string | null
          reviewer_name?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          buyer_deleted: boolean
          buyer_id: string
          buyer_last_read_at: string | null
          created_at: string
          gdpr_consent_buyer: boolean
          gdpr_consent_seller: boolean
          id: string
          last_message_at: string | null
          listing_id: string
          listing_type: string
          retention_date: string | null
          seller_deleted: boolean
          seller_id: string
          seller_last_read_at: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          buyer_deleted?: boolean
          buyer_id: string
          buyer_last_read_at?: string | null
          created_at?: string
          gdpr_consent_buyer?: boolean
          gdpr_consent_seller?: boolean
          id?: string
          last_message_at?: string | null
          listing_id: string
          listing_type: string
          retention_date?: string | null
          seller_deleted?: boolean
          seller_id: string
          seller_last_read_at?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          buyer_deleted?: boolean
          buyer_id?: string
          buyer_last_read_at?: string | null
          created_at?: string
          gdpr_consent_buyer?: boolean
          gdpr_consent_seller?: boolean
          id?: string
          last_message_at?: string | null
          listing_id?: string
          listing_type?: string
          retention_date?: string | null
          seller_deleted?: boolean
          seller_id?: string
          seller_last_read_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          created_at: string | null
          description: string | null
          feature_name: string
          id: string
          is_enabled: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          feature_name: string
          id?: string
          is_enabled?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          feature_name?: string
          id?: string
          is_enabled?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      fraud_logs: {
        Row: {
          created_at: string
          details: Json | null
          id: string
          ip_address: unknown
          reason: string
          reservation_id: string | null
          reviewed_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          id?: string
          ip_address: unknown
          reason: string
          reservation_id?: string | null
          reviewed_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          reason?: string
          reservation_id?: string | null
          reviewed_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fraud_logs_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_audit_log: {
        Row: {
          admin_id: string
          changed_at: string
          created_at: string
          field_changed: string
          id: string
          listing_id: string
          listing_type: string
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          admin_id: string
          changed_at?: string
          created_at?: string
          field_changed: string
          id?: string
          listing_id: string
          listing_type?: string
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          admin_id?: string
          changed_at?: string
          created_at?: string
          field_changed?: string
          id?: string
          listing_id?: string
          listing_type?: string
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: []
      }
      listing_audit_log_seller: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: unknown
          listing_id: string
          listing_type: string
          new_value: string | null
          old_value: string | null
          seller_id: string
          user_agent: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: unknown
          listing_id: string
          listing_type?: string
          new_value?: string | null
          old_value?: string | null
          seller_id: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          listing_id?: string
          listing_type?: string
          new_value?: string | null
          old_value?: string | null
          seller_id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      listing_payments: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          expires_at: string | null
          id: string
          listing_duration_months: number | null
          listing_id: string
          listing_type: string
          payment_status: string | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string
          expires_at?: string | null
          id?: string
          listing_duration_months?: number | null
          listing_id: string
          listing_type: string
          payment_status?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          expires_at?: string | null
          id?: string
          listing_duration_months?: number | null
          listing_id?: string
          listing_type?: string
          payment_status?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachments: Json | null
          content: string
          conversation_id: string
          created_at: string
          fraud_flag: boolean
          fraud_keywords: string[] | null
          gdpr_processing_basis: string
          id: string
          is_deleted_by_recipient: boolean
          is_deleted_by_sender: boolean
          is_read: boolean
          message_type: string
          moderation_notes: string | null
          moderation_status: string
          offer_amount: number | null
          offer_currency: string | null
          recipient_id: string
          sender_id: string
          updated_at: string
        }
        Insert: {
          attachments?: Json | null
          content: string
          conversation_id: string
          created_at?: string
          fraud_flag?: boolean
          fraud_keywords?: string[] | null
          gdpr_processing_basis?: string
          id?: string
          is_deleted_by_recipient?: boolean
          is_deleted_by_sender?: boolean
          is_read?: boolean
          message_type?: string
          moderation_notes?: string | null
          moderation_status?: string
          offer_amount?: number | null
          offer_currency?: string | null
          recipient_id: string
          sender_id: string
          updated_at?: string
        }
        Update: {
          attachments?: Json | null
          content?: string
          conversation_id?: string
          created_at?: string
          fraud_flag?: boolean
          fraud_keywords?: string[] | null
          gdpr_processing_basis?: string
          id?: string
          is_deleted_by_recipient?: boolean
          is_deleted_by_sender?: boolean
          is_read?: boolean
          message_type?: string
          moderation_notes?: string | null
          moderation_status?: string
          offer_amount?: number | null
          offer_currency?: string | null
          recipient_id?: string
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          created_at: string | null
          email_enabled: boolean | null
          id: string
          notification_type: string
          sms_enabled: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          notification_type: string
          sms_enabled?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          notification_type?: string
          sms_enabled?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          listing_id: string | null
          listing_type: string | null
          message: string
          read: boolean
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id?: string | null
          listing_type?: string | null
          message: string
          read?: boolean
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string | null
          listing_type?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      page_content: {
        Row: {
          content: Json
          created_at: string
          id: string
          last_edited_at: string | null
          last_edited_by: string | null
          meta_description: string | null
          page_id: string
          page_path: string
          page_title: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          last_edited_at?: string | null
          last_edited_by?: string | null
          meta_description?: string | null
          page_id: string
          page_path: string
          page_title: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          last_edited_at?: string | null
          last_edited_by?: string | null
          meta_description?: string | null
          page_id?: string
          page_path?: string
          page_title?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_settings: {
        Row: {
          created_at: string | null
          id: string
          is_encrypted: boolean | null
          setting_name: string
          setting_value: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_encrypted?: boolean | null
          setting_name: string
          setting_value: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_encrypted?: boolean | null
          setting_name?: string
          setting_value?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      phone_verification_codes: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          phone_number: string
          updated_at: string | null
          verification_code: string
          verified: boolean | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          phone_number: string
          updated_at?: string | null
          verification_code: string
          verified?: boolean | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          phone_number?: string
          updated_at?: string | null
          verification_code?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      products: {
        Row: {
          badge: string | null
          created_at: string
          description: string
          free_shipping: boolean | null
          id: string
          image_url: string | null
          images: string[] | null
          in_stock: boolean
          name: string
          price: number
          slug: string
          stock_quantity: number
          updated_at: string
          valued_at: number | null
          variants: Json | null
        }
        Insert: {
          badge?: string | null
          created_at?: string
          description: string
          free_shipping?: boolean | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          in_stock?: boolean
          name: string
          price: number
          slug: string
          stock_quantity?: number
          updated_at?: string
          valued_at?: number | null
          variants?: Json | null
        }
        Update: {
          badge?: string | null
          created_at?: string
          description?: string
          free_shipping?: boolean | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          in_stock?: boolean
          name?: string
          price?: number
          slug?: string
          stock_quantity?: number
          updated_at?: string
          valued_at?: number | null
          variants?: Json | null
        }
        Relationships: []
      }
      quiz_breeds: {
        Row: {
          beginner_friendly: string | null
          breed: string
          breed_type: string | null
          description: string | null
          energy: string | null
          grooming: string | null
          id: string
          image_url: string | null
          life_expectancy: string | null
          size: string | null
          special_considerations: Json | null
          temperament: Json | null
        }
        Insert: {
          beginner_friendly?: string | null
          breed: string
          breed_type?: string | null
          description?: string | null
          energy?: string | null
          grooming?: string | null
          id?: string
          image_url?: string | null
          life_expectancy?: string | null
          size?: string | null
          special_considerations?: Json | null
          temperament?: Json | null
        }
        Update: {
          beginner_friendly?: string | null
          breed?: string
          breed_type?: string | null
          description?: string | null
          energy?: string | null
          grooming?: string | null
          id?: string
          image_url?: string | null
          life_expectancy?: string | null
          size?: string | null
          special_considerations?: Json | null
          temperament?: Json | null
        }
        Relationships: []
      }
      quiz_results: {
        Row: {
          breed_matches: Json
          created_at: string
          id: string
          quiz_answers: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          breed_matches: Json
          created_at?: string
          id?: string
          quiz_answers: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          breed_matches?: Json
          created_at?: string
          id?: string
          quiz_answers?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reservation_disputes: {
        Row: {
          admin_notes: string | null
          created_at: string
          description: string
          evidence_files: Json | null
          id: string
          reason: string
          reservation_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          description: string
          evidence_files?: Json | null
          id?: string
          reason: string
          reservation_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          description?: string
          evidence_files?: Json | null
          id?: string
          reason?: string
          reservation_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_disputes_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_refunds: {
        Row: {
          admin_notes: string | null
          created_at: string
          dispute_id: string | null
          id: string
          processed_by: string | null
          reason: string
          refund_amount: number
          reservation_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          dispute_id?: string | null
          id?: string
          processed_by?: string | null
          reason: string
          refund_amount: number
          reservation_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          dispute_id?: string | null
          id?: string
          processed_by?: string | null
          reason?: string
          refund_amount?: number
          reservation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_refunds_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "reservation_disputes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_refunds_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          admin_confirmed: boolean | null
          amount: number
          confirmation_deadline: string
          conversation_id: string | null
          created_at: string
          dispute_date: string | null
          dispute_raised: boolean | null
          fee_amount: number
          id: string
          ip_address: unknown
          listing_id: string
          message: string | null
          payment_method: string | null
          platform_fee_amount: number | null
          puppy_collar_color: string | null
          refund_amount: number | null
          refund_date: string | null
          refund_reason: string | null
          reservation_date: string
          seller_payout_amount: number | null
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          updated_at: string
          user_confirmed: boolean | null
          user_id: string | null
        }
        Insert: {
          admin_confirmed?: boolean | null
          amount: number
          confirmation_deadline?: string
          conversation_id?: string | null
          created_at?: string
          dispute_date?: string | null
          dispute_raised?: boolean | null
          fee_amount: number
          id?: string
          ip_address?: unknown
          listing_id: string
          message?: string | null
          payment_method?: string | null
          platform_fee_amount?: number | null
          puppy_collar_color?: string | null
          refund_amount?: number | null
          refund_date?: string | null
          refund_reason?: string | null
          reservation_date?: string
          seller_payout_amount?: number | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_confirmed?: boolean | null
          user_id?: string | null
        }
        Update: {
          admin_confirmed?: boolean | null
          amount?: number
          confirmation_deadline?: string
          conversation_id?: string | null
          created_at?: string
          dispute_date?: string | null
          dispute_raised?: boolean | null
          fee_amount?: number
          id?: string
          ip_address?: unknown
          listing_id?: string
          message?: string | null
          payment_method?: string | null
          platform_fee_amount?: number | null
          puppy_collar_color?: string | null
          refund_amount?: number | null
          refund_date?: string | null
          refund_reason?: string | null
          reservation_date?: string
          seller_payout_amount?: number | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_confirmed?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "sale_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_listing_drafts: {
        Row: {
          created_at: string
          draft_name: string
          form_data: Json
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          draft_name?: string
          form_data?: Json
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          draft_name?: string
          form_data?: Json
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sale_listing_edits: {
        Row: {
          admin_notes: string | null
          breed: string
          breed_1: string | null
          breed_2: string | null
          breed_type: string
          created_at: string
          date_of_birth: string
          description: string
          father_breed: string | null
          father_dob: string | null
          father_image: string | null
          father_name: string | null
          female_count: number
          gold_star: boolean
          green_tick: boolean
          h1_checked: boolean | null
          h1_document: string | null
          id: string
          identifiers: string | null
          images: Json | null
          listing_id: string
          location: string
          male_count: number
          maternal_grandfather_breed: string | null
          maternal_grandfather_dob: string | null
          maternal_grandfather_image: string | null
          maternal_grandfather_name: string | null
          maternal_grandmother_breed: string | null
          maternal_grandmother_dob: string | null
          maternal_grandmother_image: string | null
          maternal_grandmother_name: string | null
          max_price: number | null
          microchip_database: string | null
          min_price: number | null
          mother_breed: string | null
          mother_dob: string | null
          mother_image: string | null
          mother_name: string | null
          paternal_grandfather_breed: string | null
          paternal_grandfather_dob: string | null
          paternal_grandfather_image: string | null
          paternal_grandfather_name: string | null
          paternal_grandmother_breed: string | null
          paternal_grandmother_dob: string | null
          paternal_grandmother_image: string | null
          paternal_grandmother_name: string | null
          price: number | null
          primary_image_index: number | null
          puppy_details: Json | null
          rejection_message: string | null
          same_pricing: string
          selected_colors: Json | null
          seller_id: string
          status: string | null
          title: string
          uniform_price: number | null
          updated_at: string
          use_collar_codes: boolean | null
          v1_checked: boolean | null
          v1_document: string | null
          v2_checked: boolean | null
          v2_document: string | null
          vet_location: string
          vet_name: string
          video_url: string | null
        }
        Insert: {
          admin_notes?: string | null
          breed: string
          breed_1?: string | null
          breed_2?: string | null
          breed_type: string
          created_at?: string
          date_of_birth: string
          description: string
          father_breed?: string | null
          father_dob?: string | null
          father_image?: string | null
          father_name?: string | null
          female_count?: number
          gold_star?: boolean
          green_tick?: boolean
          h1_checked?: boolean | null
          h1_document?: string | null
          id?: string
          identifiers?: string | null
          images?: Json | null
          listing_id: string
          location: string
          male_count?: number
          maternal_grandfather_breed?: string | null
          maternal_grandfather_dob?: string | null
          maternal_grandfather_image?: string | null
          maternal_grandfather_name?: string | null
          maternal_grandmother_breed?: string | null
          maternal_grandmother_dob?: string | null
          maternal_grandmother_image?: string | null
          maternal_grandmother_name?: string | null
          max_price?: number | null
          microchip_database?: string | null
          min_price?: number | null
          mother_breed?: string | null
          mother_dob?: string | null
          mother_image?: string | null
          mother_name?: string | null
          paternal_grandfather_breed?: string | null
          paternal_grandfather_dob?: string | null
          paternal_grandfather_image?: string | null
          paternal_grandfather_name?: string | null
          paternal_grandmother_breed?: string | null
          paternal_grandmother_dob?: string | null
          paternal_grandmother_image?: string | null
          paternal_grandmother_name?: string | null
          price?: number | null
          primary_image_index?: number | null
          puppy_details?: Json | null
          rejection_message?: string | null
          same_pricing: string
          selected_colors?: Json | null
          seller_id: string
          status?: string | null
          title: string
          uniform_price?: number | null
          updated_at?: string
          use_collar_codes?: boolean | null
          v1_checked?: boolean | null
          v1_document?: string | null
          v2_checked?: boolean | null
          v2_document?: string | null
          vet_location: string
          vet_name: string
          video_url?: string | null
        }
        Update: {
          admin_notes?: string | null
          breed?: string
          breed_1?: string | null
          breed_2?: string | null
          breed_type?: string
          created_at?: string
          date_of_birth?: string
          description?: string
          father_breed?: string | null
          father_dob?: string | null
          father_image?: string | null
          father_name?: string | null
          female_count?: number
          gold_star?: boolean
          green_tick?: boolean
          h1_checked?: boolean | null
          h1_document?: string | null
          id?: string
          identifiers?: string | null
          images?: Json | null
          listing_id?: string
          location?: string
          male_count?: number
          maternal_grandfather_breed?: string | null
          maternal_grandfather_dob?: string | null
          maternal_grandfather_image?: string | null
          maternal_grandfather_name?: string | null
          maternal_grandmother_breed?: string | null
          maternal_grandmother_dob?: string | null
          maternal_grandmother_image?: string | null
          maternal_grandmother_name?: string | null
          max_price?: number | null
          microchip_database?: string | null
          min_price?: number | null
          mother_breed?: string | null
          mother_dob?: string | null
          mother_image?: string | null
          mother_name?: string | null
          paternal_grandfather_breed?: string | null
          paternal_grandfather_dob?: string | null
          paternal_grandfather_image?: string | null
          paternal_grandfather_name?: string | null
          paternal_grandmother_breed?: string | null
          paternal_grandmother_dob?: string | null
          paternal_grandmother_image?: string | null
          paternal_grandmother_name?: string | null
          price?: number | null
          primary_image_index?: number | null
          puppy_details?: Json | null
          rejection_message?: string | null
          same_pricing?: string
          selected_colors?: Json | null
          seller_id?: string
          status?: string | null
          title?: string
          uniform_price?: number | null
          updated_at?: string
          use_collar_codes?: boolean | null
          v1_checked?: boolean | null
          v1_document?: string | null
          v2_checked?: boolean | null
          v2_document?: string | null
          vet_location?: string
          vet_name?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_listing_edits_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "sale_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_listings: {
        Row: {
          admin_approved: boolean | null
          admin_notes: string | null
          breed: string
          breed_1: string | null
          breed_2: string | null
          breed_type: string
          can_renew: boolean | null
          converted_from_showcase_id: string | null
          created_at: string
          current_boost_id: string | null
          date_of_birth: string
          deleted_at: string | null
          description: string
          documents: Json | null
          expires_at: string | null
          father_breed: string | null
          father_dob: string | null
          father_image: string | null
          father_name: string | null
          female_count: number
          gold_star: boolean
          green_tick: boolean
          id: string
          identifiers: string | null
          images: string[] | null
          is_deleted: boolean
          is_paid: boolean | null
          is_paused: boolean
          is_published: boolean | null
          location: string
          male_count: number
          maternal_grandfather_breed: string | null
          maternal_grandfather_dob: string | null
          maternal_grandfather_image: string | null
          maternal_grandfather_name: string | null
          maternal_grandmother_breed: string | null
          maternal_grandmother_dob: string | null
          maternal_grandmother_image: string | null
          maternal_grandmother_name: string | null
          max_price: number | null
          microchip_database: string | null
          min_price: number | null
          mother_breed: string | null
          mother_dob: string | null
          mother_image: string | null
          mother_name: string | null
          paternal_grandfather_breed: string | null
          paternal_grandfather_dob: string | null
          paternal_grandfather_image: string | null
          paternal_grandfather_name: string | null
          paternal_grandmother_breed: string | null
          paternal_grandmother_dob: string | null
          paternal_grandmother_image: string | null
          paternal_grandmother_name: string | null
          paused_at: string | null
          payment_amount: number | null
          payment_currency: string | null
          payment_status: string | null
          pending_edit_id: string | null
          price: number | null
          primary_image_index: number | null
          puppy_details: Json | null
          rejection_message: string | null
          same_pricing: string
          selected_colors: Json | null
          seller_id: string
          status: string | null
          stripe_session_id: string | null
          title: string
          uniform_price: number | null
          updated_at: string
          use_collar_codes: boolean | null
          verification_date: string | null
          vet_location: string
          vet_name: string
          video_url: string | null
        }
        Insert: {
          admin_approved?: boolean | null
          admin_notes?: string | null
          breed: string
          breed_1?: string | null
          breed_2?: string | null
          breed_type: string
          can_renew?: boolean | null
          converted_from_showcase_id?: string | null
          created_at?: string
          current_boost_id?: string | null
          date_of_birth: string
          deleted_at?: string | null
          description: string
          documents?: Json | null
          expires_at?: string | null
          father_breed?: string | null
          father_dob?: string | null
          father_image?: string | null
          father_name?: string | null
          female_count?: number
          gold_star?: boolean
          green_tick?: boolean
          id?: string
          identifiers?: string | null
          images?: string[] | null
          is_deleted?: boolean
          is_paid?: boolean | null
          is_paused?: boolean
          is_published?: boolean | null
          location: string
          male_count?: number
          maternal_grandfather_breed?: string | null
          maternal_grandfather_dob?: string | null
          maternal_grandfather_image?: string | null
          maternal_grandfather_name?: string | null
          maternal_grandmother_breed?: string | null
          maternal_grandmother_dob?: string | null
          maternal_grandmother_image?: string | null
          maternal_grandmother_name?: string | null
          max_price?: number | null
          microchip_database?: string | null
          min_price?: number | null
          mother_breed?: string | null
          mother_dob?: string | null
          mother_image?: string | null
          mother_name?: string | null
          paternal_grandfather_breed?: string | null
          paternal_grandfather_dob?: string | null
          paternal_grandfather_image?: string | null
          paternal_grandfather_name?: string | null
          paternal_grandmother_breed?: string | null
          paternal_grandmother_dob?: string | null
          paternal_grandmother_image?: string | null
          paternal_grandmother_name?: string | null
          paused_at?: string | null
          payment_amount?: number | null
          payment_currency?: string | null
          payment_status?: string | null
          pending_edit_id?: string | null
          price?: number | null
          primary_image_index?: number | null
          puppy_details?: Json | null
          rejection_message?: string | null
          same_pricing: string
          selected_colors?: Json | null
          seller_id: string
          status?: string | null
          stripe_session_id?: string | null
          title: string
          uniform_price?: number | null
          updated_at?: string
          use_collar_codes?: boolean | null
          verification_date?: string | null
          vet_location: string
          vet_name: string
          video_url?: string | null
        }
        Update: {
          admin_approved?: boolean | null
          admin_notes?: string | null
          breed?: string
          breed_1?: string | null
          breed_2?: string | null
          breed_type?: string
          can_renew?: boolean | null
          converted_from_showcase_id?: string | null
          created_at?: string
          current_boost_id?: string | null
          date_of_birth?: string
          deleted_at?: string | null
          description?: string
          documents?: Json | null
          expires_at?: string | null
          father_breed?: string | null
          father_dob?: string | null
          father_image?: string | null
          father_name?: string | null
          female_count?: number
          gold_star?: boolean
          green_tick?: boolean
          id?: string
          identifiers?: string | null
          images?: string[] | null
          is_deleted?: boolean
          is_paid?: boolean | null
          is_paused?: boolean
          is_published?: boolean | null
          location?: string
          male_count?: number
          maternal_grandfather_breed?: string | null
          maternal_grandfather_dob?: string | null
          maternal_grandfather_image?: string | null
          maternal_grandfather_name?: string | null
          maternal_grandmother_breed?: string | null
          maternal_grandmother_dob?: string | null
          maternal_grandmother_image?: string | null
          maternal_grandmother_name?: string | null
          max_price?: number | null
          microchip_database?: string | null
          min_price?: number | null
          mother_breed?: string | null
          mother_dob?: string | null
          mother_image?: string | null
          mother_name?: string | null
          paternal_grandfather_breed?: string | null
          paternal_grandfather_dob?: string | null
          paternal_grandfather_image?: string | null
          paternal_grandfather_name?: string | null
          paternal_grandmother_breed?: string | null
          paternal_grandmother_dob?: string | null
          paternal_grandmother_image?: string | null
          paternal_grandmother_name?: string | null
          paused_at?: string | null
          payment_amount?: number | null
          payment_currency?: string | null
          payment_status?: string | null
          pending_edit_id?: string | null
          price?: number | null
          primary_image_index?: number | null
          puppy_details?: Json | null
          rejection_message?: string | null
          same_pricing?: string
          selected_colors?: Json | null
          seller_id?: string
          status?: string | null
          stripe_session_id?: string | null
          title?: string
          uniform_price?: number | null
          updated_at?: string
          use_collar_codes?: boolean | null
          verification_date?: string | null
          vet_location?: string
          vet_name?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_listings_converted_from_showcase_id_fkey"
            columns: ["converted_from_showcase_id"]
            isOneToOne: false
            referencedRelation: "showcase_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_listings_current_boost_id_fkey"
            columns: ["current_boost_id"]
            isOneToOne: false
            referencedRelation: "boosts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_listings_pending_edit_id_fkey"
            columns: ["pending_edit_id"]
            isOneToOne: false
            referencedRelation: "sale_listing_edits"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_orders: {
        Row: {
          admin_notes: string | null
          created_at: string
          currency: string
          fulfillment_status: string
          guest_email: string
          id: string
          order_items: Json
          payment_status: string
          shipping_info: Json
          stripe_session_id: string | null
          total_price: number
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          currency?: string
          fulfillment_status?: string
          guest_email: string
          id?: string
          order_items: Json
          payment_status?: string
          shipping_info: Json
          stripe_session_id?: string | null
          total_price: number
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          currency?: string
          fulfillment_status?: string
          guest_email?: string
          id?: string
          order_items?: Json
          payment_status?: string
          shipping_info?: Json
          stripe_session_id?: string | null
          total_price?: number
          user_id?: string | null
        }
        Relationships: []
      }
      showcase_conversion_log: {
        Row: {
          conversion_date: string
          converted_by: string
          created_at: string
          id: string
          notification_count: number | null
          sale_listing_id: string
          showcase_id: string
        }
        Insert: {
          conversion_date?: string
          converted_by: string
          created_at?: string
          id?: string
          notification_count?: number | null
          sale_listing_id: string
          showcase_id: string
        }
        Update: {
          conversion_date?: string
          converted_by?: string
          created_at?: string
          id?: string
          notification_count?: number | null
          sale_listing_id?: string
          showcase_id?: string
        }
        Relationships: []
      }
      showcase_listing_drafts: {
        Row: {
          created_at: string
          draft_name: string
          draft_type: string | null
          form_data: Json
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          draft_name?: string
          draft_type?: string | null
          form_data?: Json
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          draft_name?: string
          draft_type?: string | null
          form_data?: Json
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      showcase_listing_edits: {
        Row: {
          admin_notes: string | null
          breed: string
          breed_type: string | null
          breed1: string | null
          breed2: string | null
          created_at: string
          date_of_birth: string
          description: string
          energy: string | null
          family_tree: Json | null
          father_breed: string | null
          father_dob: string | null
          father_image: string | null
          father_name: string | null
          female_count: number | null
          id: string
          images: Json
          listing_id: string
          location: string
          male_count: number | null
          maternal_grandfather_breed: string | null
          maternal_grandfather_dob: string | null
          maternal_grandfather_image: string | null
          maternal_grandfather_name: string | null
          maternal_grandmother_breed: string | null
          maternal_grandmother_dob: string | null
          maternal_grandmother_image: string | null
          maternal_grandmother_name: string | null
          mother_breed: string | null
          mother_dob: string | null
          mother_image: string | null
          mother_name: string | null
          paternal_grandfather_breed: string | null
          paternal_grandfather_dob: string | null
          paternal_grandfather_image: string | null
          paternal_grandfather_name: string | null
          paternal_grandmother_breed: string | null
          paternal_grandmother_dob: string | null
          paternal_grandmother_image: string | null
          paternal_grandmother_name: string | null
          primary_image_index: number
          seller_id: string
          size: string | null
          status: string
          title: string
          updated_at: string
          video_file: string | null
          video_url: string | null
        }
        Insert: {
          admin_notes?: string | null
          breed: string
          breed_type?: string | null
          breed1?: string | null
          breed2?: string | null
          created_at?: string
          date_of_birth: string
          description: string
          energy?: string | null
          family_tree?: Json | null
          father_breed?: string | null
          father_dob?: string | null
          father_image?: string | null
          father_name?: string | null
          female_count?: number | null
          id?: string
          images: Json
          listing_id: string
          location: string
          male_count?: number | null
          maternal_grandfather_breed?: string | null
          maternal_grandfather_dob?: string | null
          maternal_grandfather_image?: string | null
          maternal_grandfather_name?: string | null
          maternal_grandmother_breed?: string | null
          maternal_grandmother_dob?: string | null
          maternal_grandmother_image?: string | null
          maternal_grandmother_name?: string | null
          mother_breed?: string | null
          mother_dob?: string | null
          mother_image?: string | null
          mother_name?: string | null
          paternal_grandfather_breed?: string | null
          paternal_grandfather_dob?: string | null
          paternal_grandfather_image?: string | null
          paternal_grandfather_name?: string | null
          paternal_grandmother_breed?: string | null
          paternal_grandmother_dob?: string | null
          paternal_grandmother_image?: string | null
          paternal_grandmother_name?: string | null
          primary_image_index?: number
          seller_id: string
          size?: string | null
          status?: string
          title: string
          updated_at?: string
          video_file?: string | null
          video_url?: string | null
        }
        Update: {
          admin_notes?: string | null
          breed?: string
          breed_type?: string | null
          breed1?: string | null
          breed2?: string | null
          created_at?: string
          date_of_birth?: string
          description?: string
          energy?: string | null
          family_tree?: Json | null
          father_breed?: string | null
          father_dob?: string | null
          father_image?: string | null
          father_name?: string | null
          female_count?: number | null
          id?: string
          images?: Json
          listing_id?: string
          location?: string
          male_count?: number | null
          maternal_grandfather_breed?: string | null
          maternal_grandfather_dob?: string | null
          maternal_grandfather_image?: string | null
          maternal_grandfather_name?: string | null
          maternal_grandmother_breed?: string | null
          maternal_grandmother_dob?: string | null
          maternal_grandmother_image?: string | null
          maternal_grandmother_name?: string | null
          mother_breed?: string | null
          mother_dob?: string | null
          mother_image?: string | null
          mother_name?: string | null
          paternal_grandfather_breed?: string | null
          paternal_grandfather_dob?: string | null
          paternal_grandfather_image?: string | null
          paternal_grandfather_name?: string | null
          paternal_grandmother_breed?: string | null
          paternal_grandmother_dob?: string | null
          paternal_grandmother_image?: string | null
          paternal_grandmother_name?: string | null
          primary_image_index?: number
          seller_id?: string
          size?: string | null
          status?: string
          title?: string
          updated_at?: string
          video_file?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "showcase_listing_edits_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "showcase_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      showcase_listings: {
        Row: {
          admin_approved: boolean
          admin_notes: string | null
          breed: string
          breed_type: string | null
          breed1: string | null
          breed2: string | null
          can_renew: boolean | null
          converted_to_sale_id: string | null
          created_at: string
          date_of_birth: string
          deleted_at: string | null
          description: string
          expiration_checked_at: string | null
          expires_at: string | null
          father_breed: string | null
          father_dob: string | null
          father_image: string | null
          father_name: string | null
          female_count: number | null
          id: string
          images: Json
          is_archived: boolean
          is_deleted: boolean
          is_expired: boolean | null
          is_paid: boolean | null
          is_paused: boolean
          is_published: boolean
          location: string
          male_count: number | null
          maternal_grandfather_breed: string | null
          maternal_grandfather_dob: string | null
          maternal_grandfather_image: string | null
          maternal_grandfather_name: string | null
          maternal_grandmother_breed: string | null
          maternal_grandmother_dob: string | null
          maternal_grandmother_image: string | null
          maternal_grandmother_name: string | null
          mother_breed: string | null
          mother_dob: string | null
          mother_image: string | null
          mother_name: string | null
          paternal_grandfather_breed: string | null
          paternal_grandfather_dob: string | null
          paternal_grandfather_image: string | null
          paternal_grandfather_name: string | null
          paternal_grandmother_breed: string | null
          paternal_grandmother_dob: string | null
          paternal_grandmother_image: string | null
          paternal_grandmother_name: string | null
          paused_at: string | null
          payment_amount: number | null
          payment_currency: string | null
          payment_status: string | null
          pending_edit_id: string | null
          primary_image_index: number
          rejection_message: string | null
          seller_id: string
          sex: string | null
          size: string | null
          status: string
          stripe_session_id: string | null
          title: string
          updated_at: string
          video_file: string | null
          video_url: string | null
        }
        Insert: {
          admin_approved?: boolean
          admin_notes?: string | null
          breed: string
          breed_type?: string | null
          breed1?: string | null
          breed2?: string | null
          can_renew?: boolean | null
          converted_to_sale_id?: string | null
          created_at?: string
          date_of_birth: string
          deleted_at?: string | null
          description: string
          expiration_checked_at?: string | null
          expires_at?: string | null
          father_breed?: string | null
          father_dob?: string | null
          father_image?: string | null
          father_name?: string | null
          female_count?: number | null
          id?: string
          images: Json
          is_archived?: boolean
          is_deleted?: boolean
          is_expired?: boolean | null
          is_paid?: boolean | null
          is_paused?: boolean
          is_published?: boolean
          location: string
          male_count?: number | null
          maternal_grandfather_breed?: string | null
          maternal_grandfather_dob?: string | null
          maternal_grandfather_image?: string | null
          maternal_grandfather_name?: string | null
          maternal_grandmother_breed?: string | null
          maternal_grandmother_dob?: string | null
          maternal_grandmother_image?: string | null
          maternal_grandmother_name?: string | null
          mother_breed?: string | null
          mother_dob?: string | null
          mother_image?: string | null
          mother_name?: string | null
          paternal_grandfather_breed?: string | null
          paternal_grandfather_dob?: string | null
          paternal_grandfather_image?: string | null
          paternal_grandfather_name?: string | null
          paternal_grandmother_breed?: string | null
          paternal_grandmother_dob?: string | null
          paternal_grandmother_image?: string | null
          paternal_grandmother_name?: string | null
          paused_at?: string | null
          payment_amount?: number | null
          payment_currency?: string | null
          payment_status?: string | null
          pending_edit_id?: string | null
          primary_image_index?: number
          rejection_message?: string | null
          seller_id: string
          sex?: string | null
          size?: string | null
          status?: string
          stripe_session_id?: string | null
          title: string
          updated_at?: string
          video_file?: string | null
          video_url?: string | null
        }
        Update: {
          admin_approved?: boolean
          admin_notes?: string | null
          breed?: string
          breed_type?: string | null
          breed1?: string | null
          breed2?: string | null
          can_renew?: boolean | null
          converted_to_sale_id?: string | null
          created_at?: string
          date_of_birth?: string
          deleted_at?: string | null
          description?: string
          expiration_checked_at?: string | null
          expires_at?: string | null
          father_breed?: string | null
          father_dob?: string | null
          father_image?: string | null
          father_name?: string | null
          female_count?: number | null
          id?: string
          images?: Json
          is_archived?: boolean
          is_deleted?: boolean
          is_expired?: boolean | null
          is_paid?: boolean | null
          is_paused?: boolean
          is_published?: boolean
          location?: string
          male_count?: number | null
          maternal_grandfather_breed?: string | null
          maternal_grandfather_dob?: string | null
          maternal_grandfather_image?: string | null
          maternal_grandfather_name?: string | null
          maternal_grandmother_breed?: string | null
          maternal_grandmother_dob?: string | null
          maternal_grandmother_image?: string | null
          maternal_grandmother_name?: string | null
          mother_breed?: string | null
          mother_dob?: string | null
          mother_image?: string | null
          mother_name?: string | null
          paternal_grandfather_breed?: string | null
          paternal_grandfather_dob?: string | null
          paternal_grandfather_image?: string | null
          paternal_grandfather_name?: string | null
          paternal_grandmother_breed?: string | null
          paternal_grandmother_dob?: string | null
          paternal_grandmother_image?: string | null
          paternal_grandmother_name?: string | null
          paused_at?: string | null
          payment_amount?: number | null
          payment_currency?: string | null
          payment_status?: string | null
          pending_edit_id?: string | null
          primary_image_index?: number
          rejection_message?: string | null
          seller_id?: string
          sex?: string | null
          size?: string | null
          status?: string
          stripe_session_id?: string | null
          title?: string
          updated_at?: string
          video_file?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "showcase_listings_converted_to_sale_id_fkey"
            columns: ["converted_to_sale_id"]
            isOneToOne: false
            referencedRelation: "sale_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "showcase_listings_pending_edit_id_fkey"
            columns: ["pending_edit_id"]
            isOneToOne: false
            referencedRelation: "showcase_listing_edits"
            referencedColumns: ["id"]
          },
        ]
      }
      showcase_wishlist_notifications: {
        Row: {
          created_at: string
          id: string
          notified_at: string | null
          showcase_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notified_at?: string | null
          showcase_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notified_at?: string | null
          showcase_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      site_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          ip_address: string
          token: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          ip_address: string
          token: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string
          token?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string | null
          id: string
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      stud_listing_drafts: {
        Row: {
          created_at: string
          draft_name: string
          draft_type: string | null
          form_data: Json
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          draft_name?: string
          draft_type?: string | null
          form_data?: Json
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          draft_name?: string
          draft_type?: string | null
          form_data?: Json
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stud_listing_edits: {
        Row: {
          admin_approved: boolean | null
          admin_notes: string | null
          breed: string
          breed_type: string | null
          breed1: string | null
          breed2: string | null
          colour: string | null
          created_at: string
          crossbreed_breeds: string[] | null
          description: string
          dob: string
          family_tree: Json | null
          father_breed: string | null
          father_image: string | null
          father_name: string | null
          gold_star: boolean | null
          green_tick: boolean | null
          h1_cert: string | null
          id: string
          images: Json
          is_published: boolean | null
          listing_id: string
          location: string
          maternal_grandfather_breed: string | null
          maternal_grandfather_image: string | null
          maternal_grandfather_name: string | null
          maternal_grandmother_breed: string | null
          maternal_grandmother_image: string | null
          maternal_grandmother_name: string | null
          microchip_number: string | null
          mother_breed: string | null
          mother_image: string | null
          mother_name: string | null
          paternal_grandfather_breed: string | null
          paternal_grandfather_image: string | null
          paternal_grandfather_name: string | null
          paternal_grandmother_breed: string | null
          paternal_grandmother_image: string | null
          paternal_grandmother_name: string | null
          pending_edit_id: string | null
          pick_of_litter: boolean | null
          sex: string | null
          status: string
          stud_fee: number
          title: string
          updated_at: string
          user_id: string
          v1_cert: string | null
          v2_cert: string | null
          vet_location: string | null
          vet_name: string
          video_url: string | null
        }
        Insert: {
          admin_approved?: boolean | null
          admin_notes?: string | null
          breed: string
          breed_type?: string | null
          breed1?: string | null
          breed2?: string | null
          colour?: string | null
          created_at?: string
          crossbreed_breeds?: string[] | null
          description: string
          dob: string
          family_tree?: Json | null
          father_breed?: string | null
          father_image?: string | null
          father_name?: string | null
          gold_star?: boolean | null
          green_tick?: boolean | null
          h1_cert?: string | null
          id?: string
          images?: Json
          is_published?: boolean | null
          listing_id: string
          location: string
          maternal_grandfather_breed?: string | null
          maternal_grandfather_image?: string | null
          maternal_grandfather_name?: string | null
          maternal_grandmother_breed?: string | null
          maternal_grandmother_image?: string | null
          maternal_grandmother_name?: string | null
          microchip_number?: string | null
          mother_breed?: string | null
          mother_image?: string | null
          mother_name?: string | null
          paternal_grandfather_breed?: string | null
          paternal_grandfather_image?: string | null
          paternal_grandfather_name?: string | null
          paternal_grandmother_breed?: string | null
          paternal_grandmother_image?: string | null
          paternal_grandmother_name?: string | null
          pending_edit_id?: string | null
          pick_of_litter?: boolean | null
          sex?: string | null
          status?: string
          stud_fee: number
          title: string
          updated_at?: string
          user_id: string
          v1_cert?: string | null
          v2_cert?: string | null
          vet_location?: string | null
          vet_name: string
          video_url?: string | null
        }
        Update: {
          admin_approved?: boolean | null
          admin_notes?: string | null
          breed?: string
          breed_type?: string | null
          breed1?: string | null
          breed2?: string | null
          colour?: string | null
          created_at?: string
          crossbreed_breeds?: string[] | null
          description?: string
          dob?: string
          family_tree?: Json | null
          father_breed?: string | null
          father_image?: string | null
          father_name?: string | null
          gold_star?: boolean | null
          green_tick?: boolean | null
          h1_cert?: string | null
          id?: string
          images?: Json
          is_published?: boolean | null
          listing_id?: string
          location?: string
          maternal_grandfather_breed?: string | null
          maternal_grandfather_image?: string | null
          maternal_grandfather_name?: string | null
          maternal_grandmother_breed?: string | null
          maternal_grandmother_image?: string | null
          maternal_grandmother_name?: string | null
          microchip_number?: string | null
          mother_breed?: string | null
          mother_image?: string | null
          mother_name?: string | null
          paternal_grandfather_breed?: string | null
          paternal_grandfather_image?: string | null
          paternal_grandfather_name?: string | null
          paternal_grandmother_breed?: string | null
          paternal_grandmother_image?: string | null
          paternal_grandmother_name?: string | null
          pending_edit_id?: string | null
          pick_of_litter?: boolean | null
          sex?: string | null
          status?: string
          stud_fee?: number
          title?: string
          updated_at?: string
          user_id?: string
          v1_cert?: string | null
          v2_cert?: string | null
          vet_location?: string | null
          vet_name?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stud_listing_edits_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "stud_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      stud_listings: {
        Row: {
          admin_approved: boolean
          admin_notes: string | null
          breed_type: string | null
          breed1: string | null
          breed2: string | null
          can_renew: boolean | null
          colour: string | null
          created_at: string
          crossbreed_breeds: string[] | null
          current_boost_id: string | null
          deleted_at: string | null
          description: string
          documents: Json | null
          dob: string
          expires_at: string | null
          family_tree: Json | null
          father_breed: string | null
          father_image: string | null
          father_name: string | null
          gold_star: boolean
          green_tick: boolean
          h1_cert: string | null
          id: string
          images: Json
          is_deleted: boolean
          is_paid: boolean | null
          is_paused: boolean
          is_published: boolean
          location: string
          maternal_grandfather_breed: string | null
          maternal_grandfather_image: string | null
          maternal_grandfather_name: string | null
          maternal_grandmother_breed: string | null
          maternal_grandmother_image: string | null
          maternal_grandmother_name: string | null
          microchip_number: string | null
          mother_breed: string | null
          mother_image: string | null
          mother_name: string | null
          paternal_grandfather_breed: string | null
          paternal_grandfather_image: string | null
          paternal_grandfather_name: string | null
          paternal_grandmother_breed: string | null
          paternal_grandmother_image: string | null
          paternal_grandmother_name: string | null
          paused_at: string | null
          payment_amount: number | null
          payment_currency: string | null
          payment_status: string | null
          pending_edit_id: string | null
          pick_of_litter: boolean | null
          rejection_message: string | null
          sex: string | null
          stripe_session_id: string | null
          stud_fee: number
          title: string
          updated_at: string
          user_id: string
          v1_cert: string | null
          v2_cert: string | null
          verification_date: string | null
          vet_location: string | null
          vet_name: string
          video_url: string | null
        }
        Insert: {
          admin_approved?: boolean
          admin_notes?: string | null
          breed_type?: string | null
          breed1?: string | null
          breed2?: string | null
          can_renew?: boolean | null
          colour?: string | null
          created_at?: string
          crossbreed_breeds?: string[] | null
          current_boost_id?: string | null
          deleted_at?: string | null
          description: string
          documents?: Json | null
          dob: string
          expires_at?: string | null
          family_tree?: Json | null
          father_breed?: string | null
          father_image?: string | null
          father_name?: string | null
          gold_star?: boolean
          green_tick?: boolean
          h1_cert?: string | null
          id?: string
          images?: Json
          is_deleted?: boolean
          is_paid?: boolean | null
          is_paused?: boolean
          is_published?: boolean
          location: string
          maternal_grandfather_breed?: string | null
          maternal_grandfather_image?: string | null
          maternal_grandfather_name?: string | null
          maternal_grandmother_breed?: string | null
          maternal_grandmother_image?: string | null
          maternal_grandmother_name?: string | null
          microchip_number?: string | null
          mother_breed?: string | null
          mother_image?: string | null
          mother_name?: string | null
          paternal_grandfather_breed?: string | null
          paternal_grandfather_image?: string | null
          paternal_grandfather_name?: string | null
          paternal_grandmother_breed?: string | null
          paternal_grandmother_image?: string | null
          paternal_grandmother_name?: string | null
          paused_at?: string | null
          payment_amount?: number | null
          payment_currency?: string | null
          payment_status?: string | null
          pending_edit_id?: string | null
          pick_of_litter?: boolean | null
          rejection_message?: string | null
          sex?: string | null
          stripe_session_id?: string | null
          stud_fee: number
          title: string
          updated_at?: string
          user_id: string
          v1_cert?: string | null
          v2_cert?: string | null
          verification_date?: string | null
          vet_location?: string | null
          vet_name: string
          video_url?: string | null
        }
        Update: {
          admin_approved?: boolean
          admin_notes?: string | null
          breed_type?: string | null
          breed1?: string | null
          breed2?: string | null
          can_renew?: boolean | null
          colour?: string | null
          created_at?: string
          crossbreed_breeds?: string[] | null
          current_boost_id?: string | null
          deleted_at?: string | null
          description?: string
          documents?: Json | null
          dob?: string
          expires_at?: string | null
          family_tree?: Json | null
          father_breed?: string | null
          father_image?: string | null
          father_name?: string | null
          gold_star?: boolean
          green_tick?: boolean
          h1_cert?: string | null
          id?: string
          images?: Json
          is_deleted?: boolean
          is_paid?: boolean | null
          is_paused?: boolean
          is_published?: boolean
          location?: string
          maternal_grandfather_breed?: string | null
          maternal_grandfather_image?: string | null
          maternal_grandfather_name?: string | null
          maternal_grandmother_breed?: string | null
          maternal_grandmother_image?: string | null
          maternal_grandmother_name?: string | null
          microchip_number?: string | null
          mother_breed?: string | null
          mother_image?: string | null
          mother_name?: string | null
          paternal_grandfather_breed?: string | null
          paternal_grandfather_image?: string | null
          paternal_grandfather_name?: string | null
          paternal_grandmother_breed?: string | null
          paternal_grandmother_image?: string | null
          paternal_grandmother_name?: string | null
          paused_at?: string | null
          payment_amount?: number | null
          payment_currency?: string | null
          payment_status?: string | null
          pending_edit_id?: string | null
          pick_of_litter?: boolean | null
          rejection_message?: string | null
          sex?: string | null
          stripe_session_id?: string | null
          stud_fee?: number
          title?: string
          updated_at?: string
          user_id?: string
          v1_cert?: string | null
          v2_cert?: string | null
          verification_date?: string | null
          vet_location?: string | null
          vet_name?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stud_listings_current_boost_id_fkey"
            columns: ["current_boost_id"]
            isOneToOne: false
            referencedRelation: "boosts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stud_listings_pending_edit_id_fkey"
            columns: ["pending_edit_id"]
            isOneToOne: false
            referencedRelation: "stud_listing_edits"
            referencedColumns: ["id"]
          },
        ]
      }
      subscribers: {
        Row: {
          auto_renew: boolean
          created_at: string
          email: string
          id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          auto_renew?: boolean
          created_at?: string
          email: string
          id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          auto_renew?: boolean
          created_at?: string
          email?: string
          id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          breed_alerts_enabled: boolean
          breed_ids: string[]
          created_at: string
          email_notifications_enabled: boolean
          id: string
          last_updated: string
          user_id: string
        }
        Insert: {
          breed_alerts_enabled?: boolean
          breed_ids?: string[]
          created_at?: string
          email_notifications_enabled?: boolean
          id?: string
          last_updated?: string
          user_id: string
        }
        Update: {
          breed_alerts_enabled?: boolean
          breed_ids?: string[]
          created_at?: string
          email_notifications_enabled?: boolean
          id?: string
          last_updated?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          auth_method: string | null
          avatar_url: string | null
          business_name: string | null
          county: string | null
          created_at: string | null
          dbe_id: string | null
          email: string | null
          first_name: string | null
          fraud_flags: Json | null
          id: string
          is_admin: boolean | null
          is_suspended: boolean | null
          last_name: string | null
          newsletter_opt_in: boolean | null
          notify_email_boost_expiry: boolean | null
          notify_email_listing_expiry: boolean | null
          notify_email_messages: boolean | null
          payout_enabled: boolean | null
          stripe_charges_enabled: boolean | null
          phone: string | null
          phone_verified: boolean | null
          phone_verified_at: string | null
          profile_complete: boolean | null
          role: string
          seller_id: string | null
          status: string | null
          stripe_account_id: string | null
          stripe_onboarding_completed: boolean | null
          suspended_at: string | null
          suspended_by: string | null
          suspension_reason: string | null
          updated_at: string | null
        }
        Insert: {
          auth_method?: string | null
          avatar_url?: string | null
          business_name?: string | null
          county?: string | null
          created_at?: string | null
          dbe_id?: string | null
          email?: string | null
          first_name?: string | null
          fraud_flags?: Json | null
          id: string
          is_admin?: boolean | null
          is_suspended?: boolean | null
          last_name?: string | null
          newsletter_opt_in?: boolean | null
          notify_email_boost_expiry?: boolean | null
          notify_email_listing_expiry?: boolean | null
          notify_email_messages?: boolean | null
          payout_enabled?: boolean | null
          stripe_charges_enabled?: boolean | null
          phone?: string | null
          phone_verified?: boolean | null
          phone_verified_at?: string | null
          profile_complete?: boolean | null
          role: string
          seller_id?: string | null
          status?: string | null
          stripe_account_id?: string | null
          stripe_onboarding_completed?: boolean | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          updated_at?: string | null
        }
        Update: {
          auth_method?: string | null
          avatar_url?: string | null
          business_name?: string | null
          county?: string | null
          created_at?: string | null
          dbe_id?: string | null
          email?: string | null
          first_name?: string | null
          fraud_flags?: Json | null
          id?: string
          is_admin?: boolean | null
          is_suspended?: boolean | null
          last_name?: string | null
          newsletter_opt_in?: boolean | null
          notify_email_boost_expiry?: boolean | null
          notify_email_listing_expiry?: boolean | null
          notify_email_messages?: boolean | null
          payout_enabled?: boolean | null
          stripe_charges_enabled?: boolean | null
          phone?: string | null
          phone_verified?: boolean | null
          phone_verified_at?: string | null
          profile_complete?: boolean | null
          role?: string
          seller_id?: string | null
          status?: string | null
          stripe_account_id?: string | null
          stripe_onboarding_completed?: boolean | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: number
          reviewed_user_id: string
          reviewer_email: string | null
          reviewer_name: string
          reviewer_user_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          reviewed_user_id: string
          reviewer_email?: string | null
          reviewer_name: string
          reviewer_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          reviewed_user_id?: string
          reviewer_email?: string | null
          reviewer_name?: string
          reviewer_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_reviews_reviewed_user_id_fkey"
            columns: ["reviewed_user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reviews_reviewed_user_id_fkey"
            columns: ["reviewed_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          is_admin: boolean
          user_id: string
        }
        Insert: {
          is_admin?: boolean
          user_id: string
        }
        Update: {
          is_admin?: boolean
          user_id?: string
        }
        Relationships: []
      }
      user_wishlists: {
        Row: {
          created_at: string
          id: string
          item_id: string
          item_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          user_id?: string
        }
        Relationships: []
      }
      verification_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          listing_id: string
          listing_type: string
          seller_id: string
          sent_at: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          listing_id: string
          listing_type: string
          seller_id: string
          sent_at?: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          listing_id?: string
          listing_type?: string
          seller_id?: string
          sent_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      breed_counts_cache: {
        Row: {
          normalized_breed: string | null
          original_breed: string | null
          sale_count: number | null
          showcase_count: number | null
          stud_count: number | null
          total_count: number | null
        }
        Relationships: []
      }
      public_user_profiles: {
        Row: {
          avatar_url: string | null
          business_name: string | null
          county: string | null
          created_at: string | null
          first_name: string | null
          id: string | null
          is_admin: boolean | null
          last_name: string | null
          role: string | null
        }
        Insert: {
          avatar_url?: string | null
          business_name?: string | null
          county?: string | null
          created_at?: string | null
          first_name?: string | null
          id?: string | null
          is_admin?: boolean | null
          last_name?: string | null
          role?: string | null
        }
        Update: {
          avatar_url?: string | null
          business_name?: string | null
          county?: string | null
          created_at?: string | null
          first_name?: string | null
          id?: string | null
          is_admin?: boolean | null
          last_name?: string | null
          role?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      analyze_signup_fraud: {
        Args: {
          email_address: string
          first_name?: string
          last_name?: string
          phone_number: string
        }
        Returns: Json
      }
      calculate_listing_expiration: {
        Args: { months?: number; payment_date: string }
        Returns: string
      }
      calculate_showcase_expiration: {
        Args: { birth_date: string }
        Returns: string
      }
      cleanup_expired_sessions: { Args: never; Returns: undefined }
      cleanup_expired_verification_codes: { Args: never; Returns: undefined }
      detect_email_fraud: { Args: { email_address: string }; Returns: Json }
      detect_fraud_keywords: {
        Args: { message_content: string }
        Returns: Json
      }
      detect_phone_fraud: { Args: { phone_number: string }; Returns: Json }
      detect_reservation_fraud: {
        Args: { check_ip_address: unknown; check_user_id: string }
        Returns: Json
      }
      generate_business_slug: {
        Args: { business_name: string }
        Returns: string
      }
      generate_product_slug: { Args: { product_name: string }; Returns: string }
      generate_slug: { Args: { title: string }; Returns: string }
      increment_business_views: { Args: { business_id: string }; Returns: unknown }
      get_auth_method_by_email: {
        Args: { user_email: string }
        Returns: string
      }
      get_boost_cleanup_cron_status: {
        Args: never
        Returns: {
          active: boolean
          command: string
          database: string
          jobid: number
          jobname: string
          nodename: string
          nodeport: number
          schedule: string
          username: string
        }[]
      }
      get_boost_cleanup_history: {
        Args: { limit_rows?: number }
        Returns: {
          command: string
          database: string
          end_time: string
          job_pid: number
          return_message: string
          runid: number
          start_time: string
          status: string
          username: string
        }[]
      }
      get_breed_count_from_cache: {
        Args: { search_breed: string }
        Returns: number
      }
      get_breed_counts_detailed: {
        Args: { search_breed?: string }
        Returns: {
          breed_name: string
          sale_count: number
          showcase_count: number
          stud_count: number
          total_count: number
        }[]
      }
      get_public_directory_user_profile: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_public_user_name: {
        Args: { user_id_param: string }
        Returns: {
          avatar_url: string
          business_name: string
          first_name: string
          last_name: string
          role: string
          is_admin: boolean
        }[]
      }
      get_public_user_contact: {
        Args: { user_id_param: string }
        Returns: {
          phone: string
        }[]
      }
      get_recent_boost_expirations: {
        Args: { days_back?: number }
        Returns: {
          boost_level: string
          expired_at: string
          listing_id: string
          listing_type: string
          log_id: string
          logged_at: string
        }[]
      }
      get_showcase_age_weeks: { Args: { birth_date: string }; Returns: number }
      is_current_user_admin: { Args: never; Returns: boolean }
      is_seller_stripe_ready_for_reservations: {
        Args: { p_seller_id: string }
        Returns: boolean
      }
      is_showcase_expired: { Args: { birth_date: string }; Returns: boolean }
      list_public_user_directory: {
        Args: {
          p_county?: string | null
          p_page?: number
          p_page_size?: number
          p_role?: string | null
          p_search?: string | null
        }
        Returns: Json
      }
      log_listing_change: {
        Args: {
          p_admin_id: string
          p_field_changed: string
          p_listing_id: string
          p_listing_type: string
          p_new_value: string
          p_old_value: string
        }
        Returns: undefined
      }
      log_seller_action: {
        Args: {
          p_action: string
          p_listing_id: string
          p_listing_type: string
          p_new_value?: string
          p_old_value?: string
          p_seller_id: string
        }
        Returns: undefined
      }
      manual_boost_cleanup: { Args: never; Returns: string }
      process_expired_showcases: { Args: never; Returns: undefined }
      process_verification_expiry: { Args: never; Returns: undefined }
      refresh_breed_counts_cache: { Args: never; Returns: undefined }
      scheduled_boost_cleanup: { Args: never; Returns: undefined }
      update_expired_boosts: { Args: never; Returns: undefined }
      update_expired_listings: { Args: never; Returns: undefined }
      update_expired_showcases: { Args: never; Returns: undefined }
    }
    Enums: {
      dog_size: "small" | "medium" | "large"
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
      dog_size: ["small", "medium", "large"],
    },
  },
} as const
