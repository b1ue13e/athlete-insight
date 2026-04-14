# Running Score v1.0 - 优化改进文档

## 扩展偏差识别规则

新增 11 种高级偏差检测，覆盖更多训练场景：

### 1. 心率-配速不匹配检测

| 偏差类型 | 触发条件 | 建议 |
|----------|----------|------|
| `hr_pace_mismatch_high` | 心率>85%但配速>6:00/km | 关注恢复情况，考虑疲劳或高温 |
| `hr_pace_mismatch_low` | 心率<70%但配速<5:00/km | 有氧能力提升的好现象 |

### 2. 过度训练风险

| 偏差类型 | 触发条件 | 建议 |
|----------|----------|------|
| `overtraining_risk` | RPE比预期低2分但心率高 | 近期安排恢复周 |

### 3. 训练密度检测

| 偏差类型 | 触发条件 | 建议 |
|----------|----------|------|
| `high_density` | 距离上次训练<24小时 | 确保足够的恢复时间 |

### 4. 配速控制检测

| 偏差类型 | 触发条件 | 建议 |
|----------|----------|------|
| `high_pace_variance` | 轻松跑变异系数>0.2 | 专注放松，保持稳定配速 |
| `fast_start` | 第一公里比平均快15秒 | 起跑保守，后程再加速 |

### 5. 心率异常检测

| 偏差类型 | 触发条件 | 建议 |
|----------|----------|------|
| `hr_spike` | 最大心率比平均高30bpm | 保持心率稳定更有利于有氧发展 |

### 6. 周训练趋势检测

| 偏差类型 | 触发条件 | 建议 |
|----------|----------|------|
| `volume_spike` | 周跑量增加>30% | 增幅建议控制在10-20% |
| `consecutive_hard` | 最近3次训练中2+次高强度 | 安排轻松跑或休息日 |

### 7. 目标偏离检测

| 偏差类型 | 触发条件 | 建议 |
|----------|----------|------|
| `goal_mismatch_distance` | 全马准备期长距离<30km | 逐步增加长距离距离 |
| `goal_mismatch_type` | 短距离赛事但轻松跑过长 | 增加速度训练，减少轻松跑 |

## UI/UX 优化组件

### 1. AnalyzingState - 分析加载状态

```tsx
<AnalyzingState step="calculating" progress={75} />
```

- 步骤指示器（解析/计算/检测/保存）
- 旋转动画
- 可选进度条

### 2. ScoreRing - 分数圆环

```tsx
<ScoreRing score={82} size="lg" showLabel />
```

- SVG 圆环动画
- 自适应颜色（绿/黄/红）
- 三种尺寸（sm/md/lg）

### 3. DeviationBadge - 偏差徽章

```tsx
<DeviationBadge type="major">心率过高</DeviationBadge>
```

- 严重/中等/轻微三种级别
- 颜色编码（红/黄/蓝）

### 4. DimensionBar - 维度评分条

```tsx
<DimensionBar 
  label="节奏控制"
  score={75}
  weight="25%"
  icon="〰"
  status="good"
  insight="配速控制良好"
/>
```

- 图标 + 标签 + 权重
- 动画进度条
- 状态标签 + 洞察文字

### 5. ComparisonArrow - 对比箭头

```tsx
<ComparisonArrow direction="up" value="+12%" label="跑量" />
```

- 上升/下降/持平三种状态
- 颜色编码（绿/红/灰）

## 使用示例

### 在报告页面中使用

```tsx
import { 
  ScoreRing, 
  DimensionBar, 
  DeviationBadge,
  AnalyzingState 
} from "@/components/running/loading-states"

// 加载状态
{isAnalyzing && <AnalyzingState step="detecting" />}

// 总评分
<ScoreRing score={report.overallScore} size="lg" />

// 四维评分
{dimensions.map(dim => (
  <DimensionBar 
    key={dim.key}
    label={dim.label}
    score={dim.score}
    weight={dim.weight}
    icon={dim.icon}
    status={dim.status}
    insight={dim.insight}
  />
))}

// 偏差列表
{deviations.map(dev => (
  <DeviationBadge key={dev.type} type={dev.severity}>
    {dev.description}
  </DeviationBadge>
))}
```

## 集成方式

### 1. 自动集成

扩展偏差检测已自动集成到 `calculateRunningScore` 函数中：

```typescript
// 基础偏差 + 扩展偏差
const baseDeviations = detectDeviations(input, derived, dimensions)
const extendedDeviations = detectExtendedDeviations(input, derived, dimensions)
const deviations = [...baseDeviations, ...extendedDeviations]
```

### 2. 手动使用

也可以单独使用扩展检测函数：

```typescript
import { 
  detectExtendedDeviations,
  detectFastStart,
  detectVolumeSpike 
} from "@/lib/scoring/running"

// 完整扩展检测
const deviations = detectExtendedDeviations(
  input, 
  derived, 
  dimensions,
  {
    hoursSinceLastRun: 18,
    currentWeekDistance: 45,
    previousWeekDistance: 35,
    recentRuns: [...]
  }
)

// 单项检测
const fastStart = detectFastStart(input, derived)
const volumeSpike = detectVolumeSpike(45, 35)
```

## 性能优化

### 计算优化

- 偏差检测按严重程度排序，优先显示重要问题
- 单项检测函数可独立使用，避免重复计算
- 扩展检测仅在需要时调用（有上下文数据时）

### UI 优化

- 动画使用 CSS transition，GPU 加速
- 加载状态分步骤显示，减少等待焦虑
- 组件支持按需加载

## 后续优化建议

### 更多偏差规则

- [ ] 海拔变化异常（爬升过多但配速不降）
- [ ] 步频异常（过低或过高）
- [ ] 温度影响（高温天配速下降）
- [ ] 晨跑vs夜跑差异
- [ ] 赛前减量不足

### UI 优化

- [ ] 3D 数据可视化
- [ ] 手势交互
- [ ] 暗黑模式优化
- [ ] 响应式动画

### 数据增强

- [ ] 天气数据集成
- [ ] 睡眠数据关联
- [ ] 疲劳度追踪
- [ ] 长期趋势预测
