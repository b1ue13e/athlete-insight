"use client"

import { useRouter } from "next/navigation"
import { ArrowRight, ClipboardList, Dumbbell, Target } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const CAPABILITIES = [
  {
    icon: ClipboardList,
    title: "不是记流水账",
    description: "重点不在于今天练了几个动作，而在于关键动作和关键组有没有真正完成。",
  },
  {
    icon: Target,
    title: "判断有没有练到点上",
    description: "围绕增肌、力量、减脂、塑形和新手适应，直接判断训练是否服务当前目标。",
  },
  {
    icon: Dumbbell,
    title: "指出偏差并给出修正",
    description: "自动识别推拉失衡、主项缺失、有效组不足、疲劳风险过高等结构问题。",
  },
]

export default function GymHomePage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.08),_transparent_28%)] py-8">
      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-8 max-w-3xl">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-xs">Gym Score v1.0</Badge>
            <Badge variant="secondary" className="text-xs">健身训练质量诊断</Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">判断这次训练有没有真正练到点上</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
            健身模块不是记录器，也不是动作百科。它的任务是判断这次训练有没有服务当前目标，并把最关键的训练偏差直接指出来。
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Card className="border-primary/30">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="max-w-xl">
                  <div className="text-sm text-muted-foreground">手动输入主流程</div>
                  <h2 className="mt-1 text-2xl font-bold">生成本次训练诊断</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    支持 `goalType × splitType × sessionTag` 模板评分，输出综合得分、可信度、偏差诊断和下次训练建议。
                  </p>
                </div>
                <Button className="gap-2 sm:self-start" onClick={() => router.push("/analysis/new/gym")}>
                  开始分析
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">模块能力</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {CAPABILITIES.map(({ icon: Icon, title, description }) => (
                <div key={title} className="rounded-2xl border p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Icon className="h-4 w-4" />
                    {title}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
