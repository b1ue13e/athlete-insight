"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { 
  User, 
  getCurrentUser, 
  onAuthStateChange, 
  signInWithEmail, 
  signUpWithEmail, 
  signOut,
  AuthResponse 
} from "@/lib/supabase-client"

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<AuthResponse>
  signUp: (email: string, password: string) => Promise<AuthResponse>
  logout: () => Promise<{ success: boolean; error?: string }>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 初始化：获取当前用户
  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentUser = await getCurrentUser()
        setUser(currentUser)
      } catch (error) {
        console.error("Auth initialization error:", error)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  // 监听认证状态变化
  useEffect(() => {
    const subscription = onAuthStateChange((user) => {
      setUser(user)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const response = await signInWithEmail(email, password)
    if (response.success && response.user) {
      setUser(response.user)
    }
    return response
  }

  const signUp = async (email: string, password: string) => {
    const response = await signUpWithEmail(email, password)
    if (response.success && response.user) {
      setUser(response.user)
    }
    return response
  }

  const logout = async () => {
    const result = await signOut()
    if (result.success) {
      setUser(null)
    }
    return result
  }

  const refreshUser = async () => {
    const currentUser = await getCurrentUser()
    setUser(currentUser)
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    logout,
    refreshUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

// 便捷 hook：需要登录才能访问
export function useRequireAuth(redirectTo: string = "/auth/login") {
  const { user, isLoading, isAuthenticated } = useAuth()
  const router = require("next/navigation").useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(redirectTo)
    }
  }, [isLoading, isAuthenticated, router, redirectTo])

  return { user, isLoading, isAuthenticated }
}
