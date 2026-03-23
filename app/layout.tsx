import type { Metadata, Viewport } from "next"
import "./globals.css"
import { PWAProvider } from "@/components/pwa/pwa-provider"

// 使用系统字体栈，避免 Google Fonts 加载问题
const fontStack = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif'

export const metadata: Metadata = {
  title: "Athlete Insight - AI 运动表现分析",
  description: "输入比赛或训练数据，自动生成结构化运动表现分析报告。看清你的优势、短板和下一步训练方向。",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Athlete Insight",
  },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
  },
}

export const viewport: Viewport = {
  themeColor: "#CCFF00",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="font-sans antialiased" style={{ fontFamily: fontStack }}>
        <PWAProvider>
          {children}
        </PWAProvider>
      </body>
    </html>
  )
}
