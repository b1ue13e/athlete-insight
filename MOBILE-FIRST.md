# 移动端场边快录专项

## 已完成

### 1. 移动端快录页面 `/analysis/new/mobile`

**专为场边场景设计**:
- 单列大按钮布局
- 一屏一个步骤，不要长表单
- 进度条显示
-  emoji + 文字的大选择按钮
- 数字输入用 `inputMode="numeric"` 调起数字键盘
- 自动保存草稿（每30秒）
- 离线检测与提示

**步骤设计**（9步，每步一个屏幕）:
1. 选择运动员 - 大卡片按钮
2. 比赛信息 - 简化输入
3. 总体表现 - 5个emoji评分
4. 得分贡献 - 5个emoji评分
5. 失误控制 - 5个emoji评分
6. 关键分 - 5个emoji评分
7. 关键数字 - 大数字输入框
8. 主要观察 - chips选择
9. 确认 - 摘要展示

### 2. 埋点系统 `lib/analytics.ts`

**追踪的关键指标**:
```typescript
// 核心漏斗
start_analysis → complete_input → open_share → submit_feedback

// 关键指标
- 录入完成率
- 分享率
- 处方反馈率
- 平均完成时长
- 退出点分布
- 模式偏好（快速/专业）
- 分享格式偏好
```

**查看数据**:
```typescript
import { getAnalyticsSummary, getDropOffPoints } from "@/lib/analytics"

const summary = getAnalyticsSummary()
console.log("完成率:", summary.rates.completion)
console.log("平均时长:", getAverageCompletionTime())
```

---

## 下一步：真人测试计划

### 测试目标
验证产品在真实场景下的可用性

### 测试对象
- 3-5名校队/院队队员
- 1-2名懂球的教练/队长

### 测试任务
每人完成 4-6 场录入，总计 20 场

### 测试流程
1. **赛前** - 简单介绍（1分钟）
2. **赛后** - 让用户自己用手机录入
3. **观察** - 记录哪里卡顿、哪里犹豫
4. **访谈** - 3个问题：
   - 录入过程顺畅吗？卡在哪一步？
   - 报告有用吗？会分享给教练吗？
   - 会第二次用吗？什么情况下会回来？

### 关键指标
| 指标 | 目标 | 测量方式 |
|-----|------|---------|
| 平均完成时长 | < 3分钟 | 埋点数据 |
| 完成率 | > 70% | 埋点数据 |
| 分享率 | > 30% | 埋点数据 |
| 第二次使用 | > 50% | 追踪回访 |

### 测试检查清单
- [ ] 找3-5个测试对象
- [ ] 准备测试指引文档
- [ ] 开启埋点收集
- [ ] 记录每场观察笔记
- [ ] 汇总数据和反馈
- [ ] 确定下一步优化点

---

## 需要补的埋点

在关键位置添加 `trackEvent`:

```typescript
// 页面切换
trackEvent("select_athlete", { athleteId: "xxx" })
trackEvent("select_mode", { mode: "quick" })
trackEvent("complete_input", { duration: 120, mode: "quick" })

// 分享
trackEvent("open_share")
trackEvent("copy_coach_summary")
trackEvent("download_card")
trackEvent("copy_social_caption")
trackEvent("download_pdf")

// 处方
trackEvent("view_prescription", { prescriptionId: "xxx" })
trackEvent("submit_feedback", { status: "completed", effect: "improved" })
```

---

## 访问地址

```
移动端快录: /analysis/new/mobile
桌面端完整: /analysis/new/v2
报告页: /analysis/[id]/v2
```

---

## 验证标准

产品真正可用的标准是：

> 比赛结束后，用户愿不愿意掏出手机，真的用它。

不是"功能完整"，而是"场边2分钟能录完"。

这才是从"作品"到"工具"的跨越。
