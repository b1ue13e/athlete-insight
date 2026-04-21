"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Activity,
  ArrowLeft,
  BarChart3,
  ChevronRight,
  Plus,
  Sparkles,
  User,
  type LucideIcon,
  Zap,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"
import { QuickModeForm } from "./quick-mode-form"
import { ProfessionalModeForm } from "./professional-mode-form"
import { AthleteProfile, createAthlete, listAthletes, resolveCurrentAthlete, setCurrentAthlete } from "@/lib/athletes"
import { InputMode } from "@/types/input"

type SportType = "volleyball" | "running" | "gym"
type Step = "select-sport" | "select-athlete" | "select-mode" | "input-data"
type VolleyballPosition = "主攻" | "副攻" | "二传" | "接应" | "自由人"

const flowSteps: Array<{ id: Step; label: string }> = [
  { id: "select-sport", label: "运动类型" },
  { id: "select-athlete", label: "运动员" },
  { id: "select-mode", label: "录入模式" },
  { id: "input-data", label: "填写数据" },
]

const volleyballPositions: VolleyballPosition[] = ["主攻", "副攻", "二传", "接应", "自由人"]

const sportOptions: Array<{
  value: SportType
  title: string
  subtitle: string
  description: string
  bullets: string[]
  badge?: string
  icon: LucideIcon
}> = [
  {
    value: "running",
    title: "跑步训练",
    subtitle: "主入口 · 高频复盘",
    description: "如果你想先体验 Athlete Insight 的主线闭环，就从跑步开始：先判断这次有没有练对，再带着修正重点回到下一次训练。",
    bullets: ["周复盘优先", "偏差证据链", "适合持续回访"],
    badge: "Recommended",
    icon: Activity,
  },
  {
    value: "gym",
    title: "健身训练",
    subtitle: "第二入口 · 结构诊断",
    description: "适合已经接受“诊断与纠偏”思路的用户。重点不是记录动作，而是判断安排有没有真正服务目标。",
    bullets: ["结构失衡诊断", "疲劳风险提示", "下次动作建议"],
    badge: "Depth",
    icon: Zap,
  },
  {
    value: "volleyball",
    title: "排球分析",
    subtitle: "专项入口 · 专业背书",
    description: "保留位置感知、赛后复盘和专项判断能力，更适合专业场景，也作为 Athlete Insight 的差异化能力展示。",
    bullets: ["专项评分体系", "位置模板", "赛后复盘"],
    badge: "Specialty",
    icon: BarChart3,
  },
]

const modeOptions: Array<{
  value: InputMode
  title: string
  subtitle: string
  description: string
  bullets: string[]
  icon: LucideIcon
}> = [
  {
    value: "quick",
    title: "快速模式",
    subtitle: "2 分钟完成",
    description: "适合比赛刚结束或训练后马上补记，重点记录主观判断和核心表现。",
    bullets: ["少量字段即可完成", "适合记忆型输入", "更快拿到第一份报告"],
    icon: Zap,
  },
  {
    value: "professional",
    title: "专业模式",
    subtitle: "5 到 8 分钟",
    description: "适合已经有较完整技术统计或想做更细致分析的场景。",
    bullets: ["支持更完整数据", "维度更细", "报告可信度更高"],
    icon: BarChart3,
  },
]

