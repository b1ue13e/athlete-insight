"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ChevronLeft, Save, WifiOff, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { AthleteProfile, listAthletes, resolveCurrentAthlete, setCurrentAthlete } from "@/lib/athletes"
import { generateReport } from "@/lib/report-engine"
import { saveLegacyVolleyballSession } from "@/lib/analysis/session-store"
import { getCurrentUser } from "@/lib/supabase-client"
import { saveLegacyDiagnosisReport } from "@/lib/analysis/store"
import { OfflineStorage, DraftData } from "@/lib/offline-storage"
import { DraftRecoveryModal, SyncStatusIndicator } from "@/components/offline/draft-recovery"

const ratings = [
  { value: "excellent", label: "很好", emoji: "🔥" },
  { value: "good", label: "良好", emoji: "👍" },
  { value: "average", label: "一般", emoji: "😐" },
  { value: "poor", label: "较差", emoji: "⚠️" },
  { value: "very_poor", label: "很差", emoji: "❌" },
]

export default function MobileAnalysisPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [athletes, setAthletes] = useState<AthleteProfile[]>([])
  const [selectedAthlete, setSelectedAthlete] = useState<AthleteProfile | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showRecovery, setShowRecovery] = useState(false)
  const [draftId, setDraftId] = useState<string>("")
  const [showSuccess, setShowSuccess] = useState(false)
  const [reportId, setReportId] = useState("")
  
  const [formData, setFormData] = useState({
    matchName: "",
    opponent: "",
    overallPerformance: "",
    scoringRating: "",
    errorRating: "",
    clutchRating: "",
    pointsScored: "",
    pointsLost: "",
    topStrength: "",
    topWeakness: "",
  })
  
  const steps = ["选择运动员", "比赛信息", "总体表现", "得分贡献", "失误控制", "关键分", "关键数字", "主要观察", "确认"]

  // 初始化
  useEffect(() => {
    // 网络检测
    setIsOnline(navigator.onLine)
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    
    // 加载运动员
    void getCurrentUser().then((currentUser) => {
      void listAthletes(currentUser?.id).then((nextAthletes) => setAthletes(nextAthletes))
      void resolveCurrentAthlete(currentUser?.id).then((current) => {
        if (current) {
          setSelectedAthlete(current)
          void checkDraft(current.id)
        }
      })
    })
    
    // 初始化 IndexedDB
    OfflineStorage.init()
    
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // 检查草稿
  const checkDraft = async (athleteId: string) => {
    const draft = await OfflineStorage.draft.getLatest(athleteId)
    if (draft) {
      setShowRecovery(true)
      setDraftId(draft.id)
    }
  }

  // 自动保存草稿 - 每一步都落盘
  const autoSave = useCallback(async () => {
    if (!selectedAthlete || step === 0) return
    
    setIsSaving(true)
    
    const draft: DraftData = {
      id: draftId || `draft_${Date.now()}`,
      athleteId: selectedAthlete.id,
      athleteName: selectedAthlete.name,
      formData,
      step,
      totalSteps: steps.length - 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "active",
    }
    
    await OfflineStorage.draft.save(draft)
    if (!draftId) setDraftId(draft.id)
    
    setTimeout(() => setIsSaving(false), 300)
  }, [selectedAthlete, formData, step, draftId, steps.length])

  // 每步变化都保存
  useEffect(() => {
    if (step > 0) {
      autoSave()
    }
  }, [formData, step, autoSave])

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1)
    }
  }

  const handleSubmit = async () => {
    if (!selectedAthlete) return
    
    // 生成报告
    const input = { ...formData, athleteId: selectedAthlete.id, position: selectedAthlete.position, mode: "quick" }
    const report = generateReport(input, selectedAthlete, {
      mode: "quick",
      dataCertainty: "subjective",
      completedAt: new Date().toISOString(),
      estimatedFields: [],
      subjectiveFields: Object.keys(formData),
    })
    
    // 标记草稿完成
    if (draftId) {
      await OfflineStorage.draft.complete(draftId)
    }
    
    // 保存到待同步队列（离线优先）
    await OfflineStorage.report.save({
      id: report.id,
      athleteId: selectedAthlete.id,
      athleteName: selectedAthlete.name,
      reportData: report,
      createdAt: report.createdAt,
      status: "pending",
      retryCount: 0,
    })
    const currentUser = await getCurrentUser()
    const sessionResult = await saveLegacyVolleyballSession({
      userId: currentUser?.id,
      athlete: selectedAthlete,
      rawInput: input,
      report,
    })
    await saveLegacyDiagnosisReport(report, currentUser?.id, sessionResult.id)
    
    // 尝试同步
    if (navigator.onLine) {
      await OfflineStorage.report.syncAll()
    }
    
    setReportId(report.id)
    setShowSuccess(true)
  }

  const handleRecoveryContinue = (draft: DraftData) => {
    setFormData(prev => ({ ...prev, ...draft.formData }))
    setStep(draft.step)
    setDraftId(draft.id)
    setShowRecovery(false)
  }

  const handleRecoveryDismiss = () => {
    setShowRecovery(false)
    // 删除旧草稿，开始新的
    if (draftId) {
      OfflineStorage.draft.delete(draftId)
    }
    setDraftId("")
  }

  const progress = ((step + 1) / steps.length) * 100
  
  const isStepValid = () => {
    switch (step) {
      case 0: return !!selectedAthlete
      case 1: return !!formData.matchName
      case 2: return !!formData.overallPerformance
      case 3: return !!formData.scoringRating
      case 4: return !!formData.errorRating
      case 5: return !!formData.clutchRating
      case 6: return !!formData.pointsScored && !!formData.pointsLost
      default: return true
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
      {/* 头部 */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-primary)] border-b border-[var(--line-default)]">
        <div className="h-14 flex items-center justify-between px-4">
          {step === 0 ? (
            <Link href="/" className="p-2 -ml-2 text-[var(--text-secondary)]"><ArrowLeft className="w-6 h-6" /></Link>
          ) : (
            <button onClick={handleBack} className="p-2 -ml-2 text-[var(--text-secondary)]"><ChevronLeft className="w-6 h-6" /></button>
          )}
          
          <div className="flex items-center gap-3">
            {!isOnline && (
              <div className="flex items-center gap-1 text-[var(--warning)] text-xs">
                <WifiOff className="w-4 h-4" />
                <span>离线</span>
              </div>
            )}
            {isSaving && (
              <div className="flex items-center gap-1 text-[var(--accent)] text-xs">
                <Save className="w-4 h-4" />
                <span>已保存</span>
              </div>
            )}
            <SyncStatusIndicator />
          </div>
          
          <div className="text-sm text-[var(--text-muted)]">{step + 1}/{steps.length}</div>
        </div>
        <div className="h-1 bg-[var(--bg-tertiary)]"><div className="h-full bg-[var(--accent)] transition-all" style={{ width: `${progress}%` }} /></div>
      </header>
      
      {/* 主内容 */}
      <main className="flex-1 pt-16 pb-20 px-4">
        <div className="max-w-md mx-auto">
          <div className="py-6">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">{steps[step]}</h1>
          </div>
          
          <div className="space-y-6">
            {step === 0 && (
              <div className="space-y-3">
                {athletes.map((a) => (
                  <button key={a.id} onClick={() => { setSelectedAthlete(a); setCurrentAthlete(a.id) }} className={cn("w-full p-4 border-2 text-left", selectedAthlete?.id === a.id ? "border-[var(--accent)] bg-[var(--accent)]/5" : "border-[var(--line-default)]")}>
                    <div className="text-lg font-bold text-[var(--text-primary)]">{a.name}</div>
                    <div className="text-sm text-[var(--text-muted)]">{a.position}</div>
                  </button>
                ))}
              </div>
            )}
            
            {step === 1 && (
              <div className="space-y-4">
                <div><label className="block text-sm text-[var(--text-secondary)] mb-2">比赛名称 *</label><input type="text" value={formData.matchName} onChange={(e) => setFormData({...formData, matchName: e.target.value})} placeholder="例如：联赛第3轮" className="w-full bg-[var(--bg-secondary)] border border-[var(--line-default)] p-4 text-lg" /></div>
                <div><label className="block text-sm text-[var(--text-secondary)] mb-2">对手（可选）</label><input type="text" value={formData.opponent} onChange={(e) => setFormData({...formData, opponent: e.target.value})} placeholder="对手名称" className="w-full bg-[var(--bg-secondary)] border border-[var(--line-default)] p-4 text-lg" /></div>
              </div>
            )}
            
            {step === 2 && <RatingStep title="这场总体表现如何？" value={formData.overallPerformance} onChange={(v) => setFormData({...formData, overallPerformance: v})} />}
            {step === 3 && <RatingStep title="得分贡献如何？" subtitle="发球、进攻、拦网" value={formData.scoringRating} onChange={(v) => setFormData({...formData, scoringRating: v})} />}
            {step === 4 && <RatingStep title="失误控制如何？" subtitle="主动失误是否过多" value={formData.errorRating} onChange={(v) => setFormData({...formData, errorRating: v})} />}
            {step === 5 && <RatingStep title="关键分表现如何？" subtitle="局末、关键球处理" value={formData.clutchRating} onChange={(v) => setFormData({...formData, clutchRating: v})} />}
            
            {step === 6 && (
              <div className="space-y-6">
                <div><label className="block text-sm text-[var(--text-secondary)] mb-2">总得分（估算）</label><input type="number" inputMode="numeric" value={formData.pointsScored} onChange={(e) => setFormData({...formData, pointsScored: e.target.value})} placeholder="0" className="w-full bg-[var(--bg-secondary)] border border-[var(--line-default)] p-4 text-3xl text-center" /></div>
                <div><label className="block text-sm text-[var(--text-secondary)] mb-2">总失分（估算）</label><input type="number" inputMode="numeric" value={formData.pointsLost} onChange={(e) => setFormData({...formData, pointsLost: e.target.value})} placeholder="0" className="w-full bg-[var(--bg-secondary)] border border-[var(--line-default)] p-4 text-3xl text-center" /></div>
                <p className="text-xs text-[var(--text-muted)] text-center">记不清精确数字？填个大概即可</p>
              </div>
            )}
            
            {step === 7 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm text-[var(--text-secondary)] mb-3">主要优势（选1个）</label>
                  <div className="flex flex-wrap gap-2">
                    {["发球威胁大", "进攻效率高", "拦网有建树", "一传稳定", "防守积极", "关键分敢打"].map((s) => (
                      <button key={s} onClick={() => setFormData({...formData, topStrength: s})} className={cn("px-4 py-2 border text-sm", formData.topStrength === s ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]" : "border-[var(--line-default)]")}>{s}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-[var(--text-secondary)] mb-3">主要问题（选1个）</label>
                  <div className="flex flex-wrap gap-2">
                    {["发球失误多", "进攻选点单一", "一传不到位", "防守漏球", "关键分保守", "配合失误"].map((w) => (
                      <button key={w} onClick={() => setFormData({...formData, topWeakness: w})} className={cn("px-4 py-2 border text-sm", formData.topWeakness === w ? "border-[var(--negative)] bg-[var(--negative)]/10 text-[var(--negative)]" : "border-[var(--line-default)]")}>{w}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {step === 8 && (
              <div className="space-y-4">
                <div className="p-4 border border-[var(--line-default)] space-y-3">
                  <div className="flex justify-between"><span className="text-[var(--text-muted)]">运动员</span><span className="font-medium">{selectedAthlete?.name}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--text-muted)]">比赛</span><span>{formData.matchName}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--text-muted)]">得分/失分</span><span>{formData.pointsScored} / {formData.pointsLost}</span></div>
                </div>
                <div className="flex items-center gap-2 text-sm text-[var(--accent)]">
                  <Check className="w-4 h-4" />
                  <span>已自动保存到本机</span>
                </div>
                {!isOnline && (
                  <p className="text-xs text-[var(--warning)]">
                    当前离线，报告将在联网后自动同步
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
      
      {/* 底部按钮 */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-[var(--bg-primary)] border-t border-[var(--line-default)]">
        <button onClick={step === 8 ? handleSubmit : handleNext} disabled={!isStepValid()} className="w-full py-4 bg-[var(--accent)] text-[var(--bg-primary)] font-bold text-lg disabled:opacity-40">
          {step === 8 ? "生成报告" : "下一步"}
        </button>
      </footer>

      {/* 草稿恢复弹窗 */}
      {showRecovery && selectedAthlete && (
        <DraftRecoveryModal
          athleteId={selectedAthlete.id}
          athleteName={selectedAthlete.name}
          onContinue={handleRecoveryContinue}
          onDismiss={handleRecoveryDismiss}
        />
      )}

      {/* 提交成功弹窗 */}
      {showSuccess && (
        <SubmitSuccessModal
          reportId={reportId}
          onClose={() => router.push(`/analysis/${reportId}`)}
        />
      )}
    </div>
  )
}

// 提交成功反馈
function SubmitSuccessModal({ reportId, onClose }: { reportId: string; onClose: () => void }) {
  const [syncState, setSyncState] = useState<"local" | "syncing" | "synced">("local")

  useEffect(() => {
    const checkSync = async () => {
      const status = await OfflineStorage.sync.getStatus()
      
      if (!navigator.onLine) {
        setSyncState("local")
      } else if (status.pendingCount === 0) {
        setSyncState("synced")
      } else {
        setSyncState("syncing")
        await OfflineStorage.report.syncAll()
        const newStatus = await OfflineStorage.sync.getStatus()
        setSyncState(newStatus.pendingCount === 0 ? "synced" : "local")
      }
    }

    checkSync()
    const handleOnline = () => checkSync()
    window.addEventListener("online", handleOnline)
    return () => window.removeEventListener("online", handleOnline)
  }, [])

  const config = {
    local: { icon: "💾", title: "初版诊断已生成", subtitle: "已保存到设备", desc: "联网后将自动同步到云端", color: "text-[var(--warning)]" },
    syncing: { icon: "🔄", title: "正在同步...", subtitle: "数据上传中", desc: "请保持网络连接", color: "text-[var(--info)]" },
    synced: { icon: "✓", title: "诊断已生成", subtitle: "已同步到云端", desc: "可在多设备查看", color: "text-[var(--accent)]" },
  }[syncState]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-[var(--bg-secondary)] w-full max-w-sm p-8 text-center">
        <div className="text-5xl mb-4">{config.icon}</div>
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">{config.title}</h2>
        <p className={cn("text-lg mb-1", config.color)}>{config.subtitle}</p>
        <p className="text-sm text-[var(--text-muted)] mb-6">{config.desc}</p>
        <button onClick={onClose} className="w-full py-3 bg-[var(--accent)] text-[var(--bg-primary)] font-bold">
          查看报告
        </button>
      </div>
    </div>
  )
}

function RatingStep({ title, subtitle, value, onChange }: { title: string; subtitle?: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-4">
      <div><h2 className="text-xl font-bold">{title}</h2>{subtitle && <p className="text-sm text-[var(--text-muted)]">{subtitle}</p>}</div>
      <div className="grid grid-cols-1 gap-3">
        {ratings.map((r) => (
          <button key={r.value} onClick={() => onChange(r.value)} className={cn("flex items-center gap-4 p-4 border-2 text-left", value === r.value ? "border-[var(--accent)] bg-[var(--accent)]/10" : "border-[var(--line-default)]")}>
            <span className="text-2xl">{r.emoji}</span><span className="text-lg">{r.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
