export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      families: {
        Row: {
          id: string
          name: string
          owner_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          owner_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          owner_id?: string
          created_at?: string
        }
        Relationships: []
      }
      children: {
        Row: {
          id: string
          family_id: string
          name: string
          age: number
          avatar: string
          daily_limit_minutes: number
          accumulate_extra: boolean
          created_at: string
        }
        Insert: {
          id?: string
          family_id: string
          name: string
          age: number
          avatar: string
          daily_limit_minutes: number
          accumulate_extra?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          name?: string
          age?: number
          avatar?: string
          daily_limit_minutes?: number
          accumulate_extra?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "children_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          }
        ]
      }
      tasks: {
        Row: {
          id: string
          family_id: string
          name: string
          icon: string
          reward_minutes: number
          min_age: number | null
          max_age: number | null
          created_at: string
        }
        Insert: {
          id?: string
          family_id: string
          name: string
          icon: string
          reward_minutes: number
          min_age?: number | null
          max_age?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          name?: string
          icon?: string
          reward_minutes?: number
          min_age?: number | null
          max_age?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          }
        ]
      }
      assigned_tasks: {
        Row: {
          id: string
          child_id: string
          task_id: string
          date: string
          status: 'pending' | 'completed'
          minutes_granted: number
          created_at: string
        }
        Insert: {
          id?: string
          child_id: string
          task_id: string
          date: string
          status?: 'pending' | 'completed'
          minutes_granted: number
          created_at?: string
        }
        Update: {
          id?: string
          child_id?: string
          task_id?: string
          date?: string
          status?: 'pending' | 'completed'
          minutes_granted?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assigned_tasks_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assigned_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          }
        ]
      }
      minute_records: {
        Row: {
          id: string
          child_id: string
          date: string
          minutes_earned: number
          minutes_used: number
          minutes_carried_over: number
          created_at: string
        }
        Insert: {
          id?: string
          child_id: string
          date: string
          minutes_earned?: number
          minutes_used?: number
          minutes_carried_over?: number
          created_at?: string
        }
        Update: {
          id?: string
          child_id?: string
          date?: string
          minutes_earned?: number
          minutes_used?: number
          minutes_carried_over?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "minute_records_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          }
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
