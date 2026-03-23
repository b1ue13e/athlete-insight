"use client"

import Link from "next/link"
import { WifiOff, RefreshCw, ArrowLeft } from "lucide-react"

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center px-6">
      <div className="text-center space-y-6 max-w-md">
        {/* 图标 */}
        <div className="w-20 h-20 mx-auto border-2 border-[var(--accent)] flex items-center justify-center">
          <WifiOff className="w-10 h-10 text-[var(--accent)]" />
        </div>
        
        {/* 标题 */}
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          当前处于离线状态
        </h1>
        
        {/* 说明 */}
        <p className="text-[var(--text-secondary)]">
          别担心，你之前访问的页面已缓存，可以正常使用。
          新数据会在网络恢复后自动同步。
        </p>
        
        {/* 快捷操作 */}
        <div className="space-y-3 pt-4">
          <Link
            href="/analysis/new/mobile"
            className="block w-full py-4 bg-[var(--accent)] text-[var(--bg-primary)] font-bold"
          >
            继续录入（离线可用）
          </Link>
          
          <button
            onClick={() => window.location.reload()}
            className="block w-full py-4 border border-[var(--line-default)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            检查网络连接
          </button>
          
          <Link
            href="/"
            className="block w-full py-4 text-[var(--text-muted)] flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            返回首页
          </Link>
        </div>
        
        {/* 提示 */}
        <p className="text-xs text-[var(--text-muted)] pt-4">
          提示：场边录入时若网络不稳定，数据会自动保存在本地，稍后同步。
        </p>
      </div>
    </div>
  )
}
