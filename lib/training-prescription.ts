/**
 * 训练处方系统
 * 
 * 将分析报告转化为可执行的训练动作
 */

export interface TrainingPrescription {
  id: string
  category: string
  title: string
  description: string
  
  // 执行细节
  execution: {
    duration: string      // "15分钟"
    sets?: number         // 组数
    reps?: string         // "20球" / "连续10次"
    intensity: "low" | "medium" | "high"
  }
  
  // 针对的问题
  targetIssue: string
  
  // 成功标准
  successCriteria: string
  
  // 常见错误
  commonMistakes: string[]
  
  // 进阶版本
  progression?: string
}

// 根据问题生成处方
export function generatePrescriptions(
  weaknesses: string[],
  errorTags: string[],
  position: string
): TrainingPrescription[] {
  const prescriptions: TrainingPrescription[] = []
  
  // 遍历弱点，匹配合适的处方
  weaknesses.forEach(weakness => {
    const matched = matchPrescription(weakness, errorTags, position)
    if (matched && !prescriptions.some(p => p.id === matched.id)) {
      prescriptions.push(matched)
    }
  })
  
  // 如果没有匹配到，给出通用处方
  if (prescriptions.length === 0) {
    prescriptions.push(getGenericPrescription(position))
  }
  
  return prescriptions.slice(0, 3) // 最多3个处方
}

// 匹配处方
function matchPrescription(
  weakness: string,
  errorTags: string[],
  position: string
): TrainingPrescription | null {
  // 发球稳定性问题
  if (weakness.includes("发球") || weakness.includes("发球失误") || errorTags.includes("serve-error")) {
    return {
      id: "serve-consistency",
      category: "发球",
      title: "保守落点发球训练",
      description: "专注落点控制而非力量，建立稳定的发球节奏",
      execution: {
        duration: "15分钟",
        sets: 3,
        reps: "20球/组",
        intensity: "medium",
      },
      targetIssue: "发球失误偏多，稳定性不足",
      successCriteria: "连续10次发球不失误，且落点在目标区域",
      commonMistakes: ["过于追求力量", "抛球不稳定", "击球点过低"],
      progression: "稳定后逐步增加力量和变化",
    }
  }
  
  // 一传问题
  if (weakness.includes("一传") || weakness.includes("接发") || errorTags.includes("receive-error")) {
    return {
      id: "reception-stability",
      category: "一传",
      title: "连续到位惩罚重做",
      description: "模拟实战接发，连续不到位则重新开始，强化稳定性",
      execution: {
        duration: "20分钟",
        sets: 2,
        reps: "连续15次到位",
        intensity: "high",
      },
      targetIssue: "一传到位率低，影响进攻组织",
      successCriteria: "连续15次接发，到位率≥70%",
      commonMistakes: ["手臂太紧", "没主动迎球", "判断慢"],
      progression: "增加发球难度（跳发、飘球）",
    }
  }
  
  // 进攻效率问题
  if (weakness.includes("进攻") || weakness.includes("扣球") || errorTags.includes("attack-error")) {
    if (position === "middle_blocker") {
      return {
        id: "quick-attack-timing",
        category: "快攻",
        title: "快攻起跳时机专项",
        description: "与二传配合，精准把握快攻起跳时机",
        execution: {
          duration: "15分钟",
          sets: 4,
          reps: "10次/组",
          intensity: "high",
        },
        targetIssue: "快攻节奏不稳定，时机把握不准",
        successCriteria: "与二传配合，10次中有7次以上节奏到位",
        commonMistakes: ["起跳太早/太晚", "上步距离不对", "没看二传球"],
        progression: "增加移动距离、变化节奏",
      }
    }
    
    return {
      id: "attack-shot-selection",
      category: "进攻",
      title: "线路选择决策训练",
      description: "面对不同拦网情况，练习最合理的线路选择",
      execution: {
        duration: "20分钟",
        sets: 3,
        reps: "15球/组",
        intensity: "medium",
      },
      targetIssue: "进攻选点不当，往人堆里打",
      successCriteria: "15次进攻中，合理选点≥10次，成功率≥60%",
      commonMistakes: ["无视拦网硬打", "变化太少", "点太低"],
      progression: "增加对抗，模拟实战拦网",
    }
  }
  
  // 拦网问题
  if (weakness.includes("拦网") || errorTags.includes("block-error")) {
    return {
      id: "block-timing",
      category: "拦网",
      title: "拦网时机与手型",
      description: "专注拦网起跳时机和手型控制",
      execution: {
        duration: "15分钟",
        sets: 3,
        reps: "15次/组",
        intensity: "medium",
      },
      targetIssue: "拦网时机不准，被借手或漏球",
      successCriteria: "15次拦网中，有效触球≥10次",
      commonMistakes: ["起跳太早", "手型不包球", "盯球不盯人"],
      progression: "增加移动拦网、双人拦网配合",
    }
  }
  
  // 关键分问题
  if (weakness.includes("关键分") || weakness.includes("局末") || errorTags.includes("clutch-error")) {
    return {
      id: "clutch-simulation",
      category: "关键分",
      title: "局末模拟：21:21 开始打",
      description: "从21:21开始打6轮，模拟关键分压力情境",
      execution: {
        duration: "20分钟",
        sets: 3,
        reps: "6轮/组",
        intensity: "high",
      },
      targetIssue: "关键分处理急躁或保守，心理素质不足",
      successCriteria: "6轮中至少赢3轮，且主动失误≤2次",
      commonMistakes: ["过于保守", "强行冒险", "注意力分散"],
      progression: "增加比分压力（如必须连得2分）",
    }
  }
  
  // 防守问题
  if (weakness.includes("防守") || errorTags.includes("defense-error")) {
    return {
      id: "defense-coverage",
      category: "防守",
      title: "防守覆盖与保护专项",
      description: "强化防守站位意识，练习后排保护移动",
      execution: {
        duration: "15分钟",
        sets: 3,
        reps: "10球/组",
        intensity: "high",
      },
      targetIssue: "防守覆盖不足，保护不到位",
      successCriteria: "10次防守中，到位起球≥6次",
      commonMistakes: ["站位太死", "启动慢", "没保护意识"],
      progression: "增加变化球、重扣球",
    }
  }
  
  // 失误控制问题
  if (weakness.includes("失误") || weakness.includes("稳定性")) {
    return {
      id: "error-control",
      category: "稳定性",
      title: "保守处理专项",
      description: "在不舒服的球位练习安全处理，减少无谓失误",
      execution: {
        duration: "15分钟",
        sets: 3,
        reps: "15球/组",
        intensity: "low",
      },
      targetIssue: "无谓失误偏多，处理球不够稳健",
      successCriteria: "15次不舒服球位处理，失误≤2次",
      commonMistakes: ["强行进攻", "想太多", "动作变形"],
      progression: "逐步增加处理难度",
    }
  }
  
  return null
}

