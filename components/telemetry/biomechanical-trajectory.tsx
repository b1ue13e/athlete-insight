"use client"

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot
} from "recharts"
import { cn } from "@/lib/utils"

/**
 * 生物力学衰减轨迹图 (Biomechanical Trajectory)
 * 
 * 核心视觉：
 * - 横轴触地时间 (GCT)，纵轴步频 (Cadence)
 * - 前5公里点：冰蓝色 (#06b6d4)
 * - 后5公里点：警示红色 (#ef4444)
 * - 红蓝点空间漂移 = 动作变形证据
 */

interface BiomechanicalPoint {
  gct: number           // 触地时间 (ms)
  cadence: number       // 步频 (步/分钟)
  distance: number      // 公里
  timestamp: number
}

interface BiomechanicalTrajectoryProps {
  data: BiomechanicalPoint[]
  baseline?: {
    gct: number
    cadence: number
  }
  driftDetected?: boolean
  className?: string
}

// 自定义Tooltip
function CustomTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    const phase = data.distance <= 5 ? "FRESH" : data.distance >= 16 ? "FATIGUED" : "MID"
    const phaseColor = phase === "FRESH" ? "#06b6d4" : phase === "FATIGUED" ? "#ef4444" : "#64748b"
    
    return (
      <div className="bg-slate-900 border border-slate-700 p-3 shadow-xl">
        <p className="text-xs font-mono mb-1" style={{ color: phaseColor }}>
          {phase} @ {data.distance.toFixed(1)} km
        </p>
        <p className="text-sm font-mono text-slate-300">
          步频: {Math.round(data.cadence)} spm
        </p>
        <p className="text-sm font-mono text-slate-300">
          触地: {Math.round(data.gct)} ms
        </p>
      </div>
    )
  }
  return null
}

