/**
 * 跑步模块运动员档案管理
 * 
 * 使用 Supabase 存储运动员档案
 */

import { supabase } from "../../supabase-client"

export interface RunnerProfile {
  id: string
  user_id: string
  name: string
  gender?: "male" | "female" | "other"
  birth_date?: string
  height_cm?: number
  weight_kg?: number
  max_heart_rate?: number
  resting_heart_rate?: number
  primary_goal?: "5k" | "10k" | "half" | "marathon" | "fatloss" | "base" | "maintenance"
  experience_level?: "beginner" | "intermediate" | "advanced"
  notes?: string
  created_at: string
  updated_at: string
}

/**
 * 获取或创建默认运动员档案
 * 
 * 单用户模式下，如果没有运动员档案，自动创建一个
 */
export async function getOrCreateDefaultAthlete(
  userId: string,
  userEmail: string
): Promise<{ success: boolean; athleteId?: string; error?: string }> {
  try {
    // 1. 查询现有运动员档案
    const { data: existing, error: queryError } = await supabase
      .from("athletes")
      .select("id")
      .eq("user_id", userId)
      .eq("primary_sport", "running")
      .limit(1)

    if (queryError) throw queryError

    // 2. 如果存在，返回第一个
    if (existing && existing.length > 0) {
      return { success: true, athleteId: existing[0].id }
    }

    // 3. 不存在则创建新档案
    const { data: newAthlete, error: createError } = await supabase
      .from("athletes")
      .insert({
        user_id: userId,
        name: userEmail.split("@")[0] || "Runner", // 使用邮箱前缀作为默认名称
        primary_sport: "running",
        notes: "自动创建的跑步运动员档案",
      })
      .select()
      .single()

    if (createError) throw createError
    if (!newAthlete) throw new Error("创建运动员档案失败")

    return { success: true, athleteId: newAthlete.id }
  } catch (err: any) {
    console.error("Get or create athlete error:", err)
    return { success: false, error: err.message }
  }
}

/**
 * 获取运动员档案
 */
export async function getAthlete(athleteId: string): Promise<{ 
  success: boolean; 
  athlete?: RunnerProfile; 
  error?: string 
}> {
  try {
    const { data, error } = await supabase
      .from("athletes")
      .select("*")
      .eq("id", athleteId)
      .single()

    if (error) throw error

    return { success: true, athlete: data as RunnerProfile }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * 更新运动员档案
 */
export async function updateAthlete(
  athleteId: string,
  updates: Partial<Omit<RunnerProfile, "id" | "user_id" | "created_at" | "updated_at">>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("athletes")
      .update(updates)
      .eq("id", athleteId)

    if (error) throw error

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * 获取用户的所有运动员档案
 */
export async function getUserAthletes(
  userId: string
): Promise<{ success: boolean; athletes?: RunnerProfile[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("athletes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) throw error

    return { success: true, athletes: data as RunnerProfile[] }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
