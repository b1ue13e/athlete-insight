"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { QuickVolleyballForm, simplifiedRatingOptions, simplifiedRatingLabels, participationLabels, matchImportanceLabels, opponentStrengthLabels, starterStatusLabels, simplifiedRatingToScore } from "@/types/input"
import { AthleteProfile } from "@/lib/athletes"
import { generateReport } from "@/lib/report-engine"
import { errorTagOptions, errorTagCategoryLabels } from "@/types/errors"

type SimplifiedRating = "excellent" | "good" | "average" | "poor" | "very_poor"
type ParticipationLevel = "25" | "50" | "75" | "100"
type MatchImportance = "training" | "regular" | "important" | "critical"
type OpponentStrength = "weak" | "average" | "strong" | "very_strong"
type StarterStatus = "starter" | "substitute" | "mid_game"

interface QuickModeFormProps {
  athlete: AthleteProfile
}

const initialForm: QuickVolleyballForm = {
  athleteId: "",
  matchName: "",
  opponent: "",
  matchDate: new Date().toISOString().split("T")[0],
  participationLevel: "100",
  starterStatus: "starter",
  matchImportance: "regular",
  opponentStrength: "average",
  overallPerformance: "average",
  scoringRating: "average",
  errorRating: "average",
  receptionRating: "average",
  clutchRating: "average",
  pointsScored: 0,
  pointsLost: 0,
  majorErrors: 0,
  topStrength: "",
  topWeakness: "",
  errorTags: [],
  notes: "",
}

