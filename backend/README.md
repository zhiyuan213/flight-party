# 服务端开发基线

本地同源网页入口：`http://127.0.0.1:8081`，由 web 代理静态前端、/api 和 /ws。当前页面行为仍是单机/预览；online-session.js 尚未与游戏 UI 绑定，不代表网页已能在线玩。

匹配到期调度现已运行，读取 Redis 索引并在 30 秒到期后补机器人、转 STARTING。可运行 `node backend/scripts/test-matching-deadline.mjs` 实测。STARTING 仍未连接 PG 开局事务和权威对局；不可玩，测试房间暂保留以供后续恢复处理。

准备接口为 `POST /api/rooms/{id}/ready`（`{"ready":true}`）；快速匹配暂为 `POST /api/rooms/quick`。全准备转公共匹配，quick 优先加入现有公共空房并沿用截止时间；当前未实现到期调度、PG 开局事务和对局激活，不能在线游戏。

等待房接口已提供 `POST /api/rooms`、`POST /api/rooms/join`（JSON `code` 为创建响应的 roomId）、`GET /api/rooms/{id}/snapshot` 和 `POST /api/rooms/{id}/leave`。需先建立匿名会话并在 POST 提交 CSRF token。房间和身份占用原子写 Redis；仅支持当前单实例开发环境。`node backend/scripts/test-room-http.mjs` 验证两个会话同房。尚无准备、匹配、开局或在线游戏。

事件消费者可通过 `flightparty.events.enabled=true` 开启，默认关闭。它按分片串行投影，优先处理固定消费者名的 pending，再读新消息；失败停止该分片本批处理。仅支持单实例和固定消费者名，尚未完成消费者端到端故障演练，不支持多实例抢占或其他消费者 pending 迁移。

这是 M1 的初始规则模块，不提供在线对局 API，也不能用于生产。现有网页仍使用本地引擎。Java 规则接收由调用方提供的骰子值；未来服务必须自行生成并安全地持久化结果，不能信任客户端骰子。

需要运行中的 Docker Desktop。从项目根目录执行：

```powershell
docker compose -f deploy/compose.yaml build
docker compose -f deploy/compose.yaml up -d
docker compose -f deploy/compose.yaml logs backend
docker compose -f deploy/compose.yaml down
```

构建镜像时运行 Maven 测试。Compose 启动本地 PostgreSQL 与 Redis；默认密码仅供本机开发，不能用于生产。迁移创建身份和账本表，内部结算模块有初步事务测试，但尚未接入比赛或对外 API。尚无房间、认证、WebSocket、额度扣减、Redis 事件链或可用的在线结算。不要将它暴露到公网。Java 和 JS 测试读取同一份经典移动样例；还需更全面的跨语言对照、随机模拟及规则状态校验。

`GET /api/leaderboards?type=points` 和 `type=games` 从 PostgreSQL 已提交统计读取各前十名，未接入前端。当前没有已完成的在线比赛，空榜是正常结果；Redis 榜单缓存和 outbox 消费仍未实现。

匿名身份基础接口为 `GET /api/csrf`、`POST /api/session/guest` 和 `GET /api/me`，会话存 Redis、身份存 PostgreSQL；写请求须提交 CSRF token。生产 HTTPS 环境必须设置 `FLIGHTPARTY_SECURE_COOKIE=true`。匿名身份未接入额度、房间、限流或前端，不能用于正式对局。可在本地执行 `node backend/scripts/test-guest-session.mjs --restart` 检查会话跨应用重启恢复。

`RoomRules` 是纯内存值转换规则，覆盖好友准备、固定匹配截止时间、满员、超时补位和空房关闭。它不存储房间、不检查身份或额度、不处理并发，也没有网络接口；不能作为可玩的房间服务。

`CommandCommitter` 和 Lua 脚本提供版本检查、回执、状态、Stream 与到期索引的单次原子写入基础。调用方必须先鉴权、校验规则并计算包含完整作用域的请求哈希。事件投影及单条消息处理器已建立，但尚无消费调度、pending 重领、故障恢复或实际比赛接入；不能当作完整 Streams 消费服务。可在 Compose 运行时从项目根目录执行 `node backend/scripts/test-redis-commit.mjs` 验证脚本，脚本使用独立随机键并在结束后清理。
