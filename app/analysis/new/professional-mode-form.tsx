"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { ProfessionalVolleyballForm, simplifiedRatingLabels, participationLabels, matchImportanceLabels, opponentStrengthLabels, clutchRatingOptions, receptionRatingOptions, VolleyballPosition } from "@/types/input"
import { AthleteProfile } from "@/lib/athletes"
import { generateReport } from "@/lib/report-engine"
import { saveLegacyVolleyballSession } from "@/lib/analysis/session-store"
import { getCurrentUser } from "@/lib/supabase-client"
import { saveLegacyDiagnosisReport } from "@/lib/analysis/store"
import { getAnalysisDetailHref } from "@/lib/analysis/routes"
import { errorTagOptions, errorTagCategoryLabels } from "@/types/errors"

type SimplifiedRating = "excellent" | "good" | "average" | "poor" | "very_poor"
type ParticipationLevel = "25" | "50" | "75" | "100"
type MatchImportance = "training" | "regular" | "important" | "critical"
type OpponentStrength = "weak" | "average" | "strong" | "very_strong"
type StarterStatus = "starter" | "substitute" | "mid_game"

interface ProfessionalModeFormProps {
  athlete: AthleteProfile
}

const initialForm: ProfessionalVolleyballForm = {
  athleteId: "",
  matchName: "",
  opponent: "",
  position: "outside_hitter",
  matchDate: new Date().toISOString().split("T")[0],
  participationLevel: "100",
  starterStatus: "starter",
  matchImportance: "regular",
  opponentStrength: "average",
  totalPoints: 0,
  totalPointsLost: 0,
  serveAces: 0,
  serveErrors: 0,
  attackKills: 0,
  attackErrors: 0,
  blockedTimes: 0,
  receptionInputMode: "simplified",
  receptionSuccessRate: undefined,
  receptionRating: "average",
  blockPoints: 0,
  digs: 0,
  clutchInputMode: "simplified",
  clutchPerformanceScore: undefined,
  clutchRating: "average",
  errorTags: [],
  notes: "",
}

