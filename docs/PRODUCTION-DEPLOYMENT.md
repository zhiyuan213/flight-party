2026-11-20 23:05 最新生产发布：`0886eba`，**静态 51 文件 + 后端差量 JAR**。台球/九球击球力量 +30%（`POOL_SHOT_SPEED=0.624` / 后端 `SHOT_SPEED=.624`），斯诺克保持 `0.336`；落袋动画速度分级同步缩放，物理 golden fixtures 全量重标定。后端镜像 `deploy-backend:power30-0886eba`，回滚镜像 `deploy-backend:nineball-b4d77dd`，无新 Flyway 迁移。
2026-11-20 22:16 最新生产发布：`3d42d41`，**纯静态**，9 个 dist 文件，修复商城球杆/球组/球台装扮在台球类游戏未生效（crystal 与 galaxy 主题被棋子白名单过滤），无后端变更。

制品：总包 `release-3d42d41.tar.gz`（51 KB）含 `static-3d42d41.tar.gz`、`expected.sha256`（9 行）、`filelist.txt`、`release-all.sh`。发布目录 `/opt/joyflock/releases/static-3d42d41`，整包 `dist` 备份 `static.before.tgz`，回滚见 `rollback.private.txt`。`sha256sum -c` 9/9 OK，`nginx -t` 通过，未 reload，5 容器 Up、后端镜像未变、`/api/csrf` 200；双域名 HTTPS 10/10。GitHub `HEAD` = `origin/main` = `3d42d41`（文档提交另计）。

2026-11-20 21:32 最新生产发布：`3fb5cb7`，**纯静态**，17 个 dist 文件，修复九球右侧回球槽误显示 10–15 号球，无后端变更。

制品：总包 `release-3fb5cb7.tar.gz`（80 KB）含 `static-3fb5cb7.tar.gz`、`expected.sha256`（17 行）、`filelist.txt`、`release-all.sh`。发布目录 `/opt/joyflock/releases/static-3fb5cb7`，整包 `dist` 备份 `static.before.tgz`，回滚见 `rollback.private.txt`。`sha256sum -c` 17/17 OK，`nginx -t` 通过，未 reload，5 容器 Up、后端镜像未变、`/api/csrf` 200；双域名 HTTPS 10/10。GitHub `HEAD` = `origin/main` = `3fb5cb7`（文档提交另计）。

2026-11-20 21:20 最新生产发布：`8109a62`，**纯静态**，30 个 dist 文件，把「欢乐九球」移到所有游戏列表最后一位，无后端变更。

制品：总包 `release-8109a62.tar.gz`（462 KB）含 `static-8109a62.tar.gz`、`expected.sha256`（30 行，从 git archive 解压内容计算）、`filelist.txt`、`release-all.sh`。发布目录 `/opt/joyflock/releases/static-8109a62`，整包 `dist` 备份 `static.before.tgz`，回滚见 `rollback.private.txt`。`sha256sum -c` 30/30 OK，`nginx -t` 通过，未 reload，5 容器 Up、后端镜像未变、`/api/csrf` 200；双域名 HTTPS 16/16（资源哈希与页面末位顺序）。GitHub `HEAD` = `origin/main` = `8109a62`（文档提交另计）。

2026-11-20 21:00 最新生产发布：`54c11fb`（九球专属封面）+ `40f9358`（首次手势音频解锁），**纯静态**，40 个 dist 文件，无后端变更。

制品：总包 `release-40f9358.tar.gz`（1.5 MB）含 `static-40f9358.tar.gz`、`expected.sha256`（40 行，从 git archive 解压内容计算，规避 CRLF 误判）、`filelist.txt`、`release-all.sh`。发布目录 `/opt/joyflock/releases/static-40f9358`，整包 `dist` 备份为 `static.before.tgz`，回滚命令见 `rollback.private.txt`。执行 `sha256sum -c` 40/40 OK，`nginx -t` 通过，未 reload（文件路径不变、缓存键已升），5 容器 Up、后端镜像未变、`/api/csrf` 200。双域名 HTTPS 18/18 响应体哈希一致。GitHub `HEAD` = `origin/main` = `40f9358`。

注意：生产 `/opt/joyflock/backups` 对 ubuntu 不可写，备份目录统一放在 `releases/<tag>/` 内；静态覆盖沿用「解压到 `candidate/` 再 `cp -a` 到 `dist/`」以保留文件权限。大体积 OG 图（829 KB）跨境下载需 120s 超时，30s 会截断导致哈希误判。

2026-11-20 17:35 最新生产发布：`b4d77dd`，**静态 + 后端 JAR + nginx 配置**同窗口发布，新增第 10 款游戏「欢乐九球」。规则沿用台球全部渲染与托管链路，只分叉 9 颗菱形摆球、最小号首碰与 9 号即胜；前后端分别改 `dist/table/pool-rules.js` / `pool.js` 与 `PoolRules.java` / `GridRules.java` / `TableService.java`，八球路径逐字不变。

