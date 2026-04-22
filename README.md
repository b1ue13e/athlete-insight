# Athlete Insight

训练与比赛诊断工作台。

## 当前正式入口

- 唯一正式入口：`/analysis/new`

已废弃入口：

- `/analysis/new/v2`
- `/analysis/new/mobile`

这两个旧地址已从应用路由中移除，并通过 `vercel.json` 在部署层永久重定向到 `/analysis/new`。

## 本地运行

```bash
npm install
npm run dev
```

默认访问：

- [http://localhost:3000](http://localhost:3000)

## 当前主要页面

- `/`：工作台首页
- `/analysis/new`：统一诊断入口
- `/history`：历史诊断
- `/athletes`：运动员档案
- `/settings`：设置与环境

## 技术栈

- Next.js 14
- TypeScript
- Tailwind CSS
- shadcn/ui
- Recharts
- Supabase（可选）

## 路由治理

为避免旧入口再次被引回，新增了路由治理清单：

- `docs/redirects-checklist.md`

部署层重定向配置位于：

- `vercel.json`

## 验证命令

```bash
npm run typecheck
npm run build
```

