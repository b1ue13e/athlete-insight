# 三层深度优化实现

> "从数据产品的三个维度，实现真正的降维打击"

## 第一层（浅）：极细颗粒度的行为埋点 (Event Telemetry)

### 核心思想
没有埋点的数据产品，就像是蒙着眼睛开 F1。你以为在过弯，其实已经冲出了赛道。

### 实现细节

```typescript
// 埋点事件 Schema - 类型安全保证
const TelemetryEvents = {
  CARD_GENERATION_STARTED: z.object({
    source: z.enum(['dashboard', 'mobile', 'shared_link']),
    sport_type: z.enum(['volleyball', 'running', 'basketball']),
    user_tier: z.enum(['free', 'pro', 'team']),
  }),
  
  PHOTO_CROPPED: z.object({
    ratio: z.enum(['1:1', '3:4', '9:16']),
    time_spent_ms: z.number(),      // UI阻力指标
    zoom_level: z.number(),         // 用户习惯
    crop_adjustments: z.number(),   // 调整次数
  }),
}
```

### 关键指标

| 指标 | 阈值 | 意义 |
|------|------|------|
| `time_spent_ms` (裁剪) | >4500ms | UI有阻力，需优化交互 |
| `export_time_ms` (导出) | >2000ms | 渲染性能问题 |
| `image_compress` | >500ms | 压缩算法待优化 |

### 漏斗追踪
```
上传(100%) → 裁剪(?) → 定制(?) → 导出(?) → 分享(30%目标)
```

---

## 第二层（中）：脏数据清洗与异常平滑 (Data Smoothing)

### 核心思想
真实跑步数据（GPX/FIT 文件）绝对不是完美正弦曲线。经过隧道时 GPS 丢失导致配速瞬间飙升到 1:00/km，你的非线性拟合直接崩溃。

### 三层防御体系

```
原始数据 → 物理约束检查 → 统计异常值检测 → 平滑滤波 → 干净数据
```

### 算法实现

#### 1. 异常值检测 - 双保险
```typescript
// Z-Score: 适合正态分布
const outliersZ = detectOutliersZScore(values, threshold = 3);

// IQR: 对偏态分布更鲁棒  
const outliersIQR = detectOutliersIQR(values, multiplier = 1.5);

// 联合判定
const outliers = new Set([...outliersZ, ...outliersIQR]);
```

#### 2. 平滑滤波 - 各司其职
| 数据类型 | 算法 | 原因 |
|---------|------|------|
| 心率 | 卡尔曼滤波 | 对噪声敏感，保留趋势 |
| 配速 | Savitzky-Golay | 保留拐点，适合乳酸阈值检测 |
| 实时流 | 中值滤波 | 简单有效，延迟低 |

#### 3. 卡尔曼滤波器 (一维)
```typescript
class KalmanFilter {
  update(measurement: number): number {
    // 预测
    this.p = this.p + this.q;  // 过程噪声
    
    // 更新
    this.k = this.p / (this.p + this.r);  // 卡尔曼增益
    this.x = this.x + this.k * (measurement - this.x);
    this.p = (1 - this.k) * this.p;
    
    return this.x;
  }
}
```

### 清洗效果示例

```
输入:  [5:00, 5:02, 1:30(GPS丢失), 4:58, 5:01, 5:00]
输出:  [5:00, 5:02, 5:00(插值), 4:58, 5:01, 5:00]
        ↓
      异常值检测 (Z-Score > 3)
        ↓
      线性插值填补
```

---

## 第三层（深）：运动员的"量化金融"定价模型

### 核心思想
把运动员看作一支具有波动率的金融资产。教练偏爱"神经刀"球员，但忽视了其极高的失误率（方差大）。

### 硬核公式

$$
SR = \frac{\bar{xP} - R_f}{\sigma_{xP}}
$$

