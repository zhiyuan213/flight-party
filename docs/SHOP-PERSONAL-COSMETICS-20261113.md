# 个人装扮、分级光标与同脸型头像 · 2026-11-13

本轮按用户最新反馈调整商城，保留 buildless 启动、现有游戏规则和已购买商品记录。当前实现和截图供用户试用，不代表最终视觉批准。

同日后续（cursor2 / pointer2）：用户再要求商城增加 5 款光标。新增稀有气泡 / 贝壳、史诗心动 / 蝶舞、传说星爆，光标增至 12 款（默认 1 + 稀有 4 + 史诗 4 + 传说 3），目录 / 稀有度 / 动画层 / 验收预览页已同步；四子连珠 / 五子棋 / 井字棋的 coral / pearl 目录项也按稀有度归位（渲染顺序不变）。构建与 PNG 渲染脚本已扩展，详见 `docs/VISUAL_ACCEPTANCE.md` 同日新增段落。

## 商品与外观

- 光标保留免费默认款，付费款分级动画：稀有（焰火 / 叶影 / 气泡 / 贝壳）指针与右下标志静态；史诗（彩虹 / 冰晶 / 心动 / 蝶舞）静态指针加动态标志；传说（紫晶 / 彗星 / 星爆）指针内部光色与标志同时动态。原生 PNG 光标一直可用，文本输入、触屏、减少动态与瞄准十字恢复适合的静态状态。独立版本 `20261113-pointer1`。
- 头像改为十款同一暖桃色圆角方脸，只变眉眼、嘴型、小配饰，不以肤色或族群分配稀有度。同日后续用户指定开心笑脸为免费默认头像：首次拥有并装配，空白/无效旧值回到该头像，已有有效头像选择保持；其余价格、旧商品 ID 和已拥有记录保留。资源位于 `dist/assets/shop/avatars-v4/`；来源与映射见 [头像素材记录](AVATAR-EXPRESSION-ASSETS-20261113.md)，版本 `20261113-avatar4`。旧人脸插画保留为历史资源。
- Four 只展示个人圆片；默认原款为纯色圆片，付费款加轨道/翠叶/星芒中心徽章，实际黄粉队伍底色保留。Gomoku 只展示一颗个人棋子，实际黑白本体保留，增加细圈和小徽章。XO 只展示个人标志，实际 X/O 及蓝粉区分保留，加主题细边。三个游戏的棋盘商品下架。
- Chess 只保留四款棋盘，棋子商品下架，原始棋子不变；主题不会覆盖选中、将军、上一着或合法落点提示。共享棋盘继续按会员等级、服务端累计分、同房间确定性平局选择处理。
- 当前可售目录为 78 项：6 飞机、4 尾迹、12 光标、16 头像、四个棋类共 28 项（四子连珠 12、五子棋 6、国际象棋 4、井字棋 6）、台球三个分区各 4 项。旧 candy/volt/blade 光标不再上架，已拥有者仍可换回；下架棋类槽回到默认，旧 ownership 收据保留，不扣减旧余额。
- 商城与局内徽章/标志共用 `personal-piece-art.js` 图形；商城图可通过 `node scripts/build-personal-shop-art.mjs` 重建。光标通过 `node scripts/build-shop-cursors.mjs` 和 `powershell -NoProfile -File scripts/render-shop-cursors.ps1` 重建。

## 房间外观同步与限制

`game-cosmetics.js` 按棋子所属席位读取 `pieceThemes`，不会把本机款式套给对方。`room-cosmetics.js` 使用已认证席位的 `/api/table/rooms/{id}/cosmetics` 更新，服务端只接受该游戏白名单商品 ID；不接收客户分数，也不允许指定别人的席位。更新保留棋局、版本、倒计时和结算字段；恢复、托管、好友续局保留公开外观。

同步为非阻塞；只取回复中的本人公开资料，不把可能过期的棋局回包应用到游戏。旧请求被丢弃，临时错误最多三次；404 仅终止当前房间选择，405/501 才停用本次页面的接口。没有本地明确装备记录时采用恢复房间的款式，显式装备默认款仍可恢复默认。

这是外观选择传递，**不等于服务端已验证购买资格**。现有钱包和商城拥有状态仍是本浏览器数据。本次没有真实支付、所有权校验服务、部署或跨设备运行验证；本地 8080 为静态预览服务。正式联机售卖前仍需接入服务端拥有记录并验证选择资格。

## 参考与验收

用户参考图已归档：`design/shop-expression-face-reference-20261113.png`、`design/shop-cursor-grades-reference-20261113.png`、`design/shop-personal-counter-reference-20261113.png`。

- `npm test`：**600/600 通过**，见 [完整日志](verification/shop-personal-20261113-tests.log)。覆盖各席位独立外观、网络恢复/重试、原款、旧拥有记录、目录分级与光标降级。
- 11 份修改 JS/生成脚本 `node --check` 通过，见 [语法日志](verification/shop-personal-20261113-syntax.log)。两个预览页内联脚本另经语法检查。
- Maven 全测：111 项，90 通过，21 项因未配置数据库/Redis 集成环境跳过，0 失败；其中 10 项外观定向检查全部通过。使用既有 JDK21、`D:/maven/bin/mvn.cmd` 离线运行，命令和结果见 [后端日志](verification/backend-personal-cosmetics-20261113.log)。服务测试使用 JDBC stub，未验证真实数据库并发。
- 浏览器检查了实际商城的十张头像、55 项目录、单件棋子/标志预览、象棋棋盘预览和商品详情取消；没有购买或修改用户装备。图片无加载失败，商城、光标预览与棋类预览未捕获 error。
- 原始渲染器在独立只读页面验证 Four/Gomoku/XO 一方装扮另一方默认；Chess 检查棋盘颜色及将军/末步/落点。预览不写钱包、不连接房间服务。光标预览验证稀有静态、史诗/传说动画层与文本输入静态回退。未验证实体手机或远程多人对局。

预览入口：`/cursor-motion-preview.html`、`/table/personal-cosmetics-preview.html?game=gomoku&theme=jade&other=default`（支持 four/gomoku/xo/chess）。

![同脸型表情头像的实际商城效果](verification/shop-expressions-personal-20261113.png)

![个人五子棋装扮，对方保持原款](verification/shop-personal-gomoku-live-20261113.png)

![国际象棋主题保留原棋子和状态提示](verification/shop-chess-board-live-20261113.png)
