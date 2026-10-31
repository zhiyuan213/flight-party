# 开发基线（M0，进行中）

本记录对应 `FlightParty-Development-Plan.md` 1.1 和原型 0.7.2。原型仍是本地游戏及在线功能界面预览；没有实现真实多人服务、认证、统计或结算。

## 已核对的基线

- 原始 `dist/engine.js` SHA-256：`0a3735f3fce664014fc785e5599dc130bccbbe7be03f314cfc0bcd5a4792d2c6`。本地结束与排名规则按开发计划更新后为 `81a6090ff4697e74186584f50809fb65ad674838dbcc4de00235ff80f950d91b`；旧哈希作为历史基线保留。
- 固定规则样例保存在 `tests/engine.test.mjs`，涵盖两人轮转、阶段保护、叠机碰撞、安全格、终点和派对事件；这些样例及 100 场模拟不能代替 Java 对照测试。
- 视觉设计参考见 [原始对局图](design/gameplay-reference.png)、[v0.5 构图反馈](design/v05-composition-feedback.png)、[v0.5 侧栏反馈](design/v05-sidebar-feedback.png)和 [v0.6.2 道路对齐反馈](design/v062-road-alignment-feedback.png)。参考图不是当前运行画面或最终视觉批准。
- 最初检查时目录没有 `backend/`，本机命令行未找到 Java 或 Maven。现已新增 Docker 构建的 Java 规则模块；尚无数据库迁移或在线服务实现。

## 2026-10-31 实测

在原型目录运行 `npm test`，26 项通过，0 项失败。未修改应用代码。本次没有采集当前运行画面的浏览器截图，也没有进行双客户端、后端或生产环境验证。

## 未完成

用户确认界面现成，无需改版；当前运行画面尚未另行截图，视觉验收状态沿用既有记录。M1 的本地结束和排名规则及 Java 初始规则模块已实现；仍需完成自动跨语言对照与更全面验证。M2–M5 尚未开始；不得将本记录或现有预览视为真实在线功能已完成。
