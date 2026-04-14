/**
 * Running Score v1.0 - 文件解析器
 * 
 * 支持从常见运动手表格式导入数据：
 * - GPX: GPS Exchange Format（通用GPS轨迹格式）
 * - TCX: Training Center XML（Garmin专用格式）
 * - FIT: Flexible and Interoperable Data Transfer（需要额外解码库）
 */

import { RunningSessionInput } from "./schemas"

// ============ 类型定义 ============

export type FileFormat = "gpx" | "tcx" | "fit" | "unknown"

export interface ParsedActivity {
  // 基础信息
  startTime: string
  totalDuration: number      // 秒
  totalDistance: number      // 公里
  
  // 配速数据
  avgPace: number            // 秒/公里
  splits?: number[]          // 每公里配速
  
  // 心率数据
  avgHeartRate?: number
  maxHeartRate?: number
  heartRateZones?: {
    z1: number  // < 60% HRR
    z2: number  // 60-70% HRR
    z3: number  // 70-80% HRR (灰区)
    z4: number  // 80-88% HRR
    z5: number  // > 88% HRR
  }
  
  // 轨迹点
  trackPoints: TrackPoint[]
  
  // 元数据
  device?: string
  sport?: string
  notes?: string
}

export interface TrackPoint {
  timestamp: number          // Unix timestamp (ms)
  latitude: number
  longitude: number
  elevation?: number         // 米
  distance: number           // 从起点累计距离（米）
  heartRate?: number
  cadence?: number
  speed?: number             // 米/秒
  pace?: number              // 秒/公里
}

export interface ParseResult {
  success: boolean
  format: FileFormat
  activity?: ParsedActivity
  error?: string
  warnings: string[]
}

export interface ImportPreview {
  raw: ParsedActivity
  suggestedInput: Partial<RunningSessionInput>
  detectedType: string
  confidence: number
  issues: string[]
}

// ============ GPX 解析器 ============

/**
 * 解析 GPX 文件
 * 
 * GPX 结构：
 * <gpx>
 *   <trk>
 *     <trkseg>
 *       <trkpt lat="..." lon="...">
 *         <ele>...</ele>
 *         <time>...</time>
 *         <extensions>
 *           <gpxtpx:TrackPointExtension>
 *             <gpxtpx:hr>...</gpxtpx:hr>
 *             <gpxtpx:cad>...</gpxtpx:cad>
 *           </gpxtpx:TrackPointExtension>
 *         </extensions>
 *       </trkpt>
 *     </trkseg>
 *   </trk>
 * </gpx>
 */
export function parseGPX(gpxContent: string): ParseResult {
  const warnings: string[] = []
  
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(gpxContent, "text/xml")
    
    // 检查解析错误
    const parseError = doc.querySelector("parsererror")
    if (parseError) {
      return {
        success: false,
        format: "gpx",
        error: "XML解析失败",
        warnings,
      }
    }
    
    // 提取轨迹点
    const trackPoints: TrackPoint[] = []
    const trkpts = doc.querySelectorAll("trkpt")
    
    if (trkpts.length === 0) {
      return {
        success: false,
        format: "gpx",
        error: "未找到轨迹点",
        warnings,
      }
    }
    
    let lastDistance = 0
    let hasHeartRate = false
    
    trkpts.forEach((trkpt, index) => {
      const lat = parseFloat(trkpt.getAttribute("lat") || "0")
      const lon = parseFloat(trkpt.getAttribute("lon") || "0")
      const ele = parseFloat(trkpt.querySelector("ele")?.textContent || "0")
      const timeStr = trkpt.querySelector("time")?.textContent
      
      // 解析扩展数据（心率、步频）
      let hr: number | undefined
      let cadence: number | undefined
      
      // 尝试不同的命名空间
      const extensions = trkpt.querySelector("extensions")
      if (extensions) {
        // Garmin 扩展
        const hrElem = extensions.querySelector("hr, *\\:hr, gpxt\\:hr")
        const cadElem = extensions.querySelector("cad, *\\:cad, gpxt\\:cad")
        
        if (hrElem?.textContent) {
          hr = parseInt(hrElem.textContent)
          hasHeartRate = true
        }
        if (cadElem?.textContent) {
          cadence = parseInt(cadElem.textContent)
        }
      }
      
      // 计算距离（使用 Haversine 公式或累计距离）
      // 简单实现：如果是第一个点，距离为0；否则基于前一个点计算
      let distance = 0
      if (index > 0 && trackPoints.length > 0) {
        const prev = trackPoints[trackPoints.length - 1]
        distance = prev.distance + calculateDistance(prev.latitude, prev.longitude, lat, lon)
      }
      
      const point: TrackPoint = {
        timestamp: timeStr ? new Date(timeStr).getTime() : Date.now(),
        latitude: lat,
        longitude: lon,
        elevation: ele || undefined,
        distance,
        heartRate: hr,
        cadence,
      }
      
      trackPoints.push(point)
    })
    
    // 如果没有心率数据，给出警告
    if (!hasHeartRate) {
      warnings.push("文件中没有心率数据，分析将基于配速和距离")
    }
    
    // 计算配速
    calculatePaceFromTrackPoints(trackPoints)
    
    // 生成统计
    const activity = generateActivityStats(trackPoints, warnings)
    
    return {
      success: true,
      format: "gpx",
      activity,
      warnings,
    }
    
  } catch (err: any) {
    return {
      success: false,
      format: "gpx",
      error: err.message || "解析失败",
      warnings,
    }
  }
}

