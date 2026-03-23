# Athlete Insight

AI 运动表现分析应用。用户输入运动数据后，系统输出结构化分析报告。

## 产品简介

把训练数据，变成真正有用的结论。

输入比赛或训练数据，自动生成结构化运动表现分析报告。看清你的优势、短板和下一步训练方向。

**核心设计**：面向运动表现诊断的、可校准的规则-解释混合系统

---

## 核心特性

### 1. 四维评分系统 v2.0

- **得分贡献** (35%): 进攻、发球、拦网效率
- **失误控制** (30%): 各类失误率控制
- **稳定性** (20%): 一传到位率、失误密度
- **关键分表现** (15%): 局末关键球处理

### 2. 位置感知评分

不同位置使用不同权重模板：
- **主攻**: 进攻权重 70%
- **副攻**: 拦网 35% + 快攻 50%
- **二传**: 稳定性权重最高
- **接应**: 进攻和稳定性并重
- **自由人**: 一传 80%，无进攻统计

### 3. 数据完整度与置信度

- 缺失关键字段时降低对应维度权重
- 整体置信度分数 (0-100)
- 低置信度时显著警告
- 区分"表现分"和"报告可信度"

### 4. 评分引擎版本化

- 版本号: `2.0.0-t1`
- 历史趋势自动检测跨版本
- Breaking changes 警告
- 防止"人没变，公式变了"的误判

### 5. 人工金标准验证

- 真人标注数据集
- 自动对比验证
- 一致性指标追踪
- 从"内部自洽"走向"外部有效"

### 6. 回归测试 CI

- 10份评估基准自动测试
- 位置公平性测试
- 分数漂移检测
- PR 自动阻断机制

---

## 快速开始

```bash
cd athlete-insight
npm install
npm run dev
```

访问 http://localhost:3000

---

## 项目结构

```
lib/
├── scoring-engine.ts        # 评分引擎 v2.0（核心）
├── scoring-version.ts       # 版本化系统
├── mock-analysis.ts         # 分析逻辑
├── evaluation-benchmark.ts  # 10份评估基准
├── regression-test.ts       # 回归测试
├── gold-standard.ts         # 人工金标准
├── schemas.ts               # Zod 校验
└── sample-*.ts              # 样例数据

.github/workflows/
├── regression-test.yml      # 回归测试 CI
└── ci.yml                   # 基础 CI
```

---

## 可信度系统

### 置信度等级

| 分数 | 等级 | 说明 |
|------|------|------|
| 80-100 | 高 | 数据完整，判断可靠 |
| 60-79 | 中 | 基本可信，部分维度受限 |
| 0-59 | 低 | 数据不足，仅供参考 |

### 前台展示

```
综合评分 76
可信度 中 (65)

数据完整度: 中 | 置信度: 中
引擎版本: 2.0.0-t1 | 位置模板: 主攻
```

### 低置信度警告

```
⚠️ 数据完整度不足
当前报告可信度较低，部分判断可能不够准确。
建议补充更多比赛数据后重新分析。
```

---

## 验证与校准

### 人工金标准

```typescript
import { runGoldStandardValidation } from "@/lib/gold-standard"

const { results, summary } = runGoldStandardValidation()

// 一致性指标
summary.rating_accuracy      // 整体评级准确率
summary.strength_accuracy    // 优点识别准确率
summary.weakness_accuracy    // 问题识别准确率
summary.tag_validity         // 标签合理性
summary.avg_consistency      // 平均一致度
```

### 回归测试

```typescript
import { runRegressionTest } from "@/lib/regression-test"

const result = runRegressionTest()
console.log(result.summary)

// 未通过时 result.passed = false
```

### CI 自动运行

修改评分引擎相关文件时自动触发：
- 评估基准测试
- 位置公平性测试
- 分数漂移检测
- 金标准验证

---

## 版本历史

### v2.0.0-t1 (2026-03-23)
- 四维子评分模型
- 位置感知权重
- 数据完整度影响
- 评分引擎版本化
- 人工金标准系统
- 回归测试 CI

---

## 外部校准指南

见 [VALIDATION.md](./VALIDATION.md)

核心目标：
> 系统的判断，必须与真实教练/真实训练场景一致。

下一步：
1. 收集 20-30 份真人标注
2. 验证系统与人工判断的重合度
3. 根据反馈校准评分逻辑

---

## 技术栈

- Next.js 14 + TypeScript
- Tailwind CSS + shadcn/ui
- Recharts 图表
- Zod 数据校验
- Supabase 数据库

---

## 核心文件

| 文件 | 说明 |
|------|------|
| `scoring-engine.ts` | 评分引擎核心，含数据完整度逻辑 |
| `scoring-version.ts` | 版本化管理 |
| `gold-standard.ts` | 人工标注与验证 |
| `regression-test.ts` | 自动回归测试 |
| `evaluation-benchmark.ts` | 10份评估基准 |

---

## 下一步

- [ ] 收集真人标注数据
- [ ] 验证外部有效性
- [ ] 根据反馈校准
- [ ] 接入 Kimi API（文案增强）
- [ ] 扩展跑步/健身模板

---

**当前版本**: v2.0.0-t1  
**置信度系统**: 数据完整度感知  
**验证状态**: 待外部校准  
**最后更新**: 2026-03-23
