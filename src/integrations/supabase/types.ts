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
      accounts: {
        Row: {
          account_email: string | null
          account_password: string | null
          account_phone: string | null
          account_type: string
          account_username: string | null
          additional_info: string | null
          buyer_id: string | null
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          features: string[] | null
          id: string
          image_url: string | null
          is_active: boolean
          is_free: boolean | null
          is_sold: boolean
          login_email: string | null
          login_password: string | null
          login_phone: string | null
          login_username: string | null
          platform: string
          price: number
          seller_id: string
          sold_at: string | null
          sold_to: string | null
          title: string
          updated_at: string
        }
        Insert: {
          account_email?: string | null
          account_password?: string | null
          account_phone?: string | null
          account_type: string
          account_username?: string | null
          additional_info?: string | null
          buyer_id?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          features?: string[] | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_free?: boolean | null
          is_sold?: boolean
          login_email?: string | null
          login_password?: string | null
          login_phone?: string | null
          login_username?: string | null
          platform: string
          price?: number
          seller_id: string
          sold_at?: string | null
          sold_to?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          account_email?: string | null
          account_password?: string | null
          account_phone?: string | null
          account_type?: string
          account_username?: string | null
          additional_info?: string | null
          buyer_id?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          features?: string[] | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_free?: boolean | null
          is_sold?: boolean
          login_email?: string | null
          login_password?: string | null
          login_phone?: string | null
          login_username?: string | null
          platform?: string
          price?: number
          seller_id?: string
          sold_at?: string | null
          sold_to?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      banned_users: {
        Row: {
          banned_at: string
          banned_by: string | null
          device_fingerprint: string | null
          id: string
          ip_address: string | null
          reason: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          banned_at?: string
          banned_by?: string | null
          device_fingerprint?: string | null
          id?: string
          ip_address?: string | null
          reason: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          banned_at?: string
          banned_by?: string | null
          device_fingerprint?: string | null
          id?: string
          ip_address?: string | null
          reason?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bot_rental_requests: {
        Row: {
          admin_note: string | null
          bot_id: string
          created_at: string
          id: string
          receipt_url: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          bot_id: string
          created_at?: string
          id?: string
          receipt_url?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          bot_id?: string
          created_at?: string
          id?: string
          receipt_url?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_rental_requests_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "zalo_bot_rentals"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug?: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          file_name: string | null
          file_url: string | null
          gradient_color: string | null
          id: string
          image_url: string | null
          is_deleted: boolean
          is_recalled: boolean
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          gradient_color?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          is_recalled?: boolean
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          gradient_color?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          is_recalled?: boolean
          user_id?: string
        }
        Relationships: []
      }
      child_website_products: {
        Row: {
          account_id: string | null
          created_at: string
          id: string
          is_featured: boolean | null
          product_id: string | null
          sort_order: number | null
          website_id: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          id?: string
          is_featured?: boolean | null
          product_id?: string | null
          sort_order?: number | null
          website_id: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          id?: string
          is_featured?: boolean | null
          product_id?: string | null
          sort_order?: number | null
          website_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_website_products_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_website_products_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_website_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_website_products_website_id_fkey"
            columns: ["website_id"]
            isOneToOne: false
            referencedRelation: "child_websites"
            referencedColumns: ["id"]
          },
        ]
      }
      child_websites: {
        Row: {
          bank_account_name: string | null
          bank_account_number: string | null
          bank_name: string | null
          bank_qr_url: string | null
          banner_url: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          owner_id: string
          primary_color: string | null
          secondary_color: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          bank_qr_url?: string | null
          banner_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          owner_id: string
          primary_color?: string | null
          secondary_color?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          bank_qr_url?: string | null
          banner_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          owner_id?: string
          primary_color?: string | null
          secondary_color?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      coin_history: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      coin_purchases: {
        Row: {
          admin_note: string | null
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          receipt_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          receipt_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          receipt_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      coin_transactions: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          note: string | null
          payment_method: string | null
          proof_image: string | null
          status: string
          transaction_code: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          payment_method?: string | null
          proof_image?: string | null
          status?: string
          transaction_code?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          payment_method?: string | null
          proof_image?: string | null
          status?: string
          transaction_code?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_action_progress: {
        Row: {
          action_count: number | null
          action_date: string
          action_type: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_count?: number | null
          action_date?: string
          action_type: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_count?: number | null
          action_date?: string
          action_type?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_tasks: {
        Row: {
          action_type: string | null
          action_url: string | null
          coin_reward: number
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          required_count: number | null
          sort_order: number | null
          task_type: string
          title: string
          tracked_action: string | null
          updated_at: string
        }
        Insert: {
          action_type?: string | null
          action_url?: string | null
          coin_reward?: number
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          required_count?: number | null
          sort_order?: number | null
          task_type?: string
          title: string
          tracked_action?: string | null
          updated_at?: string
        }
        Update: {
          action_type?: string | null
          action_url?: string | null
          coin_reward?: number
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          required_count?: number | null
          sort_order?: number | null
          task_type?: string
          title?: string
          tracked_action?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      device_registrations: {
        Row: {
          browser: string | null
          device_fingerprint: string
          device_name: string | null
          id: string
          os: string | null
          registered_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          device_fingerprint: string
          device_name?: string | null
          id?: string
          os?: string | null
          registered_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          device_fingerprint?: string
          device_name?: string | null
          id?: string
          os?: string | null
          registered_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      discount_code_uses: {
        Row: {
          code_id: string
          id: string
          order_id: string | null
          used_at: string
          user_id: string
        }
        Insert: {
          code_id: string
          id?: string
          order_id?: string | null
          used_at?: string
          user_id: string
        }
        Update: {
          code_id?: string
          id?: string
          order_id?: string | null
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_code_uses_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_code_uses_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          discount_amount: number
          discount_type: string
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          min_order_amount: number | null
          target_user_id: string | null
          updated_at: string
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          discount_type?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_amount?: number | null
          target_user_id?: string | null
          updated_at?: string
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          discount_type?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_amount?: number | null
          target_user_id?: string | null
          updated_at?: string
          used_count?: number
        }
        Relationships: []
      }
      free_resources: {
        Row: {
          account_email: string | null
          account_name: string | null
          account_password: string | null
          account_phone: string | null
          app_name: string | null
          claim_limit: number | null
          claimed_count: number | null
          content: string
          created_at: string
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          title: string
          type: string
        }
        Insert: {
          account_email?: string | null
          account_name?: string | null
          account_password?: string | null
          account_phone?: string | null
          app_name?: string | null
          claim_limit?: number | null
          claimed_count?: number | null
          content: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          title: string
          type?: string
        }
        Update: {
          account_email?: string | null
          account_name?: string | null
          account_password?: string | null
          account_phone?: string | null
          app_name?: string | null
          claim_limit?: number | null
          claimed_count?: number | null
          content?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          reference_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          reference_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          reference_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          account_id: string | null
          amount: number
          approved_at: string | null
          approved_by: string | null
          buyer_id: string
          created_at: string
          id: string
          login_credentials: Json | null
          order_type: string
          product_id: string | null
          seller_id: string | null
          sold_to: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          buyer_id: string
          created_at?: string
          id?: string
          login_credentials?: Json | null
          order_type?: string
          product_id?: string | null
          seller_id?: string | null
          sold_to?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          buyer_id?: string
          created_at?: string
          id?: string
          login_credentials?: Json | null
          order_type?: string
          product_id?: string | null
          seller_id?: string | null
          sold_to?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_codes: {
        Row: {
          attempts: number | null
          code: string
          created_at: string | null
          email: string
          expires_at: string
          id: string
        }
        Insert: {
          attempts?: number | null
          code: string
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
        }
        Update: {
          attempts?: number | null
          code?: string
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          is_deleted: boolean
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          image_url: string | null
          is_published: boolean
          title: string
          updated_at: string
          views: number
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          title: string
          updated_at?: string
          views?: number
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          title?: string
          updated_at?: string
          views?: number
        }
        Relationships: []
      }
      private_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          image_url: string | null
          is_read: boolean
          is_recalled: boolean
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_read?: boolean
          is_recalled?: boolean
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_read?: boolean
          is_recalled?: boolean
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          badge: string | null
          category: string
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          download_url: string | null
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_free: boolean | null
          original_price: number | null
          price: number
          rating: number | null
          sales: number | null
          seller_id: string | null
          tech_stack: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          badge?: string | null
          category?: string
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          download_url?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_free?: boolean | null
          original_price?: number | null
          price?: number
          rating?: number | null
          sales?: number | null
          seller_id?: string | null
          tech_stack?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          badge?: string | null
          category?: string
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          download_url?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_free?: boolean | null
          original_price?: number | null
          price?: number
          rating?: number | null
          sales?: number | null
          seller_id?: string | null
          tech_stack?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          referral_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          referral_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          referral_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          coins_rewarded: number | null
          created_at: string
          id: string
          is_rewarded: boolean | null
          referral_code: string
          referred_id: string
          referrer_id: string
          rewarded_at: string | null
        }
        Insert: {
          coins_rewarded?: number | null
          created_at?: string
          id?: string
          is_rewarded?: boolean | null
          referral_code: string
          referred_id: string
          referrer_id: string
          rewarded_at?: string | null
        }
        Update: {
          coins_rewarded?: number | null
          created_at?: string
          id?: string
          is_rewarded?: boolean | null
          referral_code?: string
          referred_id?: string
          referrer_id?: string
          rewarded_at?: string | null
        }
        Relationships: []
      }
      resource_claims: {
        Row: {
          claimed_at: string
          id: string
          resource_id: string
          user_id: string
        }
        Insert: {
          claimed_at?: string
          id?: string
          resource_id: string
          user_id: string
        }
        Update: {
          claimed_at?: string
          id?: string
          resource_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_claims_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "free_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      scam_reports: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          evidence_urls: string[] | null
          id: string
          image_url: string | null
          scammer_contact: string | null
          scammer_name: string | null
          severity: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          evidence_urls?: string[] | null
          id?: string
          image_url?: string | null
          scammer_contact?: string | null
          scammer_name?: string | null
          severity?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          evidence_urls?: string[] | null
          id?: string
          image_url?: string | null
          scammer_contact?: string | null
          scammer_name?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      seller_coins: {
        Row: {
          balance: number
          created_at: string
          id: string
          seller_id: string
          total_earned: number | null
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          seller_id: string
          total_earned?: number | null
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          seller_id?: string
          total_earned?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_coins_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_coins_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "sellers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_requests: {
        Row: {
          created_at: string
          description: string | null
          id: string
          phone: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          store_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          store_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          store_name?: string
          user_id?: string
        }
        Relationships: []
      }
      sellers: {
        Row: {
          avatar_url: string | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_name: string | null
          bank_qr_url: string | null
          created_at: string
          description: string | null
          display_name: string
          id: string
          is_profile_complete: boolean
          is_verified: boolean
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          bank_qr_url?: string | null
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          is_profile_complete?: boolean
          is_verified?: boolean
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          bank_qr_url?: string | null
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          is_profile_complete?: boolean
          is_verified?: boolean
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Relationships: []
      }
      social_accounts: {
        Row: {
          account_type: string
          available_count: number | null
          created_at: string
          created_by: string | null
          features: string[] | null
          followers: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          platform: string
          price: number
          updated_at: string
        }
        Insert: {
          account_type: string
          available_count?: number | null
          created_at?: string
          created_by?: string | null
          features?: string[] | null
          followers?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          platform: string
          price?: number
          updated_at?: string
        }
        Update: {
          account_type?: string
          available_count?: number | null
          created_at?: string
          created_by?: string | null
          features?: string[] | null
          followers?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          platform?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      task_completions: {
        Row: {
          coins_earned: number
          completed_at: string
          completion_date: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          coins_earned?: number
          completed_at?: string
          completion_date?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          coins_earned?: number
          completed_at?: string
          completion_date?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_completions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "daily_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_coins: {
        Row: {
          balance: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_onboarding: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          skipped: boolean
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          skipped?: boolean
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          skipped?: boolean
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          protected: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          protected?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          protected?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          browser: string | null
          created_at: string
          device_fingerprint: string
          device_name: string | null
          id: string
          ip_address: string | null
          is_active: boolean
          last_active_at: string
          os: string | null
          session_token: string
          user_id: string
        }
        Insert: {
          browser?: string | null
          created_at?: string
          device_fingerprint: string
          device_name?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean
          last_active_at?: string
          os?: string | null
          session_token: string
          user_id: string
        }
        Update: {
          browser?: string | null
          created_at?: string
          device_fingerprint?: string
          device_name?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean
          last_active_at?: string
          os?: string | null
          session_token?: string
          user_id?: string
        }
        Relationships: []
      }
      user_wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_warnings: {
        Row: {
          created_at: string
          id: string
          reason: string
          user_id: string
          warned_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          user_id: string
          warned_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          user_id?: string
          warned_by?: string | null
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          admin_note: string | null
          amount: number
          bank_account_name: string | null
          bank_account_number: string | null
          bank_name: string | null
          bank_qr_url: string | null
          created_at: string
          id: string
          processed_at: string | null
          processed_by: string | null
          seller_id: string
          status: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          bank_qr_url?: string | null
          created_at?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          seller_id: string
          status?: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          bank_qr_url?: string | null
          created_at?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          seller_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_requests_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      zalo_bot_rentals: {
        Row: {
          created_at: string
          description: string | null
          duration: string | null
          features: string[] | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          price: number
          sort_order: number | null
          updated_at: string
          zalo_number: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration?: string | null
          features?: string[] | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price?: number
          sort_order?: number | null
          updated_at?: string
          zalo_number?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          duration?: string | null
          features?: string[] | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          sort_order?: number | null
          updated_at?: string
          zalo_number?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      accounts_public: {
        Row: {
          account_type: string | null
          category: string | null
          created_at: string | null
          description: string | null
          features: string[] | null
          id: string | null
          image_url: string | null
          is_active: boolean | null
          is_free: boolean | null
          is_sold: boolean | null
          platform: string | null
          price: number | null
          seller_id: string | null
          title: string | null
        }
        Insert: {
          account_type?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          features?: string[] | null
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          is_free?: boolean | null
          is_sold?: boolean | null
          platform?: string | null
          price?: number | null
          seller_id?: string | null
          title?: string | null
        }
        Update: {
          account_type?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          features?: string[] | null
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          is_free?: boolean | null
          is_sold?: boolean | null
          platform?: string | null
          price?: number | null
          seller_id?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      sellers_public: {
        Row: {
          avatar_url: string | null
          description: string | null
          display_name: string | null
          id: string | null
          is_verified: boolean | null
        }
        Insert: {
          avatar_url?: string | null
          description?: string | null
          display_name?: string | null
          id?: string | null
          is_verified?: boolean | null
        }
        Update: {
          avatar_url?: string | null
          description?: string | null
          display_name?: string | null
          id?: string | null
          is_verified?: boolean | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_public_seller_info: {
        Args: { p_seller_id: string }
        Returns: {
          avatar_url: string
          description: string
          display_name: string
          id: string
          is_verified: boolean
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "seller" | "user"
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
      app_role: ["admin", "seller", "user"],
    },
  },
} as const
