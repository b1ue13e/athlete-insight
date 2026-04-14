/**
 * 第二层：脏数据清洗与异常平滑 (Data Smoothing)
 * 
 * 核心痛点：真实跑步数据（GPX/FIT 文件或手机传感器直出）
 * 绝对不会是你 mock-analysis.ts 里的完美正弦曲线。
 * 如果用户跑步时经过隧道，GPS 丢失导致配速瞬间飙升到 1:00/km，
 * 你的非线性拟合曲线和滑动窗口直接崩溃。
 */

export interface RawDataPoint {
  timestamp: number;
  pace: number;        // min/km
  heartRate: number;   // bpm
  cadence?: number;    // steps/min
  groundContactTime?: number; // ms
  altitude?: number;   // meters
  distance: number;    // meters from start
}

export interface CleanedDataPoint extends RawDataPoint {
  isInterpolated: boolean;
  originalValues?: Partial<RawDataPoint>;
}

export interface PipelineConfig {
  // 异常值检测阈值
  outlierZScore: number;      // Z-Score 阈值，默认 3
  outlierIQRMultiplier: number; // IQR 乘数，默认 1.5
  
  // 物理约束
  maxPace: number;            // 最快配速 min/km (如 2:30/km)
  minPace: number;            // 最慢配速 min/km (如 15:00/km)
  maxHeartRate: number;       // 最大心率
  minHeartRate: number;       // 最小心率
  
  // 平滑参数
  kalmanProcessNoise: number;  // 卡尔曼滤波过程噪声 Q
  kalmanMeasurementNoise: number; // 测量噪声 R
  smoothingWindow: number;     // 移动平均窗口大小
}

const DEFAULT_CONFIG: PipelineConfig = {
  outlierZScore: 3,
  outlierIQRMultiplier: 1.5,
  maxPace: 2.5,      // 2:30/km 是博尔特级别
  minPace: 15,       // 15:00/km 是散步级别
  maxHeartRate: 220,
  minHeartRate: 40,
  kalmanProcessNoise: 0.01,
  kalmanMeasurementNoise: 1,
  smoothingWindow: 5,
};

/**
 * Z-Score 异常值检测
 * 计算每个数据点与均值的偏差，超过阈值的标记为异常
 */
function detectOutliersZScore(
  values: number[], 
  threshold: number
): Set<number> {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(
    values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length
  );
  
  const outliers = new Set<number>();
  values.forEach((val, idx) => {
    const zScore = Math.abs((val - mean) / stdDev);
    if (zScore > threshold) outliers.add(idx);
  });
  
  return outliers;
}

/**
 * IQR (四分位距) 异常值检测
 * 对偏态分布更鲁棒
 */
function detectOutliersIQR(
  values: number[], 
  multiplier: number
): Set<number> {
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  
  const lowerBound = q1 - multiplier * iqr;
  const upperBound = q3 + multiplier * iqr;
  
  const outliers = new Set<number>();
  values.forEach((val, idx) => {
    if (val < lowerBound || val > upperBound) outliers.add(idx);
  });
  
  return outliers;
}

/**
 * 简单卡尔曼滤波器
 * 一维卡尔曼，用于平滑时间序列
 */
class KalmanFilter {
  private x = 0;  // 状态估计
  private p = 1;  // 估计误差协方差
  private q: number; // 过程噪声
  private r: number; // 测量噪声
  private k = 0;  // 卡尔曼增益

  constructor(q: number, r: number) {
    this.q = q;
    this.r = r;
  }

  update(measurement: number): number {
    // 预测
    this.p = this.p + this.q;
    
    // 更新
    this.k = this.p / (this.p + this.r);
    this.x = this.x + this.k * (measurement - this.x);
    this.p = (1 - this.k) * this.p;
    
    return this.x;
  }

  reset(initialValue: number) {
    this.x = initialValue;
    this.p = 1;
  }
}

/**
 * 指数移动平均 (EMA)
 * 比简单移动平均对近期数据更敏感
 */
function ema(values: number[], alpha: number = 0.3): number[] {
  const result: number[] = [];
  let smoothed = values[0];
  
  values.forEach((val, i) => {
    if (i === 0) {
      result.push(val);
    } else {
      smoothed = alpha * val + (1 - alpha) * smoothed;
      result.push(smoothed);
    }
  });
  
  return result;
}

