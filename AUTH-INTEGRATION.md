# Running Score v1.0 - 用户认证集成文档

## 概述

Running Score v1.0 已集成完整的用户认证系统，基于 Supabase Auth 实现。

## 认证架构

```
┌─────────────────┐
│   AuthProvider  │  React Context Provider
│   (contexts/)   │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐  ┌──▼────┐
│useAuth│  │Require│  React Hooks
│  Hook │  │ Auth  │
└───┬───┘  └──┬────┘
    │         │
    └────┬────┘
         │
┌────────▼────────┐
│  Supabase Auth  │  认证服务
│  (lib/supabase) │
└─────────────────┘
```

## 核心组件

### 1. Supabase 客户端 (`lib/supabase-client.ts`)

统一配置 Supabase 客户端，包含认证和数据库操作：

```typescript
import { supabase, getCurrentUser, signInWithEmail, signUpWithEmail, signOut } from "@/lib/supabase-client"
```

### 2. Auth Context (`contexts/auth-context.tsx`)

提供全局认证状态：

```typescript
const { user, isAuthenticated, isLoading, signIn, signUp, logout } = useAuth()
```

### 3. 使用方式

在组件中使用认证：

```typescript
import { useAuth } from "@/contexts/auth-context"

function MyComponent() {
  const { user, isAuthenticated } = useAuth()
  
  if (!isAuthenticated) {
    return <div>请先登录</div>
  }
  
  return <div>欢迎, {user.email}</div>
}
```

## 页面保护

### 方式1：使用 useRequireAuth Hook

```typescript
import { useRequireAuth } from "@/contexts/auth-context"

function ProtectedPage() {
  const { user, isLoading } = useRequireAuth("/auth/login")
  
  if (isLoading) return <div>加载中...</div>
  
  return <div>受保护的内容</div>
}
```

### 方式2：条件渲染

```typescript
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"

function MyPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login")
    }
  }, [isAuthenticated])
  
  // ...
}
```

## 跑步模块集成

### 保存训练记录时的认证流程

```typescript
// app/analysis/new/running/page.tsx
const { user, isAuthenticated } = useAuth()

const handleSave = async () => {
  // 1. 检查登录状态
  if (!isAuthenticated || !user) {
    router.push("/auth/login")
    return
  }
  
  // 2. 获取或创建运动员档案
  const athleteResult = await getOrCreateDefaultAthlete(user.id, user.email)
  if (!athleteResult.success) {
    // 处理错误
    return
  }
  
  // 3. 保存训练记录（使用真实用户ID）
  await saveRunningSession(user.id, athleteResult.athleteId, input, report)
}
```

### 运动员档案管理

单用户模式下，系统会自动为用户创建默认运动员档案：

```typescript
import { getOrCreateDefaultAthlete } from "@/lib/scoring/running/athletes"

// 自动创建或获取现有档案
const result = await getOrCreateDefaultAthlete(user.id, user.email)
// 返回: { success: true, athleteId: "uuid" }
```

## 页面路由

| 路由 | 说明 | 访问权限 |
|------|------|----------|
| `/auth/login` | 登录页面 | 公开 |
| `/auth/register` | 注册页面 | 公开 |
| `/` | 首页 | 公开（部分功能需登录）|
| `/running` | 跑步首页 | 公开（保存需登录）|
| `/analysis/new/running` | 单次分析 | 公开（保存需登录）|
| `/analysis/new/running/import` | 文件导入 | 公开（保存需登录）|
| `/analysis/running/weekly` | 周复盘 | 建议登录 |

## 数据结构

### 用户类型

```typescript
interface User {
  id: string
  email: string
  displayName?: string
  avatarUrl?: string
}
```

### 运动员档案

```typescript
interface RunnerProfile {
  id: string
  user_id: string        // 关联到 auth.users
  name: string
  gender?: "male" | "female" | "other"
  birth_date?: string
  height_cm?: number
  weight_kg?: number
  max_heart_rate?: number
  resting_heart_rate?: number
  primary_goal?: string
  experience_level?: string
  notes?: string
}
```

## 安全说明

### RLS 策略

所有数据表都启用了 Row Level Security：

- 用户只能访问自己的 `profiles` 记录
- 用户只能访问自己的 `athletes` 记录
- 用户只能访问自己运动员的 `analysis_sessions` 记录
- 写入操作会验证 `user_id` 匹配

### 敏感操作验证

保存训练记录时的安全验证：

1. 前端检查 `isAuthenticated`
2. 后端 RLS 检查 `user_id`
3. 数据库外键约束确保数据一致性

## 测试账号

开发测试时可使用以下方式：

```typescript
// 注册新账号
const result = await signUp("test@example.com", "password123")

// 或使用现有账号登录
const result = await signIn("test@example.com", "password123")
```

## 后续优化

- [ ] 支持多运动员档案切换
- [ ] 添加社交登录（Google、Apple）
- [ ] 实现密码重置功能
- [ ] 添加邮箱验证
- [ ] 支持运动员档案详细信息编辑
