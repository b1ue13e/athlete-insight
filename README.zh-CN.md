# Athlete Insight 中文说明

[English README](README.md) · [跑步评分开发说明](docs/running-scoring-development.md) · [路由检查清单](docs/redirects-checklist.md)

Athlete Insight 是基于 Next.js 的训练与比赛诊断工作台。它把排球、跑步和力量训练的结构化输入转换成规则评分报告，展示分数、偏差、可信度、证据和下一步建议，并连接历史、运动员档案、分享、遥测与离线草稿恢复。界面以中文和移动端为主；英文 README 与本文描述同一份代码。

新诊断的唯一正式入口是 `/analysis/new`。历史地址 `/analysis/new/v2` 与 `/analysis/new/mobile` 由 `vercel.json` 永久重定向到该入口，旧移动端路由不再作为产品入口。

## 仓库内容

- **统一诊断**：`/analysis/new` 使用 `DiagnosisFlowWorkspace`，包含快捷与专业表单。`POST /api/analyze` 校验请求后按 `sport_type` 分派到排球、跑步或力量训练分析器，返回报告与规范化报告；`GET /api/analyze` 返回功能配置。仅排球、显式请求且已配置 Kimi 时才尝试 AI 增强。
- **确定性评分**：`lib/analysis/pipeline.ts` 是统一分派层。`lib/scoring/running/` 包含单次评分、可信度、模板、周分析、文件解析和报告适配；`lib/scoring/gym/` 包含单次评分、周训练块、中周期及可选高级洞察；`lib/mock-analysis.ts` 与 `lib/report-engine.ts` 支撑排球路径。
- **工作台页面**：`/` 是运动员首页，`/history` 查看历史诊断，`/athletes` 管理档案，`/settings` 查看设置，`/analysis/detail` 展示报告，`/analysis/[id]` 及其 `/v2` 子页提供报告视图。`/running`、`/gym`、`/analysis/running/weekly`、`/analysis/new/running/import` 和 `/telemetry/running` 提供分项入口。
- **分享与离线**：`/share/player-card` 和 `components/share-cards/` 生成球员卡；`lib/offline-storage.ts` 用 IndexedDB 保存草稿、待同步报告、同步队列和设置；`/offline` 是离线页。`public/manifest.json`、`public/sw.js` 与 `components/pwa/` 提供 PWA 安装和草稿恢复入口。
- **验证与演示**：`/validation`、`/validation/ai-eval`、`/validation/coach-form` 是评估视图；`/demo`、`/demo/running`、`/plg-demo` 与 `/api/mock` 提供演示数据。`tests/` 包含跑步、力量训练和排球回归夹具。

Supabase 是可选依赖。`lib/supabase-client.ts` 与 `lib/supabase-storage.ts` 在缺少 `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY` 时返回会给出明确错误的模拟客户端，因此构建不依赖真实凭据；登录与云存储仍需真实配置。`KIMI_API_KEY` 和 `KIMI_API_BASE_URL` 用于可选排球报告增强。不要把真实密钥提交到 Git。

## 本地运行

需要 Node.js 和 npm，在仓库根目录执行：

```bash
npm install
cp .env.example .env.local
npm run dev
```

打开 <http://localhost:3000>，从 `/analysis/new` 开始新建诊断。项目使用 Next.js 14、React 18、TypeScript、Tailwind CSS、Radix/shadcn 风格组件、Recharts、Zod 和可选 Supabase；`capacitor.config.ts` 提供 Android 目标配置。

`next.config.js` 为 Capacitor/静态托管设置了 `output: "export"`、`distDir: "dist"` 和 `trailingSlash: true`，因此 `npm run build` 生成静态导出；`npm run dev` 是交互式开发入口。`vercel.json` 单独声明 Next.js 构建、`outputDirectory: ".next"` 和历史路由重定向。部署前应核对目标平台采用哪套构建产物。

## 典型流程

1. 打开 `/analysis/new`，选择运动项目与对象，填写比赛统计或跑步/力量训练记录。
2. 表单或分析管线调用评分引擎。报告展示总分、分项、偏差、可信度和下次训练建议；高级生理洞察仅用于解释，不决定主评分。
3. 从 `/analysis/detail` 或报告子页查看结果，通过 `/history` 回看，用周分析和遥测页做长期复盘。网络中断时，录入草稿由浏览器本地恢复。

`POST /api/analyze` 接收 `{ "sport_type": "volleyball" | "running" | "gym", "data": { ... } }`，可选 `enhance_with_ai`；输入不合法时返回 HTTP 400 和校验详情。`GET /api/mock` 返回模拟会话，`POST /api/mock` 创建一条本地测试数据，该路由明确标注为开发辅助接口。

## 结构

```text
app/(dashboard)/、app/analysis/、app/athletes/  页面与布局
app/api/analyze/、app/api/mock/                 API 路由
components/dashboard/、report/、running/        界面、报告与加载状态
contexts/auth-context.tsx                      可选 Supabase 登录上下文
lib/analysis/                                  请求契约、管线与会话存储
lib/scoring/running/、gym/、registry.ts         确定性评分模块
lib/offline-storage.ts、components/offline/     IndexedDB 与草稿恢复
lib/supabase-client.ts、supabase-storage.ts     可选云端登录/存储
tests/、scripts/run-tests.cjs                   轻量 TypeScript 测试执行器
public/manifest.json、public/sw.js               PWA 资源
```

`scripts/run-tests.cjs` 用项目内 TypeScript 编译器转译 `tests/` 下的 `.test.ts`，把 `@/` 解析到仓库根目录并依次执行收集的用例。跑步与力量训练主评分是确定性的，可选 AI 增强不参与主分。模块契约与夹具要求见 [跑步评分开发说明](docs/running-scoring-development.md)、[GYM-SCORE-V1-README.md](GYM-SCORE-V1-README.md) 和 [RUNNING-SCORE-V1-README.md](RUNNING-SCORE-V1-README.md)。

## 检查与路由治理

```bash
npm run typecheck
npm test
npm run test:running
npm run test:gym
npm run build
```

`docs/redirects-checklist.md` 记录保持 `/analysis/new` 为唯一正式入口所需的代码、部署与文档检查。[OFFLINE-DATA-SAFETY.md](OFFLINE-DATA-SAFETY.md) 描述本地草稿行为，[AUTH-INTEGRATION.md](AUTH-INTEGRATION.md) 说明可选登录，[PWA-SETUP.md](PWA-SETUP.md) 说明安装资源，[DEPLOYMENT.md](DEPLOYMENT.md) 是保留未完成勾选项的部署清单。多份 `P0-*`、`P1-*`、`RUNNING-*`、`VALIDATION.md` 与 `TELEMETRY.md` 是分阶段实现记录；判断功能是否已交付时应核对当前代码与测试。

本文记录当前默认分支的仓库状态，不宣称托管服务、云同步、移动安装包或第三方模型接口已经上线。
