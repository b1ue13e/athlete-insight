import type { GymConfidence, GymSessionInput } from "./schemas"

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function calculateGymConfidence(input: GymSessionInput): GymConfidence {
  let score = 100
  const confidenceReasons: string[] = []

  if (!input.plannedSession) {
    score -= 12
    confidenceReasons.push("缺少计划值，完成度与偏差诊断更多依赖模板推断。")
  }

  const incompleteExerciseFields = input.exercises.some((exercise) => {
    return exercise.primaryMuscles.length === 0 || !exercise.movementPattern || !exercise.compoundOrIsolation
  })

  if (incompleteExerciseFields) {
    score -= 15
    confidenceReasons.push("动作标签不完整，肌群覆盖与结构失衡判断会变粗。")
  }

  const incompleteSetData = input.exercises.some((exercise) => {
    return exercise.repsPerSet.length === 0 || exercise.sets <= 0
  })

  if (incompleteSetData) {
    score -= 18
    confidenceReasons.push("组数或次数存在缺失，刺激质量判断会下降。")
  }

  const hasAnyRpeOrRir = input.exercises.some((exercise) => {
    return Boolean(exercise.rpePerSet?.length || exercise.rirPerSet?.length)
  })

  if (!hasAnyRpeOrRir) {
    score -= 10
    confidenceReasons.push("RPE/RIR 全缺失，无法更稳地判断有效组与强度贴合度。")
  }

  if (input.source === "imported") {
    const importedButSparse = input.exercises.some((exercise) => !exercise.loadPerSet?.length && !exercise.rpePerSet?.length)
    if (importedButSparse) {
      score -= 8
      confidenceReasons.push("导入数据缺少关键负荷字段，部分结论只能保守输出。")
    }
  }

  if (input.durationMin < 20 && input.sessionTag !== "recovery") {
    score -= 8
    confidenceReasons.push("训练时长较短，存在中断或缩减的可能。")
  }

  const muscleTagCoverage = input.exercises.reduce((sum, exercise) => sum + exercise.primaryMuscles.length, 0) / input.exercises.length
  if (muscleTagCoverage < 1.5) {
    score -= 8
    confidenceReasons.push("肌群标注较粗，部位覆盖与失衡判断精度下降。")
  }

  const confidenceLevel = score >= 80 ? "high" : score >= 60 ? "medium" : "low"

  if (confidenceReasons.length === 0) {
    confidenceReasons.push("计划、动作标签和负荷信息完整，报告可信度较高。")
  }

  return {
    score: clamp(Math.round(score), 0, 100),
    confidenceLevel,
    confidenceReasons,
  }
}
