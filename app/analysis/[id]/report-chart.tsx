"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartItem } from "@/types"

interface ReportChartProps {
  chart: ChartItem
}

const COLORS = {
  positive: "#10b981", // emerald-500
  negative: "#f59e0b", // amber-500
  neutral: "#3b82f6",  // blue-500
  danger: "#ef4444",   // red-500
}

export function ReportChart({ chart }: ReportChartProps) {
  if (chart.chart_type === "bar") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{chart.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart.data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: 8, 
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)"
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chart.data.map((entry, index) => {
                    const name = String(entry.name)
                    let color = COLORS.neutral
                    
                    // Color logic based on chart type and data
                    if (chart.chart_key === "point_breakdown") {
                      color = name === "得分" ? COLORS.positive : COLORS.negative
                    } else if (chart.chart_key === "error_distribution") {
                      color = COLORS.danger
                    } else if (chart.chart_key === "attack_breakdown") {
                      if (name === "扣球得分") color = COLORS.positive
                      else if (name === "扣球失误") color = COLORS.danger
                      else color = COLORS.negative
                    }
                    
                    return <Cell key={`cell-${index}`} fill={color} />
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Fallback for other chart types
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{chart.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground">
          {chart.chart_type} 类型图表待实现
        </div>
      </CardContent>
    </Card>
  )
}
