"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth-context"

export default function RegisterPage() {
  const router = useRouter()
  const { signUp, isAuthenticated } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // 已登录则重定向
  if (isAuthenticated) {
    router.push("/")
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // 验证密码
    if (password.length < 6) {
      setError("密码至少需要6位")
      setIsLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致")
      setIsLoading(false)
      return
    }

    const result = await signUp(email, password)

    if (result.success) {
      setSuccess(true)
    } else {
      setError(result.error || "注册失败")
    }

    setIsLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">注册成功</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <span className="text-2xl">✓</span>
            </div>
            <p className="text-[var(--text-secondary)] mb-6">
              请查看您的邮箱完成验证，然后登录。
            </p>
            <Button onClick={() => router.push("/auth/login")} className="w-full">
              去登录
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">注册</CardTitle>
          <p className="text-sm text-[var(--text-muted)] mt-2">
            创建新账户开始使用
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
              <p className="text-xs text-[var(--text-muted)]">
                密码至少需要6位
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认密码</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              {isLoading ? "注册中..." : "注册"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-[var(--text-muted)]">
            已有账户？{" "}
            <Link 
              href="/auth/login" 
              className="text-[var(--accent)] hover:underline"
            >
              立即登录
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
