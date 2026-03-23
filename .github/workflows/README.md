# GitHub Actions 自动构建 APK

## 工作流说明

### 1. build-apk.yml (自动构建)
**触发条件：**
- 每次推送到 `main` 分支
- 每次对 `main` 分支发起 Pull Request
- 手动触发

**输出：**
- 自动上传到 Artifacts 的 Debug APK
- 自动创建/更新 `latest` Release 标签

### 2. build-release.yml (手动发布)
**触发条件：**
- 仅手动触发（需要输入版本号）

**输出：**
- 带版本号的 Release APK
- 创建正式的 GitHub Release

---

## 获取 APK 的两种方式

### 方式 1：自动构建（推荐测试用）

1. 推送代码到 `main` 分支
2. 等待几分钟，构建自动完成
3. 前往 GitHub → Actions → 最新构建 → Artifacts
4. 下载 `app-debug` 文件

### 方式 2：手动发布正式版

1. 前往 GitHub → Actions → "Build Release APK"
2. 点击 "Run workflow"
3. 输入版本号（如 `1.0.0`）和发布说明
4. 等待构建完成
5. 前往 Releases 页面下载

---

## 配置签名（可选）

如果要发布带签名的 APK，需要在 GitHub Secrets 中添加：

1. 生成密钥库：
```bash
keytool -genkey -v -keystore athlete-insight.keystore -alias athlete-insight -keyalg RSA -keysize 2048 -validity 10000
```

2. Base64 编码密钥库：
```bash
base64 -i athlete-insight.keystore -o keystore.base64
```

3. 在 GitHub 仓库设置中添加 Secrets：
- `KEYSTORE_BASE64`: keystore.base64 的内容
- `KEYSTORE_PASSWORD`: 密钥库密码
- `KEY_ALIAS`: 别名
- `KEY_PASSWORD`: 密钥密码

---

## 下载地址

构建完成后，APK 可以从以下位置获取：

1. **Actions Artifacts**: 每次构建的临时下载（30天过期）
2. **GitHub Releases**: 永久保存的正式版本
   - https://github.com/b1ue13e/athlete-insight/releases

---

## 故障排查

### 构建失败？

1. 检查 `package.json` 和 `package-lock.json` 是否一致
2. 确保 `next.config.js` 配置了 `output: 'export'`
3. 检查 Android 项目是否有语法错误

### 安装失败？

- Debug APK 未签名，安装时可能有安全提示
- 在 Android 设置中允许"安装未知来源应用"
- 或者配置签名密钥（见上文）
