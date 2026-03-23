"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ChevronRight, Zap, BarChart3, AlertCircle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { AdaptiveForm } from "@/components/forms/adaptive-form"
import { AthleteProfile, getAthletes, getCurrentAthlete, setCurrentAthlete, createAthlete } from "@/lib/athletes"
import { generateReport } from "@/lib/report-engine"
import { generateTrendComparison, generateTrendSummary } from "@/lib/trend-analysis"
import { saveDraft, DraftReport, hasUnfinishedDraft, getRecentDraft } from "@/lib/draft-reports"
import { DataSourceType, FormCertaintyMap, calculateOverallDataQuality } from "@/types/certainty"
import { VolleyballPosition } from "@/types/input"
import { PrescriptionFeedbackForm } from "@/components/forms/prescription-feedback"
import { getPendingFeedback, PrescriptionFeedback } from "@/lib/prescription-feedback"

type Step = "select-athlete" | "prescription-feedback" | "select-mode" | "input-data" | "review"

export default function NewAnalysisV2Page() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("select-athlete")
  const [athletes, setAthletes] = useState<AthleteProfile[]>([])
  const [selectedAthlete, setSelectedAthlete] = useState<AthleteProfile | null>(null)
  const [inputMode, setInputMode] = useState<"quick" | "professional">("quick")
  const [isCreatingAthlete, setIsCreatingAthlete] = useState(false)
  
  // 表单数据
  const [formValues, setFormValues] = useState<Record<string, any>>({})
  const [certainties, setCertainties] = useState<FormCertaintyMap>({})
  const [position, setPosition] = useState<VolleyballPosition>("outside_hitter")
  
  // 趋势数据
  const [trendData, setTrendData] = useState<any>(null)
  
  // 处方反馈
  const [pendingFeedbacks, setPendingFeedbacks] = useState<PrescriptionFeedback[]>([])
  
  // 新运动员表单
  const [newAthleteForm, setNewAthleteForm] = useState({
    name: "",
    position: "主攻" as const,
    team: "",
  })

  useEffect(() => {
    const loadedAthletes = getAthletes()
    setAthletes(loadedAthletes)
    const current = getCurrentAthlete()
    if (current) {
      setSelectedAthlete(current)
      setPosition(mapChinesePosition(current.position))
      const trend = generateTrendComparison(null as any, current.id)
      setTrendData(trend)
    }
  }, [])

  const handleSelectAthlete = (athlete: AthleteProfile) => {
    setSelectedAthlete(athlete)
    setCurrentAthlete(athlete.id)
    setPosition(mapChinesePosition(athlete.position))
    const trend = generateTrendComparison(null as any, athlete.id)
    setTrendData(trend)
    
    // 检查是否有待反馈的处方
    const pending = getPendingFeedback(athlete.id)
    setPendingFeedbacks(pending)
    
    // 如果有待反馈，先进入反馈步骤
    if (pending.length > 0) {
      setStep("prescription-feedback")
    } else {
      setStep("select-mode")
    }
  }

  const handleCreateAthlete = () => {
    if (!newAthleteForm.name.trim()) return
    
    const athlete = createAthlete({
      name: newAthleteForm.name,
      position: newAthleteForm.position,
      team: newAthleteForm.team || undefined,
    })
    
    setAthletes([...athletes, athlete])
    setSelectedAthlete(athlete)
    setCurrentAthlete(athlete.id)
    setPosition(mapChinesePosition(athlete.position))
    setIsCreatingAthlete(false)
  }

  const handleFormChange = (fieldId: string, value: any, source: DataSourceType) => {
    setFormValues(prev => ({ ...prev, [fieldId]: value }))
    setCertainties(prev => ({
      ...prev,
      [fieldId]: { value, source, confidence: source === "exact" ? 100 : source === "estimated" ? 70 : 40 }
    }))
  }

  const handleQuickSubmit = () => {
    if (!selectedAthlete) return
    
    const input = {
      ...formValues,
      athleteId: selectedAthlete.id,
      position: selectedAthlete.position,
    }
    
    const report = generateReport(input, selectedAthlete, {
      mode: inputMode,
      dataCertainty: inputMode === "quick" ? "subjective" : "estimated",
      completedAt: new Date().toISOString(),
      estimatedFields: Object.keys(certainties).filter(k => certainties[k]?.source === "estimated"),
      subjectiveFields: Object.keys(certainties).filter(k => certainties[k]?.source === "subjective"),
    })
    
    const draft: DraftReport = {
      id: report.id,
      athleteId: selectedAthlete.id,
      athleteName: selectedAthlete.name,
      matchName: formValues.matchName || "未命名比赛",
      version: "draft",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      filledFields: Object.keys(formValues),
      pendingFields: inputMode === "quick" ? [
        { fieldId: "receptionSuccessRate", fieldName: "一传到位率", importance: "high", reason: "影响稳定性评估" },
        { fieldId: "attackKills", fieldName: "进攻得分", importance: "high", reason: "基础统计" },
        { fieldId: "serveAces", fieldName: "发球ACE", importance: "medium", reason: "完善发球表现" },
      ] : [],
      report,
    }
    
    saveDraft(draft)
    
    const reports = JSON.parse(localStorage.getItem("athlete_reports") || "[]")
    reports.push({
      id: report.id,
      athleteId: selectedAthlete.id,
      athleteName: selectedAthlete.name,
      createdAt: report.createdAt,
      overallScore: report.overview.overallScore,
      verdict: report.overview.verdict,
    })
    localStorage.setItem("athlete_reports", JSON.stringify(reports))
    localStorage.setItem(`report_${report.id}`, JSON.stringify(report))
    
    router.push(`/analysis/${report.id}`)
  }

  const dataQuality = calculateOverallDataQuality(certainties)

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-primary)]/80 backdrop-blur-sm border-b border-[var(--line-default)]">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">返回</span>
          </Link>
          <div className="text-[10px] tracking-[0.2em] text-[var(--text-muted)] uppercase">
            {step === "select-athlete" && "选择运动员"}
            {step === "select-mode" && "选择模式"}
            {step === "input-data" && "录入数据"}
          </div>
        </div>
      </nav>

      <main className="pt-14">
        {step === "select-athlete" && (
          <SelectAthleteStep
            athletes={athletes}
            selectedAthlete={selectedAthlete}
            onSelect={handleSelectAthlete}
            isCreating={isCreatingAthlete}
            setIsCreating={setIsCreatingAthlete}
            newAthleteForm={newAthleteForm}
            setNewAthleteForm={setNewAthleteForm}
            onCreate={handleCreateAthlete}
            onContinue={() => {
              // 检查是否有待反馈的处方
              if (selectedAthlete) {
                const pending = getPendingFeedback(selectedAthlete.id)
                setPendingFeedbacks(pending)
                if (pending.length > 0) {
                  setStep("prescription-feedback")
                } else {
                  setStep("select-mode")
                }
              }
            }}
            trendData={trendData}
          />
        )}
        
        {step === "prescription-feedback" && selectedAthlete && (
          <PrescriptionFeedbackForm
            pendingFeedbacks={pendingFeedbacks}
            athleteId={selectedAthlete.id}
            onComplete={() => setStep("select-mode")}
          />
        )}
        
        {step === "select-mode" && (
          <SelectModeStep
            selectedAthlete={selectedAthlete}
            inputMode={inputMode}
            setInputMode={setInputMode}
            onBack={() => setStep("select-athlete")}
            onContinue={() => setStep("input-data")}
          />
        )}
        
        {step === "input-data" && selectedAthlete && (
          <InputDataStep
            athlete={selectedAthlete}
            position={position}
            mode={inputMode}
            formValues={formValues}
            certainties={certainties}
            onChange={handleFormChange}
            dataQuality={dataQuality}
            onBack={() => setStep("select-mode")}
            onSubmit={handleQuickSubmit}
          />
        )}
      </main>
    </div>
  )
}

