# 茸平路19号绿色用能规划提案

面向**上海柴火众创空间物业管理有限公司**的绿色用能规划提案网站。9 页分页式响应式站点（封面 + 8 个内容页），纯静态前端 + Cloudflare Pages Functions 访问日志。

| 项 | 值 |
|---|---|
| 仓库 | `https://github.com/30515245/chkj001`（默认分支 `main`） |
| 自定义域名 | `https://chkj001.20302060.xyz/`（主） |
| 备用域名 | `https://chzckj.pages.dev` |
| D1 日志库 | `chzckj_visit_log`（binding `DB`） |

---

## 目录结构

```
chkj001/                              ← 仓库根 = 站点根（CF Pages 输出目录）
├─ index.html                         【主落地页】封面，域名根路径默认打开
├─ rongping-road-19-green-energy-proposal.html
│                                     【单文件版落地页】8 屏滚动，完全自包含（~558 KB）
├─ page-1.html                        决策摘要
├─ page-2.html                        提案方介绍
├─ page-3.html                        合作背景（含卫星图）
├─ page-4.html                        收益与风控
├─ page-5.html                        关键问题回应
├─ page-6.html                        实施路径
├─ page-7.html                        测算口径（附录）
├─ page-8.html                        封底
├─ wxsyt.jpg                          茸平路19号地块卫星图
├─ assets/
│  └─ styles.css                      全站样式（无外部资源依赖）
├─ functions/                         Cloudflare Pages Functions（服务端）
│  ├─ _middleware.js                  访问记录中间件 + 停留时长追踪脚本注入
│  ├─ logs.js                         /logs 日志查看页（密码登录）
│  └─ api/
│     ├─ duration.js                  停留时长回写接口（/api/duration）
│     ├─ export-csv.js                CSV 导出接口（/api/export-csv）
│     └─ log-list.js                  日志 JSON 接口（/api/log-list）
├─ schema.sql                         D1 访问日志表结构
└─ wrangler.toml                      Wrangler 配置（项目名 / D1 绑定）
```

## 技术栈

| 层 | 选型 |
|---|---|
| 前端 | 原生 HTML / CSS / JavaScript，无框架、无构建步骤 |
| 托管 | Cloudflare Pages（连接 GitHub 仓库自动部署） |
| 服务端 | Cloudflare Pages Functions（`functions/` 目录） |
| 数据 | Cloudflare D1（SQLite），库名 `chzckj_visit_log` |

## 本地预览

静态部分用任意 HTTP 服务器即可：

```bash
python -m http.server 8080
# 或 npx serve .
```

> ⚠️ 直接双击打开 HTML（`file://`）也能看页面，但**访问日志不会生效**——Functions 需要 Pages 运行环境。

如需完整模拟（含 Functions 与 D1）：

```bash
npx wrangler pages dev . --d1=DB
```

## 部署流程（基于 GitHub 托管 + Cloudflare 连接）

整体逻辑：**手动创建 GitHub 私有仓库 → 推送代码到 GitHub → Cloudflare Pages 连接该 Git 仓库 → 配置自定义域名访问**。全程不依赖 Wrangler 命令行直接部署（`wrangler pages deploy`）；每次 `git push` 到 `main` 即自动触发 Cloudflare 重新构建与上线。

### 1. 创建私有仓库并推送代码

1. 在 GitHub 新建**私有仓库**（如 `chkj001`），**不要**勾选「Add a README / .gitignore」等自动生成文件，保持空仓库。
2. 本地初始化并把项目推送到该仓库：

```bash
git init
git add .
git commit -m "init: 茸平路19号绿色用能提案站点"
git remote add origin https://github.com/30515245/chkj001.git
git branch -M main
git push -u origin main
```

> 仓库根目录即站点根目录（含 `index.html`），Cloudflare Pages 输出目录留空即可。后续更新只需 `git add -A && git commit && git push`。

### 2. Cloudflare Pages 连接仓库

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. 授权并选择仓库 `30515245/chkj001`
3. 构建配置：

| 配置项 | 值 |
|---|---|
| 框架预设（Framework preset） | `None` |
| 构建命令（Build command） | 留空 |
| 输出目录（Build output directory） | 留空（默认即仓库根） |
| 分支（Production branch） | `main` |

