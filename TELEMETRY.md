# 跑步遥测仪表板文档 (Running Telemetry Dashboard)

> F1赛车级的数据可视化，把最残酷的真相用最直观的方式呈现

---

## 设计理念

**核心原则**：外行看五颜六色的圆环，内行看冷酷无情的时间序列。

- **深色模式**：Dark Mode 为主，减少视觉干扰
- **硬朗边框**：直角设计，拒绝圆润的"大众健身风"
- **等宽字体**：Monospace 展示统计数据，强化严谨性
- **高对比度**：重要数据用黑体加粗，一目了然

---

## 五步UI架构

### 第一步：结论前置的状态卡片 (Status Banner)

**路径**: `components/telemetry/status-banner.tsx`

**设计要点**:
- 顶部高对比度状态横幅
- 左侧状态指示灯（🟢🟡🔴）
- 右侧核心指标数据
- 底部金句输出

**状态等级**:
| 状态 | 颜色 | 说明 |
|------|------|------|
| stable | 翡翠绿 | 引擎运转稳定，基础扎实 |
| warning | 琥珀黄 | 后半程代偿，肌耐力告急 |
| critical | 警示红 | 有氧基础崩盘，高危状态 |

**文案风格**:
```
"配速是面子，心率是里子。你的里子够硬，可以冲击更高目标。"
"面子还撑得住，里子已经在报警。撞墙期离你只有几公里的距离。"
"里子已经塌了。继续这样跑下去，不是进步，是透支。"
```

---

### 第二步：心率/配速剥离面积图 (Divergence Chart)

**路径**: `components/telemetry/divergence-chart.tsx`