/**
 * Savitzky-Golay 滤波器
 * 保留峰值形状的同时平滑噪声，适合保留乳酸阈值检测的拐点
 */
function savitzkyGolay(
  values: number[], 
  windowSize: number = 7, 
  polynomialOrder: number = 3
): number[] {
  const halfWindow = Math.floor(windowSize / 2);
  const result: number[] = [];
  
  // 简化的 SG 滤波系数 (窗口=7, 阶数=3)
  const coefficients = [-2, 3, 6, 7, 6, 3, -2].map(c => c / 21);
  
  for (let i = 0; i < values.length; i++) {
    let smoothed = 0;
    for (let j = 0; j < windowSize; j++) {
      const idx = Math.min(Math.max(i - halfWindow + j, 0), values.length - 1);
      smoothed += values[idx] * coefficients[j];
    }
    result.push(smoothed);
  }
  
  return result;
}

/**
 * 线性插值填补缺失值
 */
function interpolate(
  data: CleanedDataPoint[], 
  gaps: Array<{ start: number; end: number }>
): CleanedDataPoint[] {
  const result = [...data];
  
  gaps.forEach(({ start, end }) => {
    if (start <= 0 || end >= data.length - 1) return;
    
    const before = data[start - 1];
    const after = data[end + 1];
    const gapSize = end - start + 1;
    
    for (let i = start; i <= end; i++) {
      const ratio = (i - start + 1) / (gapSize + 1);
      result[i] = {
        ...result[i],
        pace: before.pace + (after.pace - before.pace) * ratio,
        heartRate: before.heartRate + (after.heartRate - before.heartRate) * ratio,
        cadence: before.cadence && after.cadence 
          ? before.cadence + (after.cadence - before.cadence) * ratio 
          : undefined,
        isInterpolated: true,
        originalValues: {
          pace: data[i].pace,
          heartRate: data[i].heartRate,
        },
      };
    }
  });
  
  return result;
}

/**
 * 主数据清洗管道
 */
export function cleanRunningData(
  rawData: RawDataPoint[],
  config: Partial<PipelineConfig> = {}
): { 
  cleaned: CleanedDataPoint[]; 
  stats: {
    outliersRemoved: number;
    gapsInterpolated: number;
    physicalViolations: number;
  };
} {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  let outliersRemoved = 0;
  let physicalViolations = 0;
  
  // Step 1: 物理约束检查 (硬边界)
  const physicallyValid = rawData.map((point, idx) => {
    const violations: string[] = [];
    const original = { ...point };
    let cleaned = { ...point };
    
    // 配速检查
    if (point.pace < cfg.maxPace || point.pace > cfg.minPace) {
      violations.push('pace');
      cleaned.pace = Math.max(cfg.maxPace, Math.min(cfg.minPace, point.pace));
    }
    
    // 心率检查
    if (point.heartRate < cfg.minHeartRate || point.heartRate > cfg.maxHeartRate) {
      violations.push('hr');
      cleaned.heartRate = Math.max(cfg.minHeartRate, Math.min(cfg.maxHeartRate, point.heartRate));
    }
    
    if (violations.length > 0) {
      physicalViolations++;
    }
    
    return {
      ...cleaned,
      isInterpolated: violations.length > 0,
      originalValues: violations.length > 0 ? original : undefined,
    };
  });
  
  // Step 2: 统计异常值检测 (Z-Score + IQR 联合)
  const paces = physicallyValid.map(d => d.pace);
  const heartRates = physicallyValid.map(d => d.heartRate);
  
  const paceOutliersZ = detectOutliersZScore(paces, cfg.outlierZScore);
  const paceOutliersIQR = detectOutliersIQR(paces, cfg.outlierIQRMultiplier);
  const paceOutliers = new Set<number>();
  paceOutliersZ.forEach(v => paceOutliers.add(v));
  paceOutliersIQR.forEach(v => paceOutliers.add(v));
  
  const hrOutliersZ = detectOutliersZScore(heartRates, cfg.outlierZScore);
  const hrOutliersIQR = detectOutliersIQR(heartRates, cfg.outlierIQRMultiplier);
  const hrOutliers = new Set<number>();
  hrOutliersZ.forEach(v => hrOutliers.add(v));
  hrOutliersIQR.forEach(v => hrOutliers.add(v));
  
  // 标记异常值位置用于后续插值
  const gapRanges: Array<{ start: number; end: number }> = [];
  let currentGap: { start: number; end: number } | null = null;
  
  const outlierCleaned = physicallyValid.map((point, idx) => {
    const isOutlier = paceOutliers.has(idx) || hrOutliers.has(idx) || false;
    
    if (isOutlier) {
      outliersRemoved++;
      if (!currentGap) {
        currentGap = { start: idx, end: idx };
      } else {
        currentGap.end = idx;
      }
      return { ...point, isInterpolated: true, originalValues: { pace: point.pace, heartRate: point.heartRate } };
    } else {
      if (currentGap) {
        gapRanges.push(currentGap);
        currentGap = null;
      }
      return point;
    }
  });
  
  if (currentGap) gapRanges.push(currentGap);
  
  // Step 3: 插值填补
  const interpolated = interpolate(outlierCleaned, gapRanges);
  
  // Step 4: 平滑处理
  // 心率用卡尔曼 (对噪声敏感但保留趋势)
  const hrKalman = new KalmanFilter(cfg.kalmanProcessNoise, cfg.kalmanMeasurementNoise);
  hrKalman.reset(interpolated[0].heartRate);
  
  // 配速用 Savitzky-Golay (保留拐点特征，适合乳酸阈值检测)
  const smoothedPaces = savitzkyGolay(
    interpolated.map(d => d.pace), 
    cfg.smoothingWindow
  );
  
  const final = interpolated.map((point, idx) => ({
    ...point,
    heartRate: hrKalman.update(point.heartRate),
    pace: smoothedPaces[idx],
  }));
  
  return {
    cleaned: final,
    stats: {
      outliersRemoved,
      gapsInterpolated: gapRanges.length,
      physicalViolations,
    },
  };
}

