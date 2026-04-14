"use client"

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  ReferenceDot,
  Line
} from "recharts"
import { cn } from "@/lib/utils"

/**
 * 乳酸阈值散点回归图 (Scatter Regression)
 * 
 * 核心视觉：
 * - 横轴配速，纵轴心率
 * - 散点图展示1000个数据点
 * - 非线性拟合曲线
 * - 拐点处脉冲动画准星 🎯
 */

interface ScatterPoint {
  pace: number        // 秒/公里
  heartRate: number   // bpm
  distance: number    // 公里（用于z轴大小）
  timestamp: number
}

interface ThresholdScatterProps {
  data: ScatterPoint[]
  inflectionPoint?: {
    pace: number
    heartRate: number
    distance: number
  }
  fittedCurve?: { pace: number; heartRate: number }[]
  className?: string
}

// 自定义Tooltip
function CustomTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    const paceMin = Math.floor(data.pace / 60)
    const paceSec = Math.round(data.pace % 60)
    
    return (
      <div className="bg-slate-900 border border-slate-700 p-3 shadow-xl">
        <p className="text-xs text-slate-500 font-mono mb-1">
          {data.distance.toFixed(1)} km
        </p>
        <p className="text-sm font-mono text-cyan-400">
          配速: {paceMin}:{paceSec.toString().padStart(2, '0')}/km
        </p>
        <p className="text-sm font-mono text-rose-400">
          心率: {Math.round(data.heartRate)} bpm
        </p>
      </div>
    )
  }
  return null
}

export function ThresholdScatter({
  data,
  inflectionPoint,
  fittedCurve,
  className
}: ThresholdScatterProps) {
  // 格式化数据
  const scatterData = data.map(d => ({
    ...d,
    z: 10  // 散点大小
  }))

  // 格式化配速显示
  const formatPace = (pace: number) => {
    const min = Math.floor(pace / 60)
    const sec = Math.round(pace % 60)
    return `${min}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className={cn("bg-slate-950 border border-slate-800 p-4", className)}>
      {/* 标题 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">乳酸阈值边缘检测</h3>
          <p className="text-xs text-slate-500 font-mono mt-1">
            LACTATE THRESHOLD EDGE // NONLINEAR REGRESSION
          </p>
        </div>
        {inflectionPoint && (
          <div className="text-right">
            <div className="text-xs text-slate-500 font-mono">THRESHOLD DETECTED</div>
            <div className="text-xl font-black text-amber-400 font-mono">
              {formatPace(inflectionPoint.pace)}/km
            </div>
          </div>
        )}
      </div>

      {/* 图表 */}
      <div className="h-80 relative">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            
            {/* X轴 - 配速 */}
            <XAxis
              type="number"
              dataKey="pace"
              domain={[280, 360]}
              tickFormatter={(v) => formatPace(v)}
              stroke="#475569"
              tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
              label={{ value: '配速 (/km)', position: 'bottom', fill: '#64748b', fontSize: 10 }}
            />
            
            {/* Y轴 - 心率 */}
            <YAxis
              type="number"
              dataKey="heartRate"
              domain={[130, 190]}
              stroke="#475569"
              tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
              label={{ value: '心率 (bpm)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }}
            />

            {/* Z轴 - 控制点大小 */}
            <ZAxis type="number" dataKey="z" range={[10, 50]} />

            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />

            {/* 拟合曲线 */}
            {fittedCurve && fittedCurve.length > 0 && (
              <Line
                data={fittedCurve}
                type="monotone"
                dataKey="heartRate"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                strokeDasharray="5 5"
              />
            )}

            {/* 散点数据 */}
            <Scatter
              name="数据点"
              data={scatterData}
              fill="#06b6d4"
              fillOpacity={0.4}
            />

            {/* 拐点准星 */}
            {inflectionPoint && (
              <ReferenceDot
                x={inflectionPoint.pace}
                y={inflectionPoint.heartRate}
                r={8}
                fill="#ef4444"
                stroke="#fff"
                strokeWidth={2}
                label={{
                  value: "🎯 THRESHOLD",
                  position: "top",
                  fill: "#ef4444",
                  fontSize: 10,
                  fontWeight: "bold",
                  fontFamily: "monospace"
                }}
              />
            )}
          </ScatterChart>
        </ResponsiveContainer>

        {/* 脉冲动画准星覆盖层 */}
        {inflectionPoint && (
          <div 
            className="absolute pointer-events-none"
            style={{
              left: `${((inflectionPoint.pace - 280) / 80) * 100}%`,
              top: `${100 - ((inflectionPoint.heartRate - 130) / 60) * 100}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="relative">
              {/* 脉冲环 */}
              <div className="absolute inset-0 w-8 h-8 -m-4">
                <div className="w-full h-full rounded-full border-2 border-red-500 animate-ping opacity-30" />
              </div>
              <div className="absolute inset-0 w-12 h-12 -m-6">
                <div className="w-full h-full rounded-full border border-red-500 animate-ping opacity-20" style={{ animationDelay: '0.3s' }} />
              </div>
              {/* 中心点 */}
              <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg shadow-red-500/50" />
            </div>
          </div>
        )}
      </div>

      {/* 底部说明 */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-xs font-mono">
        <div className="text-slate-500">
          <span className="text-cyan-400">●</span> SCATTER: RAW DATA POINTS
        </div>
        <div className="text-slate-500 text-center">
          {inflectionPoint ? (
            <span className="text-amber-400">
              🎯 INFLECTION @ {inflectionPoint.distance.toFixed(1)}km
            </span>
          ) : (
            <span className="text-slate-600">NO THRESHOLD CROSSING DETECTED</span>
          )}
        </div>
        <div className="text-slate-500 text-right">
          <span className="text-amber-400">---</span> FITTED CURVE
        </div>
      </div>

      {/* 诊断信息 */}
      {inflectionPoint && (
        <div className="mt-4 p-3 bg-amber-950/30 border border-amber-500/30">
          <p className="text-sm text-amber-400 font-mono">
            ALERT: NONLINEAR HEART RATE ACCELERATION DETECTED
          </p>
          <p className="text-xs text-slate-400 mt-1">
            心率对配速的响应在 {formatPace(inflectionPoint.pace)}/km 处发生突变，
            乳酸积累速度超过清除速度，建议将比赛配速控制在 {formatPace(inflectionPoint.pace + 10)}/km 以下
          </p>
        </div>
      )}
    </div>
  )
}
