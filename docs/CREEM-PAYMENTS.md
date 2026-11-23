# Creem 支付配置与运维

更新：2026-11-23。本文是当前支付操作入口；历史测试记录见 [Creem 沙盒说明](CREEM-SANDBOX.md)，会员规则见 [会员契约](MEMBERSHIP-CONTRACT.md)。

## 当前部署状态

- 最近核验的运行模式为 `CREEM_LIVE=true`，即正式支付；配置应用提交 `49ad0a4`，后端镜像 `deploy-backend:creem-dual-49ad0a4`，数据库 V25。
- 正式、测试两套配置都已保存在服务器，切换不删除另一套。创建订单、回调验签、订阅权益处理、取消续订统一读取选中的配置。
- 月度 USD 9、年度 USD 59。所有游戏不限次数，所有合资格登录对局免费记录成绩；会员提供外观权益，不提供积分或胜率优势。
- 配置和运行状态以最后部署核验为准。本次文档整理没有切换模式、重启服务或提交付款。

## 配置项与保存位置

服务器主配置为 `/opt/joyflock/flight-party/deploy/.env`，权限 `0600`。它同时保存以下配置；本文只列名称，不保存真实值。

| 用途 | 正式支付 | 测试支付 |
| --- | --- | --- |
| API 密钥 | `CREEM_PROD_API_KEY` | `CREEM_TEST_API_KEY` |
| Webhook 签名密钥 | `CREEM_PROD_WEBHOOK_SECRET` | `CREEM_TEST_WEBHOOK_SECRET` |
| 月度产品 ID | `CREEM_PROD_MONTHLY_PRODUCT_ID` | `CREEM_TEST_MONTHLY_PRODUCT_ID` |
| 年度产品 ID | `CREEM_PROD_ANNUAL_PRODUCT_ID` | `CREEM_TEST_ANNUAL_PRODUCT_ID` |
| 选中开关 | `CREEM_LIVE=true` | `CREEM_LIVE=false` |
| Creem API | `https://api.creem.io/v1` | `https://test-api.creem.io/v1` |

共用配置：

| 配置项 | 含义 |
| --- | --- |
| `CREEM_CHECKOUT_ENABLED=true` | 开放结账；与环境选择是两个不同开关 |
| `CREEM_TEST_ACCOUNTS` | 测试购买名单；`*` 允许全部登录账号，逗号分隔 UUID 表示仅这些账号，空值禁止测试购买 |
| `CREEM_SUCCESS_URL` | 服务器创建 Checkout 时使用的 HTTPS 返回地址；回跳不授予权益 |

`deploy/.env.live`、`deploy/.env.test` 保留原两套凭据快照，但运行程序不会自动读取它们。当前运行配置来自主 `.env`，经 Compose 注入容器。旧共享名称 `CREEM_API_KEY`、`CREEM_WEBHOOK_SECRET`、`CREEM_MONTHLY_PRODUCT_ID`、`CREEM_ANNUAL_PRODUCT_ID` 只为未迁移的旧安装兼容；已有分组配置时不作为后备值。

选中配置缺项、月年产品相同或 API 密钥与模式不符时，后端拒绝启动，不混用另一套凭据。一个实例一次只使用当前环境的回调签名密钥；保留两套不表示同时处理两种环境的支付。

## 切换环境

以下命令在生产服务器执行。先只读校验目标环境：

```sh
# 检查正式配置，不改开关、不重建容器
sudo python3 /opt/joyflock/flight-party/deploy/set-creem-mode.py --live --dry-run

# 检查测试配置，不改开关、不重建容器
sudo python3 /opt/joyflock/flight-party/deploy/set-creem-mode.py --test --dry-run
```

实际切换只选择下面一条：

```sh
# 切到正式支付，会产生真实支付能力
sudo python3 /opt/joyflock/flight-party/deploy/set-creem-mode.py --live

# 切到测试支付，不产生真实扣费
sudo python3 /opt/joyflock/flight-party/deploy/set-creem-mode.py --test
```

脚本会校验目标 API 密钥和两个产品的模式、启用状态、USD 金额与订阅周期，备份环境和 PostgreSQL/Redis，修改主 `.env` 中的 `CREEM_LIVE`，仅重建 backend，并核验健康及实际容器环境。两套凭据、当前镜像及其他有效设置保留；正常切换不要传用于应用发布的 `--image` 参数。

测试模式切换作用于整个生产实例，不是仅对当前浏览器生效；正式支付回调在此期间无法按正式签名正常处理。完成测试应切回正式模式，并检查待处理订单与 Creem 的回调投递结果。

也可以直接修改主 `.env` 中的 `CREEM_LIVE`，但必须按当前容器标签保存的完整 Compose 文件集重建 backend，包含最后的私有覆盖文件。该文件使用 `${CREEM_LIVE:-false}` 从 `.env` 解析开关。**只保存文件或执行 `docker compose restart` 不会更新容器环境**。推荐使用上述脚本，避免旧发布覆盖文件冻结开关。