export default function NewAnalysisPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [step, setStep] = useState<Step>("select-sport")
  const [sportType, setSportType] = useState<SportType>("running")
  const [athletes, setAthletes] = useState<AthleteProfile[]>([])
  const [selectedAthlete, setSelectedAthlete] = useState<AthleteProfile | null>(null)
  const [inputMode, setInputMode] = useState<InputMode>("quick")
  const [isCreatingAthlete, setIsCreatingAthlete] = useState(false)
  const [newAthleteForm, setNewAthleteForm] = useState({
    name: "",
    position: "主攻" as VolleyballPosition,
    team: "",
  })

  useEffect(() => {
    let cancelled = false

    void listAthletes(user?.id).then((loadedAthletes) => {
      if (!cancelled) {
        setAthletes(loadedAthletes)
      }
    })

    void resolveCurrentAthlete(user?.id).then((current) => {
      if (!cancelled && current) {
        setSelectedAthlete(current)
      }
    })

    return () => {
      cancelled = true
    }
  }, [user?.id])

  const currentStepIndex = flowSteps.findIndex((item) => item.id === step)
  const canContinue =
    step === "select-sport" ||
    (step === "select-athlete" && Boolean(selectedAthlete)) ||
    step === "select-mode"

  const handleSelectAthlete = (athlete: AthleteProfile) => {
    setSelectedAthlete(athlete)
    setCurrentAthlete(athlete.id)
  }

  const handleCreateAthlete = async () => {
    if (!newAthleteForm.name.trim()) return

    const athlete = await createAthlete({
      name: newAthleteForm.name.trim(),
      position: newAthleteForm.position,
      team: newAthleteForm.team.trim() || undefined,
      primarySport: "volleyball",
    }, user?.id)

    setAthletes((current) => [...current, athlete])
    setSelectedAthlete(athlete)
    setCurrentAthlete(athlete.id)
    setIsCreatingAthlete(false)
    setNewAthleteForm({
      name: "",
      position: "主攻",
      team: "",
    })
  }

  const handleContinue = () => {
    if (step === "select-sport") {
      if (sportType === "running") {
        router.push("/analysis/new/running")
        return
      }
      if (sportType === "gym") {
        router.push("/analysis/new/gym")
        return
      }
      setStep("select-athlete")
      return
    }

    if (step === "select-athlete" && selectedAthlete) {
      setStep("select-mode")
      return
    }

    if (step === "select-mode") {
      setStep("input-data")
    }
  }

  const handleBack = () => {
    if (step === "input-data") {
      setStep("select-mode")
      return
    }
    if (step === "select-mode") {
      setStep("select-athlete")
      return
    }
    if (step === "select-athlete") {
      setStep("select-sport")
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-[var(--line-default)] bg-[color-mix(in_oklch,var(--bg-primary)_84%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {step === "select-sport" ? (
            <Link href="/" className="flex items-center gap-2 text-sm text-[var(--text-secondary)] transition-sharp hover:text-[var(--text-primary)]">
              <ArrowLeft className="h-4 w-4" />
              返回首页
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-2 text-sm text-[var(--text-secondary)] transition-sharp hover:text-[var(--text-primary)]"
            >
              <ArrowLeft className="h-4 w-4" />
              上一步
            </button>
          )}

          <div className="hidden items-center gap-3 md:flex">
            {flowSteps.map((item, index) => {
              const isActive = currentStepIndex === index
              const isDone = currentStepIndex > index

              return (
                <div key={item.id} className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex min-w-[108px] items-center gap-2 rounded-full border px-3 py-2 text-xs uppercase tracking-[0.18em] transition-sharp",
                      isActive
                        ? "border-[var(--line-accent)] bg-[var(--accent-dim)] text-[var(--accent)]"
                        : isDone
                          ? "border-[var(--line-strong)] text-[var(--text-primary)]"
                          : "border-[var(--line-default)] text-[var(--text-muted)]"
                    )}
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <span>{item.label}</span>
                  </div>
                  {index < flowSteps.length - 1 ? <div className="h-px w-4 bg-[var(--line-default)]" /> : null}
                </div>
              )
            })}
          </div>

          <div className="data-pill text-xs uppercase tracking-[0.18em]">
            {flowSteps[currentStepIndex]?.label ?? "录入流程"}
          </div>
        </div>
      </header>

      <main className="px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        {step !== "input-data" ? (
          <div className="mx-auto max-w-7xl space-y-8">
            <section className="grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_360px] lg:items-start">
              <div className="relative overflow-hidden rounded-[2rem] border border-[var(--line-default)] bg-[color-mix(in_oklch,var(--bg-secondary)_88%,transparent)] px-6 py-8 sm:px-8 sm:py-10">
                <div className="hero-orbit left-[-8%] top-[-16%] h-48 w-48 opacity-20" />
                <div className="hero-orbit bottom-[-18%] right-[-10%] h-52 w-52 opacity-20" />

                <div className="relative z-10 space-y-5">
                  <div className="eyebrow text-[var(--accent)]">
                    Step {String(currentStepIndex + 1).padStart(2, "0")} / {flowSteps.length}
                  </div>
                  <h1 className="font-display text-[clamp(2.2rem,5vw,4.6rem)] leading-[0.95] tracking-[-0.04em]">
                    {getStepHeading(step)}
                  </h1>
                  <p className="max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
                    {getStepDescription(step, sportType, selectedAthlete)}
                  </p>

                  <div className="flex flex-wrap gap-3">
                    <div className="data-pill text-xs uppercase tracking-[0.18em]">
                      <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />
                      统一视觉流程
                    </div>
                    {selectedAthlete ? (
                      <div className="data-pill text-xs uppercase tracking-[0.18em]">
                        <User className="h-3.5 w-3.5 text-[var(--accent)]" />
                        {selectedAthlete.name}
                      </div>
                    ) : null}
                    <div className="data-pill text-xs uppercase tracking-[0.18em]">
                      当前项目 · {sportOptions.find((option) => option.value === sportType)?.title ?? "排球分析"}
                    </div>
                  </div>
                </div>
              </div>

              <aside className="panel-elevated space-y-5 p-6">
                <div className="eyebrow">流程提示</div>
                <h2 className="font-display text-2xl leading-tight tracking-[-0.03em] text-[var(--text-primary)]">
                  先做选择，再进入数据录入
                </h2>
                <div className="space-y-3">
                  {getStepTips(step).map((tip, index) => (
                    <div
                      key={tip}
                      className="rounded-2xl border border-[var(--line-default)] bg-[color-mix(in_oklch,var(--bg-secondary)_84%,transparent)] p-4"
                    >
                      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
                        {String(index + 1).padStart(2, "0")}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{tip}</p>
                    </div>
                  ))}
                </div>
              </aside>
            </section>

            {step === "select-sport" ? (
              <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-4">
                  {sportOptions.map((option) => (
                    <SelectionCard
                      key={option.value}
                      title={option.title}
                      subtitle={option.subtitle}
                      description={option.description}
                      bullets={option.bullets}
                      badge={option.badge}
                      icon={option.icon}
                      selected={sportType === option.value}
                      onClick={() => setSportType(option.value)}
                    />
                  ))}
                </div>

                <aside className="panel space-y-5 p-6">
                  <div className="eyebrow">本页目标</div>
                  <h3 className="font-display text-2xl tracking-[-0.03em] text-[var(--text-primary)]">
                    先把分析入口选对
                  </h3>
                  <div className="space-y-3 text-sm leading-6 text-[var(--text-secondary)]">
                    <p>不同项目会进入不同的分析引擎和录入结构，所以这里决定的是后续整条工作流。</p>
                    <p>如果你只是想快速开始，先从排球分析进入，后面还能继续补充运动员和模式选择。</p>
                  </div>
                  <button type="button" onClick={handleContinue} className="action-primary w-full text-sm">
                    继续
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </aside>
              </section>
            ) : null}

            {step === "select-athlete" ? (
              <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-4">
                  {athletes.length === 0 ? (
                    <div className="panel space-y-4 p-6 sm:p-8">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--line-accent)] bg-[var(--accent-dim)]">
                        <User className="h-6 w-6 text-[var(--accent)]" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-semibold text-[var(--text-primary)]">还没有运动员档案</h3>
                        <p className="text-sm leading-6 text-[var(--text-secondary)]">
                          你可以先在这里创建一个基础档案，后面每次分析都会自动沉淀到这个人名下。
                        </p>
                      </div>
                    </div>
                  ) : (
                    athletes.map((athlete) => (
                      <button
                        key={athlete.id}
                        type="button"
                        onClick={() => handleSelectAthlete(athlete)}
                        className={cn(
                          "panel group w-full p-5 text-left transition-sharp hover:border-[var(--line-accent)]",
                          selectedAthlete?.id === athlete.id ? "border-[var(--line-accent)] bg-[var(--accent-dim)]" : ""
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2">
                            <div
                              className={cn(
                                "text-xl font-semibold transition-sharp",
                                selectedAthlete?.id === athlete.id ? "text-[var(--accent)]" : "text-[var(--text-primary)]"
                              )}
                            >
                              {athlete.name}
                            </div>
                            <div className="text-sm text-[var(--text-secondary)]">
                              {athlete.position}
                              {athlete.team ? ` · ${athlete.team}` : ""}
                            </div>
                          </div>
                          <ChevronRight
                            className={cn(
                              "mt-1 h-5 w-5 transition-sharp",
                              selectedAthlete?.id === athlete.id ? "translate-x-1 text-[var(--accent)]" : "text-[var(--text-muted)]"
                            )}
                          />
                        </div>
                      </button>
                    ))
                  )}
                </div>

                <aside className="space-y-4">
                  <div className="panel space-y-4 p-6">
                    <div className="eyebrow">新建档案</div>
                    {!isCreatingAthlete && athletes.length > 0 ? (
                      <>
                        <p className="text-sm leading-6 text-[var(--text-secondary)]">
                          如果当前名单里还没有这位运动员，可以在继续前补一个基础档案。
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsCreatingAthlete(true)}
                          className="action-secondary w-full text-sm"
                        >
                          <Plus className="h-4 w-4" />
                          新建运动员档案
                        </button>
                      </>
                    ) : (
                      <div className="space-y-4">
                        <Field label="姓名 *">
                          <input
                            type="text"
                            value={newAthleteForm.name}
                            onChange={(event) => setNewAthleteForm((current) => ({ ...current, name: event.target.value }))}
                            className="w-full rounded-2xl border border-[var(--line-default)] bg-[var(--bg-secondary)] px-4 py-3 text-[var(--text-primary)] transition-sharp focus:border-[var(--line-accent)] focus:outline-none"
                            placeholder="输入姓名"
                          />
                        </Field>

                        <Field label="位置">
                          <select
                            value={newAthleteForm.position}
                            onChange={(event) =>
                              setNewAthleteForm((current) => ({
                                ...current,
                                position: event.target.value as VolleyballPosition,
                              }))
                            }
                            className="w-full rounded-2xl border border-[var(--line-default)] bg-[var(--bg-secondary)] px-4 py-3 text-[var(--text-primary)] transition-sharp focus:border-[var(--line-accent)] focus:outline-none"
                          >
                            {volleyballPositions.map((position) => (
                              <option key={position} value={position}>
                                {position}
                              </option>
                            ))}
                          </select>
                        </Field>

                        <Field label="队伍 / 组别">
                          <input
                            type="text"
                            value={newAthleteForm.team}
                            onChange={(event) => setNewAthleteForm((current) => ({ ...current, team: event.target.value }))}
                            className="w-full rounded-2xl border border-[var(--line-default)] bg-[var(--bg-secondary)] px-4 py-3 text-[var(--text-primary)] transition-sharp focus:border-[var(--line-accent)] focus:outline-none"
                            placeholder="可选"
                          />
                        </Field>

                        <div className="flex gap-3">
                          <button type="button" onClick={() => setIsCreatingAthlete(false)} className="action-secondary flex-1 text-sm">
                            取消
                          </button>
                          <button
                            type="button"
                            onClick={handleCreateAthlete}
                            disabled={!newAthleteForm.name.trim()}
                            className="action-primary flex-1 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            创建
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleContinue}
                    disabled={!selectedAthlete}
                    className="action-primary w-full text-sm disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    继续
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </aside>
              </section>
            ) : null}

            {step === "select-mode" ? (
              <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-4">
                  {modeOptions.map((option) => (
                    <SelectionCard
                      key={option.value}
                      title={option.title}
                      subtitle={option.subtitle}
                      description={option.description}
                      bullets={option.bullets}
                      icon={option.icon}
                      selected={inputMode === option.value}
                      onClick={() => setInputMode(option.value)}
                    />
                  ))}

                  <div className="panel overflow-hidden p-0">
                    <div className="border-b border-[var(--line-default)] px-5 py-4">
                      <div className="eyebrow">模式对比</div>
                    </div>
                    <div className="grid grid-cols-3 gap-px bg-[var(--line-default)] text-sm">
                      <CompareCell muted>维度</CompareCell>
                      <CompareCell accent>快速模式</CompareCell>
                      <CompareCell>专业模式</CompareCell>
                      <CompareCell muted>填写时间</CompareCell>
                      <CompareCell>约 2 分钟</CompareCell>
                      <CompareCell>约 5 - 8 分钟</CompareCell>
                      <CompareCell muted>数据要求</CompareCell>
                      <CompareCell>主观判断 + 少量关键值</CompareCell>
                      <CompareCell>更完整统计数据</CompareCell>
                      <CompareCell muted>适用场景</CompareCell>
                      <CompareCell>赛后快速补记</CompareCell>
                      <CompareCell>正式复盘与深度分析</CompareCell>
                    </div>
                  </div>
                </div>

                <aside className="panel space-y-4 p-6">
                  <div className="eyebrow">当前选择</div>
                  <div className="space-y-2">
                    <div className="text-sm text-[var(--text-secondary)]">运动员</div>
                    <div className="text-lg font-semibold text-[var(--text-primary)]">{selectedAthlete?.name}</div>
                  </div>
                  <div className="surface-hairline" />
                  <div className="space-y-2">
                    <div className="text-sm text-[var(--text-secondary)]">推荐方式</div>
                    <p className="text-sm leading-6 text-[var(--text-secondary)]">
                      如果你现在只想先完成一份报告，先用快速模式；如果已经有较完整记录，再选专业模式。
                    </p>
                  </div>
                  <button type="button" onClick={handleContinue} className="action-primary w-full text-sm">
                    进入填写
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </aside>
              </section>
            ) : null}
          </div>
        ) : (
          <div className="mx-auto max-w-7xl space-y-8">
            <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
              <div className="panel-elevated space-y-5 p-6 sm:p-8">
                <div className="eyebrow">录入工作台</div>
                <h1 className="font-display text-[clamp(2.2rem,5vw,4.4rem)] leading-[0.96] tracking-[-0.04em] text-[var(--text-primary)]">
                  为 {selectedAthlete?.name} 记录这次表现
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
                  下面就是正式录入区。页面已经根据你前面的选择锁定了项目、对象和模式，填写时可以更专注地完成判断。
                </p>
                <div className="flex flex-wrap gap-3">
                  <div className="data-pill text-xs uppercase tracking-[0.18em]">
                    <User className="h-3.5 w-3.5 text-[var(--accent)]" />
                    {selectedAthlete?.name}
                  </div>
                  <div className="data-pill text-xs uppercase tracking-[0.18em]">
                    {inputMode === "quick" ? "快速模式" : "专业模式"}
                  </div>
                  <div className="data-pill text-xs uppercase tracking-[0.18em]">
                    排球分析
                  </div>
                </div>
              </div>

              <aside className="panel space-y-4 p-6">
                <div className="eyebrow">填写提示</div>
                <div className="space-y-3 text-sm leading-6 text-[var(--text-secondary)]">
                  <p>尽量先填客观信息，再补主观判断，这样更容易保持复盘稳定性。</p>
                  <p>如果只是临时记录，先完成一版也没关系，后续还可以继续补充数据。</p>
                </div>
                <button type="button" onClick={handleBack} className="action-secondary w-full text-sm">
                  返回模式选择
                </button>
              </aside>
            </section>

            <section className="mx-auto max-w-5xl">
              {selectedAthlete && (inputMode === "quick" ? <QuickModeForm athlete={selectedAthlete} /> : <ProfessionalModeForm athlete={selectedAthlete} />)}
            </section>
          </div>
        )}
      </main>
    </div>
  )
}

