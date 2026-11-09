## 2026-11-01 UI38 当前覆盖：可对局的金翼领航
用户批准一款2D会员飞机，替换并删除UI37的三款3D飞机。主页、机库和默认插画对局使用同一张透明PNG，保留动态螺旋桨、机身1/2编号、镜像、跳格、碰撞和投影阴影。房间公开planeStyle由服务端真实会员资格与账号选择产生；旧gold/sapphire/night选择对外兼容到gold2d，到期回到经典飞机，原选择保留。原三款模型、GLB、导出脚本与专用测试页已删除；下方UI37文字仅为历史。
尾迹延长并加入宽度/透明度渐变；中文手机好友房提供系统分享/微信复制指引，邀请带lang=zh。实时3D棋盘仍仅是保留的实验源码路径，不属于本轮VIP飞机验收；3D骰子不变。
# v0.7.2 UI预览开发交接 · 2026-10-31

## 2026-11-01 最新覆盖：公平记分与会员外观

所有登录账号的每个合资格已完成对局均自动累计积分与完成局数，正负分计入；匿名对局不累计，不接受客户端提交分数。取消每日一次及会员无限记录的差异，历史已结算记录不追补。中途登录绑定、同局同账号仅一个席位、服务器权威及结算幂等仍保留。月/周/日榜继续按UTC结算时间汇总。

会员9 USD/月、59 USD/年，权益为机翼徽章及金翼领航/云端漫游/星夜飞行三款头像框，不增加积分、骰子或胜率优势。选择保存在账号，只有Creem正式ACTIVE、非test_mode且未过期时对外显示；无会员可本地预览，不能保存佩戴，沙箱不授予正式外观。到期恢复普通样式、保留选择。参考图：docs/design/member-appearance-reference.png；SVG资产：dist/assets/member/；独立本地UI预览：docs/verification/member-appearance-preview.html（模拟会员，仅验收，不部署为应用入口）。

以下旧额度/预览范围及历史会员说明仅保留历史记录。

先读README、RULES、V07-CONTRACT、VISUAL_ACCEPTANCE、QA，并查看design下原UI图和历次反馈。内部版本0.7.2，ZIP仍为FlightParty-v0.7.zip。**本轮先做UI，真实联机和防篡改留给后续Codex；用户认可局部进步不等于整体美术最终验收。**

## 当前交付与后续实现

- 两个主要线上入口：快速匹配、创建房间。快速匹配直接入空房，无则建房；不再先显示匹配配置。线上默认经典四席是实现默认，本地练习保留2–4阵营及独立派对选项。
- 创建房间先邀请朋友；全体当前真人点“准备起飞”后整房进入公共匹配，保留朋友席位。等待朋友不计时，公共匹配最多30秒；满员提前开始，到期机器人补空席，不另求确认。后入成员沿用剩余时间，不重置30秒。
- 真实分配必须原子、幂等；等待/取消不扣次数，正式开局才扣一次。抢位、取消、到期补位和开局并发由服务器判定，不能双重开局或重复扣次。开始后只允许原参与者重连，暂不提供旁观。
- 登录账号自动记录完整服务器成绩（含负分），每次正式结算games只加1，输赢都计。开局时服务器固定参与席位accountId，退出登录/会话过期不能清除归属或逃避负分；匿名局中登录默认后续新局生效。匿名无累计积分/局数。删除旧的手动上传、结算后登录认领和claim接口设计。仅积分榜、对局数榜各Top10，移除胜利/胜率展示。
- 后续新结束规则：前两名各自两架到终点即结束，其余按完成数/进度排；+2,+1,-1,-1。当前engine仍旧规则，不因结算UI出现便宣称已实现。
- 后端防篡改：服务器产生骰子/合法移动/回合截止/机器人/最终名次；校验会话与席位；唯一命令+有序事件去重；结算、扣次、账号增量由唯一约束及事务保护。拒绝客户端点数、成绩、局数和会员状态；使用HTTPS/WSS、会话保护和限流。具体验收见V07-CONTRACT。
- 匿名/登录均能玩，普通20局/日、会员不限保留；匿名同20局、UTC重置为建议，登录不重置同日匿名用量。邮箱密码无验证码，Google/GitHub入口保留，真认证/OAuth待实现。
- 断线/下线机器人接管原身份席位，重连恢复权威状态，不能回滚或重复动作；登录账号的托管成绩仍自动保存。表情后续广播全房间，当前reaction-preview仅本地浮泡/头像角标。
- 所有账号、匹配、排行和保存状态目前只可标为预览；不保存真实密码，不制造真实服务成功。优先验收简化UI，再实现规则/账号事务、房间同步和防篡改，最后接入真实数据。

当前设计图在 `design/gameplay-reference.png`；侧栏反馈 `design/v07-player-stats-feedback.png`、道路反馈 `design/v062-road-alignment-feedback.png`及v05构图反馈均保留。旧反馈中的胜率要求被本轮积分/局数取代，其他已确认视觉细节继续保留。

## v0.6.1修正

