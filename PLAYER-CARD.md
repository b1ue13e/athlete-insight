# 高端球星卡系统文档

> 硬核算法的面子工程 —— 让数据成为值得分享的社交货币

---

## 核心理念

> "算法算得再准，如果没有一个极致的视觉载体让用户去装逼、去分享，那数据的价值就只发挥了一半。"

球星卡不是简单的截图，而是：
- **身份象征**：展示运动表现的数字图腾
- **社交货币**：值得发朋友圈的炫耀资本
- **记忆载体**：记录高光时刻的可视化纪念

---

## 四步工程架构

### 第一步：视觉风格 —— 从"数据表"到"图腾"

**设计风格**：暗色赛博 (Dark Cyber) + 极简工业 (Minimal Industrial)

| 元素 | 设计 | 代码 |
|------|------|------|
| 背景 | 深灰色 + 几何网格纹理 | `bg-zinc-950` + SVG pattern |
| 边框 | 硬朗直角，无圆角 | `border-2` + 无 `rounded` |
| 字体 | Monospace数字 + 黑体Sans名字 | `font-mono` + `font-black` |
| 稀有度 | 评分决定颜色等级 | 90+=琥珀金, 80+=青蓝, 70+=紫 |

**稀有度等级**:
```
LEGENDARY (90+)  → 琥珀金 #f59e0b
ELITE (80-89)    → 青蓝 #22d3ee
RARE (70-79)     → 紫色 #a855f7
STANDARD (<70)   → 灰白 #a1a1aa
```

---

### 第二步：前端图片处理 —— 拒绝拉伸与巨型文件

**技术栈**: `react-easy-crop`

**交互流程**:
```
1. 点击头像区域
   ↓
2. 弹出 Modal 对话框
   ↓
3. react-easy-crop 加载
   - 强制比例 (排球 3:4, 跑步 1:1)
   - 缩放/移动调整
   ↓
4. 确认裁剪
   - 前端压缩至 1200px 宽度
   - 转换为 WebP 格式
   - 生成 Base64 预览
```

**核心代码**:
```typescript
<Cropper
  image={imageSrc}
  aspect={3 / 4}        // 强制竖图比例
  crop={crop}
  zoom={zoom}
  onCropChange={setCrop}
  onZoomChange={setZoom}
  onCropComplete={onCropComplete}
/>
```

**压缩策略**:
```typescript
// 裁剪后压缩
if (pixelCrop.width > maxWidth) {
  const scale = maxWidth / pixelCrop.width
  canvas.width = maxWidth
  canvas.height = pixelCrop.height * scale
}
// 输出 WebP，质量 0.9
return canvas.toDataURL('image/webp', 0.9)
```

---

### 第三步：服务端存储 —— Supabase Storage

**架构设计**:

```
❌ 错误：Base64 存数据库 → 撑爆 DB，查询龟速
✅ 正确：Object Storage → 关系型 DB 只存 URL
```

**存储桶配置**:
```typescript
const BUCKET_NAME = "player-photos"

// 创建公开 Bucket
supabase.storage.createBucket(BUCKET_NAME, {
  public: true,
  fileSizeLimit: 2 * 1024 * 1024,  // 2MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
})
```

**路径规划**:
```
/users/{user_id}/{analysis_id}/{timestamp}.webp

示例：
/users/user-abc123/analysis-xyz789/1712345678901.webp
```

**上传流程**:
```typescript
// 1. 前端生成裁剪后的 Blob
const croppedImage = await getCroppedImg(imageSrc, pixelCrop)

// 2. 上传到 Supabase Storage
const { data, error } = await supabase.storage
  .from(BUCKET_NAME)
  .upload(filePath, file, { upsert: true })

// 3. 获取公开 URL
const { data: { publicUrl } } = supabase.storage
  .from(BUCKET_NAME)
  .getPublicUrl(filePath)

// 4. URL 存入数据库
UPDATE analyses SET player_photo_url = publicUrl WHERE id = analysis_id
```

---

### 第四步：Canvas 高清生成

**核心痛点**: Retina 屏幕下 Canvas 模糊

**解决方案**: `html-to-image` + 强制 pixelRatio

```typescript
import { toPng } from 'html-to-image'

const handleDownload = async () => {
  const dataUrl = await toPng(cardRef.current, {
    cacheBust: true,
    pixelRatio: 3,              // 3倍分辨率
    backgroundColor: '#09090b', // 确保背景色
    quality: 1,
  })
  
  // 下载
  const link = document.createElement('a')
  link.download = '球星卡.png'
  link.href = dataUrl
  link.click()
}
```

