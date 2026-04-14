# 量化金融体育分析引擎

> "把运动员看作具有波动率的金融资产，用现代投资组合理论优化阵容"

## 架构概览

```
┌─────────────────────────────────────────────────────────────────────┐
│                    量化金融体育分析引擎                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────┐    ┌──────────────────┐    ┌───────────────┐ │
│  │  单人定价层       │───▶│  组合优化层       │───▶│   回测验证层   │ │
│  │  Sharpe Ratio    │    │  Markowitz MPT   │    │  Backtesting  │ │
│  └──────────────────┘    └──────────────────┘    └───────────────┘ │
│           │                       │                       │        │
│           ▼                       ▼                       ▼        │
│  ┌──────────────────┐    ┌──────────────────┐    ┌───────────────┐ │
│  │ • 期望得分(xP)   │    │ • 协方差矩阵     │    │ • 滚动回测    │ │
│  │ • 波动率(σ)      │    │ • 有效前沿       │    │ • A/B测试     │ │
│  │ • 夏普比率(SR)   │    │ • 对冲分析       │    │ • 统计显著性  │ │
│  │ • 风险价值(VaR)  │    │ • 组合夏普       │    │ • 胜率验证    │ │
│  └──────────────────┘    └──────────────────┘    └───────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## 第一层：单人定价 (Athletic Sharpe Ratio)

### 核心公式

$$
SR = \frac{\bar{xP} - R_f}{\sigma_{xP}}
$$

### 球员分层
| 层级 | 夏普比率 | 特征 | 使用场景 |
|------|---------|------|---------|
| FUNDAMENTAL | > 1.5 | 风险调整后收益最高 | 关键局必上 |
| HIGH_BETA | 1.0-1.5 | 有波动但收益可接受 | 顺风局扩大优势 |
| VOLATILE | < 1.0, 高xP | 神经刀，偶有爆发 | 垃圾时间尝试 |
| UNDERPERFORMER | < 1.0, 低xP | 表现低于预期 | 建议轮换 |

**文件**: `lib/analytics/athletic-sharpe-ratio.ts`

---

## 第二层：投资组合优化 (Portfolio Optimization)

### 核心突破

把六个夏普比率最高的球员扔上场，大概率会翻车。排球是高度协同运动，需要找到"哪六个人搭档最稳"。

### 核心公式

**阵容波动率 (组合风险)**:

$$
\sigma_p^2 = \sum_{i=1}^n \sum_{j=1}^n w_i w_j \text{Cov}(R_i, R_j)
$$

### AHA Moment

> 如果主攻手张三和接应李四的表现高度负相关（张三爆发时李四通常隐形，反之亦然），那么同时派他们上场反而能降低整套阵容的波动率。

### 关键功能

1. **协方差矩阵**: 计算所有球员两两之间的表现相关性
2. **有效阵容前沿**: 给定风险水平下收益最高的阵容集合
3. **对冲分析**: 识别能降低组合风险的负相关球员对
4. **约束优化**: 位置约束 (1二传, 1-2主攻, 2副攻等)

**文件**: `lib/analytics/portfolio-optimization.ts`

---

## 第三层：回测引擎 (Backtesting)

### 核心理念

在金融领域，没有经过历史数据回测的指标就是耍流氓。

### 回测逻辑闭环

```
前N场比赛数据 ──▶ 计算协方差矩阵 ──▶ 生成第N+1场最优阵容
                                          │
                                          ▼
                                    对比真实赛果
                                          │
                                          ▼
              验证通过 ◀── 模型胜率 vs 教练决策胜率 ◀── 对比实际排兵
```

### A/B 测试框架

```typescript
const abTest = runABTest(
  gamesWithModelStrategy,    // 使用模型建议的比赛
  gamesWithCoachStrategy,    // 教练自主决策的比赛
  '模型策略',
  '教练决策'
);