旧 `deploy/switch-to-live.sh` 是单套配置的历史迁移工具，双配置安装会拒绝运行；现在不要用它日常切换。修改凭据时也应通过当前脚本重新生成有效覆盖文件，不能假定编辑 `.env.live` 就会更新运行容器。

## 切换后的检查

1. 运行容器的 `CREEM_LIVE` 与预期一致，backend 健康、重启数稳定，HTTPS `/api/csrf` 可用。不要把完整 `docker inspect` 或 `.env` 输出到日志。
2. 已登录账号的 `/api/me` 中，`recording.testMode` 与开关相反，`recording.paymentConfigured` 表示该账号当前可使用结账；它不代表已经付款。
3. 账号面板在测试模式显示测试提示；正式模式显示正常开通入口。现有订阅应显示套餐、有效期和续订状态。
4. Creem 产品模式、USD 金额与周期正确。回调地址为 `https://flight.joyflock.com/api/billing/creem/webhook`，请求头为 `creem-signature`。
5. 连通性测试与真实到账分开验收。Provider 发出的示例 `checkout.completed` 返回 200 只证明签名和投递链路，不证明付款成功，也不应授予会员。

## 订单与会员处理

| 接口 | 用途 |
| --- | --- |
| `GET /api/csrf` | 获取当前会话 CSRF 信息 |
| `GET /api/me` | 查询账号、可购买状态、订阅套餐和有效期 |
| `POST /api/billing/checkout` | 用 `MONTHLY` 或 `ANNUAL` 创建当前模式的订单 |
| `POST /api/billing/creem/webhook` | 验签、事件去重和订阅状态同步 |
| `POST /api/billing/subscriptions/{id}/cancel` | 取消当前账号、当前模式订阅的自动续订 |

创建订单需要登录、有效 CSRF、UUID `requestId` 和服务端方案名。重试同一订单复用原 `requestId`。服务端会拒绝当前模式下仍有效的重复订阅；已取消自动续订但仍在有效期内，也不应重复开通。订单状态不确定时先对账，不反复创建新订单。切换环境不会把测试订阅变成正式订阅，赠送会员也不是付款证据。

只有可信 `subscription.paid` 通过模式、产品、金额、周期、交易状态与服务端账号归属校验后，才会生成正式 `ACTIVE` 或测试 `TEST_ACTIVE`。支付回跳、客户端参数、截图和 `checkout.completed` 不能替代此验证。取消自动续订通常保留已付周期；退款、争议、暂停或到期按服务端已验证事件处理。

## 失败与回滚

目标配置或产品校验失败时，脚本不会修改运行服务。实际切换期间失败时，脚本尝试恢复旧 `.env`，用保存的旧镜像及有效环境重建 backend；恢复后仍需检查健康和当前模式。若 Docker 或主机本身不可用，自动恢复也可能失败，需要按私有快照人工处理。

每次实际切换会输出一个新的私有目录 `/opt/joyflock/releases/creem-mode-<UTC时间戳>/`，其中包含 `env.before`、`backend-before.private.json`、`release.private.json`、`rollback.private.json`。PostgreSQL/Redis 备份位于 `/opt/joyflock/backups/`。以本次输出为准，不复用文档里的旧时间戳。

正常改回另一模式优先执行切换脚本。手工恢复软件/配置时，使用对应快照与完整 Compose 文件集，并在最后追加该快照的 `rollback.private.json`。仅恢复 `.env` 可能被字面量覆盖文件遮蔽；不要为支付模式切换恢复数据库或删除持久卷。应用回滚也不会自动撤销 Creem 后台密钥和 Webhook。

## 已有证据与验收边界

2026-11-23 已完成：正式和测试产品的只读 API 校验；两套配置保留与运行环境比对；正式模式部署；新正式签名 Webhook 的示例事件 HTTP 200；正式月付收银台创建，API 确认 `mode=prod`、`status=pending`。双模式选择与 Spring 组件读取由 5 项配置测试覆盖，后端构建 157 项零失败（21 项外部集成测试跳过），前端 1081/1081。

未以这些结果宣称完成首次正式扣款、正式付费会员到账、真实续订周期或正式取消扣费验收。本次双配置发布没有将生产实例临时切到测试模式。实际记录与截图见 [QA](QA.md) 和 [HANDOFF](HANDOFF.md) 的 2026-11-23 节。

## 相关源码

- [统一选择器](../backend/src/main/java/com/flightparty/billing/CreemConfiguration.java)
- [安全切换脚本](../deploy/set-creem-mode.py)
- [Compose 配置](../deploy/compose.yaml)
- [配置与组件测试](../backend/src/test/java/com/flightparty/billing/CreemConfigurationTest.java)
- [生产部署手册](PRODUCTION-DEPLOYMENT.md)
