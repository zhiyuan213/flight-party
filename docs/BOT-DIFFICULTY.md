# 全游戏机器人难度（2026-11-10）

> 需求：「所有游戏，增加机器人难度，选择机器人的时候选择，默认简单，一般，专业，地狱 4 个模式」。
> 本文是**唯一汇总入口**；逐轮诊断见 `docs/QA.md`（十六）（二十一）。所有数值以当前工作区代码为准。
> **2026-11-10 追加**：四档选择器已从「详情页常驻内联方块」改为**一个触发按钮 + 原生弹窗**，见 §7；本文 §1 表格与 §5 验证数字已按弹窗版更新。

**当前状态**：本地 8081 四容器 Up；改动全部在工作区，**未提交、未部署**。全项目 **188 处 `.js?v=` 与 4 处 `bot-difficulty.css?v=` 统一 `20261110-botmodal2`**，浏览器需 **Ctrl+F5**。工作区另有一路并行的「泡泡射击精修」改动（`bubbles-fine.css` 等），它曾使用独立缓存标记；本轮收尾时核实没有「同一模块被两个标记引用」的分裂，并把两套 JS 标记合并，合并后重新做了实机 UI 复验。

---

## 1. 范围

| 入口 | 游戏 | 难度选择位置（当前：触发按钮 → 弹窗） |
|---|---|---|
| `dist/table/index.html` | 欢乐台球、四子连珠、五子棋、国际象棋、井字棋、欢乐纸牌、斯诺克、泡泡射击、趣味拼图、你画我猜 | 详情页 `.launch-actions` 内，「单机 · 电脑对战」下方一行「机器人难度 · 当前档 ›」触发按钮 |
| `dist/table/arcade.html` | 泡泡射击 / 斯诺克独立街机页 | `#intro` 的「电脑对战」按钮下方同一触发按钮 |
| `dist/index.html` | 飞行棋 | 本地练习座位区 `#seat-grid` 下方同一触发按钮；每个「电脑玩家」席位卡显示当前难度 |
| `dist/bot-difficulty-preview.html` | 验收页 | 参数表 + 四档决策输出 + 真实规则对局模拟；**仍用内联四档**便于逐档对比参数 |

门户 `dist/portal/portal.js` 的 9 款游戏全部覆盖（pool / flight / four / gomoku / chess / xo / cards / snooker / bubbles）。

**默认「简单」**，选择写入 `localStorage['joyflock.bot.level']`，**跨所有游戏共享**（同一台设备一次选择处处生效）；非法值回退简单。桌面的英文版由 `table-locale.js` 的 `data-system-english` 自动翻译，街机页 / 飞行页由各自的语言函数切换，四种语言状态都验证过。

---

## 2. 四档参数（`dist/bot-difficulty.js` → `botTuning`）

| 档位 | 随机失误 | 瞄准误差 | 前瞻 | 扫描步长 | 骰运权重 | 定位 |
|---|---|---|---|---|---|---|
| **简单 Easy** | 58% | ±9° / 力度 ±18 | 0 | 15 | −1（偏小点） | 默认，会漏掉一步胜、不挡、常摸牌 / 乱瞄 |
| **一般 Normal** | 0 | 0 | 0 | 6 | 0（公平） | **与改造前的原版电脑逐字节一致** |
| **专业 Pro** | 0 | 0 | 2 层 | 4 | +0.5 | alpha-beta / 候选裁剪前瞻，评估所有目标球与袋口 |
| **地狱 Hell** | 0 | 0 | 3 层 | 2 | +1（偏大点） | 更深搜索、最细角度扫描、无抖动 |

`botTuning(undefined) === null` 是**旧代码路径**：不传难度时各 bot 输出与改造前完全相同，因此 JS/Java golden fixtures 与 168/168 parity 基线不受影响。「一般」复用同一条路径，方便和原版对比。

---

## 3. 各游戏的真实强弱差异

