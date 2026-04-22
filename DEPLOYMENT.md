# 正式部署准备

## 目标

让测试用户真正可用，而不是“只是能上线”。

---

## 部署前检查清单

### 1. 域名与 HTTPS

- [ ] 已绑定正式域名
- [ ] 已在 Vercel 配置自定义域名
- [ ] 已确认 HTTPS 正常启用

### 2. 环境变量

```bash
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
```

### 3. PWA 验证

- [ ] Android Chrome 安装测试通过
- [ ] iOS Safari 安装测试通过
- [ ] 离线页可正常显示
- [ ] 图标与主题色正常

### 4. 数据与监控

- [ ] 本地 IndexedDB 正常写入
- [ ] Vercel Analytics 已启用
- [ ] 错误日志已可查看

### 5. 路由与入口

- [ ] 唯一正式诊断入口为 `/analysis/new`
- [ ] 项目内不再引用旧入口
- [ ] Vercel redirect 已覆盖历史地址

---

## 基础部署步骤

### Step 1: Vercel 项目配置

1. 连接 GitHub 仓库
2. 配置环境变量
3. 配置域名
4. 启用 HTTPS

### Step 2: 域名解析

```txt
A     @     76.76.21.21
CNAME www   cname.vercel-dns.com
```

### Step 3: 线上验证

```bash
curl -I https://yourdomain.com
curl https://yourdomain.com/manifest.json
curl https://yourdomain.com/sw.js
```

---

## Vercel redirect 变更流程

用于处理历史路由下线、正式入口收口、以及避免旧路径重新回流。

### 适用场景

当你需要：

- 删除旧页面路由
- 把多个入口收口到一个正式入口
- 替换旧路径但不想让旧链接直接 404

就应该走这一套流程。

### 标准步骤

#### 1. 先确定正式入口

先明确“唯一正式入口”是什么。

当前项目基线：

- 正式入口：`/analysis/new`

#### 2. 清理应用层引用

在改 redirect 前，先把项目内所有链接改到正式入口，避免代码继续把用户送回旧地址。

建议搜索：

```bash
Get-ChildItem app,components,lib -Recurse -File |
  Select-String -Pattern '/analysis/new/v2|/analysis/new/mobile|analysis/new\\?sport=|analysis/new\\?mode='
```

确认：

- [ ] `app/` 内无旧入口引用
- [ ] `components/` 内无旧入口引用
- [ ] `lib/` 内无旧入口引用

#### 3. 删除应用层旧路由文件

如果旧入口不再需要，就直接删除对应页面文件，不保留“第二套 UI”。

例如当前项目已经删除：

- `app/analysis/new/v2/page.tsx`
- `app/analysis/new/mobile/page.tsx`

#### 4. 在 `vercel.json` 中增加 redirect

在部署层为旧地址提供兼容跳转。

当前项目示例：

```json
"redirects": [
  {
    "source": "/analysis/new/v2",
    "destination": "/analysis/new",
    "permanent": true
  },
  {
    "source": "/analysis/new/v2/:path*",
    "destination": "/analysis/new",
    "permanent": true
  },
  {
    "source": "/analysis/new/mobile",
    "destination": "/analysis/new",
    "permanent": true
  },
  {
    "source": "/analysis/new/mobile/:path*",
    "destination": "/analysis/new",
    "permanent": true
  }
]
```

#### 5. 本地验证构建

```bash
npm run typecheck
npm run build
```

#### 6. 线上验证 redirect 行为

部署后手动验证：

- [ ] `/analysis/new/v2` 会跳到 `/analysis/new`
- [ ] `/analysis/new/mobile` 会跳到 `/analysis/new`
- [ ] 首页、离线页、详情页中的“新建诊断”都进入 `/analysis/new`

### 变更原则

- 先改内部引用，再改 redirect
- 正式入口只能有一个
- redirect 只做兼容，不应继续承载产品语义
- 任何新增入口都必须先检查是否破坏正式入口基线

### 配套检查

每次改 redirect / rewrite 后，都同步检查：

- `vercel.json`
- `docs/redirects-checklist.md`
- `README.md`
- `PWA-SETUP.md`
- `OFFLINE-DATA-SAFETY.md`

---

## 登录与数据合并原则

### 轻登录方案

建议优先使用 Magic Link。

优点：

- 不需要密码
- 不需要复杂注册流程
- 测试期阻力更低

### 本地 / 云端合并规则

1. 每条记录保留稳定本地 ID
2. 登录后优先上推本地未同步数据
3. 云端按 ID 去重
4. 草稿与正式提交状态严格区分
5. 冲突时以“最新更新时间”为准

---

## 推荐搭配文档

部署路由治理时，请同时参考：

- `docs/redirects-checklist.md`