制品：静态增量包 `static-nineball-b4d77dd.tar.gz` SHA256 `9efed42a2871a0c26848ff0fc852a5a04bbd8d8dbe25757731044ab597eb4ce0`（74 个 dist 文件，1.6 MB）；差量重建包 `delta-nineball.tar.gz` SHA256 `dd79dc16a689652ede5b07e9c54d8130577134293496cb79a2a3bd7b318b0bab`（31 KB，替换 `PoolRules.class` / `GridRules.class` / `TableService.class` 三个条目）。生产端用运行容器旧 JAR（SHA256 `99bd7408…5303`）重建完整 JAR 44,283,265 B、378 条目、条目摘要 `46b77e2b…c468`，构建运行镜像 `deploy-backend:nineball-b4d77dd`（541 MB），只重建 backend；web/edge/postgres/redis 未动。

配置：本地 `deploy/nginx.conf` 两处 `?game=` 重写正则加入 `nineball`，与生产配置（仅 CRLF 差异）比较后以 `cat >` 保留 inode 合并，`nginx -t` 通过后 reload；`^/(table/|assets/(pool/|audio/pool/))` 生产独有 no-cache location 保留。缓存键统一追加 `&nine=20261120-nineball1`，SEO `SITE.cacheKey` 升为 `20261120-nineball1`。

数据库：**无新 Flyway 迁移**，启动日志校验 25 个迁移、schema V25；`table_rooms.game` 与 `table_results.game` 是无约束 varchar，新值 `nineball` 无需 DDL。注意 `select max(version)` 按字符串比较会返回 `9`，不是版本回退。发布前有 3 个 WAITING 房间（chess/four/pool）、无 PLAYING 对局，状态 JSON 兼容。

验收：`npm test` 1043/1043、后端 `NineBallRulesTest` 4/4、本地 Chrome 中文态零 JS 异常；双域名 40/40 关键资源响应体哈希与制品一致，`/?game=nineball` 双域名 200 且内部重写到 `data-native-game="table"`，中英 SEO 页 200；生产 API 实测九球建房 200（`board.game='nineball'`、53 格、仅 1–9 存活）、八球建房回归 200，测试房间已 leave 清理。备份 `/opt/joyflock/backups/20261120T093419Z` + `static.before.tgz` + `deploy.before` + `nginx.before.conf` + `backend-before.private.json` + 回滚镜像标签 `joyflock-backend:before-nineball-b4d77dd`；发布目录 `/opt/joyflock/releases/app-nineball-b4d77dd`，回滚 override 指向 `deploy-backend:poolshell-7b74f87`。本轮新增文件，回滚须按发布清单单独处理新增路径。详细证据见 `QA.md` 末节。


2026-11-17 21:28 生产状态核验（**本轮无应用发布**）：用户要求「部署生产」。核查后本地 `HEAD` = `origin/main` = `d3cbda0`（`d609b73` 的发布记录提交），已跟踪工作区无改动；生产 `dist` 的 **569/569** 个文件与 `git archive HEAD dist` 逐字节一致，双域名 15 个关键资源 × 2 = **30/30** HTTPS 响应体哈希一致，`npm test` **1036/1036**。因此不重复复制静态包、不重建容器、不新增备份。运行态：5 个容器 Up，backend `deploy-backend:poolshell-7b74f87`、restarts=0，Flyway V25 success，`nginx -t` 通过，`/api/csrf` 200，`/opt` 使用 33%；`.env` 与容器 env 均 `CREEM_LIVE=false` / `CREEM_CHECKOUT_ENABLED=true` / `CREEM_TEST_ACCOUNTS=*`，`.env.live` 不存在，`switch-to-live.sh` 哈希 `eb1dec2e…` 与本地一致且未执行。

生产 `deploy/nginx.conf`、`compose.yaml`、`compose.production.yaml` 与 HEAD 的原始哈希差异仅为早期上传留下的 CRLF（61/59/31 行），规范化换行后内容完全一致，生产独有的 `?v=` 24h 缓存 map 与 `^/(table/|assets/(pool/|audio/pool/))` location 均已生效；按手册不覆盖、不 reload。本轮唯一实际同步是 `deploy/README.md`：生产为 2026-11-02 旧版，已用 HEAD 的 LF 版（3,931 B，SHA256 `0032b4b6…d354a`）以 `cat >` 保留 inode 覆盖、chmod 644、回读哈希一致；纯文档，未触碰 dist / 容器 / `.env`。正式收款仍为沙盒，切换唯一入口 `deploy/switch-to-live.sh` 需 `deploy/.env.live` 四项 live 凭据与 `--confirm-merchant-approved`；凭据到位前禁止执行或手改 `CREEM_LIVE`。静态回滚 `/opt/joyflock/releases/static-d609b73`，后端回滚 `/opt/joyflock/releases/app-7b74f87/rollback.private.json`。详细证据见 `QA.md` 末节。

2026-11-17 18:05 最新生产发布：本地提交 `d609b73`（**纯静态**，3 个文件）。用户反馈飞行棋详情页最左边有一条白线。根因：旧版浅色主题 `dist/visual-v2.css` / `visual-v3.css` 用元素选择器给所有 `<aside>` 设了 `border-left:2px solid #fff`（窄屏 media 里改为 `border-top:2px solid #fff`）；深色主题的 `dist/portal/native-game.css` 只重置了 `.native-rail` 的背景，未重置边框，且 `portal.css` 只重置了 `border-right`。CDP 实测 768/980px 视口下 `.native-rail` 计算样式为 `border-left:2px solid rgb(255,255,255)`，配合 `position:fixed;left:0` 的竖排 rail 正好画出这条贯穿页面的白线；387px 时则变成顶部白横线。