| 游戏 | 简单 | 一般 | 专业 / 地狱 |
|---|---|---|---|
| 四子棋 / 五子棋 / 井字棋 | 58% 随机合法落点；不找一步胜、不挡；启发式加噪 | 原版：找一步胜 → 挡对手一步胜 → 启发式排序 | 邻域候选裁剪 + alpha-beta（2/3 层），评估函数含双方最佳应手；五子棋只评估已有棋子 ±2 邻域，保证不卡顿 |
| 国际象棋 | 完全随机合法走法 | 原版：吃子 / 升变 / 将死 / 对手最佳吃子回击 + 中心分 | 材料 + 中心化评估 + minimax；**根候选强制纳入一步将杀**（否则安静的 Qh4# 会被裁剪掉） |
| 欢乐台球 | 58% 完全乱瞄；否则沿用原瞄准并加 ±9° / ±18 力度 | 原版：最近目标球 → 该球最近袋口 | 遍历「每个合法目标球 × 每个袋口」，按白球→虚拟球→袋口全路径代价取最优，力度按距离精算 |
| 斯诺克 | 随机目标 + 大角度抖动 | 原版：最近目标球 | 按「距离 − 彩球分值×9」选目标，无抖动 |
| 泡泡射击 | 粗扫（步长 15）+ 评估噪声 + 58% 随机角度 | 原版步长 6 | 步长 4 / 2，评估无噪声 |
| 欢乐纸牌 | 50% 直接摸牌、其余随机出牌 | 原版：第一张可出的牌 | 选「出完后剩余手牌能接上新桌面牌最多」的一张，减少卡手 |
| 飞行棋 | 随机选飞机、骰子偏低点 | 原版选子 + 公平骰 | 撞机加分更高、额外计算「落在对手下回合可撞到的格子」的风险扣分；地狱无评估噪声、骰子略偏大点 |
| 趣味拼图 / 你画我猜 | — | — | **合作模式，电脑不参与对抗，难度不改变其行为**（UI 上有明确提示） |

> 飞行棋的骰运权重只作用于 `game.current.type==='bot'` 且自动掷骰的分支（`roll(auto)`）；真人玩家与真人超时托管仍用公平的 `secureDie()`。这是「难度」的一部分，不是对玩家掷骰的干预。

---

## 4. 兼容性与不变量

- **未改动**：`dist/table/pool.js` 的物理常量与 `poolMove`、`backend/.../PoolRules.java` 等全部 Java 规则、shot 整数指令协议、53 格状态、回放帧、golden fixtures。
- `bot(s)` 的第二参数可选；所有旧调用点（`tests/table-grid.test.mjs` 等）仍拿到原来的结果。
- 三个调用点接入难度：`table.js` 的 `commitMove`、`arcade.js` 的 `commit`、飞行棋 `bestMove` / `roll`。在线房间走的是服务器权威状态，**前端难度不会也不能篡改服务端结果**。
- CSS `dist/bot-difficulty.css` 用 `currentColor` + `color-mix`，同时适配桌面浅/深皮肤、街机玻璃皮肤与飞行棋浅色皮肤；桌面 intro 的高特异性按钮样式有专门覆盖。弹窗外壳与弹窗内按钮对背景 / 边框 / 阴影用 `!important`，因为详情页 `.table-home-theme:not([data-screen="play"]) button`（含 `:hover`）与飞行棋 `body:has(#lobby) dialog` 的特异性更高，否则三个宿主的弹窗会长得不一样。

**已知边界**：快速匹配 30 秒后由服务器补位的电脑、以及玩家掉线后的服务器托管，走 Java `GridRules.bot(s)`，**仍保持原强度**（等价于「一般」）。玩家没有主动「选择机器人」的那一刻，且改它要动房间状态与 Java parity 基线；如需覆盖，需另开一轮把难度存进房间并镜像到 Java bot。

---

## 5. 验证