- `visual-v6.css` 给空/非空 `#piece-buttons` 相同的36px高度；矮桌面32px。不得恢复 `:empty{display:none}`，否则会再次挤压骰子。
- `palette.js` 更新四套base/floor/lane/marker颜色；转为CSS十六进制必须补足6位。
- `fallback.js` 增强基地凹槽和飞机两层接触阴影。`groundY` 是渲染属性，锚定承接平面，移动插值不包含腾空抛物线；不能写入规则状态。
- 用户认可骰子效果并继续要求尺寸稳定、色彩饱和及更明显的飞机阴影；这些局部反馈不等于整体最终验收。

## 本版保持原引擎；后续实现已授权的新规则

`dist/engine.js` 仍与v0.1逐字一致，SHA-256由测试保护。UI阶段不改引擎；“前两名完成即结束”尚未实现，不能把预览结算当成生效。后续实现此需求时应增加两人/三人/四人结束和名次测试，再更新旧哈希保护。不要为追图改变52格路线、起飞条件、碰撞、终点或席位规则。当前是真人同设备+电脑，尚无在线房间。

## v0.6独立3D骰子

- `die-geometry.js`：固定六面，1/6、2/5、3/4互为对面；圆角网格和蓝色凹点是真实几何，不是PNG或CSS平面。`quaternionForResult(n)` 将实际结果面转向玩家。
- `die3d.js`：`Die3D(host,{reduced})`，使用已有本地Three.js依赖。优先WebGL，失败时软件3D光栅化同一网格；两条路径共用面值、姿态和动画时间。
- API：`rollTo(n)` 返回Promise；`setValue(n)` 立即定位；`setReduced(true)` 立即完成当前投掷；`cancel()` 恢复已落定值并结束等待；`resize()` 自适应宿主。
- 投掷时长1120ms，含多轴翻滚、轻跳和末段回弹；这是程序动画，不是刚体物理模拟。
- `app.js` 仍由 `game.roll()` 确定结果，再等待 `rollTo(result)`。`diceBusy` 同时限制飞机按钮、棋子点击和重复投掷，语言切换重绘也不会提前开放选择。
- `cancel()` 先递增epoch再终止骰子，旧动画不能写回新对局。减少动画直接显示结果；英文/中文文字和无障碍标签同步结果。
- `visual-v6.css` 只覆盖骰子区域，移除旧CSS旋转、平面和阴影；整体布局仍来自v0.5。
- v0.6历史预览：`verification/dice-3d-preview.mp4`，640×480、约7.39秒，展示5/2/6点并含音轨。旧 `collision-preview.mp4` 保留v0.5身份，不能称为本轮骰子录屏。
- v0.6当时24项测试通过；浏览器已检查1363×936对局、1366×768和390×844布局，均为软件3D路径，结果面与文字一致且无横向溢出。GPU WebGL实际画面与实体手机性能仍待验证；详情见QA。

## v0.6.2固定地面标定

- `ground-projection.js` 将世界x/z范围 `[-5.725,5.725]` 射影映射到机场图片的地面四边形。它不是双线性插值，世界直线保持直线。
- 1254×1254原图的虚拟非倒角角点：TL `(145,105)`、TR `(1109,105)`、BR `(1128,1076)`、BL `(124,1076)`。坐标先除以1254，再随 `worldRect()` 缩放。
- 左路内沿独立测量约 `(143,214)→(126,979)`，右路内沿约 `(1111,214)→(1126,980)`；测试以这些点检查中段距离，容差原图2px。
- `fallback.js` 的棋格、基地、飞机、地面阴影、粒子和点击命中都经同一个 `project()`。高度单独向上偏移 `y*scale*depth(z)`，不改变同一地点的x；`depth(z)` 由 `groundScale(z)` 得到，远端略小、近端略大。
- `resize()` 仍用 `scale=min(width/15,height/11.8)`；`worldRect()` 仍为 `14.3*scale × 11.3*scale` 居中，海岛纵横比例与取景不变。`pitch=.76` 保留用于局部椭圆等造型，不再定义整个地面的正交投影。
- 棋盘低路缘高度仍为 `-.035→.055`，切角改为1.2世界单位。地板及材质罩层按1.15切角轮廓裁切，避免覆盖公路转角。
- `ocean-water-v5.png` 覆盖外围视口；`airport-island-v5.png` 保持原图与比例。`featherIsland()` 仍只羽化最外侧海水，未离线编辑环境PNG。
- 静态棋盘缓存，运行时绘制飞机、云、烟雾、星星与轨迹。

## 几何、飞机与UI

- `solid()` 绘制侧面、倒角与顶面；`chamferPoints()` 生成切角边框。路线格保留轻微圆角，基地使用切角和双色凹槽。
- `palette.js` 是阵营材质唯一来源；基地、地板、归航线、圆点分别配色，UI共用PALETTE。
- `finishBadge()` 为静态起伏旗面、银色旗杆和蓝色徽章，不是持续飘动动画。
- `drawPlane()` 在原飞机白色侧板上绘制 `piece+1`；数字随旋转/挤压，并单独抵消左右镜像，避免“2”反写，不改变piece身份。
- `visual-v5.css` 保留云层标题栏、紧凑侧栏、头像和响应式布局；`visual-v6.css` 负责骰子呈现。v0.7.2新增预览层应保留这些既有布局、控件ID和事件处理，不依赖旧文件总是最后加载。
- `app.js` 的飞机1/2状态来自实际piece状态。骰子六面身份固定，朝向玩家的主面是规则产生的结果。
- 新头像为 `avatars-v5.png`。旧素材保留用于追溯，运行路径以v5样式与renderer为准。

