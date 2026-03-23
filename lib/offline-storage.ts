/**
 * 离线存储系统 - IndexedDB
 * 
 * 核心目标：场边录入，数据不丢
 */

const DB_NAME = "athlete_insight_db"
const DB_VERSION = 1

// 存储对象
const STORES = {
  DRAFTS: "drafts",           // 草稿
  PENDING_REPORTS: "pending_reports",  // 待同步报告
  SYNC_QUEUE: "sync_queue",   // 同步队列
  SETTINGS: "settings",       // 用户设置
}

let db: IDBDatabase | null = null

// 初始化数据库
export async function initDB(): Promise<IDBDatabase> {
  if (db) return db
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }
    
    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result
      
      // 草稿存储
      if (!database.objectStoreNames.contains(STORES.DRAFTS)) {
        const draftStore = database.createObjectStore(STORES.DRAFTS, { keyPath: "id" })
        draftStore.createIndex("athleteId", "athleteId", { unique: false })
        draftStore.createIndex("updatedAt", "updatedAt", { unique: false })
      }
      
      // 待同步报告
      if (!database.objectStoreNames.contains(STORES.PENDING_REPORTS)) {
        const pendingStore = database.createObjectStore(STORES.PENDING_REPORTS, { keyPath: "id" })
        pendingStore.createIndex("status", "status", { unique: false })
        pendingStore.createIndex("createdAt", "createdAt", { unique: false })
      }
      
      // 同步队列
      if (!database.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const queueStore = database.createObjectStore(STORES.SYNC_QUEUE, { keyPath: "id" })
        queueStore.createIndex("status", "status", { unique: false })
        queueStore.createIndex("priority", "priority", { unique: false })
      }
      
      // 设置
      if (!database.objectStoreNames.contains(STORES.SETTINGS)) {
        database.createObjectStore(STORES.SETTINGS, { keyPath: "key" })
      }
    }
  })
}

// ==================== 草稿管理 ====================

export interface DraftData {
  id: string
  athleteId: string
  athleteName: string
  formData: Record<string, any>
  step: number
  totalSteps: number
  createdAt: string
  updatedAt: string
  status: "active" | "completed" | "abandoned"
}

// 保存草稿 - 每一步都落盘
export async function saveDraftToDB(draft: DraftData): Promise<void> {
  const database = await initDB()
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.DRAFTS], "readwrite")
    const store = transaction.objectStore(STORES.DRAFTS)
    
    const data = {
      ...draft,
      updatedAt: new Date().toISOString(),
    }
    
    const request = store.put(data)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

// 获取运动员的最新草稿
export async function getLatestDraft(athleteId: string): Promise<DraftData | null> {
  const database = await initDB()
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.DRAFTS], "readonly")
    const store = transaction.objectStore(STORES.DRAFTS)
    const index = store.index("athleteId")
    
    const request = index.getAll(athleteId)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const drafts = request.result.filter((d: DraftData) => d.status === "active")
      if (drafts.length === 0) {
        resolve(null)
        return
      }
      
      // 返回最新的
      const latest = drafts.sort((a: DraftData, b: DraftData) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )[0]
      
      resolve(latest)
    }
  })
}

// 获取所有活跃草稿
export async function getAllActiveDrafts(): Promise<DraftData[]> {
  const database = await initDB()
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.DRAFTS], "readonly")
    const store = transaction.objectStore(STORES.DRAFTS)
    
    const request = store.getAll()
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const drafts = request.result.filter((d: DraftData) => d.status === "active")
      resolve(drafts.sort((a: DraftData, b: DraftData) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ))
    }
  })
}

// 删除草稿
export async function deleteDraft(draftId: string): Promise<void> {
  const database = await initDB()
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.DRAFTS], "readwrite")
    const store = transaction.objectStore(STORES.DRAFTS)
    
    const request = store.delete(draftId)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

// 标记草稿为已完成
export async function completeDraft(draftId: string): Promise<void> {
  const database = await initDB()
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.DRAFTS], "readwrite")
    const store = transaction.objectStore(STORES.DRAFTS)
    
    const getRequest = store.get(draftId)
    getRequest.onerror = () => reject(getRequest.error)
    getRequest.onsuccess = () => {
      const draft = getRequest.result
      if (draft) {
        draft.status = "completed"
        draft.updatedAt = new Date().toISOString()
        const putRequest = store.put(draft)
        putRequest.onerror = () => reject(putRequest.error)
        putRequest.onsuccess = () => resolve()
      } else {
        resolve()
      }
    }
  })
}

// ==================== 待同步报告 ====================

export interface PendingReport {
  id: string
  athleteId: string
  athleteName: string
  reportData: any
  createdAt: string
  status: "pending" | "syncing" | "synced" | "failed"
  retryCount: number
  lastError?: string
}