修复：`.native-rail` 增加 `border:0;box-shadow:none`，并加 `html[data-native-game] aside{border-left:0;border-top:0}` 覆盖隐藏的对局侧栏，补 `::-webkit-scrollbar{display:none}`。类选择器优先级高于旧版元素选择器，所有视口宽度都生效。缓存键升 `&nl=20261117-noline1`（两个原生页与生成器同步）。新增 `tests/native-rail-border.test.mjs` 3 条守卫。

验收：`npm test` **1036/1036**；本地与生产 Chrome 在 768/387px 下 `.native-rail` 的 `border-left` / `border-top` 均为 `0px none`，768px 截图白线消失；`?game=pool` rail 同样归零；双域名 **6/6** 哈希一致；`nginx -t` 通过；`CREEM_LIVE=false` 与后端镜像 `deploy-backend:poolshell-7b74f87` 未变，Flyway V25，容器未重启。静态包 `static-d609b73-incremental.tar.gz` SHA256 `73182861…6f3c`；发布目录 `/opt/joyflock/releases/static-d609b73`，备份 `/opt/joyflock/backups/20261117T100238Z` + `static.before.tgz` + `deploy.before`。本轮 GitHub 推送已恢复，此前待补推的提交一并推送完成。

2026-11-17 16:45 最新生产发布：本地提交 `ed632b9`（**纯静态**，10 个文件）。本轮**未切换正式收款**——生产仍是 `CREEM_LIVE=false`、`CREEM_API_KEY=creem_test_…`、沙盒商品 `prod_ZgfEOcdg…` / `prod_vdNtdXt…`，`docs/QA.md` 亦记录「未配置正式 API 密钥」「商户审核/正式商品放行尚未完成」。缺少 live API key、live webhook signing secret 与两个 live product ID 时只改开关会造成三类故障：live API 用沙盒 key 返回 401、live 环境找不到沙盒商品、正式 webhook 用旧 secret 验签失败（**真实付款不落权益**）。

本轮完成切正式支付的前置条件：① 共享账号面板 `.chrome-auth` 补上「取消自动续费」按钮并接 `/api/billing/subscriptions/{id}/cancel`，解决脚注声称可取消而面板无入口的问题；② 沙盒订阅不再显示「自动续订已开启，无需重复开通」，改为「沙盒测试订阅，不产生真实扣费，也不会自动续费」，正式订阅仍保留原自动续订文案；③ 两个原地修改文件升级缓存键 `&pre=20261117-prelive1`（10 个 HTML 与生成器同步）；④ 新增 `deploy/switch-to-live.sh`：校验 live 凭据与沙盒凭据互异、key 不含 test、用正式 API 实查两个商品的 mode/USD 900/5900/recurring 周期、要求人工确认商户审核，之后才备份 `.env`、打回滚镜像标签、只重建 backend 容器。脚本已放置到生产 `/opt/joyflock/flight-party/deploy/switch-to-live.sh`（755），**未执行**。

验收：`npm test` **1033/1033**（新增 `tests/billing-prelive.test.mjs` 4 条）；本地 Chrome 三态（沙盒/正式/已取消）7/7；生产 Chrome 沙盒中文态面板误导热文案已消失、取消按钮可用；双域名 **20/20** 变更文件哈希与制品一致；`nginx -t` 通过，`CREEM_LIVE=false` 与后端容器 env 复核一致。静态包 `static-ed632b9-incremental.tar.gz` SHA256 `2b17f370…1f19`，发布目录 `/opt/joyflock/releases/prelive-ed632b9`，备份 `/opt/joyflock/backups/20261117T083946Z` + `static.before.tgz` + `deploy.before`。后端镜像仍 `deploy-backend:poolshell-7b74f87`，Flyway V25，容器未重启、无迁移。

**后续切换步骤**（凭据到位后）：在服务器以 `umask 077` 创建 `deploy/.env.live`（仅 4 个键：`CREEM_API_KEY`、`CREEM_WEBHOOK_SECRET`、`CREEM_MONTHLY_PRODUCT_ID`、`CREEM_ANNUAL_PRODUCT_ID`）→ `sudo bash deploy/switch-to-live.sh --dry-run` → 确认 Creem 后台 KYB 通过、live webhook 指向 `/api/billing/creem/webhook` 且用新 secret、结账页披露自动续订 → `sudo bash deploy/switch-to-live.sh --confirm-merchant-approved` → 按脚本输出做一笔真实小额付款并确认 `subscription.paid` 生成 `test_mode=false` 的 ACTIVE 权益。`docs/QA.md` 记录的「未完成完整支付续订时间推进」仍未验证，正式上线后需单独观察第一个计费周期。

