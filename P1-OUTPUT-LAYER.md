# P1 输出层实现总结

## 已完成能力

### 1. 报告升级 Diff

相关文件：

- `lib/report-diff.ts`
- `components/report/upgrade-banner.tsx`

### 2. 个体基线系统

相关文件：

- `lib/athlete-baseline.ts`

### 3. 训练处方模块

相关文件：

- `lib/training-prescription.ts`

## 当前页面组织

### 统一录入流程

- `/analysis/new`

### 统一诊断详情

- `/analysis/detail?id=...`

### 版本化报告页

- `/analysis/[id]/v2`

## 已移除旧录入分支

以下路径已不再作为正式入口：

- `/analysis/new/v2`
- `/analysis/new/mobile`

如需新增输出层相关页面，请先检查是否会重新引入旧录入路径。

参考：

- `docs/redirects-checklist.md`

