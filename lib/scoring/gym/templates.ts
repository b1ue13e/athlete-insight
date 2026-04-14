import type {
  GymGoalType,
  GymSessionTag,
  GymSplitType,
  MovementPattern,
  MuscleGroup,
} from "./schemas"

export interface GoalTemplate {
  label: string
  focus: string
  preferredRepRange: [number, number]
  preferredRirRange: [number, number]
  targetEffectiveSetsRange: [number, number]
  compoundShareTarget: number
  intensityBias: "light" | "moderate" | "high"
  densityBias: "low" | "moderate" | "high"
}

export interface SplitTemplate {
  label: string
  recommendedTags: GymSessionTag[]
  expectedLowerExposurePerWeek: number
  expectedPullExposurePerWeek: number
}

export interface SessionTagTemplate {
  label: string
  primaryPatterns: MovementPattern[]
  optionalPatterns: MovementPattern[]
  focusMuscles: MuscleGroup[]
  targetEffectiveSetsRange: [number, number]
  minimumCompoundMovements: number
  maxIsolationShare: number
  recommendedExerciseCount: [number, number]
}

export interface GymTemplateContext {
  goal: GoalTemplate
  split: SplitTemplate
  session: SessionTagTemplate
}

export const GOAL_TEMPLATES: Record<GymGoalType, GoalTemplate> = {
  hypertrophy: {
    label: "增肌",
    focus: "通过足够有效组、主项优先和接近力竭的质量积累肌肥大刺激。",
    preferredRepRange: [6, 15],
    preferredRirRange: [0, 3],
    targetEffectiveSetsRange: [10, 18],
    compoundShareTarget: 0.55,
    intensityBias: "moderate",
    densityBias: "moderate",
  },
  strength: {
    label: "力量",
    focus: "围绕主项推进高质量高强度组，辅助动作服务主项能力增长。",
    preferredRepRange: [1, 6],
    preferredRirRange: [1, 3],
    targetEffectiveSetsRange: [6, 12],
    compoundShareTarget: 0.7,
    intensityBias: "high",
    densityBias: "low",
  },
  fat_loss: {
    label: "减脂",
    focus: "优先保肌和训练密度，不让训练变成无结构消耗。",
    preferredRepRange: [6, 15],
    preferredRirRange: [1, 4],
    targetEffectiveSetsRange: [8, 14],
    compoundShareTarget: 0.55,
    intensityBias: "moderate",
    densityBias: "high",
  },
  recomposition: {
    label: "重组",
    focus: "平衡保肌与渐进负荷，避免既不够重也不够有效。",
    preferredRepRange: [5, 12],
    preferredRirRange: [1, 3],
    targetEffectiveSetsRange: [9, 16],
    compoundShareTarget: 0.6,
    intensityBias: "moderate",
    densityBias: "moderate",
  },
  physique: {
    label: "塑形",
    focus: "围绕重点部位建立形体比例，同时保持基础结构平衡。",
    preferredRepRange: [8, 15],
    preferredRirRange: [0, 3],
    targetEffectiveSetsRange: [10, 16],
    compoundShareTarget: 0.45,
    intensityBias: "moderate",
    densityBias: "moderate",
  },
  beginner_adaptation: {
    label: "新手适应",
    focus: "学习稳定动作模式，建立可恢复的基础训练节奏。",
    preferredRepRange: [6, 12],
    preferredRirRange: [2, 4],
    targetEffectiveSetsRange: [6, 12],
    compoundShareTarget: 0.5,
    intensityBias: "light",
    densityBias: "low",
  },
}

export const SPLIT_TEMPLATES: Record<GymSplitType, SplitTemplate> = {
  full_body: {
    label: "全身分化",
    recommendedTags: ["full_body", "full_body", "recovery"],
    expectedLowerExposurePerWeek: 2,
    expectedPullExposurePerWeek: 2,
  },
  upper_lower: {
    label: "上下肢分化",
    recommendedTags: ["upper", "lower", "upper", "lower"],
    expectedLowerExposurePerWeek: 2,
    expectedPullExposurePerWeek: 2,
  },
  ppl: {
    label: "PPL",
    recommendedTags: ["push", "pull", "legs"],
    expectedLowerExposurePerWeek: 1,
    expectedPullExposurePerWeek: 1,
  },
  bro_split: {
    label: "部位分化",
    recommendedTags: ["push", "pull", "legs", "accessory"],
    expectedLowerExposurePerWeek: 1,
    expectedPullExposurePerWeek: 1,
  },
  strength_split: {
    label: "力量分化",
    recommendedTags: ["upper", "lower", "full_body"],
    expectedLowerExposurePerWeek: 2,
    expectedPullExposurePerWeek: 2,
  },
  custom: {
    label: "自定义",
    recommendedTags: ["full_body", "accessory"],
    expectedLowerExposurePerWeek: 1,
    expectedPullExposurePerWeek: 1,
  },
}