2026-11-17 00:30 最新生产发布：`a425237`（**纯静态**，14 个文件）。用户反馈「未登录却显示 100,720 Joy Coins」且「两个页面登录入口不一样」，本轮统一两点：① **未登录余额显示 0**——`site-points.js` 新增 `accountName()`/`shownTotal()`，读取共享顶栏写入的 `localStorage.joyflock.accountName` 与 host cookie `joyflock_account`（`0` 表示已确认访客），访客浏览器顶栏 pill、tooltip、aria-label 与商城余额一律显示 0；本地钱包 `joyflock.shop.v1` **不删除、不重置**，登录或收到 `joyflock:account-changed` 后重绘恢复真实余额，退出登录再次归零。无 `location` 的单元测试 harness 保持原预览数值。② **三个登录入口统一**——`/`、`/?game=pool`、`/?game=flight` 此前分别使用 `.chrome-auth` 共享面板、`#auth` 台球旧表单、`#account-dialog` 飞行棋旧表单；原生详情页的 `native-game.js` 原样镜像内层 `#account-open` 文案（所以台球显示「登录 / 注册」）。现在两个 `native-*.html` 由生成器统一引入 `site-account.js`，`#chrome-account` 首帧即双语文案「Sign in / 登录」并由首帧 boot 同步已登录昵称与 `chrome-signed`；`native-game.js` 删除文字镜像与点击转发，改由共享面板处理，登录/退出时向同文档广播 `joyflock:auth-changed`，`table.js` 据此刷新身份。缓存键全升：`site-points.js` / `site-shop.js` 加 `&z=20261117-guestzero1`，`native-game.js?v=20261117-chrome1`；`site-account.js` 本身未改，复用已缓存 URL。制品 `static-a425237-incremental.tar.gz` SHA256 `db165f62015064fa7c4fd630fb1108cf8b6487696961b983f691b516d7d97863`，发布/回滚目录 `/opt/joyflock/releases/static-a425237`，数据备份 `/opt/joyflock/backups/20261116T163022Z`（PostgreSQL + Redis）、`static.before.tgz`、`deploy.before`。**后端未重启、无新 JAR、无 Flyway 迁移**，仍为 `deploy-backend:poolshell-7b74f87` / V25，活动房间 0 时才发布。验收：`npm test` **1029/1029**（新增 `tests/guest-balance-login-entry.test.mjs` 5 条守卫）；双域名 **28/28** 变更资源响应体哈希与制品一致；本地 Chrome 四入口（中英双态）均显示余额 0、点击统一打开 `.chrome-auth`「欢迎回来」、模拟登录后恢复 10,000；生产 Chrome 复验三入口弹窗统一、余额 0，零控制台错误。注：生产跨境链路上 defer 脚本排队，全新缓存下 `site-points.js` 约 50 秒才执行完，pill 随后出现并正确显示 0；这是既有的首屏链路问题，非本轮逻辑错误，资源命中 24h 缓存后明显加快。已知范围：结算弹窗「Joy Coins 余额」仍按本地钱包展示本局累计（本局结算语境），顶栏与商城余额为 0。GitHub 应用与记录提交均已推送。

上一版（历史）：2026-11-16 23:52 生产发布：`7b74f87` 后端补齐，镜像 `deploy-backend:poolshell-7b74f87`。`TableService.leaderboard("flight", period)` 的真实胜率分支正式上线（从 `account_match_results` 按 `rank=1` 计胜、`matches.status='SETTLED'` 计局，字段与 `SettlementService` 写入一致）。**静态部分未再改动**，仍是 23:05 的 6 文件增量包 `static-7b74f87-incremental.tar.gz`。44MB JAR 无法在跨境链路直传（单个 11MB 分片耗时 6m33s，后续连接被限流断开），改为**差量重建**：旧 JAR 取自运行容器 `/app/app.jar`（SHA256 `12ade40c13ddcb330a6e520cb33792132baafba7b6cbf33baf2913d05c09ab0f`），新旧 378 个条目仅 `BOOT-INF/classes/com/flightparty/table/TableService.class` 不同（42,238 字节）；上传 `delta-release.tar.gz` 17,597 字节（SHA256 `e65f0a976b1813b29e1eae81b5a561d3ec332a9df313760f23990bf9d8ff36d5`，含该 class、`rebuild.py`、`Dockerfile.runtime`、`release.private.json`）与 `deploy.sh`，生产端 Python 3.14 重建完整 JAR（44,282,423 字节、权限 0644），条目级内容摘要 `8e37db88a7118e8aaf624f04fb86edf50d5e1386fe2d044604a8611418fb48c3` 与本地 `mvn -B verify` 制品逐条一致；本地 Docker 预启动确认 Spring Boot 4.1.2 / Tomcat 11 正常加载重建 JAR。仅重建 `deploy-backend-1`，web/edge/postgres/redis 未动；Flyway 25 个迁移全部校验通过、无新迁移，容器 5.037s 启动完成。验收：双域名 `flight` 三周期 6/6 `200`，`month` 返回真实胜率行（`Midgame test pilot` 1 局 100%、`大卫` 24 局 25%），`week/day/pool` 为 `[]`；`/api/me`、`/api/csrf` 200；生产 Chrome 10 行榜单真实行优先、不足 10 行补示例并标 Sample data、三周期各一次预取、零控制台错误；nginx 近 10 分钟无 4xx/5xx，后端日志无异常（验收探测旧接口 `/api/leaderboards?period=month` 缺 `type` 参数触发一条预期 WARN，非回归）。回滚：`/opt/joyflock/releases/app-7b74f87/rollback.private.json` 指向 `deploy-backend:vip-18691ef`，另有镜像标签 `joyflock-backend:before-7b74f87`；发布目录仍为 `app-7b74f87`，数据备份 `20261116T145217Z`。GitHub 应用提交与全部发布记录均已推送，远端 `main` 与本地一致。期间生产 SSH 在 23:39–23:51 于握手前拒绝连接（直连与同源出口代理均如此，代理出口与直连同为 `142.202.242.202`），等待窗口恢复后一次完成发布；以后大 JAR 发布优先走差量重建。

