"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"

export default function LoginPage() {
  const router = useRouter()
  const { signIn, isAuthenticated } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 已登录则重定向
  if (isAuthenticated) {
    router.push("/")
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const result = await signIn(email, password)

    if (result.success) {
      router.push("/")
    } else {
      setError(result.error || "登录失败")
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">登录</CardTitle>
          <p className="text-sm text-[var(--text-muted)] mt-2">
            使用邮箱和密码登录您的账户
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-sm text-red-600">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "登录中..." : "登录"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-[var(--text-muted)]">
            还没有账户？{" "}
            <Link 
              href="/auth/register" 
              className="text-[var(--accent)] hover:underline"
            >
              立即注册
            </Link>
          </div>

          <div className="mt-4 text-center">
            <Link 
              href="/" 
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              ← 返回首页
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
