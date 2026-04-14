/**
 * 金标准数据采集协议 (Gold Standard Data Collection)
 * 
 * 核心原则：$Y_{true}$ 必须极度标准化，不能是随口的"我觉得挺好"
 * 
 * 采集流程：
 * 1. 找到 4-6 场有完整录像的校队比赛
 * 2. 让教练在不知道系统评分的情况下看完比赛
 * 3. 强制教练输出三项指标：绝对评分、相对排序、核心痛点
 * 4. 将系统评分与教练评分盲测对比
 */

// ============ 金标准数据结构 ============

export interface GoldStandardEntry {
  // 标识信息
  id: string
  matchId: string
  matchName: string
  matchDate: string
  
  // 球员信息
  playerId: string
  playerName: string
  playerPosition: string
  
  // 教练评估 (盲测 - 教练填写)
  coachEvaluation: {
    coachId: string
    coachName: string
    evaluationDate: string
    
    // 1. 绝对评分 (0-100)
    absoluteScore: number
    
    // 2. 相对排序 (1-N，同场比赛内)
    rankInMatch: number
    totalPlayersInMatch: number
    
    // 3. 核心痛点诊断 (一句话)
    coreWeakness: string
    
    // 可选：亮点
    coreStrength?: string
    
    // 教练置信度
    coachConfidence: "high" | "medium" | "low"
  }
  
  // 系统评分 (由系统计算)
  systemScores: {
    v1: {
      overallScore: number
      subScores: {
        scoring: number
        errorControl: number
        stability: number
        clutch: number
      }
      timestamp: string
    }
    v2: {
      overallScore: number
      confidenceInterval: [number, number]  // [lower, upper]
      posteriorMean: number
      driftDetected: boolean
      timestamp: string
    }
  }
  
  // 录像信息
  videoEvidence: {
    videoUrl: string
    startTime?: string  // 球员上场时间
    endTime?: string
    clips?: Array<{
      timestamp: string
      description: string
      relevantTo: "weakness" | "strength"
    }>
  }
  
  // 快录数据
  quickInput: {
    inputBy: string
    inputMethod: "mobile_app" | "voice" | "web"
    rawData: Record<string, any>
    timestamp: string
  }
  
  // 元数据
  metadata: {
    createdAt: string
    updatedAt: string
    status: "pending" | "completed" | "disputed"
    notes?: string
  }
}

// ============ 教练盲测表模板 ============

export interface CoachBlindTestForm {
  // 表头信息
  formId: string
  coachName: string
  coachCredentials: string  // 执教年限、带队成绩等
  evaluationDate: string
  
  // 比赛信息
  matchName: string
  opponent: string
  matchDate: string
  matchImportance: "training" | "friendly" | "league" | "playoff" | "final"
  
  // 评估说明
  instructions: string
  
  // 球员评估列表
  playerEvaluations: Array<{
    playerId: string
    playerName: string
    playerPosition: string
    jerseyNumber?: string
    
    // 评估项目
    absoluteScore: number  // 0-100
    rankInMatch: number    // 本场排名
    coreWeakness: string   // 必须一句话
    coreStrength?: string  // 可选
    
    // 置信度
    confidence: "high" | "medium" | "low"
    confidenceReason?: string
  }>
  
  // 整体评估
  overallNotes?: string
  
  // 签名确认
  coachSignature: string
  completedAt: string
}

// ============ 盲测表生成器 ============

export function generateCoachBlindTestForm(
  matchName: string,
  opponent: string,
  matchDate: string,
  players: Array<{ id: string; name: string; position: string; jerseyNumber?: string }>,
  coachName: string
): CoachBlindTestForm {
  return {
    formId: `blind-${Date.now()}`,
    coachName,
    coachCredentials: "",  // 由教练填写
    evaluationDate: new Date().toISOString().split("T")[0],
    
    matchName,
    opponent,
    matchDate,
    matchImportance: "league",
    
    instructions: `
【盲测说明】
1. 请在观看完整场比赛录像后填写此表
2. 绝对评分：基于你的执教经验，给每位球员打一个 0-100 的综合分
3. 相对排序：给出本场球员的表现排名（1=最佳）
4. 核心痛点：用一句话概括该球员本场最大的问题，必须具体可操作
5. 置信度：你对这个评估的确定程度

⚠️ 重要：
- 不要参考任何外部评分系统
- 基于你的直觉和经验判断
- 如果某位球员出场时间太少，请标注"样本不足"
    `.trim(),
    
    playerEvaluations: players.map((p, index) => ({
      playerId: p.id,
      playerName: p.name,
      playerPosition: p.position,
      jerseyNumber: p.jerseyNumber,
      absoluteScore: 0,
      rankInMatch: 0,
      coreWeakness: "",
      coreStrength: "",
      confidence: "medium",
      confidenceReason: ""
    })),
    
    coachSignature: "",
    completedAt: ""
  }
}

