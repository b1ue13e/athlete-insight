# 三层深度优化实现总结

## 已完成内容

### ✅ 第一层：行为埋点 (Telemetry)

**文件**: `lib/telemetry/analytics-client.ts`

**功能**:
- 基于 PostHog 的类型安全埋点系统
- Zod Schema 验证确保数据质量
- 漏斗分析 (Funnel Tracking)
- 性能监控 (Performance Metrics)
- 自动阈值检测

**使用**:
```typescript
import { useTelemetry } from '@/lib/telemetry/analytics-client';

const { track, trackFunnel, trackPerformance } = useTelemetry();

// 用户行为
track('PHOTO_CROPPED', {
  ratio: '3:4',
  time_spent_ms: 4500,
  zoom_level: 1.5,
});

// 性能监控
trackPerformance('card_export', 1200, true); // 1.2s, 成功
```

---

### ✅ 第二层：数据清洗 (Data Pipeline)

**文件**: `lib/telemetry/data-pipeline.ts`

**功能**:
- **物理约束检查**: 配速 2:30-15:00/km，心率 40-220 bpm
- **统计异常值检测**: Z-Score + IQR 双保险
- **多算法平滑**: 
  - 心率 → 卡尔曼滤波 (保留趋势)
  - 配速 → Savitzky-Golay (保留拐点)
  - 实时流 → 中值滤波 (低延迟)

**使用**:
```typescript
import { cleanRunningData } from '@/lib/telemetry/data-pipeline';

const { cleaned, stats } = cleanRunningData(rawGPSData, {
  outlierZScore: 3,
  kalmanProcessNoise: 0.01,
});

console.log(`移除 ${stats.outliersRemoved} 异常值，填补 ${stats.gapsInterpolated} 间隙`);
```

---

### ✅ 第三层：夏普比率 (Athletic Sharpe Ratio)

**文件**: `lib/analytics/athletic-sharpe-ratio.ts`

**功能**:
- 运动场夏普比率: SR = (xP̄ - Rf) / σ
- 球员分层: FUNDAMENTAL / HIGH_BETA / VOLATILE / UNDERPERFORMER
- 阵容优化建议
- 投资组合视角的球队构建

**使用**:
```typescript
import { calculateAthleticSharpeRatio, optimizeLineup } from '@/lib/analytics/athletic-sharpe-ratio';

const metrics = calculateAthleticSharpeRatio(player, leagueBaseline);

if (metrics.tier === 'FUNDAMENTAL') {
  console.log(`${player.name} 是核心基本盘，风险调整后收益最高`);
}

// 阵容优化
const lineup = optimizeLineup(roster, {
  gameImportance: 'critical',
  isPlayoffGame: true,
});
```

---

## 集成演示

**文件**: `app/share/player-card/page.tsx`

一个完整的演示页面，包含：
1. 球星卡生成 (带埋点)
2. 夏普比率分析面板
3. 跑步数据分析面板

---

## 验证指标

| 维度 | 指标 | 当前状态 |
|------|------|---------|
| 埋点 | 类型安全 | ✅ Zod Schema |
| 清洗 | 算法覆盖 | ✅ 3种检测 + 3种平滑 |
| 定价 | 公式完整 | ✅ Sharpe + VaR + 分层 |

---

## 后续建议

1. **埋点**: 在 Vercel 环境配置 `NEXT_PUBLIC_POSTHOG_KEY`
2. **清洗**: 针对学校队真实 GPX 数据调参
3. **定价**: 收集 20-30 个样本验证 Spearman > 0.8