## 动画与声音

`move()` 逐格合法移动，接触回调一次，多架受撞飞机并行返回；generation令牌可终止旧对局动画。`drawSmoke()/drawTrails()/drawImpact()` 只表现已结算结果。

| 阶段 | 时长 | 表现/声音 |
|---|---:|---|
| 合法移动 | 每格100–175ms | 起飞滑音、低空移动，落点来自规则模块 |
| 接触 | 110ms | 一次bump声音、挤压停顿、烟团、星星和BOOP |
| 返回 | 1370ms | 弧线旋转、双线轨迹、连续烟团，编号跟随飞机 |
| 落地 | 180ms | 小回弹、烟团、land声音 |

减少动画直接更新最终位置，无粒子与震屏。Try a bump使用独立演示状态，结束恢复原局；Record preview导出Canvas与WebAudio。v0.5撞机视频保留在 `verification/collision-preview.mp4`；骰子视频为v0.6历史录屏，均不代表v0.6.2道路校准后的画面。录制调度可能影响总时长。

## 验收与后续边界

v0.6.2阶段26项测试通过；该轮七种尺寸几何检查与1363×936桌面浏览器检查见QA。它们是历史基线，不等于v0.7新界面或未来服务已通过检查。v0.7的实际UI检查已列历史记录；v0.7.2简化匹配/自动记录流程实际验证后才可追加，不预写通过。地面为固定校准的2.5D射影，不是整体实时3D；海面较亮；小屏机身编号偏小，选择按钮和侧栏保留同一编号。不要宣称逐像素复刻或已经视觉验收。

独立表情、机翼、螺旋桨动画需要拆分帧素材或真实GLB模型。实验Three.js路径未完成本次美术验证。真实移动设备性能、完整中文、跨设备联机仍待后续。

## 历史实现

v0.4曾按视口调整pitch，并让背景横向拉伸以填满空带；v0.5取消这一方法并使用正交depth=1。v0.6.2进一步改为固定道路四边形的射影标定；不能恢复旧正交边缘断言。切角、配色、旗帜以及v0.3碰撞效果保留。不要移除设计参考与历次用户反馈图。

## 2026-11-02 UI39 — 飞机姓名、七色彩虹与两款2D涂装
普通/VIP飞机上方均显示所属玩家公开昵称，附席位色点；长名按字符簇省略，标签保持正向，随跳格/碰撞移动。停机双机、叠机和边界统一检测并错开，姓名读取当前权威玩家数据，不改坐标、规则或命中区域。
新增cloud2d云海巡航（珍珠白/冰蓝）及night2d星夜疾风（午夜蓝紫/银），与gold2d共同使用2D透明机身和独立动态桨。主页、机库、对局使用同一资产目录；有效会员可保存，过期回经典。旧三维模型仍删除。
彩虹改为共享截面的连续七色丝带，渐细/渐隐并带浅色光边；修复预览遗漏z投影而叠成紫线的问题。预览与对局共用FlightTrails.draw。仅绘制层变更，积分与支付状态不变。实际检查见QA最新段落。

## 2026-11-02 UI40 — 年VIP飞机与排行排版
普通VIP可用gold2d/cloud2d/night2d；有效年VIP额外可用obsidian2d/aurora2d。所有飞机仍是可上棋盘的2D透明机身和独立活动桨；不恢复已删除的三维模型。机库六项可预览，保存由服务端验证；年权限过期时年专属回经典，普通VIP三款保留。
V16为membership_entitlements新增billing_plan/product_id；仅通过现有真实Creem产品/金额/币种/账期校验的事件写入计划，保留乱序防护。历史未知计划与complimentary赠送不推断年权限。appearance、room、leaderboard显式下发annualMember，客户端无法自授。新徽章位于assets/member/{vip-badge,annual-vip-badge,annual-vip-badge-en}.svg。
排行榜两数字列21px桌面/18px手机（极窄17px），表头共用列宽；SocialUI的ResizeObserver只测量滚动条宽度，替换列表时断开旧观察，隐藏后重现时重新计算。真实Canvas验收图：verification/annual-vip-board-ui40.png；本地模拟资格验收页ui40-preview.html不会修改生产数据。实际验证见QA。
V17保存独立的订阅terminal水位和transaction撤销守卫，首次取消/退款早于paid时也会拒绝旧付款授予；身份仍只由合法checkout和完整付款校验绑定。迁移从已处理认证inbox回填拒绝证据，精确撤销terminal水位覆盖或matching退款的旧错误权益，保留更新合法paid、账号与统计。手机hero回到左侧文档流，不改变机库大图定位。

