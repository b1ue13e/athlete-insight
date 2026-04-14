# V2 引擎验证体系文档

> 基于双盲测试、金标准数据、统计学验证的严谨校准流程

---

## 验证目标

在将 V2 引擎 (xP + 贝叶斯 + 置信区间) 投入生产环境前，必须通过以下验证门槛：

| 指标 | 目标值 | 当前值 | 状态 |
|------|--------|--------|------|
| 斯皮尔曼等级相关系数 | > 0.8 | -- | 待验证 |
| 置信区间覆盖率 | > 80% @ 95%置信水平 | -- | 待验证 |
| AI洞察可执行性 | > 3.5/5 | -- | 待验证 |
| 金标准样本量 | >= 20 | 0 | 收集中 |

---

## 第一步：影子测试环境 (Shadow Testing)

### 1.1 并行引擎架构

**核心原则**: 永远不要直接覆盖旧版引擎

```
每次录入比赛数据:
├── V1 引擎计算 → v1_score
├── V2 引擎计算 → v2_score  
└── 数据库同时存储两个版本
```

**实现文件**: `lib/shadow-scoring.ts`

**数据结构**:
```typescript
interface ShadowScoreResult {
  v1: { overallScore, subScores, confidenceScore }
  v2: { 
    overallScore, 
    confidenceInterval: [lower, upper],
    xpAdjustment,
    bayesianEstimate 
  }
  diff: { overallDelta, subScoreDeltas }
}
```

### 1.2 Staging 环境

- **生产环境**: `athlete-insight.com` - 仅使用 V1 引擎
- **测试环境**: `staging.athlete-insight.com` - 影子测试，V1/V2 并行
- **本地环境**: `localhost:3000/validation` - 验证仪表板

---

## 第二步：金标准数据采集协议

### 2.1 采集流程

1. **录像准备**: 找到 4-6 场有完整录像的校队比赛
2. **盲测设计**: 教练在不知道系统评分的情况下看完比赛
3. **强制输出**: 教练必须填写三项指标

### 2.2 教练盲测表

**访问路径**: `/validation/coach-form`

**评估内容**:

| 项目 | 说明 | 格式 |
|------|------|------|
| 绝对评分 | 综合表现打分 | 0-100 |
| 相对排序 | 本场表现排名 | 1-N |
| 核心痛点 | 最大问题 | 一句话 |
| 评估置信度 | 教练对该评估的确定程度 | 高/中/低 |

### 2.3 数据存储

**实现文件**: `lib/gold-standard.ts`

```typescript
interface GoldStandardEntry {
  matchId, matchName, matchDate
  playerId, playerName, playerPosition
  
  coachEvaluation: {
    absoluteScore      // 教练评分 (Y_true)
    rankInMatch        // 教练排名
    coreWeakness       // 痛点诊断
    coachConfidence    // 置信度
  }
  
  systemScores: {
    v1: { overallScore }  // 系统V1评分
    v2: { overallScore, confidenceInterval }  // 系统V2评分
  }
}
```

---

## 第三步：统计学量化验证

### 3.1 斯皮尔曼等级相关系数

**目的**: 验证 V2 引擎的排名与教练直觉是否一致

**公式**:
```
ρ = 1 - (6 × Σd²) / (n(n² - 1))
```
- d_i: 教练排名与系统排名之差
- n: 样本量

**通过标准**: ρ > 0.8

**实现文件**: `lib/validation.ts`

```typescript
const result = calculateSpearmanCorrelation(coachRanks, systemRanks)
// { coefficient: 0.85, pValue: 0.001, passed: true }
```

**失败处理**:
- ρ < 0.6: 系统存在严重问题，检查 xP 权重配置
- ρ 0.6-0.8: 存在一定偏差，需要调整位置权重模板

### 3.2 置信区间覆盖率检验

**目的**: 验证置信区间估算是否准确

**定义**: 95% 置信区间下，教练真实打分落在区间内的比例

**通过标准**: 覆盖率 > 80%

**实现文件**: `lib/validation.ts`

```typescript
const result = calculateConfidenceIntervalCoverage(entries)
// { coverageRate: 85%, passed: true }
```

**失败处理**:
- 覆盖率 < 70%: 方差估算过于乐观，需要调整数据质量权重
- 平均区间宽度 > 20分: 系统过于保守

### 3.3 验证仪表板

**访问路径**: `/validation`

**功能**:
- 实时显示验证进度
- 斯皮尔曼系数计算
- 置信区间覆盖率统计
- 差异案例审查

---

## 第四步：AI 幻觉评估

### 4.1 评估矩阵

**目的**: 确保 AI 洞察不是废话，且可执行

**访问路径**: `/validation/ai-eval`

**三个维度** (1-5分):

| 维度 | 说明 | 5分标准 |
|------|------|---------|
| 准确度 | 因果推理是否正确 | 完全准确，证据充分 |
| 相关性 | 处方是否真能解决问题 | 完美匹配，针对性强 |
| 可执行性 | 明天训练能直接用吗 | 立即可用，详细具体 |

### 4.2 红线警告