// ============ TCX 解析器 ============

/**
 * 解析 TCX 文件
 * 
 * TCX 结构更完整，通常包含更多元数据：
 * <TrainingCenterDatabase>
 *   <Activities>
 *     <Activity Sport="Running">
 *       <Id>2024-01-15T06:30:00Z</Id>
 *       <Lap StartTime="...">
 *         <TotalTimeSeconds>...</TotalTimeSeconds>
 *         <DistanceMeters>...</DistanceMeters>
 *         <Track>
 *           <Trackpoint>
 *             <Time>...</Time>
 *             <Position>
 *               <LatitudeDegrees>...</LatitudeDegrees>
 *               <LongitudeDegrees>...</LongitudeDegrees>
 *             </Position>
 *             <AltitudeMeters>...</AltitudeMeters>
 *             <DistanceMeters>...</DistanceMeters>
 *             <HeartRateBpm>
 *               <Value>...</Value>
 *             </HeartRateBpm>
 *             <Cadence>...</Cadence>
 *           </Trackpoint>
 *         </Track>
 *       </Lap>
 *     </Activity>
 *   </Activities>
 * </TrainingCenterDatabase>
 */
export function parseTCX(tcxContent: string): ParseResult {
  const warnings: string[] = []
  
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(tcxContent, "text/xml")
    
    const parseError = doc.querySelector("parsererror")
    if (parseError) {
      return {
        success: false,
        format: "tcx",
        error: "XML解析失败",
        warnings,
      }
    }
    
    // 提取活动信息
    const activity = doc.querySelector("Activity")
    if (!activity) {
      return {
        success: false,
        format: "tcx",
        error: "未找到活动数据",
        warnings,
      }
    }
    
    const sport = activity.getAttribute("Sport") || "Running"
    const startTime = activity.querySelector("Id")?.textContent
    
    // 提取所有轨迹点
    const trackPoints: TrackPoint[] = []
    const trackpoints = activity.querySelectorAll("Trackpoint")
    
    let hasHeartRate = false
    
    trackpoints.forEach((tp) => {
      const timeStr = tp.querySelector("Time")?.textContent
      const lat = parseFloat(tp.querySelector("LatitudeDegrees")?.textContent || "0")
      const lon = parseFloat(tp.querySelector("LongitudeDegrees")?.textContent || "0")
      const ele = parseFloat(tp.querySelector("AltitudeMeters")?.textContent || "0")
      const dist = parseFloat(tp.querySelector("DistanceMeters")?.textContent || "0")
      const hr = parseInt(tp.querySelector("HeartRateBpm > Value, HeartRateBpm")?.textContent || "0") || undefined
      const cadence = parseInt(tp.querySelector("Cadence")?.textContent || "0") || undefined
      
      if (hr) hasHeartRate = true
      
      trackPoints.push({
        timestamp: timeStr ? new Date(timeStr).getTime() : Date.now(),
        latitude: lat,
        longitude: lon,
        elevation: ele || undefined,
        distance: dist,
        heartRate: hr,
        cadence,
      })
    })
    
    if (!hasHeartRate) {
      warnings.push("文件中没有心率数据")
    }
    
    // 计算配速
    calculatePaceFromTrackPoints(trackPoints)
    
    // 生成统计
    const parsedActivity = generateActivityStats(trackPoints, warnings)
    parsedActivity.sport = sport
    
    return {
      success: true,
      format: "tcx",
      activity: parsedActivity,
      warnings,
    }
    
  } catch (err: any) {
    return {
      success: false,
      format: "tcx",
      error: err.message || "解析失败",
      warnings,
    }
  }
}

// ============ 文件格式检测 ============

/**
 * 检测文件格式
 */
export function detectFileFormat(filename: string, content?: string): FileFormat {
  const ext = filename.toLowerCase().split(".").pop()
  
  switch (ext) {
    case "gpx":
      return "gpx"
    case "tcx":
      return "tcx"
    case "fit":
      return "fit"
    default:
      // 尝试从内容检测
      if (content) {
        if (content.includes("<gpx") || content.includes("<?xml") && content.includes("<trk")) {
          return "gpx"
        }
        if (content.includes("<TrainingCenterDatabase") || content.includes("<Activity Sport=")) {
          return "tcx"
        }
      }
      return "unknown"
  }
}