| 符号 | 含义 | 计算方法 |
|------|------|---------|
| $\bar{xP}$ | 平均期望得分 | 加权统计贡献 |
| $R_f$ | 无风险收益率 | 同位置倒数20%球员平均 |
| $\sigma_{xP}$ | 表现标准差 | 赛季数据波动率 |

### 球员分层

```typescript
type PlayerTier = 
  | 'FUNDAMENTAL'    // SR > 1.5, 稳定性 > 70%
  | 'HIGH_BETA'      // SR > 1.0, 有波动但收益可接受
  | 'VOLATILE'       // 偶有爆发但极不稳定
  | 'UNDERPERFORMER' // 表现低于预期
```

### 阵容优化策略

```typescript
interface LineupOptimization {
  // 关键局策略：宁要稳不要爆
  clutchRotation: players
    .filter(p => p.tier === 'FUNDAMENTAL' || p.consistencyScore > 75)
    .sort((a, b) => b.sharpeRatio - a.sharpeRatio)
    .slice(0, 4);
  
  // 顺风局策略：可尝试高Beta球员扩大优势
  blowoutRotation: players
    .filter(p => p.sharpeRatio > 1.0)
    .slice(0, 6);
}
```

### AHA Moment

> "虽然张三今天拿了 20 分，但他的波动率 σ 太高，关键局派他上场等于赌博；
> 而李四虽然场均只有 12 分，但他的 SR（风险调整后收益）是全队最高的，
> 他才是真正的基本盘。"

---

## 技术架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        数据产品三层架构                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │   第一层：埋点    │    │   第二层：清洗    │    │  第三层：定价  │ │
│  │   (Telemetry)   │◄──►│  (Data Pipeline)│◄──►│  (Sharpe)   │ │
│  └─────────────────┘    └─────────────────┘    └─────────────┘ │
│          │                       │                     │        │
│          ▼                       ▼                     ▼        │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │ • 漏斗分析       │    │ • 异常值剔除     │    │ • 夏普比率   │ │
│  │ • 性能监控       │    │ • Z-Score/IQR   │    │ • VaR计算   │ │
│  │ • 用户行为       │    │ • 卡尔曼滤波     │    │ • 阵容优化   │ │
│  │ • A/B测试       │    │ • SG平滑        │    │ • 组合分析   │ │
│  └─────────────────┘    └─────────────────┘    └─────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │    业务价值输出   │
                    │  • 分享率 > 30%  │
                    │  • 数据质量 > 90%│
                    │  • 阵容胜率提升  │
                    └─────────────────┘
```

---

## 使用示例

### 1. 在组件中埋点
```typescript
const { track, trackFunnel } = useTelemetry();

// 用户完成裁剪
track('PHOTO_CROPPED', {
  ratio: '3:4',
  time_spent_ms: 4500,
  zoom_level: 1.5,
  crop_adjustments: 3,
});

// 漏斗追踪
trackFunnel('export', true, { tier: 'LEGENDARY' });
```

### 2. 清洗跑步数据
```typescript
const { cleaned, stats } = cleanRunningData(rawGPSData, {
  outlierZScore: 3,
  kalmanProcessNoise: 0.01,
  smoothingWindow: 5,
});

console.log(`清洗完成: 移除 ${stats.outliersRemoved} 个异常值`);
```

### 3. 计算球员夏普比率
```typescript
const metrics = calculateAthleticSharpeRatio(player, leagueBaseline);

if (metrics.tier === 'FUNDAMENTAL') {
  console.log(`${player.name} 是核心基本盘，关键局必上`);
}
```

---

## 验证指标

| 维度 | 指标 | 目标值 |
|------|------|--------|
| 埋点 | 漏斗转化率 | 分享率 > 30% |
| 清洗 | 异常值检测准确率 | > 95% |
| 定价 | 夏普比率预测胜率 | Spearman > 0.8 |

---

> "真正的数据产品，不是展示数据，而是用数据驱动决策。"
