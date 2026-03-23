"use client"

import { useState, useEffect } from "react"
import { usePWA } from "./pwa-provider"
import { Download, X, Smartphone } from "lucide-react"
import { cn } from "@/lib/utils"

export function InstallPrompt() {
  const { canInstall, isInstalled, install } = usePWA()
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // 检查本地存储是否已关闭
    const dismissed = localStorage.getItem("pwa_prompt_dismissed")
    if (dismissed) {
      const dismissedTime = parseInt(dismissed)
      // 3天内不再显示
      if (Date.now() - dismissedTime < 3 * 24 * 60 * 60 * 1000) {
        setIsDismissed(true)
        return
      }
    }

    // 延迟显示，避免用户刚打开就被打扰
    if (canInstall && !isInstalled) {
      const timer = setTimeout(() => {
        setIsVisible(true)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [canInstall, isInstalled])

  const handleDismiss = () => {
    setIsVisible(false)
    setIsDismissed(true)
    localStorage.setItem("pwa_prompt_dismissed", Date.now().toString())
  }

  const handleInstall = async () => {
    await install()
    setIsVisible(false)
  }

  if (!isVisible || isDismissed || isInstalled) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
      <div className="bg-[var(--bg-secondary)] border border-[var(--accent)] p-4 shadow-lg">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--accent)] flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-[var(--bg-primary)]" />
            </div>
            <div>
              <h3 className="font-bold text-[var(--text-primary)]">添加到主屏幕</h3>
              <p className="text-xs text-[var(--text-muted)]">
                像 App 一样使用，离线也能录入
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2 text-sm text-[var(--text-secondary)]">
          <p>✓ 场边快速录入，无需找网址</p>
          <p>✓ 离线自动保存，有网再同步</p>
          <p>✓ 一键查看历史报告</p>
        </div>

        <button
          onClick={handleInstall}
          className="w-full mt-4 py-3 bg-[var(--accent)] text-[var(--bg-primary)] font-bold flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          安装到手机
        </button>
      </div>
    </div>
  )
}

// 简化版安装按钮（用于设置页面）
export function InstallButton() {
  const { canInstall, isInstalled, install } = usePWA()

  if (isInstalled) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--accent)]">
        <span>✓</span>
        <span>已安装</span>
      </div>
    )
  }

  if (!canInstall) {
    return (
      <div className="text-sm text-[var(--text-muted)]">
        请在浏览器中打开以安装
      </div>
    )
  }

  return (
    <button
      onClick={install}
      className="px-4 py-2 bg-[var(--accent)] text-[var(--bg-primary)] font-bold text-sm flex items-center gap-2"
    >
      <Download className="w-4 h-4" />
      安装应用
    </button>
  )
}

// iOS Safari 专用提示（iOS 不支持自动安装）
export function IOSInstallHint() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // 检测 iOS Safari
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches

    if (isIOS && isSafari && !isStandalone) {
      const dismissed = localStorage.getItem("ios_prompt_dismissed")
      if (!dismissed) {
        setIsVisible(true)
      }
    }
  }, [])

  const handleDismiss = () => {
    setIsVisible(false)
    localStorage.setItem("ios_prompt_dismissed", "true")
  }

  if (!isVisible) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 bg-[var(--bg-secondary)] border border-[var(--accent)] p-4 shadow-lg">
      <div className="flex items-start justify-between">
        <div className="text-sm text-[var(--text-secondary)]">
          <p className="text-[var(--text-primary)] font-bold mb-2">
            iOS 用户：添加到主屏幕
          </p>
          <p>
            点击 Safari 底部的
            <span className="inline-block mx-1">⎋</span>
            分享按钮，然后选择"添加到主屏幕"
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 text-[var(--text-muted)]"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