/**
 * 解析文件（自动检测格式）
 */
export async function parseActivityFile(
  file: File
): Promise<ParseResult> {
  const content = await file.text()
  const format = detectFileFormat(file.name, content)
  
  switch (format) {
    case "gpx":
      return parseGPX(content)
    case "tcx":
      return parseTCX(content)
    case "fit":
      return {
        success: false,
        format: "fit",
        error: "FIT格式需要专用解码库，当前版本暂不支持",
        warnings: [],
      }
    default:
      return {
        success: false,
        format: "unknown",
        error: "无法识别的文件格式，请上传 GPX 或 TCX 文件",
        warnings: [],
      }
  }
}

// ============ 数据转换 ============

/**
 * 将解析结果转换为 Running Score v1.0 输入格式
 */
export function convertToRunningInput(
  parsed: ParsedActivity,
  trainingType?: string,
  goalType?: string
): ImportPreview {
  const issues: string[] = []
  
  // 检测训练类型
  const detectedType = detectTrainingTypeFromActivity(parsed)
  
  // 计算分段数据
  const splits = calculateSplits(parsed.trackPoints)
  
  // 计算心率区间停留时间
  
  // 检测潜在问题
  if (parsed.totalDistance < 1) {
    issues.push("距离过短，可能不是完整的训练记录")
  }
  if (parsed.totalDuration < 300) {
    issues.push("时长过短，可能不是有效的训练记录")
  }
  if (parsed.avgPace < 120) { // 2:00/km 以下
    issues.push("配速异常快，请检查数据准确性")
  }
  
  // 估算 RPE（基于心率和配速）
  const estimatedRPE = estimateRPE(parsed)
  
  const suggestedInput: Partial<RunningSessionInput> = {
    id: `imported-${Date.now()}`,
    date: parsed.startTime,
    trainingType: (trainingType as any) || detectedType.type,
    goalType: goalType as any,
    durationMin: Math.round(parsed.totalDuration / 60),
    distanceKm: parsed.totalDistance,
    avgPaceSec: parsed.avgPace,
    avgHeartRate: parsed.avgHeartRate,
    maxHeartRate: parsed.maxHeartRate,
    heartRateSeries: parsed.trackPoints
      .map((point) => point.heartRate)
      .filter((value): value is number => value !== undefined),
    splits: splits.length > 0 ? splits : undefined,
    rpe: estimatedRPE,
    feeling: estimatedRPE > 7 ? "hard" : estimatedRPE > 4 ? "good" : "easy",
    source: "imported",
    telemetry: parsed.trackPoints.map((point) => ({
      timestampSec: Math.round(point.timestamp / 1000),
      distanceKm: point.distance / 1000,
      paceSec: point.pace || parsed.avgPace,
      heartRate: point.heartRate,
      cadence: point.cadence,
    })),
  }
  
  return {
    raw: parsed,
    suggestedInput,
    detectedType: detectedType.type,
    confidence: detectedType.confidence,
    issues,
  }
}

// ============ 辅助计算函数 ============

/**
 * Haversine 公式计算两点间距离
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000 // 地球半径（米）
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  
  return R * c
}

/**
 * 从轨迹点计算配速
 */
function calculatePaceFromTrackPoints(points: TrackPoint[]): void {
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    
    const timeDiff = (curr.timestamp - prev.timestamp) / 1000 // 秒
    const distDiff = (curr.distance - prev.distance) / 1000   // 公里
    
    if (distDiff > 0 && timeDiff > 0) {
      // 配速 = 时间 / 距离（秒/公里）
      curr.pace = timeDiff / distDiff
      // 限制异常值
      if (curr.pace > 900) curr.pace = 900 // 最慢15:00/km
      if (curr.pace < 120) curr.pace = 120 // 最快2:00/km
    }
  }
}

/**
 * 生成活动统计
 */