**效果对比**:
| 设置 | 输出尺寸 | 清晰度 |
|------|----------|--------|
| pixelRatio: 1 | 400x560 | 普通屏可用 |
| pixelRatio: 2 | 800x1120 | Retina清晰 |
| pixelRatio: 3 | 1200x1680 | 4K屏可用 |

---

## 文件清单

```
components/share-cards/
  player-card-v2.tsx      # 球星卡组件 + 裁剪模态框

lib/
  supabase-storage.ts     # Storage 上传/下载/管理

app/share/player-card/
  page.tsx                # 球星卡生成页面

PLAYER-CARD.md            # 本文档
```

---

## 使用方式

### 1. 基础使用

```tsx
import { PlayerCardV2 } from "@/components/share-cards/player-card-v2"

<PlayerCardV2
  data={{
    athleteName: "张三",
    position: "主攻",
    matchName: "联赛第8轮",
    date: "2024.03.15",
    overallScore: 87,
    subScores: { scoring: 89, errorControl: 82, stability: 85, clutch: 88 },
    photoUrl: "https://...",
    highlight: { metric: "关键分胜率", value: "92%", context: "击败同位置92%球员" },
    brand: "ATHLETE INSIGHT"
  }}
  onPhotoChange={(url) => savePhoto(url)}
/>
```

### 2. 访问球星卡生成器

```
http://localhost:3000/share/player-card
```

### 3. 完整流程演示

```
1. 用户上传照片
   ↓
2. react-easy-crop 裁剪 (3:4比例)
   ↓
3. 前端压缩至 1200px，转 WebP
   ↓
4. 上传到 Supabase Storage
   ↓
5. 获取公开 URL，显示预览
   ↓
6. 用户点击下载
   ↓
7. html-to-image 生成 3x 高清图
   ↓
8. 保存到本地/分享朋友圈
```

---

## 技术特性

| 特性 | 实现 | 效果 |
|------|------|------|
| 智能裁剪 | react-easy-crop | 用户可缩放/移动调整构图 |
| 前端压缩 | Canvas API | 拒绝几MB原图，控制体积 |
| 云端存储 | Supabase Storage | 可靠、快速、公开访问 |
| 高清导出 | html-to-image 3x | 4K屏也清晰 |
| 格式优化 | WebP | 体积减小 30-50% |

---

## 设计细节

### 卡片布局

```
┌─────────────────────────┐ ← 顶部装饰条（稀有度颜色）
│  BRAND      LEGENDARY   │ ← 品牌 + 稀有度标签
│                         │
│    ┌─────────────┐      │
│    │             │      │
│    │    照片     │      │ ← 照片区域（占主导）
│    │             │      │
│    │   [上传]    │      │
│    └─────────────┘      │
│                         │
│  主攻                   │ ← 位置标签
│  张三                   │ ← 球员名字（极粗黑体）
│  联赛第8轮 · 2024.03.15 │
│                         │
│  87                     │ ← 总体评分（大数字）
│  OVR                    │
│                         │
│  89  82  85  88         │ ← 四维评分（底部蒙层）
│  得分 失误 稳定 关键      │
│                         │
└─────────────────────────┘ ← 底部角落装饰
```

### 颜色系统

```css
/* 背景 */
bg-zinc-950          /* 主背景 */
bg-zinc-900          /* 卡片背景 */

/* 边框 */
border-amber-500/30  /* LEGENDARY */
border-cyan-500/30   /* ELITE */
border-purple-500/30 /* RARE */
border-slate-500/30  /* STANDARD */

/* 文字 */
text-white           /* 主要文字 */
text-zinc-400        /* 次要文字 */
text-zinc-600        /* 辅助文字 */
```

---

## 关键提醒

> "外行人觉得加个上传很难，内行人都知道难点在于如何让用户裁剪得爽，并且存下来的图片既小又清晰。"

**必须做的**:
- ✓ 强制裁剪比例，避免拉伸变形
- ✓ 前端压缩，控制文件大小
- ✓ Object Storage 存储，不塞爆数据库
- ✓ 3x pixelRatio，确保高清输出

**绝不能做的**:
- ✗ 直接存 Base64 到数据库
- ✗ 不压缩原图直接上传
- ✗ 圆角设计（失去硬朗感）
- ✗ 忽略 Retina 屏幕清晰度

---

## 下一步

1. 访问 `/share/player-card` 体验完整流程
2. 上传你的照片生成球星卡
3. 下载高清图分享到朋友圈
4. 收集用户反馈优化设计

> "让算法成为面子，让球星卡成为里子。"
