import type { RunningGoalType, RunningTrainingType } from "./schemas"

export interface RunningTrainingTemplate {
  label: string
  summary: string
  expectedRpe: { min: number; max: number }
  targetHrRatio?: { min: number; max: number }
  idealDurationMin: { min: number; max: number }
  maxVariancePct: number
  maxSlowdownPct: number
  weights: {
    completion: number
    pacingControl: number
    loadQuality: number
    goalValue: number
  }
}

export const TRAINING_TEMPLATES: Record<RunningTrainingType, RunningTrainingTemplate> = {
  easy: {
    label: "轻松跑",
    summary: "应该轻松、稳定、可恢复的有氧训练。",
    expectedRpe: { min: 2, max: 5 },
    targetHrRatio: { min: 0.62, max: 0.78 },
    idealDurationMin: { min: 25, max: 80 },
    maxVariancePct: 6,
    maxSlowdownPct: 5,
    weights: { completion: 0.28, pacingControl: 0.26, loadQuality: 0.28, goalValue: 0.18 },
  },
  recovery: {
    label: "恢复跑",
    summary: "比轻松跑更轻，目标是恢复，不是刺激。",
    expectedRpe: { min: 1, max: 4 },
    targetHrRatio: { min: 0.55, max: 0.72 },
    idealDurationMin: { min: 20, max: 50 },
    maxVariancePct: 8,
    maxSlowdownPct: 6,
    weights: { completion: 0.24, pacingControl: 0.22, loadQuality: 0.36, goalValue: 0.18 },
  },
  tempo: {
    label: "节奏跑",
    summary: "应该稳定顶住，而不是前半段冲、后半段崩。",
    expectedRpe: { min: 6, max: 8 },
    targetHrRatio: { min: 0.8, max: 0.9 },
    idealDurationMin: { min: 20, max: 70 },
    maxVariancePct: 4,
    maxSlowdownPct: 4,
    weights: { completion: 0.28, pacingControl: 0.34, loadQuality: 0.22, goalValue: 0.16 },
  },
  interval: {
    label: "间歇跑",
    summary: "更看重组间质量和后程控制，而不是前几组冒进。",
    expectedRpe: { min: 7, max: 9 },
    targetHrRatio: { min: 0.85, max: 0.95 },
    idealDurationMin: { min: 25, max: 70 },
    maxVariancePct: 9,
    maxSlowdownPct: 8,
    weights: { completion: 0.32, pacingControl: 0.32, loadQuality: 0.2, goalValue: 0.16 },
  },
  long: {
    label: "长距离",
    summary: "更看重后半程稳定完成，而不是前面跑爽、后面掉速。",
    expectedRpe: { min: 4, max: 7 },
    targetHrRatio: { min: 0.68, max: 0.82 },
    idealDurationMin: { min: 60, max: 210 },
    maxVariancePct: 7,
    maxSlowdownPct: 8,
    weights: { completion: 0.3, pacingControl: 0.28, loadQuality: 0.24, goalValue: 0.18 },
  },
  race: {
    label: "比赛 / 测试",
    summary: "更看重比赛策略和输出兑现。",
    expectedRpe: { min: 8, max: 10 },
    targetHrRatio: { min: 0.88, max: 0.98 },
    idealDurationMin: { min: 15, max: 360 },
    maxVariancePct: 6,
    maxSlowdownPct: 7,
    weights: { completion: 0.24, pacingControl: 0.34, loadQuality: 0.22, goalValue: 0.2 },
  },
}

export const GOAL_VALUE_MATRIX: Record<RunningGoalType, Record<RunningTrainingType, number>> = {
  "5k": { easy: 0.68, recovery: 0.52, tempo: 0.88, interval: 1, long: 0.5, race: 0.92 },
  "10k": { easy: 0.72, recovery: 0.56, tempo: 0.94, interval: 0.9, long: 0.62, race: 0.9 },
  half: { easy: 0.78, recovery: 0.58, tempo: 0.92, interval: 0.76, long: 0.94, race: 0.86 },
  marathon: { easy: 0.82, recovery: 0.6, tempo: 0.8, interval: 0.58, long: 1, race: 0.88 },
  fatloss: { easy: 0.96, recovery: 0.82, tempo: 0.56, interval: 0.46, long: 0.78, race: 0.28 },
  test: { easy: 0.48, recovery: 0.34, tempo: 0.72, interval: 0.68, long: 0.4, race: 1 },
}

export const GOAL_LABELS: Record<RunningGoalType, string> = {
  "5k": "5K",
  "10k": "10K",
  half: "半马",
  marathon: "全马",
  fatloss: "减脂",
  test: "测试",
}

export function labelTrainingType(trainingType: RunningTrainingType): string {
  return TRAINING_TEMPLATES[trainingType].label
}

export function labelGoalType(goalType?: RunningGoalType): string | undefined {
  return goalType ? GOAL_LABELS[goalType] : undefined
}