## 2026-11-02 UI41 — 赠送年VIP、风线与昵称尺寸
用户明确要求把大卫升级成年VIP：V18为complimentary_memberships加tier，默认VIP、限定VIP/ANNUAL；只有显式年级且有效未撤销才额外通过ANNUAL_MEMBER_SQL。历史赠送不自动升级，不能以有效期长度推断等级，不能伪造Creem付费记录。现有appearance/room/leaderboard字段自动传播，无需新增前端信任参数。
排行榜昵称16px桌面/14px手机，VIP徽章48×24/40×20，年VIP68×26/58×22，极窄另有缩小以保留列对齐。hero-wind.css和assets/hero-wind-lines.svg仅为主页实际飞机的无指针伪元素，双层错相向左流动；reduce-motion与prefers-reduced-motion静态，隐藏主页暂停。server.mjs补充SVG正确MIME以支持本地启动；生产NGINX已有SVG支持。

## 2026-11-02 UI42 — 顺机身风线、飞机VIP牌
风线采用42deg旋转后沿local-x负向位移，按当前图像注册从机头右下移向机尾左上；减少动态静态画面保留同角度。plane-nameplates.js新增严格布尔等级helper，原生BOT无徽章，Canvas/实验Three每帧从当前owner读取公开等级。徽章固定18px高，姓名原宽度预算保留、额外扩展牌子宽度；小画布必要时横纵双向避让。中文复用现有金/黑曜SVG并缓存，未加载/失败用同尺寸金属Canvas文字；英文年牌以至少9px文字保障可读性。不会因资源到达改变布局，过期立即降级/移除。实验Three仅接入共享绘制逻辑，本轮未GPU视觉验收。验证/实际图见QA。

## 2026-11-02 最新积分规则
新开局名次分：第一+3、第二+2、第三0、第四0；每架到终点额外+2，结算按服务端最终飞机完成数一次累计。因此第一两架完成共7分，第二共6分，第三/第四各按0/1/2架获得0/2/4分。历史已结算不改；上线前已经开局的对局按开局rules_version保留旧规则。无客户端报分或即时重复加分。

## Platform games — 2026-11-04
- Requested order: Connect Four, Gomoku, Puzzle, Chess, Draw & Guess, Cards, Pool. This iteration implements the first three; the last four remain unimplemented and must retain Coming Soon labels. Cards is provisionally a color-matching party card game, not cash gambling.
- New source: backend/table pure GridRules + transactional TableService, HTTP TableController and scheduler; dist/table browser UI/local rules. Existing Flight Party rules, assets and rendering untouched.
- Unlimited play for all. Shared existing session/account and server-verified monthly/annual membership; public avatars/VIP labels reflect AppearanceService, with no move/score advantage. Login during play can bind an unbound seat. Once bound, logout or computer takeover never removes that scoring identity.
- Independent per-game results/statistics/leaderboard. Competitive two-seat games use +3 first, +2 second; draws +2 each. Cooperative picture puzzle +3 each on completion. Native bots/guests have no cumulative records. Local results never uploaded. No Flight Party plane-finish bonus applies to other games.
- PG row locks, optimistic game versions and command UUID receipts serialize moves and prevent duplicate settlement. Scores come only from server board state; unique room/account result keys enforce once-only records. CSRF and existing Redis API rate limits apply.
- Friends ready before starting; creator alone can ready into a fixed 30-second public matching deadline. Quick matching searches eligible waiting rooms and fills an empty seat with a native bot after 30 seconds. Human turn timeout 30 seconds; original account retained. Restarting friend games needs both human rematch votes and a shared successor room; quick rematch requeues.
- Existing-account explicit join/create can transfer a seat to a new session; former session gets 403 on subsequent polling. Guest recovery requires its original browser session plus room link. The frontend preserves a direct per-game room URL.
- Production backend release is built in D:/code/table-release-backend from the production source snapshot plus only the new table package, V20/V21/V22 and the /api/table permission route. Existing production migration checksums verified before packaging; avoid deploying unrelated dirty local backend files.
- Validation: JS suite 100 passed; Java GridRulesTest 7 passed. Exact release artifact run against a separate local PostgreSQL database and Redis. HTTP independent-session tests complete all three games; reject outsider reads; retry identical commands; race distinct commands; check saved statistics; vote friend rematches; transfer authenticated seats and reject former owner access. Fixed matching deadline/background bot fill tested without browser polling. Browser UI completed local Connect Four, Gomoku and cooperative puzzle by actual clicks.
- Limitations: no real-phone or WeChat sharing acceptance for new games; basic computer strategy; no rated matchmaking, tournament system or new paid cosmetics beyond shared profile/VIP identity. Chess, drawing, cards and pool are NOT done.

### International chess (2026-11-04)
Fourth requested game implemented using vendored chess.js 1.4.0 (BSD-2-Clause) for local play and chesslib 1.3.7 (Apache-2.0) for authoritative server play. Legal moves, castling, en passant, four promotions, checkmate and repetition draws tested. Basic legal-move bot; no claim of strong chess AI. Full HTTP two-session match, duplicate requests, race, friend rematch and account-seat transfer passed against isolated exact-release backend. npm test: 104/104; Java table suites: 10/10. Browser completed Fool's Mate with disabled terminal board. Fixed shared frontend friend-rematch handler to call the existing server voting endpoint. Draw/guess, cards and pool remain pending.