> **落地页必须在根目录**：`index.html` 位于仓库根，因此输出目录留空（= 仓库根）即可，访问自定义域名根路径会直接打开落地页。若误填子目录（如 `chkj001/`），根路径会 404。

保存后 CF 会自动构建部署，之后每次 `git push` 到 `main` 即自动更新线上。

部署后两个落地页的访问路径：

| 落地页 | 访问路径 |
|---|---|
| 主落地页（9 页分页版） | `https://chkj001.20302060.xyz/` |
| 单文件版落地页 | `https://chkj001.20302060.xyz/rongping-road-19-green-energy-proposal` |

> Cloudflare Pages 会把 `xxx.html` 永久重定向（308）到 `xxx`，所以链接里**不带 `.html` 后缀**反而更快（省一次跳转）。

### 3. 绑定 D1 数据库（访问日志必需）

**Settings → Functions → D1 database bindings → Add binding**

| 字段 | 值 |
|---|---|
| Variable name | `DB` |
| D1 database | `chzckj_visit_log` |

> 若尚未建库建表，先执行（仅首次需要，与部署方式无关）：
> ```bash
> npx wrangler d1 create chzckj_visit_log
> npx wrangler d1 execute chzckj_visit_log --remote --file=./schema.sql
> ```
> 然后把返回的 `database_id` 回填到 `wrangler.toml` 的 `[[d1_databases]]` 段。该文件仅用于**声明 D1 绑定与本地预览**，`git push` 时 Cloudflare 会读取其中的绑定配置，但它不参与、也不提供任何直接部署能力。

### 4. 自定义域名

**Settings → Custom domains → Set up a custom domain**

输入 `chkj001.20302060.xyz` 后，Cloudflare 会自动创建所需的 DNS 记录并签发证书，通常几分钟内生效。

> 前提：该域名的 DNS 必须由 Cloudflare 托管。本域名 DNS 已接入 CF，直接添加即可。

---

## 访问日志（详细说明）

本项目内置一整套**无第三方依赖的访问日志系统**：每次页面访问由 `functions/_middleware.js` 自动落库到 Cloudflare D1，离开页面时浏览器回传**停留时长**，运营者可通过网页、JSON、CSV 三种方式查看。

### 7.1 工作原理与数据流

```
访客请求页面
  │
  ▼
functions/_middleware.js（每个页面请求都会经过）
  ├─ 排除：静态资源(.css/.js/.png…)、/api/* 接口、.html 结尾请求（去重，见 7.2）
  ├─ 采集访客信息（IP / 国家·省·市·时区 / referer / UA）
  ├─ 生成 visit_id（UUID）+ ts（epoch 秒）+ 中国时区 visit_time
  ├─ waitUntil → 异步 INSERT 到 D1.visit_record（不阻塞页面响应）
  └─ 对 HTML 响应：注入追踪脚本 + 下发 pv=<visit_id> Cookie + 关闭缓存
        │
        ▼
浏览器加载页面 → 追踪脚本启动计时
  │  离开 / 切后台 / 关标签页时
  ▼
POST /api/duration  { vid, duration }  →  UPDATE visit_record SET duration=? WHERE visit_id=?
```

- **写入时机**：`waitUntil(saveLog())` 让数据库写入在后台异步完成，页面响应不被拖慢。
- **中国时区**：`visit_time` 在写入时按 `UTC+8` 计算（Cloudflare 运行时默认 UTC，若不处理日志会慢 8 小时）。`ts` 字段另存 epoch 秒，用于稳定排序与按日期区间筛选。
- **Cookie 关联**：中间件向浏览器下发 `pv=<visit_id>`（`Max-Age=3600`，`SameSite=Lax`），追踪脚本读取该 Cookie 拿到 `vid`，从而把停留时长**回写到同一条记录**。
- **关闭缓存**：对 HTML 响应强制 `Cache-Control: no-store`。否则边缘缓存会让重复访问不命中中间件、漏记日志。

### 7.2 记录时机与去重规则

中间件在以下情况**不记录**，直接放行：

