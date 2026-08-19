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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      allocations: {
        Row: {
          created_at: string
          duty_role: Database["public"]["Enums"]["allocation_role"]
          exam_id: string
          id: string
          notes: string | null
          published: boolean
          room_id: string | null
          status: Database["public"]["Enums"]["allocation_status"]
          teacher_id: string
        }
        Insert: {
          created_at?: string
          duty_role?: Database["public"]["Enums"]["allocation_role"]
          exam_id: string
          id?: string
          notes?: string | null
          published?: boolean
          room_id?: string | null
          status?: Database["public"]["Enums"]["allocation_status"]
          teacher_id: string
        }
        Update: {
          created_at?: string
          duty_role?: Database["public"]["Enums"]["allocation_role"]
          exam_id?: string
          id?: string
          notes?: string | null
          published?: boolean
          room_id?: string | null
          status?: Database["public"]["Enums"]["allocation_status"]
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "allocations_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_requests: {
        Row: {
          admin_read_at: string | null
          created_at: string
          exam_id: string
          id: string
          original_teacher_id: string | null
          reason: string
          replacement_teacher_id: string | null
          requested_by: string
          resolved_at: string | null
          room_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_read_at?: string | null
          created_at?: string
          exam_id: string
          id?: string
          original_teacher_id?: string | null
          reason?: string
          replacement_teacher_id?: string | null
          requested_by: string
          resolved_at?: string | null
          room_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_read_at?: string | null
          created_at?: string
          exam_id?: string
          id?: string
          original_teacher_id?: string | null
          reason?: string
          replacement_teacher_id?: string | null
          requested_by?: string
          resolved_at?: string | null
          room_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_requests_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_requests_original_teacher_id_fkey"
            columns: ["original_teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_requests_replacement_teacher_id_fkey"
            columns: ["replacement_teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_requests_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_rooms: {
        Row: {
          exam_id: string
          id: string
          room_id: string
          students_allocated: number
        }
        Insert: {
          exam_id: string
          id?: string
          room_id: string
          students_allocated?: number
        }
        Update: {
          exam_id?: string
          id?: string
          room_id?: string
          students_allocated?: number
        }
        Relationships: [
          {
            foreignKeyName: "exam_rooms_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_rooms_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          created_at: string
          duration_minutes: number
          exam_date: string
          exam_type: Database["public"]["Enums"]["exam_type"]
          id: string
          name: string
          reporting_minutes: number
          start_time: string
          status: Database["public"]["Enums"]["exam_status"]
        }
        Insert: {
          created_at?: string
          duration_minutes?: number
          exam_date: string
          exam_type: Database["public"]["Enums"]["exam_type"]
          id?: string
          name: string
          reporting_minutes?: number
          start_time?: string
          status?: Database["public"]["Enums"]["exam_status"]
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          exam_date?: string
          exam_type?: Database["public"]["Enums"]["exam_type"]
          id?: string
          name?: string
          reporting_minutes?: number
          start_time?: string
          status?: Database["public"]["Enums"]["exam_status"]
        }
        Relationships: []
      }
      leaves: {
        Row: {
          created_at: string
          end_date: string
          id: string
          reason: string | null
          start_date: string
          status: Database["public"]["Enums"]["leave_status"]
          teacher_id: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          reason?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["leave_status"]
          teacher_id: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          reason?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["leave_status"]
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaves_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          department: string
          designation: string
          email: string | null
          employee_id: string | null
          full_name: string
          id: string
          is_senior: boolean
          max_duties: number
          phone: string | null
          staff_type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          department?: string
          designation?: string
          email?: string | null
          employee_id?: string | null
          full_name?: string
          id: string
          is_senior?: boolean
          max_duties?: number
          phone?: string | null
          staff_type?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          department?: string
          designation?: string
          email?: string | null
          employee_id?: string | null
          full_name?: string
          id?: string
          is_senior?: boolean
          max_duties?: number
          phone?: string | null
          staff_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      rooms: {
        Row: {
          active: boolean
          block: string
          capacity: number
          created_at: string
          floor: number
          id: string
          room_number: string
        }
        Insert: {
          active?: boolean
          block: string
          capacity?: number
          created_at?: string
          floor: number
          id?: string
          room_number: string
        }
        Update: {
          active?: boolean
          block?: string
          capacity?: number
          created_at?: string
          floor?: number
          id?: string
          room_number?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          attendance_window_minutes: number
          id: number
          internal_duration: number
          max_duties: number
          reporting_minutes: number
          semester_duration: number
          standby_percentage: number
          two_invigilator_threshold: number
        }
        Insert: {
          attendance_window_minutes?: number
          id?: number
          internal_duration?: number
          max_duties?: number
          reporting_minutes?: number
          semester_duration?: number
          standby_percentage?: number
          two_invigilator_threshold?: number
        }
        Update: {
          attendance_window_minutes?: number
          id?: number
          internal_duration?: number
          max_duties?: number
          reporting_minutes?: number
          semester_duration?: number
          standby_percentage?: number
          two_invigilator_threshold?: number
        }
        Relationships: []
      }
      staff_requests: {
        Row: {
          admin_read_at: string | null
          created_at: string
          department: string
          designation: string
          email: string
          full_name: string
          id: string
          is_senior: boolean
          max_duties: number
          reason: string
          requested_by: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          staff_type: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_read_at?: string | null
          created_at?: string
          department?: string
          designation?: string
          email: string
          full_name: string
          id?: string
          is_senior?: boolean
          max_duties?: number
          reason?: string
          requested_by: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          staff_type?: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_read_at?: string | null
          created_at?: string
          department?: string
          designation?: string
          email?: string
          full_name?: string
          id?: string
          is_senior?: boolean
          max_duties?: number
          reason?: string
          requested_by?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          staff_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          active: boolean
          created_at: string
          department: string
          full_name: string
          id: string
          register_no: string
          semester: number
          serial_no: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          department?: string
          full_name: string
          id?: string
          register_no: string
          semester?: number
          serial_no: number
        }
        Update: {
          active?: boolean
          created_at?: string
          department?: string
          full_name?: string
          id?: string
          register_no?: string
          semester?: number
          serial_no?: number
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
          role: Database["public"]["Enums"]["app_role"]
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
      [_ in never]: never
    }
    Enums: {
      allocation_role: "primary" | "secondary" | "standby"
      allocation_status: "pending" | "accepted" | "declined" | "replaced"
      app_role: "super_admin" | "admin" | "teacher"
      exam_status: "draft" | "published" | "completed" | "cancelled"
      exam_type: "internal" | "semester"
      leave_status: "pending" | "approved" | "rejected"
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
      allocation_role: ["primary", "secondary", "standby"],
      allocation_status: ["pending", "accepted", "declined", "replaced"],
      app_role: ["super_admin", "admin", "teacher"],
      exam_status: ["draft", "published", "completed", "cancelled"],
      exam_type: ["internal", "semester"],
      leave_status: ["pending", "approved", "rejected"],
    },
  },
} as const
