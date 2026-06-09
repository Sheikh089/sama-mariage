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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      event_staff: {
        Row: {
          created_at: string
          event_id: string
          full_name: string
          id: string
          pin_hash: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          full_name: string
          id?: string
          pin_hash: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          full_name?: string
          id?: string
          pin_hash?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_staff_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_staff_sessions: {
        Row: {
          created_at: string
          event_id: string
          expires_at: string
          staff_id: string
          token: string
        }
        Insert: {
          created_at?: string
          event_id: string
          expires_at: string
          staff_id: string
          token?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          expires_at?: string
          staff_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_staff_sessions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_staff_sessions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "event_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          cover_image_url: string | null
          created_at: string
          custom_message: string | null
          description: string | null
          event_date: string | null
          id: string
          location: string | null
          max_guests: number
          status: Database["public"]["Enums"]["event_status"]
          template: Database["public"]["Enums"]["invitation_template"]
          title: string
          type: Database["public"]["Enums"]["event_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          custom_message?: string | null
          description?: string | null
          event_date?: string | null
          id?: string
          location?: string | null
          max_guests?: number
          status?: Database["public"]["Enums"]["event_status"]
          template?: Database["public"]["Enums"]["invitation_template"]
          title: string
          type?: Database["public"]["Enums"]["event_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          custom_message?: string | null
          description?: string | null
          event_date?: string | null
          id?: string
          location?: string | null
          max_guests?: number
          status?: Database["public"]["Enums"]["event_status"]
          template?: Database["public"]["Enums"]["invitation_template"]
          title?: string
          type?: Database["public"]["Enums"]["event_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      guests: {
        Row: {
          checked_in_at: string | null
          companions: number
          created_at: string
          email: string | null
          event_id: string
          full_name: string
          id: string
          invite_token: string
          notes: string | null
          phone: string | null
          rsvp_at: string | null
          rsvp_status: Database["public"]["Enums"]["rsvp_status"]
          table_number: string | null
          updated_at: string
        }
        Insert: {
          checked_in_at?: string | null
          companions?: number
          created_at?: string
          email?: string | null
          event_id: string
          full_name: string
          id?: string
          invite_token?: string
          notes?: string | null
          phone?: string | null
          rsvp_at?: string | null
          rsvp_status?: Database["public"]["Enums"]["rsvp_status"]
          table_number?: string | null
          updated_at?: string
        }
        Update: {
          checked_in_at?: string | null
          companions?: number
          created_at?: string
          email?: string | null
          event_id?: string
          full_name?: string
          id?: string
          invite_token?: string
          notes?: string | null
          phone?: string | null
          rsvp_at?: string | null
          rsvp_status?: Database["public"]["Enums"]["rsvp_status"]
          table_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      checkin_guest:
        | {
            Args: { _token: string }
            Returns: {
              already_checked_in: boolean
              checked_in_at: string
              companions: number
              event_id: string
              event_title: string
              full_name: string
              guest_id: string
              rsvp_status: Database["public"]["Enums"]["rsvp_status"]
            }[]
          }
        | {
            Args: { _session_token?: string; _token: string }
            Returns: {
              already_checked_in: boolean
              checked_in_at: string
              companions: number
              event_id: string
              event_title: string
              full_name: string
              guest_id: string
              rsvp_status: Database["public"]["Enums"]["rsvp_status"]
            }[]
          }
      create_event_staff: {
        Args: { _event_id: string; _full_name: string; _pin: string }
        Returns: string
      }
      get_invitation_by_token: {
        Args: { _token: string }
        Returns: {
          companions: number
          event_cover_image_url: string
          event_custom_message: string
          event_date: string
          event_description: string
          event_id: string
          event_location: string
          event_template: Database["public"]["Enums"]["invitation_template"]
          event_title: string
          event_type: Database["public"]["Enums"]["event_type"]
          full_name: string
          guest_id: string
          rsvp_status: Database["public"]["Enums"]["rsvp_status"]
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      staff_login: {
        Args: { _event_id: string; _full_name: string; _pin: string }
        Returns: {
          event_title: string
          expires_at: string
          session_token: string
          staff_id: string
        }[]
      }
      submit_rsvp: {
        Args: {
          _companions: number
          _status: Database["public"]["Enums"]["rsvp_status"]
          _token: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "organizer" | "scanner"
      event_status: "brouillon" | "publie" | "termine" | "annule"
      event_type:
        | "mariage"
        | "bapteme"
        | "fiancailles"
        | "anniversaire"
        | "autre"
      invitation_template:
        | "traditionnel"
        | "moderne"
        | "luxe"
        | "minimaliste"
        | "gold_premium"
      rsvp_status: "en_attente" | "confirme" | "refuse"
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
      app_role: ["admin", "organizer", "scanner"],
      event_status: ["brouillon", "publie", "termine", "annule"],
      event_type: [
        "mariage",
        "bapteme",
        "fiancailles",
        "anniversaire",
        "autre",
      ],
      invitation_template: [
        "traditionnel",
        "moderne",
        "luxe",
        "minimaliste",
        "gold_premium",
      ],
      rsvp_status: ["en_attente", "confirme", "refuse"],
    },
  },
} as const