// 保存待同步报告
export async function savePendingReport(report: PendingReport): Promise<void> {
  const database = await initDB()
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.PENDING_REPORTS], "readwrite")
    const store = transaction.objectStore(STORES.PENDING_REPORTS)
    
    const request = store.put(report)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

// 获取所有待同步报告
export async function getPendingReports(): Promise<PendingReport[]> {
  const database = await initDB()
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.PENDING_REPORTS], "readonly")
    const store = transaction.objectStore(STORES.PENDING_REPORTS)
    
    const request = store.getAll()
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      resolve(request.result)
    }
  })
}

// 更新报告状态
export async function updateReportStatus(
  reportId: string, 
  status: PendingReport["status"],
  error?: string
): Promise<void> {
  const database = await initDB()
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.PENDING_REPORTS], "readwrite")
    const store = transaction.objectStore(STORES.PENDING_REPORTS)
    
    const getRequest = store.get(reportId)
    getRequest.onerror = () => reject(getRequest.error)
    getRequest.onsuccess = () => {
      const report = getRequest.result
      if (report) {
        report.status = status
        if (error) report.lastError = error
        if (status === "failed") report.retryCount++
        
        const putRequest = store.put(report)
        putRequest.onerror = () => reject(putRequest.error)
        putRequest.onsuccess = () => resolve()
      } else {
        resolve()
      }
    }
  })
}

// 删除已同步报告
export async function deleteSyncedReport(reportId: string): Promise<void> {
  const database = await initDB()
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.PENDING_REPORTS], "readwrite")
    const store = transaction.objectStore(STORES.PENDING_REPORTS)
    
    const request = store.delete(reportId)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

// ==================== 同步状态检测 ====================

export type SyncStatus = "synced" | "pending" | "offline" | "error"

// 获取整体同步状态
export async function getSyncStatus(): Promise<{
  status: SyncStatus
  pendingCount: number
  failedCount: number
}> {
  const reports = await getPendingReports()
  const pending = reports.filter(r => r.status === "pending").length
  const failed = reports.filter(r => r.status === "failed").length
  
  if (!navigator.onLine) {
    return { status: "offline", pendingCount: pending, failedCount: failed }
  }
  
  if (failed > 0) {
    return { status: "error", pendingCount: pending, failedCount: failed }
  }
  
  if (pending > 0) {
    return { status: "pending", pendingCount: pending, failedCount: failed }
  }
  
  return { status: "synced", pendingCount: 0, failedCount: 0 }
}

// ==================== 自动同步 ====================

// 尝试同步所有待同步报告
export async function syncPendingReports(): Promise<{
  success: number
  failed: number
}> {
  if (!navigator.onLine) {
    return { success: 0, failed: 0 }
  }
  
  const reports = await getPendingReports()
  const pending = reports.filter(r => r.status === "pending" || r.status === "failed")
  
  let success = 0
  let failed = 0
  
  for (const report of pending) {
    try {
      // 更新状态为同步中
      await updateReportStatus(report.id, "syncing")
      
      // 实际同步逻辑（保存到 localStorage，模拟云端）
      const reports = JSON.parse(localStorage.getItem("athlete_reports") || "[]")
      reports.push({
        id: report.id,
        athleteId: report.athleteId,
        athleteName: report.athleteName,
        createdAt: report.createdAt,
        overallScore: report.reportData.overview?.overallScore || 0,
        verdict: report.reportData.overview?.verdict || "",
      })
      localStorage.setItem("athlete_reports", JSON.stringify(reports))
      localStorage.setItem(`report_${report.id}`, JSON.stringify(report.reportData))
      
      // 标记为已同步
      await updateReportStatus(report.id, "synced")
      await deleteSyncedReport(report.id)
      success++
    } catch (error) {
      await updateReportStatus(report.id, "failed", String(error))
      failed++
    }
  }
  
  return { success, failed }
}

// 监听网络恢复，自动同步
export function initAutoSync() {
  const sync = async () => {
    if (navigator.onLine) {
      const result = await syncPendingReports()
      if (result.success > 0) {
        console.log(`[Sync] ${result.success} reports synced`)
      }
    }
  }
  
  window.addEventListener("online", sync)
  
  // 页面可见性变化时也尝试同步
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      sync()
    }
  })
  
  // 初始同步
  sync()
}

// ==================== 导出供外部使用 ====================

export const OfflineStorage = {
  init: initDB,
  draft: {
    save: saveDraftToDB,
    getLatest: getLatestDraft,
    getAll: getAllActiveDrafts,
    delete: deleteDraft,
    complete: completeDraft,
  },
  report: {
    save: savePendingReport,
    getAll: getPendingReports,
    updateStatus: updateReportStatus,
    delete: deleteSyncedReport,
    syncAll: syncPendingReports,
  },
  sync: {
    getStatus: getSyncStatus,
    initAutoSync,
  },
}

export default OfflineStorage
