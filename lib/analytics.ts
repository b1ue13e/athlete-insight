/**
 * 埋点分析系统
 * 
 * 追踪用户行为，知道产品哪里卡、哪里好用
 */

export type EventType =
  | "start_analysis"      // 点击开始分析
  | "select_athlete"      // 选择运动员
  | "select_mode"         // 选择录入模式
  | "complete_input"      // 完成录入
  | "generate_report"     // 生成报告
  | "open_share"          // 打开分享面板
  | "copy_coach_summary"  // 复制教练版摘要
  | "download_card"       // 下载分享卡片
  | "copy_social_caption" // 复制社交文案
  | "download_pdf"        // 下载PDF
  | "view_prescription"   // 查看训练处方
  | "submit_feedback"     // 提交处方反馈
  | "return_visit"        // 第二次访问

export interface AnalyticsEvent {
  id: string
  type: EventType
  timestamp: string
  athleteId?: string
  reportId?: string
  metadata?: Record<string, any>
}

const ANALYTICS_KEY = "athlete_analytics"
const SESSION_KEY = "athlete_session"

// 记录事件
export function trackEvent(type: EventType, metadata?: Record<string, any>) {
  if (typeof window === "undefined") return
  
  const event: AnalyticsEvent = {
    id: generateId(),
    type,
    timestamp: new Date().toISOString(),
    metadata,
  }
  
  // 添加运动员信息（如果有当前运动员）
  const currentAthlete = localStorage.getItem("current_athlete_id")
  if (currentAthlete) {
    event.athleteId = currentAthlete
  }
  
  // 保存事件
  const events = getAllEvents()
  events.push(event)
  localStorage.setItem(ANALYTICS_KEY, JSON.stringify(events.slice(-1000))) // 只保留最近1000条
  
  // 开发环境打印
  if (process.env.NODE_ENV === "development") {
    console.log("[Analytics]", type, metadata)
  }
}

// 获取所有事件
export function getAllEvents(): AnalyticsEvent[] {
  if (typeof window === "undefined") return []
  const stored = localStorage.getItem(ANALYTICS_KEY)
  return stored ? JSON.parse(stored) : []
}

// 获取统计摘要
export function getAnalyticsSummary() {
  const events = getAllEvents()
  
  // 基础统计
  const totalEvents = events.length
  const uniqueSessions = new Set(events.map(e => e.timestamp.split("T")[0])).size
  
  // 漏斗统计
  const startCount = events.filter(e => e.type === "start_analysis").length
  const completeCount = events.filter(e => e.type === "complete_input").length
  const shareCount = events.filter(e => e.type === "open_share").length
  const feedbackCount = events.filter(e => e.type === "submit_feedback").length
  
  // 转化率
  const completionRate = startCount > 0 ? Math.round((completeCount / startCount) * 100) : 0
  const shareRate = completeCount > 0 ? Math.round((shareCount / completeCount) * 100) : 0
  const feedbackRate = completeCount > 0 ? Math.round((feedbackCount / completeCount) * 100) : 0
  
  // 模式偏好
  const quickModeCount = events.filter(e => e.type === "select_mode" && e.metadata?.mode === "quick").length
  const proModeCount = events.filter(e => e.type === "select_mode" && e.metadata?.mode === "professional").length
  
  // 分享偏好
  const coachCopyCount = events.filter(e => e.type === "copy_coach_summary").length
  const cardDownloadCount = events.filter(e => e.type === "download_card").length
  
  // 最近7天活跃
  const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const recentActive = events.filter(e => new Date(e.timestamp) > last7Days).length
  
  return {
    totalEvents,
    uniqueSessions,
    funnel: {
      start: startCount,
      complete: completeCount,
      share: shareCount,
      feedback: feedbackCount,
    },
    rates: {
      completion: completionRate,
      share: shareRate,
      feedback: feedbackRate,
    },
    preferences: {
      quickMode: quickModeCount,
      proMode: proModeCount,
      coachCopy: coachCopyCount,
      cardDownload: cardDownloadCount,
    },
    recentActivity: recentActive,
  }
}