| 跳过条件 | 原因 |
|---|---|
| 路径以 `.css/.js/.png/.jpg/.gif/.ico/.svg/.woff/.ttf` 结尾 | 静态资源不算页面访问 |
| 路径以 `/api/` 开头 | 停留时长上报等接口本身不是页面访问 |
| 路径以 `.html` 结尾 | Cloudflare Pages 会把 `/xxx.html` 永久 **308 重定向**到 `/xxx`；若此处也记录，重定向前后会产生两条重复日志。故跳过 `.html`，由重定向后的干净 URL 统一记录一次 |

> 因此站点内导航虽使用 `page-1.html` 这类链接，实际被记录的是去 `.html` 后的干净路径（如 `/page-1`）。

### 7.3 数据表字段（`visit_record`）

建表语句见 `schema.sql`，字段如下：

| 字段 | 类型 | 说明 | 来源 |
|---|---|---|---|
| `id` | INTEGER PK | 自增主键 | 数据库 |
| `visit_url` | TEXT | 完整访问 URL（`https://…/page-3`） | `url.href` |
| `visit_path` | TEXT | 访问路径（如 `/`、`/page-3`） | `url.pathname` |
| `visitor_ip` | TEXT | 访客 IP | `CF-Connecting-IP` |
| `user_agent` | TEXT | 浏览器/客户端原始 UA 全文 | 请求头 |
| `country` | TEXT | 国家（已转中文，如「中国」「美国」） | `request.cf.country` / `cf-ipcountry` |
| `region` | TEXT | 省份（如「上海市」） | `request.cf.region` |
| `city` | TEXT | 城市（罗马字已转中文，如「上海」「东京」） | `request.cf.city` |
| `timezone` | TEXT | 访客时区（如 `Asia/Shanghai`） | `request.cf.timezone` |
| `referer` | TEXT | 来源页 URL | 请求头 `referer` |
| `visit_time` | DATETIME | 访问时间（**中国时区**，展示用字符串） | 运行时计算 |
| `visit_id` | TEXT | 单次访问唯一 ID（关联停留时长回写） | `crypto.randomUUID()` |
| `duration` | INTEGER | 页面停留秒数（默认 0，由 `/api/duration` 回写） | 前端上报 |
| `ts` | INTEGER | epoch 秒时间戳（筛选/排序用） | 运行时计算 |
| `client` | TEXT | 客户端短标签（微信 / 钉钉 / iOS / Chrome…） | UA 解析 |
| `source` | TEXT | 渠道归因（utm 来源 / IM 来源 / 直接访问） | URL + UA + referer |
| `is_bot` | INTEGER | 是否爬虫（1 = 是，0 = 否） | UA 匹配规则 |

**派生字段的解析逻辑**（均在 `_middleware.js` 内）：

- `client`：优先识别 IM 容器（微信 / 钉钉 / 企业微信 / QQ / 微博），其次按设备/浏览器（iOS / Android / Windows / Mac / Linux / Chrome / Firefox / Edge / Safari），都不匹配则记「其他」。定向传播场景下 UA 全文太长且无用，只用「用什么打开」的短标签。
- `source`：有 `utm_source` 参数时取其值；否则按 UA 识别微信/钉钉/企业微信；再否则看 referer 域名（微信/QQ/钉钉/邮件/其他域名）；都没有则记「直接访问」。
- `is_bot`：UA 匹配 `slackbot|telegrambot|discordbot|facebookexternalhit|whatsapp|bytespider|spider|bot|crawl|python-requests|curl|go-http|preview` 等规则时标记。
  > ⚠️ 微信/钉钉的**链接预览**与真实打开共用同一 UA，无法区分，故预览不会被判为 bot，其停留时长也恒为 0（未真正打开页面）。

### 7.4 三种查看方式

#### ① 网页查看页 `/logs`（推荐，最安全）

密码登录后查看，密钥：**`Abc123456Log2026`**

