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
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: number
          new_data: Json | null
          old_data: Json | null
          summary: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: number
          new_data?: Json | null
          old_data?: Json | null
          summary?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: number
          new_data?: Json | null
          old_data?: Json | null
          summary?: string | null
        }
        Relationships: []
      }
      checklist_templates: {
        Row: {
          checklist_json: Json
          created_at: string
          department_id: string
          id: string
          is_active: boolean
          template_name: string
          version: number
        }
        Insert: {
          checklist_json?: Json
          created_at?: string
          department_id: string
          id?: string
          is_active?: boolean
          template_name: string
          version?: number
        }
        Update: {
          checklist_json?: Json
          created_at?: string
          department_id?: string
          id?: string
          is_active?: boolean
          template_name?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "checklist_templates_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      complaints: {
        Row: {
          category: string | null
          created_at: string
          department_id: string
          description: string
          establishment_id: string
          id: string
          priority: string
          status: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          department_id: string
          description: string
          establishment_id: string
          id?: string
          priority?: string
          status?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          department_id?: string
          description?: string
          establishment_id?: string
          id?: string
          priority?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaints_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      establishments: {
        Row: {
          address: string | null
          business_type: string | null
          category: string | null
          contact_details: Json
          created_at: string
          department_id: string
          expiry_date: string | null
          id: string
          latitude: number | null
          longitude: number | null
          metadata: Json
          name: string
          owner_name: string | null
          pincode: string | null
          registration_date: string | null
          registration_number: string
          status: Database["public"]["Enums"]["establishment_status"]
        }
        Insert: {
          address?: string | null
          business_type?: string | null
          category?: string | null
          contact_details?: Json
          created_at?: string
          department_id: string
          expiry_date?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          metadata?: Json
          name: string
          owner_name?: string | null
          pincode?: string | null
          registration_date?: string | null
          registration_number: string
          status?: Database["public"]["Enums"]["establishment_status"]
        }
        Update: {
          address?: string | null
          business_type?: string | null
          category?: string | null
          contact_details?: Json
          created_at?: string
          department_id?: string
          expiry_date?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          metadata?: Json
          name?: string
          owner_name?: string | null
          pincode?: string | null
          registration_date?: string | null
          registration_number?: string
          status?: Database["public"]["Enums"]["establishment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "establishments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      inspections: {
        Row: {
          actual_date: string | null
          checklist: Json
          created_at: string
          department_id: string
          establishment_id: string
          evidence_summary: Json
          findings: Json
          id: string
          inspector_id: string
          notes: string | null
          risk_score_at_inspection: number | null
          scheduled_date: string
          status: Database["public"]["Enums"]["inspection_status"]
          supervisor_id: string
          template_id: string | null
        }
        Insert: {
          actual_date?: string | null
          checklist?: Json
          created_at?: string
          department_id: string
          establishment_id: string
          evidence_summary?: Json
          findings?: Json
          id?: string
          inspector_id: string
          notes?: string | null
          risk_score_at_inspection?: number | null
          scheduled_date: string
          status?: Database["public"]["Enums"]["inspection_status"]
          supervisor_id: string
          template_id?: string | null
        }
        Update: {
          actual_date?: string | null
          checklist?: Json
          created_at?: string
          department_id?: string
          establishment_id?: string
          evidence_summary?: Json
          findings?: Json
          id?: string
          inspector_id?: string
          notes?: string | null
          risk_score_at_inspection?: number | null
          scheduled_date?: string
          status?: Database["public"]["Enums"]["inspection_status"]
          supervisor_id?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspections_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          department_id: string | null
          email: string
          employee_id: string | null
          id: string
          is_active: boolean
          jurisdiction: Json
          login_password: string | null
          name: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          email?: string
          employee_id?: string | null
          id: string
          is_active?: boolean
          jurisdiction?: Json
          login_password?: string | null
          name?: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          department_id?: string | null
          email?: string
          employee_id?: string | null
          id?: string
          is_active?: boolean
          jurisdiction?: Json
          login_password?: string | null
          name?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_fk"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_profiles: {
        Row: {
          calculated_at: string
          department_id: string
          establishment_id: string
          factors: Json
          id: string
          last_inspection_date: string | null
          next_due_date: string | null
          risk_level: string
          risk_score: number
        }
        Insert: {
          calculated_at?: string
          department_id: string
          establishment_id: string
          factors?: Json
          id?: string
          last_inspection_date?: string | null
          next_due_date?: string | null
          risk_level?: string
          risk_score?: number
        }
        Update: {
          calculated_at?: string
          department_id?: string
          establishment_id?: string
          factors?: Json
          id?: string
          last_inspection_date?: string | null
          next_due_date?: string | null
          risk_level?: string
          risk_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "risk_profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_profiles_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
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
      admin_count: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "inspector" | "supervisor"
      establishment_status: "active" | "suspended" | "archived"
      inspection_status: "pending" | "in_progress" | "completed" | "cancelled"
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
      app_role: ["admin", "inspector", "supervisor"],
      establishment_status: ["active", "suspended", "archived"],
      inspection_status: ["pending", "in_progress", "completed", "cancelled"],
    },
  },
} as const