function generateActivityStats(points: TrackPoint[], warnings: string[]): ParsedActivity {
  if (points.length === 0) {
    throw new Error("没有轨迹点")
  }
  
  const startTime = new Date(points[0].timestamp).toISOString()
  const endTime = points[points.length - 1].timestamp
  const duration = (endTime - points[0].timestamp) / 1000 // 秒
  
  const totalDistance = points[points.length - 1].distance / 1000 // 公里
  
  // 平均配速
  const validPaces = points.filter(p => p.pace && p.pace > 0).map(p => p.pace!)
  const avgPace = validPaces.length > 0 
    ? validPaces.reduce((a, b) => a + b, 0) / validPaces.length 
    : 0
  
  // 心率统计
  const heartRates = points.filter(p => p.heartRate).map(p => p.heartRate!)
  const avgHeartRate = heartRates.length > 0
    ? Math.round(heartRates.reduce((a, b) => a + b, 0) / heartRates.length)
    : undefined
  const maxHeartRate = heartRates.length > 0
    ? Math.max(...heartRates)
    : undefined
  
  // 计算每公里分段
  const splits = calculateSplits(points)
  
  // 心率区间
  const heartRateZones = maxHeartRate 
    ? calculateHeartRateZones(points, maxHeartRate)
    : undefined
  
  return {
    startTime,
    totalDuration: duration,
    totalDistance,
    avgPace,
    avgHeartRate,
    maxHeartRate,
    splits,
    heartRateZones,
    trackPoints: points,
  }
}

/**
 * 计算每公里分段配速
 */
function calculateSplits(points: TrackPoint[]): number[] {
  const splits: number[] = []
  let kmStart = 0
  let kmStartTime = points[0]?.timestamp || 0
  
  for (let i = 1; i < points.length; i++) {
    const distanceKm = points[i].distance / 1000
    
    if (distanceKm >= splits.length + 1) {
      // 完成一公里
      const timeSec = (points[i].timestamp - kmStartTime) / 1000
      const pace = timeSec / (distanceKm - kmStart)
      splits.push(Math.round(pace))
      
      kmStart = distanceKm
      kmStartTime = points[i].timestamp
    }
  }
  
  return splits
}

/**
 * 计算心率区间停留时间（分钟）
 */
function calculateHeartRateZones(
  points: TrackPoint[],
  maxHR: number
): { z1: number; z2: number; z3: number; z4: number; z5: number } {
  const zones = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 }
  
  for (let i = 1; i < points.length; i++) {
    const hr = points[i].heartRate
    if (!hr) continue
    
    const timeDiff = (points[i].timestamp - points[i - 1].timestamp) / 1000 / 60 // 分钟
    const hrPercent = hr / maxHR
    
    if (hrPercent < 0.6) zones.z1 += timeDiff
    else if (hrPercent < 0.7) zones.z2 += timeDiff
    else if (hrPercent < 0.8) zones.z3 += timeDiff
    else if (hrPercent < 0.88) zones.z4 += timeDiff
    else zones.z5 += timeDiff
  }
  
  return zones
}

/**
 * 基于活动特征检测训练类型
 */
function detectTrainingTypeFromActivity(parsed: ParsedActivity): { type: string; confidence: number } {
  const distance = parsed.totalDistance
  const avgPace = parsed.avgPace
  const avgHR = parsed.avgHeartRate
  const maxHR = parsed.maxHeartRate
  
  // 简单启发式规则
  
  // 长距离检测
  if (distance >= 15) {
    return { type: "long", confidence: 0.85 }
  }
  
  // 基于心率强度检测
  if (avgHR && maxHR) {
    const intensity = avgHR / maxHR
    
    if (intensity > 0.88) {
      // 高强度可能是间歇跑或比赛
      if (distance < 5) {
        return { type: "interval", confidence: 0.8 }
      }
      return { type: "race", confidence: 0.7 }
    }
    
    if (intensity > 0.80 && intensity <= 0.88) {
      return { type: "tempo", confidence: 0.75 }
    }
    
    if (intensity < 0.65) {
      return { type: "recovery", confidence: 0.75 }
    }
    
    if (intensity < 0.75) {
      return { type: "easy", confidence: 0.7 }
    }
  }
  
  // 基于配速波动检测间歇
  if (parsed.splits && parsed.splits.length >= 3) {
    const variance = calculateVariance(parsed.splits)
    const mean = parsed.splits.reduce((a, b) => a + b, 0) / parsed.splits.length
    const cv = variance / mean // 变异系数
    
    if (cv > 0.15) {
      return { type: "interval", confidence: 0.7 }
    }
  }
  
  // 默认
  return { type: "easy", confidence: 0.5 }
}

/**
 * 估算 RPE（基于心率和配速）
 */
function estimateRPE(parsed: ParsedActivity): number {
  let score = 5 // 默认中等
  
  // 基于心率强度
  if (parsed.avgHeartRate && parsed.maxHeartRate) {
    const intensity = parsed.avgHeartRate / parsed.maxHeartRate
    score = Math.round(intensity * 10)
  }
  
  // 基于配速（如果距离较长，配速慢但持续时间长也会累加RPE）
  if (parsed.totalDistance > 10) {
    score += 1
  }
  
  return Math.min(10, Math.max(1, score))
}

function calculateVariance(arr: number[]): number {
  if (arr.length === 0) return 0
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length
  const squaredDiffs = arr.map(x => Math.pow(x - mean, 2))
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / arr.length)
}
