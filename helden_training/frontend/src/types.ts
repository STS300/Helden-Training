export const categories = ['Ganzer Körper', 'Oberkörper', 'Unterkörper', 'Beine', 'Push', 'Pull'];
export interface Profile { id: number; name: string; color: string }
export interface Exercise { id: number; name: string; categories: string[]; muscles: string; equipment: string; notes: string; start_seconds: number; end_seconds: number | null; has_video: boolean; video?: string }
export interface PlanItem { exercise_id: number; sets: number; reps: number; rest_seconds: number; weight: number; exercise_name?: string; exercise_archived?: number }
export interface Plan { id: number; name: string; category: string; items: PlanItem[] }
export interface Log { set_index: number; weight: number; reps: number; notes: string }
export interface SessionItem extends PlanItem { id: number; exercise: Exercise; skipped: boolean; logs: Log[]; previous: Record<string, Log> }
export interface SessionSummary { id: number; profile_id: number; plan_name: string; category: string; started_at: string; finished_at: string | null; logged_sets: number; volume: number }
export interface Session extends SessionSummary { items: SessionItem[] }
