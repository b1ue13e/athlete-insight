"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Plus, User, ChevronRight, Zap, BarChart3, Activity } from "lucide-react"
import { cn } from "@/lib/utils"
import { QuickModeForm } from "./quick-mode-form"
import { ProfessionalModeForm } from "./professional-mode-form"
import { AthleteProfile, getAthletes, getCurrentAthlete, setCurrentAthlete, createAthlete } from "@/lib/athletes"
import { InputMode } from "@/types/input"

type SportType = "volleyball" | "running" | "gym"
type Step = "select-sport" | "select-athlete" | "select-mode" | "input-data"

export default function NewAnalysisPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("select-sport")
  const [sportType, setSportType] = useState<SportType>("volleyball")
  const [athletes, setAthletes] = useState<AthleteProfile[]>([])
  const [selectedAthlete, setSelectedAthlete] = useState<AthleteProfile | null>(null)
  const [inputMode, setInputMode] = useState<InputMode>("quick")
  const [isCreatingAthlete, setIsCreatingAthlete] = useState(false)
  
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
    }
  }, [])

  const handleSelectAthlete = (athlete: AthleteProfile) => {
    setSelectedAthlete(athlete)
    setCurrentAthlete(athlete.id)
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
    setIsCreatingAthlete(false)
  }

  const handleContinue = () => {
    if (step === "select-sport") {
      if (sportType === "running") {
        router.push("/analysis/new/running")
      } else if (sportType === "gym") {
        router.push("/analysis/new/gym")
      } else {
        setStep("select-athlete")
      }
    } else if (step === "select-athlete" && selectedAthlete) {
      setStep("select-mode")
    } else if (step === "select-mode") {
      setStep("input-data")
    }
  }

  const handleBack = () => {
    if (step === "input-data") {
      setStep("select-mode")
    } else if (step === "select-mode") {
      setStep("select-athlete")
    } else if (step === "select-athlete") {
      setStep("select-sport")
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* 导航 */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-primary)]/80 backdrop-blur-sm border-b border-[var(--line-default)]">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          {step === "select-athlete" ? (
            <Link 
              href="/"
              className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-sharp"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm tracking-wide">返回</span>
            </Link>
          ) : (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-sharp"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm tracking-wide">上一步</span>
            </button>
          )}
          
          <div className="text-[10px] tracking-[0.2em] text-[var(--text-muted)] uppercase">
            {step === "select-sport" && "选择运动类型"}
            {step === "select-athlete" && "选择运动员"}
            {step === "select-mode" && "选择录入模式"}
            {step === "input-data" && "录入数据"}
          </div>
        </div>
      </nav>

      <main className="pt-14">
        {/* 步骤 1：选择运动类型 */}
        {step === "select-sport" && (
          <div className="min-h-[calc(100vh-56px)] flex flex-col">
            <section className="pt-16 pb-8 px-6">
              <div className="max-w-3xl mx-auto">
                <div className="editorial-title mb-4">步骤 1 / 3</div>
                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-[var(--text-primary)] mb-4">
                  选择运动类型
                </h1>
                <p className="text-[var(--text-secondary)] text-lg">
                  你想分析哪种运动的表现？
                </p>
              </div>
            </section>

            <section className="flex-1 px-6 pb-16">
              <div className="max-w-3xl mx-auto space-y-4">
                {/* 排球 */}
                <button
                  onClick={() => setSportType("volleyball")}
                  className={cn(
                    "w-full group relative p-6 border text-left transition-sharp",
                    sportType === "volleyball"
                      ? "border-[var(--accent)] bg-[var(--accent)]/5"
                      : "border-[var(--line-default)] bg-transparent hover:border-[var(--line-strong)]"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "w-12 h-12 flex items-center justify-center border transition-sharp",
                      sportType === "volleyball"
                        ? "border-[var(--accent)] text-[var(--accent)]"
                        : "border-[var(--line-strong)] text-[var(--text-muted)]"
                    )}>
                      <BarChart3 className="w-6 h-6" />
                    </div>
                    
                    <div className="flex-1">
                      <div className={cn(
                        "text-xl font-bold tracking-wide transition-sharp",
                        sportType === "volleyball"
                          ? "text-[var(--accent)]"
                          : "text-[var(--text-primary)]"
                      )}>
                        排球分析
                      </div>
                      <div className="text-sm text-[var(--text-muted)] mt-2">
                        比赛表现分析报告
                      </div>
                      <ul className="mt-3 space-y-1 text-sm text-[var(--text-secondary)]">
                        <li>• 四维评分系统（得分/失误/稳定/关键分）</li>
                        <li>• 位置感知评分</li>
                        <li>• 优势、问题与训练建议</li>
                      </ul>
                    </div>
                    
                    <ChevronRight className={cn(
                      "w-5 h-5 mt-2 transition-sharp",
                      sportType === "volleyball"
                        ? "text-[var(--accent)] translate-x-1"
                        : "text-[var(--text-muted)]"
                    )} />
                  </div>
                </button>

                {/* 跑步 */}
                <button
                  onClick={() => setSportType("running")}
                  className={cn(
                    "w-full group relative p-6 border text-left transition-sharp",
                    sportType === "running"
                      ? "border-[var(--accent)] bg-[var(--accent)]/5"
                      : "border-[var(--line-default)] bg-transparent hover:border-[var(--line-strong)]"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "w-12 h-12 flex items-center justify-center border transition-sharp",
                      sportType === "running"
                        ? "border-[var(--accent)] text-[var(--accent)]"
                        : "border-[var(--line-strong)] text-[var(--text-muted)]"
                    )}>
                      <Activity className="w-6 h-6" />
                    </div>
                    
                    <div className="flex-1">
                      <div className={cn(
                        "text-xl font-bold tracking-wide transition-sharp",
                        sportType === "running"
                          ? "text-[var(--accent)]"
                          : "text-[var(--text-primary)]"
                      )}>
                        跑步训练
                      </div>
                      <div className="text-sm text-[var(--text-muted)] mt-2">
                        训练质量分析与周复盘
                      </div>
                      <ul className="mt-3 space-y-1 text-sm text-[var(--text-secondary)]">
                        <li>• 四维评分（完成度/节奏/负荷/价值）</li>
                        <li>• 训练偏差识别（轻松跑灰区/节奏跑崩盘等）</li>
                        <li>• 周训练块管理与疲劳风险评估</li>
                      </ul>
                    </div>
                    
                    <ChevronRight className={cn(
                      "w-5 h-5 mt-2 transition-sharp",
                      sportType === "running"
                        ? "text-[var(--accent)] translate-x-1"
                        : "text-[var(--text-muted)]"
                    )} />
                  </div>
                </button>

                <button
                  onClick={() => setSportType("gym")}
                  className={cn(
                    "w-full group relative p-6 border text-left transition-sharp",
                    sportType === "gym"
                      ? "border-[var(--accent)] bg-[var(--accent)]/5"
                      : "border-[var(--line-default)] bg-transparent hover:border-[var(--line-strong)]"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "w-12 h-12 flex items-center justify-center border transition-sharp",
                      sportType === "gym"
                        ? "border-[var(--accent)] text-[var(--accent)]"
                        : "border-[var(--line-strong)] text-[var(--text-muted)]"
                    )}>
                      <Zap className="w-6 h-6" />
                    </div>

                    <div className="flex-1">
                      <div className={cn(
                        "text-xl font-bold tracking-wide transition-sharp",
                        sportType === "gym"
                          ? "text-[var(--accent)]"
                          : "text-[var(--text-primary)]"
                      )}>
                        健身训练
                      </div>
                      <div className="text-sm text-[var(--text-muted)] mt-2">
                        训练质量诊断与结构失衡识别
                      </div>
                      <ul className="mt-3 space-y-1 text-sm text-[var(--text-secondary)]">
                        <li>鈥?四维评分：完成度 / 刺激质量 / 负荷合理性 / 目标匹配度</li>
                        <li>鈥?偏差诊断：主项缺失 / 推拉失衡 / 有效组不足 / 疲劳风险</li>
                        <li>鈥?周训练块与中周期复盘</li>
                      </ul>
                    </div>

                    <ChevronRight className={cn(
                      "w-5 h-5 mt-2 transition-sharp",
                      sportType === "gym"
                        ? "text-[var(--accent)] translate-x-1"
                        : "text-[var(--text-muted)]"
                    )} />
                  </div>
                </button>

                {/* 继续按钮 */}
                <div className="mt-8">
                  <button
                    onClick={handleContinue}
                    className="w-full py-4 bg-[var(--accent)] text-[var(--bg-primary)] font-bold tracking-wider uppercase hover:opacity-90 transition-sharp"
                  >
                    继续
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* 步骤 2：选择运动员 */}
        {step === "select-athlete" && (
          <div className="min-h-[calc(100vh-56px)] flex flex-col">
            <section className="pt-16 pb-8 px-6">
              <div className="max-w-3xl mx-auto">
                <div className="editorial-title mb-4">步骤 2 / 3</div>
                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-[var(--text-primary)] mb-4">
                  选择运动员
                </h1>
                <p className="text-[var(--text-secondary)] text-lg">
                  为哪位运动员记录这次表现？
                </p>
              </div>
            </section>

            <section className="flex-1 px-6 pb-16">
              <div className="max-w-3xl mx-auto space-y-4">
                {/* 运动员列表 */}
                {athletes.map((athlete) => (
                  <button
                    key={athlete.id}
                    onClick={() => handleSelectAthlete(athlete)}
                    className={cn(
                      "w-full group relative p-6 border text-left transition-sharp",
                      selectedAthlete?.id === athlete.id
                        ? "border-[var(--accent)] bg-[var(--accent)]/5"
                        : "border-[var(--line-default)] bg-transparent hover:border-[var(--line-strong)]"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-2 h-2 rounded-full transition-sharp",
                          selectedAthlete?.id === athlete.id
                            ? "bg-[var(--accent)] shadow-[0_0_10px_var(--accent)]"
                            : "bg-[var(--line-strong)]"
                        )} />
                        
                        <div>
                          <div className={cn(
                            "text-xl font-bold tracking-wide transition-sharp",
                            selectedAthlete?.id === athlete.id
                              ? "text-[var(--accent)]"
                              : "text-[var(--text-primary)]"
                          )}>
                            {athlete.name}
                          </div>
                          <div className="text-sm text-[var(--text-muted)] mt-1">
                            {athlete.position}
                            {athlete.team && ` // ${athlete.team}`}
                          </div>
                        </div>
                      </div>
                      
                      <ChevronRight className={cn(
                        "w-5 h-5 transition-sharp",
                        selectedAthlete?.id === athlete.id
                          ? "text-[var(--accent)] translate-x-1"
                          : "text-[var(--text-muted)]"
                      )} />
                    </div>
                  </button>
                ))}

                {/* 新建运动员 */}
                {!isCreatingAthlete ? (
                  <button
                    onClick={() => setIsCreatingAthlete(true)}
                    className="w-full p-6 border border-dashed border-[var(--line-strong)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-sharp flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    <span>新建运动员档案</span>
                  </button>
                ) : (
                  <div className="p-6 border border-[var(--accent)] bg-[var(--accent)]/5 space-y-4">
                    <div className="text-sm font-medium text-[var(--accent)] mb-4">
                      新建运动员
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-muted)] block mb-2">
                          姓名 *
                        </label>
                        <input
                          type="text"
                          value={newAthleteForm.name}
                          onChange={(e) => setNewAthleteForm({ ...newAthleteForm, name: e.target.value })}
                          className="w-full bg-[var(--bg-secondary)] border border-[var(--line-default)] p-3 text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                          placeholder="输入姓名"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-muted)] block mb-2">
                          位置
                        </label>
                        <select
                          value={newAthleteForm.position}
                          onChange={(e) => setNewAthleteForm({ ...newAthleteForm, position: e.target.value as any })}
                          className="w-full bg-[var(--bg-secondary)] border border-[var(--line-default)] p-3 text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                        >
                          <option value="主攻">主攻</option>
                          <option value="副攻">副攻</option>
                          <option value="二传">二传</option>
                          <option value="接应">接应</option>
                          <option value="自由人">自由人</option>
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-muted)] block mb-2">
                        队伍/组别（可选）
                      </label>
                      <input
                        type="text"
                        value={newAthleteForm.team}
                        onChange={(e) => setNewAthleteForm({ ...newAthleteForm, team: e.target.value })}
                        className="w-full bg-[var(--bg-secondary)] border border-[var(--line-default)] p-3 text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                        placeholder="例如：校队、经管学院"
                      />
                    </div>
                    
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => setIsCreatingAthlete(false)}
                        className="flex-1 py-3 border border-[var(--line-default)] text-[var(--text-secondary)] hover:border-[var(--line-strong)] transition-sharp"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleCreateAthlete}
                        disabled={!newAthleteForm.name.trim()}
                        className="flex-1 py-3 bg-[var(--accent)] text-[var(--bg-primary)] font-bold disabled:opacity-40 transition-sharp"
                      >
                        创建
                      </button>
                    </div>
                  </div>
                )}

                {/* 继续按钮 */}
                <div className="mt-8">
                  <button
                    onClick={handleContinue}
                    disabled={!selectedAthlete}
                    className="w-full py-4 bg-[var(--accent)] text-[var(--bg-primary)] font-bold tracking-wider uppercase hover:opacity-90 transition-sharp disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    继续
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* 步骤 3：选择录入模式 */}
        {step === "select-mode" && (
          <div className="min-h-[calc(100vh-56px)] flex flex-col">
            <section className="pt-16 pb-8 px-6">
              <div className="max-w-3xl mx-auto">
                <div className="editorial-title mb-4">步骤 3 / 3</div>
                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-[var(--text-primary)] mb-4">
                  选择录入模式
                </h1>
                <p className="text-[var(--text-secondary)] text-lg">
                  根据你的数据完整程度选择合适的方式
                </p>
              </div>
            </section>

            <section className="flex-1 px-6 pb-16">
              <div className="max-w-3xl mx-auto space-y-4">
                {/* 快速模式 */}
                <button
                  onClick={() => {
                    setInputMode("quick")
                    handleContinue()
                  }}
                  className={cn(
                    "w-full group relative p-6 border text-left transition-sharp",
                    inputMode === "quick"
                      ? "border-[var(--accent)] bg-[var(--accent)]/5"
                      : "border-[var(--line-default)] bg-transparent hover:border-[var(--line-strong)]"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "w-12 h-12 flex items-center justify-center border transition-sharp",
                      inputMode === "quick"
                        ? "border-[var(--accent)] text-[var(--accent)]"
                        : "border-[var(--line-strong)] text-[var(--text-muted)]"
                    )}>
                      <Zap className="w-6 h-6" />
                    </div>
                    
                    <div className="flex-1">
                      <div className={cn(
                        "text-xl font-bold tracking-wide transition-sharp",
                        inputMode === "quick"
                          ? "text-[var(--accent)]"
                          : "text-[var(--text-primary)]"
                      )}>
                        快速模式
                      </div>
                      <div className="text-sm text-[var(--text-muted)] mt-2">
                        适合赛后立即填写，2分钟完成
                      </div>
                      <ul className="mt-3 space-y-1 text-sm text-[var(--text-secondary)]">
                        <li>• 简化评估选项代替精确数字</li>
                        <li>• 只需填写核心表现</li>
                        <li>• 支持主观判断</li>
                      </ul>
                    </div>
                    
                    <ChevronRight className={cn(
                      "w-5 h-5 mt-2 transition-sharp",
                      inputMode === "quick"
                        ? "text-[var(--accent)] translate-x-1"
                        : "text-[var(--text-muted)]"
                    )} />
                  </div>
                </button>

                {/* 专业模式 */}
                <button
                  onClick={() => {
                    setInputMode("professional")
                    handleContinue()
                  }}
                  className={cn(
                    "w-full group relative p-6 border text-left transition-sharp",
                    inputMode === "professional"
                      ? "border-[var(--accent)] bg-[var(--accent)]/5"
                      : "border-[var(--line-default)] bg-transparent hover:border-[var(--line-strong)]"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "w-12 h-12 flex items-center justify-center border transition-sharp",
                      inputMode === "professional"
                        ? "border-[var(--accent)] text-[var(--accent)]"
                        : "border-[var(--line-strong)] text-[var(--text-muted)]"
                    )}>
                      <BarChart3 className="w-6 h-6" />
                    </div>
                    
                    <div className="flex-1">
                      <div className={cn(
                        "text-xl font-bold tracking-wide transition-sharp",
                        inputMode === "professional"
                          ? "text-[var(--accent)]"
                          : "text-[var(--text-primary)]"
                      )}>
                        专业模式
                      </div>
                      <div className="text-sm text-[var(--text-muted)] mt-2">
                        适合有完整技术统计的情况
                      </div>
                      <ul className="mt-3 space-y-1 text-sm text-[var(--text-secondary)]">
                        <li>• 填写完整技术数据</li>
                        <li>• 支持精确百分比输入</li>
                        <li>• 更详细的维度分析</li>
                      </ul>
                    </div>
                    
                    <ChevronRight className={cn(
                      "w-5 h-5 mt-2 transition-sharp",
                      inputMode === "professional"
                        ? "text-[var(--accent)] translate-x-1"
                        : "text-[var(--text-muted)]"
                    )} />
                  </div>
                </button>

                {/* 对比表 */}
                <div className="mt-8 p-6 border border-[var(--line-default)]">
                  <div className="text-sm font-medium text-[var(--text-primary)] mb-4">模式对比</div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-[var(--text-muted)]"></div>
                    <div className="text-[var(--accent)] font-medium">快速模式</div>
                    <div className="text-[var(--text-primary)] font-medium">专业模式</div>
                    
                    <div className="text-[var(--text-muted)]">填写时间</div>
                    <div className="text-[var(--text-secondary)]">2分钟</div>
                    <div className="text-[var(--text-secondary)]">5-8分钟</div>
                    
                    <div className="text-[var(--text-muted)]">数据要求</div>
                    <div className="text-[var(--text-secondary)]">记忆/主观</div>
                    <div className="text-[var(--text-secondary)]">精确统计</div>
                    
                    <div className="text-[var(--text-muted)]">报告可信度</div>
                    <div className="text-[var(--text-secondary)]">中</div>
                    <div className="text-[var(--text-secondary)]">高</div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* 步骤 3：录入数据 */}
        {step === "input-data" && selectedAthlete && (
          <div className="min-h-[calc(100vh-56px)]">
            {/* 进度头部 */}
            <div className="fixed top-14 left-0 right-0 z-40 bg-[var(--bg-primary)]/80 backdrop-blur-sm border-b border-[var(--line-default)]">
              <div className="max-w-7xl mx-auto px-6 h-12 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleBack}
                    className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-sharp"
                  >
                    上一步
                  </button>
                  <span className="text-[var(--line-strong)]">|</span>
                  <span className="text-[10px] tracking-[0.2em] text-[var(--text-muted)] uppercase">
                    录入数据
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-[var(--accent)]" />
                  <span className="text-sm text-[var(--text-primary)]">{selectedAthlete.name}</span>
                  <span className="text-[var(--line-strong)]">|</span>
                  <span className="text-[10px] tracking-wider text-[var(--text-muted)] uppercase">
                    {inputMode === "quick" ? "快速模式" : "专业模式"}
                  </span>
                </div>
              </div>
            </div>

            {/* 表单内容 */}
            <div className="pt-28 pb-16 px-6">
              <div className="max-w-4xl mx-auto">
                {inputMode === "quick" ? (
                  <QuickModeForm athlete={selectedAthlete} />
                ) : (
                  <ProfessionalModeForm athlete={selectedAthlete} />
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
