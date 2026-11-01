# JoyFlock Google Analytics 4 与 Search Console

配置日期：2026-11-01（Asia/Shanghai）。本文仅保存公开测量标识和验证记录，不保存 Google 登录凭据、Cookie 或 API 密钥。

## GA4

| 项目 | 配置 |
| --- | --- |
| 所属 Analytics 账号 | Figure Workshop，`409536641`（既有账号） |
| 独立资源 | JoyFlock，`561778143` |
| 行业 | 游戏；小型业务 |
| 业务目标 | 网站流量、互动度和留存 |
| 报表时区 | 中国时间（GMT+08:00） |
| 币种 | USD |
| 网站数据流 | Flight Party Web |
| 数据流 URL | `https://flight.joyflock.com` |
| 数据流 ID | `16247075660` |
| 衡量 ID | `G-9TB87S782E`（公开标识，不是秘密） |
| 控制台 | [JoyFlock GA4](https://analytics.google.com/analytics/web/#/a409536641p561778143/reports/intelligenthome) |

未修改 Figure Workshop、MeterTrail 等其他既有资源的配置。JoyFlock 位于现有账号之下，但数据流和资源独立。

网站使用 `dist/analytics.js`。只在生产域名 `flight.joyflock.com` 运行，本地预览不发送统计。默认不加载 Google 脚本；首次访问可在首页允许或拒绝统计，也可在游戏设置的 Optional usage analytics / 可选访问统计中修改。拒绝后游戏功能仍可使用。

用户同意后发送标准页面浏览，以及白名单内的 `quick_match`、`create_room`、`local_practice`、`game_start`、`game_end`（后两项目前用于联机游戏）。只附加枚举 `game_mode`（quick / friends / local），不发送用户ID、账号、邮箱、昵称、房间ID、邀请链接、表单内容、分数或支付信息。不是服务器成绩或财务报表，不应据此核算会员或收入。

页面地址仅保留已知公开路径，去掉全部 query/hash；来源地址仅保留 origin。Google Signals、广告个性化和广告存储关闭。增强型衡量功能关闭，避免自动收集表单、站内搜索和出站 URL。GA Cookie 配置寿命30天；撤回时禁用后续发送并清除可访问的 `_ga` Cookie，不清除游戏会话。

`?analytics_debug=1` 可用于明确的开发验证，query 不发送给 GA。不要把调试访问当作真实用户增长。没有创建 Measurement Protocol 秘密，也没有伪造 purchase 或真实收款事件。

## Google Search Console

- 网域资源：`sc-domain:joyflock.com`，已通过 DNS TXT 验证，覆盖主域和全部子域、HTTP/HTTPS。
- 网址前缀资源：`https://flight.joyflock.com/`，已通过 Google 官方 HTML 文件验证。
- 当前根域和 www 跳转到游戏站；之后新增游戏需为相应子域发布内容及站点地图。域名资源不会自动创建各游戏 GA 数据流。

DNS（腾讯云 DNSPod）：

```text
主机记录：@
类型：TXT
记录值：google-site-verification=TFqOOEkedYkC3hfmJqTDTiBzEU0SPaqAkcN3_K0aGlU
TTL：600
```

该 Google 验证值需要公开到 DNS，不是 API 密钥。保留现有 @、www、flight 的 A 记录；本次只新增 TXT，没有修改网站指向或 NS。

HTML 验证文件：`dist/googlecc6b6e16e288c986.html`。正式地址：`https://flight.joyflock.com/googlecc6b6e16e288c986.html`。不要在发布时删掉验证文件或 TXT 记录。

站点地图：`https://flight.joyflock.com/sitemap.xml`。Google 界面显示提交成功、读取成功、发现4个公开页面：首页、会员支持、服务条款、隐私政策。这不等于页面已编入索引或保证排名。

`robots.txt` 声明站点地图并禁止爬取 API、WebSocket 和邀请 query；公开页面具备 canonical，首页增加描述和 Open Graph 元数据。私密 API 仍依赖服务器鉴权，robots 不是权限保护。

## 验证与维护

GA4 与 Search Console 已实际关联成功：`joyflock.com`（网域）→ `Flight Party Web`（16247075660），Google 界面显示已成功建立关联。网址前缀资源仍保留独立 HTML 文件验证。

- `npm test` 包含统计同意前不加载、本地不发送、query/来源清理、事件/参数白名单、撤回后停止与仅清理GA Cookie的检查。
- 实际浏览器确认：同意前没有 Google script；同意后加载指定衡量ID脚本。GA4 实时报告已显示1名测试活跃用户以及 `page_view`、`first_visit`、`session_start`、`quick_match`。
- 网址及域名所有权均在 Search Console 显示成功；权威 DNS 查询能读到 TXT。公开 robots、sitemap、验证文件均返回200。
- Search Console 初次报告需要处理时间。统计仅包含允许统计且浏览器未拦截的访问，不代表所有玩家。
- 更换域名、搬家或重新打包时保留 analytics 模块、验证文件、robots 和 sitemap；更换测量资源需同步此文档。

参考：[GA4 配置](https://developers.google.com/analytics/devguides/collection/ga4/reference/config)、[Google 隐私设置](https://developers.google.com/tag-platform/security/guides/privacy)、[Search Console 验证](https://support.google.com/webmasters/answer/9008080)。