### Remaining platform games (2026-11-04)
Draw & Guess: two seats, six rounds, hidden server word, bounded vector strokes, exact normalized guesses; 30-second server rounds; computer draws geometry only and does not pretend to recognize human drawings. Offline drawing practice and geometry guessing are provided. Cards: two-player shared color/number matching with 72 physical cards and 7-card hands, legal-play validation, reshuffled discard stock and hidden opponent/stock views; no action-card or betting rules. Pool: server-simulated 2D casual shared-target rules, collisions/friction/cushions/pockets, cue scratch recovery and early-8 loss. This is explicitly not full competitive eight-ball. Native bots and local counterparts included. All new games reuse sessions, CSRF, server membership display, public/friend matching, frozen account identity, idempotent transactional settlement and per-game statistics. New games are two-player; original Flight Party remains 2–4. Local/guest results do not accumulate. Results are separated by game, not added to Flight Party totals.
Validation: Java table rule suites 17/17; browser/local JS suites 112/112 (rerun final before release). Exact-release HTTP: all four grid/chess games complete; drawing six rounds with secret redaction/role checks/duplicate safety; cards complete in 53 turns and pool in 102 shots. Browser manually verified chess mate, card play and draw guessing. Pool animation early-timestamp bug fixed and regression added; browser next-shot unlock observed. Responsive CSS supplied; browser viewport override returned 1280px despite a 390px request, so real phone/touch validation remains unverified. No new live payment claim.

Final release proof: production guest-only HTTP QA passed all seven new games (drawing rate-limit check included, cards 165 turns, pool 102 shots). Main portal displays all 8 total game entries and production pool iframe rendered. Runtime artifact SHA256: 690a802eb95424d18a6e1099641bd20631d421c42aeab92fbf280557ebe73ef0. Original Flight Party backend rollback image joyflock-backend:before-seven-games and database dump /opt/joyflock/before-seven-games-20261104.dump retained. Local Docker backend rebuilt and drawing/cards/pool HTTP QA passed on 8081. Source includes per-round guess throttling (1 second, max6), expanded server word list, and dependency URL cache versions. Production screenshot: docs/verification/seven-games-portal-20261104.png.


## Game introductions and shared reactions — 2026-11-04
- All seven table games now follow portal selection → game introduction → play. Introduction includes original cover, quick start, friend room creation/join, local play, rules and UTC monthly/weekly/daily top-10 rankings. Play uses a left game stage and right player/turn/reaction sidebar. Returning home restores the introduction. Original Flight Party rendering is unchanged.
- Added V23 table_reactions: membership-checked events, emoji allowlist, command deduplication, 1.5-second cooldown and 10-second delivery window. Reactions do not advance game versions; independent sessions receive the same event cursor. Local reactions explicitly remain local.
- Rankings use server results in each UTC period and verified profile frames/VIP identity. No invented leaderboard entries were added. Seven original generated illustrations are compressed to 900×900 JPEGs (1.27 MB total); prompt/asset record: docs/design/game-cover-prompts.json. These are cover illustrations, not screenshots or real-time 3D models.
- Validation: npm test 112/112; targeted Java rules 17/17; exact production-baseline jar built successfully. Isolated exact-release HTTP QA completed all seven games. Reaction HTTP QA checked two clients, outsider 403, invalid emoji 400, rate limit 429, idempotency, unchanged game version and day/week/month query validation. Browser observed local intro, local play, portal return-home bridge and two-session shared reaction delivery.
- Limits: real phone/touch and WeChat acceptance remain unverified. Pool remains casual shared-target pool, not standard solids/stripes eight-ball. Shared VIP profile/frame/badge support exists; game-specific premium cues, chess sets or card backs are not implemented. No new payment verification claim.

Production deployment confirmed: Flyway V23 applied; backend health passed. Guest-only production HTTP reaction/security/period tests passed (concurrent burst verifies the cooldown without WAN timing assumptions). Browser observed production portal → introduction → quick match → server bot-filled match → result → return to introduction, plus a delivered celebration event. Cross-origin iframe automated click was unavailable; local same-origin portal bridge and independent production game controls were verified. Production screenshots: docs/verification/portal-covers-20261104.png, game-intro-20261104.png, game-play-20261104.png. Rollback image: joyflock-backend:before-game-lobby; DB dump /opt/joyflock/before-game-lobby-20261104.dump; static archive /opt/joyflock/static-before-game-lobby-20261104.tgz.