// 子组件...
function SelectAthleteStep({ athletes, selectedAthlete, onSelect, isCreating, setIsCreating, newAthleteForm, setNewAthleteForm, onCreate, onContinue, trendData }: any) {
  return (
    <div className="min-h-[calc(100vh-56px)] flex flex-col">
      <section className="pt-16 pb-8 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="editorial-title mb-4">步骤 1 / 3</div>
          <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-4">选择运动员</h1>
          
          {trendData && trendData.sampleSize.hasEnoughData && (
            <div className="mt-6 p-4 border border-[var(--accent)]/30 bg-[var(--accent)]/5">
              <div className="flex items-center gap-2 text-[var(--accent)] text-sm">
                <AlertCircle className="w-4 h-4" />
                {generateTrendSummary(trendData)}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="flex-1 px-6 pb-16">
        <div className="max-w-3xl mx-auto space-y-4">
          {athletes.map((athlete: AthleteProfile) => (
            <button
              key={athlete.id}
              onClick={() => onSelect(athlete)}
              className={cn(
                "w-full p-6 border text-left transition-sharp",
                selectedAthlete?.id === athlete.id
                  ? "border-[var(--accent)] bg-[var(--accent)]/5"
                  : "border-[var(--line-default)] hover:border-[var(--line-strong)]"
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className={cn("text-xl font-bold", selectedAthlete?.id === athlete.id ? "text-[var(--accent)]" : "text-[var(--text-primary)]")}>
                    {athlete.name}
                  </div>
                  <div className="text-sm text-[var(--text-muted)]">{athlete.position}</div>
                </div>
                <ChevronRight className={cn("w-5 h-5", selectedAthlete?.id === athlete.id ? "text-[var(--accent)]" : "text-[var(--text-muted)]")} />
              </div>
            </button>
          ))}

          {!isCreating ? (
            <button onClick={() => setIsCreating(true)} className="w-full p-6 border border-dashed border-[var(--line-strong)] text-[var(--text-secondary)] hover:border-[var(--accent)]">
              + 新建运动员
            </button>
          ) : (
            <div className="p-6 border border-[var(--accent)] bg-[var(--accent)]/5 space-y-4">
              <input
                type="text"
                value={newAthleteForm.name}
                onChange={(e) => setNewAthleteForm({ ...newAthleteForm, name: e.target.value })}
                className="w-full bg-[var(--bg-secondary)] border border-[var(--line-default)] p-3 text-[var(--text-primary)]"
                placeholder="姓名 *"
              />
              <select
                value={newAthleteForm.position}
                onChange={(e) => setNewAthleteForm({ ...newAthleteForm, position: e.target.value as any })}
                className="w-full bg-[var(--bg-secondary)] border border-[var(--line-default)] p-3 text-[var(--text-primary)]"
              >
                <option value="主攻">主攻</option>
                <option value="副攻">副攻</option>
                <option value="二传">二传</option>
                <option value="接应">接应</option>
                <option value="自由人">自由人</option>
              </select>
              <div className="flex gap-3">
                <button onClick={() => setIsCreating(false)} className="flex-1 py-3 border border-[var(--line-default)] text-[var(--text-secondary)]">取消</button>
                <button onClick={onCreate} disabled={!newAthleteForm.name.trim()} className="flex-1 py-3 bg-[var(--accent)] text-[var(--bg-primary)] font-bold disabled:opacity-40">创建</button>
              </div>
            </div>
          )}

          <button onClick={onContinue} disabled={!selectedAthlete} className="w-full py-4 bg-[var(--accent)] text-[var(--bg-primary)] font-bold disabled:opacity-40 mt-8">
            继续
          </button>
        </div>
      </section>
    </div>
  )
}

function SelectModeStep({ selectedAthlete, inputMode, setInputMode, onBack, onContinue }: any) {
  return (
    <div className="min-h-[calc(100vh-56px)] flex flex-col">
      <section className="pt-16 pb-8 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="editorial-title mb-4">步骤 2 / 3</div>
          <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-4">选择录入模式</h1>
          <p className="text-[var(--text-secondary)]">为 {selectedAthlete?.name} 选择合适的方式</p>
        </div>
      </section>

      <section className="flex-1 px-6 pb-16">
        <div className="max-w-3xl mx-auto space-y-4">
          <ModeCard
            icon={<Zap className="w-6 h-6" />}
            title="快速模式"
            subtitle="2分钟"
            description="赛后立即记录，简化评估"
            selected={inputMode === "quick"}
            onClick={() => setInputMode("quick")}
          />
          <ModeCard
            icon={<BarChart3 className="w-6 h-6" />}
            title="专业模式"
            subtitle="完整统计"
            description="精确数据，详细分析"
            selected={inputMode === "professional"}
            onClick={() => setInputMode("professional")}
          />
          <div className="flex gap-4 mt-8">
            <button onClick={onBack} className="flex-1 py-4 border border-[var(--line-default)] text-[var(--text-secondary)]">上一步</button>
            <button onClick={onContinue} className="flex-1 py-4 bg-[var(--accent)] text-[var(--bg-primary)] font-bold">继续</button>
          </div>
        </div>
      </section>
    </div>
  )
}

function ModeCard({ icon, title, subtitle, description, selected, onClick }: any) {
  return (
    <button onClick={onClick} className={cn("w-full p-6 border text-left transition-sharp", selected ? "border-[var(--accent)] bg-[var(--accent)]/5" : "border-[var(--line-default)] hover:border-[var(--line-strong)]")}>
      <div className="flex items-start gap-4">
        <div className={cn("w-12 h-12 flex items-center justify-center border", selected ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--line-strong)] text-[var(--text-muted)]")}>
          {icon}
        </div>
        <div>
          <div className={cn("text-xl font-bold", selected ? "text-[var(--accent)]" : "text-[var(--text-primary)]")}>{title}</div>
          <div className="text-xs text-[var(--accent)]">{subtitle}</div>
          <div className="text-sm text-[var(--text-muted)] mt-1">{description}</div>
        </div>
      </div>
    </button>
  )
}

function InputDataStep({ athlete, position, mode, formValues, certainties, onChange, dataQuality, onBack, onSubmit }: any) {
  return (
    <div className="min-h-[calc(100vh-56px)]">
      <div className="fixed top-14 left-0 right-0 z-40 bg-[var(--bg-primary)]/80 backdrop-blur-sm border-b border-[var(--line-default)]">
        <div className="max-w-7xl mx-auto px-6 h-12 flex items-center justify-between">
          <button onClick={onBack} className="text-sm text-[var(--text-secondary)]">上一步</button>
          <span className="text-sm text-[var(--text-primary)]">{athlete.name} // {mode === "quick" ? "快速" : "专业"}</span>
        </div>
      </div>

      <div className="pt-28 pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">{athlete.position}专属录入</h2>
              <p className="text-sm text-[var(--text-muted)] mb-6">已根据{athlete.position}特点调整字段顺序</p>
              <AdaptiveForm position={position} mode={mode} values={formValues} certainties={certainties} onChange={onChange} />
            </div>
            <div className="lg:col-span-1">
              <div className="sticky top-28 space-y-4">
                <div className="panel p-4 border border-[var(--line-default)]">
                  <div className="text-sm text-[var(--accent)] mb-2">数据质量</div>
                  <div className="text-3xl font-bold text-[var(--text-primary)]">{dataQuality.overallCertainty}%</div>
                  <div className="text-xs text-[var(--text-muted)]">{dataQuality.qualityLabel}</div>
                </div>
                <div className="panel p-4 border border-[var(--line-default)]">
                  <div className="text-sm text-[var(--text-secondary)] mb-2">预计时间</div>
                  <div className="text-2xl font-bold text-[var(--text-primary)]">{mode === "quick" ? "2分钟" : "5-8分钟"}</div>
                </div>
                <button onClick={onSubmit} disabled={!formValues.matchName} className="w-full py-4 bg-[var(--accent)] text-[var(--bg-primary)] font-bold disabled:opacity-40">
                  生成报告
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function mapChinesePosition(chinese: string): VolleyballPosition {
  const map: Record<string, VolleyballPosition> = {
    "主攻": "outside_hitter",
    "副攻": "middle_blocker",
    "二传": "setter",
    "接应": "opposite",
    "自由人": "libero",
  }
  return map[chinese] || "outside_hitter"
}
