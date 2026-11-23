# 2026-11-23 本地视觉调整验收

状态：本地实现及验收完成，尚未部署，等待用户确认视觉效果（AGENTS.md 的 UI approval first）。

- 井字棋：替换首页、侧栏与对应详情封面，保留原 SVG。新文件：`dist/assets/covers/xo-3d-20261123.jpg`。由内置 imagegen 生成，原图 1254×1254，JPEG 质量 92。社交 OG 位图未重新生成。
- 欢乐纸牌：保留两人规则；对手牌背、自己扇形手牌、中央抽牌堆和弃牌堆、可出牌金色提示、键盘焦点和手机横向手牌滚动。弃牌底层取真实上一张弃牌。规则函数没有修改。
- 泡泡龙：深蓝紫背景、双场地边界、金色发射器底座、明亮文字和瞄准线；回合数移入比分条，避免覆盖首排泡泡。物理、网格、计分、瞄准距离及服务端规则不变。
- 桌游共享结算：玩家奖杯区上移到积分区之前；先积分及对应计数音效，再每日 Joy Coins，最后钱包余额。只改显示，不重复记账。飞行棋的独立结算页未修改。

## 实际验证

- `npm.cmd test`：1083 / 1083 通过。日志：`.workbuddy/tmp/visual-polish-final-20261123.log`。
- 修改的 JS 通过 `node --check`。
- Chrome 本地静态服务器 `127.0.0.1:8086`：纸牌真实出牌、电脑回合、390×844 手机布局；泡泡龙 Space 发射及回合切换。
- 结算使用独立本地 QA 页面加载实际 ticker：观察到积分从 20 到 40，随后每日金币从 100 到 200，钱包从 101660 到 101760。该页面不记账；临时页面已移出 dist。
- 自动测试覆盖积分先于金币、声音调用时序、减少动态效果模式、重开结算不重播。没有进行扬声器主观响度确认，也没有在生产联机环境复测。

## 视觉证据

- `verification/xo-cover-card-20261123.jpg`
- `verification/xo-cover-home-20261123.jpg`
- `verification/cards-table-20261123.jpg`
- `verification/cards-mobile-20261123.jpg`
- `verification/bubbles-midnight-20261123.jpg`
- `verification/settlement-sequence-20261123.jpg`（动画组件 QA 示例，不是线上账户结算截图）

## 井字棋图像生成提示词

Built-in imagegen tool. Final prompt:

Create a brand-new square 1024x1024 premium casual browser-game cover illustration for Tic-Tac-Toe (井字棋). This replaces a flat neon grid with polished dimensional game key art, matching a family of richly lit glossy 3D board-game cover paintings. Subject: one clearly readable THREE by THREE tic-tac-toe board with exactly 9 recessed square cells, viewed from a gentle elevated three-quarter angle, large and centered, filling about 85% of the image. Thick rounded cobalt/indigo lacquered board frame, refined violet translucent inset surface, thin luminous dividers; substantial glossy beveled cyan-blue X pieces and vivid coral-pink O rings sitting in separate cells, their thickness, reflections and soft contact shadows clearly visible. Use 3 X pieces and 3 O pieces, leave 3 cells empty so the grid is unmistakable. An appealing balanced composition that reads immediately at thumbnail size. Rich midnight purple-to-indigo studio background, tasteful blue and warm pink rim lighting, subtle reflective tabletop, a few restrained tiny sparkles for playful energy. High-end stylized 3D toy rendering, beautifully rounded edges, vibrant saturated colors, crisp material highlights, depth and warm friendly visual polish. Keep all important board edges and pieces inside a safe 6% margin so the same square can be used in small rounded sidebar icons. Art only, edge-to-edge full-bleed square; NO text, letters other than the X game pieces, numbers, title strip, logos, watermarks, UI, screenshot, people, hands, coins, extra boards, extra grid rows or columns. Do not recreate the supplied website screenshot; produce only the standalone replacement cover art.
