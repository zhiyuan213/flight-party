# JoyFlock — Creem 测试支付配置

更新时间：2026-11-01（Asia/Shanghai）。本文保存非敏感配置和已完成的测试记录，不包含 API 密钥、Webhook 签名密钥、密码、Cookie、会话令牌或完整支付事件。

## 环境与商品

| 项目 | 配置 |
| --- | --- |
| 商店 | JoyFlock（独立于 MeterTrail） |
| 模式 | Sandbox / Test，非正式收款 |
| Creem API | `https://test-api.creem.io/v1` |
| 游戏网站 | `https://flight.joyflock.com/` |
| 月会员测试商品 | `prod_ZgfEOcdgBNLlwqwQ6Eqnu` |
| 月会员价格与周期 | USD 9 / 月；API 金额 900 美分 |
| 年会员测试商品 | `prod_vdNtdXtPqNh4taogUbWE7` |
| 年会员价格与周期 | USD 59 / 年；API 金额 5900 美分 |
| 支付返回地址 | `https://flight.joyflock.com/?billing=return` |
| Webhook 地址 | `https://flight.joyflock.com/api/billing/creem/webhook` |
| 签名请求头 | `creem-signature` |

以上商品 ID 已与当前服务器环境文件的非敏感字段核对。不要将测试商品 ID 当作正式商品 ID。

## 服务端环境变量

```dotenv
CREEM_LIVE=false
CREEM_CHECKOUT_ENABLED=true
CREEM_MONTHLY_PRODUCT_ID=prod_ZgfEOcdgBNLlwqwQ6Eqnu
CREEM_ANNUAL_PRODUCT_ID=prod_vdNtdXtPqNh4taogUbWE7
CREEM_SUCCESS_URL=https://flight.joyflock.com/?billing=return
```

另需通过服务器秘密配置提供 `CREEM_API_KEY`、`CREEM_WEBHOOK_SECRET`。本文不保存其值，也不能直接复制本文作为完整 `.env`。

`CREEM_TEST_ACCOUNTS` 是允许购买的合成测试账号 UUID 列表，以英文逗号分隔；实际账号名单不写入本文。测试模式下仅允许名单内账号购买，其他账号的购买按钮保持禁用。`CREEM_CHECKOUT_ENABLED=true` 不代表向所有用户开放收款。

生产服务器配置位置：`/opt/joyflock/flight-party/deploy/.env`（不提交 Git）。运行目录：`/opt/joyflock/flight-party`。服务通过 `deploy/compose.yaml` 和 `deploy/compose.production.yaml` 读取配置；只修改文件不会自动更新现有容器环境。

## 接口与权益规则

| 接口 | 用途 |
| --- | --- |
| `GET /api/csrf` | 获取当前会话 CSRF 信息 |
| `GET /api/me` | 查看账号、购买可用状态及订阅状态 |
| `POST /api/billing/checkout` | 登录账号创建测试 Checkout |
| `POST /api/billing/creem/webhook` | 接收并验证 Creem 回调 |
| `POST /api/billing/subscriptions/{subscriptionId}/cancel` | 取消当前账号订阅的自动续费 |

创建订单请求示例（需已认证会话和有效 CSRF；不要把真实会话写进文档）：

```json
{"requestId":"<新的 UUID>","plan":"MONTHLY"}
```

年付使用 `ANNUAL`。`requestId` 为订单幂等键；重试同一订单使用原 UUID，不应每次重试都新建订单。

- 返回支付网站不代表付款成功；服务端通过验证签名的事件确认订阅。
- `subscription.paid` 校验商品、USD 金额、周期和服务端订单归属后生成 `TEST_ACTIVE`。
- 测试账号 `/api/me` 可显示 `testMembership=true`，但 `member=false`。沙箱付款不授予正式会员，也不突破真实成绩记录限制。
- `checkout.completed` 本身不授予会员；不要根据客户端参数或截图开通权益。
- 取消续费保留当前已付周期；退款/争议按匹配的交易处理撤销。重复事件及重复取消不重复授予或扣除权益。
- 真实游戏始终不限次数；非会员每天首个符合条件的完成局免费记录，含负分，正式会员不限记录次数。中途登录可绑定尚未结束的游客席位；已结束游客局不补领。

## 已验证的沙箱测试

2026-10-31 至 2026-11-01 实际验证记录，详细过程见 `docs/QA.md`：

| 场景 | 结果 |
| --- | --- |
| 月付 USD 9、年付 USD 59 | 测试 Checkout 付款成功，收到真实沙箱回调 |
| 年付拒付后重试 | 拒付时未增加测试权益；成功卡重试后生成测试权益 |
| 沙箱与正式权益隔离 | `TEST_ACTIVE`、`testMembership=true`、`member=false` |
| 月付/年付取消续费 | 均已取消续费；重复取消成功，不延长有效期 |
| 月付退款 | 起初 pending，后收到 `refund.created`，对应测试权益变为 `REVOKED` |
| 非本人取消 | 另一账号返回 404；匿名请求被拒绝 |
| 真实事件重复重放 | 两次均 200，不重复开通 |
| 错误签名 | 401 |
| 相同事件 ID、不同内容且重新签名 | 409 |

历史测试卡：成功卡 `4111111111111111`；拒付卡 `4507990000000028`；测试有效期曾使用 `12/30`、安全码 `123`。这些是测试卡数据，禁止用于正式模式；重新测试时以 Creem 测试结账页当前公布的数据为准，姓名/地址使用合成资料，不输入真实银行卡。

上述订阅状态是历史验证结果，不代表任意时刻仍存在可续费的测试订阅。原有两笔订阅均已取消续费，月付已退款；再次验证首次购买/取消可能需要创建新沙箱订单。

## 复测工具

- `backend/scripts/test-auth-http.mjs`：普通账号购买被禁用、匿名购买被拒绝等认证检查，同时会验证30天登录 Cookie。会创建合成测试账号。
- `backend/scripts/test-billing-state.mjs`：读取 `FLIGHTPARTY_TEST_SESSION_FILE` 指向的本地秘密会话文件；需要已有未取消续费的 `TEST_ACTIVE` 订阅。执行会真实取消该沙箱订阅续费，不是只读检查。不要提交会话文件。
- `backend/scripts/test-creem-replay.py`：在服务器运行，内部读取已有测试事件及秘密配置；只输出测试结论，不打印事件内容或密钥。仅允许 `CREEM_LIVE=false`，会重放已有沙箱事件。
- `backend/src/test/java/com/flightparty/billing/CreemSignatureTest.java`：签名测试。
- `backend/src/test/java/com/flightparty/billing/CreemSubscriptionIntegrationTest.java`：需专用数据库配置，使用隔离 schema 验证订阅处理；普通构建未配置环境时会跳过，不能当作已运行。

不保存完整 Webhook 请求正文、签名、Checkout URL 或测试账号凭据；它们可能包含个人信息或可继续操作的链接。

## 正式支付边界

截至用户 2026-11-01 提供的截图，JoyFlock 已提交 Creem 商店审核，页面显示审核中。正式支付尚未启用；域名客服邮箱配置仍待完成。

商店审核通过不等于程序已切换正式模式。正式启用前需核对正式 API/签名密钥、正式商品、正式 Webhook、价格/周期、真实取消路径及事件验证。不要直接把本文件的 `CREEM_LIVE` 改为 true 后沿用测试商品和密钥。

参考：

- [Creem 审核清单](https://docs.creem.io/merchant-of-record/account-reviews/account-reviews#approval-checklist)
