# WHS 互助社区

面向 WHS（华氏综合征）患者与家庭的交流论坛。

- **前端**：Next.js 14 (App Router) + TypeScript + Tailwind CSS（清新手绘风），开发端口 `localhost:3000`
- **后端**：StoryDen（Docker 容器），由 Caddy 反向代理在 `https://localhost`

> 本论坛仅供 WHS 患者交流，不构成医疗建议。

---

## 一、项目结构

```
app/                    # 页面（App Router）
├── layout.tsx          # 根布局（Header + Footer + noindex 隐私保护）
├── page.tsx            # 首页：帖子列表 + 搜索 + 标签筛选
├── post/[id]/page.tsx  # 帖子详情：Markdown 正文 + 嵌套评论 + 点赞/收藏
├── create/page.tsx     # 发布帖子：标题 + Markdown 内容 + 多选标签
├── profile/page.tsx    # 个人中心：头像上传 + 简介 + 我的帖子
└── auth/page.tsx       # 登录 / 注册
components/             # 可复用组件（ui/ 为手绘风基础件）
lib/
├── api/                # StoryDen 接口层（按域拆分，聚合入口 index.ts）
│   ├── shared.ts       #   axios 实例 / 错误类型 / 字段适配转换器
│   ├── auth.ts         #   认证（session / 登录 / 注册）
│   ├── posts.ts        #   帖子 / 分类 / 评论 / 点赞
│   ├── collections.ts  #   收藏夹
│   ├── library.ts      #   知识库 / 附件上传
│   ├── links.ts        #   链接分享
│   ├── tags.ts         #   标签
│   ├── notifications.ts#   通知
│   ├── members.ts      #   成员 / 关注
│   ├── admin.ts        #   角色 / 封禁 / 账号管理
│   ├── profile.ts      #   个人中心
│   └── index.ts        #   聚合导出（页面统一从这里 import）
├── markdown.ts         # Markdown ↔ HTML 转换（纯函数，有单测 lib/markdown.test.ts）
└── utils.ts            # cn / 时间格式化
types/index.ts          # 与后端约定的数据结构
next.config.mjs         # 开发环境把 /api/* 代理到本地后端（Next 14 不支持 .ts 配置，Next 15 可用）
```

---

## 二、快速开始（阶段一：mock 数据预览）

要求：已安装 Node.js 18.17 及以上（`node -v` 查看）。

```bash
# 1. 安装依赖（只需一次）
npm install

# 2. 启动开发服务器
npm run dev

# 3. 浏览器访问 http://localhost:3000
```

> 阶段一使用内置 mock 数据，**不需要启动 Docker 后端**即可看到完整界面。
> 登录页输入任意邮箱和密码即可登录（mock 模式）。

## 三、对接真实接口（阶段二）

1. 打开 [lib/api.ts](lib/api.ts)，每个函数中都已预留对接位置：

```ts
// TODO: 对接 StoryDen 真实接口：GET /api/posts
// const { data } = await api.get<{ posts: PostListItem[] }>('/api/posts');
// return data.posts;
return mockPosts; // TODO: 替换为真实 API 调用
```

取消注释真实请求、删掉 `return mock…` 一行即可。

2. 页面中的交互（评论提交、点赞收藏、头像上传等）同样标有 `// TODO:`，逐一替换。

### ⚠️ 本地对接 StoryDen 的注意事项

- `next.config.mjs` 的开发代理直连 StoryDen 容器（`http://localhost:8000`），
  **不经过 Caddy**：Caddy 会把 http 308 跳转到 https，且 StoryDen 后端不带 CORS 头，
  浏览器跟随跳转后的跨源请求会被拦截（表现为「加载失败 / 无法登录」）。
- 无需 `NODE_EXTRA_CA_CERTS`：直连容器是纯 HTTP，没有证书问题。
- 首次启动前需用新版 docker-compose 重建容器（已映射 8000 端口）：

```bash
docker compose up -d
```

