/**
 * 训练动作库向量化匹配系统
 * 
 * 核心理念：不要在 AI 中生成训练动作（容易产生幻觉或不专业建议），
 * 而是建立一个标准排球训练动作库，让 AI 根据诊断问题输出问题向量，
 * 在库中检索最匹配的训练处方。
 * 
 * 确保处方 100% 专业、可落地。
 */

import { cosinesim } from "./utils"

// ============ 标准训练动作库 ============

export interface TrainingAction {
  id: string
  category: string
  name: string
  description: string
  
  // 问题向量：这个训练动作能解决什么问题
  // 每个维度 -1 到 1，表示该动作对此问题的解决/恶化程度
  problemVector: ProblemVector
  
  // 元数据
  difficulty: "beginner" | "intermediate" | "advanced"
  duration: string
  equipment: string[]
  positionRelevance: string[]  // 适用的位置
  
  // 执行细节
  execution: {
    setup: string
    steps: string[]
    successCriteria: string
    commonMistakes: string[]
  }
  
  // 进阶/退阶
  progressions: string[]
  regressions: string[]
}

export interface ProblemVector {
  // 技术维度
  attackPower: number       // 进攻力量
  attackPrecision: number   // 进攻精度
  attackVariety: number     // 进攻变化
  serveConsistency: number  // 发球稳定性
  serveThreat: number       // 发球威胁
  receptionQuality: number  // 一传质量
  receptionRange: number    // 一传范围
  blockTiming: number       // 拦网时机
  blockReading: number      // 拦网预判
  defensePositioning: number // 防守站位
  digQuality: number        // 防守起球
  
  // 战术维度
  decisionMaking: number    // 决策能力
  courtAwareness: number    // 场上意识
  transitionSpeed: number   // 转换速度
  
  // 心理维度
  clutchPerformance: number // 关键分
  errorRecovery: number     // 失误恢复
  consistency: number       // 稳定性
  
  // 体能维度
  explosivePower: number    // 爆发力
  endurance: number         // 耐力
  reactionSpeed: number     // 反应速度
}

