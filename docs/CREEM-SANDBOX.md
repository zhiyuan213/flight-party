# Creem 沙盒测试说明

更新：2026-11-23。完整配置、切换与回滚以 [支付手册](CREEM-PAYMENTS.md) 为准。2026-11-01 的原始配置和测试记录已归档至 [历史沙盒记录](archive/CREEM-SANDBOX-20261101.md)。

## 当前配置

服务器同时保留正式和测试配置。测试使用 `CREEM_TEST_API_KEY`、`CREEM_TEST_WEBHOOK_SECRET`、`CREEM_TEST_MONTHLY_PRODUCT_ID`、`CREEM_TEST_ANNUAL_PRODUCT_ID`；选择开关是 `CREEM_LIVE=false`。主配置位于 `/opt/joyflock/flight-party/deploy/.env`（0600），不是直接读取 `.env.test`。

测试 API 为 `https://test-api.creem.io/v1`，月付 USD 9、年付 USD 59。测试产品 ID 从服务器对应配置读取；不要将它们复制到正式配置。`CREEM_TEST_ACCOUNTS=*` 允许全部登录账号体验，逗号分隔 UUID 只允许指定账号，空值禁止测试购买。`CREEM_CHECKOUT_ENABLED` 是另一个结账总开关。

## 验证与切换

以下命令在服务器执行：

```sh
# 只读校验测试产品和配置，不改变当前正式支付
sudo python3 /opt/joyflock/flight-party/deploy/set-creem-mode.py --test --dry-run

# 将整个实例切到测试模式，自动备份并重建 backend
sudo python3 /opt/joyflock/flight-party/deploy/set-creem-mode.py --test

# 恢复正式支付，测试配置仍保留
sudo python3 /opt/joyflock/flight-party/deploy/set-creem-mode.py --live
```

切换影响整个实例，不是仅当前测试账号。不要在正式收款期间为一次页面测试随意切换；应按实际维护安排操作。只改文件或 restart 容器不生效，需要重建。完整步骤、检查和回滚见支付手册。

## 沙盒验收

- 页面与 `/api/me.recording.testMode` 应表明测试模式；正式和测试密钥、产品、签名不能混用。
- 沙盒 `subscription.paid` 经校验后生成 `TEST_ACTIVE`，不是正式 `ACTIVE`，不授予正式付费权益。若账号有独立赠送会员，`member=true` 不能归因于测试付款。
- `checkout.completed` 或支付回跳不能授予会员。Provider 的示例事件 HTTP 200 只证明投递与验签链路，不证明支付成功。
- 验证购买、取消续订、退款时使用沙盒资料；只读 dry-run 不会创建订单、取消订阅或退款。
- 所有合资格登录对局仍免费记录；没有每日首局或会员无限记录差异。

历史记录中的测试卡、订单状态和账号权限只代表当时结果，不应直接套用到当前环境。重新测试以当前测试收银台提供的测试资料为准。

## 旧复测工具的适用范围

`backend/scripts/test-creem-replay.py` 仍读取旧共享 `CREEM_WEBHOOK_SECRET`，尚未适配双配置，不应直接用于当前安装。它还会重放事件，不是只读工具。不要为运行它把测试密钥写回旧共享配置。

`test-auth-http.mjs` 的购买禁用断言依赖账号权限设置；`test-billing-state.mjs` 会取消已有沙盒订阅续费，也不是只读检查。它们不能作为当前双配置切换命令。签名与订阅集成测试分别见后端 `CreemSignatureTest`、`CreemSubscriptionIntegrationTest`；后者需要专用测试数据库，未配置时跳过不代表通过。
