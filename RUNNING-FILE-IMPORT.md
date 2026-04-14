# Running Score v1.0 - 文件导入文档

## 支持的文件格式

### 1. GPX (GPS Exchange Format)
- **扩展名**: `.gpx`
- **支持设备**: Garmin、Suunto、Coros、Apple Watch（第三方应用）等
- **包含数据**: GPS轨迹、海拔、时间戳
- **扩展数据**: 心率、步频（取决于设备和应用）

### 2. TCX (Training Center XML)
- **扩展名**: `.tcx`
- **支持设备**: Garmin 系列（Garmin Connect 导出）
- **包含数据**: GPS轨迹、心率、步频、距离、海拔
- **优势**: 数据更完整，通常包含更多元数据

### 3. FIT (Flexible and Interoperable Data Transfer)
- **扩展名**: `.fit`
- **支持设备**: Garmin、Suunto 等原生格式
- **状态**: ⚠️ 当前版本暂不支持（需要专用解码库）
- **建议**: 通过设备厂商应用导出为 GPX 或 TCX

## 如何导出文件

### Garmin Connect
1. 登录 [Garmin Connect](https://connect.garmin.com)
2. 找到要导出的活动
3. 点击右上角齿轮图标 → "Export Original"
4. 或在活动详情页 → "Export to GPX"

### Suunto App
1. 打开 Suunto App
2. 找到要导出的运动记录
3. 点击分享图标 → "导出 GPX"

### Coros App
1. 打开 Coros App
2. 进入运动记录详情
3. 点击右上角菜单 → "导出数据"
4. 选择 GPX 格式

### Apple Watch
- 使用第三方应用如 WorkOutDoors、iSmoothRun 导出 GPX
- 或通过 HealthFit 等应用同步到 Strava 后导出

## 导入流程

```
1. 上传文件
   ↓
2. 自动解析（检测格式、提取数据）
   ↓
3. 数据预览（距离、时长、配速、心率）
   ↓
4. 手动调整（训练类型、目标、感受）
   ↓
5. 生成 Running Score 分析
   ↓
6. 保存到数据库
```

## 数据映射

| 文件数据 | Running Score 字段 | 说明 |
|----------|-------------------|------|
| 时间戳 | `durationMin` | 计算总时长 |
| 距离 | `distanceKm` | 总距离（公里）|
| 配速 | `avgPaceSec` | 平均配速（秒/公里）|
| 分段配速 | `splits` | 每公里配速数组 |
| 心率 | `avgHeartRate` / `maxHeartRate` | 心率统计 |
| 心率区间 | `heartRateZones` | 各区间停留时间 |
| GPS轨迹 | `dataFlags.hasGPS` | 标记有GPS数据 |

## 自动训练类型检测

系统会根据以下特征自动推测训练类型：

| 检测规则 | 识别类型 | 置信度 |
|----------|----------|--------|
| 距离 ≥ 15km | 长距离 (long) | 85% |
| 平均心率 > 88% 最大心率 | 间歇跑/比赛 (interval/race) | 80% |
| 平均心率 80-88% 最大心率 | 节奏跑 (tempo) | 75% |
| 平均心率 < 65% 最大心率 | 恢复跑 (recovery) | 75% |
| 配速变异系数 > 15% | 间歇跑 (interval) | 70% |
| 默认 | 轻松跑 (easy) | 50% |

用户可以在预览页面手动修改识别结果。

## 数据质量检查

导入时会进行以下检查：

### ⚠️ 警告提示
- **距离过短** (< 1km): 可能不是完整记录
- **时长过短** (< 5分钟): 可能不是有效训练
- **配速异常** (< 2:00/km): 数据可能有误
- **缺少心率**: 降级为仅基于配速的分析

### ✅ 理想数据
- 完整 GPS 轨迹
- 连续心率数据
- 准确的距离记录
- 合理的配速分布

## 文件大小限制

- **建议大小**: < 5MB
- **典型 GPX**: 1-2MB（10km 跑步）
- **典型 TCX**: 2-3MB（10km 跑步）

文件过大可能导致浏览器解析缓慢，建议压缩或分段导入。

## 常见问题

### Q: 导入失败，提示"无法识别的文件格式"
A: 确保文件扩展名是 .gpx 或 .tcx，且文件内容未损坏。尝试用文本编辑器打开查看是否包含 `<gpx` 或 `<TrainingCenterDatabase` 标签。

### Q: 心率数据没有导入
A: 检查原始文件是否包含心率数据。某些设备导出 GPX 时默认不包含心率，需要在导出设置中启用。

### Q: 距离/配速与手表显示不一致
A: 可能是 GPS 漂移导致的计算误差。系统会基于轨迹点重新计算距离，可能与设备算法略有不同。

### Q: 支持批量导入吗？
A: 当前版本暂不支持，后续版本计划添加批量导入功能。

### Q: FIT 文件什么时候支持？
A: FIT 格式需要专用解码库，会增加 bundle 大小。建议先通过 Garmin Connect 等转换为 GPX/TCX。

## 技术实现

### 核心函数

```typescript
// 解析文件
const result = await parseActivityFile(file)

// 检测格式
const format = detectFileFormat(filename, content)

// 解析 GPX
const result = parseGPX(gpxContent)

// 解析 TCX
const result = parseTCX(tcxContent)

// 转换为 Running Score 输入
const preview = convertToRunningInput(parsedActivity)
```

### 数据计算

- **距离**: 使用 Haversine 公式计算 GPS 点间距离
- **配速**: 时间差 / 距离差（过滤异常值）
- **分段**: 按每公里累计距离截取
- **心率区间**: 基于最大心率百分比计算停留时间

## 隐私说明

- 文件解析在浏览器本地完成，不会上传到服务器
- 只有解析后的训练数据会保存到 Supabase
- GPS 坐标数据用于计算距离和配速，不会被长期存储
