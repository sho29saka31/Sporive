/**
 * Supabaseスキーマの型定義。
 * supabase/migrations/ の内容と一致させる（CLIでの型生成は未接続のため手書き管理）。
 */

export type GoalType =
  | "lose_weight"
  | "gain_muscle"
  | "strength"
  | "senior_maintenance";

export type GenderType = "male" | "female" | "other";

export type PlanStatus = "draft" | "active" | "archived";
export type PlanSource = "ai" | "manual";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          birth_year: number;
          goal: GoalType;
          gender: GenderType | null;
          is_admin: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          birth_year: number;
          goal: GoalType;
          gender?: GenderType | null;
          is_admin?: boolean;
        };
        Update: Partial<{
          display_name: string;
          birth_year: number;
          goal: GoalType;
          gender: GenderType | null;
          is_admin: boolean;
        }>;
        Relationships: [];
      };
      calendar_tokens: {
        Row: {
          user_id: string;
          refresh_token: string;
          scope: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          refresh_token: string;
          scope: string;
          updated_at?: string;
        };
        Update: Partial<{
          refresh_token: string;
          scope: string;
          updated_at: string;
        }>;
        Relationships: [];
      };
      training_plans: {
        Row: {
          id: string;
          user_id: string;
          week_start_date: string;
          status: PlanStatus;
          source: PlanSource;
          summary: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          week_start_date: string;
          status?: PlanStatus;
          source: PlanSource;
          summary?: string | null;
        };
        Update: Partial<{
          week_start_date: string;
          status: PlanStatus;
          source: PlanSource;
          summary: string | null;
        }>;
        Relationships: [];
      };
      plan_items: {
        Row: {
          id: string;
          plan_id: string;
          day_of_week: number;
          exercise_name: string;
          category: string | null;
          sets: number | null;
          reps: number | null;
          weight_kg: number | null;
          duration_min: number | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          plan_id: string;
          day_of_week: number;
          exercise_name: string;
          category?: string | null;
          sets?: number | null;
          reps?: number | null;
          weight_kg?: number | null;
          duration_min?: number | null;
          sort_order?: number;
        };
        Update: Partial<{
          day_of_week: number;
          exercise_name: string;
          category: string | null;
          sets: number | null;
          reps: number | null;
          weight_kg: number | null;
          duration_min: number | null;
          sort_order: number;
        }>;
        Relationships: [];
      };
      workout_logs: {
        Row: {
          id: string;
          user_id: string;
          plan_item_id: string | null;
          performed_on: string;
          sets_done: number | null;
          reps_done: number | null;
          weight_kg: number | null;
          duration_min: number | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan_item_id?: string | null;
          performed_on: string;
          sets_done?: number | null;
          reps_done?: number | null;
          weight_kg?: number | null;
          duration_min?: number | null;
          note?: string | null;
        };
        Update: Partial<{
          plan_item_id: string | null;
          performed_on: string;
          sets_done: number | null;
          reps_done: number | null;
          weight_kg: number | null;
          duration_min: number | null;
          note: string | null;
        }>;
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
        };
        Update: Partial<{
          endpoint: string;
          p256dh: string;
          auth: string;
        }>;
        Relationships: [];
      };
      notification_settings: {
        Row: {
          user_id: string;
          daily_reminder_enabled: boolean;
          debt_reminder_enabled: boolean;
          notify_time: string;
          timezone: string;
          last_notified_on: string | null;
        };
        Insert: {
          user_id: string;
          daily_reminder_enabled?: boolean;
          debt_reminder_enabled?: boolean;
          notify_time?: string;
          timezone?: string;
          last_notified_on?: string | null;
        };
        Update: Partial<{
          daily_reminder_enabled: boolean;
          debt_reminder_enabled: boolean;
          notify_time: string;
          timezone: string;
          last_notified_on: string | null;
        }>;
        Relationships: [];
      };
      debts: {
        Row: {
          id: string;
          user_id: string;
          plan_item_id: string | null;
          missed_on: string;
          sets_remaining: number;
          reps_remaining: number;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan_item_id?: string | null;
          missed_on: string;
          sets_remaining?: number;
          reps_remaining?: number;
          resolved_at?: string | null;
        };
        Update: Partial<{
          sets_remaining: number;
          reps_remaining: number;
          resolved_at: string | null;
        }>;
        Relationships: [];
      };
      streaks: {
        Row: {
          user_id: string;
          current_streak: number;
          longest_streak: number;
          last_achieved_on: string | null;
        };
        Insert: {
          user_id: string;
          current_streak?: number;
          longest_streak?: number;
          last_achieved_on?: string | null;
        };
        Update: Partial<{
          current_streak: number;
          longest_streak: number;
          last_achieved_on: string | null;
        }>;
        Relationships: [];
      };
      ai_proposal_logs: {
        Row: {
          id: string;
          user_id: string;
          goal: string;
          proposal_json: unknown;
          accepted: boolean | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          goal: string;
          proposal_json: unknown;
          accepted?: boolean | null;
        };
        Update: Partial<{
          accepted: boolean | null;
        }>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
