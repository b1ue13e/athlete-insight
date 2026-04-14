import type { Metadata, Viewport } from "next"
import "./globals.css"
import { PWAProvider } from "@/components/pwa/pwa-provider"
import { AuthProvider } from "@/contexts/auth-context"

export const metadata: Metadata = {
  title: "Athlete Insight - AI 运动表现分析",
  description: "输入比赛或训练数据，自动生成结构化运动表现分析报告，帮助你看清优势、问题和下一步训练方向。",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Athlete Insight",
  },
  icons: {
    icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
  },
}

export const viewport: Viewport = {
  themeColor: "#c8ff2c",
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
      <body className="antialiased">
        <AuthProvider>
          <PWAProvider>{children}</PWAProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
