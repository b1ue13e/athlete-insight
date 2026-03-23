/**
 * 10份高质量样例数据
 * 
 * 覆盖画像：
 * 1. 高得分高失误型 - 进攻强但波动大
 * 2. 低失误稳定型 - 稳定但缺乏亮点
 * 3. 关键分掉链子型 - 常规好关键差
 * 4. 一传拖后腿型 - 主攻一传问题
 * 5. 防守积极但终结弱型 - 自由人/防守型
 * 6. 全面低迷型 - 各方面都不行
 * 7. 爆发但波动很大型 - 时好时坏
 * 8. 稳定高效型 - 全面优秀
 * 9. 二传组织型 - 不追求得分
 * 10. 副攻拦网型 - 网口核心
 */

import { VolleyballFormData, AnalysisSession } from "@/types"
import { analyzeVolleyball } from "./mock-analysis"
import { versionToString, CURRENT_SCORING_VERSION } from "./scoring-version"

// 基础数据模板
const baseData: VolleyballFormData = {
  match_name: "",
  opponent: "",
  player_position: "主攻",
  session_date: "2026-03-20",
  total_points: 15,
  total_points_lost: 10,
  serve_aces: 2,
  serve_errors: 2,
  attack_kills: 10,
  attack_errors: 2,
  blocked_times: 2,
  reception_success_rate: 65,
  block_points: 2,
  digs: 6,
  clutch_performance_score: 65,
  error_tags: [],
  notes: "",
}

// 1. 高得分高失误型 (主攻)
const highScoringHighError: VolleyballFormData = {
  ...baseData,
  match_name: "vs 计算机学院 - 高波动表现",
  opponent: "计算机学院",
  player_position: "主攻",
  total_points: 22,
  total_points_lost: 12,
  serve_aces: 4,
  serve_errors: 5,
  attack_kills: 16,
  attack_errors: 5,
  blocked_times: 3,
  reception_success_rate: 58,
  block_points: 1,
  digs: 5,
  clutch_performance_score: 72,
  error_tags: ["发球失误", "扣球失误"],
  notes: "进攻端贡献突出，但失误偏多影响整体稳定性",
}

// 2. 低失误稳定型 (接应)
const stableLowError: VolleyballFormData = {
  ...baseData,
  match_name: "vs 机械学院 - 稳健发挥",
  opponent: "机械学院",
  player_position: "接应",
  total_points: 14,
  total_points_lost: 11,
  serve_aces: 1,
  serve_errors: 1,
  attack_kills: 9,
  attack_errors: 1,
  blocked_times: 1,
  reception_success_rate: 72,
  block_points: 2,
  digs: 7,
  clutch_performance_score: 68,
  error_tags: [],
  notes: "表现稳定但缺乏爆发力，得分贡献一般",
}

// 3. 关键分掉链子型 (主攻)
const clutchWeak: VolleyballFormData = {
  ...baseData,
  match_name: "vs 经管学院 - 关键局失利",
  opponent: "经管学院",
  player_position: "主攻",
  total_points: 18,
  total_points_lost: 9,
  serve_aces: 3,
  serve_errors: 2,
  attack_kills: 12,
  attack_errors: 3,
  blocked_times: 2,
  reception_success_rate: 68,
  block_points: 2,
  digs: 6,
  clutch_performance_score: 48,
  error_tags: ["关键分处理"],
  notes: "常规时间表现不错，但局末关键分连续失误",
}

// 4. 一传拖后腿型 (主攻)
const receptionWeak: VolleyballFormData = {
  ...baseData,
  match_name: "vs 法学院 - 一传问题",
  opponent: "法学院",
  player_position: "主攻",
  total_points: 16,
  total_points_lost: 10,
  serve_aces: 2,
  serve_errors: 3,
  attack_kills: 11,
  attack_errors: 2,
  blocked_times: 2,
  reception_success_rate: 48,
  block_points: 2,
  digs: 5,
  clutch_performance_score: 62,
  error_tags: ["一传不到位"],
  notes: "进攻端尚可，但一传到位率严重影响全队进攻组织",
}

// 5. 防守积极型自由人
const defenseStrongWeakFinish: VolleyballFormData = {
  ...baseData,
  match_name: "vs 医学院 - 防守大战",
  opponent: "医学院",
  player_position: "自由人",
  total_points: 3,
  total_points_lost: 8,
  serve_aces: 0,
  serve_errors: 0,
  attack_kills: 0,
  attack_errors: 1,
  blocked_times: 0,
  reception_success_rate: 76,
  block_points: 0,
  digs: 18,
  clutch_performance_score: 70,
  error_tags: [],
  notes: "防守端表现亮眼，一传稳定，但自由人本职定位清晰",
}

// 6. 全面低迷型 (主攻)
const overallWeak: VolleyballFormData = {
  ...baseData,
  match_name: "vs 体育学院 - 全面被压制",
  opponent: "体育学院",
  player_position: "主攻",
  total_points: 8,
  total_points_lost: 18,
  serve_aces: 0,
  serve_errors: 6,
  attack_kills: 5,
  attack_errors: 6,
  blocked_times: 4,
  reception_success_rate: 52,
  block_points: 0,
  digs: 3,
  clutch_performance_score: 45,
  error_tags: ["发球失误", "扣球失误", "被拦", "一传不到位"],
  notes: "各方面表现均低于正常水平，需要调整状态",
}

