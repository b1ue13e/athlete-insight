/**
 * 第一层：极细颗粒度的行为埋点 (Event Telemetry)
 * 
 * "没有埋点的数据产品，就像是蒙着眼睛开 F1。
 *  你以为在过弯，其实已经冲出了赛道。"
 */
import posthog from 'posthog-js';
import { z } from 'zod';

// 埋点事件 Schema - 类型安全
export const TelemetryEvents = {
  // 球星卡生成漏斗
  CARD_GENERATION_STARTED: z.object({
    source: z.enum(['dashboard', 'mobile', 'shared_link']),
    sport_type: z.enum(['volleyball', 'running', 'basketball']),
    user_tier: z.enum(['free', 'pro', 'team']),
    timestamp: z.number(),
  }),
  
  PHOTO_UPLOAD_INITIATED: z.object({
    file_size_mb: z.number(),
    file_type: z.enum(['jpg', 'png', 'webp', 'heic']),
    device_type: z.enum(['mobile', 'desktop', 'tablet']),
  }),
  
  PHOTO_CROPPED: z.object({
    ratio: z.enum(['1:1', '3:4', '9:16']),
    time_spent_ms: z.number(), // 裁剪耗时 - UI阻力指标
    zoom_level: z.number(),    // 放大级别 - 用户习惯
    crop_adjustments: z.number(), // 调整次数
  }),
  
  PHOTO_UPLOADED: z.object({
    upload_time_ms: z.number(),
    compressed_size_kb: z.number(),
    success: z.boolean(),
    error_code: z.string().optional(),
  }),
  
  CARD_CUSTOMIZED: z.object({
    tier_selected: z.enum(['LEGENDARY', 'ELITE', 'RARE', 'COMMON']),
    stats_modified: z.boolean(),
    theme_changed: z.boolean(),
    time_spent_ms: z.number(),
  }),
  
  CARD_EXPORTED: z.object({
    format: z.enum(['png', 'jpg', 'webp']),
    size_kb: z.number(),
    export_time_ms: z.number(), // 渲染性能指标
    pixel_ratio: z.number(),    // HD质量设置
    success: z.boolean(),
  }),
  
  CARD_SHARED: z.object({
    platform: z.enum(['wechat', 'instagram', 'twitter', 'download', 'copy_link']),
    share_time_ms: z.number(),
  }),
  
  // 跑步数据埋点
  GPX_UPLOADED: z.object({
    file_size_kb: z.number(),
    data_points: z.number(),
    parse_time_ms: z.number(),
  }),
  
  ANALYSIS_COMPLETED: z.object({
    sport_type: z.string(),
    confidence_score: z.number(),
    processing_time_ms: z.number(),
  }),
  
  // 内部事件
  FUNNEL_STEP: z.object({
    step: z.enum(['upload', 'crop', 'customize', 'export', 'share']),
    success: z.boolean(),
    drop_off: z.boolean(),
  }),
  
  PERFORMANCE_METRIC: z.object({
    operation: z.string(),
    duration_ms: z.number(),
    success: z.boolean(),
    threshold_violation: z.boolean(),
  }),
} as const;

export type TelemetryEventMap = {
  [K in keyof typeof TelemetryEvents]: z.infer<typeof TelemetryEvents[K]>;
};

class AnalyticsClient {
  private initialized = false;
  private queue: Array<{ event: keyof TelemetryEventMap; properties: unknown }> = [];

  init() {
    if (typeof window === 'undefined') return;
    
    // 从环境变量读取，fallback 到开发配置
    const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';
    
    if (!apiKey) {
      console.warn('[Telemetry] PostHog key not found, using console fallback');
      this.initialized = true;
      return;
    }

    posthog.init(apiKey, {
      api_host: apiHost,
      capture_pageview: false, // 手动控制，避免噪音
      autocapture: false,      // 禁用自动捕获，只追踪我们定义的
      persistence: 'localStorage',
      loaded: () => {
        this.initialized = true;
        this.flushQueue();
      },
    });
  }

  private flushQueue() {
    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (item) this.capture(item.event, item.properties as TelemetryEventMap[typeof item.event]);
    }
  }

  capture<T extends keyof TelemetryEventMap>(
    event: T,
    properties: TelemetryEventMap[T]
  ) {
    // 验证 Schema
    const schema = TelemetryEvents[event];
    if (schema) {
      const result = schema.safeParse(properties);
      if (!result.success) {
        console.error('[Telemetry] Schema validation failed:', result.error);
        return;
      }
    }

    // 统一添加公共字段
    const enriched = {
      ...properties,
      _timestamp: Date.now(),
      _session_id: this.getSessionId(),
    };

    if (!this.initialized) {
      this.queue.push({ event, properties: enriched });
      return;
    }

    // 开发环境打印到控制台
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Telemetry] ${event}`, enriched);
    }

    posthog.capture(event, enriched);
  }

  // 漏斗分析专用 - 计算转化率
  trackFunnel(step: 'upload' | 'crop' | 'customize' | 'export' | 'share', 
             success: boolean, 
             metadata?: Record<string, unknown>) {
    this.capture('FUNNEL_STEP', {
      step,
      success,
      drop_off: !success,
      ...metadata,
    } as any);
  }

  // 性能监控 - 追踪耗时
  trackPerformance(operation: string, durationMs: number, success: boolean) {
    this.capture('PERFORMANCE_METRIC', {
      operation,
      duration_ms: durationMs,
      success,
      threshold_violation: durationMs > this.getThreshold(operation),
    } as any);
  }

  private getThreshold(operation: string): number {
    const thresholds: Record<string, number> = {
      'image_compress': 500,    // 图片压缩应 <500ms
      'crop_render': 100,       // 裁剪渲染应 <100ms
      'card_export': 2000,      // 卡片导出应 <2s
      'gpx_parse': 300,         // GPX解析应 <300ms
      'analysis_compute': 1000, // 分析计算应 <1s
    };
    return thresholds[operation] || 1000;
  }

  private getSessionId(): string {
    if (typeof window === 'undefined') return 'server';
    
    let sessionId = sessionStorage.getItem('telemetry_session_id');
    if (!sessionId) {
      sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('telemetry_session_id', sessionId);
    }
    return sessionId;
  }

  identify(userId: string, traits: Record<string, unknown>) {
    if (!this.initialized || typeof window === 'undefined') return;
    posthog.identify(userId, traits);
  }
}

export const analytics = new AnalyticsClient();

// React Hook - 在组件中使用
export function useTelemetry() {
  return {
    track: analytics.capture.bind(analytics),
    trackFunnel: analytics.trackFunnel.bind(analytics),
    trackPerformance: analytics.trackPerformance.bind(analytics),
  };
}