function SelectionCard({
  title,
  subtitle,
  description,
  bullets,
  badge,
  icon: Icon,
  selected,
  onClick,
}: {
  title: string
  subtitle: string
  description: string
  bullets: string[]
  badge?: string
  icon: LucideIcon
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "panel group w-full p-5 text-left transition-sharp hover:border-[var(--line-accent)]",
        selected ? "border-[var(--line-accent)] bg-[var(--accent-dim)]" : ""
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-full border transition-sharp",
            selected ? "border-[var(--line-accent)] bg-[var(--accent-dim)] text-[var(--accent)]" : "border-[var(--line-default)] text-[var(--text-secondary)]"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-2">
            {badge ? <div className="data-pill inline-flex text-[10px] uppercase tracking-[0.18em]">{badge}</div> : null}
            <div className={cn("text-xl font-semibold transition-sharp", selected ? "text-[var(--accent)]" : "text-[var(--text-primary)]")}>
              {title}
            </div>
            <div className="text-sm text-[var(--text-tertiary)]">{subtitle}</div>
          </div>
          <p className="text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
          <div className="flex flex-wrap gap-2">
            {bullets.map((bullet) => (
              <span key={bullet} className="data-pill text-[11px] uppercase tracking-[0.14em]">
                {bullet}
              </span>
            ))}
          </div>
        </div>

        <ChevronRight className={cn("mt-1 h-5 w-5 shrink-0 transition-sharp", selected ? "translate-x-1 text-[var(--accent)]" : "text-[var(--text-muted)]")} />
      </div>
    </button>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-tertiary)]">{label}</span>
      {children}
    </label>
  )
}