## Pool presentation polish and portal fixes — 2026-11-05
- Replaced the small capped green pool canvas with a stage-filling blue woven-felt table, beveled wood rails, visible pocket rims, sights, cue and contact guide. Physical ball radius and all server/local shot rules remain unchanged; the larger table raises the on-screen ball size on wide desktops.
- Added distance-based rotation of number patches and cue-ball red spots, fractional interpolation of server history, bounded cue pullback, replay locking and queued next-shot presentation. Late initial snapshots do not replay stale shots. Basic local computer waits for replay completion. Rendering does not submit scores or alter authoritative results.
- Added bounded Web Audio cue/ball/rail/pocket impacts with gesture unlock and persistent mute. Collision sounds are presentation cues inferred from sampled trajectory direction changes and disappearances, not new server physics events. Audio graph/mute/source lifetimes tested; no claim of physical speaker/listening or real-phone validation.
- Flight Party portal cover now uses the original gold plane with existing cloud-bank artwork over a sky gradient. Waiting/auth close buttons have explicit 34×34 geometry; local browser verified close leaves room. Original Flight Party game artwork is unchanged.
- Validation: npm test 116/116, JS syntax checks; browser verified local cue pullback → replay → computer response → next-shot unlock without console errors. Production quick-match pool, shot replay/unlock and exit to intro observed. Production cover background observed. Screenshots: pool-polish-20261105.png and flight-cover-clouds-20261105.png. Pool remains casual shared-target rules, not full standard eight-ball; no physics or entitlement migration in this release.
- Static-only deployment; backend/database not restarted. Rollback archive /opt/joyflock/static-before-pool-polish-20261104.tgz.


## Pool mouse controls, opening countdown and room chat — 2026-11-05
- Pool-only layout: compact top matchup/timer, left hit-point and vertical cue/power meter, large table, right room-chat panel with existing shared reactions. Other games and Flight Party rendering unchanged.
- Mouse movement aims; left pointer down locks angle; backwards projected drag builds bounded power; pointer up strikes, short/no pull cancels, right click/Escape releases aim. Touch uses pointer capture with the same drag gesture; no real-phone acceptance claim. Opening is an absolute 3-second countdown, server-derived online, not restarted by polling. Early online moves reject409.
- Center hit remains compatible with historical shot commands. Eight directional hit points add bounded follow/draw and side-spin influence in matching Java/JS simulation. This is an approximate 2D spin model within existing casual shared-target rules, not standard fifteen-ball or full3D billiards. Command encoding: spot*363600+power*3600+angle; spot0=center,1..8 clockwise fromtop.
- V24 room chat: server membership/name, max200 Unicode codepoints, one-second cooldown, command deduplication, cursor, recent24h/max100 history; plain text rendering and no public/global broadcast. Guest/local results remain untracked; local chat explicitly local.
- Checks: npm test123/123; Java table suites21/21; syntax checks passed. Exact production-baseline jar SHA256 2a39e1ac886068a6e7b514f7656d43803cc55c5c34d14e4d47d1c4c0662f5030. Production V24 healthy. Guest-only HTTP chat permissions/bounds/Unicode/dedup/rate/cursor, countdown + leave boundary, encoded low-shot acceptance, and existing reaction regression passed.
- Browser: local and production native pointer drags completed shots; countdown observed; two independent-origin production guest sessions exchanged messages, persisted after reload and exited. No console errors seen. Screenshots docs/verification/pool-countdown-20261105.png and pool-mouse-chat-20261105.png. Audio listening and realphone validation were not performed this pass.
- Deployment uses isolated baseline jar (no unrelated local backend changes). Rollback image joyflock-backend:before-pool-mouse; DB backup /opt/joyflock/before-pool-mouse-20261104.dump; static archive /opt/joyflock/static-before-pool-mouse-20261105.tgz.

## 2026-11-05 台球 15 球与回球管道

- 新球局状态有 52 个整数：前 48 项为 16 球坐标/存活标志；48、49 为两组落袋数量；50、51 为组别（0未分组、1全色、2花色）。前后端必须同步更新；旧的 29/31 项球局不能按新布局恢复，应在部署前结束旧局并重新开局。本次没有部署线上。
- 物理与显示半径都为16，球间碰撞直径32，三角架间距同步扩大。回放每2物理步采样，16ms插值显示；回球通过同画布绘制，包含入洞收缩、桌内隐蔽路段、右侧出口与下滚停靠。
- `pool-ball.js` 在 Canvas 上投影球面纹理，累积三维旋转基；不是 WebGL 模型。桌面、槽与顶部共用绘制器；16张192px独立透明PNG在 `dist/assets/pool`，由同一绘制器导出。
- 可复测场景：`dist/pool-15-preview.html`，源文档副本为 `docs/verification/pool-15-preview.html`；全色/花色固定落袋与球体图库不发送网络成绩。
- 实测画面：`docs/verification/pool-15-stripe-20261105.png`。本次通过浏览器标签页直接操作完成满杆击球，避免之前原生窗口控制路径故障。

### Pool cloth/pocket renderer — 2026-11-05
Table rendering lives in dist/table/pool-table.js; makeTable builds shared cloth once per cached table. pocketPath is shared with pool-return.js so returning balls use the visible opening as their clip. pool-view.js retains unchanged physical coordinates and draws a 2x cached table. Current visual review: docs/verification/pool-cloth-pockets-20261105.png. Sound was explicitly accepted as basically satisfactory and not changed in this pass.

### 2026-11-05 台球追加交接
最新本地台球修复见QA末节：白球650ms袋内动作后复位；pool-return.js按袋位路线计时及槽内微回弹；pool-table.js加宽外框、统一袋边厚度、袋口层级在桌上球下方；pool-countdown.js处理3/2/1/GO及独立同步音效。初速度+25%、4ms物理子步已同步Java/JS。验证151前端通过，Docker Java54通过21跳过。8099资源已与工作区比对一致；没有本轮线上部署。用户已基本认可球碰球实录音，不要顺手替换。