**零容忍条款**:
- 可执行性 ≤ 2分 → 必须修改 training-vector-store.ts
- 被判定为废话 → 必须优化 Prompt
- 有安全风险 → 立即移除该训练动作

### 4.3 通过标准

- 平均分 > 3.5/5
- 红线违规次数 = 0
- 教练愿意在实战中参考

---

## 跑步模块专项验证 (新增)

### 跑步高阶指标验证体系

由于跑步模块引入了极度硬核的四层分析体系，需要额外的专项验证：

**实现文件**: 
- `lib/running-advanced-metrics.ts` - 四层分析算法
- `lib/ai-running-analyst.ts` - AI 教练引擎

**验证目标**:

| 指标 | 目标值 | 验证方法 |
|------|--------|----------|
| 心率解耦率准确度 | 与实验室气体分析仪误差 < 10% | 对比专业运动实验室数据 |
| 乳酸阈值检测 | 与血乳酸测试相关系数 > 0.85 | 对比指尖血乳酸测量 |
| 生物力学预警 | 提前预警受伤准确率 > 75% | 追踪跑者伤病史回溯验证 |
| AI 处方可执行性 | > 3.5/5 | 专业跑步教练盲评 |

### 验证方法

1. **有氧解耦率验证**
   - 对比 Firstbeat / TrainingPeaks 等专业平台的计算结果
   - 使用心率带 + GPS 手表的标准化数据
   - 验证公式: `Decoupling = (Pace/HR_first - Pace/HR_second) / (Pace/HR_first) × 100%`

2. **乳酸阈值检测验证**
   - 招募 10 名严肃跑者进行实验室递增负荷测试
   - 对比系统检测的阈值配速 vs 血乳酸拐点
   - 允许误差: ±5秒/公里

3. **生物力学预警验证**
   - 收集 20 名跑者 3 个月的训练数据
   - 记录实际受伤情况
   - 回溯验证系统是否在受伤前 1-2 周发出预警

4. **AI 处方验证**
   - 3 名专业跑步教练盲评
   - 评估维度: 准确度、针对性、可执行性
   - 红线: 可执行性 ≤ 2分 必须修改

### 演示页面

**访问路径**: `/demo/running`

可体验完整的四层分析流程：
1. 有氧解耦率计算
2. 乳酸阈值边缘检测
3. 生物力学衰减分析
4. AI 教练洞察生成

---

## 验证执行清单

### 立即执行 (今天)

- [ ] 联系校队教练，锁定 3-5 名球员
- [ ] 获取 4 场比赛的录像文件
- [ ] 部署 Staging 环境
- [ ] 测试影子评分系统

### 本周完成

- [ ] 收集 10 份金标准数据
- [ ] 初步计算斯皮尔曼系数
- [ ] 识别明显偏差的位置/情况

### 目标完成

- [ ] 收集 20-30 份金标准数据
- [ ] 斯皮尔曼系数 > 0.8
- [ ] 置信区间覆盖率 > 80%
- [ ] AI 可执行性 > 3.5/5

---

## 验证失败处理流程

### 场景 1: 斯皮尔曼系数不达标

```
ρ < 0.8:
  ↓
分析差异案例 (差距 > 10分的球员)
  ↓
检查位置权重模板
  ↓
检查 xP 难度权重
  ↓
调整参数，重新验证
```

### 场景 2: 置信区间覆盖率不足

```
覆盖率 < 80%:
  ↓
检查方差估算公式
  ↓
调整数据质量权重
  ↓
重新计算覆盖率
```

### 场景 3: AI 可执行性不达标

```
可执行性 ≤ 2分:
  ↓
检查训练动作库匹配逻辑
  ↓
优化 Prompt，增加可执行性约束
  ↓
重新评估
```

---

## 文件清单

```
lib/
  shadow-scoring.ts           # 影子测试系统
  gold-standard.ts            # 金标准数据采集
  validation.ts               # 统计学验证脚本
  ai-evaluation.ts            # AI 幻觉评估矩阵
  scoring-engine-v2.ts        # V2引擎 (待验证)
  running-advanced-metrics.ts # 跑步四层硬核分析 ⭐新增
  ai-running-analyst.ts       # 跑步AI教练引擎 ⭐新增

app/
  validation/
    page.tsx                  # 验证仪表板
    coach-form/page.tsx       # 教练盲测表
    ai-eval/page.tsx          # AI评估矩阵
  demo/
    running/page.tsx          # 跑步分析演示 ⭐新增

VALIDATION.md                 # 本文档
```

---

## 关键提醒

> **克制** - 在验证完成前，不要：
> - 扩展跑步模板
> - 增加新功能
> - 优化 UI 细节
> 
> **专注** - 所有精力集中在：
> - 交叉验证
> - 收集真人标注
> - 调整算法参数

---

## 下一步行动

1. 访问 `/validation` 查看仪表板
2. 访问 `/validation/coach-form` 生成盲测表
3. 访问 `/demo/running` 体验跑步硬核分析
4. 联系校队，开始数据收集

> "跑通验证闭环，再去谈其他。"
