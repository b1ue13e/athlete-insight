"use client"

import { useRef, useCallback } from "react"
import { Download, Share2 } from "lucide-react"
import { cn } from "@/lib/utils"

// ============ 类型定义 ============

export interface ShareCardData {
  athleteName: string
  position: string
  matchName: string
  date: string
  
  // 评分数据
  overallScore: number
  subScores: {
    scoring: number
    errorControl: number
    stability: number
    clutch: number
  }
  
  // 亮点数据
  highlight: {
    metric: string      // 例如："关键分胜率"
    value: string       // 例如："85%"
    context: string     // 例如："击败同位置85%球员"
    icon: string
  }
  
  // 对比数据
  vsPercentile?: number  // 击败同位置球员的百分比
  vsPrevious?: number    // 较上场的变化
  
  // 品牌
  brand: string
}

interface ShareCardProps {
  data: ShareCardData
  variant?: "radar" | "stat-card" | "minimal"
  className?: string
}

// ============ 雷达图分享卡片 ============

export function RadarShareCard({ data, className }: ShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const generateImage = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // 设置画布尺寸 (1080x1350 for Instagram)
    const width = 1080
    const height = 1350
    canvas.width = width
    canvas.height = height

    // 背景渐变
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, "#0B0D12")
    gradient.addColorStop(1, "#1a1d26")
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    // 网格装饰
    ctx.strokeStyle = "rgba(204, 255, 0, 0.05)"
    ctx.lineWidth = 1
    for (let i = 0; i < width; i += 60) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i, height)
      ctx.stroke()
    }

    // 品牌标识
    ctx.fillStyle = "#CCFF00"
    ctx.font = "bold 24px system-ui"
    ctx.textAlign = "left"
    ctx.fillText(data.brand.toUpperCase(), 60, 80)

    // 运动员信息
    ctx.fillStyle = "#F0F2F5"
    ctx.font = "bold 72px system-ui"
    ctx.textAlign = "center"
    ctx.fillText(data.athleteName, width / 2, 200)

    ctx.fillStyle = "#7C7E84"
    ctx.font = "32px system-ui"
    ctx.fillText(`${data.position} · ${data.matchName}`, width / 2, 260)

    // 综合评分（大数字）
    ctx.fillStyle = "#CCFF00"
    ctx.font = "bold 180px system-ui"
    ctx.fillText(data.overallScore.toString(), width / 2, 480)

    ctx.fillStyle = "#7C7E84"
    ctx.font = "28px system-ui"
    ctx.fillText("综合评分", width / 2, 530)

    // 雷达图
    const centerX = width / 2
    const centerY = 800
    const radius = 200
    const dimensions = [
      { key: "scoring", label: "得分", angle: -Math.PI / 2 },
      { key: "errorControl", label: "失误", angle: 0 },
      { key: "stability", label: "稳定", angle: Math.PI / 2 },
      { key: "clutch", label: "关键", angle: Math.PI },
    ]

    // 绘制雷达图背景
    ctx.strokeStyle = "rgba(124, 126, 132, 0.3)"
    ctx.lineWidth = 2
    for (let i = 1; i <= 4; i++) {
      ctx.beginPath()
      const r = (radius / 4) * i
      dimensions.forEach((dim, index) => {
        const x = centerX + Math.cos(dim.angle) * r
        const y = centerY + Math.sin(dim.angle) * r
        if (index === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.closePath()
      ctx.stroke()
    }

    // 绘制轴线
    dimensions.forEach(dim => {
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.lineTo(
        centerX + Math.cos(dim.angle) * radius,
        centerY + Math.sin(dim.angle) * radius
      )
      ctx.stroke()

      // 标签
      const labelX = centerX + Math.cos(dim.angle) * (radius + 50)
      const labelY = centerY + Math.sin(dim.angle) * (radius + 50)
      ctx.fillStyle = "#7C7E84"
      ctx.font = "24px system-ui"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(dim.label, labelX, labelY)
    })

    // 绘制数据区域
    ctx.beginPath()
    const scores = [
      data.subScores.scoring,
      data.subScores.errorControl,
      data.subScores.stability,
      data.subScores.clutch,
    ]
    scores.forEach((score, index) => {
      const r = (score / 100) * radius
      const x = centerX + Math.cos(dimensions[index].angle) * r
      const y = centerY + Math.sin(dimensions[index].angle) * r
      if (index === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.closePath()
    ctx.fillStyle = "rgba(204, 255, 0, 0.3)"
    ctx.fill()
    ctx.strokeStyle = "#CCFF00"
    ctx.lineWidth = 3
    ctx.stroke()

    // 绘制数据点
    scores.forEach((score, index) => {
      const r = (score / 100) * radius
      const x = centerX + Math.cos(dimensions[index].angle) * r
      const y = centerY + Math.sin(dimensions[index].angle) * r
      ctx.beginPath()
      ctx.arc(x, y, 8, 0, Math.PI * 2)
      ctx.fillStyle = "#CCFF00"
      ctx.fill()
    })

    // 高光数据
    const highlightY = 1120
    ctx.fillStyle = "rgba(204, 255, 0, 0.1)"
    ctx.fillRect(60, highlightY - 60, width - 120, 140)
    ctx.strokeStyle = "#CCFF00"
    ctx.lineWidth = 2
    ctx.strokeRect(60, highlightY - 60, width - 120, 140)

    ctx.fillStyle = "#CCFF00"
    ctx.font = "bold 48px system-ui"
    ctx.textAlign = "center"
    ctx.fillText(data.highlight.value, width / 2, highlightY + 10)

    ctx.fillStyle = "#F0F2F5"
    ctx.font = "28px system-ui"
    ctx.fillText(data.highlight.metric, width / 2, highlightY + 50)

    ctx.fillStyle = "#7C7E84"
    ctx.font = "24px system-ui"
    ctx.fillText(data.highlight.context, width / 2, highlightY + 90)

    // 底部对比信息
    if (data.vsPercentile || data.vsPrevious !== undefined) {
      ctx.fillStyle = "#7C7E84"
      ctx.font = "20px system-ui"
      
      let comparisonText = ""
      if (data.vsPercentile) {
        comparisonText = `击败 ${data.vsPercentile}% 同位置球员`
      }
      if (data.vsPrevious !== undefined) {
        const sign = data.vsPrevious > 0 ? "+" : ""
        comparisonText += comparisonText ? ` · 较上场 ${sign}${data.vsPrevious}` : `较上场 ${sign}${data.vsPrevious}`
      }
      
      ctx.fillText(comparisonText, width / 2, 1280)
    }

    return canvas.toDataURL("image/png")
  }, [data])

  const handleDownload = useCallback(() => {
    const dataUrl = generateImage()
    if (!dataUrl) return

    const link = document.createElement("a")
    link.href = dataUrl
    link.download = `${data.athleteName}_${data.matchName}_雷达图.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [generateImage, data])

  const handleShare = useCallback(async () => {
    const dataUrl = generateImage()
    if (!dataUrl) return

    const blob = await fetch(dataUrl).then(r => r.blob())
    const file = new File([blob], "share.png", { type: "image/png" })

    if (navigator.share && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: `${data.athleteName} - ${data.matchName}`,
        text: `${data.highlight.metric}: ${data.highlight.value} - ${data.highlight.context}`,
        files: [file],
      })
    } else {
      handleDownload()
    }
  }, [generateImage, data, handleDownload])

  return (
    <div className={cn("space-y-4", className)}>
      {/* 预览画布 */}
      <div className="relative rounded-xl overflow-hidden bg-[#0B0D12]">
        <canvas
          ref={canvasRef}
          className="w-full h-auto"
          style={{ aspectRatio: "1080/1350" }}
        />
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-3">
        <button
          onClick={handleDownload}
          className="flex-1 py-3 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-[var(--bg-secondary)]/80 transition-colors"
        >
          <Download className="w-5 h-5" />
          保存图片
        </button>
        <button
          onClick={handleShare}
          className="flex-1 py-3 bg-[var(--accent)] text-[var(--bg-primary)] rounded-xl font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
        >
          <Share2 className="w-5 h-5" />
          分享
        </button>
      </div>
    </div>
  )
}

// ============ 球星卡风格分享 ============

export function PlayerCardShare({ data, className }: ShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const generateImage = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // 球星卡尺寸
    const width = 800
    const height = 1200
    canvas.width = width
    canvas.height = height

    // 动态配色 (基于评分)
    const getRarity = (score: number) => {
      if (score >= 90) return { name: "LEGENDARY", color: "#FFD700", bg: "linear-gradient(135deg, #1a0f00 0%, #3d2800 100%)" }
      if (score >= 80) return { name: "ELITE", color: "#C0C0C0", bg: "linear-gradient(135deg, #0f1a1f 0%, #002840 100%)" }
      if (score >= 70) return { name: "RARE", color: "#CD7F32", bg: "linear-gradient(135deg, #1a0f0f 0%, #401a00 100%)" }
      return { name: "COMMON", color: "#7C7E84", bg: "linear-gradient(135deg, #0B0D12 0%, #1a1d26 100%)" }
    }

    const rarity = getRarity(data.overallScore)

    // 背景
    ctx.fillStyle = "#0B0D12"
    ctx.fillRect(0, 0, width, height)

    // 金色边框效果
    const borderGradient = ctx.createLinearGradient(0, 0, width, height)
    borderGradient.addColorStop(0, rarity.color)
    borderGradient.addColorStop(0.5, "#fff")
    borderGradient.addColorStop(1, rarity.color)
    
    ctx.strokeStyle = borderGradient
    ctx.lineWidth = 8
    ctx.strokeRect(20, 20, width - 40, height - 40)

    // 内部背景
    ctx.fillStyle = "#0f1218"
    ctx.fillRect(30, 30, width - 60, height - 60)

    // 稀有度标签
    ctx.fillStyle = rarity.color
    ctx.font = "bold 28px system-ui"
    ctx.textAlign = "right"
    ctx.fillText(rarity.name, width - 60, 90)

    // 品牌
    ctx.fillStyle = "#7C7E84"
    ctx.font = "20px system-ui"
    ctx.textAlign = "left"
    ctx.fillText(data.brand.toUpperCase(), 60, 90)

    // 球员头像区域（占位）
    const avatarY = 150
    ctx.fillStyle = "#1a1d26"
    ctx.fillRect(100, avatarY, 600, 400)
    
    // 头像边框
    ctx.strokeStyle = rarity.color
    ctx.lineWidth = 4
    ctx.strokeRect(100, avatarY, 600, 400)

    // 位置标签
    ctx.fillStyle = rarity.color
    ctx.font = "bold 48px system-ui"
    ctx.textAlign = "center"
    ctx.fillText(data.position.toUpperCase(), width / 2, avatarY + 60)

    // 球员名
    ctx.fillStyle = "#F0F2F5"
    ctx.font = "bold 64px system-ui"
    ctx.fillText(data.athleteName, width / 2, avatarY + 500)

    // 比赛名
    ctx.fillStyle = "#7C7E84"
    ctx.font = "28px system-ui"
    ctx.fillText(data.matchName, width / 2, avatarY + 550)

    // 评分区域
    const statsY = avatarY + 650
    
    // 总体评分 (大)
    ctx.fillStyle = rarity.color
    ctx.font = "bold 120px system-ui"
    ctx.fillText(data.overallScore.toString(), width / 2, statsY)

    ctx.fillStyle = "#7C7E84"
    ctx.font = "24px system-ui"
    ctx.fillText("OVR", width / 2, statsY + 40)

    // 四维评分
    const dimensions = [
      { label: "得分", score: data.subScores.scoring },
      { label: "失误", score: data.subScores.errorControl },
      { label: "稳定", score: data.subScores.stability },
      { label: "关键", score: data.subScores.clutch },
    ]

    const startX = 120
    const spacing = 170
    const dimY = statsY + 120

    dimensions.forEach((dim, i) => {
      const x = startX + i * spacing
      
      // 数值
      ctx.fillStyle = dim.score >= 80 ? rarity.color : "#F0F2F5"
      ctx.font = "bold 36px system-ui"
      ctx.fillText(dim.score.toString(), x, dimY)
      
      // 标签
      ctx.fillStyle = "#7C7E84"
      ctx.font = "20px system-ui"
      ctx.fillText(dim.label, x, dimY + 30)
    })

    // 高光数据
    const highlightY = dimY + 120
    ctx.fillStyle = "rgba(255,255,255,0.05)"
    ctx.fillRect(60, highlightY - 40, width - 120, 100)
    
    ctx.fillStyle = rarity.color
    ctx.font = "bold 40px system-ui"
    ctx.fillText(data.highlight.value, width / 2, highlightY + 10)
    
    ctx.fillStyle = "#F0F2F5"
    ctx.font = "22px system-ui"
    ctx.fillText(data.highlight.metric, width / 2, highlightY + 45)

    // 底部日期
    ctx.fillStyle = "#7C7E84"
    ctx.font = "18px system-ui"
    ctx.fillText(data.date, width / 2, height - 80)

    return canvas.toDataURL("image/png")
  }, [data])

  const handleDownload = useCallback(() => {
    const dataUrl = generateImage()
    if (!dataUrl) return

    const link = document.createElement("a")
    link.href = dataUrl
    link.download = `${data.athleteName}_${data.matchName}_球星卡.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [generateImage, data])

  return (
    <div className={cn("space-y-4", className)}>
      <canvas
        ref={canvasRef}
        className="w-full h-auto rounded-xl"
        style={{ aspectRatio: "800/1200" }}
      />
      <button
        onClick={handleDownload}
        className="w-full py-3 bg-[var(--accent)] text-[var(--bg-primary)] rounded-xl font-medium flex items-center justify-center gap-2"
      >
        <Download className="w-5 h-5" />
        保存球星卡
      </button>
    </div>
  )
}

// ============ 极简风格分享 ============

export function MinimalShareCard({ data, className }: ShareCardProps) {
  const getVerdict = (score: number) => {
    if (score >= 90) return { text: "LEGENDARY", emoji: "🔥" }
    if (score >= 80) return { text: "EXCELLENT", emoji: "⭐" }
    if (score >= 70) return { text: "GOOD", emoji: "👍" }
    if (score >= 60) return { text: "AVERAGE", emoji: "📊" }
    return { text: "NEEDS WORK", emoji: "💪" }
  }

  const verdict = getVerdict(data.overallScore)

  const shareText = `${data.athleteName} · ${data.position} · ${data.matchName}

综合评分: ${data.overallScore} ${verdict.emoji}
${verdict.text}

${data.highlight.metric}: ${data.highlight.value}
${data.highlight.context}

—— 来自 ${data.brand}`

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      await navigator.share({
        title: `${data.athleteName} - ${data.matchName}`,
        text: shareText,
      })
    } else {
      await navigator.clipboard.writeText(shareText)
      alert("已复制到剪贴板")
    }
  }, [data, shareText])

  return (
    <div className={cn("bg-[var(--bg-secondary)] rounded-2xl p-6 space-y-4", className)}>
      {/* 头部 */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xl font-bold text-[var(--text-primary)]">{data.athleteName}</h3>
          <p className="text-sm text-[var(--text-muted)]">{data.position} · {data.matchName}</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-[var(--accent)]">{data.overallScore}</div>
          <div className="text-xs text-[var(--text-muted)]">综合评分</div>
        </div>
      </div>

      {/* 四维评分 */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "得分", value: data.subScores.scoring },
          { label: "失误", value: data.subScores.errorControl },
          { label: "稳定", value: data.subScores.stability },
          { label: "关键", value: data.subScores.clutch },
        ].map(dim => (
          <div key={dim.label} className="text-center p-2 bg-[var(--bg-primary)]/50 rounded-lg">
            <div className={cn(
              "text-lg font-bold",
              dim.value >= 80 ? "text-[var(--accent)]" : "text-[var(--text-primary)]"
            )}>
              {dim.value}
            </div>
            <div className="text-xs text-[var(--text-muted)]">{dim.label}</div>
          </div>
        ))}
      </div>

      {/* 高光数据 */}
      <div className="bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-xl p-4">
        <div className="text-2xl font-bold text-[var(--accent)]">{data.highlight.value}</div>
        <div className="text-sm text-[var(--text-primary)]">{data.highlight.metric}</div>
        <div className="text-xs text-[var(--text-muted)] mt-1">{data.highlight.context}</div>
      </div>

      {/* 分享按钮 */}
      <button
        onClick={handleShare}
        className="w-full py-3 bg-[var(--accent)] text-[var(--bg-primary)] rounded-xl font-medium"
      >
        分享战绩
      </button>
    </div>
  )
}