// 7. 爆发但波动很大型 (接应)
const volatilePerformance: VolleyballFormData = {
  ...baseData,
  match_name: "vs 艺术学院 - 神一场鬼一场",
  opponent: "艺术学院",
  player_position: "接应",
  total_points: 20,
  total_points_lost: 15,
  serve_aces: 5,
  serve_errors: 4,
  attack_kills: 14,
  attack_errors: 4,
  blocked_times: 3,
  reception_success_rate: 55,
  block_points: 1,
  digs: 4,
  clutch_performance_score: 75,
  error_tags: ["发球失误", "状态波动"],
  notes: "高光时刻不少，但稳定性极差，表现起伏大",
}

// 8. 稳定高效型 (主攻) - 优秀标杆
const stableEfficient: VolleyballFormData = {
  ...baseData,
  match_name: "vs 外语学院 - 完美发挥",
  opponent: "外语学院",
  player_position: "主攻",
  total_points: 19,
  total_points_lost: 8,
  serve_aces: 3,
  serve_errors: 1,
  attack_kills: 13,
  attack_errors: 1,
  blocked_times: 1,
  reception_success_rate: 78,
  block_points: 3,
  digs: 8,
  clutch_performance_score: 82,
  error_tags: [],
  notes: "各方面表现均衡出色，是理想的主力主攻表现",
}

// 9. 二传组织型 (二传)
const setterType: VolleyballFormData = {
  ...baseData,
  match_name: "vs 化工学院 - 组织核心",
  opponent: "化工学院",
  player_position: "二传",
  total_points: 6,
  total_points_lost: 7,
  serve_aces: 1,
  serve_errors: 1,
  attack_kills: 3,
  attack_errors: 1,
  blocked_times: 1,
  reception_success_rate: 82,
  block_points: 1,
  digs: 12,
  clutch_performance_score: 74,
  error_tags: [],
  notes: "不追求个人得分，一传和防守表现优秀，组织调度稳定",
}

// 10. 副攻拦网型 (副攻)
const middleBlocker: VolleyballFormData = {
  ...baseData,
  match_name: "vs 土木学院 - 网口统治",
  opponent: "土木学院",
  player_position: "副攻",
  total_points: 12,
  total_points_lost: 9,
  serve_aces: 1,
  serve_errors: 2,
  attack_kills: 7,
  attack_errors: 2,
  blocked_times: 1,
  reception_success_rate: 60,
  block_points: 6,
  digs: 4,
  clutch_performance_score: 68,
  error_tags: [],
  notes: "拦网端表现突出，快攻效率尚可，符合副攻定位",
}

// 所有样例数据
export const sampleSessionsData: VolleyballFormData[] = [
  highScoringHighError,   // 78分 - 进攻强失误多
  stableLowError,         // 72分 - 稳定但平淡
  clutchWeak,             // 68分 - 常规好关键差
  receptionWeak,          // 65分 - 一传问题
  defenseStrongWeakFinish,// 71分 - 自由人标杆
  overallWeak,            // 48分 - 全面低迷
  volatilePerformance,    // 74分 - 波动大
  stableEfficient,        // 88分 - 优秀标杆
  setterType,             // 76分 - 二传定位
  middleBlocker,          // 79分 - 副攻标杆
]

// 生成 AnalysisSession 数组
export function generateSampleSessions(): AnalysisSession[] {
  const sessions: AnalysisSession[] = []
  
  sampleSessionsData.forEach((data, index) => {
    // 使用新的分析引擎，包含调试信息
    const report = analyzeVolleyball(data, { includeDebug: true })
    
    // 生成不同日期
    const date = new Date("2026-03-01")
    date.setDate(date.getDate() + index * 3)
    
    const session: AnalysisSession = {
      id: `session-sample-${index + 1}`,
      athlete_id: "athlete-001",
      sport_type: "volleyball",
      title: data.match_name,
      session_date: date.toISOString().split("T")[0],
      status: "completed",
      input_method: "manual",
      raw_input: data,
      derived_metrics: report.metrics.derived,
      overall_score: report.overview.overall_score,
      report_json: report,
      summary_text: report.overview.one_line_summary,
      model_version: versionToString(CURRENT_SCORING_VERSION),
      created_at: date.toISOString(),
      updated_at: date.toISOString(),
    }
    
    sessions.push(session)
  })
  
  return sessions
}

// 导出单个样例用于测试
export { 
  highScoringHighError,
  stableLowError,
  clutchWeak,
  receptionWeak,
  defenseStrongWeakFinish,
  overallWeak,
  volatilePerformance,
  stableEfficient,
  setterType,
  middleBlocker,
}

// 样例描述映射
export const sampleDescriptions: Record<string, string> = {
  "vs 计算机学院 - 高波动表现": "高得分高失误型 - 进攻端有爆发力但稳定性不足",
  "vs 机械学院 - 稳健发挥": "低失误稳定型 - 表现稳定但缺乏亮点",
  "vs 经管学院 - 关键局失利": "关键分掉链子型 - 常规表现好但关键分处理欠佳",
  "vs 法学院 - 一传问题": "一传拖后腿型 - 接发环节影响整体发挥",
  "vs 医学院 - 防守大战": "防守积极型 - 自由人防守表现突出",
  "vs 体育学院 - 全面被压制": "全面低迷型 - 各方面均低于正常水平",
  "vs 艺术学院 - 神一场鬼一场": "爆发但波动型 - 高光与失误并存",
  "vs 外语学院 - 完美发挥": "稳定高效型 - 全面优秀的标杆表现",
  "vs 化工学院 - 组织核心": "二传组织型 - 不求得分专注组织",
  "vs 土木学院 - 网口统治": "副攻拦网型 - 网口防守核心",
}