## 2026-11-05 台球最新细节交接
最新本地版：圆背斜肩角袋＋尖端灰色护口，清除入口布面凸角，袋底中央稍亮；中袋与边框留缝，贝壳点居中。桌面球杆340单位；更紧凑等比布局。右槽为65外宽的分离双轨，RETURN_X1184、弯半径40、入口28，返回时长按路径自动变化。
音效：本地ball/rail/pocket都使用真实碰撞速度；入袋后继承强度递减；wood-roll独立木腔滚动并有短弱反射，其他声音不加回声。已接受的球碰球CC0录音保留。结算改全屏撒花+dialog内再玩一局，复用原handler，并防在线再战旧响应覆盖已离开的新状态。
最终163项测试通过，8099的8份资源与工作区字节一致；浏览器正式开球与结算场景已验。入口仍是http://127.0.0.1:8099/table/index.html?game=pool，已打开的旧页面需要刷新。完整证据和实际限制见QA最新条目，未部署线上。


2026-11-05 袋口追加：pool-table.js统一台呢绘制与完整斜口接触阴影，导出pocketEntryPath供pool-return.js裁切；删除矩形入口裁切缺口。角袋回弹路径按sx/sy镜像。逐帧验收入口dist/pool-pocket-preview.html；164项测试通过，详见QA最新记录。


2026-11-05 追加：台球JS/Java击球初速度已按用户要求翻倍至power*0.40，步长2ms，每秒衰减/16ms回放保留，旋转冲量同比、音量归一化同步。8种击球点跨语言基准更新；Node165通过，Docker台球10通过。前端白色定位点+16%、中袋视觉宽度-9%、顶灯中央亮四周暗。未上线部署；详见QA最新记录。

2026-11-05 最新台球音画：GO音效0.34秒；胜利首次撒花同步1.28秒短乐句，重开弹窗不重播、遵循静音。桌布中央更亮、四边更暗。166测试通过，浏览器真实末球结算/重开/静音触发验证通过，详见QA。音效试听页新增GO和胜利按钮。

2026-11-05 当前台球微调：力度为此前80%，台呢整体暗6%；中袋收窄内收、灰色护口两端外张。验收截图docs/verification/pool-narrow-middle-dimmer-20261105.png，166前端测试通过，Docker后端成功（21外部服务集成测试跳过）。

2026-11-05 中袋缺角已补：蓝色库边接护口内缘，圆滑接入直边，入袋裁切同步。当前视觉证据docs/verification/pool-mouth-filled-20261105.png。

2026-11-05 最新中袋防撞垫为等宽7单位，共用洞口内弧描边；库边补角与接点保留。截图docs/verification/pool-even-guard-20261105.png。

## 2026-11-05 当前台球：中心落袋、材质分层、对手出杆与精细球杆

最新实现以QA末节为准。pool-geometry.js与Java PoolGeometry统一可见洞口、球心捕获和库边袋颚接触，替换旧半径吸入判定。pool-return.js沿实际入射方向模拟袋后壁接触，落至下层后朝管道滚到边缘被遮挡，保留球面朝向、白球动画和六袋行程差。灰胶/木腔音效分离，强落袋追加递减木质短碰撞，GO为520ms；已认可的球碰球录音保留。

pool-opponent-cue.js提供本地电脑1100ms和接收在线回放后650ms瞄准/后拉/出杆，不是远端实时瞄准。pool-cue.js与assets/pool/power-cue.svg分别绘制桌面和左侧球杆，弧形皮头、渐细木纹、握把环节；桌面杆长340、力度映射不变。台呢加细织纹，角框及护口加深度阴影。

Node200/200通过；Docker Java59通过21外部集成跳过，台球15/15；语法、Chrome正式单机及逐帧场景已验。8099当前11份资源与源码一致，刷新即可查看；本轮未部署线上。证据pool-live-cue-weave-20261105.png及pool-directional-pocket-20261105.png。QA记录完整限制，历史段落中的圆形吸袋、固定左右摆动和GO340ms已被取代。

## 2026-11-05 台球已部署：pool-20261105

上述台球版本已于2026-11-05 15:35:15 UTC发布到生产，目录 `/opt/joyflock/releases/pool-20261105`。后端JAR SHA256为 `1349217973c6d31c7736e5d66f081378d717b8fb8680a5ed184bf88650db48ab`；以核对过的生产基线隔离构建，仅替换台球规则/几何类及相关内部类。数据库保持Flyway V24，没有带入其他本地后端或迁移改动。发布前备份与 `before-pool-20261105` 回滚标签保留。

建房/再战等写入短暂门禁后，确认旧版活跃台球房间为0再切换。历史29格归档不迁移、不伪造为新球局，前端保留比分和结果并提示重新开局。首次预检查因旧nginx绑定文件inode未更新而在后端替换前中止；重建web容器后重试成功。