上一版（历史）：2026-11-16 23:05 应用发布：`7b74f87`（**纯静态**）。飞行棋详情页整页改用欢乐台球那一套：左栏 `.game-hero`（182x182 动画封面 + 标题/描述/标签 + 三个竖排扁平按钮），右栏 `.home-ranking` 扁平「玩家排行 / 月周日胜率榜 / 玩家·局数·胜率」10 行表格，底部单列「怎么玩 / 会员与支持 + 四格数据」；删除大号「快速匹配」按钮、「所有玩家不限次数」卡片、legal 脚注与带奖杯的 Joy Coins 榜。机器人难度移到标签行做小 chip，主按钮组与台球一样是 3 个。排行榜三周期进入时一次并行预取（`/api/table/leaderboards/flight?period=`）、切换零请求、只显示完成局数与一位小数胜率、真实行优先且示例行标注「示例数据」。制品 `static-7b74f87-incremental.tar.gz` SHA256 `47a1e6f357fac38409ebfe9f966c96b7fee50fb48f9b4b2adb5c3e15ea229d0a`（6 个静态文件）。发布/回滚目录 `/opt/joyflock/releases/app-7b74f87`，数据备份 `/opt/joyflock/backups/20261116T145217Z`。**后端未重启、无新 JAR、无 Flyway 迁移**，仍为 `deploy-backend:vip-18691ef`：`TableService.leaderboard()` 新增的 `flight` 真实战绩分支已通过本地 `mvn -B verify`，但 44MB JAR 在跨境链路上传多次中断，本轮未发布；旧后端对 `/api/table/leaderboards/flight` 与 `/api/table/leaderboards/pool` 均返回 `200 []`，因此两页当前都以 10 行示例数据呈现，结构与数据链完全一致。下次常规后端窗口发布该 JAR 后，飞行棋榜会自动改用 `account_match_results` 的真实胜率，无需再改前端。前端 `npm test` **1024/1024**；双域名 12/12 变更资源响应体 SHA256 与制品一致；生产 Chrome 验收：封面 182x182、`.game-hero` 274px（与台球同尺寸）、10 行胜率榜、三周期各一次 200、零控制台错误；中文态文案、390px 无横向溢出、三次切换周期新增请求 0，均通过。缓存键 `&rl=20261116-poolshell1` / `flight-detail-layout.css?v=20261116-poolshell1` / 两个模块 `&p=20261116-poolshell1`。

上一版（历史）：`b9cab3e`（**纯静态**，两次连续增量：`e54b2cf` → `b9cab3e`）。修复飞行棋「无法加入该房间／连接失败」：`online-session.js` 在 `/leave` 发出前先断开 WS 并提升 generation，杜绝因席位移除触发 1008 后对同一房间重发 `/snapshot`（403）；`start-now`/`ready` 等房间命令在已退出状态下本地拒绝；陈旧 `activeRoomId` 恢复失败时静默降级并提供「重新创建房间」按钮。同时缩短详情页首屏：`csrf` 后 `guest` 与 `/api/me` 并行、`/api/me` 焦点轮询 15s→60s、10 个 WAV 预取推迟到 `requestIdleCallback` 并按音懒加载；并发开两个标签时 `guest` 遇 403 会重取 CSRF 令牌重试一次。`deploy/nginx.conf` 新增 `map "$uri:$args"`：带 `?v=` 的静态资源 `public, max-age=86400`，HTML、`/api/` 与生产原有 `/table/|/assets/pool/` 正则 location 保持 `no-cache`；**以后原地改文件必须同步升级 `?v=`**。本发布同时带上此前已完成本地验证但未上线的网格结算 900ms 停留（`&g=20261116-gridhold1`）和飞行棋详情两栏布局＋HeroPlane 动画（`flight-detail-layout.css?v=20261116-flightdetail1`）。制品 `static-e54b2cf-incremental.tar.gz` SHA256 `038ac38e4c8b5bf72508c79533d88ed99a1cd36caa40e59fc6f96e21620995c7`、`static-b9cab3e-incremental.tar.gz` SHA256 `9d482e80eb32f84903853bd143c182ca697eb6c3088c9cd1ac2b92b3cd2b6366`。无新 JAR、无 Flyway 迁移，后端仍 `deploy-backend:vip-18691ef`、数据库 V25，容器未重启；nginx 配置经 `nginx -t` 后 reload，挂载 inode `655846` 未变。发布/回滚目录 `/opt/joyflock/releases/static-e54b2cf`、`static-b9cab3e`，数据备份 `/opt/joyflock/backups/20261116T133823Z` 与 `20261116T135534Z`。前端 `npm test` 1019/1019。双域名 24/24 + 8/8 变更资源响应体 SHA256 与制品一致；生产 Chrome 验收：建房→退出仅 `POST /api/rooms 200` 与 `POST /api/rooms/{id}/leave 200`，无 `/snapshot` 403、无 `start-now` 403、零控制台错误；清空 Cookie 后双标签并发引导两页均 `csrf/guest/me 200`，零 4xx；冷/热缓存详情页静态请求 93 个中 49 个直接命中磁盘缓存，其余 43 个 `no-cache` 资源返回 304。

