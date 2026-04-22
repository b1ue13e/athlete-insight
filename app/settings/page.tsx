"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Cloud, Download, HardDrive, ShieldCheck, Smartphone, UserCircle2, Zap, type LucideIcon } from "lucide-react"
import { WorkspaceShell } from "@/components/workspace/workspace-shell"
import { InstallButton } from "@/components/pwa/install-prompt"
import { useAuth } from "@/contexts/auth-context"
import { getAthletes } from "@/lib/athletes"
import { getAllDiagnosisRecords } from "@/lib/analysis/store"
import { cn } from "@/lib/utils"

const hasSupabaseConfig =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "your_supabase_project_url" &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "your_supabase_anon_key"

export default function SettingsPage() {
  const { user, isAuthenticated, logout } = useAuth()
  const [athleteCount, setAthleteCount] = useState(0)
  const [diagnosisCount, setDiagnosisCount] = useState(0)

  useEffect(() => {
    setAthleteCount(getAthletes().length)
    setDiagnosisCount(getAllDiagnosisRecords().length)
  }, [])

  const modeLabel = useMemo(() => {
    if (isAuthenticated && hasSupabaseConfig) return "云同步已启用"
    if (isAuthenticated) return "已登录，当前仍以本地为主"
    return "本地优先模式"
  }, [isAuthenticated])

  const exportSnapshot = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      user: user?.email ?? null,
      athletes: getAthletes(),
      diagnoses: getAllDiagnosisRecords(),
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `athlete-insight-snapshot-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <WorkspaceShell
      title="设置与环境"
      subtitle={modeLabel}
      eyebrow="Workspace settings"
      actions={
        <button type="button" onClick={exportSnapshot} className="action-primary text-sm">
          <Download className="h-4 w-4" />
          导出快照
        </button>
      }
    >
      <div className="space-y-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="运行模式" value={isAuthenticated ? "在线" : "本地"} note={modeLabel} icon={Cloud} accent={isAuthenticated} />
          <MetricCard label="运动员" value={String(athleteCount)} note="当前设备档案数量" icon={UserCircle2} />
          <MetricCard label="诊断记录" value={String(diagnosisCount)} note="可导出的本地样本" icon={ShieldCheck} />
          <MetricCard label="PWA" value="Ready" note="支持安装到主屏与离线录入" icon={Smartphone} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            <SurfaceCard>
              <SectionHeader title="账号与同步" description="登录后会优先尝试使用云端同步，但依然保留本地缓存作为离线兜底。" />
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <InfoBlock title="当前账号" value={user?.displayName || user?.email || "未登录"} description={isAuthenticated ? "当前设备已经识别到登录态。" : "未登录时，依然可以本地创建诊断与档案。"} />
                <InfoBlock title="同步配置" value={hasSupabaseConfig ? "Supabase 已配置" : "未检测到云同步环境变量"} description={hasSupabaseConfig ? "登录后可以把运动员和诊断同步到云端。" : "如需跨设备同步，请补齐 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY。"} />
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                {isAuthenticated ? (
                  <button type="button" onClick={() => void logout()} className="action-secondary text-sm">
                    退出登录
                  </button>
                ) : (
                  <Link href="/auth/login" className="action-primary text-sm">
                    登录账号
                  </Link>
                )}
                <Link href="/analysis/new" className="action-secondary text-sm">
                  新建诊断
                </Link>
              </div>
            </SurfaceCard>

            <SurfaceCard>
              <SectionHeader title="本地数据快照" description="导出当前设备上的本地运动员与诊断记录，方便自己做备份或迁移。" />
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <InfoBlock title="导出内容" value="运动员 + 诊断" description="会把当前浏览器缓存里的档案与诊断统一打包为 JSON。" />
                <InfoBlock title="导出建议" value="按阶段备份" description="当你完成一批训练周期复盘后，建议导出一份快照归档。" />
              </div>

              <button type="button" onClick={exportSnapshot} className="action-primary mt-5 text-sm">
                <Download className="h-4 w-4" />
                导出当前快照
              </button>
            </SurfaceCard>
          </div>

          <div className="space-y-4">
            <SurfaceCard>
              <SectionHeader title="安装与设备" description="把应用安装到桌面或手机主屏后，训练场边打开会更快。" />
              <div className="mt-5 rounded-[1rem] border border-[var(--line-default)] bg-[var(--bg-primary)] p-4">
                <div className="text-sm text-[var(--text-secondary)]">支持安装后离线录入、快速回看最近诊断，并减少每次重新打开的路径成本。</div>
                <div className="mt-4">
                  <InstallButton />
                </div>
              </div>
            </SurfaceCard>

            <SurfaceCard>
              <SectionHeader title="当前环境" description="帮助你确认当前工作台运行在哪种模式下。" />
              <div className="mt-5 space-y-3">
                <MiniMetric label="本地缓存" value="已启用" icon={HardDrive} />
                <MiniMetric label="云同步" value={hasSupabaseConfig ? "可用" : "未配置"} icon={Cloud} />
                <MiniMetric label="诊断闭环" value="工作台 / 历史 / 运动员" icon={Zap} />
              </div>
            </SurfaceCard>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  )
}

function SurfaceCard({ children }: { children: React.ReactNode }) {
  return <section className="rounded-[1.35rem] border border-[var(--line-default)] bg-[var(--bg-secondary)] p-5 lg:p-6">{children}</section>
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">Console</div>
      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
    </div>
  )
}

function MetricCard({
  label,
  value,
  note,
  icon: Icon,
  accent = false,
}: {
  label: string
  value: string
  note: string
  icon: LucideIcon
  accent?: boolean
}) {
  return (
    <div className="rounded-[1.2rem] border border-[var(--line-default)] bg-[var(--bg-secondary)] p-5">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className={cn("mt-5 text-5xl font-semibold tracking-[-0.06em]", accent ? "text-[var(--accent)]" : "text-[var(--text-primary)]")}>{value}</div>
      <div className="mt-2 text-sm text-[var(--text-secondary)]">{note}</div>
    </div>
  )
}

function InfoBlock({ title, value, description }: { title: string; value: string; description: string }) {
  return (
    <div className="rounded-[1rem] border border-[var(--line-default)] bg-[var(--bg-primary)] p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">{title}</div>
      <div className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{value}</div>
      <div className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</div>
    </div>
  )
}

function MiniMetric({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <div className="flex items-center justify-between rounded-[1rem] border border-[var(--line-default)] bg-[var(--bg-primary)] px-4 py-4">
      <div className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
        <Icon className="h-4 w-4 text-[var(--accent)]" />
        {label}
      </div>
      <div className="text-sm font-semibold text-[var(--text-secondary)]">{value}</div>
    </div>
  )
}
