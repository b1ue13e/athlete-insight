import { calculateRunningConfidence } from "./confidence"
import {
  parseRunningSessionInput,
  type CompletionScore,
  type FinalRunningScore,
  type GoalValueScore,
  type LoadQualityScore,
  type PacingControlScore,
  type RunningConfidence,
  type RunningDerivedMetrics,
  type RunningDeviation,
  type RunningDimensionKey,
  type RunningReportSignal,
  type RunningScoreDimension,
  type RunningScoreReport,
  type RunningSessionInput,
  type RunningTrainingInference,
  toScoreRange,
} from "./schemas"
import { GOAL_VALUE_MATRIX, TRAINING_TEMPLATES } from "./templates"
import { RUNNING_SCORE_VERSION } from "./version"

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value))
}

function average(values: number[]) {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function stddev(values: number[]) {
  if (values.length < 2) return 0
  const mean = average(values)
  const variance = average(values.map((value) => (value - mean) ** 2))
  return Math.sqrt(variance)
}

function percentChange(previous: number, next: number) {
  if (previous === 0) return 0
  return ((next - previous) / previous) * 100
}

function summarizeDimension(
  label: string,
  score: number,
  verdict: string,
  evidence: string[],
  confidence: RunningConfidence
): RunningScoreDimension {
  return {
    label,
    score,
    range: toScoreRange(score),
    confidenceBand: confidence.band === "low" ? "low" : score < 65 ? "medium" : confidence.band,
    verdict,
    evidence,
  }
}

function deriveMetrics(input: RunningSessionInput): RunningDerivedMetrics {
  const avgPaceSec = input.avgPaceSec ?? average(input.splits ?? [])
  const splits = input.splits ?? []
  const splitCount = splits.length
  const paceVariancePct = splitCount > 1 ? (stddev(splits) / avgPaceSec) * 100 : 0

  const firstHalf = splitCount >= 4 ? average(splits.slice(0, Math.floor(splitCount / 2))) : undefined
  const secondHalf = splitCount >= 4 ? average(splits.slice(Math.floor(splitCount / 2))) : undefined
  const lateSegment = splitCount >= 4 ? average(splits.slice(Math.max(0, splitCount - Math.ceil(splitCount / 3)))) : undefined

  const telemetry = input.telemetry ?? []
  const telemetryPointCount = telemetry.length
  const cadenceSamples = telemetry.map((point) => point.cadence).filter((value): value is number => value !== undefined)
  const gctSamples = telemetry.map((point) => point.groundContactTimeMs).filter((value): value is number => value !== undefined)

  let cadenceDropPct: number | undefined
  if (cadenceSamples.length >= 6) {
    const chunk = Math.max(2, Math.floor(cadenceSamples.length / 4))
    cadenceDropPct = percentChange(average(cadenceSamples.slice(0, chunk)), average(cadenceSamples.slice(-chunk)))
  }

  let groundContactIncreaseMs: number | undefined
  if (gctSamples.length >= 6) {
    const chunk = Math.max(2, Math.floor(gctSamples.length / 4))
    groundContactIncreaseMs = average(gctSamples.slice(-chunk)) - average(gctSamples.slice(0, chunk))
  }

  return {
    avgPaceSec,
    splitCount,
    paceVariancePct,
    firstHalfPaceSec: firstHalf,
    secondHalfPaceSec: secondHalf,
    lateSegmentPaceSec: lateSegment,
    slowdownPct: firstHalf && secondHalf ? percentChange(firstHalf, secondHalf) : undefined,
    avgHeartRatePctMax:
      input.avgHeartRate !== undefined && input.maxHeartRate !== undefined
        ? input.avgHeartRate / input.maxHeartRate
        : undefined,
    distanceCompletionPct:
      input.plannedDistance !== undefined ? (input.distanceKm / input.plannedDistance) * 100 : undefined,
    durationCompletionPct:
      input.plannedDuration !== undefined ? (input.durationMin / input.plannedDuration) * 100 : undefined,
    paceTargetHit:
      input.plannedPaceRange !== undefined
        ? avgPaceSec >= input.plannedPaceRange.minSec && avgPaceSec <= input.plannedPaceRange.maxSec
        : undefined,
    heartRateTargetHit:
      input.plannedHeartRateRange !== undefined && input.avgHeartRate !== undefined
        ? input.avgHeartRate >= input.plannedHeartRateRange.min &&
          input.avgHeartRate <= input.plannedHeartRateRange.max
        : undefined,
    cadenceDropPct,
    groundContactIncreaseMs,
    telemetryPointCount,
  }
}

function inferTrainingType(input: RunningSessionInput, derived: RunningDerivedMetrics): RunningTrainingInference {
  const reasons: string[] = []
  const hrRatio = derived.avgHeartRatePctMax
  let inferred = input.trainingType
  let confidence = 0.45

  if (input.durationMin >= 90 || input.distanceKm >= 16) {
    inferred = "long"
    confidence = 0.8
    reasons.push("时长 / 距离明显落在长距离区间。")
  } else if (input.trainingType === "interval" && derived.splitCount >= 4) {
    inferred = "interval"
    confidence = 0.78
    reasons.push("具备多段 split，且训练意图本身是间歇。")
  } else if (hrRatio !== undefined && hrRatio >= 0.88) {
    inferred = input.trainingType === "race" ? "race" : "interval"
    confidence = 0.72
    reasons.push("平均心率已经接近高强度训练区。")
  } else if (hrRatio !== undefined && hrRatio >= 0.8) {
    inferred = "tempo"
    confidence = 0.68
    reasons.push("心率强度更接近节奏跑而不是轻松跑。")
  } else if (hrRatio !== undefined && hrRatio <= 0.68 && input.durationMin <= 45 && (input.rpe ?? 0) <= 4) {
    inferred = "recovery"
    confidence = 0.62
    reasons.push("心率和主观强度都更像恢复跑。")
  } else if (input.trainingType === "race") {
    inferred = "race"
    confidence = 0.7
    reasons.push("标记为测试 / 比赛，按比赛语境理解。")
  } else {
    inferred = "easy"
    confidence = 0.5
    reasons.push("缺少更强证据时，按大众跑者默认训练解释。")
  }

  return {
    input: input.trainingType,
    inferred,
    matchesInput: inferred === input.trainingType,
    confidence,
    rationale: reasons,
  }
}

function scoreCompletion(input: RunningSessionInput, derived: RunningDerivedMetrics, confidence: RunningConfidence, inference: RunningTrainingInference): CompletionScore {
  const template = TRAINING_TEMPLATES[input.trainingType]
  let score = 82
  const evidence: string[] = []

  if (input.plannedDistance !== undefined) {
    const pct = derived.distanceCompletionPct ?? 0
    evidence.push(`计划距离完成 ${Math.round(pct)}%。`)
    if (pct < 75) score -= 28
    else if (pct < 90) score -= 14
    else if (pct > 112) score -= 6
    else score += 6
  } else if (input.distanceKm <= 0) {
    score -= 30
  }

  if (input.plannedDuration !== undefined) {
    const pct = derived.durationCompletionPct ?? 0
    evidence.push(`计划时长完成 ${Math.round(pct)}%。`)
    if (pct < 75) score -= 24
    else if (pct < 90) score -= 10
    else if (pct > 115) score -= 5
    else score += 4
  } else if (input.durationMin < template.idealDurationMin.min) {
    score -= 12
    evidence.push("时长低于该训练类型的常见有效下限。")
  } else if (input.durationMin > template.idealDurationMin.max * 1.15) {
    score -= 10
    evidence.push("时长显著超过常见区间，完成度不等于完成质量。")
  } else {
    evidence.push("时长落在该训练类型的常见有效区间。")
  }

  if (!inference.matchesInput && inference.confidence >= 0.65) {
    score -= 8
    evidence.push(`执行表现更像 ${TRAINING_TEMPLATES[inference.inferred].label}。`)
  }

  if (derived.paceTargetHit === true || derived.heartRateTargetHit === true) {
    score += 4
    evidence.push("至少一个计划强度目标命中。")
  }

  score = clamp(Math.round(score))

  return summarizeDimension(
    "训练完成度",
    score,
    score >= 75 ? "完成质量基本达标。" : "计划兑现不足，训练没有完整练到位。",
    evidence,
    confidence
  )
}

function scorePacingControl(input: RunningSessionInput, derived: RunningDerivedMetrics, confidence: RunningConfidence): PacingControlScore {
  const template = TRAINING_TEMPLATES[input.trainingType]
  let score = derived.splitCount >= 4 ? 86 : 72
  const evidence: string[] = []

  if (derived.splitCount < 4) {
    evidence.push("缺少足够 split，节奏判断主要基于均值。")
  } else {
    evidence.push(`配速波动 ${derived.paceVariancePct.toFixed(1)}%。`)
    if (derived.paceVariancePct > template.maxVariancePct * 1.5) score -= 24
    else if (derived.paceVariancePct > template.maxVariancePct) score -= 12
    else score += 4
  }

  if (derived.slowdownPct !== undefined) {
    evidence.push(`后半程相对前半程变慢 ${Math.max(0, derived.slowdownPct).toFixed(1)}%。`)
    if (derived.slowdownPct > template.maxSlowdownPct + 6) score -= 28
    else if (derived.slowdownPct > template.maxSlowdownPct) score -= 14
    else if (derived.slowdownPct <= 1) score += 4
  }

  if (input.trainingType === "easy" || input.trainingType === "recovery") {
    if (derived.avgHeartRatePctMax !== undefined && template.targetHrRatio && derived.avgHeartRatePctMax > template.targetHrRatio.max + 0.03) {
      score -= 20
      evidence.push("强度已经逼近灰区，轻松跑节奏失守。")
    }
    if ((input.rpe ?? 0) > template.expectedRpe.max + 1) {
      score -= 10
      evidence.push("主观强度偏高，轻松跑没有真正放轻。")
    }
  }

  if (input.trainingType === "interval" && derived.splitCount < 4) {
    score -= 10
    evidence.push("没有足够组间数据，无法证明后程控制住了。")
  }

  score = clamp(Math.round(score))

  return summarizeDimension(
    "节奏控制",
    score,
    score >= 75 ? "节奏基本在线。" : "节奏控制出现明显偏差，训练意图被削弱。",
    evidence,
    confidence
  )
}

function scoreLoadQuality(input: RunningSessionInput, derived: RunningDerivedMetrics, confidence: RunningConfidence): LoadQualityScore {
  const template = TRAINING_TEMPLATES[input.trainingType]
  let score = 80
  const evidence: string[] = []

  if (input.rpe !== undefined) {
    evidence.push(`主观强度 RPE ${input.rpe}。`)
    if (input.rpe < template.expectedRpe.min - 1 || input.rpe > template.expectedRpe.max + 1) {
      score -= 14
    } else {
      score += 4
    }
  } else {
    evidence.push("缺少 RPE，负荷质量只能按客观数据估计。")
  }

  if (derived.avgHeartRatePctMax !== undefined && template.targetHrRatio) {
    const hrPct = derived.avgHeartRatePctMax
    evidence.push(`平均心率约为最大心率的 ${Math.round(hrPct * 100)}%。`)
    if (hrPct < template.targetHrRatio.min - 0.05 || hrPct > template.targetHrRatio.max + 0.05) {
      score -= 16
    } else if (hrPct < template.targetHrRatio.min || hrPct > template.targetHrRatio.max) {
      score -= 8
    } else {
      score += 4
    }
  }

  if ((input.trainingType === "easy" || input.trainingType === "recovery") && ((input.rpe ?? 0) >= 7 || (derived.avgHeartRatePctMax ?? 0) >= 0.82)) {
    score -= 18
    evidence.push("本该轻的训练却做出了偏高负荷。")
  }

  if (input.trainingType === "long" && (derived.slowdownPct ?? 0) > 10 && (input.rpe ?? 0) >= 8) {
    score -= 16
    evidence.push("长距离后程明显掉速，且主观负荷已过高。")
  }

  if (derived.groundContactIncreaseMs !== undefined && derived.groundContactIncreaseMs > 18) {
    score -= 6
    evidence.push("高级时序数据显示后程出现明显疲劳代偿。")
  }

  score = clamp(Math.round(score))

  return summarizeDimension(
    "负荷质量",
    score,
    score >= 75 ? "负荷落点基本合适。" : "负荷质量偏离训练目标，要么过重，要么刺激无效。",
    evidence,
    confidence
  )
}

function scoreGoalValue(input: RunningSessionInput, confidence: RunningConfidence, completion: CompletionScore, pacing: PacingControlScore): GoalValueScore {
  const evidence: string[] = []
  let score = 72

  if (input.goalType) {
    score = Math.round(GOAL_VALUE_MATRIX[input.goalType][input.trainingType] * 100)
    evidence.push(`当前目标下，${TRAINING_TEMPLATES[input.trainingType].label}的专项价值为 ${score}。`)
  } else {
    evidence.push("未设置专项目标，按通用训练价值评估。")
  }

  if (completion.score < 70) {
    score -= 10
    evidence.push("计划没有完成到位，专项价值同步打折。")
  }

  if (pacing.score < 65) {
    score -= 8
    evidence.push("节奏执行走样，专项刺激被稀释。")
  }

  score = clamp(Math.round(score))

  return summarizeDimension(
    "目标价值",
    score,
    score >= 75 ? "这次训练对当前目标有价值。" : "这次训练的专项价值有限，更像无效消耗。",
    evidence,
    confidence
  )
}

function buildDeviation(
  code: RunningDeviation["code"],
  label: string,
  severity: RunningDeviation["severity"],
  dimension: RunningDeviation["dimension"],
  summary: string,
  evidence: string[],
  action: string
): RunningDeviation {
  return { code, label, severity, dimension, summary, evidence, action }
}

function detectDeviations(input: RunningSessionInput, derived: RunningDerivedMetrics, load: LoadQualityScore, confidence: RunningConfidence): RunningDeviation[] {
  const deviations: RunningDeviation[] = []

  if ((input.trainingType === "easy" || input.trainingType === "recovery") && ((derived.avgHeartRatePctMax ?? 0) > 0.8 || (input.rpe ?? 0) >= 7)) {
    deviations.push(
      buildDeviation(
        "easy_gray_zone",
        "轻松跑跑进灰区",
        (derived.avgHeartRatePctMax ?? 0) > 0.84 ? "major" : "moderate",
        "pacingControl",
        "轻松 / 恢复跑强度偏高，训练从恢复性刺激变成了灰区消耗。",
        [
          derived.avgHeartRatePctMax !== undefined ? `平均心率占最大心率 ${Math.round(derived.avgHeartRatePctMax * 100)}%。` : "无心率，仅根据 RPE 识别。",
          input.rpe !== undefined ? `RPE ${input.rpe}，已高于轻松跑常见上限。` : "缺少 RPE。",
        ],
        "下次轻松跑先把配速压下来，再用心率或呼吸感确认自己确实在轻松区。"
      )
    )
  }

  if (input.trainingType === "recovery" && ((input.rpe ?? 0) >= 6 || (derived.avgHeartRatePctMax ?? 0) > 0.76)) {
    deviations.push(
      buildDeviation(
        "recovery_not_easy",
        "恢复跑不够轻",
        "moderate",
        "loadQuality",
        "恢复跑负荷偏高，恢复价值被削弱。",
        ["恢复跑的目标是恢复，不是再做一次中等强度训练。"],
        "把恢复跑当成主动恢复，宁可慢也不要顶。"
      )
    )
  }

  if (input.trainingType === "tempo" && (derived.slowdownPct ?? 0) > 4) {
    deviations.push(
      buildDeviation(
        "tempo_front_loaded",
        "节奏跑前快后崩",
        (derived.slowdownPct ?? 0) > 8 ? "major" : "moderate",
        "pacingControl",
        "节奏跑前段冒进，后段无法稳定维持节奏强度。",
        [`后半程相对前半程变慢 ${(derived.slowdownPct ?? 0).toFixed(1)}%。`],
        "下次节奏跑前 1/3 保守 3-5 秒 / km，优先保证后段不崩。"
      )
    )
  }

  if (input.trainingType === "interval" && derived.splitCount >= 4) {
    const slowdown =
      derived.firstHalfPaceSec && derived.lateSegmentPaceSec
        ? percentChange(derived.firstHalfPaceSec, derived.lateSegmentPaceSec)
        : 0
    if (slowdown > 8) {
      deviations.push(
        buildDeviation(
          "interval_late_loss",
          "间歇跑后程失控",
          slowdown > 14 ? "major" : "moderate",
          "pacingControl",
          "间歇前段冲得太狠，后面已经守不住应有输出。",
          [`后段组速比前段慢 ${slowdown.toFixed(1)}%。`],
          "把前两组拉回到可持续配速，目标是最后几组还能守住，而不是前几组看起来很快。"
        )
      )
    }
  }

  if (input.trainingType === "long" && (derived.slowdownPct ?? 0) > 8) {
    deviations.push(
      buildDeviation(
        "long_run_fade",
        "长距离后半程掉速",
        (derived.slowdownPct ?? 0) > 15 ? "major" : "moderate",
        "pacingControl",
        "长距离后半程掉速明显，说明耐力和配速分配还不够稳。",
        [`后半程相对前半程变慢 ${(derived.slowdownPct ?? 0).toFixed(1)}%。`],
        "长距离前半程再保守一点，优先换来后半程稳定完成。"
      )
    )
  }

  if (
    (derived.distanceCompletionPct !== undefined && derived.distanceCompletionPct < 85) ||
    (derived.durationCompletionPct !== undefined && derived.durationCompletionPct < 85)
  ) {
    deviations.push(
      buildDeviation(
        "plan_under_completed",
        "计划完成不足",
        ((derived.distanceCompletionPct ?? 100) < 70 || (derived.durationCompletionPct ?? 100) < 70) ? "major" : "moderate",
        "completion",
        "训练没有按计划完成，导致本次刺激打折。",
        [
          derived.distanceCompletionPct !== undefined ? `距离完成 ${Math.round(derived.distanceCompletionPct)}%。` : "无计划距离。",
          derived.durationCompletionPct !== undefined ? `时长完成 ${Math.round(derived.durationCompletionPct)}%。` : "无计划时长。",
        ],
        "先确认是不合理计划还是执行失控，再决定是降目标还是调整节奏。"
      )
    )
  }

  if (load.score < 60 && ((input.rpe ?? 0) >= 8 || (derived.avgHeartRatePctMax ?? 0) > 0.88)) {
    deviations.push(
      buildDeviation(
        "overload_under_recovered",
        "负荷过高且恢复不足",
        "major",
        "loadQuality",
        "这次训练已经明显顶过头，恢复成本高于训练收益。",
        [
          input.rpe !== undefined ? `RPE ${input.rpe}。` : "无 RPE。",
          derived.avgHeartRatePctMax !== undefined ? `平均心率占最大心率 ${Math.round(derived.avgHeartRatePctMax * 100)}%。` : "无心率。",
        ],
        "下一次优先安排恢复跑或休息，不要在疲劳未消时继续叠高强度。"
      )
    )
  }

  if (confidence.band === "low") {
    deviations.push(
      buildDeviation(
        "missing_key_data",
        "关键数据缺失",
        "minor",
        "completion",
        "关键数据不足，报告可信度已下调。",
        confidence.missingData.map((item) => `缺少 ${item}`),
        "如果想更稳定判断有没有练对，优先补上 split、心率和计划值。"
      )
    )
  }

  if (input.goalType && GOAL_VALUE_MATRIX[input.goalType][input.trainingType] < 0.5) {
    deviations.push(
      buildDeviation(
        "goal_mismatch",
        "训练类型与目标价值偏低",
        "minor",
        "goalValue",
        "这次训练并非完全无效，但对当前目标的边际价值偏低。",
        [`当前目标下价值评分仅 ${Math.round(GOAL_VALUE_MATRIX[input.goalType][input.trainingType] * 100)}。`],
        "如果这周已经有足够基础跑，可以把一次训练换成更贴近目标的节奏或专项课。"
      )
    )
  }

  const severityWeight = { major: 3, moderate: 2, minor: 1 }
  return deviations.sort((left, right) => severityWeight[right.severity] - severityWeight[left.severity])
}

function buildSignalFromBestDimension(dimensions: Array<{ key: RunningDimensionKey; value: RunningScoreDimension }>): RunningReportSignal {
  const best = [...dimensions].sort((left, right) => right.value.score - left.value.score)[0]
  return {
    title: `${best.value.label}是本次最稳的一项`,
    detail: best.value.evidence[0] ?? best.value.verdict,
    dimension: best.key,
    direction: "positive",
  }
}

function buildCorrectionSignal(deviations: RunningDeviation[], dimensions: Array<{ key: RunningDimensionKey; value: RunningScoreDimension }>): RunningReportSignal {
  if (deviations.length > 0) {
    const top = deviations[0]
    return {
      title: top.label,
      detail: top.action,
      dimension: top.dimension,
      direction: "negative",
    }
  }

  const worst = [...dimensions].sort((left, right) => left.value.score - right.value.score)[0]
  return {
    title: `${worst.value.label}仍是最该修的一项`,
    detail: worst.value.evidence[0] ?? worst.value.verdict,
    dimension: worst.key,
    direction: "negative",
  }
}

function buildSuggestions(input: RunningSessionInput, deviations: RunningDeviation[], final: FinalRunningScore): string[] {
  if (deviations.length > 0) {
    return deviations.slice(0, 3).map((deviation) => deviation.action)
  }

  if (final.score >= 85) {
    return ["这次训练练对了，下一次沿用同类型结构，只做很小幅度递进。"]
  }

  if (input.trainingType === "easy" || input.trainingType === "recovery") {
    return ["继续把轻松跑做轻，把恢复价值守住。"]
  }

  return ["下一次先守住前半程节奏，再追求更高输出。"]
}

export function calculateRunningScore(rawInput: RunningSessionInput): RunningScoreReport {
  const input = parseRunningSessionInput(rawInput)
  const derived = deriveMetrics(input)
  const confidence = calculateRunningConfidence(input, derived)
  const inference = inferTrainingType(input, derived)

  const completion = scoreCompletion(input, derived, confidence, inference)
  const pacingControl = scorePacingControl(input, derived, confidence)
  const loadQuality = scoreLoadQuality(input, derived, confidence)
  const goalValue = scoreGoalValue(input, confidence, completion, pacingControl)

  const weights = TRAINING_TEMPLATES[input.trainingType].weights
  const weightedScore = clamp(
    Math.round(
      completion.score * weights.completion +
      pacingControl.score * weights.pacingControl +
      loadQuality.score * weights.loadQuality +
      goalValue.score * weights.goalValue
    )
  )

  const final: FinalRunningScore = {
    ...summarizeDimension(
      "综合得分",
      weightedScore,
      weightedScore >= 75 ? "整体训练落点正确。" : "这次训练没有充分练到点上。",
      [
        `完成度 ${completion.score}，节奏控制 ${pacingControl.score}，负荷质量 ${loadQuality.score}，目标价值 ${goalValue.score}。`,
      ],
      confidence
    ),
    weightedScore,
    onTarget: weightedScore >= 75,
  }

  const detectedDeviations = detectDeviations(input, derived, loadQuality, confidence)

  const dimensions: Array<{ key: RunningDimensionKey; value: RunningScoreDimension }> = [
    { key: "completion", value: completion },
    { key: "pacingControl", value: pacingControl },
    { key: "loadQuality", value: loadQuality },
    { key: "goalValue", value: goalValue },
  ]

  return {
    version: RUNNING_SCORE_VERSION,
    sessionId: input.id,
    generatedAt: new Date().toISOString(),
    inputEcho: {
      trainingType: input.trainingType,
      goalType: input.goalType,
      source: input.source,
    },
    inferredTrainingType: inference,
    scoreBreakdown: {
      completion,
      pacingControl,
      loadQuality,
      goalValue,
      final,
    },
    detectedDeviations,
    strongestSignal: buildSignalFromBestDimension(dimensions),
    biggestCorrection: buildCorrectionSignal(detectedDeviations, dimensions),
    confidence,
    advancedInsightsAvailable: Boolean(
      input.telemetry?.some(
        (point) =>
          point.heartRate !== undefined ||
          point.cadence !== undefined ||
          point.groundContactTimeMs !== undefined ||
          point.verticalOscillationCm !== undefined
      )
    ),
    nextSessionSuggestions: buildSuggestions(input, detectedDeviations, final),
  }
}