- `npm test` **294/294**：难度轮 285 项 + BGM / 手套轮 3 项 + 本轮新增 `tests/bot-difficulty-dialog.test.mjs` **6 项**（弹窗标记双语、挂载位置、开合与遮罩、点选写入并关闭、语言/跨标签同步/API、Node 无 DOM 降级）。`tests/bot-difficulty.test.mjs` 11 项、`tests/bot-difficulty-flight.test.mjs` 2 项仍全绿；`tests/sole-plane.test.mjs` / `startup-translation.test.mjs` 的 vm 夹具保持兼容。
- 对局模拟（真实 `move()` 规则）：四子棋 / 五子棋 **地狱 vs 简单 12:0、地狱 vs 一般 12:0**；井字棋两个完美档位 **12 局全平**（该游戏理论必和）。
- 象棋：地狱与一般都能找到 `f2f3 e7e5 g2g4` 后的一步杀 `d8h4#`，简单只保证合法。
- 台球：简单在不同随机源下角度明显漂移，地狱完全确定；斯诺克 / 泡泡同理。
- Docker `mvn -o test` **101 通过 / 21 跳过**（本轮未改 Java，仅回归）。
- CDP 无头 Chrome 实机（弹窗版）：详情页默认档 `easy`、页面内联四档 **0 个**、`dialog.bot-difficulty-dialog` 挂在 `<body>`；真实鼠标点触发按钮 → `open=true / aria-expanded=true / 4 个选项` → 点「地狱」写入 `localStorage=hell`、触发按钮变「机器人难度 地狱›」、弹窗自动关闭 →「完成」按钮 / 遮罩 / Esc 关闭 → 点「单机 · 电脑对战」进 `screen=play`。街机页、飞行棋页读到同一份选择并各自改档；`locale=en` 显示 Computer difficulty / Easy…Hell / Done；**大厅 iframe 内**（`portal/index.html?game=bubbles`，即用户截图场景）弹窗完整居中、遮罩覆盖游戏区、选中态 Pro 正确；预览页仍保留内联四档；**全部页面 0 运行时异常**。实机截图 `docs/verification/bot-difficulty-dialog-table.png`（直接打开详情页）与 `bot-difficulty-dialog-portal.png`（大厅 iframe 英文版）确认排版无遮挡、无溢出。
- 8081 页面 / 模块 / CSS / API 均 200；dist 是 bind mount，**本轮无需 rebuild**（与改 Java 常量的轮次不同）。

---

## 6. 调参入口

| 想调什么 | 改哪里 |
|---|---|
| 四档强弱 / 默认档 | `dist/bot-difficulty.js` 的 `botTuning()`、`DEFAULT_BOT_LEVEL`、`BOT_LEVELS` |
| 中文 / 英文标签与提示 | 同文件 `BOT_LABELS` / `BOT_HINTS` / `BOT_NOTE` |
| 棋类搜索深度与宽度 | `botTuning().depth` / `searchWidth`；`grid-rules.js` 的 `candidates()` / `search()` |
| 象棋评估与裁剪 | `chess-rules.js` 的 `PIECE` / `boardScore()` / `rootMoves()` |
| 台球 / 斯诺克瞄准 | `pool.js` 的 `poolShots()`、`snooker-duel.js` 的 `snookerBot()` |
| 泡泡 / 纸牌 | `bubbles-duel.js` 的 `bubblesBot()`、`cards.js` 的 `cardsBot()` |
| 飞行棋选子与骰运 | `app.js` 的 `advancedBestMove()`、`bot-difficulty.js` 的 `botDie()` |
| 选择器的外观 | `dist/bot-difficulty.css`（`.bot-difficulty-trigger` 触发按钮 / `dialog.bot-difficulty-dialog` 弹窗 / `.bd-option` 四档卡片） |
| 弹窗文案与交互 | `dist/bot-difficulty.js` 的 `BOT_DIALOG_*`、`botDifficultyTriggerMarkup()`、`botDifficultyDialogMarkup()`、`bindBotDifficultyDialog()` |
| 是否回到内联四档 | 三处入口把 `bindBotDifficultyDialog` 换回 `bindBotDifficulty`（该函数保留未删），容器 class 去掉 `bot-difficulty-slot` |

---

## 7. 难度选择弹窗（2026-11-10，二十一）

**需求**：截图红框指出详情页里常驻的四档方块太占版面，「这个改成弹窗吧」。