上一版（历史）：`75441bd`（**纯静态**）。四轮前端改动合并上线：全站头像框/描边/底板移除（`&f=20261116-noframe1`）、手机窄屏斯诺克计分牌三列布局与泡泡龙画布 `aspect-ratio:1440/765`（`&m=20261116-mobileplay1`）、Joy Coins 结算计数改墙钟计时约 1.5s 且与帧率无关（`&c=20261116-fastcount1`）、详情页胜率榜三个周期进入时一次并行预取且切换零请求（`&b=20261116-prefetch1`）。共 21 个静态文件，`static-75441bd-incremental.tar.gz` SHA256 `f20c2dbfdcc111d8d13d4d68d1a58123487f5c4371935baebad7f785e6556dbb`。无新 JAR、无 Flyway 迁移，后端仍 `deploy-backend:vip-18691ef`、数据库 V25，容器全部未重启。发布/回滚目录 `/opt/joyflock/releases/static-75441bd`（`static.before.tgz` 73MB、`deploy.before`、web/backend `docker inspect`），数据备份 `/opt/joyflock/backups/20261116T114952Z`。前端 999/999。两个域名 21/21 变更资源响应体 SHA256 与制品一致；生产 Chrome 三页验收（门户 9 卡、飞行员榜 10 个头像 `border:0`/`box-shadow:none`/`transparent`/`radius:0` 且图片保留、详情页进入 3 请求 / 6 次切换 0 请求）零控制台错误与网络失败。
更早的应用发布（历史）：`18691ef` 后端 `deploy-backend:vip-18691ef` 防重复订阅 + `/api/me` 返回 `billing_plan`，VIP 价格行 `$9 USD/月`，缓存 `&p=20261116-nospace1`；发布目录 `/opt/joyflock/releases/vip-18691ef`，JAR SHA256 `12ade40c13ddcb330a6e520cb33792132baafba7b6cbf33baf2913d05c09ab0f`。更更早的 `8726970` 为 VIP 双套餐与 `CREEM_TEST_ACCOUNTS=*` 沙盒策略。

# JoyFlock 生产部署手册

更新日期：2026-11-16。本文是操作手册；实际发布版本、结果和限制以 `QA.md`、`HANDOFF.md` 最新发布记录为准。

历史发布记录（已被 `7b74f87` 取代，不是当前版本）：`42c9f5b` 上线同页游戏入口、原导航悬停效果、音效调平、布尔静音和登录后滚动条修复；当时两个域名各完成 62/62 静态文件校验、18 个游戏入口及公开 API 检查，完整测试 977/977，后端 `deploy-backend:9cc07b8`，数据库 V25。其静态/config 回滚包位于 `/opt/joyflock/releases/native-42c9f5b/`，数据备份 `/opt/joyflock/backups/20261115T131752Z`。这些是当时的发布事实，不是当前版本号或未来发布应复用的目录。

## 环境与连接

| 项目 | 当前配置 |
| --- | --- |
| GitHub | `https://github.com/zhiyuan213/flight-party`，私有仓库 |
| 生产入口 | `https://joyflock.com/`；`https://flight.joyflock.com/` 也提供首页 |
| 主机、用户 | `43.153.70.181`，`ubuntu` |
| 应用目录 | `/opt/joyflock/flight-party` |
| 发布与备份 | `/opt/joyflock/releases/`、`/opt/joyflock/backups/` |
| 服务 | `deploy-edge-1` Caddy、`deploy-web-1` nginx、`deploy-backend-1` Java、`deploy-postgres-1`、`deploy-redis-1` |
| 内部入口 | backend `127.0.0.1:8080`；nginx `127.0.0.1:8081` |

本机为 Windows PowerShell。当前专用密钥位置为 `$env:USERPROFILE\.ssh\joyflock_deploy`。密钥可能加密，需要使用已经解锁的 ssh-agent；密码、私钥、数据库口令、Creem 密钥不得放进 Git、本文或聊天日志。其他操作人员使用自己的已授权凭据，不复制他人的私钥。

```powershell
ssh -o BatchMode=yes -o ConnectTimeout=8 -i $env:USERPROFILE\.ssh\joyflock_deploy ubuntu@43.153.70.181 'whoami; sudo -n docker ps'
```

`Permission denied (publickey)` 要检查用户是否为 ubuntu、密钥及代理是否正确。不要把认证失败误判为服务器宕机。Git push 不会自动部署；服务器无需安装操作者的 GitHub 凭据。

## 确定发布范围