export function BiomechanicalTrajectory({
  data,
  baseline,
  driftDetected,
  className
}: BiomechanicalTrajectoryProps) {
  // 分离前5km和后5km数据
  const freshPoints = data
    .filter(d => d.distance <= 5)
    .map(d => ({ ...d, phase: "fresh", z: 30 }))
  
  const fatiguedPoints = data
    .filter(d => d.distance >= 16)
    .map(d => ({ ...d, phase: "fatigued", z: 30 }))

  // 计算质心
  const freshCentroid = freshPoints.length > 0 ? {
    gct: freshPoints.reduce((s, d) => s + d.gct, 0) / freshPoints.length,
    cadence: freshPoints.reduce((s, d) => s + d.cadence, 0) / freshPoints.length
  } : null

  const fatiguedCentroid = fatiguedPoints.length > 0 ? {
    gct: fatiguedPoints.reduce((s, d) => s + d.gct, 0) / fatiguedPoints.length,
    cadence: fatiguedPoints.reduce((s, d) => s + d.cadence, 0) / fatiguedPoints.length
  } : null

  // 计算漂移向量
  const driftVector = freshCentroid && fatiguedCentroid ? {
    gct: fatiguedCentroid.gct - freshCentroid.gct,
    cadence: fatiguedCentroid.cadence - freshCentroid.cadence
  } : null

  return (
    <div className={cn("bg-slate-950 border border-slate-800 p-4", className)}>
      {/* 标题 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">生物力学衰减轨迹</h3>
          <p className="text-xs text-slate-500 font-mono mt-1">
            BIOMECHANICAL TRAJECTORY // FORM DECAY ANALYSIS
          </p>
        </div>
        {driftDetected && (
          <div className="px-3 py-1 bg-red-950/50 border border-red-500/50">
            <span className="text-xs font-mono text-red-400">DRIFT DETECTED</span>
          </div>
        )}
      </div>

      {/* 漂移统计 */}
      {driftVector && (
        <div className="mb-4 grid grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-2 bg-slate-900">
            <span className="text-slate-500">ΔGCT</span>
            <span className={cn(
              "ml-2 font-bold",
              driftVector.gct > 15 ? "text-red-400" : "text-slate-300"
            )}>
              {driftVector.gct > 0 ? "+" : ""}{Math.round(driftVector.gct)} ms
            </span>
          </div>
          <div className="p-2 bg-slate-900">
            <span className="text-slate-500">ΔCADENCE</span>
            <span className={cn(
              "ml-2 font-bold",
              driftVector.cadence < -5 ? "text-red-400" : "text-slate-300"
            )}>
              {driftVector.cadence > 0 ? "+" : ""}{Math.round(driftVector.cadence)} spm
            </span>
          </div>
          <div className="p-2 bg-slate-900">
            <span className="text-slate-500">DIRECTION</span>
            <span className="ml-2 text-amber-400 font-bold">
              {driftVector.gct > 10 && driftVector.cadence < -5 
                ? "OVERSTRIDING ⚠️" 
                : driftVector.gct > 5 
                  ? "DEGRADING" 
                  : "STABLE"}
            </span>
          </div>
        </div>
      )}

      {/* 图表 */}
      <div className="h-80 relative">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            
            {/* X轴 - 触地时间 */}
            <XAxis
              type="number"
              dataKey="gct"
              domain={[180, 280]}
              stroke="#475569"
              tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
              label={{ value: '触地时间 GCT (ms)', position: 'bottom', fill: '#64748b', fontSize: 10 }}
            />
            
            {/* Y轴 - 步频 */}
            <YAxis
              type="number"
              dataKey="cadence"
              domain={[160, 195]}
              stroke="#475569"
              tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
              label={{ value: '步频 Cadence (spm)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }}
            />

            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />

            {/* 危险区域背景 */}
            <ReferenceLine x={240} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.3} />
            <ReferenceLine y={175} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.3} />

            {/* 清新态散点 (前5km) - 冰蓝色 */}
            <Scatter
              name="清新态 (0-5km)"
              data={freshPoints}
              fill="#06b6d4"
              fillOpacity={0.6}
            />

            {/* 疲劳态散点 (后5km) - 警示红 */}
            <Scatter
              name="疲劳态 (16-21km)"
              data={fatiguedPoints}
              fill="#ef4444"
              fillOpacity={0.6}
            />

            {/* 质心标记 */}
            {freshCentroid && (
              <ReferenceDot
                x={freshCentroid.gct}
                y={freshCentroid.cadence}
                r={6}
                fill="#06b6d4"
                stroke="#fff"
                strokeWidth={2}
                label={{ value: "FRESH", position: "top", fill: "#06b6d4", fontSize: 9, fontFamily: "monospace" }}
              />
            )}

            {fatiguedCentroid && (
              <ReferenceDot
                x={fatiguedCentroid.gct}
                y={fatiguedCentroid.cadence}
                r={6}
                fill="#ef4444"
                stroke="#fff"
                strokeWidth={2}
                label={{ value: "FATIGUED", position: "bottom", fill: "#ef4444", fontSize: 9, fontFamily: "monospace" }}
              />
            )}
          </ScatterChart>
        </ResponsiveContainer>

        {/* 漂移向量箭头 */}
        {freshCentroid && fatiguedCentroid && (
          <svg 
            className="absolute inset-0 pointer-events-none"
            style={{ width: '100%', height: '100%' }}
          >
            {/* 转换坐标 */}
            {(() => {
              const x1 = ((freshCentroid.gct - 180) / 100) * 100
              const y1 = 100 - ((freshCentroid.cadence - 160) / 35) * 100
              const x2 = ((fatiguedCentroid.gct - 180) / 100) * 100
              const y2 = 100 - ((fatiguedCentroid.cadence - 160) / 35) * 100
              
              return (
                <line
                  x1={`${x1}%`}
                  y1={`${y1}%`}
                  x2={`${x2}%`}
                  y2={`${y2}%`}
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  markerEnd="url(#arrowhead)"
                />
              )
            })()}
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#f59e0b" />
              </marker>
            </defs>
          </svg>
        )}
      </div>

      {/* 图例 */}
      <div className="mt-4 flex items-center justify-center gap-8 text-xs font-mono">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-cyan-500" />
          <span className="text-slate-400">FRESH (0-5km)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-slate-400">FATIGUED (16-21km)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-amber-500" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #f59e0b 0, #f59e0b 5px, transparent 5px, transparent 10px)' }} />
          <span className="text-slate-400">DRIFT VECTOR</span>
        </div>
      </div>

      {/* 诊断信息 */}
      {driftDetected && driftVector && (
        <div className="mt-4 p-3 bg-red-950/30 border border-red-500/30">
          <p className="text-sm text-red-400 font-mono font-bold">
            ⚠️ CRITICAL: OVERSTRIDING COMPENSATION DETECTED
          </p>
          <p className="text-xs text-slate-400 mt-1">
            疲劳态点阵向右下方发生显著空间漂移（步频降低 {Math.abs(Math.round(driftVector.cadence))} spm，
            触地时间增加 {Math.round(driftVector.gct)} ms）。这表明核心力量无法维持动作经济性，
            正在用危险的跨大步代偿，极易导致髂胫束综合征或膝盖损伤。
          </p>
        </div>
      )}

      {!driftDetected && (
        <div className="mt-4 p-3 bg-emerald-950/30 border border-emerald-500/30">
          <p className="text-sm text-emerald-400 font-mono font-bold">
            ✓ FORM STABILITY: BIOMECHANICS MAINTAINED
          </p>
          <p className="text-xs text-slate-400 mt-1">
            红蓝点阵高度重合，步频和触地时间在长距离中保持稳定。优秀的动作经济性。
          </p>
        </div>
      )}
    </div>
  )
}
