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
      benchmarks: {
        Row: {
          created_at: string
          id: string
          phase: string
          taken_at: string
          test_key: string
          unit: string
          updated_at: string
          user_id: string
          user_program_id: string
          value: number
        }
        Insert: {
          created_at?: string
          id: string
          phase: string
          taken_at?: string
          test_key: string
          unit: string
          updated_at?: string
          user_id: string
          user_program_id: string
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          phase?: string
          taken_at?: string
          test_key?: string
          unit?: string
          updated_at?: string
          user_id?: string
          user_program_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "benchmarks_user_program_id_fkey"
            columns: ["user_program_id"]
            isOneToOne: false
            referencedRelation: "user_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      body_metrics: {
        Row: {
          created_at: string
          date: string
          deleted_at: string | null
          id: string
          updated_at: string
          user_id: string
          waist_cm: number | null
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          date: string
          deleted_at?: string | null
          id: string
          updated_at?: string
          user_id: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          date?: string
          deleted_at?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      daily_chain: {
        Row: {
          created_at: string
          date: string
          hourly_walks: number
          id: string
          is_complete: boolean | null
          mobility_done: boolean
          steps: number
          updated_at: string
          user_id: string
          user_program_id: string | null
        }
        Insert: {
          created_at?: string
          date: string
          hourly_walks?: number
          id: string
          is_complete?: boolean | null
          mobility_done?: boolean
          steps?: number
          updated_at?: string
          user_id: string
          user_program_id?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          hourly_walks?: number
          id?: string
          is_complete?: boolean | null
          mobility_done?: boolean
          steps?: number
          updated_at?: string
          user_id?: string
          user_program_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_chain_user_program_id_fkey"
            columns: ["user_program_id"]
            isOneToOne: false
            referencedRelation: "user_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          created_at: string
          cues: Json | null
          id: string
          is_bodyweight: boolean
          metric_type: Database["public"]["Enums"]["exercise_metric"]
          name: Json
          slug: string
        }
        Insert: {
          created_at?: string
          cues?: Json | null
          id?: string
          is_bodyweight?: boolean
          metric_type: Database["public"]["Enums"]["exercise_metric"]
          name: Json
          slug: string
        }
        Update: {
          created_at?: string
          cues?: Json | null
          id?: string
          is_bodyweight?: boolean
          metric_type?: Database["public"]["Enums"]["exercise_metric"]
          name?: Json
          slug?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          height_cm: number | null
          id: string
          locale: string
          unit_system: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          height_cm?: number | null
          id: string
          locale?: string
          unit_system?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          height_cm?: number | null
          id?: string
          locale?: string
          unit_system?: string
          updated_at?: string
        }
        Relationships: []
      }
      program_days: {
        Row: {
          day_type: Database["public"]["Enums"]["day_type"]
          id: string
          name: Json
          program_id: string
        }
        Insert: {
          day_type: Database["public"]["Enums"]["day_type"]
          id?: string
          name: Json
          program_id: string
        }
        Update: {
          day_type?: Database["public"]["Enums"]["day_type"]
          id?: string
          name?: Json
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_days_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_exercises: {
        Row: {
          active_from_week: number
          active_to_week: number | null
          exercise_id: string
          id: string
          order_index: number
          program_day_id: string
          progression: Json | null
          target_distance_m: number | null
          target_reps: number | null
          target_seconds: number | null
          target_sets: number | null
          target_weight_kg: number | null
        }
        Insert: {
          active_from_week?: number
          active_to_week?: number | null
          exercise_id: string
          id?: string
          order_index: number
          program_day_id: string
          progression?: Json | null
          target_distance_m?: number | null
          target_reps?: number | null
          target_seconds?: number | null
          target_sets?: number | null
          target_weight_kg?: number | null
        }
        Update: {
          active_from_week?: number
          active_to_week?: number | null
          exercise_id?: string
          id?: string
          order_index?: number
          program_day_id?: string
          progression?: Json | null
          target_distance_m?: number | null
          target_reps?: number | null
          target_seconds?: number | null
          target_sets?: number | null
          target_weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "program_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_exercises_program_day_id_fkey"
            columns: ["program_day_id"]
            isOneToOne: false
            referencedRelation: "program_days"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          created_at: string
          duration_days: number
          id: string
          name: Json
          slug: string
          version: number
        }
        Insert: {
          created_at?: string
          duration_days?: number
          id?: string
          name: Json
          slug: string
          version?: number
        }
        Update: {
          created_at?: string
          duration_days?: number
          id?: string
          name?: Json
          slug?: string
          version?: number
        }
        Relationships: []
      }
      progression_state: {
        Row: {
          created_at: string
          current_target_reps: number | null
          current_weight_kg: number | null
          exercise_id: string
          id: string
          unlocked_variant: string | null
          updated_at: string
          user_id: string
          user_program_id: string
        }
        Insert: {
          created_at?: string
          current_target_reps?: number | null
          current_weight_kg?: number | null
          exercise_id: string
          id: string
          unlocked_variant?: string | null
          updated_at?: string
          user_id: string
          user_program_id: string
        }
        Update: {
          created_at?: string
          current_target_reps?: number | null
          current_weight_kg?: number | null
          exercise_id?: string
          id?: string
          unlocked_variant?: string | null
          updated_at?: string
          user_id?: string
          user_program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "progression_state_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progression_state_user_program_id_fkey"
            columns: ["user_program_id"]
            isOneToOne: false
            referencedRelation: "user_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          day_type: Database["public"]["Enums"]["day_type"]
          deleted_at: string | null
          id: string
          notes: string | null
          scheduled_date: string
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
          user_program_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          day_type: Database["public"]["Enums"]["day_type"]
          deleted_at?: string | null
          id: string
          notes?: string | null
          scheduled_date: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
          user_program_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          day_type?: Database["public"]["Enums"]["day_type"]
          deleted_at?: string | null
          id?: string
          notes?: string | null
          scheduled_date?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          user_program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_user_program_id_fkey"
            columns: ["user_program_id"]
            isOneToOne: false
            referencedRelation: "user_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      set_logs: {
        Row: {
          created_at: string
          deleted_at: string | null
          distance_m: number | null
          duration_sec: number | null
          exercise_id: string
          id: string
          pain_flag: boolean
          reps: number | null
          rpe: string | null
          session_id: string
          set_index: number
          updated_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          distance_m?: number | null
          duration_sec?: number | null
          exercise_id: string
          id: string
          pain_flag?: boolean
          reps?: number | null
          rpe?: string | null
          session_id: string
          set_index: number
          updated_at?: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          distance_m?: number | null
          duration_sec?: number | null
          exercise_id?: string
          id?: string
          pain_flag?: boolean
          reps?: number | null
          rpe?: string | null
          session_id?: string
          set_index?: number
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "set_logs_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "set_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_programs: {
        Row: {
          created_at: string
          id: string
          program_id: string
          start_date: string
          status: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          program_id: string
          start_date: string
          status?: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          program_id?: string
          start_date?: string
          status?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_programs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      day_type: "strength_a" | "strength_b" | "walk" | "long_walk" | "rest"
      exercise_metric: "reps" | "reps_weight" | "time" | "distance_weight"
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
      day_type: ["strength_a", "strength_b", "walk", "long_walk", "rest"],
      exercise_metric: ["reps", "reps_weight", "time", "distance_weight"],
    },
  },
} as const