**实现**（只动表现层，四档强弱 / 参数 / 存储 / 物理 / Java / parity 全未改）：
- `dist/bot-difficulty.js` 新增 `botDifficultyTriggerMarkup()`（一行「机器人难度 · 当前档 ›」）、`botDifficultyDialogMarkup()`（标题 + 说明 + 四张带短说明的档位卡 + 底部备注 + 「完成」）、`bindBotDifficultyDialog()`。返回值与旧控件同 API（`get / set / refresh / language`），另加 `open / close / isOpen / dialog` 便于自动化；旧 `bindBotDifficulty()` **保留**，供验收预览页与第三方嵌入继续用内联四档。
- 原生 `<dialog class="bot-difficulty-dialog">` 由 JS 创建并挂到 `<body>`（不在 `hidden` 的 intro 里），用 `showModal()`；**点档位即保存、刷新触发按钮、关闭弹窗并触发 `onChange`**，也可用「完成」、右上 ×、点遮罩或 Esc 只关闭不改档。`aria-haspopup / aria-expanded / aria-pressed / aria-label` 同步。
- 监听 `storage` 事件，另一标签页改档后本页触发按钮即时刷新（旧内联版没有这项）。
- 三处入口统一接入：`dist/table/table.js`、`dist/table/arcade.js`、`dist/app.js` 改 import / 调用，HTML 容器加 `bot-difficulty-slot` 去掉内边距；合作模式（拼图 / 你画我猜）的自定义说明仍在弹窗底部。
- `dist/bot-difficulty.css` 新增触发按钮与弹窗样式；`!important` 仅用于抵御三个宿主各自的全局 `dialog` / `button` / `:hover` 主题规则（实机截图发现详情页主题给所有按钮加了 `box-shadow:0 3px 0 #060a15` 和不同边框，未选中卡片被覆盖，已修）。

**验证**：`npm test` **294/294**、Docker Java **101 通过 / 21 跳过**（仅回归）；CDP 真实鼠标走通详情页 / 街机页 / 飞行棋页 / 英文 / 大厅 iframe，含截图目视确认，0 运行时异常；8081 四容器 Up，页面 / JS / CSS / API 200。全项目 188 处 `.js?v=` 与 4 处 CSS 标记统一 **`20261110-botmodal2`**，需 **Ctrl+F5**；纯前端，dist 为 bind mount，**无需 rebuild**。**未提交、未部署**。

**边界**：弹窗的遮罩只覆盖其所在文档（大厅 iframe 场景不遮住门户侧栏与顶部导航），这是原生 dialog 的正常行为；验收预览页 `bot-difficulty-preview.html` 故意保留内联四档，方便逐档看参数与对局模拟。

---

## 8. 强度复核：四档是否真的越来越难（2026-11-12）

用户反馈「选地狱也不难，随随便便都能赢」，要求每个游戏逐一确认。先核对链路：弹窗 → `localStorage['joyflock.bot.level']` → `getBotLevel()` → `app.js` 的 `botDie()/bestMove()` 与 `table.js`/`arcade.js` 的 `bot(board,getBotLevel())` → `grid-rules.js` 分发，**链路完整，同源 iframe 共享设置，首帧即存在触发按钮**。因此问题在引擎强度，不在 UI。

### 8.1 测量口径

- `.workbuddy/tmp/bot-strength-probe.mjs`：固定 LCG 的「参考玩家」（会立即取胜 / 立即封堵 + 简单棋型启发；连续型游戏用 `normal` bot）对四档各打 8–16 局，数字为**参考玩家胜率**（越低说明机器人越强）。
- 斯诺克用 `.workbuddy/tmp/snooker-strength-probe.mjs`：同一开局交替 10 杆，P1 用待测档、P2 固定 `normal`，统计净胜分（完整对局在纯 Node 下过慢）。
- 诊断脚本：`bubbles-h2h.mjs` / `bubbles-lookahead-h2h.mjs`（策略直接对抗）、`snooker-variants.mjs`（红球阶段候选）、`snooker-shot-trace.mjs`（逐杆追踪）、`cards-strategy-lab.mjs`（固定牌堆 60 局）、`pool-easy-h2h.mjs`（直接对抗排镜像偏差）。全部通过真实的 `start()/move()/bot()` 推进，不改规则。

### 8.2 最终数据