export function QuickModeForm({ athlete }: QuickModeFormProps) {
  const router = useRouter()
  const [form, setForm] = useState<QuickVolleyballForm>({ 
    ...initialForm, 
    athleteId: athlete.id 
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleRatingChange = (field: keyof QuickVolleyballForm, value: SimplifiedRating) => {
    setForm({ ...form, [field]: value })
  }

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
      // 生成报告（使用简化评分）
      const input = convertQuickFormToScoringInput(form, athlete.position)
      const report = generateReport(input, athlete, {
        mode: "quick",
        dataCertainty: "subjective",
        completedAt: new Date().toISOString(),
        estimatedFields: Object.keys(form).filter(k => k.includes("Rating")),
        subjectiveFields: ["overallPerformance", "scoringRating", "errorRating", "receptionRating", "clutchRating"],
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
      
      // 导航到报告页
      router.push(`/analysis/${report.id}`)
    } catch (error) {
      console.error("Failed to generate report:", error)
      alert("生成报告失败，请重试")
    } finally {
      setIsSubmitting(false)
    }
  }

  const RatingSelector = ({ 
    label, 
    value, 
    onChange,
    description
  }: { 
    label: string
    value: SimplifiedRating
    onChange: (v: SimplifiedRating) => void
    description?: string
  }) => (
    <div className="space-y-2">
      <div>
        <label className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-muted)] block">
          {label}
        </label>
        {description && (
          <p className="text-xs text-[var(--text-muted)] mt-1">{description}</p>
        )}
      </div>
      <div className="grid grid-cols-5 gap-1">
        {(Object.keys(simplifiedRatingLabels) as SimplifiedRating[]).map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating)}
            className={cn(
              "p-2 text-xs text-center border transition-sharp",
              value === rating
                ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                : "border-[var(--line-default)] text-[var(--text-secondary)] hover:border-[var(--line-strong)]"
            )}
          >
            {simplifiedRatingLabels[rating]}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* 比赛信息 */}
      <section className="space-y-4">
        <div className="text-[10px] tracking-[0.2em] uppercase text-[var(--accent)] mb-4">
          比赛信息
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-muted)] block mb-2">
              比赛名称 *
            </label>
            <input
              type="text"
              value={form.matchName}
              onChange={(e) => setForm({ ...form, matchName: e.target.value })}
              className="w-full bg-[var(--bg-secondary)] border border-[var(--line-default)] p-3 text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              placeholder="例如：联赛第3轮"
              required
            />
          </div>
          <div>
            <label className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-muted)] block mb-2">
              对手（可选）
            </label>
            <input
              type="text"
              value={form.opponent}
              onChange={(e) => setForm({ ...form, opponent: e.target.value })}
              className="w-full bg-[var(--bg-secondary)] border border-[var(--line-default)] p-3 text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              placeholder="对手名称"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-muted)] block mb-2">
            比赛日期
          </label>
          <input
            type="date"
            value={form.matchDate}
            onChange={(e) => setForm({ ...form, matchDate: e.target.value })}
            className="w-full bg-[var(--bg-secondary)] border border-[var(--line-default)] p-3 text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
          />
        </div>
      </section>

      {/* 出场上下文 */}
      <section className="space-y-4">
        <div className="text-[10px] tracking-[0.2em] uppercase text-[var(--accent)] mb-4">
          出场上下文
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-muted)] block mb-2">
              首发/替补
            </label>
            <select
              value={form.starterStatus}
              onChange={(e) => setForm({ ...form, starterStatus: e.target.value as StarterStatus })}
              className="w-full bg-[var(--bg-secondary)] border border-[var(--line-default)] p-3 text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
            >
              <option value="starter">首发打满</option>
              <option value="mid_game">首发部分</option>
              <option value="substitute">替补出场</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-muted)] block mb-2">
              出场比例
            </label>
            <select
              value={form.participationLevel}
              onChange={(e) => setForm({ ...form, participationLevel: e.target.value as ParticipationLevel })}
              className="w-full bg-[var(--bg-secondary)] border border-[var(--line-default)] p-3 text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
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
            <label className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-muted)] block mb-2">
              比赛重要性
            </label>
            <select
              value={form.matchImportance}
              onChange={(e) => setForm({ ...form, matchImportance: e.target.value as MatchImportance })}
              className="w-full bg-[var(--bg-secondary)] border border-[var(--line-default)] p-3 text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
            >
              <option value="training">训练赛</option>
              <option value="regular">常规赛</option>
              <option value="important">重要比赛</option>
              <option value="critical">关键战役</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-muted)] block mb-2">
              对手强度
            </label>
            <select
              value={form.opponentStrength}
              onChange={(e) => setForm({ ...form, opponentStrength: e.target.value as OpponentStrength })}
              className="w-full bg-[var(--bg-secondary)] border border-[var(--line-default)] p-3 text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
            >
              <option value="weak">较弱</option>
              <option value="average">相当</option>
              <option value="strong">较强</option>
              <option value="very_strong">很强</option>
            </select>
          </div>
        </div>
      </section>

      {/* 核心表现评估 */}
      <section className="space-y-6">
        <div className="text-[10px] tracking-[0.2em] uppercase text-[var(--accent)] mb-4">
          核心表现评估
        </div>
        
        <div className="p-4 border-l-2 border-[var(--accent)] bg-[var(--accent)]/5">
          <RatingSelector
            label="总体表现"
            value={form.overallPerformance}
            onChange={(v) => handleRatingChange("overallPerformance", v)}
            description="这场比赛的整体发挥如何？"
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <RatingSelector
            label="得分贡献"
            value={form.scoringRating}
            onChange={(v) => handleRatingChange("scoringRating", v)}
            description="主动得分（发球、进攻、拦网）的表现"
          />

          <RatingSelector
            label="失误控制"
            value={form.errorRating}
            onChange={(v) => handleRatingChange("errorRating", v)}
            description="主动失误的控制情况（越高表示失误越少）"
          />

          <RatingSelector
            label="一传/防守"
            value={form.receptionRating}
            onChange={(v) => handleRatingChange("receptionRating", v)}
            description="接发球或防守的整体表现"
          />

          <RatingSelector
            label="关键分表现"
            value={form.clutchRating}
            onChange={(v) => handleRatingChange("clutchRating", v)}
            description="局末、关键球的处理"
          />
        </div>
      </section>

      {/* 关键数字 */}
      <section className="space-y-4">
        <div className="text-[10px] tracking-[0.2em] uppercase text-[var(--accent)] mb-4">
          关键数字（必填）
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-muted)] block mb-2">
              总得分
            </label>
            <input
              type="number"
              min={0}
              value={form.pointsScored || ""}
              onChange={(e) => setForm({ ...form, pointsScored: parseInt(e.target.value) || 0 })}
              className="w-full bg-[var(--bg-secondary)] border border-[var(--line-default)] p-3 text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-muted)] block mb-2">
              总失分
            </label>
            <input
              type="number"
              min={0}
              value={form.pointsLost || ""}
              onChange={(e) => setForm({ ...form, pointsLost: parseInt(e.target.value) || 0 })}
              className="w-full bg-[var(--bg-secondary)] border border-[var(--line-default)] p-3 text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-muted)] block mb-2">
              重大失误
            </label>
            <input
              type="number"
              min={0}
              value={form.majorErrors || ""}
              onChange={(e) => setForm({ ...form, majorErrors: parseInt(e.target.value) || 0 })}
              className="w-full bg-[var(--bg-secondary)] border border-[var(--line-default)] p-3 text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              placeholder="0"
            />
          </div>
        </div>
      </section>

      {/* 主要观察 */}
      <section className="space-y-4">
        <div className="text-[10px] tracking-[0.2em] uppercase text-[var(--accent)] mb-4">
          主要观察
        </div>
        
        <div>
          <label className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-muted)] block mb-2">
            主要优势（一句话）
          </label>
          <input
            type="text"
            value={form.topStrength}
            onChange={(e) => setForm({ ...form, topStrength: e.target.value })}
            className="w-full bg-[var(--bg-secondary)] border border-[var(--line-default)] p-3 text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
            placeholder="例如：发球威胁大，连续ACE"
          />
        </div>

        <div>
          <label className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-muted)] block mb-2">
            主要问题（一句话）
          </label>
          <input
            type="text"
            value={form.topWeakness}
            onChange={(e) => setForm({ ...form, topWeakness: e.target.value })}
            className="w-full bg-[var(--bg-secondary)] border border-[var(--line-default)] p-3 text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
            placeholder="例如：接发判断慢，到位率低"
          />
        </div>
      </section>

      {/* 失误标签 */}
      <section className="space-y-4">
        <div className="text-[10px] tracking-[0.2em] uppercase text-[var(--accent)] mb-4">
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
        <div className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-muted)] mb-2">
          其他备注（可选）
        </div>
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={3}
          className="w-full bg-[var(--bg-secondary)] border border-[var(--line-default)] p-3 text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none resize-none"
          placeholder="补充说明..."
        />
      </section>

      {/* 提交 */}
      <div className="pt-8 border-t border-[var(--line-default)]">
        <button
          type="submit"
          disabled={isSubmitting || !form.matchName}
          className="w-full py-4 bg-[var(--accent)] text-[var(--bg-primary)] font-bold tracking-wider uppercase hover:opacity-90 transition-sharp disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "生成报告中..." : "生成分析报告"}
        </button>
        <p className="text-xs text-[var(--text-muted)] text-center mt-4">
          快速模式基于主观评估生成报告，建议尽快补充精确数据
        </p>
      </div>
    </form>
  )
}

// 辅助函数：将快速表单转换为评分输入
function convertQuickFormToScoringInput(
  form: QuickVolleyballForm,
  position: string
) {
  return {
    mode: "quick" as const,
    athleteId: form.athleteId,
    matchName: form.matchName,
    opponent: form.opponent,
    matchDate: form.matchDate,
    
    // 上下文
    participationLevel: form.participationLevel,
    starterStatus: form.starterStatus,
    matchImportance: form.matchImportance,
    opponentStrength: form.opponentStrength,
    
    // 核心数字
    totalPoints: form.pointsScored,
    totalPointsLost: form.pointsLost,
    majorErrors: form.majorErrors,
    
    // 评分（映射到标准分）
    scoringRating: simplifiedRatingToScore[form.scoringRating],
    errorRating: simplifiedRatingToScore[form.errorRating],
    receptionRating: simplifiedRatingToScore[form.receptionRating],
    clutchRating: simplifiedRatingToScore[form.clutchRating],
    
    // 文本输入
    topStrength: form.topStrength,
    topWeakness: form.topWeakness,
    errorTags: form.errorTags,
    notes: form.notes,
    
    // 位置
    position,
  }
}
