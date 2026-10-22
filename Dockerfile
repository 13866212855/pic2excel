############################################################
# 阶段 1：构建阶段 —— 安装依赖并编译 Next.js 生产版本
############################################################
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# npm 走国内镜像 + 大幅增强网络重试，应对下载中断
ENV NPM_CONFIG_REGISTRY=https://registry.npmmirror.com \
    NPM_CONFIG_FETCH_RETRIES=8 \
    NPM_CONFIG_FETCH_RETRY_FACTOR=2 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=15000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=180000 \
    NPM_CONFIG_FETCH_TIMEOUT=600000 \
    NPM_CONFIG_MAXSOCKETS=3 \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false \
    NEXT_TELEMETRY_DISABLED=1

# 只复制依赖清单，充分利用 Docker 层缓存
COPY package.json package-lock.json ./

# 按锁文件精确安装（不再在线解析依赖版本，避免 ERESOLVE 冲突）
# --legacy-peer-deps：跳过 peer 依赖校验（npm 默认策略在 ajv 等
#   包新旧版本并存时会生成 npm ci 拒绝的锁文件）
# cache mount 缓存已下载的包，即使失败重试也能续传
RUN --mount=type=cache,target=/root/.npm \
    ok=0; \
    for i in 1 2 3; do \
      echo "== npm ci attempt $i =="; \
      npm ci --legacy-peer-deps --no-audit --no-fund --maxsockets=3 && ok=1 && break; \
      sleep 5; \
    done; \
    [ "$ok" = "1" ] || (echo "npm ci failed after 3 attempts" && exit 1)

# 复制源码并构建（next.config.ts 已启用 output: "standalone"）
COPY . .
RUN npm run build

############################################################
# 阶段 2：运行阶段 —— 仅保留运行所需的最小文件集
############################################################
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

# 以非 root 用户运行，更安全
RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

# standalone 产物自带精简 server.js，无需完整 node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 数据目录（宿主机挂载卷会覆盖此目录）
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
