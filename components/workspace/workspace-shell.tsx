"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Activity,
  ChevronRight,
  Dumbbell,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings2,
  UserPlus,
  Users,
  Trophy,
  X,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"

const primaryNavigation = [
  { href: "/", label: "工作台", icon: LayoutDashboard },
  { href: "/analysis/new", label: "新建诊断", icon: UserPlus },
  { href: "/athletes", label: "运动员", icon: Users },
  { href: "/history", label: "历史记录", icon: History },
  { href: "/settings", label: "设置", icon: Settings2 },
] as const

const quickNavigation = [
  { href: "/analysis/new/running", label: "跑步诊断", icon: Activity },
  { href: "/analysis/new/gym", label: "健身诊断", icon: Dumbbell },
  { href: "/analysis/new", label: "排球诊断", icon: Trophy },
] as const

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/"
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

function SidebarLink({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
}: {
  href: string
  label: string
  icon: typeof Activity
  active: boolean
  onNavigate?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "group flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm font-medium transition-sharp",
        active
          ? "border-[var(--line-strong)] bg-[var(--bg-tertiary)] text-[var(--accent)]"
          : "border-transparent text-[var(--text-secondary)] hover:border-[var(--line-default)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
      <ChevronRight
        className={cn(
          "ml-auto h-4 w-4 transition-sharp",
          active ? "text-[var(--accent)]" : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"
        )}
      />
    </Link>
  )
}

function SidebarContent({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const { user, isAuthenticated, logout } = useAuth()

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--line-default)] px-4 py-5">
        <Link href="/" onClick={onNavigate} className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--line-strong)] bg-[var(--bg-tertiary)] text-[var(--accent)]">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-secondary)]">
              Athlete Insight
            </div>
            <div className="text-base font-semibold text-[var(--text-primary)]">训练诊断工作台</div>
          </div>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1.5">
          {primaryNavigation.map((item) => (
            <SidebarLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={isActivePath(pathname, item.href)}
              onNavigate={onNavigate}
            />
          ))}
        </div>

        <div className="mt-6 border-t border-[var(--line-default)] pt-5">
          <div className="px-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">
            快速诊断
          </div>
          <div className="mt-3 space-y-1.5">
            {quickNavigation.map((item) => (
              <SidebarLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={isActivePath(pathname, item.href)}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--line-default)] px-4 py-4">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
          <span className={cn("h-2 w-2 rounded-full", isAuthenticated ? "bg-[var(--accent)]" : "bg-[var(--text-muted)]")} />
          {isAuthenticated ? "账号在线" : "本地模式"}
        </div>
        <div className="mt-2 text-sm text-[var(--text-secondary)]">
          {user?.displayName || user?.email || "未登录，可本地保存"}
        </div>

        {isAuthenticated ? (
          <button
            type="button"
            onClick={() => {
              void logout()
              onNavigate?.()
            }}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--line-default)] bg-[var(--bg-secondary)] px-4 py-3 text-sm font-medium text-[var(--text-secondary)] transition-sharp hover:border-[var(--line-strong)] hover:text-[var(--text-primary)]"
          >
            <LogOut className="h-4 w-4" />
            退出登录
          </button>
        ) : (
          <Link href="/auth/login" onClick={onNavigate} className="action-secondary mt-4 w-full text-sm">
            登录并同步
          </Link>
        )}
      </div>
    </div>
  )
}

export function WorkspaceShell({
  title,
  subtitle,
  eyebrow = "Training diagnosis workspace",
  actions,
  children,
}: {
  title: string
  subtitle?: string
  eyebrow?: string
  actions?: ReactNode
  children: ReactNode
}) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="lg:grid lg:min-h-screen lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="hidden border-r border-[var(--line-default)] bg-[var(--bg-secondary)] lg:flex lg:min-h-screen lg:flex-col">
          <SidebarContent pathname={pathname} />
        </aside>

        {mobileOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="关闭导航"
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-black/70"
            />
            <aside className="relative z-10 h-full w-[min(92vw,320px)] border-r border-[var(--line-default)] bg-[var(--bg-secondary)]">
              <div className="flex items-center justify-between border-b border-[var(--line-default)] px-4 py-4">
                <div className="text-sm font-semibold text-[var(--text-primary)]">导航</div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--line-default)] text-[var(--text-secondary)] transition-sharp hover:text-[var(--text-primary)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <SidebarContent pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            </aside>
          </div>
        ) : null}

        <div className="min-w-0">
          <header className="sticky top-0 z-40 border-b border-[var(--line-default)] bg-[color-mix(in_oklch,var(--bg-primary)_92%,transparent)] backdrop-blur-xl">
            <div className="flex min-h-16 items-center gap-3 px-4 py-3 lg:px-6">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--line-default)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-sharp hover:text-[var(--text-primary)] lg:hidden"
              >
                <Menu className="h-4 w-4" />
              </button>

              <div className="min-w-0 flex-1">
                <div className="truncate text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
                  {eyebrow}
                </div>
                <div className="truncate text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">{title}</div>
                {subtitle ? <div className="truncate text-xs text-[var(--text-secondary)]">{subtitle}</div> : null}
              </div>

              {actions ? <div className="hidden items-center gap-3 md:flex">{actions}</div> : null}
            </div>

            {actions ? <div className="flex flex-wrap gap-3 border-t border-[var(--line-default)] px-4 py-3 md:hidden">{actions}</div> : null}
          </header>

          <main className="px-4 py-4 lg:px-6 lg:py-6">{children}</main>
        </div>
      </div>
    </div>
  )
}
