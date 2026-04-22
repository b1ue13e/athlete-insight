import type { Metadata, Viewport } from "next"
import "./globals.css"
import { PWAProvider } from "@/components/pwa/pwa-provider"
import { AuthProvider } from "@/contexts/auth-context"

export const metadata: Metadata = {
  title: "Athlete Insight - 训练诊断工作台",
  description: "把训练与比赛数据转成结构化诊断，帮助你更快看到偏差、证据和下一步动作。",
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
  themeColor: "#d6ff72",
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