// ============ 金标准数据收集 ============

const GOLD_STANDARD_KEY = "athlete_insight_gold_standard"

export function saveGoldStandard(entry: GoldStandardEntry): void {
  if (typeof window === "undefined") return
  
  const existing = JSON.parse(localStorage.getItem(GOLD_STANDARD_KEY) || "[]")
  
  // 检查是否已存在
  const index = existing.findIndex((e: GoldStandardEntry) => 
    e.matchId === entry.matchId && e.playerId === entry.playerId
  )
  
  if (index >= 0) {
    existing[index] = entry
  } else {
    existing.push(entry)
  }
  
  localStorage.setItem(GOLD_STANDARD_KEY, JSON.stringify(existing))
}

export function getAllGoldStandard(): GoldStandardEntry[] {
  if (typeof window === "undefined") return []
  return JSON.parse(localStorage.getItem(GOLD_STANDARD_KEY) || "[]")
}

export function getGoldStandardByMatch(matchId: string): GoldStandardEntry[] {
  return getAllGoldStandard().filter(e => e.matchId === matchId)
}

export function exportGoldStandardData(): string {
  const data = getAllGoldStandard()
  return JSON.stringify(data, null, 2)
}

// ============ 数据录入辅助工具 ============

export interface QuickInputForm {
  matchName: string
  matchDate: string
  evaluator: string
  
  players: Array<{
    playerId: string
    playerName: string
    position: string
    
    // 快速输入字段
    totalPoints: number
    totalPointsLost: number
    attackKills: number
    attackErrors: number
    serveAces: number
    serveErrors: number
    blockPoints: number
    digs: number
    
    // 主观评估
    receptionRating: "excellent" | "good" | "average" | "poor"
    clutchRating: "excellent" | "good" | "average" | "poor"
    
    // 观察
    topStrength: string
    topWeakness: string
  }>
}

export function createQuickInputFromVideo(
  videoMetadata: {
    matchName: string
    matchDate: string
    players: Array<{ id: string; name: string; position: string }>
  },
  evaluator: string
): QuickInputForm {
  return {
    matchName: videoMetadata.matchName,
    matchDate: videoMetadata.matchDate,
    evaluator,
    players: videoMetadata.players.map(p => ({
      playerId: p.id,
      playerName: p.name,
      position: p.position,
      totalPoints: 0,
      totalPointsLost: 0,
      attackKills: 0,
      attackErrors: 0,
      serveAces: 0,
      serveErrors: 0,
      blockPoints: 0,
      digs: 0,
      receptionRating: "average",
      clutchRating: "average",
      topStrength: "",
      topWeakness: ""
    }))
  }
}

// ============ 数据导出格式 ============

export interface GoldStandardExport {
  exportDate: string
  totalEntries: number
  matches: string[]
  coaches: string[]
  entries: GoldStandardEntry[]
  
  // 统计摘要
  summary: {
    avgAbsoluteScore: number
    scoreRange: [number, number]
    confidenceDistribution: {
      high: number
      medium: number
      low: number
    }
  }
}

export function exportForAnalysis(): GoldStandardExport {
  const entries = getAllGoldStandard()
  
  const scores = entries.map(e => e.coachEvaluation.absoluteScore)
  const confidences = entries.map(e => e.coachEvaluation.coachConfidence)
  
  return {
    exportDate: new Date().toISOString(),
    totalEntries: entries.length,
    matches: Array.from(new Set(entries.map(e => e.matchId))),
    coaches: Array.from(new Set(entries.map(e => e.coachEvaluation.coachId))),
    entries,
    summary: {
      avgAbsoluteScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10,
      scoreRange: [Math.min(...scores), Math.max(...scores)],
      confidenceDistribution: {
        high: confidences.filter(c => c === "high").length,
        medium: confidences.filter(c => c === "medium").length,
        low: confidences.filter(c => c === "low").length,
      }
    }
  }
}
