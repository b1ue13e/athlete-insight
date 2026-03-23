/**
 * Sample Data and Mock Storage
 * 
 * 统一真相源规则：
 * - analysis_sessions.raw_input 是唯一真相源
 * - volleyball_inputs 表只是查询加速层
 * - 所有分析都基于 raw_input
 */

import { AnalysisSession, Athlete, VolleyballPosition } from "@/types"
import { generateSampleSessions, sampleDescriptions } from "./sample-sessions"

// Sample Athlete
export const sampleAthlete: Athlete = {
  id: "athlete-001",
  user_id: "user-001",
  name: "张明",
  gender: "男",
  birth_date: "2002-06-15",
  primary_sport: "volleyball",
  position: "主攻",
  height_cm: 188,
  weight_kg: 78,
  experience_level: "校队主力",
  notes: "擅长前排进攻，发球稳定性需要提升",
  created_at: "2024-01-15T08:00:00Z",
  updated_at: "2024-01-15T08:00:00Z",
}

// Generate comprehensive sample sessions
const generatedSessions = generateSampleSessions()

// Performance Tags Definition
export const performanceTags = [
  { code: "VB_SERVE_UNSTABLE", name: "发球不稳", category: "技术", sport_type: "volleyball" },
  { code: "VB_CLUTCH_WEAK", name: "关键分弱", category: "心理", sport_type: "volleyball" },
  { code: "VB_RECEPTION_VOLATILE", name: "一传波动", category: "技术", sport_type: "volleyball" },
  { code: "VB_ATTACK_EFFECTIVE", name: "进攻高效", category: "技术", sport_type: "volleyball" },
  { code: "VB_BLOCK_ACTIVE", name: "拦网积极", category: "防守", sport_type: "volleyball" },
  { code: "VB_DEFENSE_SOLID", name: "防守扎实", category: "防守", sport_type: "volleyball" },
  { code: "VB_ERROR_PRONE", name: "失误偏多", category: "稳定性", sport_type: "volleyball" },
  { code: "VB_ERROR_CONTROL_WEAK", name: "失误控制弱", category: "稳定性", sport_type: "volleyball" },
  { code: "VB_STABILITY_ISSUE", name: "稳定性问题", category: "稳定性", sport_type: "volleyball" },
  { code: "VB_SCORING_STRONG", name: "得分能力强", category: "进攻", sport_type: "volleyball" },
]

// Volleyball Error Tags Options
export const volleyballErrorTagOptions = [
  "发球失误",
  "扣球失误",
  "被拦",
  "一传不到位",
  "防守失误",
  "关键分处理",
  "配合失误",
  "判断失误",
  "脚步移动",
  "力量控制",
  "状态波动",
]

// Position Options with descriptions
export const volleyballPositions = [
  { value: "主攻", label: "主攻", description: "主要得分手，进攻权重最高" },
  { value: "副攻", label: "副攻", description: "网口核心，拦网和快攻为主" },
  { value: "二传", label: "二传", description: "球队大脑，稳定性要求最高" },
  { value: "接应", label: "接应", description: "辅助得分手，进攻和稳定性并重" },
  { value: "自由人", label: "自由人", description: "防守核心，专注一传和防守" },
]

// Mock storage helper
export const mockStorage = {
  sessions: [...generatedSessions],
  
  addSession(session: AnalysisSession) {
    // Calculate delta vs previous if there's history
    const athleteSessions = this.getSessionsByAthlete(session.athlete_id)
    if (athleteSessions.length > 0) {
      const previous = athleteSessions[0]
      const currentReport = session.report_json
      const previousReport = previous.report_json
      
      if (currentReport && previousReport) {
        const currentSubs = currentReport.overview.sub_scores
        const previousSubs = previousReport.overview.sub_scores
        
        if (currentSubs && previousSubs) {
          session.delta_vs_previous = {
            overall_score_change: currentReport.overview.overall_score - previousReport.overview.overall_score,
            sub_scores_change: {
              scoring_contribution: currentSubs.scoring_contribution - previousSubs.scoring_contribution,
              error_control: currentSubs.error_control - previousSubs.error_control,
              stability: currentSubs.stability - previousSubs.stability,
              clutch_performance: currentSubs.clutch_performance - previousSubs.clutch_performance,
            },
            trend_direction: currentReport.overview.overall_score > previousReport.overview.overall_score 
              ? "improving" 
              : currentReport.overview.overall_score < previousReport.overview.overall_score 
                ? "declining" 
                : "stable",
          }
        }
      }
    }
    
    this.sessions.unshift(session)
    return session
  },
  
  getSession(id: string) {
    return this.sessions.find(s => s.id === id)
  },
  
  getSessionsByAthlete(athleteId: string) {
    return this.sessions
      .filter(s => s.athlete_id === athleteId)
      .sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime())
  },
  
  getAllSessions() {
    return [...this.sessions].sort(
      (a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime()
    )
  },
  
  // Get sessions for trend analysis (last 5)
  getRecentSessions(athleteId: string, limit: number = 5) {
    return this.getSessionsByAthlete(athleteId).slice(0, limit)
  },
}

// Export sample descriptions
export { sampleDescriptions }

// Export position template descriptions
export const positionDescriptions: Record<VolleyballPosition, string> = {
  "主攻": "球队主要得分手，进攻权重最高，一传要求适中",
  "接应": "辅助得分手，进攻和稳定性并重",
  "副攻": "网口核心，拦网和快攻为主",
  "二传": "球队大脑，稳定性要求最高，失误容忍度最低",
  "自由人": "防守核心，不参与进攻，专注一传和防守",
}
