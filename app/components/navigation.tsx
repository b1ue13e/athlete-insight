"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3 } from "lucide-react"

export function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-primary)]/80 backdrop-blur-sm border-b border-[var(--line-default)]">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-[var(--accent)]" />
          <span className="font-bold tracking-tight text-[var(--text-primary)]">
            ATHLETE INSIGHT
          </span>
        </Link>
        
        <div className="flex items-center gap-8">
          <Link 
            href="/history" 
            className={`text-sm tracking-wide transition-sharp ${
              pathname === "/history" 
                ? "text-[var(--accent)]" 
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            历史记录
          </Link>
          <Link 
            href="/profile"
            className={`text-sm tracking-wide transition-sharp ${
              pathname === "/profile" 
                ? "text-[var(--accent)]" 
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            档案
          </Link>
          <Link 
            href="/analysis/new"
            className="px-4 py-2 bg-[var(--accent)] text-[var(--bg-primary)] text-sm font-bold tracking-wider hover:opacity-90 transition-sharp"
          >
            分析
          </Link>
        </div>
      </div>
    </nav>
  )
}
