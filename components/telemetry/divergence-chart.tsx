"use client"

import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from "recharts"
import { cn } from "@/lib/utils"

/**
 * 心率/配速剥离面积图 (Divergence Chart)
 * 
 * 核心视觉：
 * - 双Y轴：左轴配速（倒序），右轴心率
 * - 配速线和心率线
 * - 当心率向上偏离配速时，填充半透明红色区域（"血条"）
 * - 直观展示"里子塌了"的过程
 */

interface DataPoint {
  distance: number        // 公里
  pace: number           // 秒/公里
  heartRate: number      // bpm
  paceDisplay: string    // 格式化配速
}

interface DivergenceChartProps {
  data: DataPoint[]
  decouplingStartIndex?: number  // 解耦开始的索引
  className?: string
}

// 自定义Tooltip
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700 p-3 shadow-xl">
        <p className="text-xs text-slate-500 font-mono mb-2">
          {label?.toFixed(1)} km
        </p>
        {payload.map((entry: any, index: number) => (
          <p
            key={index}
            className="text-sm font-mono"
            style={{ color: entry.color }}
          >
            {entry.name}: {entry.value}
            {entry.name === "配速" ? "/km" : " bpm"}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export function DivergenceChart({
  data,
  decouplingStartIndex,
  className
}: DivergenceChartProps) {
  // 计算心率相对于配速的偏移量（用于填充红色区域）
  const chartData = data.map((d, i) => {
    // 将配速和心率归一化到同一尺度进行可视化
    // 配速范围：240-360秒（4-6分/km）→ 映射到 120-180
    // 心率范围：120-180bpm
    const paceNormalized = 180 - (d.pace - 240) / 2
    const hrNormalized = d.heartRate
    
    // 计算偏离量（心率高于配速时为正）
    const divergence = Math.max(0, hrNormalized - paceNormalized)
    
    return {
      ...d,
      paceNormalized,
      hrNormalized,
      divergence,
      // 填充区域的上边界和下边界
      fillTop: hrNormalized,
      fillBottom: paceNormalized
    }
  })

  // 找到解耦开始的位置
  const divergenceStart = decouplingStartIndex || 
    chartData.findIndex((d, i) => i > chartData.length / 2 && d.divergence > 5)

  return (
    <div className={cn("bg-slate-950 border border-slate-800 p-4", className)}>
      {/* 标题 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">有氧解耦可视化</h3>
          <p className="text-xs text-slate-500 font-mono mt-1">
            DIVERGENCE CHART // CARDIAC DRIFT ANALYSIS
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-cyan-500" />
            <span className="text-slate-400">配速</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-rose-500" />
            <span className="text-slate-400">心率</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500/30" />
            <span className="text-slate-400">偏离区域</span>
          </div>
        </div>
      </div>

      {/* 图表 */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            
            {/* X轴 - 距离 */}
            <XAxis
              dataKey="distance"
              type="number"
              domain={[0, "dataMax"]}
              tickFormatter={(v) => `${v.toFixed(1)}`}
              stroke="#475569"
              tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
              label={{ value: '距离 (km)', position: 'bottom', fill: '#64748b', fontSize: 10 }}
            />
            
            {/* 左Y轴 - 配速（倒序显示） */}
            <YAxis
              yAxisId="pace"
              orientation="left"
              domain={[360, 240]}
              tickFormatter={(v) => `${Math.floor(v/60)}:${String(Math.round(v%60)).padStart(2, '0')}`}
              stroke="#06b6d4"
              tick={{ fill: '#06b6d4', fontSize: 10, fontFamily: 'monospace' }}
              label={{ value: '配速 (/km)', angle: -90, position: 'insideLeft', fill: '#06b6d4', fontSize: 10 }}
            />
            
            {/* 右Y轴 - 心率 */}
            <YAxis
              yAxisId="hr"
              orientation="right"
              domain={[120, 190]}
              stroke="#f43f5e"
              tick={{ fill: '#f43f5e', fontSize: 10, fontFamily: 'monospace' }}
              label={{ value: '心率 (bpm)', angle: 90, position: 'insideRight', fill: '#f43f5e', fontSize: 10 }}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* 解耦开始标记线 */}
            {divergenceStart > 0 && (
              <ReferenceLine
                x={chartData[divergenceStart]?.distance}
                stroke="#ef4444"
                strokeDasharray="5 5"
                label={{
                  value: "DECOUPLING START",
                  position: "top",
                  fill: "#ef4444",
                  fontSize: 9,
                  fontFamily: "monospace"
                }}
              />
            )}

            {/* 配速线 */}
            <Line
              yAxisId="pace"
              type="monotone"
              dataKey="pace"
              stroke="#06b6d4"
              strokeWidth={2}
              dot={false}
              name="配速"
            />

            {/* 心率线 */}
            <Line
              yAxisId="hr"
              type="monotone"
              dataKey="heartRate"
              stroke="#f43f5e"
              strokeWidth={2}
              dot={false}
              name="心率"
            />

            {/* 偏离区域填充（"血条"） */}
            <Area
              yAxisId="hr"
              type="monotone"
              dataKey="fillTop"
              stroke="none"
              fill="#ef4444"
              fillOpacity={0.2}
              baseLine={chartData.map((d) => ({
                x: d.distance,
                y: d.fillBottom,
              }))}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 底部说明 */}
      <div className="mt-4 flex items-center justify-between text-xs font-mono text-slate-500">
        <span>LEFT AXIS: PACE (INVERTED)</span>
        <span className="text-red-400">
          {divergenceStart > 0 
            ? `DIVERGENCE DETECTED @ ${chartData[divergenceStart]?.distance.toFixed(1)}km`
            : "NO SIGNIFICANT DIVERGENCE"
          }
        </span>
        <span>RIGHT AXIS: HEART RATE</span>
      </div>
    </div>
  )
}