- **登录**：提交密钥 → 服务端下发 `HttpOnly` Cookie `auth=<密钥>`（`Max-Age=86400`，24 小时）。
- **退出**：访问 `/logs?logout=1` 清除 Cookie 并跳回登录页。
- **概览卡片**：总访问、独立访客（按 IP 去重）、平均停留（仅统计有停留的访问）。
- **热门榜单**：热门页面 Top5、热门渠道 Top5。
- **明细表**：列含 `# / 时间 / 停留 / 路径 / 渠道 / 省 / 市 / 客户端 / 来源`。
- **前端筛选**：路径搜索框、「隐藏机器人」、「仅有效访问（有停留）」复选框；数据已内联（最多 1000 条），筛选/导出均在浏览器端完成，无需额外接口。

#### ② JSON 接口 `/api/log-list?token=Abc123456Log2026`

- 鉴权：URL 查询参数 `token`（与网页密钥相同）。
- 返回：最近 **100** 条记录（`ORDER BY visit_time DESC LIMIT 100`），结构 `{ code, total, list }`。
- 适用：自动化脚本、外接看板。`code=403` 表示 token 错误，`code=500` 表示数据库异常。

```bash
curl "https://chkj001.20302060.xyz/api/log-list?token=Abc123456Log2026"
```

> 注意：token 出现在 URL 中，会被服务端访问日志、浏览器历史记录留存，安全性低于 Cookie 方式。对敏感数据建议用 `/logs`。

#### ③ CSV 导出 `/api/export-csv`

- 鉴权：复用 `/logs` 的登录 Cookie（HttpOnly），未登录返回 403。
- 参数：`bot=1`（隐藏机器人）、`min_dur=1`（仅导出有停留的有效访问），可组合，如 `/api/export-csv?bot=1&min_dur=1`。
- 范围：最多 **5000** 条（`ORDER BY ts DESC, id DESC`）。
- 列：ID / 时间 / 停留(秒) / 路径 / 渠道 / 省 / 市 / 客户端 / 来源 / 国家 / User-Agent。
- 输出：带 BOM 的 UTF-8 CSV（Excel 中文不乱码），文件名 `visit_log_<日期>.csv`。
- 网页端「导出 CSV」按钮即调用此接口，并自动带入当前勾选的「隐藏机器人 / 仅有效访问」状态。

### 7.5 停留时长机制

停留时长是**回写**的，不在首次访问时记录（首次 `duration` 默认 0）：

1. 中间件注入的追踪脚本读取 `pv` Cookie 拿到 `vid`，记录开始时间 `s = Date.now()`、已上报到的秒数 `max = 0`。
2. 计时逻辑：
   - 逐秒结算：`d = 当前距 s 的秒数`，若 `d > max` 则更新 `max = d` 并上报 `{ vid, duration: d }`（单调递增、越算越准）。
   - 页面切到后台（`visibilitychange` → `hidden`）：结算并上报当前值。
   - 页面回到前台（`visibilitychange` → `visible`）：重置 `s = Date.now()`，避免把「离开的时间」算进停留。
   - 关闭/卸载（`pagehide` / `beforeunload`）：结算并上报最后一次。
   - **15s 心跳**（`setInterval`）：页面停留期间每 15 秒结算并上报一次。即使访客长期不操作、最后被移动端回收，部分停留时长也已在心跳中上报，缓解卸载时末段丢失。
3. 上报内容：`{ vid, duration }`，`duration` 为**当前有效停留秒数**（单调递增）；重复上报会不断回写为更大值，服务端最终保留最大值，即实际停留时长。
4. 上报通道（三级兜底）：优先 `navigator.sendBeacon('/api/duration', j)`（传纯字符串）、失败降级 `fetch(..., { keepalive: true })`、再失败降级普通 `fetch`。sendBeacon 会把请求交给浏览器网络层、在移动端卸载/切后台时最可靠。
5. 服务端 `/api/duration`：读取请求体（**不依赖 Content-Type**，sendBeacon 的 `text/plain` 与 fetch 的 `application/json` 均可解析）后按 JSON 解析，用 `INSERT ... ON CONFLICT(visit_id) DO UPDATE SET duration = excluded.duration` 回写。UPSERT 同时消除中间件 `waitUntil` 异步 INSERT 与回写之间的竞态。
6. 前提：`visit_record.visit_id` 需建唯一索引（见 `schema.sql`）。**已部署的线上库须单独执行一次**：
   ```
   npx wrangler d1 execute chzckj_visit_log --remote --command="CREATE UNIQUE INDEX IF NOT EXISTS idx_visit_record_visit_id ON visit_record(visit_id);"
   ```
   > ⚠️ 若线上库未建该索引，UPSERT 的 `ON CONFLICT` 会因缺少唯一约束而抛错，所有时长上报都会 500、停留时长恒为 0。