/**
 * 实时流式清洗 (用于实时仪表盘)
 */
export class StreamingDataCleaner {
  private buffer: RawDataPoint[] = [];
  private kalmanPace = new KalmanFilter(0.01, 0.5);
  private kalmanHR = new KalmanFilter(0.01, 1);
  private bufferSize = 10;

  constructor(bufferSize = 10) {
    this.bufferSize = bufferSize;
  }

  process(point: RawDataPoint): CleanedDataPoint | null {
    this.buffer.push(point);
    
    // 累积足够数据才输出
    if (this.buffer.length < this.bufferSize) {
      return null;
    }
    
    // 保持滑动窗口
    if (this.buffer.length > this.bufferSize) {
      this.buffer.shift();
    }
    
    // 对最新点进行中值滤波 (简单但有效)
    const recentPaces = this.buffer.slice(-5).map(d => d.pace).sort((a, b) => a - b);
    const recentHRs = this.buffer.slice(-5).map(d => d.heartRate).sort((a, b) => a - b);
    
    const medianPace = recentPaces[Math.floor(recentPaces.length / 2)];
    const medianHR = recentHRs[Math.floor(recentHRs.length / 2)];
    
    // 如果当前点偏离中位数太远，使用卡尔曼预测值
    const paceDiff = Math.abs(point.pace - medianPace);
    const hrDiff = Math.abs(point.heartRate - medianHR);
    
    const isOutlier = paceDiff > 1.0 || hrDiff > 20; // 配速偏差>1min/km 或心率>20bpm
    
    return {
      ...point,
      pace: isOutlier ? this.kalmanPace.update(medianPace) : this.kalmanPace.update(point.pace),
      heartRate: isOutlier ? this.kalmanHR.update(medianHR) : this.kalmanHR.update(point.heartRate),
      isInterpolated: isOutlier,
      originalValues: isOutlier ? { pace: point.pace, heartRate: point.heartRate } : undefined,
    };
  }

  reset() {
    this.buffer = [];
    this.kalmanPace = new KalmanFilter(0.01, 0.5);
    this.kalmanHR = new KalmanFilter(0.01, 1);
  }
}
