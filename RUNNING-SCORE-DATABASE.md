# Running Score v1.0 数据库文档

## 概述

Running Score v1.0 使用 Supabase 作为数据存储，包含以下核心表：

## 数据库表结构

### 1. analysis_sessions（核心会话表）

存储所有运动类型的分析会话基本信息。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| athlete_id | uuid | 关联运动员ID |
| sport_type | text | 运动类型：'running' |
| title | text | 会话标题 |
| session_date | date | 训练日期 |
| status | text | 状态：draft/processing/completed/failed |
| input_method | text | 输入方式：manual/watch/imported |
| raw_input | jsonb | 原始输入数据（RunningSessionInput）|
| derived_metrics | jsonb | 派生指标 |
| overall_score | numeric | 综合评分 0-100 |
| report_json | jsonb | 完整报告（RunningScoreReport）|
| summary_text | text | 一句话总结 |
| model_version | text | 评分引擎版本 |

### 2. running_inputs（跑步输入详情表）

存储跑步训练的详细输入数据。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| analysis_session_id | uuid | 关联会话ID |
| training_type | text | 训练类型：easy/tempo/interval/long/recovery/race |
| goal_type | text | 目标类型：5k/10k/half/marathon/fatloss/base |
| distance_km | numeric | 距离（公里）|
| duration_seconds | integer | 时长（秒）|
| avg_pace_seconds | integer | 平均配速（秒/公里）|
| avg_heart_rate | integer | 平均心率 |
| max_heart_rate | integer | 最大心率 |
| splits | integer[] | 分段配速数组 |
| rpe | integer | 自觉强度 1-10 |
| feeling | text | 身体感受 |
| source | text | 数据来源：manual/watch/imported/strava |
| has_gps | boolean | 是否有GPS数据 |
| has_heartrate | boolean | 是否有心率数据 |
| is_complete | boolean | 是否完整完成 |

### 3. running_analysis_results（评分结果表）

存储 Running Score v1.0 的详细评分结果。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| analysis_session_id | uuid | 关联会话ID |
| completion_score | numeric | 完成度评分 |
| rhythm_score | numeric | 节奏控制评分 |
| load_score | numeric | 负荷质量评分 |
| value_score | numeric | 目标价值评分 |
| overall_score | numeric | 综合评分 |
| deviations | jsonb | 偏差识别数组 |
| primary_deviation_type | text | 主要偏差类型 |
| confidence_score | numeric | 可信度分数 |
| confidence_level | text | 可信度等级：high/medium/low |
| summary_oneliner | text | 一句话总结 |
| summary_praised | text | 最值得肯定的一点 |
| summary_fix | text | 最需要修正的一点 |
| summary_next_advice | text | 下次训练建议 |
| engine_version | text | 引擎版本 |

### 4. running_weekly_blocks（周训练块表）

存储周训练块的聚合分析数据。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| athlete_id | uuid | 运动员ID |
| user_id | uuid | 用户ID |
| week_start | date | 周开始日期 |
| week_end | date | 周结束日期 |
| total_distance_km | numeric | 总距离 |
| total_duration_min | integer | 总时长（分钟）|
| sessions_count | integer | 训练次数 |
| easy_percent | numeric | 轻松跑占比 |
| hard_percent | numeric | 高强度占比 |
| long_run_completed | boolean | 长距离是否完成 |
| fatigue_risk | text | 疲劳风险：low/moderate/high |
| most_effective_session | text | 最有效训练描述 |
| biggest_issue | text | 最大问题 |
| next_week_advice | text[] | 下周建议数组 |
| session_ids | uuid[] | 关联会话ID数组 |

## 数据库迁移

### 应用迁移

```bash
# 使用 Supabase CLI
supabase db push

# 或在 SQL 编辑器中手动执行
# 文件：supabase/migrations/002_running_score_v1.sql
```

### 迁移文件说明

- `001_initial_schema.sql` - 初始数据库结构（包含排球、跑步基础表）
- `002_running_score_v1.sql` - Running Score v1.0 扩展
  - 扩展 `running_inputs` 表字段
  - 创建 `running_analysis_results` 表
  - 创建 `running_weekly_blocks` 表
  - 添加 RLS 安全策略
  - 添加性能标签数据

## 数据访问层 API

### 单次训练操作

```typescript
import { 
  saveRunningSession,
  getRunningSessions,
  getRunningSessionDetail,
  deleteRunningSession 
} from "@/lib/scoring/running"

// 保存训练记录
const result = await saveRunningSession(userId, athleteId, input, report)

// 获取训练列表
const sessions = await getRunningSessions(athleteId, limit, offset)

// 获取训练详情
const detail = await getRunningSessionDetail(sessionId)

// 删除训练记录
await deleteRunningSession(sessionId)
```

### 周训练块操作

```typescript
import { 
  saveWeeklyBlock,
  getWeeklyBlocks,
  getWeeklyBlock 
} from "@/lib/scoring/running"

// 保存周训练块
await saveWeeklyBlock(userId, athleteId, weeklyBlock)

// 获取周训练块列表
const blocks = await getWeeklyBlocks(athleteId)

// 获取特定周
const block = await getWeeklyBlock(athleteId, weekStart)
```

### 统计数据

```typescript
import { getRunningStats } from "@/lib/scoring/running"

const stats = await getRunningStats(athleteId)
// 返回：总次数、总距离、总时长、平均分、连续周数、周均次数
```

## RLS 安全策略

所有表都启用了 Row Level Security (RLS)：

- **用户只能访问自己的数据**
- 通过 `user_id` 或 `athlete_id` 关联进行权限控制
- 写入操作会验证用户所有权

## 性能标签

系统预定义了以下跑步相关标签：

| 标签代码 | 名称 | 类别 |
|----------|------|------|
| RUN_EASY_TOO_FAST | 轻松跑太快 | 强度控制 |
| RUN_TEMPO_FADE | 节奏跑掉速 | 配速控制 |
| RUN_INTERVAL_BLOW | 间歇失控 | 配速控制 |
| RUN_LONG_FADE | 长距离掉速 | 耐力 |
| RUN_RECOVERY_HARD | 恢复跑太拼 | 强度控制 |
| RUN_PACE_STABLE | 配速稳定 | 节奏控制 |
| RUN_HR_CONTROL | 心率控制好 | 有氧基础 |
| RUN_COMPLETION_PERFECT | 完成度完美 | 执行 |
| RUN_OVERTRAINING_RISK | 过度训练风险 | 恢复 |

## 注意事项

1. **raw_input 和 report_json 字段** 存储 JSON 数据，包含完整的输入和报告信息
2. **周训练块** 使用 `UPSERT` 操作，同一运动员同一周的数据会被更新而非重复创建
3. **删除会话** 会级联删除关联的 running_inputs 和 running_analysis_results 记录
4. **统计数据计算** 在应用层完成，避免复杂的数据库查询

## 后续扩展

可能的未来优化：

- 添加数据库级别的统计视图
- 实现数据归档策略（旧数据压缩）
- 添加全文搜索支持
- 实现数据导出功能