export const SESSION_TAG_TEMPLATES: Record<GymSessionTag, SessionTagTemplate> = {
  push: {
    label: "推",
    primaryPatterns: ["horizontal_push", "vertical_push"],
    optionalPatterns: ["core"],
    focusMuscles: ["chest", "front_delts", "triceps", "side_delts"],
    targetEffectiveSetsRange: [8, 16],
    minimumCompoundMovements: 1,
    maxIsolationShare: 0.5,
    recommendedExerciseCount: [3, 6],
  },
  pull: {
    label: "拉",
    primaryPatterns: ["horizontal_pull", "vertical_pull"],
    optionalPatterns: ["hinge", "carry", "core"],
    focusMuscles: ["lats", "upper_back", "rear_delts", "biceps", "traps"],
    targetEffectiveSetsRange: [8, 16],
    minimumCompoundMovements: 1,
    maxIsolationShare: 0.45,
    recommendedExerciseCount: [3, 6],
  },
  legs: {
    label: "腿",
    primaryPatterns: ["squat", "hinge", "lunge"],
    optionalPatterns: ["carry", "core"],
    focusMuscles: ["quads", "glutes", "hamstrings", "calves", "spinal_erectors"],
    targetEffectiveSetsRange: [8, 16],
    minimumCompoundMovements: 2,
    maxIsolationShare: 0.4,
    recommendedExerciseCount: [3, 6],
  },
  upper: {
    label: "上肢",
    primaryPatterns: ["horizontal_push", "vertical_push", "horizontal_pull", "vertical_pull"],
    optionalPatterns: ["core"],
    focusMuscles: ["chest", "front_delts", "side_delts", "lats", "upper_back", "biceps", "triceps"],
    targetEffectiveSetsRange: [10, 18],
    minimumCompoundMovements: 2,
    maxIsolationShare: 0.45,
    recommendedExerciseCount: [4, 8],
  },
  lower: {
    label: "下肢",
    primaryPatterns: ["squat", "hinge", "lunge"],
    optionalPatterns: ["carry", "core"],
    focusMuscles: ["quads", "glutes", "hamstrings", "calves", "spinal_erectors"],
    targetEffectiveSetsRange: [10, 18],
    minimumCompoundMovements: 2,
    maxIsolationShare: 0.4,
    recommendedExerciseCount: [4, 7],
  },
  full_body: {
    label: "全身",
    primaryPatterns: ["squat", "hinge", "horizontal_push", "horizontal_pull"],
    optionalPatterns: ["vertical_push", "vertical_pull", "lunge", "core", "carry"],
    focusMuscles: ["quads", "glutes", "chest", "lats", "upper_back", "hamstrings"],
    targetEffectiveSetsRange: [8, 14],
    minimumCompoundMovements: 2,
    maxIsolationShare: 0.35,
    recommendedExerciseCount: [4, 7],
  },
  conditioning: {
    label: "体能",
    primaryPatterns: ["conditioning"],
    optionalPatterns: ["carry", "core"],
    focusMuscles: ["full_body", "abs", "obliques"],
    targetEffectiveSetsRange: [4, 8],
    minimumCompoundMovements: 0,
    maxIsolationShare: 0.25,
    recommendedExerciseCount: [1, 4],
  },
  accessory: {
    label: "辅助",
    primaryPatterns: ["isolation"],
    optionalPatterns: ["core", "carry"],
    focusMuscles: ["side_delts", "rear_delts", "biceps", "triceps", "calves", "abs"],
    targetEffectiveSetsRange: [6, 12],
    minimumCompoundMovements: 0,
    maxIsolationShare: 0.8,
    recommendedExerciseCount: [2, 6],
  },
  recovery: {
    label: "恢复",
    primaryPatterns: ["conditioning", "core"],
    optionalPatterns: ["carry"],
    focusMuscles: ["full_body", "abs"],
    targetEffectiveSetsRange: [2, 6],
    minimumCompoundMovements: 0,
    maxIsolationShare: 0.2,
    recommendedExerciseCount: [1, 3],
  },
}

export function getGymTemplateContext(
  goalType: GymGoalType,
  splitType: GymSplitType,
  sessionTag: GymSessionTag,
): GymTemplateContext {
  return {
    goal: GOAL_TEMPLATES[goalType],
    split: SPLIT_TEMPLATES[splitType],
    session: SESSION_TAG_TEMPLATES[sessionTag],
  }
}