function CompareCell({
  children,
  accent = false,
  muted = false,
}: {
  children: React.ReactNode
  accent?: boolean
  muted?: boolean
}) {
  return (
    <div
      className={cn(
        "bg-[var(--bg-secondary)] px-4 py-4 leading-6",
        accent ? "text-[var(--accent)]" : "text-[var(--text-secondary)]",
        muted ? "text-[var(--text-tertiary)]" : ""
      )}
    >
      {children}
    </div>
  )
}

function getStepHeading(step: Step) {
  switch (step) {
    case "select-sport":
      return "先选对分析入口，再进入录入流程"
    case "select-athlete":
      return "把这次表现归到正确的人身上"
    case "select-mode":
      return "根据手头数据，选合适的填写深度"
    case "input-data":
      return "开始录入"
  }
}

function getStepDescription(step: Step, sportType: SportType, athlete: AthleteProfile | null) {
  switch (step) {
    case "select-sport":
      return "项目不同，分析模型和后续表单也不同。先决定你要分析的是比赛表现、跑步训练还是健身训练。"
    case "select-athlete":
      return `当前项目为 ${sportOptions.find((option) => option.value === sportType)?.title ?? "排球分析"}。选择已有档案，或先补一个新的基础档案。`
    case "select-mode":
      return athlete ? `你正在为 ${athlete.name} 开始一次新分析。下一步只需要决定是快速补记，还是做更细致的专业录入。` : "选择录入方式。"
    case "input-data":
      return "开始填写。"
  }
}

function getStepTips(step: Step) {
  switch (step) {
    case "select-sport":
      return ["项目决定后续分析引擎。", "跑步和健身会进入对应专用页面。", "排球会继续走运动员与模式选择。"]
    case "select-athlete":
      return ["有档案就选档案。", "没有就先建一个最小档案。", "后续每次分析都会沉淀到这个人名下。"]
    case "select-mode":
      return ["快速模式适合马上补记。", "专业模式适合完整复盘。", "不用担心选错，后面还能返回调整。"]
    case "input-data":
      return ["尽量先填客观信息。", "再补主观判断。", "先完成一版，比一直拖着更有价值。"]
  }
}
