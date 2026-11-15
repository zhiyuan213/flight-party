# 同页游戏页面（本地验收版）

2026-11-15：正常游戏入口由跨域 iframe 改为同一个 HTML 内直接引用现有游戏脚本。生产仍为 e2a1086；本次页面结构改造尚未发布。

`/?game=pool` 等八款桌游使用 `dist/portal/native-table.html`，`/?game=flight` 使用 `native-flight.html`。`/portal/index.html?game=...` 同样路由。没有 game 的根路径仍为九宫格首页。旧飞行棋 embed/room 和明确的独立页面保留；带 game=pool 的 room 链接仍进入桌游，不能误判为飞行棋。

两个 HTML 由 `node scripts/build-native-games.mjs` 从原游戏文档组合生成：保留游戏 DOM、游戏脚本和样式；将相对静态资源地址改为明确的根相对地址；加入公共导航和侧边栏。游戏源文档变更后须重新生成。已提交生成物供零安装启动，不在浏览器下载、解析或执行远程 HTML。普通页面导航会释放上一文档；本轮不实现长驻多游戏 SPA 或改变游戏规则。

公共界面入口是 `dist/portal/native-game.js`，样式是 `native-game.css`。账号按钮调用现有游戏账号按钮；钱包继续使用 site-points.js；语言使用文档内事件，游戏回调沿用现有本地翻译与重绘。全屏使用同一文档的舞台元素，聊天区发送文档内事件，浏览器拒绝原生全屏时使用占满视口的舞台。旧跨域桥只用于兼容 iframe 入口。

同页后，登录 cookie、localStorage、音频激活均属于地址栏中的当前域名，不再同时读取 joyflock.com 与 flight.joyflock.com 两个域名各自的设置。本轮不迁移两个域名的历史本地钱包或设置，不把客户端记录变成服务端成绩；API 与服务端身份校验保持原样。

## 实际验收

- Node 测试 973/973；修改的 7 个 JS/MJS 文件语法检查通过；本地 nginx 检查及重载成功。HTTP 测试覆盖九款游戏的根入口与旧 portal 入口、桌游房间和旧飞行棋邀请入口。Python fallback 已更新，当前 Windows 的 python 命令不可用，未运行。
- 用户 Chrome 本地实际打开九款游戏，均为零 iframe；桌面入口无横向溢出。台球验证中英文切换、现有账号弹窗、单机开局、占满视口和退出；飞行棋验证中文切换、电脑练习及退出。未完成九款游戏的整局、跨设备联机、支付或手机视觉验收。未进行物理扬声器采音。
- 本地 UI 截图：[native-pool-local-20261115.jpg](design/native-pool-local-20261115.jpg)。这是实际截图，不代表用户已批准。

## 发布与回滚注意事项

发布须同时包含两个生成页面、公共 CSS/JS、原游戏改动及 nginx 的根与 `/portal/index.html` 精确路由；只上传页面不会切换生产入口。主域名 Caddy 会先把根路径改写至 portal，因此两条路由均必需。保留生产已有的 assets/table 正则、API 和 WSS location；Caddy无需因这项改动调整。沿用生产部署手册的备份、精确提交制品和文件就地复制流程。

本轮待本地 UI 确认后再发布。回滚须恢复静态文件及 nginx 路由，随后 nginx -t/reload，不能只恢复其中一项。后端、数据库和计分协议无改动。
