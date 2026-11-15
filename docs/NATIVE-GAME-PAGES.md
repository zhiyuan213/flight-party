# 同页游戏页面（已生产发布）

2026-11-15：正常游戏入口由跨域 iframe 改为同一个 HTML 内直接引用现有游戏脚本。用户已明确授权部署，本次结构改造及后续修正已随 42c9f5b 发布生产。

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

本轮经用户明确指示后已发布。回滚须恢复静态文件及 nginx 路由，随后 nginx -t/reload，不能只恢复其中一项。后端、数据库和计分协议无改动。

## 本地导航恢复与全局声音（后续修正）

首版组合页重新绘制了导航，用户指出样式和悬停反馈回退。现已复用原 `site-chrome.css`、`site-language.css`、`site-fullscreen.css` 与标准 brand/account/rail 类；恢复原 38px 导航、54px 图标和与原 portal 相同的 magnification 算法，接回 Logo 的 pointer-fx/meteor 动效。原账号头像与无系统箭头的语言菜单也恢复。游戏头部的通用 button 样式由限定于 native-topbar 的覆盖隔离，避免把导航按钮撑到 42px。

顶部新增共享静音开关（true/false），首页、商城、内容页及组合游戏页都加载 `site-audio.js/css`。详见 AUDIO-LEVEL-AUDIT.md 的后续调平记录。新实际 UI 截图为 [native-restored-mute-20261115.jpg](design/native-restored-mute-20261115.jpg)，替代首版截图作为当前本地验收参考。本轮改造已随 42c9f5b 发布。

发布记录与备份路径见 QA.md 和生产部署手册。线上实际截图：[native-production-42c9f5b.jpg](verification/native-production-42c9f5b.jpg)。Chrome 实测 iframe=0，页面 scroll/client/viewport 均为 2560×1271，静音按钮切换 true/false 后恢复原未静音状态；该生产会话为游客，登录后的布局宽度在本地真实登录会话验证。