> 该机制历经多次修复才让移动端停留时长可靠回写：`de06347` 补闭合花括号（原先整段不执行）、`1fb81e1` 倒换上报道优先级、`3382397` 改 sendBeacon 纯字符串 + 15s 心跳 + 服务端支持 `text/plain`、`5bc5043`/PR#1 用 UPSERT + 唯一索引消除写库竞态。

### 7.6 筛选与统计口径

- **独立访客**：按 `visitor_ip` 去重计数（同一 NAT/公司出口可能合并，属预期）。
- **平均停留**：仅对 `duration > 0` 的记录求平均，避免大量 0 值拉低。
- **仅有效访问**：`duration > 0`，即真正打开并停留过的访问（可过滤掉预览/秒退）。

### 7.7 安全与运维

- **密钥硬编码**：`logs.js`、`api/log-list.js`、`api/export-csv.js` 中硬编码了日志密钥 `Abc123456Log2026`；`wrangler.toml` 含 D1 `database_id`。当前仓库为**私有**，风险可控。
- **公开化前必做**：若日后转为公开仓库，请将密钥改为 Cloudflare Secret（或环境变量注入），不要入库明文。
- **清理测试数据**：如需删除某条记录（如调试残留），用 Wrangler 直连 D1：
  ```bash
  export XDG_CONFIG_HOME="C:/Users/qiao/AppData/Roaming/xdg.config"
  npx wrangler d1 execute chzckj_visit_log --remote \
    --command="DELETE FROM visit_record WHERE visit_id='<目标 visit_id>'"
  ```
- **更新线上**：修改 `functions/` 后执行 `git push` 到 `main`，Cloudflare 会自动重新构建并上线。可在 CF Dashboard → **Deployments** 确认最新部署对应最新 commit 且状态为 `Success`。若线上日志字段/停留时长未更新，多半是部署未生效、CF 仍跑旧函数，或浏览器缓存了旧页面（查看页已强制 `no-store`，可硬刷新验证）。

### 7.8 已知事项与局限

- 停留时长依赖浏览器在卸载前成功触发 `visibilitychange`/`pagehide` 并发送 `sendBeacon`/`fetch`。部分移动端浏览器在激进后台回收时仍可能丢失末段；为缓解这一情况已内置 **15s 心跳**定时上报，即使最后被回收，停留前期时长也大概率已落库（末段少量偏差属预期）。
- 微信/钉钉的链接预览与真实打开 UA 相同、且预览不会触发停留上报，所以预览访问的 `duration` 恒为 0、且无法与普通访问区分。
- `/api/log-list` 按 `visit_time`（字符串）排序，`/logs` 与 `/api/export-csv` 按 `ts`（数值）排序，二者顺序可能略有差异（同一秒内）。
- Cloudflare Pages 会把 `/page-1.html` 以 **308** 重定向到 `/page-1`；该重定向为永久性，浏览器会缓存，仅首次点击多一次跳转开销。保留 `.html` 后缀是为了让本地双击预览仍可用。

## 安全提醒

- 除上方「7.7 安全与运维」外，重申：日志密钥与 D1 `database_id` 当前硬编码在仓库内，**仓库保持私有**即可。一旦公开，立即迁移为 Cloudflare Secret。
- `/logs` 与 `/api/export-csv` 走 HttpOnly Cookie 鉴权，相对安全；`/api/log-list` 走 URL token，避免在公开/共享环境传播其完整链接。

## 已知事项

- 导航编号中 page-7 使用「附」（附录）、page-8 使用「08」，两套编号体系并存，如需统一可调整。
- 单文件版落地页 `rongping-road-19-green-energy-proposal.html` 体积较大（~558 KB），适合一次性转发；分页版适合站内浏览。