| 游戏 | 简单 | 一般 | 专业 | 地狱 |
|---|---|---|---|---|
| 四子棋 | 12/12 | 8/12 | 5/12 | 1/12 |
| 井字棋 | 10/12 | 2/12 | 0/12 | 0/12（11/12 平） |
| 五子棋 | 12/12 | 8/12 | 0/12 | 0/12 |
| 象棋 | 2/4 | 0/4 | 0/4 | 0/4 |
| 纸牌 | 9/16 | 7/16 | 7/16 | 5/16 |
| 台球 | 9/12 | 12/12 | 0/12 | 0/12 |
| 泡泡 | 13/16 | 9/16 | 9/16 | 5/16 |
| 斯诺克（净胜） | −12 | −4 | +15 | +17 |

台球的「简单档比一般档更难赢」是**指标假象**：参考玩家本身就是 `normal` bot，镜像对局先手 12/12 全胜，而混乱的 easy 偶尔打乱节奏。直接对抗 `easy vs normal` = 1-11 / 3-9、`easy vs pro` = 1-11 / 4-8、`normal vs pro` = 0-12，确认 easy 最弱，故不改台球。井字棋的理论上限是平局，地狱档不可能「必胜」。

### 8.3 三处倒挂与修复

1. **泡泡**（`bubblesBot`）：旧地狱把 chain/floating 权重翻倍并做一步对手前瞻，实测玩家胜 3/8（专业 1/8）、直接对抗 18/40 负于专业。原因是双方共享棋盘且下一颗球色由同一 RNG 序列决定，短视野的对手建模系统性误导。现改为**四档共用同一评估函数，强度只由采样步长决定**：`scan = 15 / 6 / 4 / 2`，且细扫候选集是粗扫的真超集（都从 code=2 起），所以地狱单步价值必然 ≥ 专业。删掉前瞻后单步耗时下降约 25%。
2. **斯诺克**（`snookerBot`）：三组 10 杆对照显示红球阶段专业档的最近袋口 ghost-ball 线路已是物理最优——加六袋口 −45、遮挡惩罚 −42、力度缩放全变差，专业是 +45。彩球阶段的启发式又曾因相差 3.6° 把 7 分球变成送 7 分犯规。现红球阶段地狱**严格复用专业线路**；彩球阶段用 `shootSnooker()` 对前 3 条候选做真实物理验证，按「自己得分 − 送对手罚分」择优，且专业线路始终在候选列表兜底。
3. **纸牌**（`cardsBot`）：简单档 50% 摸牌造成牌堆反复回收、8 局 7 平，玩家「赢不了」而非难度高，改为 90% 出牌 / 10% 摸牌。固定牌堆 60 局对一般档：旧专业仅 27/60（镜像基准 36/60，即比一般档更弱），因为只优化「留牌灵活度」反而拖延自己出牌。专业 / 地狱统一改用一步前瞻的「对手可应答牌数」惩罚，权重 1.2 / 2.5 → 39/60 与 44/60，四档单调。

飞行棋无需改动：`botDie()` 的骰子加权与 `advancedBestMove()` 的被撞威胁权重（地狱 7、专业 3，且无抖动）均生效；CDP 中地狱 600 次掷骰出 162 个 6（均匀期望 100）。

### 8.4 经验

- **「更聪明」不等于更强**。物理类游戏对角度极度敏感，扩大搜索范围或增加启发项常把最优线路换掉；任何档位增强都必须用真实对局数据验证，不能只靠推理。
- **共享状态 / 共享随机序列的游戏不适合短视野对手建模**（泡泡、纸牌的旧逻辑都因此倒挂）。
- **用镜像 bot 当「玩家」会产生系统性偏差**（台球），判断档位强弱应补一组直接对抗。
- **单调性可以靠结构保证**：让高难度候选集严格包含低难度候选集、并把低难度线路作为兜底，比调权重更稳。

### 8.5 验收

`tests/bot-difficulty-strength.test.mjs` 固定了上述性质（采样超集、地狱单步价值 ≥ 专业、斯诺克红球同指令 + 物理验证、10 杆净胜单调、纸牌不拖局、版本链覆盖）；`npm test` 501/501；Chrome CDP `botstrength-cdp.mjs` 22/22（跨页共享档位、页面内动态 import 实跑各引擎、新缓存 key、1600/390px 零溢出、0 JS 异常）。版本链 `?v=20261112-botstrength1`。**未提交、未部署，需 Ctrl+F5。**