当前已发布的根入口路由：`/` 内部提供 `/portal/index.html`，地址栏可保持根路径；飞行棋明确使用 `/index.html`。本地及 `flight.joyflock.com` 上的旧 `/?embed=joyflock`、非空 `/?room=...` 继续进入飞行棋。主域名的 Caddy 原本已经将根路径内部重写到 portal。此项已在生产验证。发布时需一起更新 portal.js 的飞行棋 iframe 地址及 nginx 配置，并保留生产原有的其他 location；只上传静态文件不足以修改 nginx 根路由。

- 纯 UI、音频、样式改动：发布相应静态文件及缓存引用；通常无需重启后端、数据库或 nginx。
- Java、服务端协议、物理参数变更：构建并验证后端 JAR，与对应前端同一窗口发布。台球前后端物理必须一致，发布前检查正在进行的对局及旧状态兼容性。
- Flyway 迁移：先备份，核对所有已应用迁移校验和，再运行新版本。不要修改旧迁移、执行 `repair` 掩盖差异、删除迁移历史或因应用回滚直接恢复旧数据库。
- 部署配置：生产 `.env`、计费配置、Caddyfile、nginx 配置可能带有线上专用设置，必须比较后合并。不要直接用本地配置覆盖。

## 本地准备

```powershell
git status --short --branch
git diff --check
npm test
# 对本次改动的 JS 逐个执行 node --check。
```

UI 修改需要浏览器验证。记录实际执行的检查及限制；自动化调度通过不代表真实音箱、蓝牙、手机或付款验证通过。蓝牙存在设备链路延迟，不能据此随意提前播放游戏碰撞音效。

缓存要求：保留既有测试冻结的 `v=`、`d=` 等键，只追加明确的发布参数，例如 `release=20261115-polishrelease1`。修改共享 ES module 后，应更新所有导入者及其父链，直到 HTML 入口，保证同一页面的音频模块使用同一个完整 URL，否则会创建不同的 AudioContext。共享脚本在所有 shell 页的引用保持一致；修改 SEO 生成页引用时也检查生成器是否会覆盖。

仅提交已审查的文件。设计参考、截图可能有大量未跟踪文件，不使用 `git add .` 盲目提交。提交、测试、推送后记录完整 commit ID，使用该提交打包，避免上传未提交的工作区代码。

## 生产备份与预检

下列命令在生产 SSH shell 中执行。使用唯一发布目录，并保留磁盘空间。

```sh
set -eu
umask 077
LIVE=/opt/joyflock/flight-party
RELEASE=/opt/joyflock/releases/你的发布标识
mkdir -p "$RELEASE"
chmod 700 "$RELEASE"
df -h /opt
sudo -n docker ps
sudo -n sh "$LIVE/deploy/backup.sh"
tar -czf "$RELEASE/static.before.tgz" -C "$LIVE" dist
cp -a "$LIVE/deploy" "$RELEASE/deploy.before"
sudo -n docker inspect deploy-backend-1 > "$RELEASE/backend-before.private.json"
sudo -n docker tag "$(sudo -n docker inspect deploy-backend-1 --format '{{.Image}}')" joyflock-backend:before-你的发布标识
```

`backup.sh` 输出的目录内包含 PostgreSQL dump 和 Redis RDB。使用 sudo 检查备份非空；这些是同机备份，不能代替异地备份和恢复演练。`deploy.before`、docker inspect 文件、有效 Compose 配置可能含凭据，保持目录私有，不能上传公共证据或 Git。

记录当前镜像、迁移版本、服务状态以及活动房间情况。备份成功才切换。

## 静态发布

在本地从已提交版本生成制品。全量静态包示例：

```powershell
git archive --format=tar.gz -o .workbuddy/tmp/static-release.tar.gz HEAD dist
Get-FileHash .workbuddy/tmp/static-release.tar.gz -Algorithm SHA256
scp -i $env:USERPROFILE\.ssh\joyflock_deploy .workbuddy/tmp/static-release.tar.gz ubuntu@43.153.70.181:/opt/joyflock/releases/你的发布标识/static-release.tar.gz
```

也可用明确的已提交变更清单生成增量包，但必须包含所有入口、共享资源及缓存父链。归档路径统一相对仓库根目录（含 `dist/`），校验 SHA256，先解压到发布目录检查，不从未知归档直接覆盖线上。

Windows Git 的导出属性／换行配置可能使归档文件为 CRLF，而 `git show` 显示 LF。线上响应的字节哈希应与**实际上传归档解出的文件**比对，同时确认其规范化文本与提交一致；不要把这种换行差异误报为 CDN 旧内容，也不要为通过校验而忽略真正的内容差异。

在生产执行：

```sh
set -eu
LIVE=/opt/joyflock/flight-party
RELEASE=/opt/joyflock/releases/你的发布标识
sha256sum "$RELEASE/static-release.tar.gz"  # 与本地输出逐项比对
mkdir -p "$RELEASE/candidate"
tar -tzf "$RELEASE/static-release.tar.gz"    # 确认只有计划内路径
tar -xzf "$RELEASE/static-release.tar.gz" -C "$RELEASE/candidate"
cp -a "$RELEASE/candidate/dist/." "$LIVE/dist/"
```

nginx 挂载的是现有 `dist` 目录。必须复制内容进去，不能删除或重命名整个目录再换新目录，否则容器可能仍指向旧 inode。增量复制不会删除已移除的旧文件；如有删除需求，按审查清单单独处理，禁止对线上计算路径进行盲目递归删除。

