"use client"

import { useCallback, useEffect, useState } from "react"
import { getLatestDraft, deleteDraft, DraftData } from "@/lib/offline-storage"
import { FileText, Clock, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"

interface DraftRecoveryProps {
  athleteId: string
  athleteName: string
  onContinue: (draft: DraftData) => void
  onDismiss: () => void
}

export function DraftRecoveryModal({ 
  athleteId, 
  athleteName,
  onContinue, 
  onDismiss 
}: DraftRecoveryProps) {
  const [draft, setDraft] = useState<DraftData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const checkDraft = useCallback(async () => {
    try {
      const latestDraft = await getLatestDraft(athleteId)
      
      // 只显示24小时内的草稿
      if (latestDraft) {
        const draftTime = new Date(latestDraft.updatedAt).getTime()
        const now = Date.now()
        const hoursDiff = (now - draftTime) / (1000 * 60 * 60)
        
        if (hoursDiff <= 24) {
          setDraft(latestDraft)
        }
      }
    } catch (error) {
      console.error("Failed to check draft:", error)
    } finally {
      setIsLoading(false)
    }
  }, [athleteId])

  useEffect(() => {
    void checkDraft()
  }, [checkDraft])

  const handleContinue = () => {
    if (draft) {
      onContinue(draft)
    }
  }

  const handleAbandon = async () => {
    if (draft) {
      await deleteDraft(draft.id)
    }
    onDismiss()
  }

  if (isLoading || !draft) return null

  const timeAgo = getTimeAgo(draft.updatedAt)
  const progress = Math.round((draft.step / draft.totalSteps) * 100)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-[var(--bg-secondary)] w-full max-w-md">
        {/* 头部 */}
        <div className="p-6 border-b border-[var(--line-default)]">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[var(--accent)]/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-[var(--accent)]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  发现未提交草稿
                </h2>
                <p className="text-sm text-[var(--text-muted)]">
                  {athleteName} · {timeAgo}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-4">
          {/* 进度 */}
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-[var(--text-muted)]">填写进度</span>
              <span className="text-[var(--accent)]">{progress}%</span>
            </div>
            <div className="h-2 bg-[var(--bg-tertiary)]">
              <div 
                className="h-full bg-[var(--accent)] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* 数据预览 */}
          {draft.formData.matchName && (
            <div className="p-3 bg-[var(--bg-primary)] border border-[var(--line-default)]">
              <div className="text-xs text-[var(--text-muted)] mb-1">比赛</div>
              <div className="text-sm text-[var(--text-primary)]">
                {draft.formData.matchName}
              </div>
            </div>
          )}

          {/* 提示 */}
          <div className="flex items-start gap-2 text-sm text-[var(--text-muted)]">
            <Clock className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              草稿已自动保存在本机，断网、刷新、关闭浏览器都不会丢失
            </span>
          </div>
        </div>

        {/* 按钮 */}
        <div className="p-6 space-y-3">
          <button
            onClick={handleContinue}
            className="w-full py-4 bg-[var(--accent)] text-[var(--bg-primary)] font-bold flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            继续填写
          </button>
          
          <button
            onClick={handleAbandon}
            className="w-full py-4 border border-[var(--line-default)] text-[var(--text-muted)] hover:border-[var(--negative)] hover:text-[var(--negative)]"
          >
            放弃并新建
          </button>
        </div>
      </div>
    </div>
  )
}

// 同步状态指示器
export function SyncStatusIndicator() {
  const [status, setStatus] = useState<{
    isOnline: boolean
    pendingCount: number
    isSyncing: boolean
  }>({
    isOnline: navigator.onLine,
    pendingCount: 0,
    isSyncing: false,
  })

  useEffect(() => {
    const checkStatus = async () => {
      const { OfflineStorage } = await import("@/lib/offline-storage")
      const syncStatus = await OfflineStorage.sync.getStatus()
      setStatus(prev => ({
        ...prev,
        pendingCount: syncStatus.pendingCount + syncStatus.failedCount,
      }))
    }

    checkStatus()
    
    // 监听网络变化
    const handleOnline = () => setStatus(prev => ({ ...prev, isOnline: true }))
    const handleOffline = () => setStatus(prev => ({ ...prev, isOnline: false }))
    
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    
    // 定期刷新状态
    const interval = setInterval(checkStatus, 5000)
    
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      clearInterval(interval)
    }
  }, [])

  // 触发同步
  const handleSync = async () => {
    if (!status.isOnline || status.pendingCount === 0) return
    
    setStatus(prev => ({ ...prev, isSyncing: true }))
    try {
      const { OfflineStorage } = await import("@/lib/offline-storage")
      await OfflineStorage.report.syncAll()
      setStatus(prev => ({ ...prev, pendingCount: 0 }))
    } finally {
      setStatus(prev => ({ ...prev, isSyncing: false }))
    }
  }

  // 已同步，无待处理
  if (status.isOnline && status.pendingCount === 0) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-[var(--accent)]">
        <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
        <span>已同步</span>
      </div>
    )
  }

  // 离线
  if (!status.isOnline) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-[var(--warning)]">
        <span className="w-2 h-2 rounded-full bg-[var(--warning)]" />
        <span>离线</span>
        {status.pendingCount > 0 && (
          <span className="text-[var(--text-muted)]">({status.pendingCount}待传)</span>
        )}
      </div>
    )
  }

  // 有待同步
  return (
    <button
      onClick={handleSync}
      disabled={status.isSyncing}
      className="flex items-center gap-1.5 text-xs text-[var(--info)] hover:text-[var(--accent)]"
    >
      {status.isSyncing ? (
        <>
          <span className="w-2 h-2 rounded-full bg-[var(--info)] animate-pulse" />
          <span>同步中...</span>
        </>
      ) : (
        <>
          <span className="w-2 h-2 rounded-full bg-[var(--info)]" />
          <span>{status.pendingCount}待同步</span>
        </>
      )}
    </button>
  )
}

// 辅助函数
function getTimeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  
  if (minutes < 1) return "刚刚"
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  return "1天前"
}