- StoryDen 官方 UI 仍由 Caddy 托管在 `https://localhost`（管理后台用），不受影响。

---

## 四、部署（阶段三：Nginx + PM2）

### 1. 本地构建

```bash
npm run build     # 生成生产包
npm start         # 本机预览生产模式（默认 3000 端口）
```

### 2. 服务器安装

```bash
npm install -g pm2          # 安装进程管理器
npm run build               # 在项目目录构建
pm2 start "npm run start" --name whs-community   # 启动并守护
pm2 save && pm2 startup     # 开机自启（按提示执行输出的命令）
```

> 前端只做页面渲染，**不需要把 Node 服务暴露到公网**，
> 由 Nginx 统一入口反向代理（后端 StoryDen 也用同一台 Nginx 或 Caddy 代理）。

### 3. Nginx 反向代理示例

前端请求始终使用相对路径（如 `/api/posts`），生产环境无需修改任何代码：

```nginx
server {
    listen 80;
    server_name community.example.com;   # 换成你的域名

    # 前端页面与静态资源 → Next.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # API 请求 → StoryDen（后端入口，端口按实际部署调整）
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

配置完成后 `nginx -t && nginx -s reload` 生效。

---

## 五、StoryDen 后端（Docker + Caddy）日常维护

### 打开网站

启动 Docker Desktop（等右下角图标变绿）→ 浏览器访问 **https://localhost**

> 容器配置了 `restart: unless-stopped`，Docker Desktop 启动后会自动拉起。
> 如果打不开，在项目目录执行：

```bash
docker compose up -d    # 启动全部容器
docker compose ps       # 查看状态（两个容器都应 Up）
```

**停止网站**：`docker compose stop`
**查看日志**：`docker compose logs -f storyden`
**升级 Storyden**：改 [docker-compose.yml](docker-compose.yml) 里的版本号（已固定为 v1.26.15，勿用 latest）→ `docker compose up -d --build`
（Caddy 是本地构建的自定义镜像，不能 `docker compose pull`；`--build` 会重新构建 Caddy 并按新版本号拉取 Storyden）
**修改 Caddyfile 后**：`docker compose restart caddy`

### 备份（最重要！）

所有数据都在 `./data` 目录（数据库 + 上传的图片），**一键脚本**：

- **本机（Windows）**：双击 [backup.bat](backup.bat)，输出到 `backups/` 目录
- **服务器（Linux）**：`./scripts/backup.sh`，自动保留最近 14 份备份；
  配合 cron 定时（每天凌晨 3:30）：
  ```bash
  crontab -e   # 添加一行：
  30 3 * * * /opt/whs_community/scripts/backup.sh >> /var/log/whs-backup.log 2>&1
  ```

> 脚本会先停止 Storyden 容器保证数据库一致，备份完成后自动恢复。
> ⚠️ 请把备份目录定期复制到**另一台设备**（U盘/网盘/另一台机器）——本机损坏时备份才有效。
> 手动备份也可：`docker compose stop storyden` → 复制 `data/` + `.env` + `Caddyfile` → `docker compose start storyden`。

### 迁移到云服务器

#### 1. 准备服务器

- 买一台云服务器（阿里云/腾讯云轻量即可，2核2G够用）
- 安装 Docker 和 Docker Compose 插件
- 安全组/防火墙放行端口：`80`、`443`、`22`，其余不用开
- 域名解析：把你的域名（或子域名）添加 **A 记录指向服务器公网 IP**

#### 2. 上传文件

把本机项目目录里的 **docker-compose.yml、Caddyfile、.env、data/、deploy/** 传到服务器
（用 `tar` 打包后 scp，或 WinSCP 等工具，传到服务器任意目录，如 `/opt/whs_community`）
—— `deploy/caddy/Dockerfile` 是带限流插件的 Caddy 镜像构建文件，**必须一起传**。

> `caddy-local-ca.crt` 是本地证书信任用的，**不用传到服务器**。

#### 3. 修改 .env（关键！）

```ini
# 改成你的域名，协议必须与访问一致(https)
PUBLIC_WEB_ADDRESS=https://community.example.com
PUBLIC_API_ADDRESS=https://community.example.com