发布验证为Node202/202、Java59通过/21外部集成跳过（台球15/15）；隔离本地与生产31杆HTTP验证覆盖JS/Java一致性、再战、权限、命令幂等、游客统计保持0；36份公网资源与包匹配。15:53:37 UTC只读复核服务运行、数据库和Redis健康，后续 `/api/csrf` 返回200，release1脚本及旧版归档保护已在公网取得。后续连接不稳定，未独立完成日志无错误核查；不宣称全部生产浏览器、跨设备或主观听感验收通过。专用三个本地QA容器及网络已清理，详细证据与限制见QA同名章节。

击球点控件接线已验证，不是无效按钮。当前仍是八向简化旋转：高低杆影响首次撞球后的白球，左右塞另影响撞库，空台自由滚动和直线瞄准提示不会变化；点击偏心距离不控制旋转强度。选择保留到手动点下方文字按钮重置，未实现独立侧旋视觉。此核查未修改规则。后续进行中的布局、主题和全屏调整须另记验证/部署状态，不应与本次已部署版本混记。


## 2026-11-06 最新部署交接：pool-ui2-20261106

前一版 pool-ui-20261106 为静态 UI1 发布：41 文件、Node207/207、公网41项资源哈希一致，未更新后端。随后发现旧父页缓存、首屏亮暗切换和全屏进入时机问题；UI1 已由本节 UI2 替代。历史记录保留，不能将旧资源校验解释为公网完整浏览器通过。

UI2 已于 **2026-11-05 18:28:36 UTC / 北京时间2026-11-06 02:28:36** 上线，目录 /opt/joyflock/releases/pool-ui2-20261106；JAR SHA256 为 ba5b2b507695297a1ea03ede019930276e8bf25d6ade176b2dec7ba7d2770b4a。数据库仍为 V24。JAR 从前次生产基线隔离构建，327 个内容条目仅 PoolRules.class 改变，未混入其他本地后端工作。原29格已结束房间的显示保护保留。

用户明确保留并增强击球点。指令仍为 spot×363600+power×3600+angle；高低杆/球碰球侧旋/库边侧旋系数分别36%/18%/32%，按实际接触速度和碰撞厚度衰减。首次撞球旋转仅使用一次，限制入射速度与额外能量；库边改变方向而不增加速度。先碰库后的高低杆使用真正入射方向，左右库切向符号镜像正确。初速度power×0.32、2ms子步、16ms回放、球心入洞和组别规则不变。仍是八向二维近似；空台未接触时不弯曲，红点偏心距离不连续控制旋转量，不应宣称完整三维旋转物理。

前端版本串为20261106-ui2，发布45文件。Flight/table主页统一深色，HTML预初始化避免脚本加载前闪亮；可信portal桥在台球进入PLAYING时展开视口，提供原生全屏请求及拒绝时的布局回退，支持按钮/Escape退出。聊天使用“名字：内容”同行，表情进入聊天记录。nginx根静态路径补no-cache，包含portal父页与控制脚本，修复父旧子新的缓存风险；已经打开的旧页仍需刷新。本次只原文件写入nginx配置，避免单文件bind mount的inode失配。

实际验证：最终Node217/217；隔离Docker Java64通过、21外部服务集成跳过（台球20/20）；168场景JS/Java全部回放帧及最终状态一致；独立616组镜像轨迹误差零。隔离本地和公网HTTP各完成31杆双客人比赛、逐杆结果一致、权限/幂等/倒计时/分组、双人再战及游客统计保持零。公网45/45文件HTTP200、SHA256匹配且no-cache。发布专用JAR、Java报告、差异清单及本地HTTP/帧一致性证据均在backend/target/pool-ui2-release-20261106；最终前端、公网HTTP与资源日志在docs/verification/pool-ui2-20261106-tests.log、pool-ui2-public-http-20261106.log、pool-ui2-public-assets-20261106.log。三个专用本地QA容器及网络已清理，无持久卷。

本地浏览器已观察游戏自动铺满视口、按钮退出、聊天同行与表情同流，证据pool-ui2-chat-fullscreen-local-20261106.png；深色首页证据unified-flight-home-local-20261106.png、unified-table-home-local-20261106.png。公网自动化跨域iframe仍显示about:blank，直达Flight/table可加载；**不宣称公网iframe流程或原生fullscreen浏览器验收通过**。手机、双设备及扬声器听感未在本轮验收。详细数值与验证边界见QA同名章节。

回滚镜像为joyflock-backend:before-pool-ui2-20261106。线上发布目录保留static.before.tgz、nginx.before.conf、deploy.log、existing-files.txt及发布脚本；后端、前端物理与配置应一起恢复，nginx原文件写回、先语法检查再重载。本次没有数据库迁移，不应回退数据库。下一轮变更必须另记验证和部署状态，避免把未上线源码与本节已发布制品混记。

Public direct game UI follow-up: https://flight.joyflock.com/table/index.html?game=pool loaded the deployed version and account avatar correctly; local two-player session visibly rendered `大卫：你好` and `大卫：🎉` in the same chat stream, inactive opponent dimmed. Screenshot: `docs/verification/pool-ui2-chat-public-20261106.png`. This is direct-page/single-machine UI evidence, not cross-origin portal/native-fullscreen evidence. Latest explicit user instruction: shut down the local computer after deployment and verification; no remote shutdown requested.
