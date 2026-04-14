"use client"

import { useState } from "react"
import { EVALUATION_RUBRIC } from "@/lib/ai-evaluation"

export default function AIEvalPage() {
  const [evaluations, setEvaluations] = useState<Array<{
    id: string
    insightTitle: string
    scores: { accuracy: number; relevance: number; actionability: number }
    isNonsense: boolean
    isDangerous: boolean
    comment: string
  }>>([])

  const [currentEval, setCurrentEval] = useState({
    insightTitle: "",
    insightContent: "",
    recommendation: "",
    scores: { accuracy: 3, relevance: 3, actionability: 3 },
    isNonsense: false,
    isDangerous: false,
    comment: ""
  })

  const submitEvaluation = () => {
    setEvaluations([...evaluations, {
      id: Date.now().toString(),
      insightTitle: currentEval.insightTitle,
      scores: currentEval.scores,
      isNonsense: currentEval.isNonsense,
      isDangerous: currentEval.isDangerous,
      comment: currentEval.comment
    }])

    // Reset form
    setCurrentEval({
      insightTitle: "",
      insightContent: "",
      recommendation: "",
      scores: { accuracy: 3, relevance: 3, actionability: 3 },
      isNonsense: false,
      isDangerous: false,
      comment: ""
    })
  }

  const avgScores = evaluations.length > 0 ? {
    accuracy: evaluations.reduce((s, e) => s + e.scores.accuracy, 0) / evaluations.length,
    relevance: evaluations.reduce((s, e) => s + e.scores.relevance, 0) / evaluations.length,
    actionability: evaluations.reduce((s, e) => s + e.scores.actionability, 0) / evaluations.length,
  } : null

  const redLineViolations = evaluations.filter(e => e.scores.actionability <= 2 || e.isNonsense).length

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-2xl font-bold mb-2">AI 洞察评估矩阵</h1>
        <p className="text-[var(--text-muted)] mb-8">
          评估 AI 生成洞察的准确度、相关性和可执行性
        </p>

        {/* 评估标准说明 */}
        <div className="bg-[var(--bg-secondary)] rounded-xl p-6 mb-8">
          <h2 className="font-bold mb-4">评估标准 (1-5分)</h2>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <h3 className="font-medium text-[var(--accent)] mb-2">因果推理准确度</h3>
              <p className="text-[var(--text-muted)]">AI 找出的原因是否符合场上真实情况？</p>
            </div>
            <div>
              <h3 className="font-medium text-[var(--accent)] mb-2">处方匹配精准度</h3>
              <p className="text-[var(--text-muted)]">推荐的训练是否真能解决问题？</p>
            </div>
            <div>
              <h3 className="font-medium text-[var(--accent)] mb-2">可执行性</h3>
              <p className="text-[var(--text-muted)]">明天训练能直接用吗？</p>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-500 font-medium">
              ⚠️ 红线警告：可执行性 ≤ 2分 或 被判定为废话时，必须立即修改系统！
            </p>
          </div>
        </div>

        {/* 评估表单 */}
        <div className="bg-[var(--bg-secondary)] rounded-xl p-6 mb-8">
          <h2 className="font-bold mb-4">新增评估</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">洞察标题</label>
              <input
                type="text"
                value={currentEval.insightTitle}
                onChange={(e) => setCurrentEval({...currentEval, insightTitle: e.target.value})}
                className="w-full px-4 py-2 bg-[var(--bg-primary)] rounded-lg border border-[var(--line-default)]"
                placeholder="例如：连续多回合后体能下降导致失误率飙升"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">洞察内容</label>
              <textarea
                value={currentEval.insightContent}
                onChange={(e) => setCurrentEval({...currentEval, insightContent: e.target.value})}
                rows={3}
                className="w-full px-4 py-2 bg-[var(--bg-primary)] rounded-lg border border-[var(--line-default)]"
                placeholder="AI 生成的洞察内容..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">推荐训练</label>
              <input
                type="text"
                value={currentEval.recommendation}
                onChange={(e) => setCurrentEval({...currentEval, recommendation: e.target.value})}
                className="w-full px-4 py-2 bg-[var(--bg-primary)] rounded-lg border border-[var(--line-default)]"
                placeholder="AI 推荐的训练处方..."
              />
            </div>

            {/* 三个维度的评分 */}
            <div className="grid grid-cols-3 gap-4">
              {(Object.keys(EVALUATION_RUBRIC) as Array<keyof typeof EVALUATION_RUBRIC>).map((key) => (
                <div key={key}>
                  <label className="block text-sm font-medium mb-2">
                    {EVALUATION_RUBRIC[key].name}
                  </label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((score) => (
                      <button
                        key={score}
                        onClick={() => setCurrentEval({
                          ...currentEval,
                          scores: { ...currentEval.scores, [key]: score }
                        })}
                        className={`w-10 h-10 rounded-lg border ${
                          currentEval.scores[key] === score
                            ? "bg-[var(--accent)] text-[var(--bg-primary)] border-[var(--accent)]"
                            : "bg-[var(--bg-primary)] border-[var(--line-default)]"
                        }`}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    {currentEval.scores[key]}分: {EVALUATION_RUBRIC[key].levels[currentEval.scores[key] as 1|2|3|4|5]}
                  </p>
                </div>
              ))}
            </div>

            {/* 红线检查 */}
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={currentEval.isNonsense}
                  onChange={(e) => setCurrentEval({...currentEval, isNonsense: e.target.checked})}
                  className="w-4 h-4"
                />
                <span className="text-sm text-red-500">这是废话/胡说</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={currentEval.isDangerous}
                  onChange={(e) => setCurrentEval({...currentEval, isDangerous: e.target.checked})}
                  className="w-4 h-4"
                />
                <span className="text-sm text-red-500">这有安全风险</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">改进建议</label>
              <textarea
                value={currentEval.comment}
                onChange={(e) => setCurrentEval({...currentEval, comment: e.target.value})}
                rows={2}
                className="w-full px-4 py-2 bg-[var(--bg-primary)] rounded-lg border border-[var(--line-default)]"
                placeholder="如何让这个洞察更好？"
              />
            </div>

            <button
              onClick={submitEvaluation}
              disabled={!currentEval.insightTitle}
              className="w-full py-3 bg-[var(--accent)] text-[var(--bg-primary)] rounded-xl font-bold disabled:opacity-50"
            >
              提交评估
            </button>
          </div>
        </div>

        {/* 统计结果 */}
        {evaluations.length > 0 && (
          <div className="bg-[var(--bg-secondary)] rounded-xl p-6">
            <h2 className="font-bold mb-4">评估结果 ({evaluations.length} 条)</h2>
            
            {avgScores && (
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-[var(--bg-primary)] rounded-lg">
                  <div className="text-2xl font-bold">{avgScores.accuracy.toFixed(1)}</div>
                  <div className="text-sm text-[var(--text-muted)]">准确度</div>
                </div>
                <div className="text-center p-4 bg-[var(--bg-primary)] rounded-lg">
                  <div className="text-2xl font-bold">{avgScores.relevance.toFixed(1)}</div>
                  <div className="text-sm text-[var(--text-muted)]">相关性</div>
                </div>
                <div className="text-center p-4 bg-[var(--bg-primary)] rounded-lg">
                  <div className={`text-2xl font-bold ${avgScores.actionability < 3 ? "text-red-500" : ""}`}>
                    {avgScores.actionability.toFixed(1)}
                  </div>
                  <div className="text-sm text-[var(--text-muted)]">可执行性</div>
                </div>
              </div>
            )}

            {redLineViolations > 0 && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg mb-4">
                <p className="text-red-500 font-medium">
                  ⚠️ 发现 {redLineViolations} 条红线违规！需要立即修改系统。
                </p>
              </div>
            )}

            <div className="space-y-2">
              {evaluations.map((e) => (
                <div key={e.id} className="p-4 bg-[var(--bg-primary)] rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{e.insightTitle}</span>
                    <div className="flex gap-2 text-sm">
                      <span>A:{e.scores.accuracy}</span>
                      <span>R:{e.scores.relevance}</span>
                      <span className={e.scores.actionability <= 2 ? "text-red-500 font-bold" : ""}>
                        X:{e.scores.actionability}
                      </span>
                    </div>
                  </div>
                  {(e.isNonsense || e.isDangerous) && (
                    <div className="mt-2 text-sm text-red-500">
                      {e.isNonsense && "⚠️ 废话/胡说 "}
                      {e.isDangerous && "⚠️ 危险建议"}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
