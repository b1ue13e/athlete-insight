# PWA 配置说明

## 当前状态

PWA 仍然启用，但快捷方式和入口语义已经统一。

## 入口规则

正式诊断入口只有：

- `/analysis/new`

因此 PWA 快捷方式应指向：

- 新建诊断：`/analysis/new`
- 历史记录：`/history`

不应再指向：

- `/analysis/new/mobile`
- `/analysis/new/v2`

## 已完成内容

### 1. Manifest

- 应用名称、描述、主题色
- 图标配置
- 快捷方式
- standalone 启动方式

### 2. Service Worker

- 缓存核心资源
- 离线回退
- 支持后续同步扩展

### 3. 离线页

- `app/offline/page.tsx`

离线页中的“继续录入”也应统一回到：

- `/analysis/new`

## 发布前检查

- [ ] Manifest 快捷方式未指向旧入口
- [ ] 离线页未指向旧入口
- [ ] 文档未再说明旧入口
- [ ] Vercel redirect 已覆盖历史地址

更多检查项见：

- `docs/redirects-checklist.md`