// ============ 分享卡片选择器 ============

interface ShareCardSelectorProps {
  data: ShareCardData
  className?: string
}

export function ShareCardSelector({ data, className }: ShareCardSelectorProps) {
  const [selectedVariant, setSelectedVariant] = useState<"radar" | "card" | "minimal">("radar")

  return (
    <div className={cn("space-y-6", className)}>
      {/* 变体选择 */}
      <div className="flex gap-2 p-1 bg-[var(--bg-secondary)] rounded-xl">
        {[
          { key: "radar", label: "雷达图" },
          { key: "card", label: "球星卡" },
          { key: "minimal", label: "极简" },
        ].map(variant => (
          <button
            key={variant.key}
            onClick={() => setSelectedVariant(variant.key as typeof selectedVariant)}
            className={cn(
              "flex-1 py-2 text-sm font-medium rounded-lg transition-colors",
              selectedVariant === variant.key
                ? "bg-[var(--accent)] text-[var(--bg-primary)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            {variant.label}
          </button>
        ))}
      </div>

      {/* 选中的卡片 */}
      {selectedVariant === "radar" && <RadarShareCard data={data} />}
      {selectedVariant === "card" && <PlayerCardShare data={data} />}
      {selectedVariant === "minimal" && <MinimalShareCard data={data} />}
    </div>
  )
}

// 需要导入 useState
import { useState } from "react"