export function ProfessionalModeForm({ athlete }: ProfessionalModeFormProps) {
  const router = useRouter()
  const [form, setForm] = useState<ProfessionalVolleyballForm>({ 
    ...initialForm, 
    athleteId: athlete.id,
    position: mapChinesePositionToEnglish(athlete.position),
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleErrorTagToggle = (tagId: string) => {
    setForm({
      ...form,
      errorTags: form.errorTags.includes(tagId)
        ? form.errorTags.filter(t => t !== tagId)
        : [...form.errorTags, tagId]
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // 生成报告
      const input = convertProfessionalFormToScoringInput(form, athlete.position)
      const report = generateReport(input, athlete, {
        mode: "professional",
        dataCertainty: form.receptionInputMode === "precise" && form.clutchInputMode === "precise" ? "precise" : "estimated",
        completedAt: new Date().toISOString(),
        estimatedFields: [
          ...(form.receptionInputMode === "simplified" ? ["receptionRating"] : []),
          ...(form.clutchInputMode === "simplified" ? ["clutchRating"] : []),
        ],
        subjectiveFields: [
          ...(form.receptionInputMode === "simplified" ? ["receptionRating"] : []),
          ...(form.clutchInputMode === "simplified" ? ["clutchRating"] : []),
        ],
      })
      
      // 保存到 localStorage
      const reports = JSON.parse(localStorage.getItem("athlete_reports") || "[]")
      reports.push({
        id: report.id,
        athleteId: athlete.id,
        athleteName: athlete.name,
        createdAt: report.createdAt,
        overallScore: report.overview.overallScore,
        verdict: report.overview.verdict,
      })
      localStorage.setItem("athlete_reports", JSON.stringify(reports))
      localStorage.setItem(`report_${report.id}`, JSON.stringify(report))
      const currentUser = await getCurrentUser()
      const sessionResult = await saveLegacyVolleyballSession({
        userId: currentUser?.id,
        athlete,
        rawInput: input,
        report,
      })
      await saveLegacyDiagnosisReport(report, currentUser?.id, sessionResult.id)
      
      // 导航到报告页
      router.push(getAnalysisDetailHref(report.id))
    } catch (error) {
      console.error("Failed to generate report:", error)
      alert("生成报告失败，请重试")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="analysis-form space-y-6">
      {/* 比赛信息 */}
      <section className="space-y-4">
        <div className="analysis-form-title">
          比赛信息
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="analysis-form-label">
              比赛名称 *
            </label>
            <input
              type="text"
              value={form.matchName}
              onChange={(e) => setForm({ ...form, matchName: e.target.value })}
              className="analysis-input"
              placeholder="例如：联赛第3轮"
              required
            />
          </div>
          <div>
            <label className="analysis-form-label">
              对手（可选）
            </label>
            <input
              type="text"
              value={form.opponent}
              onChange={(e) => setForm({ ...form, opponent: e.target.value })}
              className="analysis-input"
              placeholder="对手名称"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="analysis-form-label">
              比赛日期
            </label>
            <input
              type="date"
              value={form.matchDate}
              onChange={(e) => setForm({ ...form, matchDate: e.target.value })}
              className="analysis-input"
            />
          </div>
          <div>
            <label className="analysis-form-label">
              位置
            </label>
            <select
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value as VolleyballPosition })}
              className="analysis-input"
            >
              <option value="outside_hitter">主攻</option>
              <option value="middle_blocker">副攻</option>
              <option value="setter">二传</option>
              <option value="opposite">接应</option>
              <option value="libero">自由人</option>
            </select>
          </div>
        </div>
      </section>

      {/* 出场上下文 */}
      <section className="space-y-4">
        <div className="analysis-form-title">
          出场上下文
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="analysis-form-label">
              首发/替补
            </label>
            <select
              value={form.starterStatus}
              onChange={(e) => setForm({ ...form, starterStatus: e.target.value as StarterStatus })}
              className="analysis-input"
            >
              <option value="starter">首发打满</option>
              <option value="mid_game">首发部分</option>
              <option value="substitute">替补出场</option>
            </select>
          </div>
          <div>
            <label className="analysis-form-label">
              出场比例
            </label>
            <select
              value={form.participationLevel}
              onChange={(e) => setForm({ ...form, participationLevel: e.target.value as ParticipationLevel })}
              className="analysis-input"
            >
              <option value="100">全场（100%）</option>
              <option value="75">大部分（75%）</option>
              <option value="50">半场左右（50%）</option>
              <option value="25">少部分（25%）</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="analysis-form-label">
              比赛重要性
            </label>
            <select
              value={form.matchImportance}
              onChange={(e) => setForm({ ...form, matchImportance: e.target.value as MatchImportance })}
              className="analysis-input"
            >
              <option value="training">训练赛</option>
              <option value="regular">常规赛</option>
              <option value="important">重要比赛</option>
              <option value="critical">关键战役</option>
            </select>
          </div>
          <div>
            <label className="analysis-form-label">
              对手强度
            </label>
            <select
              value={form.opponentStrength}
              onChange={(e) => setForm({ ...form, opponentStrength: e.target.value as OpponentStrength })}
              className="analysis-input"
            >
              <option value="weak">较弱</option>
              <option value="average">相当</option>
              <option value="strong">较强</option>
              <option value="very_strong">很强</option>
            </select>
          </div>
        </div>
      </section>

      {/* 基础统计 */}
      <section className="space-y-4">
        <div className="analysis-form-title">
          基础统计
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="analysis-form-label">
              总得分
            </label>
            <input
              type="number"
              min={0}
              value={form.totalPoints || ""}
              onChange={(e) => setForm({ ...form, totalPoints: parseInt(e.target.value) || 0 })}
              className="analysis-input"
              placeholder="0"
            />
          </div>
          <div>
            <label className="analysis-form-label">
              总失分（含失误）
            </label>
            <input
              type="number"
              min={0}
              value={form.totalPointsLost || ""}
              onChange={(e) => setForm({ ...form, totalPointsLost: parseInt(e.target.value) || 0 })}
              className="analysis-input"
              placeholder="0"
            />
          </div>
        </div>
      </section>

      {/* 发球统计 */}
      <section className="space-y-4">
        <div className="analysis-form-title">
          发球
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="analysis-form-label">
              发球直接得分（ACE）
            </label>
            <input
              type="number"
              min={0}
              value={form.serveAces || ""}
              onChange={(e) => setForm({ ...form, serveAces: parseInt(e.target.value) || 0 })}
              className="analysis-input"
              placeholder="0"
            />
          </div>
          <div>
            <label className="analysis-form-label">
              发球失误
            </label>
            <input
              type="number"
              min={0}
              value={form.serveErrors || ""}
              onChange={(e) => setForm({ ...form, serveErrors: parseInt(e.target.value) || 0 })}
              className="analysis-input"
              placeholder="0"
            />
          </div>
        </div>
      </section>

      {/* 进攻统计 */}
      <section className="space-y-4">
        <div className="analysis-form-title">
          进攻
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="analysis-form-label">
              进攻得分
            </label>
            <input
              type="number"
              min={0}
              value={form.attackKills || ""}
              onChange={(e) => setForm({ ...form, attackKills: parseInt(e.target.value) || 0 })}
              className="analysis-input"
              placeholder="0"
            />
          </div>
          <div>
            <label className="analysis-form-label">
              进攻失误
            </label>
            <input
              type="number"
              min={0}
              value={form.attackErrors || ""}
              onChange={(e) => setForm({ ...form, attackErrors: parseInt(e.target.value) || 0 })}
              className="analysis-input"
              placeholder="0"
            />
          </div>
          <div>
            <label className="analysis-form-label">
              被拦死
            </label>
            <input
              type="number"
              min={0}
              value={form.blockedTimes || ""}
              onChange={(e) => setForm({ ...form, blockedTimes: parseInt(e.target.value) || 0 })}
              className="analysis-input"
              placeholder="0"
            />
          </div>
        </div>
      </section>

      {/* 一传表现 - 支持两种输入方式 */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="analysis-form-title">
            一传表现
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setForm({ ...form, receptionInputMode: "precise" })}
              className={cn(
                "px-3 py-1 text-xs border transition-sharp",
                form.receptionInputMode === "precise"
                  ? "border-[var(--accent)] text-[var(--accent)]"
                  : "border-[var(--line-default)] text-[var(--text-muted)]"
              )}
            >
              精确百分比
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, receptionInputMode: "simplified" })}
              className={cn(
                "px-3 py-1 text-xs border transition-sharp",
                form.receptionInputMode === "simplified"
                  ? "border-[var(--accent)] text-[var(--accent)]"
                  : "border-[var(--line-default)] text-[var(--text-muted)]"
              )}
            >
              主观评估
            </button>
          </div>
        </div>
        
        {form.receptionInputMode === "precise" ? (
          <div>
            <label className="analysis-form-label">
              一传到位率（%）
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={form.receptionSuccessRate ?? ""}
              onChange={(e) => setForm({ ...form, receptionSuccessRate: e.target.value ? parseInt(e.target.value) : undefined })}
              className="analysis-input"
              placeholder="例如：65"
            />
            <p className="text-xs text-[var(--text-muted)] mt-2">
              有精确统计数据时使用此选项
            </p>
          </div>
        ) : (
          <div className="grid gap-2">
            {receptionRatingOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setForm({ ...form, receptionRating: option.value })}
                className={cn(
                  "p-3 text-left border transition-sharp",
                  form.receptionRating === option.value
                    ? "border-[var(--accent)] bg-[var(--accent)]/5"
                    : "border-[var(--line-default)] hover:border-[var(--line-strong)]"
                )}
              >
                <div className={cn(
                  "font-medium",
                  form.receptionRating === option.value ? "text-[var(--accent)]" : "text-[var(--text-primary)]"
                )}>
                  {option.label}
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-1">
                  {option.description}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 拦网和防守 */}
      <section className="space-y-4">
        <div className="analysis-form-title">
          拦网与防守
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="analysis-form-label">
              拦网得分
            </label>
            <input
              type="number"
              min={0}
              value={form.blockPoints || ""}
              onChange={(e) => setForm({ ...form, blockPoints: parseInt(e.target.value) || 0 })}
              className="analysis-input"
              placeholder="0"
            />
          </div>
          <div>
            <label className="analysis-form-label">
              防守起球
            </label>
            <input
              type="number"
              min={0}
              value={form.digs || ""}
              onChange={(e) => setForm({ ...form, digs: parseInt(e.target.value) || 0 })}
              className="analysis-input"
              placeholder="0"
            />
          </div>
        </div>
      </section>

      {/* 关键分表现 - 支持两种输入方式 */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="analysis-form-title">
            关键分表现
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setForm({ ...form, clutchInputMode: "precise" })}
              className={cn(
                "px-3 py-1 text-xs border transition-sharp",
                form.clutchInputMode === "precise"
                  ? "border-[var(--accent)] text-[var(--accent)]"
                  : "border-[var(--line-default)] text-[var(--text-muted)]"
              )}
            >
              精确评分
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, clutchInputMode: "simplified" })}
              className={cn(
                "px-3 py-1 text-xs border transition-sharp",
                form.clutchInputMode === "simplified"
                  ? "border-[var(--accent)] text-[var(--accent)]"
                  : "border-[var(--line-default)] text-[var(--text-muted)]"
              )}
            >
              描述分级
            </button>
          </div>
        </div>
        
        {form.clutchInputMode === "precise" ? (
          <div>
            <label className="analysis-form-label">
              关键分表现评分（0-100）
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={form.clutchPerformanceScore ?? ""}
              onChange={(e) => setForm({ ...form, clutchPerformanceScore: e.target.value ? parseInt(e.target.value) : undefined })}
              className="analysis-input"
              placeholder="例如：75"
            />
            <p className="text-xs text-[var(--text-muted)] mt-2">
              评估局末、关键球的处理表现，越高表示越好
            </p>
          </div>
        ) : (
          <div className="grid gap-2">
            {clutchRatingOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setForm({ ...form, clutchRating: option.value })}
                className={cn(
                  "p-3 text-left border transition-sharp",
                  form.clutchRating === option.value
                    ? "border-[var(--accent)] bg-[var(--accent)]/5"
                    : "border-[var(--line-default)] hover:border-[var(--line-strong)]"
                )}
              >
                <div className={cn(
                  "font-medium",
                  form.clutchRating === option.value ? "text-[var(--accent)]" : "text-[var(--text-primary)]"
                )}>
                  {option.label}
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-1">
                  {option.description}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 失误标签 */}
      <section className="space-y-4">
        <div className="analysis-form-title">
          失误类型标签（可选）
        </div>
        
        <div className="space-y-4">
          {["judgment", "technical", "coordination"].map((category) => (
            <div key={category}>
              <div className="text-xs text-[var(--text-secondary)] mb-2">
                {errorTagCategoryLabels[category as keyof typeof errorTagCategoryLabels]}
              </div>
              <div className="flex flex-wrap gap-2">
                {errorTagOptions
                  .filter(tag => tag.category === category)
                  .map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleErrorTagToggle(tag.id)}
                      className={cn(
                        "px-3 py-1.5 text-xs border transition-sharp",
                        form.errorTags.includes(tag.id)
                          ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                          : "border-[var(--line-default)] text-[var(--text-secondary)] hover:border-[var(--line-strong)]"
                      )}
                      title={tag.description}
                    >
                      {tag.label}
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 备注 */}
      <section>
        <div className="analysis-form-label">
          其他备注（可选）
        </div>
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={3}
          className="analysis-textarea"
          placeholder="补充说明..."
        />
      </section>

      {/* 提交 */}
      <div className="analysis-footer">
        <button
          type="submit"
          disabled={isSubmitting || !form.matchName}
          className="action-primary w-full text-sm disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSubmitting ? "生成报告中..." : "生成分析报告"}
        </button>
        <p className="text-xs text-[var(--text-muted)] text-center mt-4">
          基于专业统计数据生成详细的分析报告
        </p>
      </div>
    </form>
  )
}

// 辅助函数
function mapChinesePositionToEnglish(chinese: string): VolleyballPosition {
  const map: Record<string, VolleyballPosition> = {
    "主攻": "outside_hitter",
    "副攻": "middle_blocker",
    "二传": "setter",
    "接应": "opposite",
    "自由人": "libero",
  }
  return map[chinese] || "outside_hitter"
}

function convertProfessionalFormToScoringInput(
  form: ProfessionalVolleyballForm,
  position: string
) {
  return {
    mode: "professional" as const,
    athleteId: form.athleteId,
    matchName: form.matchName,
    opponent: form.opponent,
    matchDate: form.matchDate,
    
    // 上下文
    participationLevel: form.participationLevel,
    starterStatus: form.starterStatus,
    matchImportance: form.matchImportance,
    opponentStrength: form.opponentStrength,
    
    // 基础统计
    totalPoints: form.totalPoints,
    totalPointsLost: form.totalPointsLost,
    serveAces: form.serveAces,
    serveErrors: form.serveErrors,
    attackKills: form.attackKills,
    attackErrors: form.attackErrors,
    blockedTimes: form.blockedTimes,
    
    // 一传
    receptionInputMode: form.receptionInputMode,
    receptionSuccessRate: form.receptionSuccessRate,
    receptionRating: form.receptionRating,
    
    // 拦网防守
    blockPoints: form.blockPoints,
    digs: form.digs,
    
    // 关键分
    clutchInputMode: form.clutchInputMode,
    clutchPerformanceScore: form.clutchPerformanceScore,
    clutchRating: form.clutchRating,
    
    // 其他
    errorTags: form.errorTags,
    notes: form.notes,
    
    position,
    detailedPosition: form.position,
  }
}