// 标准训练动作库
export const standardTrainingLibrary: TrainingAction[] = [
  // ========== 发球训练 ==========
  {
    id: "serve-consistency-basic",
    category: "发球",
    name: "落点控制发球",
    description: "专注落点控制而非力量，建立稳定的发球节奏",
    problemVector: {
      attackPower: 0, attackPrecision: 0, attackVariety: 0,
      serveConsistency: 0.9, serveThreat: 0.2, receptionQuality: 0, receptionRange: 0,
      blockTiming: 0, blockReading: 0, defensePositioning: 0, digQuality: 0,
      decisionMaking: 0, courtAwareness: 0, transitionSpeed: 0,
      clutchPerformance: 0.3, errorRecovery: 0.4, consistency: 0.6,
      explosivePower: 0, endurance: 0, reactionSpeed: 0,
    },
    difficulty: "beginner",
    duration: "15分钟",
    equipment: ["排球", "标志碟"],
    positionRelevance: ["主攻", "接应", "副攻", "二传", "自由人"],
    execution: {
      setup: "在发球区放置3个标志碟作为目标区域",
      steps: [
        "采用保守发球姿势，降低抛球高度",
        "专注抛球稳定性，确保落点可控",
        "击球时控制力量，优先保证成功率",
        "每次发球后自我评估，调整下一球",
      ],
      successCriteria: "连续10次发球不失误，且落点在目标区域内",
      commonMistakes: ["过于追求力量", "抛球不稳定", "击球点过低"],
    },
    progressions: ["增加发球速度", "缩小目标区域", "增加旋转"],
    regressions: ["扩大目标区域", "缩短发球距离", "允许一次失误"],
  },
  {
    id: "serve-aggressive",
    category: "发球",
    name: "攻击性跳发专项",
    description: "提升发球威胁，增加ACE率和破攻率",
    problemVector: {
      attackPower: 0, attackPrecision: 0, attackVariety: 0,
      serveConsistency: -0.2, serveThreat: 0.9, receptionQuality: 0, receptionRange: 0,
      blockTiming: 0, blockReading: 0, defensePositioning: 0, digQuality: 0,
      decisionMaking: 0.2, courtAwareness: 0.3, transitionSpeed: 0,
      clutchPerformance: 0.2, errorRecovery: 0, consistency: 0,
      explosivePower: 0.4, endurance: 0, reactionSpeed: 0,
    },
    difficulty: "advanced",
    duration: "20分钟",
    equipment: ["排球", "测量带"],
    positionRelevance: ["主攻", "接应", "副攻"],
    execution: {
      setup: "在对方场区6号位、1号位、5号位标记目标",
      steps: [
        "练习助跑节奏，确保起跳点一致",
        "高抛球+充分展体",
        "击球点在最高点击打球的后上部",
        "追求速度和落点的平衡",
      ],
      successCriteria: "10次发球中，速度达标(男>90km/h,女>70km/h)且落点准确≥5次",
      commonMistakes: ["为了速度牺牲准确性", "起跳时机不对", "击球点偏低"],
    },
    progressions: ["增加发球变化(跳飘)", "连续多发", "压力情境发球"],
    regressions: ["降低速度要求", "固定落点", "原地跳发"],
  },
  
  // ========== 一传训练 ==========
  {
    id: "reception-stability",
    category: "一传",
    name: "连续到位惩罚重做",
    description: "模拟实战接发，连续不到位则重新开始，强化稳定性",
    problemVector: {
      attackPower: 0, attackPrecision: 0, attackVariety: 0,
      serveConsistency: 0, serveThreat: 0, receptionQuality: 0.8, receptionRange: 0.3,
      blockTiming: 0, blockReading: 0, defensePositioning: 0, digQuality: 0,
      decisionMaking: 0.2, courtAwareness: 0.2, transitionSpeed: 0,
      clutchPerformance: 0.3, errorRecovery: 0.5, consistency: 0.7,
      explosivePower: 0, endurance: 0.3, reactionSpeed: 0.2,
    },
    difficulty: "intermediate",
    duration: "20分钟",
    equipment: ["排球", "发球机/陪练"],
    positionRelevance: ["主攻", "接应", "自由人"],
    execution: {
      setup: "5号位接发，二传在网前准备",
      steps: [
        "准备姿势：重心低，手臂放松",
        "根据发球类型调整站位",
        "击球点在身前，手臂平面稳定",
        "一次不到位则计数归零",
      ],
      successCriteria: "连续15次接发，到位率≥70%",
      commonMistakes: ["手臂太紧", "没主动迎球", "判断慢"],
    },
    progressions: ["增加发球难度(跳发)", "扩大接发范围", "加入移动"],
    regressions: ["降低到位标准", "允许失误", "减少连续次数要求"],
  },
  {
    id: "reception-range",
    category: "一传",
    name: "大范围救球专项",
    description: "强化大范围移动中的接发能力",
    problemVector: {
      attackPower: 0, attackPrecision: 0, attackVariety: 0,
      serveConsistency: 0, serveThreat: 0, receptionQuality: 0.4, receptionRange: 0.9,
      blockTiming: 0, blockReading: 0, defensePositioning: 0.3, digQuality: 0.4,
      decisionMaking: 0.3, courtAwareness: 0.3, transitionSpeed: 0.2,
      clutchPerformance: 0, errorRecovery: 0, consistency: 0,
      explosivePower: 0.3, endurance: 0.4, reactionSpeed: 0.4,
    },
    difficulty: "advanced",
    duration: "20分钟",
    equipment: ["排球", "标志桶"],
    positionRelevance: ["主攻", "自由人"],
    execution: {
      setup: "在接发区域放置多个发球点",
      steps: [
        "从中心位置启动",
        "判断发球方向后快速移动",
        "在移动中保持身体平衡",
        "倒地救球技术",
      ],
      successCriteria: "10次大范围发球中，救起≥6次，其中到位≥3次",
      commonMistakes: ["启动慢", "倒地技术不规范", "起球质量差"],
    },
    progressions: ["增加发球速度", "连续多发", "接发后进攻"],
    regressions: ["减小移动范围", "降低速度", "允许不完美起球"],
  },
  
  // ========== 进攻训练 ==========
  {
    id: "attack-shot-selection",
    category: "进攻",
    name: "线路选择决策训练",
    description: "面对不同拦网情况，练习最合理的线路选择",
    problemVector: {
      attackPower: 0.2, attackPrecision: 0.6, attackVariety: 0.7,
      serveConsistency: 0, serveThreat: 0, receptionQuality: 0, receptionRange: 0,
      blockTiming: 0.2, blockReading: 0.5, defensePositioning: 0, digQuality: 0,
      decisionMaking: 0.8, courtAwareness: 0.6, transitionSpeed: 0,
      clutchPerformance: 0.2, errorRecovery: 0, consistency: 0.3,
      explosivePower: 0, endurance: 0, reactionSpeed: 0.2,
    },
    difficulty: "intermediate",
    duration: "20分钟",
    equipment: ["排球", "标志碟", "拦网架/陪练"],
    positionRelevance: ["主攻", "接应", "副攻"],
    execution: {
      setup: "4号位进攻，设置不同拦网配置",
      steps: [
        "观察拦网手型和站位",
        "选择空当线路(直线/斜线/小斜)",
        "根据传球质量调整进攻方式",
        "强打、吊球、轻拍的选择",
      ],
      successCriteria: "15次进攻中，合理选点≥10次，成功率≥60%",
      commonMistakes: ["无视拦网硬打", "变化太少", "点太低"],
    },
    progressions: ["增加对抗", "模拟实战拦网", "限制进攻方式"],
    regressions: ["无拦网", "固定线路", "慢速传球"],
  },
  {
    id: "attack-chaos-ball",
    category: "进攻",
    name: "调整攻/乱球处理",
    description: "强化困难球调整攻能力",
    problemVector: {
      attackPower: 0.3, attackPrecision: 0.5, attackVariety: 0.4,
      serveConsistency: 0, serveThreat: 0, receptionQuality: 0, receptionRange: 0,
      blockTiming: 0, blockReading: 0.3, defensePositioning: 0, digQuality: 0,
      decisionMaking: 0.6, courtAwareness: 0.4, transitionSpeed: 0.3,
      clutchPerformance: 0.3, errorRecovery: 0.5, consistency: 0.4,
      explosivePower: 0.2, endurance: 0, reactionSpeed: 0.3,
    },
    difficulty: "advanced",
    duration: "20分钟",
    equipment: ["排球", "抛球器/陪练"],
    positionRelevance: ["主攻", "接应", "副攻"],
    execution: {
      setup: "2号位、4号位随机抛球",
      steps: [
        "快速判断球的位置和速度",
        "调整步伐找击球点",
        "选择合适的进攻方式(强打/吊球/过渡)",
        "控制失误，保证过网",
      ],
      successCriteria: "15次调整攻，成功率≥50%，失误≤3次",
      commonMistakes: ["强行发力", "线路单一", "失误率高"],
    },
    progressions: ["增加拦网", "减少调整时间", "限定进攻方式"],
    regressions: ["固定位置", "增加调整时间", "允许过渡球"],
  },
  {
    id: "quick-attack-timing",
    category: "进攻",
    name: "快攻起跳时机专项",
    description: "与二传配合，精准把握快攻起跳时机",
    problemVector: {
      attackPower: 0.1, attackPrecision: 0.7, attackVariety: 0,
      serveConsistency: 0, serveThreat: 0, receptionQuality: 0, receptionRange: 0,
      blockTiming: 0, blockReading: 0, defensePositioning: 0, digQuality: 0,
      decisionMaking: 0.4, courtAwareness: 0.3, transitionSpeed: 0.5,
      clutchPerformance: 0, errorRecovery: 0, consistency: 0.6,
      explosivePower: 0.3, endurance: 0, reactionSpeed: 0.5,
    },
    difficulty: "advanced",
    duration: "15分钟",
    equipment: ["排球"],
    positionRelevance: ["副攻"],
    execution: {
      setup: "3号位快攻配合",
      steps: [
        "观察二传传球节奏",
        "启动时机与传球同步",
        "上步距离和节奏控制",
        "空中身体姿态调整",
      ],
      successCriteria: "与二传配合，10次中有7次以上节奏到位",
      commonMistakes: ["起跳太早/太晚", "上步距离不对", "没看二传球"],
    },
    progressions: ["增加移动距离", "变化节奏(快球/背飞)", "实战对抗"],
    regressions: ["原地起跳", "固定节奏", "慢速传球"],
  },
  
  // ========== 拦网训练 ==========
  {
    id: "block-timing",
    category: "拦网",
    name: "拦网时机与手型",
    description: "专注拦网起跳时机和手型控制",
    problemVector: {
      attackPower: 0, attackPrecision: 0, attackVariety: 0,
      serveConsistency: 0, serveThreat: 0, receptionQuality: 0, receptionRange: 0,
      blockTiming: 0.8, blockReading: 0.3, defensePositioning: 0, digQuality: 0,
      decisionMaking: 0.2, courtAwareness: 0.3, transitionSpeed: 0,
      clutchPerformance: 0, errorRecovery: 0, consistency: 0.4,
      explosivePower: 0.4, endurance: 0, reactionSpeed: 0.3,
    },
    difficulty: "intermediate",
    duration: "15分钟",
    equipment: ["排球", "拦网架"],
    positionRelevance: ["副攻", "主攻", "接应"],
    execution: {
      setup: "3号位单人拦网",
      steps: [
        "观察进攻手助跑",
        "起跳时机：球离开手瞬间",
        "手型：前伸、下压、包球",
        "落地缓冲",
      ],
      successCriteria: "15次拦网中，有效触球≥10次",
      commonMistakes: ["起跳太早", "手型不包球", "盯球不盯人"],
    },
    progressions: ["增加移动拦网", "双人拦网配合", "实战对抗"],
    regressions: ["原地拦网", "慢速进攻", "固定线路"],
  },
  {
    id: "block-reading",
    category: "拦网",
    name: "拦网预判与移动",
    description: "提升拦网预判和移动速度",
    problemVector: {
      attackPower: 0, attackPrecision: 0, attackVariety: 0,
      serveConsistency: 0, serveThreat: 0, receptionQuality: 0, receptionRange: 0,
      blockTiming: 0.3, blockReading: 0.8, defensePositioning: 0.2, digQuality: 0,
      decisionMaking: 0.5, courtAwareness: 0.6, transitionSpeed: 0.4,
      clutchPerformance: 0, errorRecovery: 0, consistency: 0.3,
      explosivePower: 0.2, endurance: 0.2, reactionSpeed: 0.4,
    },
    difficulty: "advanced",
    duration: "20分钟",
    equipment: ["排球"],
    positionRelevance: ["副攻", "主攻"],
    execution: {
      setup: "3号位-2号位/4号位移动拦网",
      steps: [
        "观察一传质量预判进攻点",
        "并步/交叉步快速移动",
        "移动中保持面对进攻人",
        "最后一步制动起跳",
      ],
      successCriteria: "10次移动拦网中，到位≥6次，有效触球≥4次",
      commonMistakes: ["预判慢", "移动不到位", "起跳点不准"],
    },
    progressions: ["连续移动", "增加距离", "实战对抗"],
    regressions: ["短距离移动", "慢速进攻", "单人练习"],
  },
  
  // ========== 防守训练 ==========
  {
    id: "defense-positioning",
    category: "防守",
    name: "防守覆盖与保护专项",
    description: "强化防守站位意识，练习后排保护移动",
    problemVector: {
      attackPower: 0, attackPrecision: 0, attackVariety: 0,
      serveConsistency: 0, serveThreat: 0, receptionQuality: 0, receptionRange: 0,
      blockTiming: 0, blockReading: 0.2, defensePositioning: 0.8, digQuality: 0.4,
      decisionMaking: 0.4, courtAwareness: 0.6, transitionSpeed: 0.2,
      clutchPerformance: 0, errorRecovery: 0.2, consistency: 0.3,
      explosivePower: 0.2, endurance: 0.3, reactionSpeed: 0.3,
    },
    difficulty: "intermediate",
    duration: "15分钟",
    equipment: ["排球", "标志碟"],
    positionRelevance: ["自由人", "主攻", "接应"],
    execution: {
      setup: "6号位防守，模拟不同进攻点",
      steps: [
        "根据拦网配置调整站位",
        "重心低，启动快",
        "判断进攻方向后果断移动",
        "倒地/滚翻救球技术",
      ],
      successCriteria: "10次防守中，到位起球≥6次",
      commonMistakes: ["站位太死", "启动慢", "没保护意识"],
    },
    progressions: ["增加重扣球", "变化球", "连续防守"],
    regressions: ["轻打", "固定线路", "原地防守"],
  },
  
  // ========== 关键分训练 ==========
  {
    id: "clutch-simulation",
    category: "关键分",
    name: "局末模拟：21:21开始打",
    description: "从21:21开始打6轮，模拟关键分压力情境",
    problemVector: {
      attackPower: 0.2, attackPrecision: 0.2, attackVariety: 0,
      serveConsistency: 0, serveThreat: 0, receptionQuality: 0.2, receptionRange: 0,
      blockTiming: 0.2, blockReading: 0.2, defensePositioning: 0.2, digQuality: 0.2,
      decisionMaking: 0.5, courtAwareness: 0.3, transitionSpeed: 0,
      clutchPerformance: 0.9, errorRecovery: 0.6, consistency: 0.4,
      explosivePower: 0, endurance: 0, reactionSpeed: 0.2,
    },
    difficulty: "advanced",
    duration: "20分钟",
    equipment: ["排球", "记分牌"],
    positionRelevance: ["主攻", "接应", "副攻", "二传", "自由人"],
    execution: {
      setup: "模拟比赛21:21开始",
      steps: [
        "设定压力情境(如必须连得2分)",
        "全员参与，模拟实战",
        "每球后简短总结",
        "轮换发球和进攻点",
      ],
      successCriteria: "6轮中至少赢3轮，且主动失误≤2次",
      commonMistakes: ["过于保守", "强行冒险", "注意力分散"],
    },
    progressions: ["增加压力(必须连得3分)", "模拟赛点", "连续多局"],
    regressions: ["降低比分压力", "减少轮次", "允许更多失误"],
  },
  
  // ========== 体能训练 ==========
  {
    id: "plyometric-explosive",
    category: "体能",
    name: "爆发力 plyometric 训练",
    description: "提升弹跳和启动爆发力",
    problemVector: {
      attackPower: 0.4, attackPrecision: 0, attackVariety: 0,
      serveConsistency: 0, serveThreat: 0.3, receptionQuality: 0, receptionRange: 0,
      blockTiming: 0.3, blockReading: 0, defensePositioning: 0, digQuality: 0.2,
      decisionMaking: 0, courtAwareness: 0, transitionSpeed: 0.4,
      clutchPerformance: 0, errorRecovery: 0, consistency: 0,
      explosivePower: 0.9, endurance: 0.2, reactionSpeed: 0.5,
    },
    difficulty: "intermediate",
    duration: "20分钟",
    equipment: ["跳箱", "栏架", "药球"],
    positionRelevance: ["主攻", "接应", "副攻"],
    execution: {
      setup: "排球场边",
      steps: [
        "热身：动态拉伸5分钟",
        "跳箱练习：3组×8次",
        "栏架侧向跳：3组×10次",
        "药球抛掷：3组×8次",
        "放松：静态拉伸5分钟",
      ],
      successCriteria: "完成全部组数，动作质量不下降",
      commonMistakes: ["动作变形", "落地不稳", "休息不足"],
    },
    progressions: ["增加高度/重量", "增加组数", "减少休息时间"],
    regressions: ["降低高度/重量", "减少组数", "增加休息"],
  },
]

