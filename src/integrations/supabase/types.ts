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
      ai_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          sender: string
          session_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          sender: string
          session_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          sender?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_sessions: {
        Row: {
          created_at: string
          id: string
          session_title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          session_title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          session_title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      challenge_participants: {
        Row: {
          challenge_id: string
          id: string
          rank: number | null
          score: number | null
          submission_data: Json | null
          submission_date: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          id?: string
          rank?: number | null
          score?: number | null
          submission_data?: Json | null
          submission_date?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          id?: string
          rank?: number | null
          score?: number | null
          submission_data?: Json | null
          submission_date?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          sender: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          sender: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_room_members: {
        Row: {
          id: string
          joined_at: string
          last_read_at: string | null
          role: string
          room_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          last_read_at?: string | null
          role?: string
          room_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          last_read_at?: string | null
          role?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_room_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_edited: boolean
          message_type: string
          reply_to_id: string | null
          room_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_edited?: boolean
          message_type?: string
          reply_to_id?: string | null
          room_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_edited?: boolean
          message_type?: string
          reply_to_id?: string | null
          room_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_room_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "chat_room_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_room_messages_room_id_fkey"
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
          crop_type: string | null
          description: string | null
          id: string
          is_active: boolean
          is_private: boolean
          max_members: number | null
          member_count: number
          name: string
          region: string | null
          room_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          crop_type?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_private?: boolean
          max_members?: number | null
          member_count?: number
          name: string
          region?: string | null
          room_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          crop_type?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_private?: boolean
          max_members?: number | null
          member_count?: number
          name?: string
          region?: string | null
          room_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      comment_attachments: {
        Row: {
          comment_id: string
          created_at: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          original_filename: string | null
        }
        Insert: {
          comment_id: string
          created_at?: string
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          original_filename?: string | null
        }
        Update: {
          comment_id?: string
          created_at?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          original_filename?: string | null
        }
        Relationships: []
      }
      comment_emoji_reactions: {
        Row: {
          comment_id: string
          created_at: string
          emoji: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          emoji: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          emoji?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_emoji_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_reactions: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          reaction_type: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_reports: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          reason: string | null
          report_type: string
          reported_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          reason?: string | null
          report_type: string
          reported_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          report_type?: string
          reported_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_reports_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_threads: {
        Row: {
          child_comment_id: string | null
          created_at: string
          id: string
          parent_comment_id: string | null
        }
        Insert: {
          child_comment_id?: string | null
          created_at?: string
          id?: string
          parent_comment_id?: string | null
        }
        Update: {
          child_comment_id?: string | null
          created_at?: string
          id?: string
          parent_comment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comment_threads_child_comment_id_fkey"
            columns: ["child_comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_threads_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      commodities: {
        Row: {
          category: string
          created_at: string
          id: string
          name: string
          seasonal_pattern: Json | null
          tamil_name: string | null
          unit: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          name: string
          seasonal_pattern?: Json | null
          tamil_name?: string | null
          unit?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          name?: string
          seasonal_pattern?: Json | null
          tamil_name?: string | null
          unit?: string
        }
        Relationships: []
      }
      community_challenges: {
        Row: {
          challenge_type: string
          created_at: string
          created_by: string
          description: string | null
          end_date: string
          id: string
          is_active: boolean
          max_participants: number | null
          prize_description: string | null
          rules: Json | null
          start_date: string
          title: string
        }
        Insert: {
          challenge_type: string
          created_at?: string
          created_by: string
          description?: string | null
          end_date: string
          id?: string
          is_active?: boolean
          max_participants?: number | null
          prize_description?: string | null
          rules?: Json | null
          start_date: string
          title: string
        }
        Update: {
          challenge_type?: string
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string
          id?: string
          is_active?: boolean
          max_participants?: number | null
          prize_description?: string | null
          rules?: Json | null
          start_date?: string
          title?: string
        }
        Relationships: []
      }
      community_events: {
        Row: {
          created_at: string
          created_by: string
          current_participants: number
          description: string | null
          end_time: string
          event_type: string
          group_id: string | null
          id: string
          is_online: boolean
          location: string | null
          max_participants: number | null
          start_time: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          current_participants?: number
          description?: string | null
          end_time: string
          event_type: string
          group_id?: string | null
          id?: string
          is_online?: boolean
          location?: string | null
          max_participants?: number | null
          start_time: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          current_participants?: number
          description?: string | null
          end_time?: string
          event_type?: string
          group_id?: string | null
          id?: string
          is_online?: boolean
          location?: string | null
          max_participants?: number | null
          start_time?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_events_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "community_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      community_groups: {
        Row: {
          created_at: string
          created_by: string
          crop_type: string | null
          description: string | null
          id: string
          is_private: boolean
          member_count: number
          name: string
          region: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          crop_type?: string | null
          description?: string | null
          id?: string
          is_private?: boolean
          member_count?: number
          name: string
          region?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          crop_type?: string | null
          description?: string | null
          id?: string
          is_private?: boolean
          member_count?: number
          name?: string
          region?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      community_highlights: {
        Row: {
          created_at: string
          expires_at: string | null
          highlight_type: string
          highlighted_by: string
          id: string
          post_id: string
          priority: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          highlight_type?: string
          highlighted_by: string
          id?: string
          post_id: string
          priority?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          highlight_type?: string
          highlighted_by?: string
          id?: string
          post_id?: string
          priority?: number
          updated_at?: string
        }
        Relationships: []
      }
      community_leaderboard: {
        Row: {
          category: string
          id: string
          last_updated: string
          period_end: string | null
          period_start: string | null
          points: number
          rank: number | null
          user_id: string
        }
        Insert: {
          category: string
          id?: string
          last_updated?: string
          period_end?: string | null
          period_start?: string | null
          points?: number
          rank?: number | null
          user_id: string
        }
        Update: {
          category?: string
          id?: string
          last_updated?: string
          period_end?: string | null
          period_start?: string | null
          points?: number
          rank?: number | null
          user_id?: string
        }
        Relationships: []
      }
      community_posts: {
        Row: {
          category: string
          comments_count: number | null
          content: string
          created_at: string
          id: string
          image_carousel: Json | null
          images: string[] | null
          is_resolved: boolean | null
          likes_count: number | null
          location_data: Json | null
          poll_data: Json | null
          post_type: string | null
          scheduled_at: string | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          category: string
          comments_count?: number | null
          content: string
          created_at?: string
          id?: string
          image_carousel?: Json | null
          images?: string[] | null
          is_resolved?: boolean | null
          likes_count?: number | null
          location_data?: Json | null
          poll_data?: Json | null
          post_type?: string | null
          scheduled_at?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          category?: string
          comments_count?: number | null
          content?: string
          created_at?: string
          id?: string
          image_carousel?: Json | null
          images?: string[] | null
          is_resolved?: boolean | null
          likes_count?: number | null
          location_data?: Json | null
          poll_data?: Json | null
          post_type?: string | null
          scheduled_at?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: []
      }
      consultation_reviews: {
        Row: {
          consultation_id: string
          created_at: string
          id: string
          is_public: boolean
          rating: number
          review_text: string | null
          reviewer_id: string
        }
        Insert: {
          consultation_id: string
          created_at?: string
          id?: string
          is_public?: boolean
          rating: number
          review_text?: string | null
          reviewer_id: string
        }
        Update: {
          consultation_id?: string
          created_at?: string
          id?: string
          is_public?: boolean
          rating?: number
          review_text?: string | null
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultation_reviews_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "expert_consultations"
            referencedColumns: ["id"]
          },
        ]
      }
      crop_calendar: {
        Row: {
          activity_type: string
          completed: boolean | null
          created_at: string
          crop_type: string
          id: string
          notes: string | null
          scheduled_date: string
          user_id: string
        }
        Insert: {
          activity_type: string
          completed?: boolean | null
          created_at?: string
          crop_type: string
          id?: string
          notes?: string | null
          scheduled_date: string
          user_id: string
        }
        Update: {
          activity_type?: string
          completed?: boolean | null
          created_at?: string
          crop_type?: string
          id?: string
          notes?: string | null
          scheduled_date?: string
          user_id?: string
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          message_type: string
          recipient_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          message_type?: string
          recipient_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          message_type?: string
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      disease_history: {
        Row: {
          application_date: string | null
          created_at: string
          disease_id: string
          follow_up_image_url: string | null
          id: string
          progress_notes: string | null
          recovery_status: string | null
          treatment_applied: string | null
          user_id: string
        }
        Insert: {
          application_date?: string | null
          created_at?: string
          disease_id: string
          follow_up_image_url?: string | null
          id?: string
          progress_notes?: string | null
          recovery_status?: string | null
          treatment_applied?: string | null
          user_id: string
        }
        Update: {
          application_date?: string | null
          created_at?: string
          disease_id?: string
          follow_up_image_url?: string | null
          id?: string
          progress_notes?: string | null
          recovery_status?: string | null
          treatment_applied?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "disease_history_disease_id_fkey"
            columns: ["disease_id"]
            isOneToOne: false
            referencedRelation: "plant_diseases"
            referencedColumns: ["id"]
          },
        ]
      }
      disease_treatments: {
        Row: {
          active_ingredient: string | null
          application_method: string | null
          cost_per_treatment: number | null
          created_at: string
          disease_name: string
          dosage: string | null
          effectiveness_rating: number | null
          frequency: string | null
          id: string
          organic: boolean | null
          timing: string | null
          treatment_name: string
          treatment_type: string
        }
        Insert: {
          active_ingredient?: string | null
          application_method?: string | null
          cost_per_treatment?: number | null
          created_at?: string
          disease_name: string
          dosage?: string | null
          effectiveness_rating?: number | null
          frequency?: string | null
          id?: string
          organic?: boolean | null
          timing?: string | null
          treatment_name: string
          treatment_type: string
        }
        Update: {
          active_ingredient?: string | null
          application_method?: string | null
          cost_per_treatment?: number | null
          created_at?: string
          disease_name?: string
          dosage?: string | null
          effectiveness_rating?: number | null
          frequency?: string | null
          id?: string
          organic?: boolean | null
          timing?: string | null
          treatment_name?: string
          treatment_type?: string
        }
        Relationships: []
      }
      event_participants: {
        Row: {
          event_id: string
          id: string
          registered_at: string
          status: string
          user_id: string
        }
        Insert: {
          event_id: string
          id?: string
          registered_at?: string
          status?: string
          user_id: string
        }
        Update: {
          event_id?: string
          id?: string
          registered_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "community_events"
            referencedColumns: ["id"]
          },
        ]
      }
      expert_consultations: {
        Row: {
          client_id: string
          consultation_type: string
          created_at: string
          description: string | null
          duration_minutes: number
          expert_id: string
          id: string
          meeting_url: string | null
          notes: string | null
          payment_status: string | null
          price: number | null
          scheduled_time: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          client_id: string
          consultation_type: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          expert_id: string
          id?: string
          meeting_url?: string | null
          notes?: string | null
          payment_status?: string | null
          price?: number | null
          scheduled_time?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          consultation_type?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          expert_id?: string
          id?: string
          meeting_url?: string | null
          notes?: string | null
          payment_status?: string | null
          price?: number | null
          scheduled_time?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expert_consultations_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "expert_network"
            referencedColumns: ["id"]
          },
        ]
      }
      expert_network: {
        Row: {
          bio: string | null
          created_at: string
          experience_years: number | null
          id: string
          is_verified: boolean | null
          location: string | null
          rating: number | null
          specialization: string
          total_consultations: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          experience_years?: number | null
          id?: string
          is_verified?: boolean | null
          location?: string | null
          rating?: number | null
          specialization: string
          total_consultations?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          experience_years?: number | null
          id?: string
          is_verified?: boolean | null
          location?: string | null
          rating?: number | null
          specialization?: string
          total_consultations?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      farm_activities: {
        Row: {
          activity_date: string
          activity_type: string
          cost: number | null
          created_at: string
          description: string | null
          farm_record_id: string | null
          id: string
          user_id: string
        }
        Insert: {
          activity_date: string
          activity_type: string
          cost?: number | null
          created_at?: string
          description?: string | null
          farm_record_id?: string | null
          id?: string
          user_id: string
        }
        Update: {
          activity_date?: string
          activity_type?: string
          cost?: number | null
          created_at?: string
          description?: string | null
          farm_record_id?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "farm_activities_farm_record_id_fkey"
            columns: ["farm_record_id"]
            isOneToOne: false
            referencedRelation: "farm_records"
            referencedColumns: ["id"]
          },
        ]
      }
      farm_records: {
        Row: {
          actual_yield: number | null
          created_at: string
          crop_type: string
          expected_yield: number | null
          field_size: number | null
          harvest_date: string | null
          id: string
          investment_cost: number | null
          notes: string | null
          planting_date: string | null
          profit: number | null
          revenue: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_yield?: number | null
          created_at?: string
          crop_type: string
          expected_yield?: number | null
          field_size?: number | null
          harvest_date?: string | null
          id?: string
          investment_cost?: number | null
          notes?: string | null
          planting_date?: string | null
          profit?: number | null
          revenue?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_yield?: number | null
          created_at?: string
          crop_type?: string
          expected_yield?: number | null
          field_size?: number | null
          harvest_date?: string | null
          id?: string
          investment_cost?: number | null
          notes?: string | null
          planting_date?: string | null
          profit?: number | null
          revenue?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "community_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      live_streams: {
        Row: {
          category: string | null
          created_at: string
          current_viewers: number | null
          description: string | null
          ended_at: string | null
          host_id: string
          id: string
          is_live: boolean | null
          max_viewers: number | null
          started_at: string | null
          stream_key: string | null
          stream_url: string | null
          title: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          current_viewers?: number | null
          description?: string | null
          ended_at?: string | null
          host_id: string
          id?: string
          is_live?: boolean | null
          max_viewers?: number | null
          started_at?: string | null
          stream_key?: string | null
          stream_url?: string | null
          title: string
        }
        Update: {
          category?: string | null
          created_at?: string
          current_viewers?: number | null
          description?: string | null
          ended_at?: string | null
          host_id?: string
          id?: string
          is_live?: boolean | null
          max_viewers?: number | null
          started_at?: string | null
          stream_key?: string | null
          stream_url?: string | null
          title?: string
        }
        Relationships: []
      }
      market_locations: {
        Row: {
          coordinates: unknown
          created_at: string
          district: string
          id: string
          is_active: boolean
          market_type: string
          name: string
          state: string
          updated_at: string
        }
        Insert: {
          coordinates?: unknown
          created_at?: string
          district: string
          id?: string
          is_active?: boolean
          market_type?: string
          name: string
          state: string
          updated_at?: string
        }
        Update: {
          coordinates?: unknown
          created_at?: string
          district?: string
          id?: string
          is_active?: boolean
          market_type?: string
          name?: string
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      market_news: {
        Row: {
          affected_commodities: string[] | null
          category: string
          content: string
          created_at: string
          expires_at: string | null
          id: string
          importance_level: string
          published_at: string
          region: string | null
          source: string | null
          title: string
        }
        Insert: {
          affected_commodities?: string[] | null
          category: string
          content: string
          created_at?: string
          expires_at?: string | null
          id?: string
          importance_level?: string
          published_at?: string
          region?: string | null
          source?: string | null
          title: string
        }
        Update: {
          affected_commodities?: string[] | null
          category?: string
          content?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          importance_level?: string
          published_at?: string
          region?: string | null
          source?: string | null
          title?: string
        }
        Relationships: []
      }
      market_prices: {
        Row: {
          arrivals: number | null
          commodity_id: string
          created_at: string
          data_source: string
          id: string
          market_location_id: string
          max_price: number
          min_price: number
          modal_price: number
          previous_price: number | null
          price_change: number | null
          price_date: string
          trend: string | null
          updated_at: string
        }
        Insert: {
          arrivals?: number | null
          commodity_id: string
          created_at?: string
          data_source?: string
          id?: string
          market_location_id: string
          max_price: number
          min_price: number
          modal_price: number
          previous_price?: number | null
          price_change?: number | null
          price_date: string
          trend?: string | null
          updated_at?: string
        }
        Update: {
          arrivals?: number | null
          commodity_id?: string
          created_at?: string
          data_source?: string
          id?: string
          market_location_id?: string
          max_price?: number
          min_price?: number
          modal_price?: number
          previous_price?: number | null
          price_change?: number | null
          price_date?: string
          trend?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_prices_commodity_id_fkey"
            columns: ["commodity_id"]
            isOneToOne: false
            referencedRelation: "commodities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_prices_market_location_id_fkey"
            columns: ["market_location_id"]
            isOneToOne: false
            referencedRelation: "market_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      market_trends: {
        Row: {
          commodity_id: string
          confidence_score: number
          created_at: string
          factors: Json | null
          id: string
          prediction_text: string
          region: string
          trend_direction: string
          valid_until: string
        }
        Insert: {
          commodity_id: string
          confidence_score: number
          created_at?: string
          factors?: Json | null
          id?: string
          prediction_text: string
          region: string
          trend_direction: string
          valid_until: string
        }
        Update: {
          commodity_id?: string
          confidence_score?: number
          created_at?: string
          factors?: Json | null
          id?: string
          prediction_text?: string
          region?: string
          trend_direction?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_trends_commodity_id_fkey"
            columns: ["commodity_id"]
            isOneToOne: false
            referencedRelation: "commodities"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          comment_notifications: boolean
          created_at: string
          email_notifications: boolean
          follow_notifications: boolean
          id: string
          mention_notifications: boolean
          push_notifications: boolean
          reaction_notifications: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          comment_notifications?: boolean
          created_at?: string
          email_notifications?: boolean
          follow_notifications?: boolean
          id?: string
          mention_notifications?: boolean
          push_notifications?: boolean
          reaction_notifications?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          comment_notifications?: boolean
          created_at?: string
          email_notifications?: boolean
          follow_notifications?: boolean
          id?: string
          mention_notifications?: boolean
          push_notifications?: boolean
          reaction_notifications?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_queue: {
        Row: {
          created_at: string
          data: Json | null
          expires_at: string | null
          id: string
          message: string
          notification_type: string
          priority: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          expires_at?: string | null
          id?: string
          message: string
          notification_type: string
          priority?: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          expires_at?: string | null
          id?: string
          message?: string
          notification_type?: string
          priority?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          expires_at: string | null
          id: string
          is_read: boolean | null
          message: string
          priority: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          priority?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          priority?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      plant_diseases: {
        Row: {
          affected_parts: string[] | null
          confidence_score: number | null
          created_at: string
          disease_name: string
          disease_type: string
          id: string
          image_url: string | null
          plant_name: string | null
          severity_level: string | null
          symptoms_detected: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          affected_parts?: string[] | null
          confidence_score?: number | null
          created_at?: string
          disease_name: string
          disease_type: string
          id?: string
          image_url?: string | null
          plant_name?: string | null
          severity_level?: string | null
          symptoms_detected?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          affected_parts?: string[] | null
          confidence_score?: number | null
          created_at?: string
          disease_name?: string
          disease_type?: string
          id?: string
          image_url?: string | null
          plant_name?: string | null
          severity_level?: string | null
          symptoms_detected?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      plant_identifications: {
        Row: {
          care_instructions: string | null
          confidence_score: number | null
          created_at: string
          health_status: string | null
          id: string
          image_url: string | null
          plant_name: string | null
          user_id: string
        }
        Insert: {
          care_instructions?: string | null
          confidence_score?: number | null
          created_at?: string
          health_status?: string | null
          id?: string
          image_url?: string | null
          plant_name?: string | null
          user_id: string
        }
        Update: {
          care_instructions?: string | null
          confidence_score?: number | null
          created_at?: string
          health_status?: string | null
          id?: string
          image_url?: string | null
          plant_name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      post_attachments: {
        Row: {
          created_at: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          original_filename: string | null
          post_id: string
        }
        Insert: {
          created_at?: string
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          original_filename?: string | null
          post_id: string
        }
        Update: {
          created_at?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          original_filename?: string | null
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_attachments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          is_expert_response: boolean | null
          parent_comment_id: string | null
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_expert_response?: boolean | null
          parent_comment_id?: string | null
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_expert_response?: boolean | null
          parent_comment_id?: string | null
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_media: {
        Row: {
          created_at: string
          file_size: number | null
          id: string
          media_type: string
          media_url: string
          post_id: string
          thumbnail_url: string | null
        }
        Insert: {
          created_at?: string
          file_size?: number | null
          id?: string
          media_type: string
          media_url: string
          post_id: string
          thumbnail_url?: string | null
        }
        Update: {
          created_at?: string
          file_size?: number | null
          id?: string
          media_type?: string
          media_url?: string
          post_id?: string
          thumbnail_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_media_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reports: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reason: string | null
          report_type: string
          reported_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reason?: string | null
          report_type: string
          reported_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reason?: string | null
          report_type?: string
          reported_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_shares: {
        Row: {
          created_at: string
          id: string
          platform: string | null
          post_id: string
          share_type: string
          shared_by: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform?: string | null
          post_id: string
          share_type?: string
          shared_by: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string | null
          post_id?: string
          share_type?: string
          shared_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_shares_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_templates: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          template_content: Json
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          template_content: Json
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          template_content?: Json
        }
        Relationships: []
      }
      post_views: {
        Row: {
          id: string
          ip_address: unknown
          post_id: string
          session_id: string | null
          user_id: string | null
          viewed_at: string
        }
        Insert: {
          id?: string
          ip_address?: unknown
          post_id: string
          session_id?: string | null
          user_id?: string | null
          viewed_at?: string
        }
        Update: {
          id?: string
          ip_address?: unknown
          post_id?: string
          session_id?: string | null
          user_id?: string | null
          viewed_at?: string
        }
        Relationships: []
      }
      price_alerts: {
        Row: {
          alert_type: string
          commodity_id: string
          created_at: string
          id: string
          is_active: boolean
          last_triggered_at: string | null
          market_location_id: string | null
          threshold_value: number
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_type: string
          commodity_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          market_location_id?: string | null
          threshold_value: number
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_type?: string
          commodity_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          market_location_id?: string | null
          threshold_value?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_alerts_commodity_id_fkey"
            columns: ["commodity_id"]
            isOneToOne: false
            referencedRelation: "commodities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_alerts_market_location_id_fkey"
            columns: ["market_location_id"]
            isOneToOne: false
            referencedRelation: "market_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      price_history: {
        Row: {
          avg_price: number
          commodity_id: string
          created_at: string
          date: string
          id: string
          market_location_id: string
          max_price: number
          min_price: number
          price_volatility: number | null
          volume: number | null
        }
        Insert: {
          avg_price: number
          commodity_id: string
          created_at?: string
          date: string
          id?: string
          market_location_id: string
          max_price: number
          min_price: number
          price_volatility?: number | null
          volume?: number | null
        }
        Update: {
          avg_price?: number
          commodity_id?: string
          created_at?: string
          date?: string
          id?: string
          market_location_id?: string
          max_price?: number
          min_price?: number
          price_volatility?: number | null
          volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "price_history_commodity_id_fkey"
            columns: ["commodity_id"]
            isOneToOne: false
            referencedRelation: "commodities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_history_market_location_id_fkey"
            columns: ["market_location_id"]
            isOneToOne: false
            referencedRelation: "market_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          app_notifications: boolean | null
          avatar_url: string | null
          created_at: string
          crop_types: Database["public"]["Enums"]["crop_type"][] | null
          district: string | null
          email_notifications: boolean | null
          farm_type: string | null
          full_name: string | null
          gemini_api_key: string | null
          huggingface_api_key: string | null
          id: string
          kaggle_api_key: string | null
          last_active: string | null
          literacy_status: string | null
          location: string | null
          phone_number: string | null
          preferred_language:
            | Database["public"]["Enums"]["preferred_language"]
            | null
          profile_completed: boolean | null
          profile_completion_date: string | null
          region_type: Database["public"]["Enums"]["region_type"] | null
          role: Database["public"]["Enums"]["user_role"] | null
          sms_notifications: boolean | null
          soil_type: Database["public"]["Enums"]["soil_type"] | null
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          app_notifications?: boolean | null
          avatar_url?: string | null
          created_at?: string
          crop_types?: Database["public"]["Enums"]["crop_type"][] | null
          district?: string | null
          email_notifications?: boolean | null
          farm_type?: string | null
          full_name?: string | null
          gemini_api_key?: string | null
          huggingface_api_key?: string | null
          id?: string
          kaggle_api_key?: string | null
          last_active?: string | null
          literacy_status?: string | null
          location?: string | null
          phone_number?: string | null
          preferred_language?:
            | Database["public"]["Enums"]["preferred_language"]
            | null
          profile_completed?: boolean | null
          profile_completion_date?: string | null
          region_type?: Database["public"]["Enums"]["region_type"] | null
          role?: Database["public"]["Enums"]["user_role"] | null
          sms_notifications?: boolean | null
          soil_type?: Database["public"]["Enums"]["soil_type"] | null
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          app_notifications?: boolean | null
          avatar_url?: string | null
          created_at?: string
          crop_types?: Database["public"]["Enums"]["crop_type"][] | null
          district?: string | null
          email_notifications?: boolean | null
          farm_type?: string | null
          full_name?: string | null
          gemini_api_key?: string | null
          huggingface_api_key?: string | null
          id?: string
          kaggle_api_key?: string | null
          last_active?: string | null
          literacy_status?: string | null
          location?: string | null
          phone_number?: string | null
          preferred_language?:
            | Database["public"]["Enums"]["preferred_language"]
            | null
          profile_completed?: boolean | null
          profile_completion_date?: string | null
          region_type?: Database["public"]["Enums"]["region_type"] | null
          role?: Database["public"]["Enums"]["user_role"] | null
          sms_notifications?: boolean | null
          soil_type?: Database["public"]["Enums"]["soil_type"] | null
          state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      regional_disease_alerts: {
        Row: {
          affected_crops: string[] | null
          alert_date: string
          alert_level: string | null
          created_at: string
          created_by: string | null
          disease_name: string
          expires_at: string | null
          id: string
          outbreak_description: string | null
          prevention_measures: string | null
          region: string
        }
        Insert: {
          affected_crops?: string[] | null
          alert_date: string
          alert_level?: string | null
          created_at?: string
          created_by?: string | null
          disease_name: string
          expires_at?: string | null
          id?: string
          outbreak_description?: string | null
          prevention_measures?: string | null
          region: string
        }
        Update: {
          affected_crops?: string[] | null
          alert_date?: string
          alert_level?: string | null
          created_at?: string
          created_by?: string | null
          disease_name?: string
          expires_at?: string | null
          id?: string
          outbreak_description?: string | null
          prevention_measures?: string | null
          region?: string
        }
        Relationships: []
      }
      saved_posts: {
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
        Relationships: []
      }
      story_views: {
        Row: {
          id: string
          story_id: string
          viewed_at: string
          viewer_id: string
        }
        Insert: {
          id?: string
          story_id: string
          viewed_at?: string
          viewer_id: string
        }
        Update: {
          id?: string
          story_id?: string
          viewed_at?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "user_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      stream_viewers: {
        Row: {
          id: string
          joined_at: string
          left_at: string | null
          stream_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          left_at?: string | null
          stream_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          left_at?: string | null
          stream_id?: string
          user_id?: string
        }
        Relationships: []
      }
      trending_topics: {
        Row: {
          created_at: string
          id: string
          last_mentioned_at: string
          mention_count: number
          topic: string
          trend_score: number
        }
        Insert: {
          created_at?: string
          id?: string
          last_mentioned_at?: string
          mention_count?: number
          topic: string
          trend_score?: number
        }
        Update: {
          created_at?: string
          id?: string
          last_mentioned_at?: string
          mention_count?: number
          topic?: string
          trend_score?: number
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_name: string
          achievement_type: string
          badge_icon: string | null
          description: string | null
          id: string
          points_awarded: number | null
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_name: string
          achievement_type: string
          badge_icon?: string | null
          description?: string | null
          id?: string
          points_awarded?: number | null
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_name?: string
          achievement_type?: string
          badge_icon?: string | null
          description?: string | null
          id?: string
          points_awarded?: number | null
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_activity_feed: {
        Row: {
          activity_type: string
          created_at: string
          id: string
          metadata: Json | null
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_name: string
          badge_type: string
          description: string | null
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_name: string
          badge_type: string
          description?: string | null
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_name?: string
          badge_type?: string
          description?: string | null
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      user_mentions: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          id: string
          mentioned_user_id: string
          mentioning_user_id: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          mentioned_user_id: string
          mentioning_user_id: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          mentioned_user_id?: string
          mentioning_user_id?: string
        }
        Relationships: []
      }
      user_online_status: {
        Row: {
          is_online: boolean
          last_seen: string
          status_message: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          is_online?: boolean
          last_seen?: string
          status_message?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          is_online?: boolean
          last_seen?: string
          status_message?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_reputation: {
        Row: {
          best_answers: number
          created_at: string
          helpful_answers: number
          id: string
          level: number
          posts_count: number
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          best_answers?: number
          created_at?: string
          helpful_answers?: number
          id?: string
          level?: number
          posts_count?: number
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          best_answers?: number
          created_at?: string
          helpful_answers?: number
          id?: string
          level?: number
          posts_count?: number
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_stories: {
        Row: {
          background_color: string | null
          content_type: string
          created_at: string
          expires_at: string
          id: string
          image_url: string | null
          text_content: string | null
          user_id: string
          view_count: number
        }
        Insert: {
          background_color?: string | null
          content_type?: string
          created_at?: string
          expires_at?: string
          id?: string
          image_url?: string | null
          text_content?: string | null
          user_id: string
          view_count?: number
        }
        Update: {
          background_color?: string | null
          content_type?: string
          created_at?: string
          expires_at?: string
          id?: string
          image_url?: string | null
          text_content?: string | null
          user_id?: string
          view_count?: number
        }
        Relationships: []
      }
      user_watchlists: {
        Row: {
          commodity_id: string
          created_at: string
          id: string
          market_location_id: string | null
          user_id: string
        }
        Insert: {
          commodity_id: string
          created_at?: string
          id?: string
          market_location_id?: string | null
          user_id: string
        }
        Update: {
          commodity_id?: string
          created_at?: string
          id?: string
          market_location_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_watchlists_commodity_id_fkey"
            columns: ["commodity_id"]
            isOneToOne: false
            referencedRelation: "commodities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_watchlists_market_location_id_fkey"
            columns: ["market_location_id"]
            isOneToOne: false
            referencedRelation: "market_locations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      user_stats: {
        Row: {
          all_roles: Database["public"]["Enums"]["user_role"][] | null
          created_at: string | null
          full_name: string | null
          last_active: string | null
          preferred_language:
            | Database["public"]["Enums"]["preferred_language"]
            | null
          profile_completed: boolean | null
          profile_completion_date: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          total_chats: number | null
          total_plant_identifications: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_trending_posts: {
        Args: { limit_count?: number; time_window?: unknown }
        Returns: {
          category: string
          comment_count: number
          content: string
          created_at: string
          post_id: string
          reaction_count: number
          title: string
          trending_score: number
          user_id: string
          view_count: number
        }[]
      }
      get_user_profile: {
        Args: { p_user_id: string }
        Returns: {
          app_notifications: boolean
          created_at: string
          crop_types: Database["public"]["Enums"]["crop_type"][]
          district: string
          email_notifications: boolean
          full_name: string
          id: string
          preferred_language: Database["public"]["Enums"]["preferred_language"]
          profile_completed: boolean
          region_type: Database["public"]["Enums"]["region_type"]
          role: Database["public"]["Enums"]["user_role"]
          sms_notifications: boolean
          soil_type: Database["public"]["Enums"]["soil_type"]
          state: string
          updated_at: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      update_user_online_status: {
        Args: {
          p_is_online: boolean
          p_status_message?: string
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      crop_type:
        | "rice"
        | "wheat"
        | "sugarcane"
        | "cotton"
        | "maize"
        | "soybean"
        | "pulses"
        | "vegetables"
        | "fruits"
        | "spices"
        | "other"
      preferred_language:
        | "english"
        | "hindi"
        | "tamil"
        | "telugu"
        | "kannada"
        | "marathi"
        | "gujarati"
        | "bengali"
        | "punjabi"
        | "malayalam"
        | "spanish"
        | "portuguese"
        | "japanese"
        | "indonesian"
      region_type: "rainfed" | "irrigated"
      soil_type:
        | "clay"
        | "loam"
        | "sandy"
        | "red"
        | "black"
        | "alluvial"
        | "laterite"
      user_role: "farmer" | "expert" | "admin"
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
      crop_type: [
        "rice",
        "wheat",
        "sugarcane",
        "cotton",
        "maize",
        "soybean",
        "pulses",
        "vegetables",
        "fruits",
        "spices",
        "other",
      ],
      preferred_language: [
        "english",
        "hindi",
        "tamil",
        "telugu",
        "kannada",
        "marathi",
        "gujarati",
        "bengali",
        "punjabi",
        "malayalam",
        "spanish",
        "portuguese",
        "japanese",
        "indonesian",
      ],
      region_type: ["rainfed", "irrigated"],
      soil_type: [
        "clay",
        "loam",
        "sandy",
        "red",
        "black",
        "alluvial",
        "laterite",
      ],
      user_role: ["farmer", "expert", "admin"],
    },
  },
} as const