// 获取退出点分析
export function getDropOffPoints() {
  const events = getAllEvents()
  
  // 按会话分组
  const sessions: Record<string, AnalyticsEvent[]> = {}
  events.forEach(e => {
    const sessionId = e.metadata?.sessionId || e.timestamp.split("T")[0]
    if (!sessions[sessionId]) sessions[sessionId] = []
    sessions[sessionId].push(e)
  })
  
  // 分析每个会话的最后一步
  const lastSteps: Record<string, number> = {}
  Object.values(sessions).forEach(sessionEvents => {
    const sorted = sessionEvents.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
    const lastEvent = sorted[sorted.length - 1]
    if (lastEvent && lastEvent.type !== "generate_report") {
      lastSteps[lastEvent.type] = (lastSteps[lastEvent.type] || 0) + 1
    }
  })
  
  return lastSteps
}

// 获取平均完成时长
export function getAverageCompletionTime() {
  const events = getAllEvents()
  
  // 找到开始和完成配对
  const sessions: Record<string, { start?: Date; complete?: Date }> = {}
  
  events.forEach(e => {
    const sessionId = e.metadata?.sessionId || e.timestamp.split("T")[0]
    if (!sessions[sessionId]) sessions[sessionId] = {}
    
    if (e.type === "start_analysis") {
      sessions[sessionId].start = new Date(e.timestamp)
    }
    if (e.type === "complete_input") {
      sessions[sessionId].complete = new Date(e.timestamp)
    }
  })
  
  const times: number[] = []
  Object.values(sessions).forEach(s => {
    if (s.start && s.complete) {
      times.push((s.complete.getTime() - s.start.getTime()) / 1000) // 秒
    }
  })
  
  if (times.length === 0) return 0
  return Math.round(times.reduce((a, b) => a + b, 0) / times.length)
}

// 开始会话追踪
export function startSession() {
  if (typeof window === "undefined") return
  const sessionId = generateId()
  localStorage.setItem(SESSION_KEY, sessionId)
  trackEvent("start_analysis", { sessionId })
  return sessionId
}

// 获取当前会话ID
export function getCurrentSession(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(SESSION_KEY)
}

// 导出分析数据（用于外部查看）
export function exportAnalyticsData(): string {
  const events = getAllEvents()
  const summary = getAnalyticsSummary()
  const dropOffs = getDropOffPoints()
  
  const data = {
    exportedAt: new Date().toISOString(),
    summary,
    dropOffs,
    recentEvents: events.slice(-50), // 最近50条事件
  }
  
  return JSON.stringify(data, null, 2)
}

// 生成ID
function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// 开发环境模拟数据（用于测试）
export function generateMockAnalytics() {
  if (process.env.NODE_ENV !== "development") return
  
  const mockEvents: AnalyticsEvent[] = []
  const now = Date.now()
  
  // 生成30天的模拟数据
  for (let i = 0; i < 30; i++) {
    const day = new Date(now - i * 24 * 60 * 60 * 1000)
    
    // 每天有2-5次开始分析
    const starts = 2 + Math.floor(Math.random() * 4)
    for (let j = 0; j < starts; j++) {
      mockEvents.push({
        id: generateId(),
        type: "start_analysis",
        timestamp: day.toISOString(),
        metadata: { sessionId: `session_${i}_${j}` },
      })
      
      // 70% 完成
      if (Math.random() > 0.3) {
        mockEvents.push({
          id: generateId(),
          type: "complete_input",
          timestamp: new Date(day.getTime() + 120000).toISOString(),
          metadata: { sessionId: `session_${i}_${j}`, mode: Math.random() > 0.3 ? "quick" : "professional" },
        })
        
        // 40% 分享
        if (Math.random() > 0.6) {
          mockEvents.push({
            id: generateId(),
            type: "open_share",
            timestamp: new Date(day.getTime() + 130000).toISOString(),
            metadata: { sessionId: `session_${i}_${j}` },
          })
        }
        
        // 30% 反馈
        if (Math.random() > 0.7) {
          mockEvents.push({
            id: generateId(),
            type: "submit_feedback",
            timestamp: new Date(day.getTime() + 86400000).toISOString(), // 第二天
            metadata: { sessionId: `session_${i}_${j}` },
          })
        }
      }
    }
  }
  
  localStorage.setItem(ANALYTICS_KEY, JSON.stringify(mockEvents))
  console.log("[Analytics] Mock data generated")
}
