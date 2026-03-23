"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { AnalysisSession } from "@/types"
import { formatDateShort } from "@/lib/utils"

interface ProfileTrendChartProps {
  sessions: AnalysisSession[]
}

export function ProfileTrendChart({ sessions }: ProfileTrendChartProps) {
  // Sort sessions by date
  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime()
  )

  const data = sortedSessions.map((session) => ({
    date: formatDateShort(session.session_date),
    score: session.overall_score || 0,
    name: session.title,
  }))

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            domain={[0, 100]}
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
            formatter={(value: number) => [`评分: ${value}`, ""]}
            labelFormatter={(label: string) => `${label}`}
          />
          <Line 
            type="monotone" 
            dataKey="score" 
            stroke="#3b82f6" 
            strokeWidth={2}
            dot={{ fill: "#3b82f6", strokeWidth: 2 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
