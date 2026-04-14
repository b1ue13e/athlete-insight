import type {
  CompoundOrIsolation,
  Equipment,
  ExerciseSetEntry,
  MovementPattern,
  MuscleGroup,
} from "./schemas"

export interface ExerciseLibraryEntry {
  canonicalName: string
  aliases: string[]
  movementPattern: MovementPattern
  primaryMuscles: MuscleGroup[]
  equipment: Equipment
  compoundOrIsolation: CompoundOrIsolation
  mainLiftBias: number
}

export const EXERCISE_LIBRARY: ExerciseLibraryEntry[] = [
  {
    canonicalName: "Barbell Bench Press",
    aliases: ["bench press", "flat bench", "bb bench"],
    movementPattern: "horizontal_push",
    primaryMuscles: ["chest", "front_delts", "triceps"],
    equipment: "barbell",
    compoundOrIsolation: "compound",
    mainLiftBias: 1,
  },
  {
    canonicalName: "Incline Dumbbell Press",
    aliases: ["incline press", "incline db press"],
    movementPattern: "horizontal_push",
    primaryMuscles: ["chest", "front_delts", "triceps"],
    equipment: "dumbbell",
    compoundOrIsolation: "compound",
    mainLiftBias: 0.8,
  },
  {
    canonicalName: "Overhead Press",
    aliases: ["military press", "shoulder press", "ohp"],
    movementPattern: "vertical_push",
    primaryMuscles: ["front_delts", "triceps", "side_delts"],
    equipment: "barbell",
    compoundOrIsolation: "compound",
    mainLiftBias: 0.95,
  },
  {
    canonicalName: "Pull-Up",
    aliases: ["chin up", "chin-up", "pullup"],
    movementPattern: "vertical_pull",
    primaryMuscles: ["lats", "upper_back", "biceps"],
    equipment: "bodyweight",
    compoundOrIsolation: "compound",
    mainLiftBias: 0.95,
  },
  {
    canonicalName: "Barbell Row",
    aliases: ["bent over row", "bb row"],
    movementPattern: "horizontal_pull",
    primaryMuscles: ["upper_back", "lats", "rear_delts", "biceps"],
    equipment: "barbell",
    compoundOrIsolation: "compound",
    mainLiftBias: 0.9,
  },
  {
    canonicalName: "Lat Pulldown",
    aliases: ["pulldown"],
    movementPattern: "vertical_pull",
    primaryMuscles: ["lats", "biceps"],
    equipment: "cable",
    compoundOrIsolation: "compound",
    mainLiftBias: 0.7,
  },
  {
    canonicalName: "Barbell Back Squat",
    aliases: ["back squat", "squat"],
    movementPattern: "squat",
    primaryMuscles: ["quads", "glutes", "spinal_erectors"],
    equipment: "barbell",
    compoundOrIsolation: "compound",
    mainLiftBias: 1,
  },
  {
    canonicalName: "Romanian Deadlift",
    aliases: ["rdl"],
    movementPattern: "hinge",
    primaryMuscles: ["hamstrings", "glutes", "spinal_erectors"],
    equipment: "barbell",
    compoundOrIsolation: "compound",
    mainLiftBias: 0.9,
  },
  {
    canonicalName: "Deadlift",
    aliases: ["conventional deadlift"],
    movementPattern: "hinge",
    primaryMuscles: ["glutes", "hamstrings", "spinal_erectors", "upper_back"],
    equipment: "barbell",
    compoundOrIsolation: "compound",
    mainLiftBias: 1,
  },
  {
    canonicalName: "Leg Press",
    aliases: ["sled leg press"],
    movementPattern: "squat",
    primaryMuscles: ["quads", "glutes"],
    equipment: "machine",
    compoundOrIsolation: "compound",
    mainLiftBias: 0.75,
  },
  {
    canonicalName: "Walking Lunge",
    aliases: ["lunge", "db lunge"],
    movementPattern: "lunge",
    primaryMuscles: ["quads", "glutes", "hamstrings"],
    equipment: "dumbbell",
    compoundOrIsolation: "compound",
    mainLiftBias: 0.7,
  },
  {
    canonicalName: "Lateral Raise",
    aliases: ["db lateral raise"],
    movementPattern: "isolation",
    primaryMuscles: ["side_delts"],
    equipment: "dumbbell",
    compoundOrIsolation: "isolation",
    mainLiftBias: 0.2,
  },
  {
    canonicalName: "Cable Fly",
    aliases: ["chest fly", "pec fly"],
    movementPattern: "isolation",
    primaryMuscles: ["chest"],
    equipment: "cable",
    compoundOrIsolation: "isolation",
    mainLiftBias: 0.2,
  },
  {
    canonicalName: "Leg Curl",
    aliases: ["ham curl", "lying leg curl"],
    movementPattern: "isolation",
    primaryMuscles: ["hamstrings"],
    equipment: "machine",
    compoundOrIsolation: "isolation",
    mainLiftBias: 0.2,
  },
  {
    canonicalName: "Cable Crunch",
    aliases: ["ab crunch"],
    movementPattern: "core",
    primaryMuscles: ["abs"],
    equipment: "cable",
    compoundOrIsolation: "isolation",
    mainLiftBias: 0.15,
  },
]

export function normalizeExerciseName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ")
}

export function findExerciseLibraryEntry(name: string): ExerciseLibraryEntry | undefined {
  const normalized = normalizeExerciseName(name)
  return EXERCISE_LIBRARY.find((entry) => {
    return (
      normalizeExerciseName(entry.canonicalName) === normalized ||
      entry.aliases.some((alias) => normalizeExerciseName(alias) === normalized)
    )
  })
}

export function getMainLiftBias(exercise: ExerciseSetEntry): number {
  const fromLibrary = findExerciseLibraryEntry(exercise.exerciseName)
  if (fromLibrary) {
    return fromLibrary.mainLiftBias
  }

  if (exercise.compoundOrIsolation === "compound") {
    if (exercise.movementPattern === "squat" || exercise.movementPattern === "hinge") {
      return 0.95
    }

    return 0.75
  }

  return 0.2
}

export function inferExerciseIfKnown(exerciseName: string): Partial<ExerciseSetEntry> | undefined {
  const entry = findExerciseLibraryEntry(exerciseName)
  if (!entry) {
    return undefined
  }

  return {
    exerciseName: entry.canonicalName,
    movementPattern: entry.movementPattern,
    primaryMuscles: entry.primaryMuscles,
    equipment: entry.equipment,
    compoundOrIsolation: entry.compoundOrIsolation,
  }
}
