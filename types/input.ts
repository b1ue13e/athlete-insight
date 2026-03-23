/**
 * 录入模式类型定义
 * 
 * 支持两种模式：
 * 1. 快速模式 - 赛后立即填写，简化字段，选项代替精确数字
 * 2. 专业模式 - 有完整技术统计时使用
 */

// 位置类型 - 使用英文标识
export type VolleyballPosition = "outside_hitter" | "middle_blocker" | "setter" | "opposite" | "libero"

// 录入模式
export type InputMode = "quick" | "professional"

// 数据确定性级别
export type DataCertainty = "precise" | "estimated" | "subjective"

// 简化评估选项
export type SimplifiedRating = "excellent" | "good" | "average" | "poor" | "very_poor"

// 出场比例
export type ParticipationLevel = "25" | "50" | "75" | "100"

// 比赛重要性
export type MatchImportance = "training" | "regular" | "important" | "critical"

// 对手强度
export type OpponentStrength = "weak" | "average" | "strong" | "very_strong"

// 是否首发
export type StarterStatus = "starter" | "substitute" | "mid_game"

// 快速模式表单数据
export interface QuickVolleyballForm {
  // 基础信息
  athleteId: string
  matchName: string
  opponent?: string
  matchDate: string
  
  // 出场上下文
  participationLevel: ParticipationLevel
  starterStatus: StarterStatus
  matchImportance: MatchImportance
  opponentStrength: OpponentStrength
  
  // 核心表现（主观评估）
  overallPerformance: SimplifiedRating
  
  // 四个维度简化评估
  scoringRating: SimplifiedRating      // 得分贡献
  errorRating: SimplifiedRating        // 失误控制（反向：越高表示失误越少）
  receptionRating: SimplifiedRating    // 一传/防守表现
  clutchRating: SimplifiedRating       // 关键分表现
  
  // 关键数字（必须填的少数几个）
  pointsScored: number
  pointsLost: number
  majorErrors: number
  
  // 主要观察
  topStrength: string
  topWeakness: string
  errorTags: string[]
  notes?: string
}

// 专业模式表单数据（扩展原 VolleyballFormData）
export interface ProfessionalVolleyballForm {
  // 基础信息
  athleteId: string
  matchName: string
  opponent?: string
  position: VolleyballPosition
  matchDate: string
  
  // 出场上下文
  participationLevel: ParticipationLevel
  starterStatus: StarterStatus
  matchImportance: MatchImportance
  opponentStrength: OpponentStrength
  
  // 精确数据
  totalPoints: number
  totalPointsLost: number
  
  // 发球
  serveAces: number
  serveErrors: number
  
  // 进攻
  attackKills: number
  attackErrors: number
  blockedTimes: number
  
  // 防守 - 支持两种输入方式
  receptionInputMode: "precise" | "simplified"
  receptionSuccessRate?: number        // 精确模式：百分比
  receptionRating?: SimplifiedRating   // 简化模式：很好/一般/较差
  
  blockPoints: number
  digs: number
  
  // 关键分 - 支持两种输入方式
  clutchInputMode: "precise" | "simplified"
  clutchPerformanceScore?: number      // 精确模式：0-100
  clutchRating?: SimplifiedRating      // 简化模式：拖后腿/一般/稳定/敢打且有效
  
  errorTags: string[]
  notes?: string
}

// 统一表单类型
export type VolleyballInputForm = 
  | ({ mode: "quick" } & QuickVolleyballForm)
  | ({ mode: "professional" } & ProfessionalVolleyballForm)

// 表单元数据（用于报告页显示数据来源）
export interface FormMetadata {
  mode: InputMode
  dataCertainty: DataCertainty
  completedAt: string
  // 哪些字段是估算的
  estimatedFields: string[]
  // 哪些字段是主观的
  subjectiveFields: string[]
}

// 简化评估映射到分数区间
export const simplifiedRatingToScore: Record<SimplifiedRating, number> = {
  excellent: 85,
  good: 72,
  average: 60,
  poor: 45,
  very_poor: 30,
}

// 简化评估中文标签
export const simplifiedRatingLabels: Record<SimplifiedRating, string> = {
  excellent: "很好",
  good: "良好",
  average: "一般",
  poor: "较差",
  very_poor: "很差",
}

// 简化评估选项（用于表单选择器）
export const simplifiedRatingOptions: { value: SimplifiedRating; label: string }[] = [
  { value: "excellent", label: "很好" },
  { value: "good", label: "良好" },
  { value: "average", label: "一般" },
  { value: "poor", label: "较差" },
  { value: "very_poor", label: "很差" },
]

// 出场比例标签
export const participationLabels: Record<ParticipationLevel, string> = {
  "25": "约25%",
  "50": "约50%",
  "75": "约75%",
  "100": "全场",
}

// 比赛重要性标签
export const matchImportanceLabels: Record<MatchImportance, string> = {
  training: "训练赛",
  regular: "常规赛",
  important: "重要比赛",
  critical: "关键战役",
}

// 对手强度标签
export const opponentStrengthLabels: Record<OpponentStrength, string> = {
  weak: "较弱",
  average: "相当",
  strong: "较强",
  very_strong: "很强",
}

// 首发状态标签
export const starterStatusLabels: Record<StarterStatus, string> = {
  starter: "首发",
  substitute: "替补",
  mid_game: "中途上场",
}

// 关键分简化选项（带描述）
export const clutchRatingOptions: { value: SimplifiedRating; label: string; description: string }[] = [
  { value: "very_poor", label: "拖后腿", description: "关键分明显失常，局末处理急躁或保守" },
  { value: "poor", label: "偏弱", description: "关键分表现低于常规水平" },
  { value: "average", label: "一般", description: "关键分表现与常规持平，无明显亮点" },
  { value: "good", label: "稳定", description: "关键分能保持常规水平，不手软" },
  { value: "excellent", label: "敢打且有效", description: "关键分敢于承担责任，且能下球" },
]

// 一传简化选项
export const receptionRatingOptions: { value: SimplifiedRating; label: string; description: string }[] = [
  { value: "excellent", label: "很好", description: "接发稳定，到位率高，能给二传良好组织机会" },
  { value: "good", label: "良好", description: "接发较稳，多数到位，偶有波动" },
  { value: "average", label: "一般", description: "接发有起伏，到位率中等" },
  { value: "poor", label: "较差", description: "接发不稳，到位率偏低，影响进攻组织" },
  { value: "very_poor", label: "很差", description: "接发明显拖后腿，多次不到位或直接失误" },
]