// 输出:
// - 胜率对比
// - 统计显著性 (P值)
// - 置信度
// - 建议结论
```

**文件**: 
- `lib/analytics/backtesting-engine.ts`
- `lib/analytics/backtest-demo.ts` (演示脚本)

---

## 可视化展示

**页面**: `/analytics/portfolio`

展示内容：
1. **协方差矩阵热力图** - 红色正相关，青色负相关
2. **有效阵容前沿** - 风险和收益的平衡曲线
3. **最优阵容推荐** - 风险调整后最优的6人组合
4. **对冲分析** - 最佳对冲组合与高风险组合
5. **回测统计** - 滚动回测胜率、夏普提升、质量优势
6. **A/B测试结果** - 模型 vs 教练的统计对比

---

## 使用示例

### 1. 计算协方差矩阵

```typescript
import { buildCovarianceMatrix } from '@/lib/analytics/portfolio-optimization';

const matrix = buildCovarianceMatrix(roster);

// matrix[i][j] 包含:
// - covariance: 协方差
// - correlation: 相关系数 [-1, 1]
// - sampleSize: 共同出场样本数
```

### 2. 寻找最优阵容

```typescript
import { findOptimalLineup } from '@/lib/analytics/portfolio-optimization';

const optimal = findOptimalLineup(roster, covarianceMatrix, {
  riskTolerance: 'balanced',  // conservative | balanced | aggressive
  positionConstraints: {
    setter: [1, 1],
    outside: [1, 2],
    opposite: [0, 1],
    middle: [2, 3],
    libero: [1, 1],
  },
});

console.log(optimal.sharpeRatio);      // 组合夏普比率
console.log(optimal.volatility);       // 组合波动率
console.log(optimal.diversificationRatio); // 分散化比率
```

### 3. 运行回测

```typescript
import { runWalkForwardBacktest } from '@/lib/analytics/backtesting-engine';

const summary = runWalkForwardBacktest(roster, gameResults, {
  lookbackGames: 10,  // 用前10场预测
  testGames: 5,       // 测试后5场
});

console.log(summary.modelAccuracy);      // 模型预测准确率
console.log(summary.sharpeImprovement);  // 夏普比率平均提升
console.log(summary.keyFindings);        // 关键发现
```

### 4. A/B 测试

```typescript
import { runABTest } from '@/lib/analytics/backtesting-engine';

const abTest = runABTest(
  modelStrategyGames,
  coachStrategyGames,
  '模型策略',
  '传统决策'
);

if (abTest.winner === 'A' && abTest.confidence > 90) {
  console.log('模型显著优于传统决策，建议全面采用');
}
```

---

## 关键指标解读

### 协方差矩阵
- **正相关 (红色)**: 两人表现同涨同跌，风险叠加
- **负相关 (青色)**: 两人表现此消彼长，风险对冲

### 分散化比率
- 组合波动率 / 加权个体波动率
- < 1: 分散化有效
- = 1: 无分散化效果
- > 1: 组合比个体更危险

### 夏普提升
- 正值: 模型优于实际
- > 10%: 显著提升
- > 15%: 降维打击级优势

---

## 数学附录

### 协方差计算

$$
\text{Cov}(X,Y) = \frac{1}{n} \sum_{i=1}^n (X_i - \bar{X})(Y_i - \bar{Y})
$$

### 皮尔逊相关系数

$$
\rho_{X,Y} = \frac{\text{Cov}(X,Y)}{\sigma_X \sigma_Y}
$$

### 组合夏普比率

$$
SR_p = \frac{\sum_i w_i \bar{xP}_i - R_f}{\sigma_p}
$$

---

## 验证目标

| 指标 | 目标 | 说明 |
|------|------|------|
| 夏普提升 | > 15% | AHA Moment 阈值 |
| 回测胜率 | > 60% | 模型预测准确率 |
| 统计置信度 | > 90% | P值 < 0.1 |
| 分散化评分 | > 60 | 球队整体风险分散度 |

---

> "如果你能用数据跑通回测，证明'当教练使用了你的 HIGH_BETA 换人策略时，关键局胜率提升了 15%'，这个系统就彻底封神了。"
