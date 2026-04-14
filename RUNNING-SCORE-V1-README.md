# Running Score v1.0 - 完整实现文档

## 项目概述

Running Score v1.0 是 Athlete Insight 的跑步训练分析模块，核心目标是：**判断这次训练有没有练对**。

不同于传统跑步 App 的"记录你跑了什么"，Running Score 关注的是"训练偏差识别"。

## 核心设计理念

### 与排球的区别

| 维度 | 排球 | 跑步 |
|------|------|------|
| 核心目标 | 当场表现评估 | 训练意图完成度 |
| 评分维度 | 得分/失误/稳定/关键分 | 完成度/节奏/负荷/价值 |
| 用户输入 | 技术统计数据 | 距离/时长/配速/心率 |
| 关键能力 | 位置感知 | 训练类型识别 + 偏差检测 |

### 双架构设计

```
Running Score v1.0
├── 主产品线（大众跑者）
│   ├── 单次训练分析
│   ├── 周训练块复盘
│   └── 数据存储 & 历史追踪
│
└── 高级洞察（严肃跑者）
    ├── 心率解耦分析
    ├── 乳酸阈值检测
    └── 生物力学监测
```

## 功能清单

### ✅ 已实现功能

#### 1. 单次训练分析
- [x] 四维评分系统（完成度/节奏/负荷/价值）
- [x] 训练类型识别（轻松跑/节奏跑/间歇跑/长距离/恢复跑/比赛）
- [x] 偏差识别（7种跑偏场景）
- [x] 可信度系统（数据完整度感知）
- [x] 核心建议生成（最值得肯定/最需修正）

#### 2. 周训练块分析
- [x] 数据聚合（距离/时长/次数）
- [x] 强度分布分析
- [x] 疲劳风险评估
- [x] 长距离完成检查
- [x] 周对比与趋势洞察

#### 3. 数据导入
- [x] GPX 文件解析
- [x] TCX 文件解析
- [x] 自动训练类型检测
- [x] 数据质量检查

#### 4. 数据存储
- [x] Supabase 数据库集成
- [x] 单次训练 CRUD
- [x] 周训练块存储
- [x] 统计数据查询
- [x] RLS 安全策略

#### 5. UI/UX
- [x] 手动录入表单
- [x] 文件导入界面
- [x] 单次报告页
- [x] 周复盘页
- [x] 跑步首页
- [x] 主应用导航集成

## 技术架构

```
lib/scoring/running/
├── schemas.ts              # 数据模型定义
├── templates.ts            # 训练类型/目标模板
├── engine.ts               # 核心评分引擎
├── weekly-analysis.ts      # 周训练块分析
├── advanced-bridge.ts      # 旧系统桥接
├── database.ts             # Supabase 数据访问
├── file-parser.ts          # GPX/TCX 解析
├── version.ts              # 版本管理
└── index.ts                # 统一导出

app/
├── running/page.tsx                    # 跑步首页
├── analysis/new/running/page.tsx       # 单次分析
├── analysis/new/running/import/        # 文件导入
│   └── page.tsx
└── analysis/running/weekly/            # 周复盘
    └── page.tsx

supabase/migrations/
├── 001_initial_schema.sql      # 初始数据库
└── 002_running_score_v1.sql    # Running Score 扩展
```

## 偏差识别能力

系统可以识别以下训练偏差：

| 偏差类型 | 触发条件 | 建议 |
|----------|----------|------|
| 轻松跑太快 | 灰区时间 > 5分钟 | 严格按心率跑，宁可慢不可快 |
| 节奏跑前快后崩 | 后程掉速 > 5% | 起跑保守，专注维持 |
| 间歇前面过猛 | 后程掉速 > 10% | 间歇跑要匀速 |
| 长距离掉速 | 后程掉速 > 10% | 起跑再慢10% |
| 恢复跑不够轻松 | 心率 > 70% 最大心率 | 恢复跑要比轻松跑还慢 |
| 距离不足 | 完成度 < 80% | 检查强度或计划合理性 |
| 训练提前结束 | 记录不完整 | 记录提前结束原因 |

## 文件导入支持

### 支持的格式
- **GPX** (.gpx): 通用 GPS 轨迹格式
- **TCX** (.tcx): Garmin 专用格式
- **FIT** (.fit): 暂不支持（建议转换）

### 支持的设备
- Garmin (Forerunner, Fenix 系列)
- Suunto (9, 5, 3 系列)
- Coros (PACE, APEX, VERTIX 系列)
- Apple Watch (通过第三方应用)
- 其他支持 GPX/TCX 导出的设备

## 数据库架构

### 核心表

1. **analysis_sessions** - 分析会话主表
2. **running_inputs** - 跑步输入详情
3. **running_analysis_results** - 评分结果
4. **running_weekly_blocks** - 周训练块

### 数据流

```
用户输入/GPX导入
    ↓
Running Score 引擎
    ↓
四维评分 + 偏差识别
    ↓
Supabase 存储
    ↓
历史查询/周复盘
```

## API 使用示例

### 单次训练分析

```typescript
import { calculateRunningScore, saveRunningSession } from "@/lib/scoring/running"

// 生成报告
const report = calculateRunningScore(input)

// 保存到数据库
await saveRunningSession(userId, athleteId, input, report)
```

### 文件导入

```typescript
import { parseActivityFile, convertToRunningInput } from "@/lib/scoring/running"

// 解析文件
const result = await parseActivityFile(file)

// 转换为输入格式
const preview = convertToRunningInput(result.activity)
```

### 周复盘

```typescript
import { aggregateWeeklyData, getWeeklyBlocks } from "@/lib/scoring/running"

// 聚合周数据
const weeklyBlock = aggregateWeeklyData(sessions, weekStart, weekEnd)

// 查询历史
const blocks = await getWeeklyBlocks(athleteId)
```

## 路线图

### 当前版本 (v1.0.0)
- ✅ 核心评分系统
- ✅ 文件导入
- ✅ 数据存储
- ✅ 基础 UI

### 未来计划
- [ ] FIT 文件支持
- [ ] 批量导入
- [ ] Strava API 集成
- [ ] 训练计划生成
- [ ] 伤病风险评估
- [ ] 社交分享功能

## 贡献指南

### 添加新的偏差识别规则

在 `lib/scoring/running/engine.ts` 的 `detectDeviations` 函数中添加：

```typescript
// 在 deviations 数组中添加新的检测逻辑
if (/* 你的条件 */) {
  deviations.push({
    type: "your_deviation_type",
    severity: "moderate",
    description: "问题描述",
    suggestion: "改进建议",
    affectedDimension: "rhythm",
  })
}
```

### 添加新的文件格式支持

在 `lib/scoring/running/file-parser.ts` 中添加解析函数：

```typescript
export function parseNEWFORMAT(content: string): ParseResult {
  // 实现解析逻辑
}
```

## 许可证

MIT License - 详见项目根目录 LICENSE 文件
