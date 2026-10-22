# 智能图片数据提取与 Excel 导出系统 (pic2execel)

基于大模型视觉多模态能力构建的高效图片结构化识别与多 Sheet Excel 聚合导出系统。

---

## 核心功能特色

1. **三重无缝图片录入体验**：
   - **剪贴板直接粘贴**：在微信、QQ、浏览器或截屏工具中截图后，在页面任意位置直接按 `Ctrl+V`，自动识别并加入待处理队列。
   - **拖拽上传**：支持多张图片直接拖入上传区域。
   - **本地选择**：支持多选图片（JPG / PNG / WEBP，单文件 ≤ 10MB）。

2. **多图多 Sheet 聚合导出**：
   - 识别队列支持卡片缩略图预览、自由上下移动调整 Excel Sheet 顺序。
   - 点击“导出 Excel”时，将所有图片的识别表格自动按顺序分别写入同一个 `.xlsx` 文件的不同工作表（Sheet1、Sheet2...）。

3. **智能数据预览与在线纠错**：
   - 识别完成后提供交互式表格与 JSON 编辑器。
   - 导出前可自由修改单元格数据、重命名 Sheet 名称、添加/删除行与列，确保输出数据 100% 准确。

4. **独立的管理员后台 (`/admin`)**：
   - **首页严格无后台入口**，确保前台纯粹与安全隔离。
   - 包含大模型调用参数动态配置（Base URL、API Key、文本/视觉模型），支持接口脱敏展示与连通性即时测速。
   - 包含完整的用户提交记录管理、原图与识别数据对照、失败项一键重试与数据审计。

---

## 本地开发运行

```bash
# 1. 安装依赖
npm install

# 2. 启动本地开发服务 (默认端口 3000)
npm run dev

# 3. 生产打包
npm run build
npm run start
```

- 前台访问：`http://localhost:3000/`
- 后台访问：`http://localhost:3000/admin`（初始账号：`admin`，密码：`admin123`）

---

## Docker 容器化与一键部署 (pic2execel)

本系统内置经过生产实战验证的生产级多阶段 Dockerfile 及一键部署脚本：

- **镜像名称**：`pic2execel`
- **容器名称**：`pic2execel`
- **宿主机对外端口**：`7888`
- **容器内部端口**：`3000`
- **本地数据持久化目录**：`D:\docker\pic2execel\data`
- **远程数据持久化目录**：`/bak/docker/pic2execel/data`

### 1. 本地 Windows 一键部署 (`redeploy.bat`)

在 Windows 环境下双击运行根目录的 `redeploy.bat`：
1. 自动检查 Docker Desktop 是否启动及 `package-lock.json` 依赖锁文件；
2. 执行多阶段构建镜像 `pic2execel:latest`；
3. 自动停止旧容器、清理虚悬镜像；
4. 挂载数据卷 `D:\docker\pic2execel\data:/app/data` 并启动新容器；
5. 自动进行容器运行状态检测及 HTTP 200 健康探测；
6. 部署成功后，访问地址：`http://localhost:7888`。

### 2. 远程 Linux 服务器一键部署 (`upload2remote.bat`)

双击运行根目录的 `upload2remote.bat`：
1. 本地自动构建 Docker 镜像并导出为 tar 压缩包；
2. 通过 scp 自动上传镜像包至目标服务器 `172.29.173.42`（用户 `gpzx`）；
3. 远程执行 `docker load` 导入镜像；
4. 预创建挂载目录并配置读写权限，无缝重启运行容器并接入 `mynet` 网络；
5. 部署完成后，远程访问地址：`http://172.29.173.42:7888`。

### 3. 依赖锁文件与构建注意事项（重要）

- 构建采用多阶段方案，依赖按 `package-lock.json` 以 `npm ci --legacy-peer-deps` 精确安装，避免依赖版本冲突或网络中断。
- 若删除过锁文件或调整了依赖，**必须**先执行以下命令重新生成锁文件（必须带 `--legacy-peer-deps`），再运行部署脚本：
  ```bash
  npm install --legacy-peer-deps --package-lock-only
  ```