# ⚠️ 从原机器 .env 里复制真实的 SESSION_KEY，不要重新生成!
# 改了它所有用户(包括你)会被强制登出
# 注意: 真实密钥只存在于 .env 里，切勿写进文档或提交到代码仓库
# （泄露密钥 = 任何人可伪造登录会话，若曾泄露需立即重新生成）
SESSION_KEY=<从原机器 .env 复制，勿公开>
```

#### 4. 修改 Caddyfile

把 `localhost` 块换成你的域名（替换后 Caddy 会自动申请/续期 Let's Encrypt 证书）。
**⚠️ 必须保留登录/注册限流配置**（反暴力破解）：域名块里也要带上 `route { rate_limit ... }`：

```caddyfile
community.example.com {
	route {
		rate_limit /api/auth/password/signin {
			zone signin {
				key {http.request.remote.host}
				window 1m
				events 10
			}
		}
		rate_limit /api/auth/password/signup {
			zone signup {
				key {http.request.remote.host}
				window 1m
				events 5
			}
		}
		reverse_proxy storyden:8000
	}
}
```

> ⚠️ `rate_limit` 指令依赖 mholt/caddy-ratelimit 插件，**标准 caddy:alpine 镜像没有**，
> 本项目用 `deploy/caddy/Dockerfile` 构建带插件的自定义镜像（`docker compose up -d --build caddy`）。
> 换域名后建议加一行 `header Strict-Transport-Security "max-age=31536000"` 强制 HTTPS。

#### 会话 Cookie 与 CSRF 说明

本站前端依赖 Cookie 会话（`storyden-session`），CSRF 防护依靠两层：
1. **Cookie SameSite 属性**（Go/Storyden 默认 `SameSite=Lax`，浏览器不会在跨站请求中携带）
2. **CSP `form-action 'self'`**（前端 next.config.mjs 已配置，表单只能提交本站）

部署后建议验证一次会话 Cookie 的 SameSite 属性：

```bash
curl -v https://community.example.com/api/session 2>&1 | grep -i set-cookie
# 期望输出含 SameSite=Lax（或 Lax 默认值），无 SameSite=None
```

若响应头出现 `SameSite=None`（未启用），说明后端版本行为有变：Storyden 的会话中间件
（`app/transports/http/middleware/session_cookie`）按 Go 默认即 `SameSite=Lax`，
出现 None 时请升级/确认 Storyden 版本后再上线，切勿依赖前端代码兜底（Cookie 由后端下发）。

#### 5. 启动

```bash
cd /opt/whs_community
docker compose up -d --build   # --build: 首次需构建带限流插件的 Caddy 镜像
```

等 1~2 分钟（证书签发），浏览器访问 **https://community.example.com**。
管理员账号会随数据库一起过去，直接登录即可。

---

## 六、常见问题

| 现象 | 处理 |
|---|---|
| 前端 `npm run dev` 后 3000 端口打不开 | 检查 Node 版本（≥18.17）；端口被占用时用 `npm run dev -- -p 3001` |
| 证书警告（换新机器/重装系统后） | 双击 `caddy-local-ca.crt` 重新安装到「受信任的根证书颁发机构」 |
| localhost 打不开 | 检查 Docker Desktop 是否在运行；`docker compose ps` 看容器状态 |
| 页面报「加载失败 / 无法登录」 | 检查 `docker compose up -d` 是否已按新版配置重建（8000 端口映射）；`curl http://localhost:8000/api/threads` 应返回 JSON |
| 注册/登录报 "An unexpected error occurred" | 检查 `.env` 里的地址协议是否和浏览器访问的一致（都是 https 或都是 http） |
| 迁移后原账号登不上 | 检查 SESSION_KEY 是否与本地一致 |
