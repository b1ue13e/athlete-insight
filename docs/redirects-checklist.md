# rewrites / redirects 检查清单

用于避免旧路由被重新引回项目。

## 当前正式入口基线

当前只保留以下正式入口：

- `/analysis/new`

以下地址视为历史地址，只允许通过部署层 redirect 兼容：

- `/analysis/new/v2`
- `/analysis/new/mobile`

## 代码层检查

提交前确认：

- [ ] `app/`、`components/`、`lib/` 内没有直接链接到 `/analysis/new/v2`
- [ ] `app/`、`components/`、`lib/` 内没有直接链接到 `/analysis/new/mobile`
- [ ] 没有新增 `?sport=volleyball`、`?mode=quick`、`?mode=professional` 这类重新制造分支入口的链接
- [ ] 所有“新建诊断”入口统一指向 `/analysis/new`

建议搜索：

```bash
Get-ChildItem app,components,lib -Recurse -File |
  Select-String -Pattern '/analysis/new/v2|/analysis/new/mobile|analysis/new\\?sport=|analysis/new\\?mode='
```

## 应用路由检查

- [ ] `app/analysis/new/v2/` 不再存在页面文件
- [ ] `app/analysis/new/mobile/` 不再存在页面文件
- [ ] 正式 UI 只在 `/analysis/new` 维护

## 部署层检查

检查 `vercel.json`：

- [ ] `/analysis/new/v2` → `/analysis/new`
- [ ] `/analysis/new/v2/:path*` → `/analysis/new`
- [ ] `/analysis/new/mobile` → `/analysis/new`
- [ ] `/analysis/new/mobile/:path*` → `/analysis/new`

## 文档检查

- [ ] README 只写 `/analysis/new` 为正式入口
- [ ] PWA 文档不再引用旧入口
- [ ] 离线文档不再引用旧入口
- [ ] 实现总结类文档不再把旧入口写成正式页面

## 发布前验证

```bash
npm run typecheck
npm run build
```

以及线上验证：

- [ ] 打开 `/analysis/new/v2` 会跳转到 `/analysis/new`
- [ ] 打开 `/analysis/new/mobile` 会跳转到 `/analysis/new`
- [ ] 首页、离线页、详情页里的“新建诊断”都回到 `/analysis/new`