**核心视觉**:
- 双Y轴设计：左轴配速（倒序），右轴心率
- 配速线：青色 (#06b6d4)
- 心率线：玫瑰红 (#f43f5e)
- **绝杀**：心率向上偏离配速时，填充半透明红色区域

**AHA Moment**:
> 用户一眼看过去，前面全是贴合的线，到了16公里处突然出现一大片"红色血条"。这就是他"里子塌了"的铁证！

**技术实现**:
```typescript
<ComposedChart>
  <Line yAxisId="pace" dataKey="pace" stroke="#06b6d4" />  // 配速线
  <Line yAxisId="hr" dataKey="heartRate" stroke="#f43f5e" />  // 心率线
  <Area yAxisId="hr" dataKey="fillTop" fill="#ef4444" fillOpacity={0.2} />  // 血条
</ComposedChart>
```

---

### 第三步：乳酸阈值散点回归图 (Threshold Scatter)

**路径**: `components/telemetry/threshold-scatter.tsx`

**核心视觉**:
- 横轴配速，纵轴心率
- 1000个数据点散点图
- 非线性拟合曲线（虚线）
- **脉冲动画准星** 🎯 标记拐点

**AHA Moment**:
> 在散点上方叠加拟合曲线，当算法检测出心率导数突变时，渲染一个显眼的脉冲动画准星，带有Tooltip："乳酸阈值撞墙点：5:05/km"

**脉冲动画实现**:
```css
.animate-ping {
  animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
}
```

---

### 第四步：生物力学衰减轨迹 (Biomechanical Trajectory)

**路径**: `components/telemetry/biomechanical-trajectory.tsx`

**核心视觉**:
- 横轴触地时间(GCT)，纵轴步频(Cadence)
- 前5公里：冰蓝色 (#06b6d4)
- 后5公里：警示红色 (#ef4444)
- 质心标记 + 漂移向量箭头

**AHA Moment**:
> 完美的跑者，红蓝点应该高度重合。如果红色点阵集体向右下方（低步频、高触地）发生明显的空间漂移，用户自己都会倒吸一口凉气——这就是受伤的前兆。

**漂移检测**:
```typescript
if (ΔCadence < -5 && ΔGCT > 15ms) {
  // 跨大步代偿 → 髂胫束/膝盖高风险
}
```

---

### 第五步：AI处方卡片 (Prescription Ticket)

**路径**: `components/telemetry/prescription-ticket.tsx`

**设计风格**:
- 打印小票/医疗处方风格
- 硬朗边框，等宽字体
- Accordion折叠面板
- 复选框形式的训练动作列表

**面板结构**:
1. **诊断 (Diagnosis)**：一句话总结原因
2. **证据 (Evidence)**：Monospace字体展示统计数据
3. **处方 (Prescription)**：分类标签 + 复选框执行列表
4. **风险警告**：红色高亮区域

**分类标签**:
- 有氧基础 (青色)
- 乳酸阈值 (琥珀色)
- 力量训练 (玫瑰色)
- 柔韧性 (翠绿色)
- 恢复 (紫色)

---

## 文件清单

```
components/telemetry/
  status-banner.tsx           # 状态卡片
  divergence-chart.tsx        # 心率/配速剥离图
  threshold-scatter.tsx       # 乳酸阈值散点图
  biomechanical-trajectory.tsx # 生物力学轨迹
  prescription-ticket.tsx     # AI处方卡片

app/telemetry/running/
  page.tsx                    # 遥测仪表板主页面

TELEMETRY.md                  # 本文档
```

---

## 使用方式

### 访问遥测仪表板

```
http://localhost:3000/telemetry/running
```

### 组件独立使用

```tsx
import { StatusBanner } from "@/components/telemetry/status-banner"
import { DivergenceChart } from "@/components/telemetry/divergence-chart"

// 状态卡片
<StatusBanner
  status="warning"
  title="后半程代偿，下肢肌耐力告急"
  subtitle="21.1km // 108min // Avg 5:07/km"
  metrics={[
    { label: "解耦率", value: "7.2%", trend: "up" },
    { label: "阈值配速", value: "5:05" }
  ]}
  oneLiner="面子还撑得住，里子已经在报警。"
/>

// 剥离图
<DivergenceChart
  data={dataPoints}
  decouplingStartIndex={540}  // 大约第16公里
/>
```

---

## 数据要求

### 输入数据格式

```typescript
interface RunningDataPoint {
  timestamp: number      // 毫秒
  distance: number       // 米
  pace: number          // 秒/公里
  heartRate: number     // bpm
  cadence: number       // 步/分钟
  groundContactTime?: number  // 毫秒
  strideLength?: number // 米
}
```

### 采样频率

- **最低要求**: 每10秒一个数据点
- **推荐**: 每4-5秒一个数据点（对应GPS手表的默认设置）
- **专业级**: 每秒一个数据点（配合心率带和步态传感器）

---

## 技术栈

- **图表库**: Recharts
- **样式**: Tailwind CSS
- **字体**: Monospace（等宽）+ Sans-serif（标题）
- **颜色系统**:
  - 背景: slate-950
  - 边框: slate-800
  - 成功: emerald-500
  - 警告: amber-500
  - 危险: red-500
  - 信息: cyan-500

---

## 与算法层的对接

遥测仪表板与 `lib/running-advanced-metrics.ts` 四层分析算法直接对接：

```typescript
// 第一层：有氧解耦率 → DivergenceChart
const decoupling = calculateAerobicDecoupling(firstHalf, secondHalf)

// 第二层：乳酸阈值 → ThresholdScatter
const threshold = detectLactateThresholdEdge(session)

// 第三层：生物力学 → BiomechanicalTrajectory
const biomechanics = analyzeBiomechanicalDecay(dataPoints)

// 第四层：AI处方 → PrescriptionTicket
const insight = generateRunningCoachInsight(payload)
```

---

## 设计原则

> "顶级的数据产品，UI永远是在做减法，剔除噪音，放大核心变量的异动。"

1. **结论前置**：用户第一眼看到的是诊断，不是原始数据
2. **可视化优先**：用图表讲故事，而不是表格堆数字
3. **颜色有语义**：每种颜色都有明确的含义，不为了好看而好看
4. **交互有反馈**：折叠面板、复选框、脉冲动画，每个交互都有明确目的
5. **文案冷酷直接**：没有"加油"、"你很棒"，只有"你的里子塌了"

---

## 下一步

1. 访问 `/telemetry/running` 体验完整仪表板
2. 根据个人数据调整状态判断阈值
3. 导出数据与专业教练复盘

> "这不是一个让你感觉良好的App，这是一个让你变得更好的工具。"
