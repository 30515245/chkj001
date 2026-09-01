# 茸平路19号绿色用能规划提案

面向上海柴火众创空间物业管理有限公司的绿色用能规划提案网站。9 页分页式响应式站点（封面 + 8 个内容页），纯静态前端 + Cloudflare Pages Functions 访问日志。

**在线访问**：https://chzckj.pages.dev

---

## 目录结构

```
rongping-proposal/                  ← 仓库根 = 站点根（CF Pages 输出目录）
├─ index.html                       【主落地页】封面，域名根路径默认打开
├─ rongping-road-19-green-energy-proposal.html
│                                   【单文件版落地页】8 屏滚动，完全自包含（548 KB）
├─ page-1.html                      决策摘要
├─ page-2.html             提案方介绍
├─ page-3.html             合作背景（含卫星图）
├─ page-4.html             收益与风控
├─ page-5.html             关键问题回应
├─ page-6.html             实施路径
├─ page-7.html             测算口径
├─ page-8.html             封底
├─ wxsyt.jpg               茸平路19号地块卫星图（364 KB）
├─ assets/
│  └─ styles.css           全站样式（无外部资源依赖）
├─ functions/              Cloudflare Pages Functions（服务端）
│  ├─ _middleware.js       访问记录中间件 + 停留时长追踪脚本注入
│  ├─ logs.js              /logs 日志查看页
│  └─ api/
│     ├─ duration.js       停留时长回写接口
│     ├─ export-csv.js     CSV 导出接口
│     └─ log-list.js       日志 JSON 接口
├─ schema.sql              D1 访问日志表结构
└─ wrangler.toml           Wrangler 配置（项目名 / D1 绑定）
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

## 部署：Cloudflare Pages 连接 GitHub

### 1. 连接仓库

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. 授权并选择仓库 `30515245/rongping-proposal`
3. 构建配置：

| 配置项 | 值 |
|---|---|
| 框架预设（Framework preset） | `None` |
| 构建命令（Build command） | 留空 |
| 输出目录（Build output directory） | 留空（默认即仓库根） |
| 分支（Production branch） | `main` |

> **落地页必须在根目录**：`index.html` 位于仓库根，因此输出目录留空（= 仓库根）即可，访问自定义域名根路径会直接打开落地页。若误填子目录（如 `rongping-proposal/`），根路径会 404。

保存后 CF 会自动构建部署，之后每次 `git push` 到 `main` 即自动更新线上。

部署后两个落地页的访问路径：

| 落地页 | 访问路径 |
|---|---|
| 主落地页（9 页分页版） | `https://<你的域名>/` |
| 单文件版落地页 | `https://<你的域名>/rongping-road-19-green-energy-proposal` |

> Cloudflare Pages 会把 `xxx.html` 永久重定向（308）到 `xxx`，所以链接里**不带 `.html` 后缀**反而更快（省一次跳转）。

### 2. 绑定 D1 数据库（访问日志必需）

**Settings → Functions → D1 database bindings → Add binding**

| 字段 | 值 |
|---|---|
| Variable name | `DB` |
| D1 database | `chzckj_visit_log` |

> 若尚未建库建表，先执行：
> ```bash
> npx wrangler d1 create chzckj_visit_log
> npx wrangler d1 execute chzckj_visit_log --remote --file=./schema.sql
> ```
> 然后把返回的 `database_id` 回填到 `wrangler.toml`。

### 3. 自定义域名

**Settings → Custom domains → Set up a custom domain**

输入你的域名（如 `energy.example.com`）后，Cloudflare 会自动创建所需的 DNS 记录并签发证书，通常几分钟内生效。

> 前提：该域名的 DNS 必须由 Cloudflare 托管。若托管在别处，需先在 CF 接入站点并按提示修改 NS 记录。

## 访问日志

每次页面访问由 `functions/_middleware.js` 自动落库，停留时长由前端 `sendBeacon` 在离开页面时回写。

**查看地址**：`https://<你的域名>/logs`
**访问密钥**：`Abc123456Log2026`

功能：分页查看、按机器人过滤、仅看有效访问、一键导出 CSV。

### 数据表字段（`visit_record`）

| 字段 | 说明 |
|---|---|
| `visit_time` | 访问时间（自动按中国时区记录） |
| `duration` | 页面停留秒数 |
| `visit_path` | 访问的页面路径 |
| `visitor_ip` | 访客 IP |
| `region` / `city` | 归属省份 / 城市（CF 边缘地理信息） |
| `client` | 客户端类型（微信 / 钉钉 / Safari / Chrome 等，由 UA 解析） |
| `source` | 渠道来源（utm 参数或 IM 来源归因） |
| `referer` | 来源页 |
| `is_bot` | 是否爬虫（1 = 是） |
| `visit_id` | 单次访问唯一 ID（用于关联停留时长） |

### 手动部署（备用）

不走 Git 集成时，也可用 Wrangler 直接上传：

```bash
export XDG_CONFIG_HOME="C:/Users/qiao/AppData/Roaming/xdg.config"
npx wrangler pages deploy . --project-name chzckj --branch main --commit-dirty=true
```

> ⚠️ 关键：`--branch main` 才是更新生产环境。用 `--branch production` 会发到 Preview 环境，生产域名仍跑旧代码。

## 安全提醒

- `functions/logs.js`、`functions/api/log-list.js`、`functions/api/export-csv.js` 中**硬编码**了日志密钥，`wrangler.toml` 含 D1 `database_id`。当前仓库为私有，风险可控。
- 若日后转为公开仓库，请改为 Cloudflare Secret 或环境变量注入。

## 已知事项

- Cloudflare Pages 会把 `/page-1.html` 以 **308** 重定向到 `/page-1`。该重定向为永久性，浏览器会缓存，仅首次点击多一次跳转开销。保留 `.html` 后缀是为了让本地双击预览仍可用。
- 导航编号中 page-7 使用「附」（附录）、page-8 使用「08」，两套编号体系并存，如需统一可调整。