// 通用处方（无特定弱点时）
function getGenericPrescription(position: string): TrainingPrescription {
  const positionSpecific: Record<string, TrainingPrescription> = {
    outside_hitter: {
      id: "generic-oh",
      category: "综合",
      title: "主攻一攻专项",
      description: "强化一攻稳定性和变化能力",
      execution: { duration: "20分钟", sets: 3, reps: "15球/组", intensity: "medium" },
      targetIssue: "保持现有状态，强化优势",
      successCriteria: "一攻成功率≥60%",
      commonMistakes: ["节奏单一", "线路太正"],
    },
    middle_blocker: {
      id: "generic-mb",
      category: "综合",
      title: "副攻拦网预判",
      description: "提升拦网预判和移动速度",
      execution: { duration: "15分钟", sets: 3, reps: "10次/组", intensity: "medium" },
      targetIssue: "保持拦网威胁",
      successCriteria: "有效拦网率≥50%",
      commonMistakes: ["预判慢", "移动不到位"],
    },
    setter: {
      id: "generic-setter",
      category: "综合",
      title: "二传节奏变化",
      description: "练习不同节奏的传球，增加进攻变化",
      execution: { duration: "20分钟", sets: 3, reps: "各节奏10次", intensity: "medium" },
      targetIssue: "丰富进攻组织手段",
      successCriteria: "各节奏传球到位率≥80%",
      commonMistakes: ["节奏单一", "分配不匀"],
    },
    opposite: {
      id: "generic-opposite",
      category: "综合",
      title: "接应调整攻",
      description: "强化困难球调整攻能力",
      execution: { duration: "20分钟", sets: 3, reps: "15球/组", intensity: "high" },
      targetIssue: "提升调整攻稳定性",
      successCriteria: "调整攻成功率≥50%",
      commonMistakes: ["强行发力", "线路单一"],
    },
    libero: {
      id: "generic-libero",
      category: "综合",
      title: "自由人串联训练",
      description: "强化一传-防守-调整传球的串联",
      execution: { duration: "20分钟", sets: 3, reps: "连续10次", intensity: "medium" },
      targetIssue: "保持保障环节稳定",
      successCriteria: "各环节到位率≥75%",
      commonMistakes: ["串联脱节", "判断失误"],
    },
  }
  
  return positionSpecific[position] || {
    id: "generic",
    category: "综合",
    title: "全面技术巩固",
    description: "保持训练量，巩固现有技术",
    execution: { duration: "30分钟", sets: 3, reps: "按需", intensity: "medium" },
    targetIssue: "保持状态",
    successCriteria: "完成训练量，技术动作不变形",
    commonMistakes: ["训练态度松懈"],
  }
}

// 生成处方文本（用于报告展示）
export function formatPrescriptionForReport(p: TrainingPrescription): string {
  const lines: string[] = []
  lines.push(`${p.category}：${p.title}`)
  lines.push(`时长：${p.execution.duration} | 强度：${p.execution.intensity === "high" ? "高" : p.execution.intensity === "medium" ? "中" : "低"}`)
  
  if (p.execution.sets && p.execution.reps) {
    lines.push(`量：${p.execution.sets}组 × ${p.execution.reps}`)
  }
  
  lines.push(`针对：${p.targetIssue}`)
  lines.push(`达标：${p.successCriteria}`)
  
  return lines.join("\n")
}

// 生成简洁版处方（用于分享）
export function formatPrescriptionBrief(p: TrainingPrescription): string {
  return `${p.title}（${p.execution.duration}）：${p.execution.sets}组×${p.execution.reps}，${p.targetIssue}`
}