// ============ 向量化检索 ============

/**
 * 将问题描述转换为问题向量
 * 这是 AI 的核心工作：从诊断问题到向量空间
 */
export function problemToVector(
  weaknesses: string[],
  errorTags: string[],
  position: string
): Partial<ProblemVector> {
  const vector: Partial<ProblemVector> = {}
  
  // 基于弱点关键词映射到向量维度
  const weaknessKeywords: Record<string, (keyof ProblemVector)[]> = {
    "发球": ["serveConsistency", "serveThreat"],
    "失误": ["serveConsistency", "consistency", "errorRecovery"],
    "一传": ["receptionQuality", "receptionRange"],
    "接发": ["receptionQuality", "receptionRange"],
    "进攻": ["attackPower", "attackPrecision", "attackVariety"],
    "扣球": ["attackPower", "attackPrecision", "attackVariety"],
    "拦网": ["blockTiming", "blockReading"],
    "防守": ["defensePositioning", "digQuality"],
    "关键分": ["clutchPerformance"],
    "局末": ["clutchPerformance"],
    "决策": ["decisionMaking", "courtAwareness"],
    "判断": ["decisionMaking", "courtAwareness"],
    "稳定": ["consistency"],
  }
  
  // 统计每个维度的提及次数
  const dimensionCounts: Record<string, number> = {}
  
  weaknesses.forEach(w => {
    Object.entries(weaknessKeywords).forEach(([keyword, dimensions]) => {
      if (w.includes(keyword)) {
        dimensions.forEach(d => {
          dimensionCounts[d] = (dimensionCounts[d] || 0) + 1
        })
      }
    })
  })
  
  errorTags.forEach(tag => {
    if (tag.includes("serve")) {
      dimensionCounts["serveConsistency"] = (dimensionCounts["serveConsistency"] || 0) + 1
    }
    if (tag.includes("attack")) {
      dimensionCounts["attackPrecision"] = (dimensionCounts["attackPrecision"] || 0) + 1
    }
    if (tag.includes("block")) {
      dimensionCounts["blockTiming"] = (dimensionCounts["blockTiming"] || 0) + 1
    }
    if (tag.includes("receive")) {
      dimensionCounts["receptionQuality"] = (dimensionCounts["receptionQuality"] || 0) + 1
    }
    if (tag.includes("clutch")) {
      dimensionCounts["clutchPerformance"] = (dimensionCounts["clutchPerformance"] || 0) + 1
    }
  })
  
  // 转换为向量值 (-1 到 1，负值表示需要改进)
  Object.entries(dimensionCounts).forEach(([dim, count]) => {
    vector[dim as keyof ProblemVector] = -Math.min(1, count * 0.3)
  })
  
  return vector
}

