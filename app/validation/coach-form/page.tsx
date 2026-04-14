"use client"

import { useState } from "react"
import { generateCoachBlindTestForm, saveGoldStandard } from "@/lib/gold-standard"
import { shadowCalculate } from "@/lib/shadow-scoring"
import type { CoachBlindTestForm } from "@/lib/gold-standard"

export default function CoachFormPage() {
  const [form, setForm] = useState<CoachBlindTestForm | null>(null)
  const [step, setStep] = useState<"setup" | "evaluation" | "review">("setup")
  
  const [matchName, setMatchName] = useState("")
  const [opponent, setOpponent] = useState("")
  const [coachName, setCoachName] = useState("")
  const [players, setPlayers] = useState("")

  const generateForm = () => {
    const playerList = players.split("\n").filter(p => p.trim()).map((p, i) => {
      const parts = p.split(/[,，\s]+/)
      return {
        id: `player-${i}`,
        name: parts[0],
        position: parts[1] || "主攻",
        jerseyNumber: parts[2]
      }
    })

    const newForm = generateCoachBlindTestForm(
      matchName,
      opponent,
      new Date().toISOString().split("T")[0],
      playerList,
      coachName
    )

    setForm(newForm)
    setStep("evaluation")
  }

  const updatePlayerEvaluation = (index: number, field: string, value: any) => {
    if (!form) return
    const newEvaluations = [...form.playerEvaluations]
    newEvaluations[index] = { ...newEvaluations[index], [field]: value }
    setForm({ ...form, playerEvaluations: newEvaluations })
  }

  const submitForm = async () => {
    if (!form) return

    for (const playerEval of form.playerEvaluations) {
      const mockInput = {
        match_name: form.matchName,
        opponent: form.opponent,
        player_position: playerEval.playerPosition as any,
        session_date: form.evaluationDate,
        total_points: Math.round(playerEval.absoluteScore / 2),
        total_points_lost: Math.round(playerEval.absoluteScore / 3),
        attack_kills: Math.round(playerEval.absoluteScore / 5),
        attack_errors: Math.round((100 - playerEval.absoluteScore) / 10),
        serve_aces: 2,
        serve_errors: 1,
        reception_success_rate: playerEval.absoluteScore,
        block_points: 2,
        digs: 5,
        clutch_performance_score: playerEval.absoluteScore,
        error_tags: [],
        notes: playerEval.coreWeakness
      }

      const shadowResult = await shadowCalculate(mockInput as any, {
        sessionId: `gs-${Date.now()}-${playerEval.playerId}`,
        environment: "staging"
      })

      saveGoldStandard({
        id: `gs-${Date.now()}-${playerEval.playerId}`,
        matchId: form.formId,
        matchName: form.matchName,
        matchDate: form.evaluationDate,
        playerId: playerEval.playerId,
        playerName: playerEval.playerName,
        playerPosition: playerEval.playerPosition,
        coachEvaluation: {
          coachId: form.coachName,
          coachName: form.coachName,
          evaluationDate: new Date().toISOString(),
          absoluteScore: playerEval.absoluteScore,
          rankInMatch: playerEval.rankInMatch,
          totalPlayersInMatch: form.playerEvaluations.length,
          coreWeakness: playerEval.coreWeakness,
          coreStrength: playerEval.coreStrength,
          coachConfidence: playerEval.confidence
        },
        systemScores: {
          v1: {
            overallScore: shadowResult.v1.overallScore,
            subScores: {
              scoring: shadowResult.v1.subScores.scoring_contribution,
              errorControl: shadowResult.v1.subScores.error_control,
              stability: shadowResult.v1.subScores.stability,
              clutch: shadowResult.v1.subScores.clutch_performance,
            },
            timestamp: shadowResult.timestamp
          },
          v2: {
            overallScore: shadowResult.v2.overallScore,
            confidenceInterval: [shadowResult.v2.confidenceInterval.lower, shadowResult.v2.confidenceInterval.upper],
            posteriorMean: shadowResult.v2.bayesianEstimate.posteriorMean,
            driftDetected: shadowResult.v2.bayesianEstimate.driftDetected,
            timestamp: shadowResult.timestamp
          }
        },
        videoEvidence: {
          videoUrl: "",
          clips: []
        },
        quickInput: {
          inputBy: form.coachName,
          inputMethod: "web",
          rawData: mockInput,
          timestamp: new Date().toISOString()
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: "completed"
        }
      })
    }

    setStep("review")
  }

  if (step === "setup") {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] py-8">
        <div className="max-w-2xl mx-auto px-4">
          <h1 className="text-2xl font-bold mb-2">生成教练盲测表</h1>
          <p className="text-[var(--text-muted)] mb-8">填写比赛信息，生成标准化的盲测表单</p>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">比赛名称</label>
              <input
                type="text"
                value={matchName}
                onChange={(e) => setMatchName(e.target.value)}
                className="w-full px-4 py-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--line-default)]"
                placeholder="例如：联赛第3轮 vs 北京队"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">对手</label>
              <input
                type="text"
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                className="w-full px-4 py-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--line-default)]"
                placeholder="例如：北京队"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">教练姓名</label>
              <input
                type="text"
                value={coachName}
                onChange={(e) => setCoachName(e.target.value)}
                className="w-full px-4 py-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--line-default)]"
                placeholder="例如：王教练"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                球员列表
                <span className="text-[var(--text-muted)] font-normal">（每行一位：姓名 位置 号码）</span>
              </label>
              <textarea
                value={players}
                onChange={(e) => setPlayers(e.target.value)}
                rows={8}
                className="w-full px-4 py-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--line-default)]"
                placeholder={`张三 主攻 10\n李四 副攻 8\n王五 二传 6`}
              />
            </div>

            <button
              onClick={generateForm}
              disabled={!matchName || !coachName || !players}
              className="w-full py-4 bg-[var(--accent)] text-[var(--bg-primary)] rounded-xl font-bold disabled:opacity-50"
            >
              生成盲测表
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === "evaluation" && form) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-2xl font-bold">{form.matchName} - 教练盲测</h1>
            <p className="text-[var(--text-muted)]">教练：{form.coachName}</p>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-8">
            <h3 className="font-bold text-yellow-500 mb-2">盲测说明</h3>
            <ul className="text-sm space-y-1 text-[var(--text-secondary)]">
              <li>• 请观看完整比赛录像后填写</li>
              <li>• 不要参考任何外部评分系统</li>
              <li>• 绝对评分：0-100分综合评分</li>
              <li>• 相对排序：1=本场最佳</li>
              <li>• 核心痛点：一句话概括最大问题</li>
            </ul>
          </div>

          <div className="space-y-6">
            {form.playerEvaluations.map((player, index) => (
              <div key={player.playerId} className="bg-[var(--bg-secondary)] rounded-xl p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 bg-[var(--accent)]/20 rounded-full flex items-center justify-center text-[var(--accent)] font-bold">
                    {player.jerseyNumber || index + 1}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{player.playerName}</h3>
                    <p className="text-sm text-[var(--text-muted)]">{player.playerPosition}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">绝对评分 (0-100)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={player.absoluteScore || ""}
                      onChange={(e) => updatePlayerEvaluation(index, "absoluteScore", parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2 bg-[var(--bg-primary)] rounded-lg border border-[var(--line-default)]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">相对排序</label>
                    <input
                      type="number"
                      min={1}
                      max={form.playerEvaluations.length}
                      value={player.rankInMatch || ""}
                      onChange={(e) => updatePlayerEvaluation(index, "rankInMatch", parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2 bg-[var(--bg-primary)] rounded-lg border border-[var(--line-default)]"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2">核心痛点（一句话）</label>
                  <input
                    type="text"
                    value={player.coreWeakness}
                    onChange={(e) => updatePlayerEvaluation(index, "coreWeakness", e.target.value)}
                    className="w-full px-4 py-2 bg-[var(--bg-primary)] rounded-lg border border-[var(--line-default)]"
                    placeholder="例如：一传到位率低，脚步移动慢"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2">评估置信度</label>
                  <div className="flex gap-2">
                    {["high", "medium", "low"].map((conf) => (
                      <button
                        key={conf}
                        onClick={() => updatePlayerEvaluation(index, "confidence", conf)}
                        className={`px-4 py-2 rounded-lg border ${
                          player.confidence === conf
                            ? "bg-[var(--accent)] text-[var(--bg-primary)] border-[var(--accent)]"
                            : "bg-[var(--bg-primary)] border-[var(--line-default)]"
                        }`}
                      >
                        {conf === "high" ? "高" : conf === "medium" ? "中" : "低"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={submitForm}
            className="w-full mt-8 py-4 bg-[var(--accent)] text-[var(--bg-primary)] rounded-xl font-bold"
          >
            提交评估
          </button>
        </div>
      </div>
    )
  }

  if (step === "review") {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] py-8">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold mb-2">评估已保存</h1>
          <p className="text-[var(--text-muted)] mb-8">
            数据已录入金标准数据库，将用于V2引擎验证
          </p>

          <div className="space-y-4">
            <a
              href="/validation"
              className="block w-full py-4 bg-[var(--accent)] text-[var(--bg-primary)] rounded-xl font-bold"
            >
              查看验证仪表板
            </a>
            <button
              onClick={() => {
                setStep("setup")
                setForm(null)
              }}
              className="block w-full py-4 bg-[var(--bg-secondary)] rounded-xl font-medium"
            >
              录入另一场比赛
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
