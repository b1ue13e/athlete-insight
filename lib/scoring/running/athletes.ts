/**
 * Running athlete compatibility layer.
 *
 * Running now reuses the shared athlete profile service so all sports can land on
 * the same athlete entities.
 */

import {
  fetchAthleteById,
  getOrCreatePrimaryAthlete,
  listAthletes,
  updateAthlete as updateSharedAthlete,
  type AthleteProfile,
} from "../../athletes"

export interface RunnerProfile {
  id: string
  user_id?: string
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

function toRunnerProfile(athlete: AthleteProfile): RunnerProfile {
  return {
    id: athlete.id,
    name: athlete.name,
    created_at: athlete.createdAt,
    updated_at: athlete.updatedAt,
  }
}

export async function getOrCreateDefaultAthlete(
  userId: string,
  userEmail: string
): Promise<{ success: boolean; athleteId?: string; athleteName?: string; error?: string }> {
  const result = await getOrCreatePrimaryAthlete({
    userId,
    userEmail,
    primarySport: "running",
    fallbackName: userEmail.split("@")[0] || "Runner",
    fallbackPosition: "Runner",
  })

  return result.success
    ? { success: true, athleteId: result.athlete.id, athleteName: result.athlete.name }
    : { success: false, error: result.error }
}

export async function getAthlete(
  athleteId: string,
  userId?: string
): Promise<{
  success: boolean
  athlete?: RunnerProfile
  error?: string
}> {
  const athlete = await fetchAthleteById(athleteId, userId)
  if (!athlete) {
    return { success: false, error: "Athlete not found" }
  }

  return { success: true, athlete: toRunnerProfile(athlete) }
}

export async function updateAthlete(
  athleteId: string,
  updates: Partial<Omit<RunnerProfile, "id" | "user_id" | "created_at" | "updated_at">>,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  const next = await updateSharedAthlete(
    athleteId,
    {
      name: updates.name,
      position: updates.notes ?? "Runner",
    },
    userId
  )

  return next ? { success: true } : { success: false, error: "Failed to update athlete" }
}

export async function getUserAthletes(
  userId: string
): Promise<{ success: boolean; athletes?: RunnerProfile[]; error?: string }> {
  const athletes = await listAthletes(userId)
  return {
    success: true,
    athletes: athletes.map(toRunnerProfile),
  }
}