/**
 * 计算向量相似度 (余弦相似度)
 */
export function calculateVectorSimilarity(
  v1: Partial<ProblemVector>,
  v2: ProblemVector
): number {
  const dimensions: (keyof ProblemVector)[] = [
    "attackPower", "attackPrecision", "attackVariety",
    "serveConsistency", "serveThreat",
    "receptionQuality", "receptionRange",
    "blockTiming", "blockReading",
    "defensePositioning", "digQuality",
    "decisionMaking", "courtAwareness", "transitionSpeed",
    "clutchPerformance", "errorRecovery", "consistency",
    "explosivePower", "endurance", "reactionSpeed",
  ]
  
  const vec1: number[] = []
  const vec2: number[] = []
  
  dimensions.forEach(d => {
    vec1.push(v1[d] || 0)
    vec2.push(v2[d] || 0)
  })
  
  return cosinesim(vec1, vec2)
}

/**
 * 检索最匹配的训练动作
 */
export function findMatchingTrainings(
  problemVector: Partial<ProblemVector>,
  position: string,
  limit: number = 3
): Array<{ action: TrainingAction; similarity: number }> {
  const scored = standardTrainingLibrary
    .filter(action => action.positionRelevance.includes(position))
    .map(action => ({
      action,
      similarity: calculateVectorSimilarity(problemVector, action.problemVector),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
  
  return scored
}

/**
 * 生成训练处方 (整合 AI 诊断和向量检索)
 */
export interface TrainingPrescriptionV2 {
  matchedAction: TrainingAction
  matchScore: number
  aiRecommendation?: string
  customization: {
    adjustedDuration?: string
    focusPoints: string[]
    note?: string
  }
}

export function generateTrainingPrescriptionsV2(
  weaknesses: string[],
  errorTags: string[],
  position: string,
  aiInsights?: string
): TrainingPrescriptionV2[] {
  const problemVector = problemToVector(weaknesses, errorTags, position)
  const matches = findMatchingTrainings(problemVector, position, 3)
  
  return matches.map(match => {
    const action = match.action
    
    // 根据匹配度生成定制化建议
    const focusPoints: string[] = []
    
    if (match.similarity > 0.7) {
      focusPoints.push("重点突破：此训练与当前问题高度匹配")
    }
    if (action.difficulty === "advanced") {
      focusPoints.push("建议在有基础后进阶到此训练")
    }
    if (action.equipment.length > 2) {
      focusPoints.push(`需要准备：${action.equipment.join(", ")}`)
    }
    
    return {
      matchedAction: action,
      matchScore: Math.round(match.similarity * 100),
      aiRecommendation: aiInsights,
      customization: {
        focusPoints,
        note: match.similarity < 0.5 ? "匹配度一般，可作为参考训练" : undefined,
      },
    }
  })
}