静态文件改变无需 nginx reload；配置改变时先 `sudo -n docker exec deploy-web-1 nginx -t`，成功后再 reload。配置文件也要保留挂载 inode，或明确重建对应容器。

## 后端发布（只有 Java／协议／迁移变更时执行）

本机 Docker 可用时，先在本地构建：

```powershell
docker build --target build -t flightparty-release-build:你的发布标识 backend
# 该阶段执行 mvn -B verify；检查摘要，记录跳过的外部集成测试。
docker create --name flightparty-release-extract flightparty-release-build:你的发布标识
docker cp flightparty-release-extract:/app/target/flight-party-backend-0.1.0-SNAPSHOT.jar .workbuddy/tmp/release.jar
docker rm flightparty-release-extract
Get-FileHash .workbuddy/tmp/release.jar -Algorithm SHA256
```

源码构建上下文必须与发布提交一致。上传 JAR 并核对哈希；生产曾缺少 buildx，因此可在本机构建验证 JAR，在服务器仅构建运行镜像：

```dockerfile
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY app.jar /app/app.jar
RUN chmod 644 /app/app.jar
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

JAR 必须可被容器内非 root 用户读取。2026-11-15 曾因私有发布目录的 umask 导致复制进镜像的 JAR 为 0600，出现 `Unable to access jarfile`；应在镜像内确保 0644，并在切换前检查权限。

使用新镜像标签。复用现有 Compose 项目 `deploy`、网络和持久卷；保留所有有效生产环境变量。既有运行容器的环境可能与 `.env` 默认值不同，必须比较，不能无意关闭计费配置或更换数据库密码。可在私有目录保存精确的环境覆盖及回滚 Compose 文件。

完成迁移校验及候选验证后，用现有配置加一个仅更换 backend image 的私有 override 执行：

```sh
sudo -n docker compose --env-file "$LIVE/deploy/.env" \
  -f "$LIVE/deploy/compose.yaml" -f "$LIVE/deploy/compose.production.yaml" \
  -f "$RELEASE/release.private.json" up -d --no-build --no-deps backend
```

先确认新镜像健康和迁移成功，再发布依赖它的静态文件；不在旧后端已恢复后继续误执行“新后端健康”的发布脚本。出现启动失败要停止本轮流程、明确恢复状态后重试，不能有两个发布脚本同时切换容器。

## 验收

1. `docker ps`：backend running、重启数稳定，PG／Redis healthy。
2. `curl -fsS http://127.0.0.1:8080/api/csrf` 和 HTTPS `/api/csrf` 正常。按具体实现检查 `/api/me`；不要把未登录当服务故障。
3. 若有迁移，查询 `flyway_schema_history` 的最新版本与 success；检查日志无校验失败。
4. HTTPS 入口和本次变更资源 HTTP 200；把实际响应体 SHA256 与发布制品比对，确认缓存刷新参数。只看状态码不足以证明新内容上线。
5. 浏览器打开门户、嵌入游戏页，检查本轮 UI、资源错误与控制台。iframe 的 `title` 必须正确闭合，`allow` 是独立属性；本项目曾因此丢失 autoplay 声明。
6. 按本轮范围测试双游客入房／合法操作／完整结算、游客累计仍为零、WSS。WSS 101 只证明握手，不等于完整跨设备同步验证。
7. 仅在明确授权的范围验证登录写分和支付；不伪造 Creem 事件或授予正式权益，不用真实账号造测试成绩。

将部署 commit、制品哈希、镜像、迁移版本、备份位置、检查结果和未验证项写入 QA／HANDOFF，再推送记录。文档提交可以晚于部署的应用提交，必须分别写清。

## 回滚

- 纯静态：从 `static.before.tgz` 解压到私有暂存目录，再复制内容回现有 `dist`；若发布新增了文件，按发布清单处理。入口引用也一起恢复。必要时使用新的缓存参数，避免客户端继续持有失败版本。
- 后端：使用已保存的镜像和精确环境覆盖重建 backend，验证健康；与之配套恢复前端。不要仅恢复一端的台球物理。
- 数据库：应用回滚不能自动回滚已执行的迁移。先判断旧 JAR 是否兼容当前 schema／Flyway 历史；必要时构建兼容制品。恢复数据库会丢失备份后的数据，必须另行制定并授权恢复方案。
- 永远不要执行 `docker compose down -v`，不要删除 PostgreSQL／Redis 持久卷，也不要把本地 `.env` 覆盖到生产。

## 已知验证边界

正式支付能力依赖已验证的 Creem live 配置与事件；配置文件或 UI 文案不是付款成功证据。浏览器必须获得用户手势才能启动声音，音量、静音、蓝牙设备缓冲也会影响试听。自动化和无头截图不证明真实 GPU、实体手机、音箱听感、容量或灾备恢复能力。

已发布的同页游戏结构见 [NATIVE-GAME-PAGES.md](NATIVE-GAME-PAGES.md)。根路径与 portal 精确路由均已合并，并保留生产原有静态正则、API/WSS location。回滚应恢复本次静态包与 nginx.before.conf，检查并重载 nginx；不能只恢复页面或只恢复路由。
