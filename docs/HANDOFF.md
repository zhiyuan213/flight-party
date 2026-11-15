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
最新本地台球修复见QA末节：白球650ms袋内动作后复位；pool-return.js按袋位路线计时及槽内微回弹；pool-table.js加宽外框、统一袋边厚度、袋口层级在桌上球下方；pool-countdown.js处理3/2/1/GO及独立同步音效。初速度+25%、2ms物理子步已同步Java/JS（该处原记「4ms」系笔误，代码与注释均为2ms）。验证151前端通过，Docker Java54通过21跳过。8099资源已与工作区比对一致；没有本轮线上部署。用户已基本认可球碰球实录音，不要顺手替换。

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

击球点控件接线已验证，不是无效按钮。2026-11-06 的八向一次性冲量模型已于 2026-11-10 升级为带角速度状态的衰减模型（见 docs/POOL-SPIN-PHYSICS-UPGRADE.md 与 QA 2026-11-10 章节）：空台侧旋走弧线、高/低杆影响全程滑行并在每次碰撞按剩余预算生效、球间有 throw、侧旋改变库边反弹角。击球点仍为 9 档，偏心幅度未连续化（受 NOM_BASE 限制）。此核查未修改规则。后续进行中的布局、主题和全屏调整须另记验证/部署状态，不应与本次已部署版本混记。


## 2026-11-06 最新部署交接：pool-ui2-20261106

前一版 pool-ui-20261106 为静态 UI1 发布：41 文件、Node207/207、公网41项资源哈希一致，未更新后端。随后发现旧父页缓存、首屏亮暗切换和全屏进入时机问题；UI1 已由本节 UI2 替代。历史记录保留，不能将旧资源校验解释为公网完整浏览器通过。

UI2 已于 **2026-11-05 18:28:36 UTC / 北京时间2026-11-06 02:28:36** 上线，目录 /opt/joyflock/releases/pool-ui2-20261106；JAR SHA256 为 ba5b2b507695297a1ea03ede019930276e8bf25d6ade176b2dec7ba7d2770b4a。数据库仍为 V24。JAR 从前次生产基线隔离构建，327 个内容条目仅 PoolRules.class 改变，未混入其他本地后端工作。原29格已结束房间的显示保护保留。

用户明确保留并增强击球点。指令仍为 spot×363600+power×3600+angle；高低杆/球碰球侧旋/库边侧旋系数分别36%/18%/32%，按实际接触速度和碰撞厚度衰减。首次撞球旋转仅使用一次，限制入射速度与额外能量；库边改变方向而不增加速度。先碰库后的高低杆使用真正入射方向，左右库切向符号镜像正确。初速度power×0.32、2ms子步、16ms回放、球心入洞和组别规则不变。仍是八向二维近似；空台未接触时不弯曲，红点偏心距离不连续控制旋转量，不应宣称完整三维旋转物理。

前端版本串为20261106-ui2，发布45文件。Flight/table主页统一深色，HTML预初始化避免脚本加载前闪亮；可信portal桥在台球进入PLAYING时展开视口，提供原生全屏请求及拒绝时的布局回退，支持按钮/Escape退出。聊天使用“名字：内容”同行，表情进入聊天记录。nginx根静态路径补no-cache，包含portal父页与控制脚本，修复父旧子新的缓存风险；已经打开的旧页仍需刷新。本次只原文件写入nginx配置，避免单文件bind mount的inode失配。

实际验证：最终Node217/217；隔离Docker Java64通过、21外部服务集成跳过（台球20/20）；168场景JS/Java全部回放帧及最终状态一致；独立616组镜像轨迹误差零。隔离本地和公网HTTP各完成31杆双客人比赛、逐杆结果一致、权限/幂等/倒计时/分组、双人再战及游客统计保持零。公网45/45文件HTTP200、SHA256匹配且no-cache。发布专用JAR、Java报告、差异清单及本地HTTP/帧一致性证据均在backend/target/pool-ui2-release-20261106；最终前端、公网HTTP与资源日志在docs/verification/pool-ui2-20261106-tests.log、pool-ui2-public-http-20261106.log、pool-ui2-public-assets-20261106.log。三个专用本地QA容器及网络已清理，无持久卷。

本地浏览器已观察游戏自动铺满视口、按钮退出、聊天同行与表情同流，证据pool-ui2-chat-fullscreen-local-20261106.png；深色首页证据unified-flight-home-local-20261106.png、unified-table-home-local-20261106.png。公网自动化跨域iframe仍显示about:blank，直达Flight/table可加载；**不宣称公网iframe流程或原生fullscreen浏览器验收通过**。手机、双设备及扬声器听感未在本轮验收。详细数值与验证边界见QA同名章节。

回滚镜像为joyflock-backend:before-pool-ui2-20261106。线上发布目录保留static.before.tgz、nginx.before.conf、deploy.log、existing-files.txt及发布脚本；后端、前端物理与配置应一起恢复，nginx原文件写回、先语法检查再重载。本次没有数据库迁移，不应回退数据库。下一轮变更必须另记验证和部署状态，避免把未上线源码与本节已发布制品混记。

Public direct game UI follow-up: https://flight.joyflock.com/table/index.html?game=pool loaded the deployed version and account avatar correctly; local two-player session visibly rendered `大卫：你好` and `大卫：🎉` in the same chat stream, inactive opponent dimmed. Screenshot: `docs/verification/pool-ui2-chat-public-20261106.png`. This is direct-page/single-machine UI evidence, not cross-origin portal/native-fullscreen evidence. Latest explicit user instruction: shut down the local computer after deployment and verification; no remote shutdown requested.

2026-11-10 袋口绕圈（第三轮，本地未部署）：用户要求高速擦边入袋时「打圈进洞」。仅在 dist/table/pool-return.js 增加表现层分支，触发为入射速度≥36 / 偏心距≥14 / 到袋心前向距离≥3；解析式收缩螺旋约 1.9–2.0 圈、dropAt 500ms，配合 depth 渐进收口与球径小幅缩小，复用既有 pocketSoundStages 生成 2–3 次递减擦壁音。物理层、shot 协议、53 格状态、回放帧、golden fixtures 与 Java 全部未改，JS 物理输出与现有 parity 基线 168/168 一致。新增 dist/pool-rattle-preview.html 逐帧验收页（4 组 × 8 帧，可播放、可叠加球心轨迹）与 tests/table-pool-pocket-rattle.test.mjs（6 项）。npm test 224/224；Chrome headless 截图确认螺旋可见、直落对照组不变。全项目 ?v= 由 20261110-brisk bump 为 20261110-rattle，浏览器需强刷。详见 docs/QA.md 2026-11-10（三）与 docs/POOL-SPIN-PHYSICS-UPGRADE.md §9.6。本轮未部署、未做实机手感与听感验收。

2026-11-10 袋内往返撞壁（第四轮，本地未部署）：用户指出正面大力直进应在袋内前后撞几下、力度越大次数越多；实测 power 30–100 全部只有 1 次撞壁（袋内速度归一到 0.55、法向恢复 0.32、dropAt 反随力度变早）。仍只改 dist/table/pool-return.js，新增与斜擦螺旋互斥的 rebound 分支：触发 `速度≥30 && 偏心距≤10 && 前向距离≥3`，沿实测入射轴一维往返，后端点由真实袋后壁几何探测、前端为袋口颚部，保留横向分量避免首帧跳变；力度档决定 2/3/4 次折返，撞击声递减，dropAt 为最后一次撞击时刻。物理/协议/状态/回放帧/fixtures/Java 全部未改，parity 基线 168/168 一致。新增 dist/pool-rebound-preview.html（5 组 × 8 帧，可播放、叠加轨迹与撞击点）与 tests/table-pool-pocket-rebound.test.mjs（8 项）。npm test 232/232；Chrome headless 截图确认折返可见。?v= 由 20261110-rattle bump 为 20261110-rebound，需强刷。详见 docs/QA.md 2026-11-10（四）与 docs/POOL-SPIN-PHYSICS-UPGRADE.md §9.7。落袋表现最长 520ms，实机手感与听感未验收。

同日节奏修正（第五轮）：用户反馈真实台球撞击非常快且越往后越快，怀疑力度不够。实测 power 100 入射速度 47（上限 48）、strength 已饱和，问题是袋内「大幅能量衰减 + 固定行程」把间隔做成 80/120/196ms 越拖越长。改为「保留速度 0.90+0.04×level + 以刚撞袋壁为锚逐次收窄对侧颚部 0.80−0.04×level」，行程缩短快于速度衰减：中袋 p100 四次撞击 56/104/144/180ms，间隔 56→48→40→36ms；角袋 p100 72/124/168/208ms；REBOUND_MAX_TIME 520→320，depth 撞击期只到 0.35 以保持球可见。新增「间隔逐次缩短、首次撞击更早」断言，npm test 233/233、parity 168/168、headless 截图通过。?v= 最终为 20261110-quick，文档 QA（四）/§9.7 数值已同步。落袋表现最长 208ms，实机手感与听感未验收、未部署。

同日满力 6 下（第六轮）：用户要「全力打击的爽感」，要求 100% 力度 6 下再进洞、间隔仍按现有衰减。次数映射由 `2+round(4×level²)` 改为 `2+round(4.3×level²)`，平方分档保证低力度不变（p70 2 下、p90 4 下）、满力 6 下；系数 4.3 修正角袋满力入射速度 46.8 略低于中袋 47.1 时只分到 5 下的边界。中袋 p100 撞击 56/104/144/180/208/232ms、间隔 56→48→40→36→28→24ms；角袋 p100 72/124/168/208/240/268ms（同为 6 下）；漏斗收窄参数、depth、REBOUND_MAX_TIME=320 均不变。预览页帧时刻 0–320ms，测试断言同步 `[2,4,6]` 与「角袋满力 6 下」、dropAt≤320。npm test 233/233、parity 168/168、headless 截图确认 6 连击无空白帧。?v= 最终 20261110-six；QA（四）/§9.7 数值已同步。落袋表现最长 272ms，实机手感与听感未验收、未部署。

同日满力 8 下（第七轮）：用户要「全力打击的爽感」，要求 100% 力度 8 下再进洞并稍微加快频率。只改 pool-return.js 的 reboundPlan 三个参数：`maxBounces` `2+round(4.3×level²)` → `2+round(6.6×level²)`（满力 8 下，中袋/角袋同为 8）、`v0` `.44+.12×level` → `.45+.12×level`、`shrink` `.80−.04×level` → `.77−.04×level`。中袋 p100 撞击 56/100/136/168/192/212/228/240ms、间隔 56→44→36→32→24→20→16→12ms，8 下共 240ms（原 6 下 232ms，只多 8ms）；角袋 p100 72/120/160/192/220/244/264/280ms；p90 为 5 下、p70 仍 2 下。maxStep ≤2.26、方向反转 7 次、REBOUND_MAX_TIME=320 未触发。预览页说明改「2–8 次（满力 8 下）」；测试断言 `[2,5,8]`、角袋满力 ===8、8 下 ≤250ms。npm test 233/233、parity 168/168、headless 截图确认 8 连击。?v= 最终 20261110-eight；QA（四）/§9.7 数值已同步。落袋表现最长 284ms，末三下间隔 20/16/12ms 会连成密集滚音，实机手感与听感未验收、未部署。

同日大力必触发（第八轮）：用户提出不变量「不管擦边打圈还是角度撞击，力气大肯定触发其中一种」，实测不成立 —— 115 次 power 90/100 落袋中 53 次 plain（power100 为 23/60，38.3%），主因是两分支只判入袋瞬时速度（满力出杆经长距离/吃库后到袋口常只剩 9–17），另有偏心距 10–14 空档与 along<3 贴唇。改 pool-view.js 从 s.shotCommand 解析 shotPower 随 capture 传入（Number.isFinite 兜底）；pool-return.js 的 reboundPlan 增加 FORCE_MIN_POWER=90 兜底：出杆≥90、along≥1 且未被螺旋认领的球一律走往返，level=max(入袋速度档, 0.6×出杆力度档)，慢球约 3–4 下轻撞、音量仍随 strength；缓存签名加 shotPower。螺旋分支与轻推直落不变。结果同批样本 plain 53→0（rattle 17 / rebound 98），43 次低速兜底 maxStep 2.09、最长 244ms。npm test 235/235（新增 2 项）、parity 168/168、预览页新增 F 行对照。?v= 最终 20261110-force；QA（五）/§9.8 已同步。物理/协议/状态/回放帧/fixtures/Java 未改；出杆力度混入表现层是为爽感的工程近似，远端回放若无 shotCommand 会回退旧判定。验收时本机 Docker daemon 不可达、8081 返回 502，改用 Chrome file:// + allow-file-access-from-files 完成 headless 截图；实机手感与听感未验收、未部署。

同日服务重启：用户要求启动服务。诊断 502 根因是 Docker daemon 可用（29.8.2）但 compose 四个容器全部未在跑，`upstream connect failed (10061)`；执行 `docker compose -f deploy/compose.yaml up -d --build` 后 web/backend/postgres/redis 全部 Up（pg、redis healthy），首页、游戏页、三个预览页、`/api/csrf`、`/api/me` 全部 200，后端 Spring Boot 6.06s 启动完成。8082 静态服务按用户先前取消的操作未重启。

同日第九轮「斜角钻进去」修正（本地未部署）：用户给出长距离斜切上中袋截图，要求按不同角度测、4 角一致 2 中一致、全力不静默，并补充「力度小的撞一次或少转点圈就进去」。诊断确认 power 60/80 斜角完全 plain 直落，且动作期 `depth` 收口把球裁掉导致触发了也看不见。仍只改 `dist/table/pool-return.js` 与 `pool-view.js`：用连续 `driveLevel=max(speed/48, 0.62×clamp((shotPower−55)/45))` 取代两套硬阈值，`DRIVE_FLOOR=.45` 以下保留轻推 1 撞直落；绕袋接管偏心≥11 或 `along<0`、往返接管其余，两分支平铺使全力 0 plain；圈数 `.25+1.9×level²+.15×min(1,offset/24)`（斜角 p60 0.83 圈→p100 1.91 圈）、撞击次数 `1+round(7.4×level³)`（p30/40 1 撞、p50/60 2、p70 3、p90 6、p100 8，中袋/角袋满力同为 8）；动作期 `depth` 上限压到 0.16/0.12 让球完整可见；Hermite 引入 128→176ms、管道出口速度 clamp ±0.55 保连续；snapshot 直推路径补 `shotPower`。验证 286 次全力落袋 plain=0、4 角/2 中逐 key 0 不一致、最大单步 2.272、`npm test` 239/239（新增 `tests/table-pool-pocket-symmetry.test.mjs` 4 项）、parity 168/168；新增 `dist/pool-angle-preview.html`（六袋矩阵 + 力度分级 10 行 × 8 帧）headless 截图无空白帧。`?v=` 最终 **`20261110-angle`**，需 Ctrl+F5。物理/协议/状态/回放帧/fixtures/Java 全部未改，不用重开局；仍是 2D 脚本化表现、不读 `wz`，未部署、实机手感与听感未验收。详见 `docs/QA.md` 2026-11-10（六）与 `docs/POOL-SPIN-PHYSICS-UPGRADE.md` §9.9。

同日第十轮「开球连锁撞击音效」（本地未部署）：用户指出开球「1 撞 2、2 撞 3 一直撞下去」没有音效。实测满力开球物理层 41 次球球碰撞 / 27 次库边 / 1 次落袋，其中 29 次连锁集中在 62–76ms（14ms）；16ms 抽帧重建后 12 次挤在同一 96ms 帧，单机精确事件也在同一帧一次性 `poolImpact`，叠加成一记闷响并撞 32 声部上限。只改音效链：`pool-audio.js` 新增 `impactBurstSchedule`（过滤 <0.035、强度降序最多 24 个、总展开 ≤120ms、gain 递减、变体轮转）、`poolImpactBurst`、`chainLevels`（同帧 ≥3 个 ball 时按实测峰值 `peak×.55×.88^i` 抬底，绝不超过峰值），并给 `poolImpact`/`recordedImpact` 加 `delay`/`variant`/`playbackGain` 用 Web Audio `start(now+delay)` 精确错峰；`pool-view.js` 把精确 `due` 与重建 `batch` 都交给 burst，新增 `hasServerImpacts` 修掉空 `audioEvents` 数组导致整杆静默的隐患，同球对去重 55→24ms。未采纳前端本地重跑 `poolMove`（实测 40–120ms 会卡顿）。效果：单机 29 次 → 24 声 / 120ms，在线重建 12 次 → 12 声 / 88ms（原 5 声同时响）。`npm test` **244/244**（新增 `tests/table-pool-audio-chain.test.mjs` 5 项）、parity **168/168**；新增 `dist/pool-break-audio-preview.html`（4 个 A/B 试听按钮 + 触发时刻时间轴）headless 截图正常。`?v=` 最终 **`20261110-break`**，需 Ctrl+F5。物理 / 协议 / 状态 / 回放帧 / fixtures / Java 本轮未改，不用重开局；连锁时间展开是表现层艺术加工，未部署、实机听感未验收。详见 `docs/QA.md` 2026-11-10（七）与 `docs/POOL-SPIN-PHYSICS-UPGRADE.md` §9.10。

同日第十一轮「袋口视觉外扩 2 单位」（本地未部署）：用户给出上中袋局部截图（红框标白色袋唇顶/左右），要求洞口往外扩 2px 并问进洞效果要不要改。诊断确认 `tracePocket`/`tracePocketBack` 被渲染、`pocketIndex` 物理落袋判定、`PoolGeometry.java` 镜像、动画 `backWall()` 四处共用，直接改控制点会动 parity 与 fixtures。只改表现层：`pool-geometry.js` 新增 `POCKET_VISUAL_EXPAND=2`、`expandPocketPoint()`（端点与贝塞尔控制点沿径向外移 2）、`pocketVisualContext()` 路径代理；`pool-table.js` 的黑形/白色袋唇/角袋帽/入口裁切、`pool-return.js` 的 `backWall()` 与 `descendingPocketPath()` 统一走代理，**`pocketIndex`/`outline()` 与 Java 保持原坐标**。外扩使首圈 +2、满力 8 连击 240→260ms，因 `v0=.568` 已到 4ms/2.27 步上限，改把 `shrink` `.77→.735` 补回 **228ms**（角袋 244ms）。验证 `npm test` **248/248**（新增 `tests/table-pool-mouth.test.mjs` 4 项）、parity **168/168**、六袋 286 次全力落袋 plain=0 / 4 角 2 中 0 不一致 / maxStep 2.27、红黄轮廓对比页与两个逐帧页 headless 截图确认衔接干净无空白帧。`?v=` 最终 **`20261110-mouth`**，需 Ctrl+F5。物理 / 协议 / 状态 / 回放帧 / fixtures / Java 本轮未改，不用重开局；外扩的 2 单位是刻意保留的「视觉带」，贴新边缘掠过的球仍按原轮廓判定落袋，实机观感待确认。详见 `docs/QA.md` 2026-11-10（八）与 `docs/POOL-SPIN-PHYSICS-UPGRADE.md` §9.11。

同日第十二轮「进洞木头撞击与滚动音」（本地未部署）：用户要求撞击改成木头声 + 洞内回声、与页面撞击同频，滚动要有木头上滚动的音效。实测三个根因：① `rubber` 是 260Hz 低通闷响（中频/低频能量比 .001）；② 满力视觉 8 击却产出 10 个 stage，`wood-rattle` 在落袋后自造 5 声且间隔 0/33/80/146/241ms 越来越长，与「越撞越急」相反；③ `wood-roll` RMS .0039（撞击 1/25）。只改音效链：`pool-audio.js` 新增 `woodKnockSamples`（330/790/1420/2260/3350Hz 非谐木模态 + 宽带叩击 + 三次有限腔体反射 19/41/68ms，`echo` 控制尾长 83–130ms，中频比 .334 约 ×300）；`pocketSoundStages` 删掉 `wood-rattle` stage、严格一接触一声 `wood-knock` + 一个 `wood-drop`，`echo=clamp(gap/60,.35,.8)`、末击 1；`pool-view.js` 本帧到期 stages 按 `at` 排序批量精确 delay，`poolImpact` 去掉全部随机抖动并加第 7 参数 `echo`；`woodRollSamples` gain `.6×level^.65→1.5×level^1.15`、低通 `220+120→430+240`、每颗粒加 620Hz 木模态、tanh 单调软饱和，`returnSoundLevel` ×1.5，台呢 `roll` 幅度/频率/上限同步提升（RMS .0039→.0122）。验证 `npm test` **253/253**（新增 `tests/table-pool-wood-audio.test.mjs` 5 项、同步更新 `tests/table-pool-material-audio.test.mjs` stages 语义）、parity **168/168**；新增 `dist/pool-wood-audio-preview.html`（7 个 A/B 试听按钮 + 0–350ms 时刻对齐时间轴）headless 截图确认 8/8 对齐、额外回弹 5→0、中频比 ×321。`?v=` 最终 **`20261110-wood`**，需 Ctrl+F5。物理 / 协议 / 状态 / 回放帧 / fixtures / Java 本轮未改，不用重开局；木头音色是合成模态 + 有限反射而非实录，实机听感未验收。详见 `docs/QA.md` 2026-11-10（九）与 `docs/POOL-SPIN-PHYSICS-UPGRADE.md` §9.12。

同日第十三轮「连锁撞击音色统一」（本地未部署）：用户截 A/B 试听页问「修改后是同一个声音吗？怎么感觉音调都变了」。诊断确认素材是同一个 `ball-clack.mp3`，但 `impactBurstSchedule` 的 `variant=i%3` 让 24 记播放速率按 .97/1.00/1.03 规律循环（听成音阶），`recordedImpact` 的 `2500+3500×strength` 又让低通从 6000Hz 逐记降到 2772Hz（后半段变闷），`lastVariant` 防重复作用于 override 还使整链每次点击随机移位；旧版 29 声同时响时这些差异被糊掉，展开后全暴露。只改音效链：新增 `BURST_TONE_CUTOFF=4200` 与 `toneLock` 参数链（`poolImpactBurst` → `poolImpact` → `recordedImpact` / `impactSamples`，仅 `kind==='ball'` 生效），锁定 `playbackRate=1`、不读写 `lastVariant`、固定增益抖动与合成 fallback 的 pitch/variation/cutoff/duration；`impactBurstSchedule` 的 `variant` 改为整链统一 1。连锁只靠时间错峰 + 音量递减表达，单发普通撞击与袋口木头/滚动音保持原样。验证 `npm test` **254/254**（`tests/table-pool-audio-chain.test.mjs` 5→6 项，mock Web Audio 断言 12 声速率全 1、滤波全 4200、单发仍 5300Hz）、parity **168/168**；单机 24 声/120ms、在线 12 声/88ms 不变；`pool-break-audio-preview.html` 文案与 headless 截图同步。`?v=` 最终 **`20261110-tone`**，需 Ctrl+F5；物理/协议/状态/回放帧/fixtures/Java 未改，不用重开局。若实机觉得同音偏机械，应改「每杆随机一个变体、杆内统一」，不要恢复逐记轮换。详见 `docs/QA.md` 2026-11-10（十）、`docs/POOL-SPIN-PHYSICS-UPGRADE.md` §9.13、`docs/POOL-IMPACT-EFFECTS.md` §3.8。

同日第十四轮「中袋颚部斜切」（本地未部署）：用户给上中袋右侧、下中袋左右两张红框截图，指出「这里是一条线下来的，不是突出来的」。归因实验先把 `POCKET_VISUAL_EXPAND` 临时设为 0，方形凸台依然存在，排除第 10 轮 2 单位外扩（已改回 2）；高倍诊断页叠加台面缓存与四条路径后定位真因：`makeTable` 的 `cushionContour` 在中袋端用「先横后竖」的 90° 圆角贝塞尔，白色袋唇 `middleBack` 又被 `rect(-50,-70,100,50)` 水平裁切在 `y=-20`，库边鼻端却继续伸到 `y=0`，中间露出的蓝色块就是凸台。另试过让白弧沿颚部贝塞尔延伸，会变成下垂白钩子，已回退。只改台面绘制：`cushionContour(ctx,points,index,rounded=false)` 默认输出 4 点直线多边形、袋口端单条斜线；`rounded=true` 复现旧圆角仅供 A/B，`makeTable(ctx,options={})` 透传 `options.roundedJaws`。新增 `dist/pocket-jaw-preview.html`（旧/新并排上、下中袋 1.4× 实际缩放 + 右接缝 8× 高倍）与 `tests/table-pool-jaw.test.mjs` 3 项。验证 `npm test` **257/257**、parity **168/168**、headless 截图确认圆角方块消失且左右对称无缺口。`?v=` 最终 **`20261110-jaw`**，需 Ctrl+F5；物理 `rails`/`pocketIndex`/`resolveCushion`/`cushionContact`/Java 未改，不用重开局。**已知近似**：绘出的斜切与物理圆角鼻端在约 8×20 单位小三角内不重合（落在落袋判定范围内），实机需确认擦边球；若觉得张口太大，把 `roundedJaws` 默认改回即可一行回退。详见 `docs/QA.md` 2026-11-10（十一）、`docs/POOL-SPIN-PHYSICS-UPGRADE.md` §9.14、`docs/POOL-IMPACT-EFFECTS.md` §3.9。

**交接摘要（2026-11-10 台球撞击系列）**：从「不会旋转 / 击球笨重」到「绕袋打圈 / 往返撞壁 / 越撞越急 / 满力 8 下 / 大力必触发 / 六袋对称 / 开球连锁音效 / 袋口外扩 / 木头撞击与滚动音 / 连锁音色统一 / 中袋颚部斜切」的一系列改动，全部只落在本机工作区、纯表现层，物理与 Java 在这些轮次未改，parity 始终 168/168。时间线、**当前生效参数**、验收矩阵、文件清单与调参入口统一见 `docs/POOL-IMPACT-EFFECTS.md`；上面各段保留逐轮诊断与历史数值，不要拿已被取代的中间值（6 下、`[2,5,8]`、旧阈值 30/36、旧 `shrink=.77`、`rubber` 撞击、旧 `?v=`）当现状。当前 `?v=20261110-jaw`，`npm test` 257/257，本地 8081 四容器 Up 且全部页面 200，**未提交、未部署**，实机手感与听感未验收。

**2026-11-10 后续两轮（覆盖上方旧摘要中的「当前值」）**：① **背景音乐**：新增 `dist/table/pool-bgm.js`（8 小节 / 82BPM / 23.41s 程序合成 lounge 循环，按小节异步生成、尾部 25ms 交叉淡化、单 loop source），`dist/table/index.html?game=pool|snooker` 进入详情页即起播，对局页同文档不中断；左下角 ♫ 开关与「声音/静音」联动；新增 `dist/pool-bgm-preview.html`、`tests/table-pool-bgm.test.mjs` 6 项。② **白球落袋白手套摆球**：新增 `dist/table/pool-place.js`（命令 `1e9 + cueX*10000 + cueY`）与 `dist/table/pool-glove.js`；`pool.js` / `PoolRules.java` 同步新增 place 分支（只改 `cells[0..1]`，不换回合不加杆数，可重复），`pool-view.js` 实现 50%→100%→50% 的白手套拖动与障碍回退；新增 `dist/pool-cue-in-hand-preview.html`、`tests/table-pool-cue-in-hand.test.mjs` 8 项。注意**这一轮改了 Java 权威规则并已 `docker compose up -d --build backend` 重建重启后端镜像**，与上方「物理与 Java 未改」的旧描述不同。当前全项目 `.js?v=` **173 处统一为 `20261110-hand1`**，`npm test` **271/271**、Docker Java **101 通过 / 21 跳过**（`PoolRulesTest` 22）、在线 HTTP 冒烟与 CDP 实机拖动通过，parity 168/168 未变。8081 四容器 Up，浏览器需 Ctrl+F5；**未提交、未部署**，BGM 听感与手套造型/拖动手感待用户确认。详见 `docs/QA.md`（十二）（十三）与 `docs/POOL-IMPACT-EFFECTS.md` §9 / §10。

**2026-11-10 最新一轮「台呢阻力降低四分之一」（覆盖上方所有当前值）**：用户「阻力降低个4/1」按降低 **1/4（×0.75）** 实施。`DAMP=Math.pow(.991,.25) → Math.pow(.99325,.25)`（每 8ms 标称损失 `0.009 → 0.00675`），`dist/table/pool.js` 与 `PoolRules.java` **同步修改**——这是台球系列第一次改物理常量，其余物理/表现/音效参数全未动。满力空台行程 3350~3520 → **4137**（约 +21%）。所有 golden fixtures 已刷新（8 个击球点、follow/draw、侧旋库边、行程窗口、4 处速度公式），3 处测试场景改角度/力度（旧场景在新物理下越过袋口或分支改变），侧旋/跟随缩杆改测第 20 帧自由飞行段。**当前全项目 174 处 `.js?v=` 统一 `20261110-drag1`**，`npm test` **271/271**、Docker Java **101 通过 / 21 跳过**、在线整局 **52 杆 / 13929 帧** JS↔Java 逐项一致（比旧 168 场景更严格）。**后端镜像已再次重建重启**，8081 四容器 Up、页面与 API 200，浏览器需 Ctrl+F5。未提交、未部署；球滚更久的实机手感、袋内 8 连击与连锁音在新入袋速度下的平衡待用户确认。若用户原意是「降到原来的 1/4」，应改成 `0.99775`。详见 `docs/QA.md`（十四）、`docs/POOL-IMPACT-EFFECTS.md` §11、`docs/POOL-SPIN-PHYSICS-UPGRADE.md` §9.15。

**2026-11-10 最新一轮「进洞撞击改为厚实木头、回音收敛」（覆盖上方与音色相关的当前值）**：用户「进洞的声音再调整下，回音一点点就可以，现在有点空心木头发出的声音一样，有没厚实的木头声音」。归因（实测）：旧 `wood-knock` 是 330Hz 纯音主体 + 790/1420/2260/3350Hz 分音同响（中/低频 **0.73**、低频占比 **57.8%**）+ 19/41/68ms 三次亮反射 `.30/.15/.07`，60–100ms 仍 **12.4%**、总长 130ms → 空木盒；固定 `.82` 限幅还把轻/重击压成同一响度。**只改 `dist/table/pool-audio.js` 两个合成器与注释**：撞击换 152Hz 低频主体 + 92Hz 冲击、高分音只留 2–4ms 短「嗒」，反射减为 14/30ms 两次极弱暗反射 **`.10/.035`**，尾长 **130→74ms**；`wood-drop` 反射 `.28/.13→.10/.035`、180→135ms；力度曲线 `loudness=.22+.78×level^1.15` 移到限幅之后（轻/中/重 RMS **0.031/0.058/0.102**）。结果低频占比 **91.6%**、中/低频 **0.09**、60–100ms 残余 **0.2%**。`pocketSoundStages`、同频调度、`wood-roll`、物理 / Java / parity 全未改（滚动音本轮未提，特意保留）。验证 `npm test` **272/272**（`tests/table-pool-wood-audio.test.mjs` 5→6 项，新增满力 8 连击叠加无嗡鸣；旧「130ms 回声可闻」断言改为厚实度 / 弱回声门槛）、Docker Java **101 通过 / 21 跳过**、CDP 试听页 6 张统计卡与 5 个按钮逐个点击 + 正式页 **0 运行时异常**。**当前全项目 174 处 `.js?v=` 统一 `20261110-thick1`**，浏览器需 Ctrl+F5；本轮纯表现层，dist 为 bind mount **无需 rebuild**（与第 13/14 轮必须重建后端不同）。`dist/pool-wood-audio-preview.html` ① 区有旧空心木 ↔ 新厚实木单次 / 8 连击 A/B。未提交、未部署，真实音箱的厚实感与 8 连击密度待用户试听确认。详见 `docs/QA.md`（十五）、`docs/POOL-IMPACT-EFFECTS.md` §3.7 / §7 / §12。

**2026-11-10 最新一轮「所有游戏增加机器人难度」（覆盖上方所有当前值）**：用户要求四档「简单 / 一般 / 专业 / 地狱」，默认简单，选机器人时选择。新增 `dist/bot-difficulty.js`（4 档 + 中英标签 + 参数表 + `localStorage['joyflock.bot.level']` 跨游戏记忆 + 通用选择器）与 `dist/bot-difficulty.css`；三处 UI：桌面详情页「单机 · 电脑对战」下方、街机页 `#intro`、飞行棋座位区（bot 席位卡显示当前档）；新增 `dist/bot-difficulty-preview.html`（参数表 + 4 档决策 + 真实规则对局模拟）。门户 9 款游戏全覆盖，拼图 / 你画我猜为合作模式并明确提示难度不生效。AI 侧把 `bot(s)` 扩成 `bot(s, level, rng)`：`grid-rules.js` 邻域候选 + alpha-beta 前瞻、`chess-rules.js` 材料/中心评估 + minimax（根候选强制纳入一步将杀）、`pool.js` 遍历所有目标球×袋口取最短全路径、`snooker-duel.js` 按分值选目标、`bubbles-duel.js` 扫描步长 15/6/4/2、`cards.js` 保留后续可出牌数；飞行棋 `app.js` 的 `bestMove` 分档 + 撞机/被撞风险评估，且**仅 bot** 自动掷骰时用加权骰子（真人仍公平）。**简单** 58% 随机、不找胜不挡、±9° 抖动、骰子偏小点；**一般**与原版逐字节一致；**专业/地狱** 2/3 层前瞻、精确击球、骰子偏大点。`botTuning(undefined)===null` 保留旧路径，golden fixtures 与 168/168 parity 不变；物理 / 协议 / 53 格状态 / 回放帧 / Java 全未改。验证 `npm test` **285/285**（新增 13 项，另同步 2 个 vm 夹具）、Docker Java **101 通过 / 21 跳过**、真实对局模拟四子棋/五子棋地狱 vs 一般 **12:0**、井字棋完美档 12 平、CDP 实机三处 UI + 英文切换 + 跨页面共享选择 **0 运行时异常**。**当前全项目 186 处 `.js?v=` 统一 `20261110-drag2`**，需 Ctrl+F5；纯前端，dist 为 bind mount **无需 rebuild**。**边界**：在线快速匹配 30 秒补位与掉线托管的电脑走 Java `GridRules.bot(s)`，仍是原强度（等价「一般」），如需覆盖要另改房间状态与 Java parity 基线。未提交、未部署。详见 `docs/BOT-DIFFICULTY.md`、`docs/QA.md`（十六）。

**2026-11-10 最新一轮「台球背景音乐改成五首曲库、可选曲」（覆盖上方所有 BGM 当前值）**：用户「背景音乐不太喜欢，你做几个我选吧，适合台球的，玩游戏可以放松的音乐」。旧 `dist/table/pool-bgm.js` 只有一段硬编码 82 BPM lounge，已参数化为 `POOL_BGM_TRACKS` **5 首**：`tape` 68 BPM lo-fi（**新默认**）、`bossa` 96、`felt` 60 完全无鼓、`warm` 76 walking bass 爵士、`lounge` 原版保留可换回；全部 8 小节 D 小调族无缝循环、纯程序合成。共享 `VOICES` 音色 / `COMP` 节奏 / `bassStyle` / `drums` / `mix` 数据驱动。`finishLoop` 新增最后一小节余音跨循环点 1.2s（氛围曲加长钟）、`tanh(k·x)/k` 软饱和、整数周期 wow、**统一 RMS 0.052 响度匹配**（修复前 felt 只有 lounge 的 46%）、最后 2ms 边缘平滑（接缝跳变实测 **0**、五首 tail/whole 0.38–0.47）。播放器新增 `getPoolBgmTrack / setPoolBgmTrack / previewPoolBgmTrack`，选择写 `localStorage['joyflock.pool.bgm.track']`；`ensureGraph()` 用 `renderToken` 防竞态，切歌淡出旧源 0.35s 后 stop、新源淡入 0.8s，始终一个 AudioContext 不叠轨；`storage` 事件跨标签同步；♫ 圆钮**双击打开选曲页**、title 显示曲目名。新增 `dist/pool-bgm-select.html`（5 卡 + 异步波形 + 试听 / 设为默认），`pool-bgm-preview.html` 改为显示当前曲目。**验证**：`npm test` **287/287**（BGM 测试 6→8 项）、Docker Java **101 通过 / 21 跳过**（仅回归）、CDP 实机「试听 bossa 不写盘 → 设为默认 warm → 详情页 track=warm/playing=true → 进对局仍 playing=true」**0 异常**。物理 / 协议 / 53 格 / Java / golden / parity 168/168 未动；纯前端 **无需 rebuild**。当前全项目 **186 处 `.js?v=` 统一 `20261110-drag2`**，需 Ctrl+F5；**未提交、未部署**，五首的听感与音量平衡待用户试听定夺。详见 `docs/POOL-BGM.md`（当前准绳）、`docs/QA.md`（十七）、`docs/POOL-IMPACT-EFFECTS.md` §9 更新提示 / 时间线第 16 行 / 验收矩阵。

**2026-11-10 最新一轮「白手套出现得太早」（覆盖上方手套时序的当前值）**：用户「别人打完，球还没滚完就看到手了，应该轮到我后出现」。根因：`renderPool()` 在**回放开始前**就按最新权威状态设 `host._inHand` 并写 `.pool-note`，`paint()` 只看当前帧 `c[2]`，故回放第一帧就画手；`aimCellsFor()` 还把历史帧白球坐标替换成复位点，让白球在回放中被钉在原点。**只改 `dist/table/pool-view.js`**：`aimCellsFor()` 在 `!_can || _animating || _striking` 时保留历史帧；新增 `updateNote()` 并挂进 `update()`（动画中「球正在滚动…」、出杆/对手球杆各有文案、本方回合才显示摆球提示、对手回合「等待对手摆球」），画手条件收紧为 `!_animating && !_striking && !_opponentCue && _can && !over && c[2] && !_scratchVisible`；动画结束先 `_update()` 再 `paint()`，提示语与手套**同帧出现**。`commitMove` 以 `pending=true` 启动回放（`can=false`），`finally` 的 `render()` 在回放途中把 `_can` 刷新为 true 且不重启动画，结束时手正常出现（已实机验证）。顺带修掉「对手回合画手却不能拖」的旧问题。验证 `npm test` **288/288**（手套测试 8→9 项）、Docker Java **101 通过 / 21 跳过**（仅回归）、无头 Chrome 用真实 `renderPool` + 浏览器 rAF 跑完整 scratch 回放：动画中无 `.5` 手套、结束后出现、对手回合不出现、真实进入对局 **0 运行时异常**。物理 / 协议 / Java / parity 168/168 未动，纯前端无需 rebuild。**当前全项目 186 处 `.js?v=` 统一 `20261110-drag2`**，需 Ctrl+F5；**未提交、未部署**。边界：顶部 `#status` 的「X 的回合」仍按权威状态即时更新，不等回放。详见 `docs/QA.md`（十八）、`docs/POOL-IMPACT-EFFECTS.md` §10 更新提示 / 时间线第 17 行 / 验收矩阵。

**2026-11-10 最新一轮「台呢阻力再降低四分之一」（覆盖上方所有物理当前值）**：用户「阻力再降低个 4/1」，沿用第 14 轮被认可的 ×0.75 口径再做一次。每 8ms 标称损失 `0.00675 → 0.0050625`、保留率 `0.99325 → 0.9949375`，`dist/table/pool.js` 与 `backend/.../PoolRules.java` 同步改 `DAMP=Math.pow(.9949375,.25)`（每 2ms 子步 `0.9983082 → 0.9987320`），注释写明两次降幅；`STOP=.2` / `TOP_K` / `E_RAIL` / 旋转 / 袋口 / 落袋表现 / 音效 / 协议 / 53 格状态全未动。满力空台行程 **4137 → 4872**（约 +18%）。**这是第二次改物理常量**，golden fixtures 再次全量刷新：8 击球点 `[[4553,2131],[2037,598],[2370,3139],[2813,4468],[3077,2500],[3594,238],[3005,2892],[5422,2446]]`、行程窗口 `4780~4960`、follow/draw 改测第 35 力度 `[8834,5628,8955]`、空台 follow−draw 第 65 力度、库边 kick `[4928,2000]/[4928,3000]`、偏折阈值 `800→400`、4 处速度公式跟随常量；失效场景换力度/角度：侧旋落袋 `55→64`、薄接触 `31→30`、全力进袋 `2830→2900`、中力度上限 `60→55`、8 号球与分组 `60→50`、首次接触时刻断言 `<=`。**验证**：`npm test` **288/288**、Docker Java **101 通过 / 21 跳过**（PoolRulesTest 22/22）、**在线整局双客人 21 杆打到 OVER / 7069 回放帧 / 147 项字段** JS↔Java 逐项一致。**后端镜像已 `docker compose up -d --build backend` 重建重启**（Java 常量改动必须），8081 四容器 Up、页面/API 200、服务端 `pool.js` 含 `.9949375`。当前全项目 **186 处 `.js?v=` 统一 `20261110-drag2`**，需 Ctrl+F5；**未提交、未部署**。界限：球滚更久，袋内 8 连击/连锁音按更早的入袋速度标定，慢速贴唇球分支归属继续变化（「全力必触发其一」仍通过），实机是否过滑待确认。详见 `docs/QA.md`（十九）、`docs/POOL-IMPACT-EFFECTS.md` §11 更新提示 / 时间线第 18 行 / 验收矩阵、`docs/POOL-SPIN-PHYSICS-UPGRADE.md` §9.16。

**2026-11-10 最新一轮「泡泡按封面重做界面 + 去掉发射按钮 / 扩大区域 / 元素不变」（纯表现层）**：用户先给 `dist/assets/covers/bubbles.jpg` 要求用 Canvas 2D 按封面做界面，随后给实机截图要求「去掉下面的按钮，扩大区域，元素大小不变」。只改 `dist/table/bubbles.js`（重写渲染层）、`dist/table/bubbles-fine.css`（隐藏按钮 + 画布铺满），新增 `dist/bubbles-cover-preview.html`（独立验收页，不接入生产入口）。`bubbles-duel.js` / `grid-rules.js` / Java / 协议 / 规则常量全未改；`createBubbles(ui)` 接口与 `start/stop/refresh/applyBoard/state/reset` 返回值不变。

- **视觉**：程序化紫色星云（低分辨率 value-noise + 域扭曲 + screen 混合，连续色相插值消除早期版本的硬色块与同心环）、散景 / 星点 / 十字星芒；5 色虹彩透明玻璃球（彩色云雾 screen 叠加、霓虹描边、色散环、双高光与星芒，按设备比例缓存为离屏 sprite）；金属机械炮台（三脚架、渐细炮管、环箍、粉色伺服灯）；粉色发光珠串瞄准线；顶部玻璃比分条按舞台宽度绘制。全部为 Canvas 2D，未加载图片或 WebGL。
- **布局**：画布改为铺满宿主（`position:absolute; inset:0`），宿主 inline 设为 `position:relative; flex:1 1 auto; min-height:566px`。360×765 规则世界以**固定上限 `MAX_WORLD_SCALE=.74`** 居中绘制；`ResizeObserver` 仅在尺寸变化时重建位图与星云缓存。指针经 `point()` 反变换回规则坐标，命中与角度计算不变。`.arcade-controls` 与街机页 `footer` 用 CSS 隐藏，发射改由画布点击 / 方向键 / 空格完成（原本即已支持）。
- **验证**：`node --check` 通过；`npm test` **294/294**；无头 Chrome 实机渲染 `docs/verification/bubbles-cover-preview.png`（默认 560×640）与 `bubbles-cover-wide.png`（宽屏）；DOM 实测 `棋盘 5 行 / 43 球`；舞台宽度 380 → 705 时 `世界比例 0.74 / 球直径 27.5px` 两者完全相同，证明扩大区域未放大元素。`docs/verification/bubbles-array-crop.png` 为泡泡材质细节图。
- **边界**：封面为生成式插画，程序化 Canvas 无法逐像素复刻；当前炮台比封面小、泡泡阵列行数由规则固定为 5 行（封面为 6 行示意）、星云为程序纹理而非摄影质感。本轮只在预览页做了无头浏览器验收，**正式 `table/index.html?game=bubbles` 与联机房间未做实机点击验收**，需用户 Ctrl+F5 后确认。本批文件在编辑期间存在并行修改（版本号已由另一路统一为 `20261110-bubblestatus1`），本轮未改任何 `?v=` 引用以免覆盖他人改动。未提交、未部署。

**2026-11-10 最新一轮「机器人难度选择改成弹窗」（覆盖第（十六）轮的 UI 描述）**：用户截图圈出桌面详情页里常驻的四档方块，要求改成弹窗。`dist/bot-difficulty.js` 新增 `botDifficultyTriggerMarkup()` / `botDifficultyDialogMarkup()` / `bindBotDifficultyDialog()`：三处入口（详情页 `.launch-actions`、街机页 `#intro`、飞行棋座位区）只留一行「机器人难度 · 当前档 ›」触发按钮，四档带说明的卡片放进挂在 `<body>` 的原生 `<dialog class="bot-difficulty-dialog">`，点档即保存、刷新按钮、关闭并触发 `onChange`；另支持「完成」/ × / 点遮罩 / Esc 关闭，`storage` 事件跨标签同步。旧 `bindBotDifficulty()` 保留给 `bot-difficulty-preview.html` 继续用内联四档。CSS 用 `!important` 抵御详情页 `.table-home-theme:not([data-screen="play"]) button`（含 `:hover`，会给按钮加 `box-shadow:0 3px 0 #060a15`）和飞行棋 `body:has(#lobby) dialog` 的覆盖——实机截图发现未选中卡片样式被主题接管，已修。四档强弱、默认简单、`localStorage['joyflock.bot.level']`、各游戏 AI、物理、协议、53 格状态、Java、golden fixtures、parity 168/168 **全部未改**。**验证**：`npm test` **294/294**（新增 `tests/bot-difficulty-dialog.test.mjs` 6 项）、Docker Java **101 通过 / 21 跳过**（仅回归）、CDP 真实鼠标走通详情页 / 街机页 / 飞行棋页 / `locale=en` / **大厅 iframe**（用户截图实际场景）与进对局，两张截图目视无遮挡无溢出、**0 运行时异常**；8081 四容器 Up，页面 / JS / CSS / API 200。全项目 **188 处 `.js?v=` 与 4 处 `bot-difficulty.css?v=` 统一 `20261110-botmodal2`**，需 Ctrl+F5；纯前端 dist 为 bind mount **无需 rebuild**；**未提交、未部署**。边界：iframe 内遮罩只覆盖 iframe 不盖门户侧栏（原生 dialog 行为）。详见 `docs/BOT-DIFFICULTY.md` §7、`docs/QA.md`（二十一）、`docs/POOL-IMPACT-EFFECTS.md` 时间线第 19 行 / 验收矩阵。

**2026-11-10 最新一轮「先把背景音乐去掉」（覆盖上方所有 BGM 播放描述）**：用户试听 5 首曲库后仍不想要游戏里的背景音乐，「先」按**可恢复**处理，不删代码。只改 HTML：`dist/table/index.html` 移除唯一一行 `pool-bgm.js` 模块 script（原位置留注释指向 `docs/POOL-BGM.md`），台球 / 斯诺克详情页与对局页因此**不加载、不播放、不显示 ♫ 按钮**；`pool-bgm-preview.html` 与 `pool-bgm-select.html` 顶部加「游戏页已暂时停用」提示并把旧「进入详情页即播放」描述改掉。**全部保留**：`dist/table/pool-bgm.js`（5 首曲库 / 播放器 / 跨标签同步）、两个独立试听页、`tests/table-pool-bgm.test.mjs` 8 项测试；选曲页仍可逐首试听与设默认，选择继续写 `localStorage`。**恢复方法**：在 `table.js` 的 script 前加回 `<script type="module" src="./pool-bgm.js?v=<当时统一标记>"></script>` 一行，无需改其它文件，恢复后按上次保存的开关 / 曲目播放。**验证**：`npm test` **294/294**（未改 JS，仅回归）、CDP 实机详情页 / 对局页 / 大厅 iframe 三处 `script[src*=pool-bgm]=0`、`.pool-bgm-toggle=0`、模块资源请求 0，选曲页 5 卡试听正常（`playingName=慢拍磁带`）、两页提示正常、**0 运行时异常**；8081 四容器 Up、页面 / 模块 / API 200。本轮**未 bump `?v=`**（只删 HTML 一行，未改 JS/CSS 内容，无模块实例分裂风险），当前仍为 `20261110-botmodal2`，浏览器需 **Ctrl+F5**；物理 / 协议 / Java / golden / parity 168/168 未动，纯前端**无需 rebuild**；**未提交、未部署**。详见 `docs/POOL-BGM.md` 顶部、`docs/QA.md`（二十二）、`docs/POOL-IMPACT-EFFECTS.md` §9 最新状态提示 / 时间线第 20 行 / 验收矩阵。

**2026-11-10 19:55 修正「泡泡界面按截图标注的边界」（覆盖上一轮泡泡段的布局描述）**：用户指出上一条回复把「边界」误解成验收说明——他在实机截图里已用红框画出目标区域。像素分析：大红框 `x 362..1122 / y 57..1060`（1920×1076 截图）= **760×1003，宽/高 0.758**，是要扩到的边界；小红框 `x 687..795 / y 1018..1060` 是要删的「发射」按钮。上一轮把画布设成铺满宿主，正式页实测 **1292×843**，宽度越界约 1.7 倍；`MAX_WORLD_SCALE=.74` 也把泡泡缩到截图原始尺寸的约 59%。

- **修正（仍只动表现层）**：`dist/table/bubbles.js` 新增 `BOUNDARY_RATIO=760/1003`；`layout()` 改为按宿主高度 × 0.758 取画布宽并居中，宿主变宽只在两侧留页面背景；`MAX_WORLD_SCALE=.74 → 1.25`（对齐截图里 451px 画布 / 360 世界单位 = 1.253 的原始元素像素）；移除会撑高矮窗口的 `minHeight:566px`；位图与 `point()` 反变换仍以 canvas 自身 rect 为基准，正式页与独立街机页几何一致。`dist/table/bubbles-fine.css` 加 `max-width:76dvh` 作首帧回退，隐藏按钮的规则不变。`dist/bubbles-cover-preview.html` 改为按红框比例验收：滑块语义改为「宿主面板宽度」，底部显示宿主 / 画布 / 宽高比 / 世界比例 / 球直径。
- **验证**：`node --check` 通过、`npm test` **294/294**；无头 Chrome 在**正式 `table/index.html?game=bubbles` 的 play 屏**（同源 iframe 自动点「单机 · 电脑对战」）实测 canvas **639×843（比 0.758）**、居中 `x=336`、`.arcade-controls` 为 `display:none`、无 footer 按钮，截图 `docs/verification/bubbles-boundary-play.png`；预览页宿主宽 513 / 620 / 893 三次加载均为 **画布 450×594（比 0.758）/ 世界比例 0.78 / 球直径 28.9px**，证明不越界且元素尺寸不变。按 1920×1080 真实窗口等比推算画布约 **743×980、中心 x≈735**，与红框 760×1003 / 中心 742 基本重合。`bubbles-cover-preview.png`、`bubbles-cover-wide.png`、`bubbles-array-crop.png` 已用新布局刷新。
- **边界**：`server.mjs` 静态资源为 `Cache-Control:no-store`，故**未 bump 任何 `?v=`**（也不改并行编辑中的版本链）；红框是宽高比约束而非固定 760px 绝对宽，窄 / 矮视口会等比收敛。规则 / 协议 / 53 格状态 / Java / golden / parity 全未动，纯前端 dist 为 bind mount **无需 rebuild**；**未提交、未部署**，联机房间仍未做实机点击验收。

**2026-11-10 20:15 最新一轮「泡泡两侧也要球 + 反射墙」（玩法级改动，覆盖上一轮 9 列棋盘的隐含假设）**：用户新截图用两个红框圈出球阵左右空白（`x 127..345` / `x 799..1028`，1266×1221 截图），要求「球，两边也要，还有反射墙」。装饰球会与权威状态脱节，故按**真加宽棋盘**实施；规则层原本就有反弹面 `x=R` / `x=W-R`，只是从未画出来。

- **规则（前后端同步）**：`dist/table/bubbles-duel.js` 新增 `COLS=18`，`W=COLS*R*2=720`（原 360），GRID 每行 `18/17` 列（原 `9/8`），`N 153→315`、`cells 169→331`、初始 5 行球 `43→88`；`R=20 / ROW / H / ANGLE_MAX / MAX_MOVES` 全未改。`backend/.../BubbleRules.java` 同步 `W=COLS*R*2`、`width=COLS-1 / COLS`，`S` 改为 `ROWS*(COLS*2-1)/2=315` 计算值而非硬编码；`BubbleRulesTest.java` 所有硬编码索引（`169/167/162/161/156/153/43` 等）改为 `S+offset` 表达式，初始球数期望 43→88。
- **表现层**：`dist/table/bubbles.js` 新增 `walls()`（底层紫色光晕 + 顶部天花板导轨）与 `wallRails()`（顶层霓虹导轨、能量刻度、飞行球靠近时的脉冲高亮），画在世界坐标 `x=0 / x=W`，与规则反弹面重合；导轨画在球之上但仅 6 单位宽，不遮挡最外侧球。`bubbles-cover-preview.html` 默认宿主 900×1151，`info()` 世界宽按 720 计算并显示「18 列 / 左右反射墙」。
- **验证**：`node --check`、`npm test` **294/294**；`docker compose -f deploy/compose.yaml up -d --build backend` → `mvn -B verify` **BUILD SUCCESS**（Java 全量测试）、容器 `deploy-backend-1` 已重建启动。前后端 parity：固定种子 `20261109` + 8 杆序列的 `bubbles-parity:` 行 **798 字符逐字符一致**（JS `JSON.stringify` 与 Java `Arrays.toString` 去空格后）。反弹覆盖：角度 `0/140/148` 落 `col 0 (x=40)`、`108` 落 `col 15 (x=640)`，证明两侧可达。正式 `table/index.html?game=bubbles` play 屏（1500×1372 窗口 / 左面板 874 宽）DOM 实测 canvas **860×1135（比 0.758）/ 位图 860×1135 / 世界比例 1.194 / 球直径 44.4px**，与用户原截图球尺寸一致；`.arcade-controls` 仍 `display:none`。截图 `docs/verification/bubbles-walls-play.png`（正式页）、`bubbles-walls-preview.png`（预览页）、`bubbles-walls-crop.png`（细节），`bubbles-cover-*.png` / `bubbles-array-crop.png` 已刷新。
- **边界**：这是**玩法变化**（列数与开局球数翻倍、联机状态数组变长），不是纯视觉；**后端已本地重建**，若只想要视觉补满可把 `COLS` 改回 9 并同步 Java。窄窗口（左面板宽 < `0.758×高`）时画布受宽度限制、`worldScale` 等比缩小，与旧版按 `vh` 缩放的行为一致。`server.mjs` 为 `Cache-Control:no-store`，未 bump `?v=`；**未提交、未部署到线上**，联机房间尚未做双人实机对局验收。详见 `docs/QA.md`（二十四）。

**2026-11-10 最新一轮「白手套重新用 Canvas 2D 绘制」（覆盖第（十三）轮的手套造型与层级）**：用户截图「这个手也太丑了吧，用 Canvas 2D 绘制一个」。旧 `pool-glove.js` 其实已是 Canvas 2D，但四指是 `lineWidth=9` 的平行粗 stroke（像四根圆柱）、袖口硬矩形、手掌尖角多边形，无体积感且盖住白球。**重写 `dist/table/pool-glove.js`**（导出 API 不变）：连续手背剪影包住四指根部、四根依次变短变细的双段贝塞尔弯指、托球拇指、圆润带罗纹袖口，加左上→右下体积渐变、柔和描边、接触阴影、指节褶皱、指尖高光、虚线缝线与手背筋线。**层级修正**：`dist/table/pool-view.js` 把 `drawGlovedHand` 移到球循环**之前**，白球改画在手套之上，100% 拖动时也完整清晰；`pool-cue-in-hand-preview.html` 同步。新增 `dist/pool-glove-preview.html`（6.2× 特写、50%/100%、球杆开关）与 `tests/table-pool-cue-in-hand.test.mjs` 第 7 项（≥20 次贝塞尔 / 渐变 / 缝线 / 接触阴影断言）。无头 Chrome **4 版截图目视迭代**：手背误看成第二颗球 → 白球被盖住 → 改层级但拇指成白环 → 收窄手背、拉开指缝、拇指不回钩、缝线移到外缘定稿；截图 `docs/verification/glove-redraw-{idle,drag,in-game}.png`。**验证**：`npm test` **295/295**（手套 9→10 项）、Docker Java **101 通过 / 21 跳过**（仅回归）、CDP 预览页 5 状态卡 + 主画布像素确认路径渲染 + 50%↔100%/球杆开关 + 三态预览页正常、**0 运行时异常**；8081 四容器 Up、页面/模块/API 200。物理 / 协议 / 53 格状态 / Java / golden / parity 168/168 未动，纯前端**无需 rebuild**；全项目 **194 处 `.js?v=` 与 4 处 CSS 标记统一 `20261110-glove2`**，需 Ctrl+F5；**未提交、未部署**。详见 `docs/QA.md`（二十五）、`docs/POOL-IMPACT-EFFECTS.md` §10 更新提示 / 时间线第 21 行 / 验收矩阵。

**2026-11-10 20:35 发射器按封面重铸（纯表现层，规则/协议/Java 全未动）**：用户又给一张封面局部截图，红框 `x 109..238 / y 213..308`（441×385）圈出封面炮台，要求「发射器可以整一样的吗」。封面放大核对：短粗银紫多棱炮管、炮口厚 C 形金属杯里嵌一颗粉紫发光球、左侧大齿轮带粉色灯芯 + 小副齿轮、右侧斜支撑臂、三脚底座；旧版是细长锥形炮管 + 空炮口 + 单个侧伺服，差距明显。

- **`dist/table/bubbles.js` 重写 `launcher(angle)`**：把炮口杯中心放在规则发射点 `(W/2, LAUNCH_Y)`，使 `drawWorld()` 之后画的待发球正好嵌在金属杯里——视觉与物理发射点严格重合，不需要改 `bubbles-duel.js` 的 `step()` 起点。新造型：`chrome()` 多段横向金属渐变做铬银/深紫机壳；5 条纵向棱 + 紫色能量窗 + 上下环箍构成短粗炮管；`gear()` 画带齿/同心环/铆钉/粉色灯芯的大齿轮与小副齿轮；右侧液压支撑臂 + 紧凑三脚底盘 + 旋转关节；C 形厚杯（下半 `0.03π..0.97π`，内径 18.2 < 球半径 18.6）托住球下半、球上半靠 orb 自身霓虹描边露出；杯缘齿块、倒角高光、内壁暗面；底部紫色地面辉光。**整机统一用 `spin=angle+π/2` 刚性旋转**（初版让机身用 `spin*.3+.26` 衰减旋转，斜射时齿轮/底座与炮管脱节呈"卫星环"，已改为刚体），默认向上时机身自带左右不对称机械感。
- 待发球在 `orb()` 之后叠一层 `screen` 混合的粉紫镜面光泽（`rgba(255,232,255,.30)` → `rgba(255,108,232,.12)`），使 5 种玩法颜色都带封面的粉紫感且不改颜色辨识；`NEXT` 文字从 `ny-19` 上移到 `ny-38`，避免被横向警戒虚线划过。
- `dist/bubbles-cover-preview.html` 底部信息行追加「封面同款金属炮台」。
- **验证**：`node --check` 通过、`npm test` **295/295**；无头 Chrome 实机渲染预览页、**正式 `table/index.html?game=bubbles` 单机对局页**（同源 iframe 自动点 `#computer`），以及按 ArrowLeft/Right 各 9 次模拟的 ±41° 斜射三角度，整机无脱节、球始终嵌在杯内。截图 `docs/verification/bubbles-launcher-play.png`（正式页）、`bubbles-launcher-preview.png`、`bubbles-launcher-crop.png`（炮台细节）、`bubbles-launcher-aim-9-0-crop.png` / `-0-9-crop.png`（斜射）、`bubbles-cover-launcher-crop.png`（封面参考放大对照）；`bubbles-walls-*.png` / `bubbles-cover-*.png` / `bubbles-boundary-play.png` / `bubbles-array-crop.png` 已全部刷新为新炮台。
- **边界**：纯 Canvas 2D 程序绘制，无图片贴图；封面是生成式 3D 插画，无法逐像素复刻（金属更亮、少写实反射）。炮台与球的**相对比例**已与封面一致（炮台宽约 2.4×球径），但画布已是 18 列加宽后的尺寸，炮台相对整幅画面仍比封面小——若要按封面占比放大，需改球尺寸或画布宽度，会牵动玩法与红框边界。`server.mjs` 为 `Cache-Control:no-store`，未 bump 任何 `?v=`；**未提交、未部署**，联机双人实机对局仍未验收。详见 `docs/QA.md`（二十五）。


**2026-11-10 20:42 补记「暗边框 + 球左右填满 + 上面加多几行」（上一轮被限流打断，本轮补齐验证与记录）**：用户截图用红框标出发亮的顶部横条与左右竖条，要求「这个暗外面的边框来就可以了，球左右两边填满，上面加多几行」。18 列棋盘此前已铺满全宽，缺的是**开局行数**与**边框亮度**。

- **规则（前后端同步）**：`dist/table/bubbles-duel.js` 新增 `START_ROWS=8`（原硬编码 `g.r>=5` → `g.r>=START_ROWS`），开局球 `88 → 140`（4 行 18 + 4 行 17）；`backend/.../BubbleRules.java` 同步 `START_ROWS=8` 与 `if(g.r>=START_ROWS)break;`；`BubbleRulesTest.java` 改 `FILLED=4*COLS+4*(COLS-1)=140`、测试名改 `initialBoardIsEightRows...`。`COLS/W/N/TOTAL/H/MAX_MOVES` 全未动。
- **表现层**：`dist/table/bubbles.js` 的 `walls()` / `wallRails()` 从霓虹发光改为低对比暗紫细线（描边 `rgba(146,106,196,.20)`、侧栏 2 单位暗边、刻度 `.13~.19` alpha、无 shadowBlur），仍精确落在规则反弹面 `x=0 / x=W`；`dist/table/bubbles-fine.css` 画布外框改 `1px solid rgba(126,92,174,.30)` + 深色投影（原 `rgba(214,170,255,.58)` + 紫色泛光）；本轮同步把 `dist/bubbles-cover-preview.html` 内联 `.stage canvas` 也改成同一暗框，并加 `?over=1` 快进到结束态的验收开关。
- **验证**：`node --check` 通过；`npm test` **299/299**（含并行新增的 4 项首页快速匹配测试）；`docker compose -f deploy/compose.yaml up -d --build backend` → `mvn -B verify` **BUILD SUCCESS**，`deploy-backend-1` 已重建启动；**8 行开局的前后端 parity 重新比对**：固定种子 `20261109` + 8 杆序列的 `bubbles-parity:` 行 **805 字符逐字符一致**（JS `JSON.stringify` 与 Java `Arrays.toString` 去空格后）；无头 Chrome 实测正式页画布计算样式 `border:1px solid rgba(126,92,174,.3)`、`box-shadow` 为纯深色，截图 `docs/verification/bubbles-rows-preview.png` 及本轮刷新的 `bubbles-cover-*.png` / `bubbles-walls-*.png` / `bubbles-launcher-*.png` / `bubbles-boundary-play.png`。
- **边界**：这是**开局状态变化**（联机起始球数 88→140），纯前端与后端规则必须同版；后端仅本地重建，`Cache-Control:no-store` 未 bump `?v=`，**未提交、未部署上线**。

**2026-11-10 21:05 「弹窗，跟其他的做一样」——泡泡结算统一为共享弹窗**：用户截图（1920×901）红框 `x 604..887 / y 490..604` 圈住画布里那张深紫结算卡「玩家2 获胜！1580 : 3480」，要求与其他游戏一致。核对发现 `pool-shell.js` 的共享结算弹窗**早已接入泡泡**（`syncPresentation() → updateGridResult()`，侧栏「查看本局结算」按钮即其重开入口），冲突来自 `bubbles.js` 另画的一张 `resultCard()`——关掉共享弹窗后它仍留在画布上，样式和交互都与平台不统一。

- **改动**：`dist/table/bubbles.js` 删除 `resultCard()` 函数及 `draw()` 中 `if(display?.over)resultCard(stageW,stageH)`，结算只走共享弹窗；`dist/table/table.js` 新增 `import {bubblesScore}`，在 `syncPresentation()` 的 `options` 里加 `scores:isBubbles?bubblesScore(board.cells):null`；`dist/table/pool-shell.js` 在 `updateResult()` 的玩家行里，当 `options.scores` 存在时补一行「XXXX 分」（英文 `XXXX pts`），把原画布卡的比分信息迁进共享弹窗，其他游戏不受影响（无 scores 时不渲染）；`dist/bubbles-cover-preview.html` 加 `?over=1` 供验证结束态不再有画布卡。
- **验证**：`node --check` 三个模块通过、`npm test` **299/299**。无头 Chrome 在**正式 `table/index.html?game=bubbles` 的 play 屏**用同一模块实例驱动共享弹窗：`dialog#pool-result[open]=true`、`outcome=loss`、`title=本局失利`、玩家行 `zhiyuanC / 1580 分`、`电脑 / 3480 分 / 胜方`、按钮 `× / 再玩一局 / 返回游戏页 / 返回首页`，卡片实测 `446×484`；截图 `docs/verification/bubbles-shared-result-dialog.png`、`bubbles-shared-result-crop.png`。预览页 `?over=1` 截图 `bubbles-no-canvas-result.png` 确认中央**不再有深色结算卡**，只剩球阵、炮台与「已结束」比分条。参考放大图 `bubbles-popup-reference-crop.png`（用户红框）与侧栏 `bubbles-popup-sidebar-crop.png` 已存证。
- **边界**：改动只涉及结算呈现，**规则 / 协议 / Java / 棋盘状态全未动，后端无需重建**；独立街机页 `table/arcade.html` 仍用其自带的简易 `<dialog>`（与该页斯诺克一致），本次未改；`server.mjs` 为 `Cache-Control:no-store`，未 bump 任何 `?v=`，Ctrl+F5 即可；无头浏览器因虚拟时间冻结 `Date.now()` 未能自动打完 24 杆，共享弹窗由同一 `pool-shell.js` 模块实例驱动验证，**完整 24 杆真人/联机实机对局仍未验收**；代码**未提交、未部署**。

**2026-11-10 21:32 「长度加 50%」——泡泡瞄准线延长**：用户红圈圈住斜射的粉色珠串瞄准线，末端落点小圈悬在球阵下方半空。按「长度 +50%」落地：`dist/table/bubbles.js` 的预览轨迹 `32×13=416` → `AIM_STEPS=48 ×13=624` 世界单位，珠串淡出与珠径按步数归一化以保持密度与渐隐；折线改独立 `path[]`，反射时插入精确墙面交点，避免长线在反弹处折角错位；`dist/bubbles-cover-preview.html` 新增 QA 参数 `?aim=<-179..-1>` 固定角度截图。**命中球阵 / 到顶仍提前收尾**，所以 -124° 斜射的实际可见长度约 +15%（落点圈从悬空变为贴住球阵底），浅角度 -158° 才看得到完整的 +50% 反射段。验证 `node --check`、`npm test` **299/299**，无头 Chrome 四张同尺寸截图 `docs/verification/bubbles-aim-{short,long}-124.png`、`bubbles-aim-long-90.png`、`bubbles-aim-long-bounce.png`（短版为临时把常量改回 32 的对照，已恢复 48）。纯表现层，规则 / Java / 后端未动，`no-store` 未 bump `?v=`，**未提交、未部署**；详见 `docs/QA.md` 21:32 段。

**2026-11-10 21:44 「全屏等比例扩大，别增加别的东西」**：用户对照门户内页与全屏/独立页两张截图，要求全屏只等比放大、不新增元素。CDP 实测发现 `dist/table/bubbles-fine.css` 遗留的 `max-width:76dvh` 会覆盖 `layout()` 按 host 高度 ×0.758 算出的 inline 宽度（门户 `352px` 被压到 `275.9px`、比例 0.593；独立页 `346px` 被压到 `307.8px`、比例 0.674），位图被水平压窄、球不是正圆。**只把该上限改成 `max-width:none`**，其余一行未加：球阵 / 炮台 / 瞄准线 / 侧栏 / 规则 / 后端全部照旧，全屏时由 JS 按 760:1003 随宿主高度等比放大，左右留白是保持红框比例的必然结果。复测两页 CSS 宽度与 bitmap 一致、比例均 **0.757**，`npm test` **299/299**，截图 `docs/verification/bubbles-geo-{portal,standalone}.png`。`no-store` 未 bump `?v=`，**未提交、未部署**；若「别增加别的东西」另指撤回 21:32 的瞄准线延长或隐藏全屏顶部工具条，需用户确认。详见 `docs/QA.md` 21:44 段。

**2026-11-10 23:08 「里面为什么这么多线，把没用的线去掉」**：用户红框圈出球阵上方横条、炮台上方两条横贯线。定位为 `dist/table/bubbles.js` 的三类纯装饰横线：`walls()` 的闭合矩形上/下边 + 天花板发光条、`limitLine()` 的紫色渐变警戒虚线（`wallRails()` 本来只有竖线）。**全部删除**：移除 `limitLine()` 与 `draw()` 调用、import 去掉 `LIMIT`，`walls()` 只保留左右反射墙的竖线/渐变/刻度；没有新增任何元素。保留左右反射墙、CSS 暗外框、背景圆角外框、顶部比分条、NEXT 球托盘、瞄准珠串、球阵与炮台。注意 `LIMIT` 在 `bubbles-duel.js` 仍用于 danger / 下压天花板判定，**规则未改**，只是不再画视觉线。`node --check` 通过、`npm test` 复跑 **350/350**（首次 345 中 1 项为并行写入测试文件时的偶发失败）；无头 Chrome 截图 `docs/verification/bubbles-no-lines.png` 确认三条横线消失、竖墙仍在，改前对照 `bubbles-aim-long-90.png`。`no-store` 未 bump `?v=`，**未提交、未部署**。详见 `docs/QA.md` 23:08 段。

**2026-11-10 21:47 「首页悬停图标一直出流星雨」**：用户红框圈住页眉「✦ JoyFlock」标志，问悬停能否持续出流星雨。`dist/site-shooting-star.js` 在原有「偶发阵雨 + 悬停提前一阵」之外新增 hold 持续模式：`HOLD_HOT='.game-card,.topbar .brand'`，指针进入图标即每 200–360ms 发一颗（live 上限 10、每 7 颗换方向），离开图标 / 窗口失焦 / 进入对局立即停止新发射，在飞流星自然播完；图标间滑动不重启，普通控件仍是单阵 + 20s 冷却，定时阵雨在 hold 期间挂起。`?v=` 从 `20261110-glove2` 统一到 **`20261110-meteorhold1`**（18 个 HTML 各 1 处）。验证 `npm test` **304/304**（新增 `tests/site-shooting-star-hold.test.mjs` 5 项）、真实 Chrome CDP 悬停品牌 2.6s 连续 9 颗 / 离开后不再增长 / 悬停封面重新起流 / 0 运行时异常，截图 `docs/verification/home-meteor-hold.png`。纯表现层，规则 / Java / 后端未动，`no-store` 下 Ctrl+F5 即可，**未提交、未部署**；「一直」按「悬停期间」实现，如需「触发后永久不停」需另行确认。详见 `docs/QA.md` 21:47 段。

**2026-11-10 21:55 「Play now 居中并略微放大」**：用户红框圈住首页第一张整卡与蓝色「Play now」胶囊。CDP 定位到按钮只居中于 `.card-art`，相对整卡（含 54px 黑色标题条）偏上 **27px**。只改 `dist/portal/portal-editorial.css`：`#home .cards` 增 `--card-caption-half:27px`，`.card-label` 的 `top` 改 `calc(50% + var(--card-caption-half,27px))`（`left:50%` + `translate(-50%,-50%)` 不变）；尺寸 `min-width 118→128px`、`padding 9/18→10/20px`、`font 13→14px`，≤520px 断点同步 `104→112px`、`8/14→9/16px`、`12→13px`。`dist/portal/index.html` 的 CSS 版本 `20261110-ctaink1 → 20261110-ctacenter1`（全站唯一引用）。验证 `npm test` **306/306**、真实 Chrome 五组视口/中英文全部 `deltaCardCenter=0`、按钮仍在封面内且不压标题条、0 异常，截图 `docs/verification/home-playnow-{before,center,center-zh,redbox-reference}.png`。390px 的横向溢出来自页眉 `.top-actions`（既有问题，非本轮）。纯 CSS，`no-store` 下 Ctrl+F5 即可，**未提交、未部署**。详见 `docs/QA.md` 21:55 段。

**2026-11-10 22:05 五子棋棋盘改 Canvas 2D（覆盖 2026-11-08/09 的 CSS 网格方案）**：用户重发封面图标与门户全屏截图，红框指出上/左/右边缘只有半格，要求「按图标风格用 Canvas 2D 绘制」。这不是回归：旧方案是 225 个 DOM 格 + 每格中心画渐变线，最外线到木框必然半格且无闭合边界；11-09 只把棋子对齐到交点，未消除半格。

- **渲染**：新模块 `dist/table/gomoku-view.js`，几何常量 `GOMOKU_SIZE=15 / LINES=17 / INSET=.082`。17×17 直线围出 16×16 个完整封闭方格，最外两条线就是边界；可落子点是内侧 15×15 交点（`point(row,col)=line(col+1)`），所以「棋在线上」与「边缘方格完整」同时成立。木框为固定种子（20261110）程序化木纹 + 斜面 + 双层圆角凹槽 + 投影；棋子为球面渐变 + 镜面高光 + 边缘反光 + 接触阴影，最后一步金色光环，悬停圆形半透明预览，键盘焦点虚线环；四角淡青绿/金细线呼应封面丝带。无贴图、无透视变换。
- **DOM 兼容**：`renderGomoku()` 在 `#board` 里放 1 个 `.gomoku-canvas` + 1 个 `.gomoku-hits`（225 个透明 `<button data-position>`），命中层 `left:10.8125% / size:78.375%` 与 `GOMOKU_HIT_LEFT / GOMOKU_HIT_SIZE` 一一对应。`table.js` 原点击委托、`grid-rules`、房间轮询、aria 文案、键盘 Tab 全部保留；`last` 由权威 `cells` 数组差分推断（规则层无 lastMove 字段），也接受显式 `options.last`。`render()` 每次调用只更新按钮属性 + 按 `signature()` 去重重绘，`ResizeObserver` 处理显示/尺寸变化，`devicePixelRatio` 上限 2。
- **样式**：`gomoku-board.css` 顶部整段重写为 canvas 容器（`.board.gomoku{display:block;aspect-ratio:1;padding:0;border:0}`），用 `!important` 中和 table.css 的渐变网格、CSS 星位/棋子/hover 方块；后半段深色侧栏与 toast 规则一字未动。`table.js` 加一条 `else if(game==='gomoku')renderGomoku(...)`；`index.html` CSS 版本 `20261109-gomoku3 → 20261110-gomokucanvas1`。
- **交付**：`dist/table/gomoku-canvas-preview.html`（空盘/封面示例/对局中、光环与悬停开关、几何信息行）、`tests/gomoku-view.test.mjs`（17 线闭合/交点映射、命中层百分比与 CSS 常量一致、table.js 接入断言）3 项。
- **验证**：`node --check`、`npm test` **313/313**（含并行会话新增用例，复跑通过）；CDP 像素扫描 17 横 17 竖线全在（含两条边界，最小明度差 45.4/75.2）；正式页 1600×1000 中心命中 `data-position=112`、真实鼠标落子与电脑应手正常、悬停无方形残影；5 视口 + 门户 iframe + 英文 + 联机双上下文好友房全部 0 异常；其余 8 个游戏 DOM 未受影响。截图 `docs/verification/gomoku-canvas-{empty,cover,midgame,play,hover,portal,online}.png`。
- **边界**：纯表现层，规则/协议/Java/后端未动，无需 rebuild；生成式 3D 斜视封面无法逐像素复刻；`no-store` 仅 bump CSS 版本；联机只验了单步同步，未跑完整对局；**未提交、未部署**。详见 `docs/QA.md` 22:05 段。

## 2026-11-10 22:13 机器人难度触发按钮改为首帧静态渲染

- **需求**：「机器人难度 地狱 ›」按钮不要等页面渲染完再冒出来（用户截图为门户内嵌五子棋详情页）。
- **根因**：`#bot-difficulty` 原本是空 div，按钮由 ES module 加载后的 `host.innerHTML=` 插入。
- **改动**：三个宿主（`dist/table/index.html` + `dist/table/arcade.html` + `dist/index.html`）写入完整静态 trigger 骨架；新增同步脚本 `dist/bot-difficulty-boot.js` 在 HTML 解析阶段按 localStorage + 语言对齐「当前档位」文字；`dist/bot-difficulty.js` 的 `paintTrigger()` 复用已有节点、只更新文本，不再重建 DOM；10 处 `bot-difficulty.js?v=` → `20261110-firstframe1`。难度逻辑本身、存储键、弹窗交互一律未动。
- **验证**：新增 4 项首帧测试、`npm test` **313/313**；CDP 拦截模块后首帧按钮已在且显示 Hell / 地狱，放开模块后 rect / 文字 / title 完全一致，两帧截图仅 134/1,017,520 像素差异；台球 / 街机 / 飞行棋三宿主中英文 0 异常。截图 `docs/verification/bot-difficulty-first-frame*.png`。
- **边界**：纯渲染时机改动，规则 / Java / 后端未动，无需 rebuild；弹窗本体仍由模块创建（不可见）；`no-store` 下 Ctrl+F5 即可；**未提交、未部署**。详见 `docs/QA.md` 22:13 段。

## 会员与支持入口移到页脚（22:24）
- 用户要求把首页页眉红框的「会员」（`/membership.html`）放到页脚。5 个 shell 页（portal + membership / terms / privacy / contact）的 `<nav>` 删掉该链接，`<footer>` 链接组首位加双语「会员与支持 / Membership & support」。
- `dist/site-chrome.css`：单链接 nav 会被旧的 `a:last-child{width:136px}` 拉宽，改为 `a{width:96px}` + `a:nth-child(2){width:136px}`（920 / 600px 断点同步为 88 / 126、72 / 104）；footer div 加 `flex-wrap:wrap`；`?v=` 5 处 → `20261110-footermembership1`。
- **验证**：新增 `tests/site-membership-footer.test.mjs` 5 项全过；CDP 七组视口 `navCount=1`、页脚链接可见、无横向溢出、点击落地会员页、0 异常；截图 `docs/verification/membership-footer-*.png`。
- **边界**：只搬入口；飞行棋主页 `.legal-links` 与游戏内工具栏「会员」快捷入口保留（游戏页隐藏页脚）；`membership.html` 的 nav 不再有 active 高亮；规则 / Java / 后端未动；**未提交、未部署**。详见 `docs/QA.md` 22:24 段。

- **2026-11-10 22:25 「按钮怎么不一样？」——结算 / 退出按钮统一**：用户截图红框内「查看本局结算」比「退出对局」窄 24px、矮 8px。根因是 `pool-shell.js` 注入的 reopen 按钮带台球皮肤私有规则 `[data-screen="play"] .pool-result-open`（34px / 圆角 10px / 12px 外边距 / 金色），而 `#leave-play.quiet` 走通用侧栏按钮（42px / 圆角 12px / 满宽）；共享结算弹窗推广到全部棋类后这条规则没跟随。颜色本就相同，差异纯在尺寸形状。
- **改动**：`createResult()` 让 reopen 复用 `$('leave-play').className`（`quiet pool-leave`），删 `pool-shell.css` 私有外观规则（保留 `:focus-visible` 金色环）；`table.js` import bump `?v=20261110-buttons1`。点击 / hidden / 插入位置 / 弹窗逻辑零改动。
- **验证**：新增 `tests/result-buttons.test.mjs` 3 项、`npm test` **321/321**；CDP 10 个游戏 + 2 视口两按钮 computed style 与尺寸全等、0 异常；截图 `docs/verification/buttons-unified-*.png` 与 `buttons-{before-user,after-gomoku}.png`。
- **边界**：纯 CSS / 类名；工作区存在并发改动（资源版本号 `fourcoin1`、会员页脚），本轮沿用其现值未覆盖；**未提交、未部署**。详见 `docs/QA.md` 22:25 段。

## 四子棋待落 / 已落棋子外观统一（补记）
- 用户问「为什么图形上面是一个样子，掉下来变样子了」：上方待落黄球有同心圆内环 + 白色外圈 + 重投影，落到棋盘后变成纯渐变圆片；旁边半透明虚线球是 `four-drop-ghost` 落点预览，属设计内状态。
- **根因**：两套 DOM。已落棋子 `.cell[data-value]` 的 `::before` 内环规则（`pool-shell.css`）从未生效——`table.css` 的 `content:''` 只写在 `.gomoku .cell[data-value]:before` 下，Chrome computed `content:none` → 伪元素不生成；而 `four-drop.js` 的 `.four-drop-marker i::after` 有 `content:''`，内环只画在待落棋子上。marker 还多带 `0 0 0 3px` 白圈与 `0 10px 22px` 深投影。
- **改动**：`pool-shell.css` 新增 `--four-coin-shadow` 供已落棋子与 classic marker 共用；新增 `body.connect-four-game:not(.four-themed) .four-drop-marker i::after{content:none}` 去掉内环，并把 marker 阴影对齐已落棋子。主题皮肤（`.four-themed`）的脸谱 `::after` / `::before` 与悬浮阴影保持原样。`index.html`、`pool-result-preview.html` 的 `?v=` → `20261110-fourcoin1`。
- **反向开关**：想让全盘棋子都带内环，就给 `.cell[data-value="1|2"]::before` 补 `content:'';position:absolute` 并删掉两条 classic-only marker 规则，无需动 JS。
- **验证**：新增 `tests/four-coin-consistency.test.mjs` 4 项全过；headless computed style 对照（`::after` 由 `""` → `none`，背景 / 阴影 / 圆角三者全等）；CDP 正式对局页 classic `sameBackground/sameShadow=true`、halloween 脸谱仍在、0 异常；截图 `docs/verification/four-coin-*.png`。`npm test` **324/326**，2 个失败来自并行未提交的房间邀请 UI 改动，与本轮无关。
- **边界**：纯 CSS，规则 / 动画 JS / Java / 后端未动；`no-store` + `?v=` bump，Ctrl+F5 即可；未提交、未部署。详见 `docs/QA.md`「四子棋『上面的棋子掉下来变样子』」段。

## 游戏卡片悬停封面模糊（22:36）
- 用户要求鼠标移到游戏卡上时封面图做轻度模糊。做法是在现有 hover 遮罩 `#home .cards .card-art::after`（z-index:1，按钮 z-index:2）加 `backdrop-filter:blur(3px)` + `-webkit-` 前缀；`<img>` 的 transform / 蓝色卡 drop-shadow 全部不动。这样封面与蓝色卡的 CSS 天空一起柔化，按钮与标题条保持锐利。`portal-editorial.css?v=20261110-ctacenter1 → 20261110-hoverblur1`。
- **验证**：新增 `tests/site-card-hover-blur.test.mjs` 4 项全过；CDP 控制变量实验（同 hover 关闭 backdrop-filter 作对照）封面梯度降到 41.6% / 54%，按钮区域保持 95.2%；reduced motion 立即生效；0 异常。截图 `docs/verification/card-hover-blur-*.png`。
- **边界**：纯 CSS 表现层，规则 / Java / 后端未动；触屏无 hover 不显示；**未提交、未部署**。详见 `docs/QA.md` 22:36 段。

## 流星雨仅左上角品牌悬停（23:06）
- 用户要求只有页眉「✦ JoyFlock」悬停才持续出流星，其余流星全部随机出现。`dist/site-shooting-star.js`：`HOLD_HOT` 由 `.game-card,.topbar .brand` 收窄为 **`.topbar .brand`**；删除 `HOT` / `hoverShower()` / `HOVER_COOLDOWN` / `BOOT_QUIET` / `relayHot` 与 `config.hoverCooldown`，`pointerover` 只判品牌，iframe 指针中继的 `d.hot` 也不再触发（仍用 `d.screen` 判定对局内暂停）。定时随机阵雨（7–15s 首阵、之后 18–36s、3–5 颗）保持。`VERSION=20261110-brandonly1`，18 个 HTML 的 `?v=` 统一。
- **验证**：`tests/site-shooting-star-hold.test.mjs` 扩到 8 项全过；CDP 取消定时器后，封面悬停 2.6s 与导航 / 下拉 / 按钮 / 空白悬停均 `deltaFired=0`，品牌悬停 2.7s 连发 10 颗，离开即停；把 sessionStorage 下次触发设为 1.2s 后刷新，定时阵雨 `lastReason=timer / fired=5` 正常；0 异常。截图 `docs/verification/home-meteor-*.png`。
- **边界**：未改流星外观 / 速率 / 上限 / 对局暂停；「随机」沿用原有定时阵雨；纯表现层，**未提交、未部署**。详见 `docs/QA.md` 23:06 段。

## 23:56 排行榜列表撑满面板、拉开数字列（未提交）
- 用户截图红框圈住右侧「玩家排行榜」，反馈「这个列表这么宽，为什么中间要挤在一起」。根因是第 43 轮留下的 `width:min(84%,340px);margin-inline:auto` 固定居中窄轨道（双列桌面左右各留 23–29px，1080 单列各留 286px），且行内数字列仅 40/28px、间隔 2px。
- `dist/table/table-home-clean.css`：末尾轨道改 `width:100%;max-width:520px;margin-inline:auto`（双列桌面撑满，≤1200px 单列回退保留上限）；行 `24px minmax(0,1fr) 40px 28px;gap:2px` → `24px minmax(0,1fr) 56px 40px;column-gap:10px`，列头同步 `1fr 56px 40px;column-gap:10px`；列头首列 `1fr` 与行 `24px+gap+名字列` 恒等，数字列逐像素对齐；所有高度常量不变。`dist/table/index.html` 版本 `20261110-ranktype1 → 20261110-rankwidth1`（1 处）。
- **验证**：新增 `tests/table-ranking-width.test.mjs` 4/4；`npm test` **349/349**；CDP 6 视口桌面留白 23–33px → 1–3px、间距 2px → 10px、面板/列表高度全部不变、列头与数字列偏差 0、中文列头 0 裁切、0 异常。截图 `docs/verification/ranking-width-*.png`（改前由同会话注入旧 CSS 复现）。
- **边界**：纯 CSS，规则 / 榜单数据 / 后端未动；`no-store` + `?v=` bump，Ctrl+F5 即可；**未提交、未部署**。详见 `docs/QA.md` 23:56 段。

## 00:06 移除「加入房间」按钮与弹窗（未提交）
- 用户要求「加入房间都去掉，直接通过分享的链接进入游戏」。两条路径独立：手动入口 `#join-open → #join-dialog → #join 表单 → enter('FRIENDS',code)`；链接直达 `table.js` 尾部 `params.get('room') → enter('FRIENDS',room)`，由「邀请好友」生成的 `?room=<uuid>` 游戏页直达链接触发（portal iframe 不透传 room）。**只删前者，完整保留后者。**
- `dist/table/index.html`：删按钮与整个弹窗；`dist/table/table.js`：删 join 事件绑定与表单解析、删 `$('join')` 音频解锁监听（直接引用，留着会抛 TypeError）；`dist/table/intro-boot.js`：删 arcade 分支的 `hide($('join-open'))`；`dist/table/table-home-clean.css`：三按钮注释 + 删 3 条 `.join-box` 死规则与 55 行 `dialog#join-dialog` 样式。三个资源 `?v=20261110-nojoin1`。
- 新增 `tests/table-join-removed.test.mjs` 4 项；`tests/table-ranking-width.test.mjs` 版本断言改为「一致即可」（原硬编码 `rankwidth1` 被本轮 bump 误伤，已修）。
- **验证**：`npm test` **357/357**（首次 BGM 时序用例偶发，单独 8/8、复跑全绿）；CDP 中文 portal 按钮组恰 3 个、join 元素全无、点击「单机 · 电脑对战」正常进局、带 `?room=<uuid>` 直开游戏页实际发出 `POST /api/table/rooms/<uuid>/join`、arcade 0 异常、**0 运行时异常**。截图 `docs/verification/join-removed-*.png`。
- **边界**：`table-locale.js` 旧词条与其它 CSS 里无 DOM 对应的 `.join-box` 样式属历史死代码，未清；邀请链接生成、房间 API、其它按钮与飞行棋房间预览未动；**未提交、未部署**。详见 `docs/QA.md` 00:06 段。

## 01:25 中袋蓝色库边收尖 + 灰蓝共线（未提交）
- 用户两条要求：灰色（浅灰袋唇）完全不动；蓝色顶端多出 2px 要左右各缩短，消除「尖尖的头」；蓝色斜边向外倾斜，要往内收，与灰色「一条线下来」。红线实测近乎竖直。
- 根因在 `dist/table/pool-table.js` 的 `cushions`：顶面端点 `474/526` 比下端点 `466/534` 多伸 8 单位形成水平凸台，斜边还向下外撇 6 单位，与袋唇臂斜率（20 单位外移 2）不一致。
- 改法：只改四个中袋端点，新增 `CUSHION_TIP_TRIM=2`（顶面 → `472/528`）与 `CUSHION_MITRE_LEAN=2`（下端 → `470/530`），蓝边与袋唇共线、尖头消失；上下/左右镜像。袋唇、袋井、台呢、角袋、物理 rails / `pocketIndex()` / Java 全部未动。两个常量是唯二调节点，用户若要「再短/再收」直接改数值。
- 版本链 `?v=20261111-bluetrim1`（15 处 / 14 文件）；新增 `tests/table-pool-blue-tip.test.mjs` 4 项。
- **验证**：新测试 4/4；`node --check` 4 JS；Chrome 改前/改后特写像素差异只在蓝带 `(190,224)–(709,432)`，灰唇与黑袋口零变化、左右对称；6 个页面 0 console 异常；`npm test` **360/361**，唯一失败是并行会话重构 `snooker-table.js` 后旧文本断言未同步（`soft contact shadow on the baize`），与本轮无关。截图 `docs/verification/middle-pocket-blue-trim*.png`。
- **边界**：纯绘制轮廓，`no-store` + `?v=` bump，Ctrl+F5 即可；未提交、未部署。详见 `docs/QA.md` 01:25 段。

## 01:42 蓝色库边 12 个尖角加小圆角（未提交）
- 用户 12 个红框圈出四个角袋各 2 处 + 上下中袋各 2 处的蓝色库边斜切硬折角，要求「稍微加一点点的弧度」。灰色袋唇 / 黑袋井不动。
- `dist/table/pool-table.js`：新增 `CUSHION_SOFT_RADIUS=3` 与 `softenedContour()`，以原顶点为控制点、距顶点 3 表单位处切 `quadraticCurveTo` 小圆角，6 个库边四边形 × 4 角统一处理；长边与斜边中段保持直线、**顶点坐标零改动**，上一轮灰蓝共线的 TRIM/LEAN 完整保留。三处 `cushionContour` 调用共用 `softRadius=CUSHION_SOFT_RADIUS*q`，`roundedJaws:true` 的 A/B 预览旧 Bezier 鼻不变。
- 半径经 `BEFORE / r=2 / r=3 / r=4` 六宫格高倍对比选定 r=3（r=2 看不出、r=4 中袋侧过圆）；想调只改这一个常量。
- 版本链 `?v=20261111-softradius1`（15 处 / 14 文件）；新增 `tests/table-pool-soft-corner.test.mjs` 4 项，jaw / blue-tip 两个测试 recorder 补 `quadraticCurveTo` 并改为「3 直线 + 4 圆角 + 0 Bezier」。
- **验证**：相关测试 11/11；4 JS `node --check`；Chrome 改前/改后差异只在 12 个角部 `(71,71)–(1429,689)`，灰唇 / 黑袋口 / 长边零变化；6 页 0 console 异常；`npm test` **364/365**，唯一失败仍是并行会话 `snooker-table.js` 的旧文本断言，与本轮无关。截图 `docs/verification/cushion-corner-fillet-*.png`。
- **边界**：纯绘制轮廓，`no-store` + `?v=` bump，Ctrl+F5 即可；未提交、未部署。详见 `docs/QA.md` 01:42 段。

## 16:07 排行榜头像破图修复（未提交）
- 用户截图：游戏详情页「玩家排行榜」10 行头像全是破图图标。根因是本地只启动了静态服务，`/api/avatars/system/0..3` 与 `/api/leaderboards` 均 404，榜单回退到演示数据（Ava Mitchell 486/96 等，与截图逐项吻合）；线上 Caddy→Java 后端才有该接口，不是资源被删，也不是排行榜布局改动的回归。
- 后端 `AvatarController.system()` 是把 1254×1254 的 `avatars-v5.png` 2×2 裁象限；`dist/assets/avatars-v5.png` 与 `backend/src/main/resources/avatars-v5.png` 字节一致，所以前端可用 CSS 精灵等价绘制，且符合 `intro-boot.js`「首帧不等接口」的设计。
- `dist/table/intro-boot.js` 新增 `window.__joyflockAvatar()`：系统头像 → `span.seat-avatar` 精灵、零 API 请求；自定义 `/api/avatars/<uuid>` 仍用 `<img>`，`error` 时替换为精灵；空 / 非法 URL 也回退。`__joyflockRankRow` 与 `presentation.js` 的 `seatAvatar()` 共用，`table.js` 异步刷新同步生效。规则 / 物理 / Java / 榜单数据未动。
- 版本链 `?v=20261111-avatarfallback1`（index.html 3 处 + table.js 内 presentation import）；新增 `tests/table-avatar-fallback.test.mjs` 5 项（含最小 DOM 执行 helper 的行为测试）。
- **验证**：3 JS `node --check`；相关 13/13；`npm test` **371/371**；真实 Chrome CDP 10 行头像全为 SPAN、四象限循环、0 破图、0 系统头像请求，注入自定义 URL 404 后 IMG→SPAN 生效，进 play 屏幕 6 个座位头像同样正常，0 JS 异常。截图 `docs/verification/avatar-fallback-*-20261111.png`。
- **边界**：本地仍是演示榜单，真实头像 / 成绩 / 房间需后端；`social-ui.js` / `result-rankings.js` 用 CSS 背景，本来不会出现破图，未动；未提交、未部署。详见 `docs/QA.md` 16:07 段。

## 16:18 单一积分系统 UI 预览 + 契约设计（未提交）
- 用户参考竞品顶栏，要「顶部总积分 / 每游戏积分 / 只用一种 ✦ 积分 / 每游戏独立计分与排行 / 积分买道具 / VIP 免费」。核对后发现**按游戏独立计分与排行已存在**（`/api/table/stats/<game>`、`/api/table/leaderboards/<game>`、服务端 `MatchScoring`），项目没有道具系统，也没有钱包 / 消费后端，所以本轮不动结算、规则与 Java。
- 新增 `dist/assets/points/star-point.svg`（按用户 26×23 图标重绘的透明矢量四角星）、`dist/site-points.css` / `site-points.js`：页眉「✦ 总积分」胶囊、游戏详情页「本游戏积分」卡片、积分商店（4 款纯外观道具 + ✦ 价格 + VIP 预览开关 + 内存态演示兑换，刷新即还原）；6 个 HTML 接入，版本 `?v=20261111-points1`。门户右侧固定动作区按 760/600px 断点预留 413/267/234px，避免首帧位移。全部标 PREVIEW / 示例数据，不发积分 API、不写 localStorage。
- **三条待用户拍板**：① 消费与排行榜要分离（建议「可用余额」可花、「累计获得」用于排行，本轮只显示一个数值）；② 道具是否永远限纯外观——`AGENTS.md` 规定会员不增加胜率优势、不得静默改规则，功能道具 + VIP 免费会冲突；③ VIP 身份必须由服务端按 Creem ACTIVE / 非 test_mode / 未过期判定，客户端开关只是演示。
- **服务端契约（本轮未实现）**：`GET /api/points/summary` → `{total,game,vip}`；`POST /api/points/items/<id>/redeem` 事务内校验余额 / VIP、幂等扣减、写道具归属；禁止客户端自报分数 / 余额 / 权益。前端已留 `window.__joyflockPoints.set({total,game,vip,live:true})` 接入点，传入后 PREVIEW 消失。
- **验证**：新增 `tests/site-points.test.mjs` 6/6；`npm test` **377/377**；真实 Chrome CDP 胶囊两页完整可见、SVG 200、VIP 切换 4 款全免费、演示兑换 1280→1160 且胶囊同步、排行榜仍 10 行、0 JS 异常（仅 `/api/me`、`/api/csrf` 两条既有 404）。截图 `docs/verification/points-{header,shop,game}-20261111.png`。
- **边界**：UI 预览，示例数据；未接后端、未改规则、未产生真实购买 / 权益；飞行棋主页 `/` 独立 shell 未接入；未提交、未部署。详见 `docs/QA.md` 16:18 段。

## 16:40 账户胶囊 `zhiyuanC` / `Restoring…` 调查与修复（未提交）
- 用户截图：门户首页右上角显示缓存昵称 `zhiyuanC`，进入 `?game=flight` 后同一位置卡在 `Restoring…`。根因是**静态预览无后端**（`/api/me`、`/api/csrf`、排行榜 404）+ **两套账户状态**：门户首帧读 cookie/localStorage 缓存名，iframe 的 `live-account-ui.js` 等握手 `ready`，失败停在 `Restoring…`（超时变 `Reconnect`）。
- **真实缺陷**：`portal-controls.js` 把 iframe 账户按钮文本通过 `joyflock:controls` 广播，`site-account.js` 的白名单没排除连接状态词，于是把 `Restoring…` 当昵称 `renderSigned()`，还错误加 `chrome-signed`、隐藏注册按钮；`portal.js` 浮动控件同样被污染。
- **修复（显示层）**：`site-account.js` 加 `TRANSIENT` 正则，状态词直接忽略、保留服务端确认标签、不写缓存；`portal.js` 加 `TRANSIENT_ACCOUNT`，浮动控件回退 `cachedAccount() || '登录'`。不动 iframe 源头，避免把版本链扩散到 `app.js` / `table.js`。版本 `?v=20261111-accountstate1`（5 个 HTML 的 site-account.js + portal 首页的 portal.js）。
- **验证**：新增 `tests/site-account-transient.test.mjs` 5/5（含提取正则的行为测试）；`npm test` **382/382**；Chrome CDP 1424 / 1920 双视口下两页顶栏与浮动控件均为 `zhiyuanC`，iframe 内部仍如实显示状态词，✦ 积分胶囊两页可见，0 JS 异常（仅 3 个既有 404）。截图 `docs/verification/account-state-*-20261111.png`。
- **注意**：用户截图里没有 ✦ 积分胶囊是**旧标签页未刷新**，实机两种宽度都在，Ctrl+F5 即可；不是回归。真实登录 / 会话恢复仍需后端；iframe 自身的状态词未改。详见 `docs/QA.md` 16:40 段；未提交、未部署。

## 16:52 DevTools 404 风暴（未提交）
- 用户 Network 面板 8 条 404 全是 `/api/csrf`（initiator `online-sess…`），弹窗卡在 `Joining the room…`。根因仍是**静态服务不代理 `/api/`**；三类 404 分别是 `csrf`（联机会话）、`/api/me`（首帧身份）、`/api/leaderboards`（排行榜），都是无后端的预期失败，非回归。
- 刷屏原因：`online-session.js` 的 `initialize()` 对任意失败做 4 次指数退避，`enter()` 每次点击又重新初始化 → 2×4=8 条。
- **修复**：4xx 立即 `break`（确定性失败不重试）；网络异常 / 5xx 保留原退避。`app.js` import 加 `?v=20261111-csrffailfast1`。新增 `tests/online-session-404-failfast.test.mjs` 5 项；`npm test` **387/387**；CDP 实测 csrf 404 由 8 条降到 **2 条**，650ms 出现 `Matching is unavailable right now. Please retry.` toast、弹窗关闭、0 JS 异常。截图 `docs/verification/csrf-404-*-20261111.png`。
- **彻底解决需后端**：`docker compose -f deploy/compose.yaml build && up -d`，访问 `http://127.0.0.1:8081`（nginx 反代 `/api/`、`/ws`）；backend 占 8080，须先停当前 `server.mjs`。本机 Docker client/Compose 可用但 **daemon 未运行**（Docker Desktop 未启动），且无 java/mvn，本轮无法自动拉起。另 `backend/README.md` 明确 `STARTING` 未接 PG 开局事务，**联机对局当前仍标注不可玩**（匿名身份接口已可用）。详见 `docs/QA.md` 16:52 段；未提交、未部署。

## 17:01 排行榜不再放「本游戏积分」卡片（未提交）
- 用户截图红框为 `/table/index.html?game=pool` 排行榜面板内「✦ 本游戏积分 278 PREVIEW」，箭头指向左下「278 累计积分」统计块，指令「排行不用放」。同一数值已在统计块，榜单里不必重复。
- 改动：`site-points.js` 删 `buildGameCard()` / `mount()` 调用 / `paint()` 中的卡片更新；`site-points.css` 删 `.jp-game-points` 规则；6 个 HTML 的 css/js 与 JS 内 `VERSION` 统一 `?v=20261111-norankcard1`。**保留**页眉 ✦ 总积分胶囊、商店（仍显示总积分 1,280 / 本游戏积分 278 + 4 款道具）、页面统计块、排行榜 10 行。
- 验证：`tests/site-points.test.mjs` 版本断言改为动态（对齐 JS `VERSION`）+ 新增「不注入排行榜 DOM」断言；相关 17/17；`npm test` **388/388**；CDP 实测 `#jp-game-points` 不存在、榜单仍 10 行、胶囊与商店正常、统计块仍在、0 JS 异常（仅 1 条既有 csrf 404）。截图 `docs/verification/norankcard-table-20261111.png`。
- 边界：未把 ✦ 标识挪到统计块（本次只说「排行不用放」）；仍 UI 预览 / 示例数据，未接后端、未改规则；未提交、未部署。详见 `docs/QA.md` 17:01 段。

## 17:07 泡泡 NEXT 球跟随炮台旋转（未提交）
- 用户截图红框为炮台左侧的青绿色 NEXT 预览球、红圈为炮台轴心，指令「这个球，就是在左边这个位置的，我转动的时候球要跟上」。按「垂直时保持左侧原位、转动时绕轴心刚性跟随」处理。
- 改动：仅 `dist/table/bubbles.js` NEXT 块，固定 `(W/2-46, LAUNCH_Y+4)` 改为局部锚点 `(-46,4)` 按 `spin=aim+Math.PI/2` 旋转后的世界坐标；阴影 / 托盘 / `NEXT` 文字随 `nx,ny` 自动跟随，球与文字本身不旋转。无增删元素，球阵、瞄准线、炮台组件、规则全未动。
- 验证：`node --check`、`npm test` **388/388**；无头 Chrome 三角度截图 `docs/verification/bubbles-next-follow--{90,124,158}.png`（-90° 原位、-124° 左下、-158° 正下方靠近底座）。8099 服务本轮重启过。
- 边界：纯表现层，Java / 后端无需重建，`no-store` 未 bump `?v=`；歧义留痕——若用户指的是「球移到炮口沿发射方向跟随」或「只在左侧小幅摆动」，需下一轮确认；未提交、未部署。详见 `docs/QA.md` 17:07 段。

## 17:12 「会员与计分」统计块改为当前用户数据（未提交）
- 用户红框为左下四格「年度 VIP / 278 / 66 / 68%」，问是否为当前用户数据、不是就替换且数字默认 0。**答：不是**，全是 `dist/table/index.html` 的硬编码静态文本。
- 改动：首帧四格默认 `未开通 / 0 / 0 / 0%` + `data-member-fact`；`table.js` 新增 `paintMemberFacts()`，会员等级取 `/api/me` 的 `appearance.annualMember|member`，积分 / 局数取 `refreshStats()` 已请求的 `/api/table/stats/<game>`；`init()`、`onLocale`、刷新成功/失败均重绘，游客 / 离线 / 失败一律归零。`intro-boot.js` 与 `table.js` 的「我的战绩」占位改为 0 积分 · 0 局。版本 `?v=20261111-userstats1`（4 处一致）。
- **本月胜率固定 0%**：后端 `TableService.Statistics` 只有 `points/completedGames`，无胜率字段或接口，不编造数值；要真实值需新增后端统计，本轮未动 Java。
- 验证：新增 `tests/table-member-facts.test.mjs` 7 项（含模拟 DOM 跑真实 painter）；全量 `npm test` **395/395**；Chrome CDP 两轮——无后端显示 `未开通/0/0/0%`，模拟登录显示 `年度 VIP/42/7/0%` 且 `#stats` 为 42 积分 · 7 局，0 JS 异常。截图 `docs/verification/member-facts-{offline,signedin}-20261111.png`（含 crop 版）。
- 边界：页眉 ✦ 1,280 胶囊、积分商店、排行榜演示数据仍是上一轮 PREVIEW 示例，本轮未动；未接后端、未改规则；未提交、未部署。详见 `docs/QA.md` 17:12 段。

## 21:26 DevTools 成排 `/api/*` 404：重复探测熔断（未提交）
- 用户截图 6 条红 404（me×3、csrf×2、leaderboards×1）。复查：只有 8080/8099 两个纯静态 `server.mjs`，8081 nginx 未起，Docker daemon 未运行、无 java/mvn/jar；`/api/*` 必 404，页面本身没坏。
- **数量来源**：`portal/index.html?game=flight` 内嵌 iframe `/?embed=joyflock&locale=en`，两层各自初始化。CDP 基础加载 3 条：门户内联 `__joyflockMe`→`/api/me`、iframe `social-ui`→`/api/leaderboards?type=month`、iframe `online-session.initialize()`→`/api/csrf`（4xx failfast 已不带 `/api/me`）。
- **真实缺陷**：打开登录弹窗触发 `site-account.session()`、切标签触发 `app.js refreshLogin()→initialize()`，前端没记住「后端已确定不可用」，每次交互再刷一轮 404。
- 改动：`online-session.js` 加 `apiDownUntil/apiDownError/down()`，4xx 记 30s，`initialize/refreshIdentity/enter` 短路、成功即清除、过期自动恢复，5xx/网络异常仍退避；`site-account.js` 加 `rememberDown()` + `session()` 短路，首帧 `/api/me` 的 404 预置熔断（仅 404，401/403 不阻断登录）。**未 bump `?v=`**（本地 no-store、线上 no-cache，避免牵动 accountstate1 版本链）。
- 验证：新增 `tests/api-404-breaker.test.mjs` 4 项，`online-session-404-failfast.test.mjs` 断言放宽 + 新增短路断言；全量 `npm test` **403/403**；CDP 三阶段 `3 → 3 → 3`（连开登录框 4 次、iframe focus/visibilitychange 后均不增加），0 JS 异常。脚本 `.workbuddy/tmp/api404-audit-cdp.mjs`。
- **剩余 3 条是每次加载的必要探测，均有兜底，不是故障**。彻底归零：① 用户启动 Docker Desktop 后 `docker compose -f deploy/compose.yaml build && up -d`，访问 8081（backend 占 8080，需先停静态服务）；② 或给静态服务加演示 API 开关（本轮未做，会伪装后端，待确认）。
- 边界：只收敛重复探测，未伪造响应、未改协议/规则/Java；未提交、未部署。详见 `docs/QA.md` 21:26 段。

## 21:38 门户积分商城：光标 / 头像各 10 款、1000 分、VIP 免费替换（未提交）
- 参考 FOONY 商城两张截图（10 列深色卡片网格 + 点击后购买确认框）。用户要求：外面网站加商城、光标与头像各 10 款、每件 ✦1000、VIP 免积分直接替换、**不要预览功能**。
- 新增 `dist/shop.html` + `dist/site-shop.js` / `site-shop.css` + `dist/assets/shop/` 20 张 SVG；重写 `dist/site-points.js` / `site-points.css`：删掉旧 PREVIEW 商店 dialog 与「VIP 身份预览」开关，页眉胶囊改为跳 `/shop.html`，`window.__joyflockShop.buy/reset` 负责真实扣 1000 / 免费装备并持久化到 `localStorage['joyflock.shop.v1']`。
- 装备真实生效：光标接入既有 `--joy-cursor` 变量体系（整站），头像用 `--shop-avatar` 注入页眉账户按钮 `::before`；跨页 / 刷新保留。VIP 来自 `/api/me` 或 `window.__joyflockPoints.set({vip:true,live:true})`；余额默认本地 DEMO 10,000，标 DEMO。
- 6 个原有页面 + 商城页统一 `?v=20261111-shop1`；5 个门户页页脚首位新增商城入口。服务端契约仍是 `GET /api/points/summary` + 幂等兑换事务 + 服务端 VIP 判定，**尚未实现**；道具纯外观，未动规则 / Java。
- 验证：重写 `tests/site-points.test.mjs` 8 项（vm 沙箱跑真实 buy）、新增 `tests/site-shop.test.mjs` 7 项、更新 `tests/site-membership-footer.test.mjs` 链接数；全量 `npm test` **412/412**。CDP 实测购买 10,000→9,000、VIP 免费 20 款、余额不足禁用、中文切换、跨页装备，0 商品图 404 / 0 JS 异常。截图 `docs/verification/shop-*-20261111.png`。
- 边界：本地演示钱包，未接后端、未产生真实权益；飞行棋主页 `/` 未接入；DEMO 余额非当前用户数据（上一轮「默认 0」仅针对统计块）；**未提交、未部署**。详见 `docs/QA.md` 21:38 段。

## 22:05 页眉三胶囊靠拢、去掉 DEMO 角标（未提交）
- 用户圈出登录后账户与积分之间的空白块和胶囊尾部 `DEMO`：空白来自 `visibility:hidden` 的注册按钮 88px 占位（+10px gap），角标来自 `site-points.js` 的 `.jp-flag`。
- `site-chrome.css` 把 `.chrome-account-gone` 改为 `display:none!important`（DOM 保留，登出可恢复）；`site-points.css` 胶囊 132→96px、右侧簇 413→**游客 377 / 登录 279px**（760/600 断点 271/234px 并重复登录选择器防止串档）；`site-points.js` 删除角标与 `data-preview`、`DEMO_POINTS` 更名 `START_POINTS`；`site-shop.js/css` 去掉钱包 DEMO 徽标并改写说明文案。
- 版本链统一 `?v=20261111-nodemo1`（7 个页面，含 `portal/portal.js`）；两个硬编码版本串的旧测试改为从 `site-points.js` 的 `VERSION` 派生，新增 `tests/site-header-compact.test.mjs`。全量 `npm test` **418/418**。
- CDP 实测：登录后语言 / 账户 / 积分间距 10px、注册按钮 `display:none`、簇宽 279px、无 DEMO、无溢出；商城购买仍 10,000→9,000；游客态簇宽 377px 且注册按钮回归；1440/900/700/560px 无溢出（390px 的既有横向溢出未动）。截图 `docs/verification/header-compact-*-20261111.png`。
- 边界：只改可见布局与文案，余额 / 扣减 / VIP 仍需服务端权威；未提交、未部署。详见 `docs/QA.md` 22:05 段。

## 22:20 VIP 一键直接替换（未提交）
- 用户圈出积分兑换弹窗并说「VIP可以直接替换」：此前 VIP 仍要在弹窗里点一次「VIP 免费替换」，且本地无后端时界面看不到任何 VIP 通道。
- `site-shop.js` 的 `open()` 新增 VIP 分支：点卡片直接 `buy()` 替换，**不弹兑换确认框、不走支付、余额不变**；已装备只提示，旧弹窗若开着先关掉。非 VIP 流程不变，弹窗新增金色小字「VIP 会员无需积分，可直接替换。」/「VIP members equip directly, with no points spent.」；VIP 兜底按钮改「VIP 直接替换」。**未加 VIP 预览开关**，VIP 仍来自 `/api/me` 或 `set({vip:true,live:true})`。
- 版本链统一 `?v=20261111-vipdirect1`；`tests/site-shop.test.mjs` 新增 VIP 一键替换用例。全量 `npm test` **419/419**。
- CDP 实测：普通用户弹窗 + 购买 10,000→9,000；VIP 点 `cursor-rainbow` 后 `dialog.open=false`、余额 9,000 不变、装备与光标变量生效、20 卡仍 VIP 免费；重复点击不扣分；英文文案正确；0 JS 异常。截图 `docs/verification/shop-vip-{note-dialog,direct-replaced}-20261111.png`。
- 边界：VIP / 余额 / 扣减仍需服务端权威，静态预览里 VIP 只能注入；未提交、未部署。详见 `docs/QA.md` 22:20 段。

## 22:46 飞行器商城（未提交）
- 用户要求把游戏机库的 6 款飞机特效搬到外部商城：默认款也在列且提示「已拥有」、螺旋桨要转、有拖尾、不做人物头像框、两款 VIP + 两款年度 VIP、全部也可 1,000 积分兑换、沿用会员一键免费替换且无预览。
- 新增 `dist/assets/shop/planes/*.png`（6 张，style key 对齐 `plane-skin.js`）、`dist/site-plane-fx.js`（共享 rAF、三叶旋转螺旋桨、会员光晕、连续渐变彩色拖尾、reduced-motion、门户封面同步）、`dist/site-plane.css`（机库大图 / 6 列网格 / 层级徽标）。
- `site-points.js` 增 `plane` kind / 经典款默认已拥有 / `annualVip` / `freeFor(id)` 分层权益；`site-shop.js` 增飞行器分区与「我的机库」面板、弹窗动态飞机、按层一键替换；`app.js` + `hangar.js` 让游戏主页 HeroPlane 跟随商城装备，门户飞行棋封面 `data-shop-plane-cover` 同步。版本链 `?v=20261111-aircraft1`。
- 测试新增 `tests/site-aircraft-shop.test.mjs`，更新 3 个既有测试；全量 `npm test` **427/427**。CDP 实测 8 个 canvas、螺旋桨角度持续变化、普通兑换 10,000→9,000、VIP/年 VIP 一键免费不弹窗不扣费、默认款已拥有、中英文、门户封面与游戏主页同步、0 JS 异常、0 素材 404。截图 `docs/verification/shop-aircraft-*.png`、`portal-aircraft-equipped-cover-*.png`。
- 边界：余额 / 扣减 / VIP / 年度 VIP 仍需服务端权威；游戏内机库门槛仍由 `/api/me` 判定；未提交、未部署；Ctrl+F5。详见 `docs/QA.md` 22:46 段。

## 22:58 第一款光标改为默认已拥有（未提交）
- 用户要求「光标第一个就是默认的光标，提示已经拥有」。`cursor-star` 现为默认款：首次访问即已拥有并已装备，卡片徽标「默认款 / Default」、状态角标与价格位都写「已拥有 / OWNED」，无 1,000 价格；点击提示「已经拥有：这是你的默认光标。」，从其它光标换回免费且不扣分，「恢复默认」回到它。
- `site-points.js` 增 `DEFAULT_CURSOR` / `defaultOwned()` / `normalise()`（兼容旧存档空 cursor），默认款 `freeFor()` 恒 false（VIP 仍显示已拥有），`applyEquipped()` 对默认款不发布 `--shop-cursor`，保留系统 / 节日主题光标；`site-shop.js` 第一款更名「默认光标 / Default pointer」+ `tier:'default'`，徽标改由 `item.tier` 决定，弹窗提示不消耗积分；`dist/assets/shop/cursor-star.svg` 换成站点原生 `assets/cursor/plane.svg`。其余 9 款仍是 1,000 积分 / VIP 免费。版本链 `?v=20261111-defaultcursor1`。
- 测试新增「第一款是默认已拥有」与旧存档规范化用例，全量 `npm test` **429/429**；CDP 实测中英文、点击 / 换回 / 恢复默认余额不变、VIP 下不改标签、0 JS 异常。截图 `docs/verification/shop-default-cursor-*.png`。
- 边界：只改光标默认归属与展示，真实权益仍需服务端权威；未提交、未部署；Ctrl+F5。详见 `docs/QA.md` 22:58 段。

## 23:05 光标全量可用 + 装饰统一右下（未提交）
- 用户要求：光标购买后都要真正生效；图案右上小装饰挪到右下，与默认光标的金色星一致。
- 改动：9 款 SVG 装饰加 `transform="translate(0 17)"`（y≈1~10 → 18~28）；新增 10 张由同一 SVG 渲染的 32×32 PNG，`cursorAssetUrl()` 让 `--shop-cursor` 用 PNG（卡片仍用 SVG），规避 Safari 不支持 SVG cursor / 渐变丢失；修 `mount()` 让无页眉页面也应用装扮，`dist/index.html` 与 `dist/table/arcade.html` 补 `site-points.css/js` + `data-shop-no-pill`，避免积分胶囊插进游戏 header。版本链 `?v=20261111-cursorusable1`。
- 测试新增 `tests/site-cursor-usable.test.mjs`（5 项），全量 `npm test` **434/434**；CDP 实测普通兑换 10,000→9,000、9 款 PNG 逐一加载并成为 computed cursor、默认款回到系统光标、跨 3 个页面均生效且游戏页无误插胶囊、0 JS 异常 0 素材 404。截图 `docs/verification/shop-cursors-bottom-right-zh-20261111.png`。
- 边界：默认款仍用站点原生光标（保留节日主题）；余额 / VIP 仍为演示值；未提交、未部署；Ctrl+F5。详见 `docs/QA.md` 23:05 段。

## 23:20 飞机预览去掉拖尾；三款拖尾商品素材仍在（未提交）
- 用户确认拖尾应为独立商品，飞机卡片不该带它，并问原来的三个拖尾是否还保存着。**还在**：`dist/flight-trails.js` + `.bak` 的 `star / rainbow / cloud`（星光 / 彩虹 / 云朵尾迹），账户「飞行特效」下拉在 `dist/live-account-ui.js`，会员页文案在 `dist/membership.html`；本轮均未改动、未接入积分钱包。
- 改动：`dist/site-plane-fx.js` 删除拖尾几何 / 配色 / 绘制调用，保留螺旋桨、光晕、浮动；`dist/site-shop.js` 三条飞机描述与分区 / 机库 / 页脚文案改为「螺旋桨 + 拖尾为独立道具」。版本链 `?v=20261111-notrail1`。
- 验证：新增 `tests/site-trail-separate.test.mjs`（4 项）并改 aircraft 断言，全量 `npm test` **438/438**；CDP 采样 4 类舞台（含弹窗、两帧）左侧 30% 区域 painted 像素全为 0，螺旋桨角度持续变化，兑换 / VIP / 年VIP / 双语流程正常，动态 import 拖尾模块成功，0 JS 异常。截图 `docs/verification/shop-no-trail-*-20261111.png`。
- 边界：三款拖尾尚未作为商城商品上架（等用户确认）；余额 / VIP 仍为演示值；未提交、未部署；Ctrl+F5。详见 `docs/QA.md` 23:20 段。

## 23:35 页眉导航新增商城入口（未提交）
- 用户要求：门户「游戏」右侧空位加商城链接，点击进购买页。
- 改动：6 个共享外壳页面 nav 追加双语 `Shop / 商城` → `/shop.html`，商城页高亮该入口；`site-chrome.css` 第二链接宽度改 96/88/60px（原会员位 136/126/104px），600px gap 2px，新增 480px 断点隐藏 wordmark 并紧缩右侧簇，避免窄屏裁切。版本链 `?v=20261111-shopnav1`。
- 验证：新增 `tests/site-shop-nav.test.mjs`（4 项）、更新 `site-membership-footer` 与 `site-header-compact` 断言，全量 `npm test` **442/442**；CDP 真实点击进商城并完成 1,000 积分购买、Games 往返、中英文、4 个信息页链接一致、1440~560px 零溢出、390px 溢出 9px 且无文字裁切、0 JS 异常。截图 `docs/verification/shop-nav-*-20261111.png`。
- 边界：页脚商城链接保留；游戏内三个独立 header 未加；余额 / VIP 演示值；未提交、未部署；Ctrl+F5。详见 `docs/QA.md` 23:35 段。

## 23:45 商城三档稀有度（未提交）
- 用户要求：等级只分稀有 / 史诗 / 传说；稀有 1,000 积分购买（含默认已拥有的蓝色经典飞机与第一款光标），史诗 VIP + 年 VIP 免费、默认 1,000，传说年 VIP 免费、默认 3,000；参考截图让等级文字与卡片边框同色；**不再有「默认款」等级**。
- 改动：`dist/site-points.js` 用 `RARITY` + `RARITY_BY_ID` 统一 26 个道具的价格与会员权益，`rarityOf / priceOf / freeFor / buy` 全部按档判定，删除 `tierOf` 与 `PLANE_TIERS`；`dist/site-shop.js` 所有卡片 / 弹窗 / 机库只显示三档徽标，价格与权益文案按档生成，第一款更名「经典光标」，界面不再出现「默认」措辞；`site-shop.css` / `site-plane.css` 定义三档 `--shop-rarity`（蓝 / 紫 / 金），边框与顶部标签同色，hover / 已装备保持同色发光。版本链 `?v=20261111-rarity1`。
- 验证：新增 `tests/site-shop-rarity.test.mjs`（8 项）、更新 4 份旧断言，全量 `npm test` **450/450**；CDP 实测 26 卡文字与边框 computed 颜色 0 处不一致、游客传说 3,000 / 稀有 1,000 扣费、VIP 史诗免费而传说仍收费、年 VIP 传说免费、中英文、390px 零溢出、0 JS 异常。截图 `docs/verification/shop-rarity-*-20261111.png`。
- 边界：稀有道具对会员也收费（不再是 VIP 全免费）；余额 / VIP 仍为演示值，须服务端权威；三款拖尾仍未上架；未提交、未部署；Ctrl+F5。详见 `docs/QA.md` 23:45 段。

## 23:55 已拥有道具一键替换（未提交）
- 用户要求：点「已拥有」商品别再弹兑换确认框，点一下直接替换，随后弹消息「成功替换光标 / 成功替换飞行器」。
- 改动：`dist/site-shop.js` 的 `open()` 最前置 `if(s.owned[id])`：关闭残留弹窗 → `API.buy(id)` 免费装备 → `API.toast(replacedToast(item.kind))`；新增按品类双语提示（光标 / 飞行器 / 头像 × 中英），删除旧「已经拥有 / 当前已在使用」toast，`confirm()` 零扣费兜底复用同一提示。未拥有仍弹窗按档扣费，VIP / 年 VIP 一键免费不变；所有权优先于会员标签。版本链 `?v=20261111-ownedequip1`。
- 验证：新增 `tests/site-shop-owned-equip.test.mjs`（5 项，DOM 替身实跑两个脚本模拟点击）、改 2 份旧断言，`npm test` **455/455**；CDP 实测未拥有 `10,000→9,000` 弹窗购买，再点同卡不弹窗且 toast「成功替换光标」余额不变，经典飞机 / 头像同样一键提示，英文三条对应翻译，8 项检查全 true、0 JS 异常、390px 零溢出。截图 `docs/verification/shop-owned-*-20261111.png`。
- 边界：卡片「已拥有 / OWNED」角标保留；余额 / VIP 演示值；三款拖尾仍未上架；未提交、未部署；Ctrl+F5。详见 `docs/QA.md` 23:55 段。

## 00:10 三款飞行拖尾上架积分商城（未提交）
- 用户确认三款拖尾还在后，按「上架商城商品」接入。核实 `dist/flight-trails.js`（+ `.bak`）的 star/rainbow/cloud、游戏场景与账户入口均完整，此前只是未作为商品。
- 改动：`dist/site-points.js` 新增 `trail` 类别、三档稀有度（星光稀有已拥有 1,000 / 彩虹史诗 1,000 VIP 免费 / 云朵传说 3,000 年VIP 免费）、`equipped.trail`、`data-shop-trail` 发布；新增 `dist/shop-trail.js` 的 `activeTrailStyle()`（服务端 appearance 优先，商城值兜底），`scene.js`/`fallback.js` 改用它并去掉仅会员门槛；`dist/site-shop.js` 新增「飞行器拖尾」分区（3 卡、购买/一键替换/恢复装扮、当前装扮栏、成功提示「成功替换拖尾」）；新增 `dist/site-trail-fx.js` + `site-trail.css` 画三种动态尾迹预览。飞机卡片/机库仍不带尾迹。版本链 `?v=20261112-trailshop1`。
- 验证：新增 `tests/site-trail-shop.test.mjs`（6 项）、改造 `site-trail-separate` 的旧「未进商城」断言、更新 5 份旧断言，`npm test` **461/461**；CDP 15 项检查全 true：29 卡 / 4 分区、边框与标签同色、3 个 canvas 两帧变化、彩虹 1,000 与云朵 3,000 扣费、已拥有一键提示、VIP/年VIP 免费、英文文案、390px 零溢出、游戏主页 `/` 读到 `data-shop-trail=star`、0 JS 异常。截图 `docs/verification/shop-trail-*-20261112.png`。
- 边界：服务端 appearance 优先；余额 / VIP 演示值须服务端权威；拖尾与飞机独立；未提交、未部署；Ctrl+F5。详见 `docs/QA.md` 00:10 段。

## 00:30 商城统一六列网格（未提交）
- 用户指出截图红框里飞行器卡与光标卡大小不同，要求「框搞一样的，每行 6 个，多的换行」。
- 改动：`dist/site-shop.css` 的 `.shop-grid` 统一 `repeat(6,...)` 作为四个分区唯一列规则；`site-plane.css` / `site-trail.css` 删除各自的 6/3 列与 `max-width:760px` 覆盖；响应式只在 site-shop.css 定义（1240→4、760→3、520→2）。卡片统一 `30px 6px 10px` padding、`.shop-art` 98px（窄屏 84px）与飞机/拖尾舞台一致 → 四类卡等宽等高；10 款光标/头像自动 6+4 换行，3 款拖尾占前 3 格不拉伸。顺带把 480px 断点 `.jp-amount` 字号降 12px，修掉 390px 页眉 1px 溢出。版本链 `?v=20261112-grid6`（14 文件）。
- 验证：新增 `tests/site-shop-grid6.test.mjs`（5 项）、更新 4 份旧列数/版本断言，`npm test` **466/466**；CDP 18 项全 true：四分区均 6 列、29 张卡同宽 239px 同高 190px、光标/头像 `[6,4]` 换行、1100/700/390 为 4/3/2 列且零溢出、0 JS 异常。截图 `docs/verification/shop-grid6-*-20261112.png`。
- 边界：仅布局改动，稀有度/定价/购买/一键替换/游戏内拖尾逻辑不变；余额/VIP 演示值；未提交、未部署、Ctrl+F5。详见 `docs/QA.md` 00:30 段。

## 00:45 机库大图默认展示黑曜猎隼（未提交）
- 用户觉得第 5 张「黑曜猎隼」好看，想把上方机库大图默认放这款；经确认只改展示层，不动默认拥有/装备与商品规则。
- 改动：`dist/site-shop.js` hero stage 去掉 `data-plane-current`、加 `data-plane-showcase="obsidian2d" data-plane-style="obsidian2d"`，aria-label 改「飞机展示 / Aircraft showcase」；`dist/site-plane-fx.js` 的 `refresh()` 新增 showcase 分支（装备 classic 时画展示款，装备其它飞机后跟随真实装备，恢复装扮回到展示款）。卡片、装扮栏小图、门户封面仍按真实装备。
- 不变：`DEFAULT_PLANE` 仍经典飞机（稀有、首访已拥有/装备）；黑曜猎隼仍传说 3,000 / 年VIP 免费；机库「当前飞机 经典飞机」文字不变，所以默认状态下大图与文字不同是预期。版本链 `?v=20261112-heroobsidian1`。
- 验证：新增 `tests/site-shop-hero-showcase.test.mjs`（4 项，vm DOM 替身实跑 refresh）、更新 3 份版本断言，`npm test` **470/470**；CDP 15 项全 true：初始大图 obsidian2d 且 canvas 有像素、买云海巡航 `10,000→9,000` 后大图/小图变 cloud2d、恢复装扮回到 obsidian2d、英文 aria-label 正确、0 JS 异常。截图 `docs/verification/shop-hero-*-20261112.png`。
- 边界：纯展示改动；余额/VIP 演示值；未提交、未部署、Ctrl+F5。详见 `docs/QA.md` 00:45 段。

## 01:00 商品按稀有 → 史诗 → 传说排序（未提交）
- 需求：「商品按稀有、史诗、传说排序」；按四个分区各自内部按档分组，分区与六列网格不变。
- 改动：`dist/site-shop.js` 的 `CATALOG` 静态重排（光标 / 头像各改为 4 稀有 → 4 史诗 → 2 传说；飞机 2/2/2 与拖尾 1/1/1 原已有序）；新增 `GRADE_ORDER` + `graded(kind)` 在 `section()` 做稳定排序（`||a.i-b.i` 保持同档人工顺序），新增商品自动按档归位，`__joyflockShopCatalog.items` 同步有序。三款首访已拥有道具仍居各自分区首位。
- 不变：29 件 / 4 分区、三档定价与 VIP 权益、边框标签同色、6 列 + 6/4 换行、机库大图展示款、购买 / 一键替换 / 游戏内拖尾逻辑。版本链 `?v=20261112-raritysort1`（14 文件）。
- 验证：新增 `tests/site-shop-rarity-order.test.mjs`（4 项，含 vm DOM 替身实跑生成 HTML 的卡片顺序）、更新 4 份版本硬编码，`npm test` **474/474**；CDP 21 项全 true：中英文四分区档位序列精确匹配、29 卡边框标签同色、首卡与「已拥有」正确、6 列 `[6,4]` 换行、买 `cursor-ember` 仍 `10,000→9,000`、390px 零溢出、0 JS 异常。截图 `docs/verification/shop-raritysort-*-20261112.png`。
- 边界：仅展示顺序；余额/VIP 演示值；未提交、未部署、Ctrl+F5。详见 `docs/QA.md` 01:00 段。

## 01:20 ✦ 星标货币定名 Joy Coin（未提交）
- 需求：截图指页眉 `✦ 9,000` 胶囊，「这个钱币命名 joy coin」；中英文界面都用品牌名 Joy Coin，游戏得分「积分」不改名。
- 改动：`dist/site-points.js` 新增唯一命名源 `CURRENCY='Joy Coin'` 并导出到两个 API；胶囊保留紧凑 `✦ + 数字`，用 `data-coin` + `site-points.css` 的 `::after` 气泡在 hover/focus 显示名称，aria-label / 隐藏 label 同步；`dist/site-shop.js` 以 `COIN=API.currency` 统一钱包、h1、hero、弹窗按钮/支付方式/说明、toast、页脚说明；`shop.html` 与 6 个外壳页的 title / top-note / 页脚链接改 `Joy Coin Shop / Joy Coin 商城`。
- 层叠修复：`ambient.css` 让 header 与 main 同为 z-index:1 且 main 靠后，会盖住悬垂气泡；`site-points.css` 加 `html body>.topbar{z-index:3}` + `.jp-pill{z-index:60}`（hover transform 自建层叠上下文）。版本链 `?v=20261112-joycoin1`（14 文件）。
- 保留：`table/index.html` 的排行榜/累计积分、`privacy.html` 的成绩积分、`__joyflockPoints.set()` / 存储键 / `/api/points/summary` 不变。
- 验证：新增 `tests/site-joycoin.test.mjs`（6 项，vm DOM 替身实跑胶囊与弹窗/toast）、更新 9 份旧断言，`npm test` **480/480**；CDP 20 项全 true：hover 气泡可见、中英 aria/title/页脚、弹窗与 toast 均为 Joy Coin、购买 `10,000→9,000`、390px 零溢出、0 JS 异常。截图 `docs/verification/shop-joycoin-*-20261112.png`。
- 边界：仅货币命名与文案；三档定价/VIP 权益/购买/排序/拖尾逻辑不变；余额/VIP 演示值；未提交、未部署、Ctrl+F5。详见 `docs/QA.md` 01:20 段。

## 01:40 本批 7 项截图反馈统一收尾（未提交）
- 需求：胶囊 hover 显示 `9,000 Joy Coins`；台球「这些没盖住啊」与「鼠标移动到球上有奇怪图形」；统一游戏积分（2 人 200/100、4 人 200/100/50/50、匿名只显示不保存）；商城卡片向参考图靠拢；门户飞行棋封面刷新变样；去掉全部「恢复初始装扮」按钮。
- **新增 `dist/game-points.js`**：唯一计分表 + 去重 `record()` + 动态 `.member-facts` / `#stats` / `#leaderboard` + 双语 toast + 父子 iframe `postMessage` 快照同步（只镜像不重发奖）。身份来自 `joyflock.accountName` / cookie / `__joyflockMe`，匿名不读也不写 `joyflock.gamepoints.v1`，与 Joy Coin 钱包完全隔离。接入 `table.js`（`board.over`）、`app.js`（`game.ranking`）、`result-rankings.js`（`pointsBySeat`）、`social-ui.js`（自身行）、三页 HTML 与旧 `+3/+2` 文案。
- **CDP 发现的 3 个真问题已修**：同标签页登录需监听 `joyflock:account-changed`（`load(forced)` 清空 state，游客分不并入账号）；桌游 `refreshLeaderboard()` 补 `data-self="1"`；新账号 100 分被 10 条演示榜单挤出前十 → 共用 `rankRows()` 让最低演示行让位，`game-points.js` / `table.js` / `social-ui.js` 统一使用。
- **台球**：`pool-shell.css` 用 `:has(.pool-countdown:not([hidden]))` 给 `.pool-left-controls::after` 铺与倒计时卡片完全同色的暗层（GO 阶段变浅且放行点击），解决「没盖住」；`site-cursor.css` 加 `canvas.pool-spot{cursor:crosshair!important}`，解决 `role="button"` 命中全站金色飞机 hover 光标。控件本身不删除。
- **其它**：`site-points.js` 的 `CURRENCY_PLURAL` 让 hover 气泡随余额显示 `9,000 Joy Coins`；`site-shop.css` 改 2px 同色发光边框 / 16px 圆角 / 蓝色已拥有胶囊，`site-shop.js` 移除四分区恢复按钮；`portal/index.html` + `site-plane-fx.js` 去掉 `data-shop-plane-cover`，封面固定静态金色飞机。
- **版本链**：全站统一 `?v=20261112-batchfix1`，含 `game-points.js` VERSION、4 个脚本 VERSION、9 个页面的 `site-cursor.css`、2 个页面的 `pool-shell.css`；并把桌游脚本链（`table.js` / `intro-boot.js` / `table-home-clean.css` / `presentation.js` / `arcade-table.js` / `arcade.js` / `snooker-view.js`）与 `social-ui.js` 一并并入，给 `result-rankings.js` 补上版本号；6 份测试硬编码同步。
- **验证**：新增 `tests/game-points.test.mjs`（9 项）、`tests/pool-rail-countdown-cursor.test.mjs`（3 项），`npm test` **493/493**；CDP `.workbuddy/tmp/batchfix-cdp.mjs` **13 项全 true**、0 JS 异常、404 仅既有 `/api/me` 与 `/api/csrf`。截图 `docs/verification/batchfix-*-20261112.png`。
- **边界**：`rankRows` 在十名外把自身行放到第 10 位（不伪造积分）；`:has()` 需 Chrome 105+；余额/VIP 仍是本地演示值；未提交、未部署、Ctrl+F5。详见 `docs/QA.md` 01:40 段。

## 11:00 商城卡片视觉二次校准（未提交）
- 需求：参考卡片 hover 显示黄色内框；去掉等级标签下的横线；标签字号放大到与「已拥有」一致；外框改细、背景改深色并做顶部渐变。
- **仅改 `dist/site-shop.css`**：`border:2px solid var(--shop-rarity)` + 外 halo → `border:1px solid var(--shop-rarity-line)`（同 RGB 半透明细线），装备态 2px 环降为 1px；底色 `#080e22`，顶部 `linear-gradient(180deg,var(--shop-rarity-top),transparent 46%)`（三档同源色）；新增 `.shop-card::after`（`inset:3px`、`#ffd84d` 2px 内框、`opacity:0→1`）仅在 `:hover` / `:focus-visible` 显示；`.shop-rarity` 去 `border-bottom` 与自身背景条；`.shop-page` 定义 `--shop-label-size:12px`，`.shop-rarity` 与 `.shop-price-owned` 共用（原 10px / 9.5px）。
- **不动**：商品数据、排序、定价、VIP 权益、一键替换、四分区 6 列网格、无恢复按钮、门户静态封面；`site-shop.js` / `site-plane.css` / `site-trail.css` 未改。
- **版本链**：全站 `?v=20261112-cardframe1`（26 文件 / 83 处），6 份测试与历史 CDP 脚本断言同步。
- **验证**：`npm test` **494/494**；CDP `.workbuddy/tmp/cardframe-cdp.mjs` **18/18 全 true**（细边 1px、深底与顶部渐变、无横线、标签与已拥有均 12px、hover 黄色内框出现/移开消失、390px 零溢出、0 JS 异常）。截图 `docs/verification/cardframe-shop-{idle,hover}-20261112.png`。
- **边界**：内框为纯金黄加淡绿内发光（参考图偏黄绿）；边框改半透明同色细线，稀有度仍与标签同 RGB；仅视觉层，未提交、未部署、Ctrl+F5。详见 `docs/QA.md` 11:00 段。

## 11:11 「已拥有」统一单一绿色 + 角标字号（未提交）
- 需求：「已经拥有，固定一个绿色就可以，字体太小，跟横梁一个字体大小」（红框为右上角绿色斜角标）。
- `dist/site-shop.css` 新增 `--shop-owned:#2f9e6d`，作为唯一绿色来源；`.shop-state` 删除蓝 / 金 / 绿三态分支、固定该绿，字号 `8px → var(--shop-label-size)`（12px，与顶部等级标签一致），尺寸调为 `96px / top:6px / right:-30px / padding:3px 0`；`.shop-price-owned` 底部胶囊由蓝改同款绿。`site-plane.css` / `site-trail.css` 的角标定位同步。
- 仅视觉层：`site-shop.js` 未改；定价 / VIP 权益 / 排序 / 6 列网格 / hover 黄色内框 / 细外框 / 无横线 / 无恢复按钮均保持。
- 版本链 `?v=20261112-ownedgreen1`（26 文件 / 83 处）；`npm test` **495/495**；CDP `ownedgreen-cdp.mjs` **18/18**（含 VIP 场景 21 个角标仍单一绿色、单一 12px），回归 18/18 与 13/13 全通过。截图 `docs/verification/ownedgreen-{shop-row,card-zoom}-20261112.png`。
- 边界：VIP 免费角标不再以金色区分（信息由文字表达）；「横梁」按顶部等级标签理解（三者统一 12px）；用户截图是旧缓存画面，须 Ctrl+F5。未提交、未部署。详见 `docs/QA.md` 11:11 段。

## 13:40 机器人难度全游戏量化与倒挂修正（未提交）
- 需求：用户质疑「地狱难度也不难、随随便便都能赢」，要求每个游戏都确认。链路核对结论：**UI → localStorage → `getBotLevel()` → 各引擎全部通**，问题在 AI 强度本身。
- 逐游戏实跑（参考玩家胜率）：四子棋 12/8/5/1、井字棋 10/2/0/0、五子棋 12/8/0/0、象棋 2/0/0/0（4 局）、纸牌 9/7/7/5（16 局）、台球 9/12/0/0（12 局）、泡泡 13/9/9/5（16 局），斯诺克 10 杆净胜 −12/−4/+15/+17；均为「简单→地狱」单调或达到游戏理论上限。
- 修复三处实测倒挂：
  - **泡泡**（`bubbles-duel.js` + `bot-difficulty.js`）：删掉「权重翻倍 + 一步对手前瞻」（直接对抗 18/40 负于专业），四档共用评估、只按采样精度 `15/6/4/2` 分层；细扫是粗扫的真超集，地狱必不弱于专业，单步耗时降约 25%。
  - **斯诺克**（`snooker-duel.js`）：红球阶段任何「更聪明」的偏离都变弱（多袋口 −45、遮挡 −42 vs 专业 +45），故严格复用专业线路；彩球阶段改用 `shootSnooker()` 真实物理验证前 3 条候选并按净得分择优，专业线路始终兜底，修掉 3.6° 偏差把 7 分球变 7 分犯规的问题。
  - **纸牌**（`cards.js`）：简单档 50% 摸牌导致 8 局 7 平，改 90% 出牌 / 10% 摸牌；旧专业只优化留牌灵活度，固定牌堆 60 局仅 27/60（镜像基准 36，弱于一般档），专业/地狱统一改用「对手可应答牌数」前瞻惩罚（1.2 / 2.5），得 39/60、44/60。
- **台球不改**：参考玩家本身就是 `normal` bot，镜像对局先手 12/12 造成「简单档更难赢」的假象；直接对抗 easy vs normal = 1-11 / 3-9，确认 easy 最弱。
- 飞行棋链路含 `botDie()` 加权与 `advancedBestMove()` 威胁评估，CDP 实测地狱 600 掷出 162 个 6（均匀期望 100）。
- 版本链 `20261112-ownedgreen1` → `20261112-botstrength1`（25 文件 / 93 处 + 5 个 JS VERSION 常量 + 6 份测试 10 处硬编码）。新增 `tests/bot-difficulty-strength.test.mjs`（6 项），更新旧纸牌断言；`npm test` **501/501**；Chrome CDP **22/22 全 true**、0 JS 异常、0 意外 404；截图 `docs/verification/botstrength-*-20261112.png`。
- 边界：井字棋上限为平局；纸牌运气成分大；静态站 `/api/me`、`/api/csrf`、`/api/leaderboards` 三个 404 属预期；难度为设备级 localStorage，非账号维度；未提交、未部署，需 Ctrl+F5。详见 `docs/QA.md` 13:40 段与 `docs/BOT-DIFFICULTY.md` 第 8 节。

## 15:22 商城卡片右上角「已拥有」斜标移除（未提交）
- 用户判定右上角斜角标与底部胶囊重复；`.shop-state` 组件及其 CSS（`site-shop.css` / `site-plane.css` / `site-trail.css`）、`site-shop.js` 模板与 `paint()` 赋值全部删除。已拥有改由底部胶囊唯一表达；已装备仍由 `[data-equipped="1"]` 细环、当前装扮栏与弹窗表达；会员免费仍由底部 `.shop-price-free` 表达。
- 同步更新 3 份测试中的 4 条旧角标断言；`npm test` **501/501**；版本链 `20261112-botstrength1` → `20261112-nostate1`（37 文件 / 109 处）。
- Chrome CDP **19/19 全 true**：29 卡无角标元素/样式、每卡「已拥有」最多 1 次、胶囊绿色 12px、hover 黄框与细边不变、VIP/装备/390px 场景无回归、0 JS 异常与 0 意外 404。截图 `docs/verification/nostate-*-20261112.png`。
- 边界：未动购买与替换逻辑；须 Ctrl+F5；未提交、未部署。详见 `docs/QA.md` 15:22 段。

## 16:45 商城新增游戏道具与公共棋盘裁决（未提交）
- 用户要求：四子连珠 / 五子棋 / 国际象棋 / 井字棋的棋子与棋盘造型；比赛中显示自己选的特殊棋子；双方都选特殊棋盘时按 年VIP > VIP > 普通 → 双方积分 → 随机 裁决。三项口径已确认：通用主题套系（6 件商品）、游戏累计积分、单机机器人模拟档案。
- 状态：`site-points.js` 扩为 35 商品 / 6 类 / `equipped` 6 键，默认拥有并装备 `piece-neon` 与 `board-neon`；`site-shop.js` 新增两个分区与内联预览；`site-cosmetics.css` 为商城预览与四个棋类共用唯一色源。
- 裁决：新增纯模块 `dist/table/cosmetics-rules.js`（`resolveBoard`），`dist/table/game-cosmetics.js` 在 `table.js` 的 `render()` 开头应用结果并按 `matchKey` 缓存随机；`#cosmetic-note` 显示双语裁决理由。仅己方棋子换造型，棋盘用裁决后的主题。
- 渲染：四子棋 / 井字棋 / 国际象棋由 `game-cosmetics.css` 高优先级覆盖；五子棋 canvas 由 `gomoku-view.js` 读同一套 CSS 变量重绘木纹、格线、外框与己方棋子，`cosmeticKey()` 加入 paint signature。
- 测试：新增 `tests/game-cosmetics.test.mjs`（9 项），同步 6 份商城旧断言（29→35 件、4→6 分区、equipped 4→6 键）；`npm test` **510/510**；版本链 `20261112-nostate1` → `20261112-cosmetics1`（37 文件 / 109 处）。
- Chrome CDP **25/25 全 true**：购买与装备落盘、四棋类仅己方翡翠棋子、裁决五分支（含随机 a/b 两种结果）、非棋类页不装扮、1600/390px 零溢出、0 JS 异常 / 0 意外 404；截图 `docs/verification/cosmetics-*-20261112.png`。
- 边界：联机可用 `window.__joyflockCosmetics.setOpponent(profile)` 注入服务端档案；机器人等级恒普通用户；造型不影响规则与胜率；未提交、未部署，须 Ctrl+F5。详见 `docs/QA.md` 16:45 段。

## 16:55 台球 / 斯诺克新增球、球杆、桌球台（未提交）
- 用户要求「欢乐台球、斯诺克也是一样」，台球按每个球设计造型、显示方式与上一批一致。三项口径已确认：整套 3 款逐球设计（保留每颗球号码/条纹/配色）、沿用上一批归属规则、两游戏共用一套。
- 商品：`ball-*` / `cue-*` / `table-*` 各 3 件（霓虹 / 翡翠 / 星曜 = 稀有 / 史诗 / 传说），共 9 件；商城 44 件商品、9 分区、`equipped` 9 键，三个稀有款默认拥有。
- 唯一色源仍是 `site-cosmetics.css`：`--ball-0..15` 每球独立色 + 三主题材质变量组（`--ball-*` / `--cue-*` / `--cloth-*`）；商城卡片与 canvas 读同一份变量。新增 `dist/table/billiard-cosmetics.js` 只读桥接，输出 `ballSkin / cueSkin(我方) / tableSkin / cosmeticKey`，Node 无 DOM 时返回 `null`。
- 归属：球为全场共用的一组球；球杆只替换己方出杆那根（对手显式传 `null`）；桌球台公用，由 `resolveShared(me,opponent,'table')` 按 年VIP > VIP > 普通 → 累计得分 → 随机 裁决，`resolveBoard` 保留兼容包装，`#cosmetic-note` 显示双语理由。
- 渲染：`pool-ball.js` 的 `options.skin` 逐球取色 + 每球刻度环 + 号码牌/材质；`pool-cue.js` 第 5 参数 skin；`pool-table.js` / `snooker-table.js` 的 `options.skin` 改台呢 dye 与木框（无 skin 与原画面逐值等价）；两个 view 按主题键重建缓存桌面。
- 修复两处：斯诺克误用 `computer` 判断出杆方导致球杆未换肤 → `cueSkin(true)`（`opts.cue` 已限定人类出杆）；Node VM DOM 替身缺 `_tableKey` 导致 15 项 `document is not defined` → 重建条件加 `tSkin &&`。
- 测试：新增 `tests/billiard-cosmetics.test.mjs`（8 项），同步 7 份旧商城断言；`npm test` **518/518**；版本链 `20261112-cosmetics1` → `20261112-billiards1`（58 文件 / 143 处，旧 key 残留 0）。
- Chrome CDP **31/31 全 true**：9 分区与逐球卡片预览、购买装备落盘与余额 5,000、已拥有一键替换 toast、台球/斯诺克逐球色与仅己方球杆、裁决五分支、强制积分胜出后 canvas 台呢由蓝变翡翠绿、非台球页不装扮、1600/390px 零溢出、0 异常 / 0 意外 404；截图 `docs/verification/billiards-*-20261112.png`。
- 边界：球/台呢公用、球杆仅本人；造型不影响物理与胜率；未提交、未部署，须 Ctrl+F5；静态服务实时读盘无需重启。详见 `docs/QA.md` 16:55 段。

## 17:35 商城 hover 单框修复（未提交）
- 用户反馈传说卡 hover 时「内黄色框中间还有一根线」。像素诊断：卡片自带 1px 稀有度 hairline + `::after` 2px 黄内框 + 绿色 inset 阴影 + 顶部 inset 高光 + 装备环，多层叠成双线/三线观感，并非真有分割线。
- 仅改 `dist/site-shop.css`：hover/focus 隐藏 1px hairline（`border-color:transparent`）、内框去掉绿色 inset 只留淡黄外发光、hover 去掉顶部 inset 高光、hover 时抑制 `[data-equipped="1"]` 装备环；静止态与其余卡片完全不变。
- 新增 `tests/site-shop-single-frame.test.mjs`（5 项）；`npm test` **523/523**；版本链 `20261112-billiards1` → `20261112-oneframe1`（59 文件 / 145 处，旧 key 残留 0）。
- Chrome CDP **20/20**：真实 hover 单根黄框、已拥有/已装备卡 hover 也无第二层、相邻卡描边保留、1600/390px 零溢出、0 异常 / 0 意外 404；截图 `docs/verification/oneframe-*-20261112.png`。详见 `docs/QA.md` 17:35 段。

## 17:50 商城商品 hover 音效（未提交）
- 用户要求商城商品 hover 有「跟首页一样的音效」。诊断：`/shop.html` 从未加载 `site-hover-sfx.js`；首页九张封面用的是共享模块的 **zoom grow**（柔和上升 whoosh + pop），不是按钮 tick。
- 实现：`shop.html` 加载共享模块；`site-hover-sfx.js` 的 `MUTED_ZONES` / `ZOOM_ZONES` 各加 `.shop-card`（静 tick、响 grow）；新增 `SHOP_ZOOM_GAP=150`（商城每行 6 张更密集）；`playZoom()` 对 shop 卡 `level .82 / duration .19`，首页参数不变；四个静音开关与自动播放手势门控全部沿用，零音频文件、零网络请求。
- 附带：商城非商品按钮 / 链接也获得与首页一致的短促 tick，`.topbar` 仍静音；商品卡不叠加 tick。
- 新增 `tests/site-shop-hover-sfx.test.mjs`（5 项）；`npm test` **528/528**；版本链 `oneframe1` → `shopsfx1`（61 文件 / 146 处，旧 key 0），8 个原有页面的 `site-hover-sfx.js?v=20261110-glove2` 同步 bump（共 9 个引用），模块 `api.version` 同步。
- Chrome CDP `shopsfx-cdp.mjs` **21/21**：真实点击解锁 AudioContext、两张商品卡各一次 grow、同卡节流、静音 blocked、首页封面仍响同一模块、商城 390px 零溢出、0 异常 / 0 意外 404；截图 `docs/verification/shopsfx-*-20261112.png`。详见 `docs/QA.md` 17:50 段。
- 边界：新标签页需一次点击或按键才发声（浏览器自动播放策略，与首页一致）；只加声音不改交互；未提交、未部署，Ctrl+F5。

## 17:55 商城顶部渐变收敛到标签小条（未提交）
- 用户红框圈出卡片顶部约 44px 的等级标签带：「渐变，就渐变这小块就可以了」。原两层背景分别铺到整卡 46% / 72% 高度，飞机、名称与胶囊都被蓝色洗过；现 `dist/site-shop.css` 改为 `linear-gradient(...transparent 46px)` + `radial-gradient(ellipse 78% 46px ...)`，下方纯 `#080e22`。用绝对 px 而非 %，保证 1600px 六列与 ≤1240px 四列下标签带同高。
- 新增 `tests/site-shop-top-band.test.mjs`（5 项），同步 `site-shop-rarity.test.mjs` 的旧 `46%` 断言；`npm test` **533/533**；版本链 `20261112-shopsfx1` → `20261112-topband1`（62 文件 / 157 处，旧 key 0）。
- Chrome CDP `topband-cdp.mjs` **16/16**：computed 背景两个 `46px`、无 `46%`/`72%`、flat `rgb(8,14,34)`、hover 单根黄框保留、44 张卡、1600/390px 零溢出、0 异常 / 0 意外 404；像素复核 y≥54 起恒定深色无接缝。截图 `docs/verification/topband-*-20261112.png`。详见 `docs/QA.md` 17:55 段。
- 边界：仅视觉，不影响 hover 音效与购买装备；未提交、未部署，Ctrl+F5。

## 18:05 商城卡片外边框发光（未提交）
- 用户附当前卡片图 + 参考图（红框圈亮蓝发光顶边），问「外边框可以加个…能像他们这个一样吗」。量化参考：亮线约 `(48,156,207)` + 上方 15px 蓝色柔光；左右延伸的横线实为相邻卡片各自顶边，非连接线，故不新增横线。
- 实现（唯一改 `dist/site-shop.css`）：三档新增 `--shop-rarity-edge`（`#7cc7ff`/`#d5b2ff`/`#ffd68a`）只用于卡片 1px 描边，`--shop-rarity-line` 仍给弹窗；两层纯模糊光晕 `0 -2px 18px -4px` + `0 0 12px -1px var(--shop-rarity-glow)`（上方权重更大）；hover/focus 同时去掉蓝光晕与描边，保持单根黄框；equipped 从锐利 `0 0 0 1px` 环改为 `0 0 16px 0` 更强光晕，避免双线。
- 新增 `tests/site-shop-glow-border.test.mjs`（6 项），同步 3 份既有测试；`npm test` **539/539**；版本链 `20261112-topband1` → `20261112-glowborder1`（63 文件 / 158 处，旧 key 0）。
- Chrome CDP `glowborder-cdp.mjs` **20/20**：computed 亮边 1px、三档色、非装备/装备光晕、hover 去蓝光单黄框、46px 顶带、44 卡、1600/390 零溢出、0 异常 / 0 意外 404；像素复核顶边上方约 15px 蓝色光晕。截图 `docs/verification/glowborder-*-20261112.png`。详见 `docs/QA.md` 18:05 段。
- 边界：纯视觉；未提交、未部署、Ctrl+F5。

## 18:20 对局内装扮说明横幅移除（未提交）
- 用户红框圈出台球对局页头像上方「球组 星曜 · 球杆 翡翠 · 台呢 霓虹（你的积分更高）」，要求「去掉」；四棋类同款「棋子 / 棋盘（裁决理由）」横幅一并去掉（同一 `#cosmetic-note` 组件）。
- 仅改 `dist/table/game-cosmetics.js`（删 `THEME_NAMES` / `caption()` / `publishNote()` 与两处调用）和 `dist/table/game-cosmetics.css`（删 `.cosmetic-note` 两条规则）。裁决逻辑、`data-cosmetic-*`、`__joyflockCosmeticsState`、`setOpponent()` 与所有 canvas/CSS 造型保持原样，联机仍可读到裁决结果，只是不再对玩家显示文字。
- 新增 `tests/game-cosmetics-note-off.test.mjs`（5 项，含 DOM 替身真实跑模块验证不插入任何节点）；同步 2 份既有测试的说明断言；`npm test` **544/544**；版本链 `20261112-glowborder1` → `20261112-nonote1`（64 文件 / 159 处，旧 key 0）。
- Chrome CDP `noteoff-cdp.mjs` **34/34**：真实进入对局后 8 个页面/场景无说明节点与文案、注入装扮仍生效、注入年 VIP 对手仍正确裁决且无横幅、商城与移动端无回归、0 异常 / 0 意外 404；截图 `docs/verification/noteoff-*-20261112.png`。详见 `docs/QA.md` 18:20 段。
- 边界：纯 UI 文案移除，不影响物理 / 规则 / 结算 / 胜率；未提交、未部署，Ctrl+F5。

## 18:30 台球击球卡死 / 球杆消失修复（未提交）
- 用户报「换了球杆，打了一球就卡死，球杆也不见了」，控制台：`createRadialGradient … The provided double value is non-finite`，堆栈 `drawPoolBall:42 ← drawReturnChannel:399 ← paint:219 ← frame:369`。
- 根因是桌球装扮批次的参数错位：`drawPoolBall` 第 9 参是 `light`、第 10 参才是 `options`；`pool-view.js` 的 `returnBall` 把 `{skin:bSkin}` 当 light（无 x/y → lx/ly NaN → 抛错 → rAF 链断 → 卡死、球杆不重绘），`ball()` 把 `{x:480,y:234,skin}` 当 light（不报错，但 `options.skin` 丢失，逐球主题皮肤一直没生效）。斯诺克 `sphere()` 传参原本正确。
- 修复：`pool-view.js` 两处改为 10 参数正确形式（`{x:480,y:234},{skin}` / `null,{skin:bSkin}`）；`pool-ball.js` 入口规范化 `r/x/y`，光源仅在 `light.x/y` 有限时启用，杜绝 NaN 进入 canvas API 杀死整帧。
- 新增 `tests/pool-return-light.test.mjs`（5 项，canvas 替身真实跑 painter）；`npm test` **549/549**；CDP `poollight-cdp.mjs` 修复前 4/9（精确复现同样报错与 `animating=true`）、修复后 **9/9**（0 异常、球杆恢复、按钮回「击球」）；noteoff 回归 **34/34**；版本链 `20261112-nonote1` → `20261112-poollight1`（65 文件 / 160 处，旧 key 0）。
- 截图 `docs/verification/poollight-*-20261112.png`；用户当前页仍是 `glowborder1` 缓存，须 **Ctrl+F5**。正向副作用：逐球主题配色与签名环现在真正生效（原需求补齐）。详见 `docs/QA.md` 18:30 段。

## 19:10 商城免费默认款 + 「装配中」斜标（未提交）
- 用户要求给商城加默认值：飞机=默认蓝色飞机、拖尾=无拖尾、光标=默认光标、五子棋=默认棋子/棋盘、台球=默认球/球杆/桌球台；**头像不设默认款**。同时「现在看不出哪个是装配的」，要恢复上批删掉的右上角斜标，但改为装配时才显示「装配中」。
- 口径：`默认` 是免费基线 / 原样外观，**不是第四档稀有度**；可购买三档仍为 `稀有 → 史诗 → 传说`，排序前置为 `默认 → 稀有 → 史诗 → 传说`。默认款 price 0、无 VIP perk、不出售、不参与会员免费与公共裁决。
- 商品 44 → **50**：新增 `trail-none`、`piece-default`、`board-default`、`ball-default`、`cue-default`、`table-default` 6 个 id；`plane-classic`/`cursor-star` 由 `rare` 改判 `default` 并改名「默认蓝色飞机 / 默认光标」。九分区卡片数 `[6,4,10,10,4,4,4,4,4]`。
- 状态层 `dist/site-points.js`：`RARITY.default={price:0,perk:''}`；默认常量改为 `plane-classic / trail-none / cursor-star / piece-default / board-default / ball-default / cue-default / table-default`；`cosmeticTheme()` 对 `*-default` 返回 `''`、`trailStyle('trail-none')` 返回 `''`；`applyEquipped()` 改为有值 `setAttribute`、无值 `removeAttribute`。新增 `SCHEMA=2` + `migrate()`：`LEGACY_AUTO → NEW_AUTO` 只迁移未显式改过的自动装配 Rare starter，显式选过 jade/aurora/rainbow 的不覆盖；`defaultOwned()` 保留旧 starter 免费拥有以免丢道具。
- 游戏侧 `dist/table/game-cosmetics.js`：新增 `BASELINE/isBaseline()/skinTheme()/setTheme()`，baseline 时不写 `data-cosmetic-*` 而是 `removeAttribute`；`myProfile()` 对 baseline board/table 传 `''` 不参与裁决；本地 bot 在玩家选默认款时被中性化（真实 opponentOverride 不变）。`pool-view.js` 桌面缓存条件改 `host._tableKey!==undefined && !==tableKey`，支持从主题台呢切回默认时重建原始蓝色桌面。
- 视觉：`site-shop.css` 新增 `default` 中性色 `#9fb0cf` 与恢复 `.shop-state` 绿色斜标（旋转 38°、12px、`:empty` 隐藏）；`site-shop.js` 的 `paint()` 仅在 `equipped` 时写 `装配中 / Equipped`，底部胶囊仍是「已拥有」；`site-cosmetics.css` 的 `default` 调色**只服务卡片预览**；`site-trail.css` / `site-trail-fx.js` 对 `none` 用虚线占位且只画飞机。
- 测试：新增 `tests/shop-default-baseline.test.mjs`（7 项，VM DOM 替身真实执行 `site-points.js`）；同步 11 份既有测试的硬编码断言；`npm test` **557/557**，7 个关键文件 `node --check` 通过。版本链 `20261112-poollight1` → `20261112-shopdefault1`（66 文件 / 161 处，旧 key 0）。
- Chrome CDP `shopdefault-cdp.mjs` **42/42**：50 卡 / 9 分区 / 8 默认 / 8「装配中」、斜标色 `rgb(47,158,109)` 与旋转、默认无 `data-shop-*`；真实点击 `cue-neon ↔ cue-default`、`trail-star ↔ trail-none` 验证斜标与属性发布/移除；pool 与 gomoku 默认款无 `data-cosmetic-*` 且 skin bridge 返回 `null`，主题装备 `ball=jade`/`cue=aurora` 生效；390px 零溢出；0 JS 异常、0 意外 404。截图 `docs/verification/shopdefault-*-20261112.png`。详见 `docs/QA.md` 19:10 段。
- 边界：免费基线只影响视觉与装配状态，不改物理 / 规则 / 结算 / 胜率 / 价格；未提交、未部署，用户当前标签仍是旧缓存，须 **Ctrl+F5**（静态服务实时读盘无需重启）。

## 19:45 四棋类改为各自独立商品，不再共用一套（未提交）
- 用户红框圈住「对局棋子」副标题的「一套造型四游戏通用」，纠正「我指的是都要设计，但是不是共用」。确认口径：**四个棋类各有独立商品与装备槽**（各买各的、各装各的、公共棋盘各裁各的）+ **商城按游戏分 4 个分区**；台球/斯诺克维持共用。
- 状态层 `dist/site-points.js`：删 8 个共享 `piece-*/board-*`，加 **32 个** `<game>-<piece|board>-<theme>` 商品（`four/gomoku/chess/xo` × 4 档），商品 50 → **74**；`equipped` 从 2 槽改 **8 槽**（`fourPiece/fourBoard/.../xoBoard`）；`kindOf()` 由 id 推自己的槽，`applyEquipped()` 按游戏发布 `data-shop-<game>-<piece|board>`（旧的 `data-shop-piece/board` 取消）；`cosmeticTheme()` 兼容新前缀；`SCHEMA=3` + `migrate()` 把旧存档拆成 8 槽，已付费主题复制四份并**免费拥有**，自动 starter 归默认，旧字段删除。
- 商城 `dist/site-shop.js`：2 个共享分区 → **4 个游戏分区**（每区 4 棋子 + 4 棋盘 = 8 卡），分区 9 → **11**；`renderSection()` 支持合并两个 kind，区内按等级排序且**同级棋子在前**；`replacedToast()` 带游戏名；Hero/页脚文案改「四游戏互不共用」。`site-cosmetics.css` 按 `data-cosmetic-game` 画 **4 种不同外形**：圆孔圆片 / 交叉线黑白子 / 棋盘格 ♞♙ / 井字格 X-O。
- 对局页：`game-cosmetics.js` 的 `readEquipped()` 读 8 槽、`myProfile(equip, game)` 只送当前游戏 board 进裁决、`profiles(game)` 由 `applyCosmetics()` 传 `activeGame()`、棋类分支只发布当前游戏的 piece/board；`cosmetics-rules.js` 的 `themeOf()` 支持新前缀（旧 `board-neon` bot 档案仍可解析）。`game-cosmetics.css` 无需改（本来就按 `#board.four/.xo/.chess/.gomoku` 分别渲染）。台球分支未动。
- 测试：新增 `tests/board-per-game.test.mjs`（3 项，DOM 替身真实跑对局模块）；重写 `tests/shop-default-baseline.test.mjs`（14 基线 / 8 独立槽 / schema 3 迁移与免费补偿）；同步 7 份既有测试硬编码；`npm test` **561/561**，7 文件 `node --check` 通过。版本链 `20261112-shopdefault1` → `20261112-boardpergame1`（68 文件 / 163 处，旧 key 0）。
- Chrome CDP `boardpergame-cdp.mjs` **44/44**：74 卡 / 11 分区 / 14 基线 / 14「装配中」、4 个游戏分区各 8 卡且预览 computed 背景四种全不同；真实点击 `gomoku-piece-neon` 走兑换弹窗购买后，只有五子棋的斜标与 `data-shop-gomoku-piece` 变化、其它三游戏不动；四个对局页分别发布 `neon/jade/aurora/无皮肤`；390px 零溢出；0 异常 / 0 意外 404。截图 `docs/verification/boardpergame-*-20261112.png`。详见 `docs/QA.md` 19:45 段。
- 注意：每个游戏分区内「默认棋子」与「默认棋盘」各自显示「装配中」，因为是两个独立装备位，符合「不共用」语义。边界：裁决规则 / 台球共用链路 / 物理 / 规则 / 结算 / 胜率 / 价格均未改；未提交、未部署，须 **Ctrl+F5**。

## 20:02 / hover501 — 悬停黄色内框 50% 透明度

- 需求口径先用选项确认过：改的是**鼠标移到卡片上时出现的黄色内框**（`.shop-card::after`），不是卡片深色底板，也不是静止时的稀有度发光外框。
- `dist/site-shop.css`：`.shop-card:hover::after,.shop-card:focus-visible::after{opacity:.5}`（原 `1`）。边框色 `#ffd84d`、辉光 `#ffd84d55`、静止 `opacity:0`、`transition:opacity .18s`、`1px` 稀有度外框、`#080e22` 底板全部不变；透明度作用于整层，边框 + 辉光同比变淡，hover 时仍只有一条框。
- 测试：新增 `tests/site-shop-hover-frame-50.test.mjs`（4 项），同步 `site-shop-rarity.test.mjs` 的 `opacity:1` 断言；`npm test` **565/565**。版本链 `boardpergame1 → hover501`（69 文件 / 164 处，旧 key 0）。**本仓库 cache key 必须保持纯 `[a-z0-9]+`**：初版 `20261112-hover50-1` 被 3 份旧测试的 `?v=(20261112-[a-z0-9]+)` 正则截断，误报 stale key。
- Chrome CDP `hover50-cdp.mjs` **22/22**（端口 9301）：真实鼠标悬停 computed `::after.opacity='0.5'`、静止 / 移出 `'0'`、稀有卡与已装配卡同值、hover 外边框透明保证单框、`:focus-visible` 共用规则、0 异常 / 0 意外 404、390px 零溢出。截图 `docs/verification/hover50-*-20261112.png`，并排对比图 `hover50-before-after-20261112.png`。详见 `docs/QA.md` 20:02 段。
- 边界：纯 CSS 视觉改动，未提交、未部署，须 **Ctrl+F5**（静态服务实时读盘无需重启）。

## 20:11 / frameback1 — 回退悬停内框 50% 透明度

- 用户「这个边框回退吧」：20:02 的 50% 透明度方案**整体撤销**，恢复原来全亮黄框。以上 20:02 段仅作历史记录，勿照抄。
- `dist/site-shop.css`：`.shop-card:hover::after,.shop-card:focus-visible::after{opacity:1}`（从 `.5` 改回），注释同步。其余（边框色 / 辉光 / 静止隐藏 / 过渡 / 1px 外框 / 深色底板）与 `boardpergame1` 时期完全一致。
- 测试：`site-shop-rarity.test.mjs` 断言与描述恢复 `opacity:1`；删除新增的 `tests/site-shop-hover-frame-50.test.mjs`。`npm test` **561/561**（回到改动前基线数）。
- 版本链 `hover501 → frameback1`（68 文件 / 163 处，旧 key 0）；换新 key 而不复用 `boardpergame1`，避免浏览器命中 50% 版本缓存。
- Chrome CDP `frameback-cdp.mjs` **21/21**（端口 9302）：CSSOM 半透明规则 0 条、真实 hover computed `opacity='1'`、静止 / 移出 `'0'`、稀有卡同值、仍单框、0 异常 / 0 意外 404、390px 零溢出。截图 `docs/verification/frameback-*-20261112.png`，对比图 `frameback-revert-compare-20261112.png`。详见 `docs/QA.md` 20:11 段。
- 边界：纯 CSS 回退；未提交、未部署，须 **Ctrl+F5**（用户当前标签是 50% 版本缓存）。

## 2026-11-12 开球连续硬球声（breakclack1，本地未部署）

用户仍觉得开球不像多个台球接连碰撞。pool-audio.js 已把旧的最多24声/120ms长尾连发改为密集 ball 群最多10个代表碰撞、0–243ms逐渐疏开；现有 CC0 单球录音缩为38ms/3ms平台、7200Hz、原始音高，取消预约声数带来的二次音量衰减。至少3个可听球球事件才进入该音色，单/双球和库边保留普通声音；物理、规则与视觉未改，斯诺克共享此模块。缺录音时为38ms硬球合成备用。

当前主链实测10声/243ms、回放重建8声/166ms。旧23声/120ms与新方案在 http://127.0.0.1:8080/pool-break-audio-preview.html 可直接对比；新按钮调用正式模块，旧版仅作为试听页历史声音保留。npm test 562/562，语法与Chrome素材/播放触发验收通过，详见QA同日章节。最终听感待用户确认，未做整局录音或跨设备联机验证。音频所有import统一20261112-breakclack1；刷新旧游戏页需Ctrl+F5。当前参数同步到POOL-IMPACT-EFFECTS.md §3.5/3.8。


## 2026-11-12 最新音效：用户选 A，随后要求多次碰撞合并（hitmerge1）

覆盖上一节breakclack1音色与节奏：用户已选第一款A「干脆短击」，正式录音改为ball-clack-a.wav（juskiddink108615，CC BY4.0；必须保留assets/audio/pool/LICENSE.md署名）。单次与密集碰撞都保持原音高，不再随机变调或低通。开球按0/2.8/6.5/11/18/29/46/70/101/139ms把最多10次A碰撞叠加成一个PCM声源，总长约229ms，统一绝对包络headroom上限.86，强弱仍不同。至少3个可听ball才合并；单/双球、库边、木声与物理保持各自行为。

试听 http://127.0.0.1:8080/pool-hit-audition.html 顶部提供「A · 单独一下」「A · 多球叠加」和下载；其余三款只作历史候选。导出复合声在docs/verification/pool-hit-A-merged-20261112.wav，重复三次；与正式混音输出差最多1个PCM16量化单位。浏览器已验正式模块精确/重建路径，相关38测试、npm test564/564、语法通过。A单击是用户明确选择，多球叠加仍待听感反馈。未提交、未部署；pool-audio所有引用统一hitmerge1，旧游戏页需Ctrl+F5。


## 2026-11-12 当前 A 加厚版（hitbody1，覆盖 hitmerge1 的原A音色）

用户反馈A偏脆像乒乓球，要求结实些。正式单击/叠加现统一使用ball-clack-a-solid.wav；原A保留作对照。只对原实录离线EQ：2020Hz/Q1.3/-11dB压共振、800Hz/Q.85/+9dB补主体，不变调/不加混响/不加新振荡器；90ms单击与229ms多球时间不变。可复现脚本scripts/build-pool-solid-hit.mjs，数据与两段三连试听在verification/pool-hit-A-solid-20261112.*及pool-hit-A-solid-merged-20261112.wav。CC BY4.0署名与处理说明仍在assets/audio/pool/LICENSE.md。

主体能量3.44%→29.36%，实际RMS约-1.64dB，非单纯加响；峰值.77997、无削顶、短尾。内置浏览器旧A→新版A对比/新版叠加/导出通过，导出单击与脚本的PCM16最大差1量化单位；npm test564/564，语法通过。试听页顶部现在是「A加厚版」，原四款折叠为历史。具体听感待用户确认；未提交/部署。pool-audio引用统一hitbody1，旧游戏需Ctrl+F5。


## 2026-11-12 连续多球声（hitdense1，覆盖此前渐疏节奏）
用户要求多球碰撞几乎连在一起、没有中间空隙。保持加厚A音色，10次接触改为0/2.1/4.6/7/9.8/12.3/15.1/17.6/20.5/23ms，最大间距2.9ms，取消后段分开的碰撞；仍混合为单一PCM，含90ms素材尾总长113ms。原139ms启动窗口/229ms总长为历史。物理与单击不变，听感待用户确认。


## 2026-11-12 新版A继续加厚（hitbody2）
用户要求结实单击再厚一些：EQ改为2020Hz/Q1.3/-14dB、720Hz/Q.8/+12dB。主体300–1500Hz由上一版29.36%提高到48.08%，尖锐共振区降至44.46%；峰值仍.77997、90ms单击不变，RMS .03646，没有单纯放大。连续多球仍23ms启动窗口/113ms总长。上一版资产保留audition/a-solid-v1.wav。生成脚本及署名同步，听感待用户确认；未部署。


2026-11-12 用户确认采用再加厚A，并要求多球叠加。已核对正式素材与上条单击试听为同一v2音色，现有连续混音直接使用它；导出pool-hit-A-solid-v2-merged-20261112.wav。单击素材与导出、多球混音与导出PCM16最大差不超过1量化单位。23ms紧密接触窗口/113ms整簇，试听重复三簇。代码无需再次变更，未重复全量测试；上一轮564/564仍为最近完整回归。


## 2026-11-12 音效回退（hitrollback1）
用户否决继续加厚版，恢复上一版加厚 A：2020Hz/Q1.3/-11dB、800Hz/Q.85/+9dB。运行时 WAV 与保存的 audition/a-solid-v1.wav 逐字节一致；保留多球 23ms 连续叠加节奏。缓存标记更新为 20261112-hitrollback1。npm test：564/564 通过（pool-hit-rollback-20261112-tests.log）；构建及音效 JS 语法检查通过。当前 8080 服务连接被拒绝，未完成本轮 HTTP 或浏览器验证；未部署。


## 2026-11-12 五子棋与斯诺克材质预览（natural1，待用户确认）
五子棋：浅暖实木色、细网格、简化外沿，黑白棋子改柔和反光与小型末手标记。保持原 17 条显示线 / 内部 15×15 可落子点及命中映射。
斯诺克：按用户参考图 docs/design/snooker-user-reference-20261112.png 调整红棕木框、柔和木纹、独立细绒绿呢，去掉重复内框亮线及袋口装饰环；保留原袋口和库边几何。新增 snooker-cue.js 与 snooker-power-cue.svg，默认白蜡木色前段、深色拼接后把，两处球杆同步风格；仍支持装备配色。未改欢乐台球绘制、规则、物理、计分或音频。
验证：修改 JS 语法检查通过；npm test 564/564，通过日志 docs/verification/board-materials-20261112-tests.log。内置浏览器检查五子棋示例棋子、斯诺克正式单机开局及独立预览落袋；演示红球进袋后 1:0 / 彩球 / 单杆1，击球按钮恢复；斯诺克两个页面未捕获 error 日志。未验证真实手机、联机或已装备所有主题组合；纯 Canvas/SVG 材质绘制，非照片扫描素材；未部署。
效果图：docs/verification/gomoku-natural-20261112.png、docs/verification/snooker-natural-20261112.png、docs/verification/snooker-natural-live-20261112.png。用户需 Ctrl+F5 刷新现有标签页；未宣称最终视觉批准。


## 2026-11-12 斯诺克六袋口打开（openmouth1，待用户确认）
反馈图：docs/design/snooker-closed-mouth-feedback-20261112.png。此前角袋的前侧圆弧跨过入袋方向，中袋亮线朝台面弯；仅减弱高光不能形成真实开口。现改为六段独立库边，两端各自延伸到相邻袋洞内；填充、投影和亮线共用同一轮廓，入口不再跨接。球台木框、材质、球杆沿用 natural1。
落袋显示同时修复：snookerCirclePath 原来将圆形袋洞与台面矩形分开，默认中袋留下 7 单位裁切缝；现以连续渐宽通道连接，随下沉深度收拢，完全下沉后裁切为空。仅显示层调整，物理袋口、半径、击球结果和计分不变。
验证：修改 JS 语法检查通过；npm test 568/568（docs/verification/snooker-open-mouths-tests-20261112.log）。几何测试覆盖六个入口成对端点、贝塞尔两侧不跨中心线、8 单位球半径通过空间；新增落袋裁切测试覆盖连续通道、球体完整性、随深度收缩及原袋洞尺寸。浏览器正式绘制函数的六袋放大图与中袋/角袋 0、80、160、400ms 固定帧检查通过；独立预览真实进球完成 1:0 / 彩球 / 单杆1，击球按钮恢复，最终预览无 error 日志。固定帧不是整局录像；未做远程联机或实体手机验证，未部署。
验收入口：/table/snooker-mouth-preview.html。六袋特写：docs/verification/snooker-open-mouth-six-20261112.png；含落球帧全图：docs/verification/snooker-open-mouth-details-20261112.png；全桌：docs/verification/snooker-open-mouths-20261112.png。现有页面需 Ctrl+F5 刷新。


## 2026-11-13 袋洞厚度、库边收口与中央灯光（pocketdepth1，待用户确认）
参考：docs/design/snooker-pocket-depth-reference-20261113.png、snooker-cloth-light-reference-20261113.png。保留 openmouth1 的六个开放通道与原物理，进一步将绿色库边画为各自封闭的实体轮廓；去掉整圈绿色袋边、前唇环和袋口径向黑晕。木质后侧倒角/暗壁与直边准确衔接，洞内为深黑。库边投影放到独立缓存层，入口通道清除投影，保留两侧库外接触阴影。
台呢增加细绒纹和低对比起伏，灯光改用共享 snooker-light.js 的精确中心 (500,250)。斯诺克球体开启独立 overhead 选项：高光向中央灯，投影背向灯，接触核心贴在球下；桌面和落袋球使用同一灯光坐标。共享 pool-ball 默认分支沿用原欢乐台球表现；未改半径、规则、物理和计分。
实测：修改 JS 语法通过；npm test 572/572（docs/verification/snooker-depth-light-20261113-tests.log）。新增光向/投影/坐标一致性测试；浏览器检查六袋特写、固定时刻落袋帧与九位置红球光向图、正式单机开局。入口 1092 点与相同坐标原台呢对照最大 RGB 差 0；四处直库外侧绿通道下降 15/15/13/15，证明阴影留在外侧。正式页未捕获 error 日志。本轮固定落袋帧不是整局录像；未验证联机或实体手机，未部署。
效果图：docs/verification/snooker-depth-mouths-20261113.png、snooker-depth-light-audit-20261113.png、snooker-depth-light-live-20261113.png。验收页 /table/snooker-mouth-preview.html 已保留像素对照与中央灯光场景。现有页面需 Ctrl+F5 刷新；用户认可上一轮开放入口不代表本轮最终批准。


## 2026-11-13 斯诺克瞄准/收球槽与商城头像（guidecollector1 / avatar2，待用户确认）
- 用户参考已保存：docs/design/snooker-guide-feedback-20261113.png、snooker-guide-reference-20261113.png、snooker-collector-reference-20261113.png、snooker-jaw-tip-feedback-20261113.png、shop-avatar-feedback-20261113.png。
- 瞄准入射线、目标球出射线、ghost 和等待提示圈共用白色 2.4 单位描边与细暗边；保留真实球半径、命中计算及等待脉冲时序。六段绿色库边内外轮廓在袋洞边缘收合，台呢改用 Pool 同源细斜织纹，中央顶灯和入口无投影保留。
- 右侧新增黄铜收球槽，画布扩至已有 TABLE_WIDTH=1232，比赛台面与 PAD 坐标不变，窄屏比例同步。snooker-collection.js 只依据最终棋盘中实际缺席的球 ID 收集：白球不收集、需要复位的彩球不留槽；回放等袋内下沉结束再滚入，重复快照去重，重新开局清空，重连及 reduced motion 直接显示停稳位置。未改规则、物理、计分或音频。
- 商城十款头像使用 imagegen 原创柔和角色插画，512×512 PNG 位于 dist/assets/shop/avatars-v2/；商品 ID、价格、等级与装备行为保留。assetUrl 同时供卡片、详情和已装备头像使用；仅头像资源用 AVATAR_VERSION=20261113-avatar2。公共 VERSION 与页面脚本标签维持原值，本地 no-store 服务，现有页面请 Ctrl+F5。来源与提示词见 docs/AVATAR-ASSETS-20261113.md、docs/avatar-prompts-20261113.json，设计总览 docs/design/shop-avatars-v2-20261113.png。
- 实测：7 个修改 JS 的 node --check 通过；npm test **578/578**，日志 docs/verification/snooker-avatars-20261113-tests.log。新增6项收球功能测试覆盖复位/白球排除、重复快照、分时回放、连续路线、全台21球间距、重连及 reduced motion；头像测试调用真实 assetUrl 并检查10张PNG签名/512尺寸。
- 浏览器：六袋特写入口1092点对照原台呢最大RGB差0，四处直库外侧阴影绿通道下降15/15/12/15；正式单机开局、独立真实进球演示通过，红球进中袋后比分1:0/彩球/单杆1且槽底仅一红球。商城10款显示完整，猫头鹰详情和390px星仔详情可见；只查看并取消兑换，未扣余额或更换装备。正式斯诺克、独立进球预览、商城未捕获 error 日志。390px宽度检查无横向溢出，球桌比例保持1232/644；未验证实体手机、远程联机或真实支付，未部署。
- 最终效果：docs/verification/snooker-guide-collector-live-20261113.png、snooker-guide-collector-pot-20261113.png、snooker-joined-jaws-20261113.png、snooker-guide-collector-mobile-20261113.png、shop-avatars-v2-20261113.png、shop-avatar-owl-dialog-20261113.png、shop-avatars-v2-mobile-20261113.png。截图与自动检查不代表用户最终视觉批准。


## 2026-11-13 库边内层去阴影（innerlight1，待用户确认）
用户标注 docs/design/snooker-inner-shadow-feedback-20261113.png 指的是绿色库边本体内部。去掉该带内的深色渐变与4px暗鼻线，仅保留柔和正向高光及闭合浅色轮廓；台呢侧外投影和袋口入口清除保持原样。袋口几何、中央灯、瞄准线、收球槽及头像均未变。
验证：两份修改JS语法检查通过；npm test 578/578（docs/verification/snooker-inner-light-20261113-tests.log）。浏览器正式绘制函数六袋特写通过，无error日志；新增预览像素核对绿色内层2340点最大压暗0、入口1092点最大RGB差0，外侧阴影四点绿通道下降15/15/12/15。效果图 docs/verification/snooker-inner-light-20261113.png。本次仅局部材质修正，未重测联机、真实手机；现有页面 Ctrl+F5 刷新，未部署。


## 2026-11-13 四角袋口稍微扩大（待用户确认）
参考 docs/design/snooker-corner-wider-feedback-20261113.png。只把表现层 SNOOKER_CORNER_R 从32调到36，默认比例下半径16→18（+12.5%），四角对称扩大；洞心与中袋不变。黑洞、后壁倒角、库边端头和 snookerCirclePath 落袋裁切共用同一半径，避免只扩大黑圆造成边界错位。物理捕获/碰撞与计分未改。
验证：pool-geometry.js 语法检查通过；npm test 578/578（docs/verification/snooker-corner-wider-20261113-tests.log）。浏览器六袋特写确认四角扩大、中袋原样，无error日志；入口1092点最大RGB差0、绿色内层2340点最大压暗0、外投影四点下降15/15/12/15。效果图 docs/verification/snooker-corner-wider-20261113.png。沿用现有本地 no-store 服务，Ctrl+F5 刷新；未部署或重测远程联机。


## 2026-11-13 收球回弹、抬高桌灯与库边收窄（已验证，待用户确认）
本节记录这一轮已完成的三项调整，不包含随后追加的需求。设计反馈：docs/design/snooker-collector-reaction-feedback-20261113.png、docs/design/snooker-lamp-height-feedback-20261113.png、docs/design/snooker-cushion-width-feedback-20261113.png。

收球槽中落到底部或碰到已有球时，增加 250ms 的两段回弹；21 球排列间距测试通过。共享桌灯高度由 420 提高到 640，中央位置仍为 (500,250)，典型球位的阴影中心偏移缩短 21–29%，保留朝灯高光、背灯投影与贴地接触核心。绿色库边宽度由 20 收到 16（外缘收窄20%），内沿 0 / 1000 / 500 保持不变，未借此改变球路或物理边界。

验证：修改 JS 语法检查通过；已运行 npm test，581/581 通过，日志 docs/verification/snooker-rebound-light-20261113-tests.log。浏览器三个独立验收页核验完成，未捕获 error 日志；绿色内层 1716 点最大压暗 0，入口 1092 点最大 RGB 差 0，四处库边外投影绿通道下降 15/15/13/15。正式渲染器的本地进球演示已出现 1:0 / 彩球 / 单杆1；本轮没有保存最新全桌对局图，以下局部及独立预览截图不作为最新完整对局截图。未验证远程联机或实体手机，未部署。

效果图：docs/verification/snooker-slim-cushions-20261113.png、docs/verification/snooker-raised-light-20261113.png、docs/verification/snooker-collection-rebound-20261113.png。以上是本地实现与核验记录，不代表用户最终视觉批准。

## 2026-11-13 白圈停留、紧凑金属入口与黑洞内动画（wellmotion1，待用户确认）
- 白色目标提示圈保留原600ms渐入/渐出，中间增加1000ms完整停留；单次可见时长1200→2200ms，原10秒等待和5秒周期、白色描边/尺寸不变。
- 右侧集球槽入口高度41→28，缩小约32%；下弯头与上扣环上移。增加各管身独立的金属截面明暗、窄白金反光、暗侧与铆钉倒角；竖槽、底部和上轮250ms收球回弹保留。
- 新增独立 snooker-pocket-motion.js，正式 snooker-view 的袋内绘制与碰撞声共用该动作。保留真实回放捕获点，先通过入口进入真实黑洞；擦边球按实际入袋速度在黑洞内旋转，正面球1–4次衰减回弹后下沉。完整球体受黑洞范围约束，不再按共享Pool大袋路径缩放而在绿色入口打圈。已在洞内的捕获点不向外推移；完整下沉不超过原650ms生命周期。仅表现层修改，未改进球判定、物理、比分或Pool默认动画。
- 原图：design/snooker-ring-hold-feedback-20261113.png、snooker-collector-metal-feedback-20261113.png、snooker-pocket-cloth-orbit-feedback-20261113.png、snooker-pocket-black-orbit-reference-20261113.png、snooker-pocket-glance-reference-20261113.png、snooker-pocket-rebound-reference-20261113.png。
- 实测：8份修改JS及4份预览页内联脚本语法检查通过；npm test **588/588**，日志 verification/snooker-wellmotion-20261113-tests.log。新增测试检查六袋全球轨迹边界、连续入洞、力度分级、接触/反转时刻、缓存/旧快照、洞内初始点和650ms退场，以及缩小入口后的球体通行间隙。
- 浏览器：上中袋、左上角袋轻/中/重擦边与正面固定帧通过；六袋两种方向三种力度共21720次洞内采样，完整球体越过黑洞边缘0次。绿色内层1716点最大压暗0，入口1092点最大RGB差0，外投影下降15/15/13/15。正式渲染器本地进球演示显示1:0 / 彩球 / 单杆1、击球按钮恢复及槽底一红球；金属入口、袋内预览、六袋页、实际渲染演示均未捕获error。白圈延时按实际渲染代码核对，本轮未录制其完整计时视频。未验证实体手机、远程联机；未部署。
- 预览：/table/snooker-pocket-motion-preview.html（连续播放，可选六袋；?frame=well固定洞内帧）、/table/snooker-collection-preview.html。效果图：verification/snooker-blackwell-motion-20261113.png、snooker-blackwell-corner-20261113.png、snooker-compact-metal-20261113.png、snooker-wellmotion-live-20261113.png。页面仍使用现有本地no-store服务，Ctrl+F5刷新。截图与测试不代表用户最终视觉批准。
## 2026-11-13 库边对称、透明瞄准圈、同源碰撞声与人脸头像（humanring1 / avatar3，待用户确认）
- 绿色长库两端使用同一贝塞尔弧的镜像形状：中袋肩部从约9.93扩到22.37单位，与角袋端头一致；四个长库对称。中袋木质倒角覆盖1.4单位接缝，去掉左右两处浅色亮头，保持黑洞半径/中心和开放入口。新增四种尺寸下的六段端头镜像检查。
- 瞄准线在白圈近侧边缘停止，去除圈内短线；瞄准圈和等待提示圈增加20%白色透明膜，白色描边、真实碰撞半径和上轮延长1秒停留保留。提示膜在球体下方绘制。
- 斯诺克实际碰撞事件直接交给和Pool相同的 poolImpact / poolImpactBurst，不再额外 chainLevels 放大已测得的强度；只有无事件帧回放仍保留双方原有补偿。两游戏继续共享A v1球撞声、增益和音高；生产ball-clack-a-solid.wav与audition/a-solid-v1.wav的SHA256相同（7D6AB1E9350DD3585D0F4DC17457DDA389F4033594D7DECEE4701B971D323D34）。独立袋内接触时刻及木质碰袋声未撤销。本轮未重新制作音频样本。
- 商城10款头像替换为原创人脸插画（男女各5、不同友好表情），运行素材 dist/assets/shop/avatars-v3/*.png，全部512×512；assetUrl独立版本20261113-avatar3。显示名称及中英文说明同步更新，商品ID/价格/稀有度/拥有和装备关系不变，旧v2素材保留。制作来源、映射及完整提示词见 AVATAR-HUMAN-ASSETS-20261113.md / avatar-human-prompts-20261113.json；总览 design/shop-human-avatars-v3-20261113.png。公共VERSION未修改。
- 参考图：design/snooker-symmetric-jaw-feedback-20261113.png、snooker-wood-junction-feedback-20261113.png、snooker-filled-ring-reference-20261113.png、snooker-empty-ring-feedback-20261113.png、shop-human-avatar-feedback-20261113.png。
- 验证：9份修改JS及5份预览HTML内联脚本语法通过；npm test **589/589**，日志 verification/snooker-human-avatars-20261113-tests.log。17项袋口/光照/几何及25项现有音频检查均通过，头像资源测试检查真实assetUrl、PNG签名和512尺寸。没有以录音试听代替样本一致性验证的声明。
- 浏览器实际检查：六袋特写确认中袋宽缓弧与木色接缝；实际渲染器本地进球demo完成1:0/彩球/单杆1；重新开局看球前瞄准圈，透明膜内不再有瞄准线。商城10款人脸及新名称显示齐全，阳光青年详情正常；仅打开并取消详情，没有购买或更换装备。商城和球桌未捕获error。本轮未重测实体手机、远程联机或支付，未部署；现有本地页Ctrl+F5刷新。
- 截图：verification/snooker-symmetric-wood-jaws-20261113.png、snooker-clear-aim-circle-20261113.png、shop-human-avatars-v3-20261113.png、shop-human-avatar-detail-20261113.png。当前截图和自动测试不代表用户最终视觉批准。
## 2026-11-13 个人装扮、分级光标与同脸型头像（personal1 / pointer1 / avatar4）

最新头像反馈覆盖上一节 avatar3：十款改为同一种圆角方脸、同肤色，以表情与配饰区分。光标每档两款并按用户要求分级动画；Four/Gomoku/XO 只售个人棋子/标志，Chess 只售棋盘，原始棋子保留。旧拥有记录保留，停用商品槽恢复默认。范围、接口与最终参考图见 [本轮交付记录](SHOP-PERSONAL-COSMETICS-20261113.md)。

实际验证：`npm test` 600/600；11份JS语法通过；Maven 111项，90通过、21项数据库/Redis集成检查因环境未配置跳过。商城与只读实际渲染预览通过，未修改钱包；未验证真实跨设备联机或购买资格，也未部署。房间API仅同步认证席位的白名单外观选择，不能作为服务器已验证所有权的证据。日志和截图在上述记录中，旧记录保持历史含义，当前视觉仍待用户试用。

## 2026-11-13 开心笑脸设为免费默认头像

用户指定 `avatar-starling` 为默认值：默认等级、0 Joy Coin、首次拥有并装配。空/无效旧头像值自动回到开心笑脸；已有其他有效头像选择、拥有记录和余额保留。恢复默认与切回均免费，跨标签同步采用相同规则。只调整现有商城前端默认值，未改远端玩家头像或购买资格服务。

验证：两份修改JS语法通过，定向49/49及 `npm test` 604/604通过；日志 `verification/shop-default-avatar-20261113-tests.log`。实际商城显示「默认 / 已拥有 / 装配中」，原1,000价格消失，余额仍10,000。用户原图 `design/shop-default-avatar-reference-20261113.png`，最终截图如下；未部署。

![开心笑脸免费默认头像](verification/shop-default-avatar-20261113.png)


## 2026-11-13 四子连珠通透圆片与声画反馈

默认青绿/粉红玻璃圆片与桃木棋盘；落子触底和回弹同步音；2/3 连提示光、4 连胜利光环/粒子/结果音，落稳后保留棋盘 1600ms 再结算。用户参考、实际截图、实现边界与验证限制见 [专项记录](FOUR-FEEDBACK-20261113.md)。此项尚待用户试用视觉与听感确认；未改游戏规则。

## 2026-11-13 02:15 · 商城「四子连珠」棋子 / 棋盘分栏（`20261112-gamelanes1`）

- 用户截图「棋子和棋盘要分开两个栏位」→ 选项确认：**保留 1 个游戏分区，内部上下两个带小标题的横栏**（棋子 / 棋盘），每栏 4 张卡按 默认 → 稀有 → 史诗 → 传说；总分区数仍 **11**。四子连珠是当前唯一同时有两类商品的分区（五子棋 / 井字棋只有棋子，国际象棋只有棋盘）。
- `dist/site-shop.js`：卡片模板抽为 `cardHtml()`、网格抽为 `gridHtml(modifier,items)`；`kinds.length>1` 时按 kinds 顺序生成两个 `.shop-lane`（`data-lane="piece" / "board"`），栏内 `items.filter(...)` 保持等级序，单 kind 分区输出完全不变。`dist/site-shop.css` 新增 `.shop-lane*` 左侧 2px 强调条（棋子蓝 `#63b3ff`、棋盘金 `#ffc861`），不重定义列数、不改卡片宽度。
- 视觉：每栏 4 卡占六列网格前 4 列，卡片实测同为 `239px`，不再出现「6 张 + 第二行 2 张」交错。截图 `verification/gamelanes-four-section-20261112.png`、`verification/gamelanes-mobile-390-20261112.png`（390px 两栏上下堆叠、零溢出），已人工复核。
- 验证：新增 `tests/shop-game-lanes.test.mjs`（5 项，VM 真实渲染商城 DOM）、更新 `tests/site-shop-rarity-order.test.mjs` 四子连珠顺序断言；本批相关 7 份测试 **48/48**。Chrome CDP `.workbuddy/tmp/gamelanes-cdp.mjs`（端口 9303）**25/25**：11 分区 / 59 卡 / 恰好 2 栏且仅在 `four`、栏序 `piece → board`、标题与副标题、每栏 1 网格 + 4 卡且 id 家族不混、等级序、六列网格与卡宽一致、12 个「装配中」斜标不变、点击已拥有的 `four-piece-default` 无弹窗；`exceptions: 0`、`unexpected404: []`。原始日志 2 条 `404 /api/me` 为静态预览预期请求，已过滤。
- 版本链 `20261112-frameback1 → 20261112-gamelanes1`（71 文件 / 151 处，dist 旧 key 残留 0）；`node --check dist/site-shop.js` 通过，`shop.html` / `site-shop.css` 均 200。
- 基线注意：本会话开始前（20:12–02:01）另一批工作改动 163 个文件，测试总数 561 → **646**，全量 `npm test` **642/646**；4 项失败均为既有基线问题（商城「累计积分」文案与货币文案契约冲突 3 项、`SHARED_BOARDS` 与 note-off 夹具 `reason` 断言冲突 1 项），非本批引入，未擅自改动其它子系统。详见 `docs/QA.md` 02:15 段。
- 边界：纯商城排版改动，不动商品 / 装备槽 / 裁决 / 游戏逻辑 / 价格；未提交、未部署；用户当前标签页是旧缓存，须 **Ctrl+F5**（静态服务实时读盘无需重启）。

## 2026-11-13 02:35 · 击球音色回退到前天（11-11）最终版（`20261112-hitbefore1`）
- 用户「现在击球的声音有点问题，可以改回昨天的声音吗」→ 探针确认当前代码与素材本来就是 11-12 21:10 的 `hitrollback1`（WAV 哈希一致、录音 ready、WAV 200、0 JS 异常），11-13 未改过 Pool 击球音效，排除「退回合成音」类真 bug；给出候选后用户明确选择「**刷新到前天的最终版**」，即跳过昨天 6 轮 A 系列迭代，回到 11-11 的 CC0 实录音色。
- `dist/table/pool-audio.js`：素材 `ball-clack-a-solid.wav` → `ball-clack.mp3?v=20261112-hitbefore1`；恢复 `lastVariant` + `[.97,1,1.03]` 三变体（相邻不重复）、`lowpass 2500+3500*level`、`.08+.55*level^.75` 增益与声部密度衰减、onset 裁切 + `RECORDED_TAIL=.11`；`recordedImpact` 签名补成 `(strength,delay,playbackGain,variant,toneLock)`（调用点原本就传 5 参，是 11-12 简化留下的失配残留）；连锁 toneLock 仍锁原速 / `4200Hz`；新增 `recordedSlice()` 让合并 PCM 也用裁切片段，避免 mp3 静音拖尾。
- **保持不变**：23 ms 合并 PCM 开球节奏（11-12 用户明确要求）、`chainLevels`、袋口木质 / 库边 / 滚动 / 出杆合成音、物理 / 规则 / 结算。A 系列 3 个 WAV 保留在磁盘供试听对照；`dist/assets/audio/pool/LICENSE.md` 已注明生产回到 CC0 mp3 并保留两处署名。**11-12 的 24 声/120ms 旧开球节奏未恢复**——只换了音源，若用户要连节奏一起回前天需另做。
- 版本链只 bump 音频模块：`hitrollback1 → hitbefore1`（13 文件 / 14 处），dist 旧音频 key 0；其余模块仍各自 `gamelanes1` / `natural1`，强制刷新素材缓存。
- 验证：新增 `tests/pool-hit-before.test.mjs` 5 项，同步 2 份旧断言；音频 4 份 32/32、专项 5/5、全量 `npm test` **647/651**（4 项失败与改前完全同一批：商城「累计积分」文案 3 项 + note-off `reason` 夹具 1 项，系其它会话遗留）。Chrome CDP `hitbefore-cdp.mjs` **18/18**：真实进入 Pool 对局、mp3 200、旧 wav 0 请求、三变体 `.97/1/1.03` 全出现、低通 4950Hz、110ms 窗口、toneLock 连锁 1/4200Hz、开球仍 1 个合并声源、0 JS 异常 / 0 意外 404 / 390px 零溢出。截图 `verification/hitbefore-*-20261113.png`，含改前/改后参数对照图（已人工复核）。
- 限制：未作真人扬声器听感验收；浏览器三变体为 float32 近似值，断言按容差；该 mp3 首样本即有声故 `onset=0`，裁切逻辑由带静音的 Node mock 覆盖。未提交、未部署，须 **Ctrl+F5**。详见 `docs/QA.md` 02:35 段。

## 2026-11-13 02:45 · 排行榜头像框改为圆角方形（`20261113-avatarframe1`）
- 用户截图红框圈出排行榜头像列：「头像现在是方的，框要改下」。诊断：10 款 `avatars-v4` 头像是圆角方形桃色脸（`#F3D2AD` + 四角透明），两个排行榜却套 `border-radius:50%` 圆环，导致方脸四角露出深色底；商城头像卡本来就用 ≈22% 圆角方形，所以**保留方形插画、改框**。
- `dist/rank-badges.css` 新增共用规则 `body.table-home-theme #leaderboard .seat-avatar, .leaderboard-avatar{border-radius:22%;background-color:#F3D2AD}`：id 限定选择器压过 `table.css` 的旧 50% 圆角，百分比半径覆盖 29–45px 所有断点，桃色底填掉透明边距，白 / 会员金边框与光晕跟随新形状。带圆形翼环的 `.leaderboard-avatar[data-frame=gold|cloud|night]` 例外保留 50%。
- 范围只有两个排行榜；账号弹窗 / 房间座位 / 胜利头像仍圆框（截图未涉及），头像 SVG、装备槽、裁决、文案均未改。版本 `20261109-yearvip1 → 20261113-avatarframe1`，只 bump `dist/index.html` 与 `dist/table/index.html` 两处 CSS 引用。
- 验证：新增 `tests/leaderboard-avatar-frame.test.mjs` **5/5**；全量 `npm test` **652/656**（新增 5 项后总数 651→656，4 项失败仍是其它会话遗留的商城文案 3 项 + note-off 夹具 1 项）。CDP `avatarframe-cdp.mjs` **7/7**：`50%/transparent → 22%/rgb(243,210,173)`、边框颜色不变、0 异常 / 0 意外 404、390px 零溢出。截图 `verification/avatarframe-before-after-20261113.png`、`avatarframe-after-{intro,home,mobile}.png`。
- 若用户本意是「把方脸裁成圆形、保留圆环」，应改成给圆框填同色桃色底，而非换框形。未提交、未部署，须 **Ctrl+F5**。详见 `docs/QA.md` 02:45 段。

## 2026-11-13 03:12 · 语言下拉文字居中（`20261113-langcenter1`）
- 用户发顶栏语言选择器展开截图「文字居中」：按钮「中文」和菜单「English / 中文」都左对齐。控件是 6 个 shell 页 `document.write` 注入的原生 `#portal-language`。实测 `text-align:center` 只居中闭合文字，Chrome 的 OS 级原生弹层忽略 `option` 的对齐 → 纯 CSS 做不到菜单项居中。
- 新增 `dist/portal-language-ui.js` + `dist/site-language.css`：把 select 包成 `.lang-picker`，生成网页内 trigger + menu，按钮与两项文字都 `text-align:center`；选中项浅蓝 `#8ec5ff`，箭头展开时翻转。**原生 select 保留作状态源**，选中后派发冒泡 `change`，`legal-language.js` / `portal/portal.js` 既有逻辑零改动；`MutationObserver` 兜住 `data-locale` 外部变化；点击外部 / Escape / 方向键 / aria 齐全。CSS 只在 JS 挂载后加的 `.portal-language-native` 上隐藏 select，脚本缺失时原生控件仍可用。
- **版本链坑（重要）**：不要 bump `site-chrome.css` 的 `20261112-gamelanes1`。`site-points.js` 的 `VERSION` 被 3 份「one cache key」测试和 20 份测试硬编码，bump 会连锁破坏。正确做法是在 6 个 HTML 的 chrome link 之后**新增** `site-language.css?v=20261113-langcenter1` 和 `portal-language-ui.js?v=20261113-langcenter1`，原钱包 / 账号 / 积分链原样不动。
- 验证：新增 `tests/site-language-picker.test.mjs` **7/7**（含 VM 实跑挂载→展开→选择→关闭）；全量 `npm test` **659/663**，4 项失败仍是其它会话遗留的同一批（商城文案 3 + note-off 夹具 1），总数 656→663 为新增 7 项。CDP `langcenter-cdp.mjs` **22/22**：两页挂载、居中、切换语言全链路同步、0 异常 / 0 意外 404、390px 零溢出。截图 `verification/langcenter-before-after-20261113.png` 与 `langcenter-*.png`。
- 原生系统弹层已换成网页内菜单（外观略变，这是可居中的必要代价），仍待真人视觉确认。要回退原生 select：删两处新引用 + 两个新文件即可。未提交、未部署，须 **Ctrl+F5**。详见 `docs/QA.md` 03:12 段。

## 2026-11-13 11:20 · 顶栏昵称加宽 + 本地演示额度 100,000
- 用户截图：`zhiyua…` 被 88px `.chrome-account` 截断；✦ 余额 0 来自 `joyflock.shop.v1` 的 `points:0`（非服务端，8080 上 `/api/points/summary` 是 404，全站无 `__joyflockPoints.set` 调用）。
- 昵称：`dist/site-points.css` 用 ID 选择器把签名 `#chrome-account` 加宽到 160px，同步 signed cluster `279→351px` 及 760/600/480 断点（`303/254/226px`，按钮 `120/96/84px`）；guest `377px` 不动。**改这里必须同步 `tests/site-points.test.mjs` 的宽度断言**，否则全量测试会多 1 项失败。
- 额度：`dist/site-points.js` 一次性 `GRANT_TOTAL=100000` + `GRANT_KEY='joyflock.demoGrant.v1'`，只在检测到 `joyflock.accountName` / `joyflock_account` cookie 且 marker 未写时写存档并 `persist()`。新访客 10,000 不变；服务端 `live:true` 覆盖仍有效。**纯客户端演示数据，不是服务端结算 / 支付 / 权益**，不要据此宣称真实积分。
- 390px：`dist/site-chrome.css` 480 断点收紧胶囊内部（mark 15px、gap 2px、amount 11px、topbar gap 3px），保证 `100,000` 完整且 `scrollWidth=390`；不要靠扩大 cluster 宽度解决，会溢出。
- **版本链未 bump**（共享 `20261112-gamelanes1` 被 3 份测试 + 20 处硬编码锁定），靠 no-store + Ctrl+F5。
- 验证：`tests/site-account-width-grant.test.mjs` **4/4**；全量 `npm test` **662/666**（4 项其它会话遗留）；CDP `namepoints-cdp.mjs` **23/23**，每次独立临时 profile 防存档污染。截图 `verification/namepoints-*.png`。390px 昵称仍省略号是已知取舍。未提交、未部署，须 **Ctrl+F5**。详见 `docs/QA.md` 11:20 段。

## 2026-11-13 11:48 · 商城全部卡片背景换成机库蓝色
- 用户截图红框是机库横幅的蓝色、箭头指向卡片底色；确认范围是「所有商城卡片」。横幅蓝在 `dist/site-plane.css` 的 `.shop-hangar`：`linear-gradient(150deg,#1a2750,#0e1734 72%)`；卡片原底是 `dist/site-shop.css` 的 `#080e22`。
- 实现：只把 `.shop-card` 背景**最底层**换成与 `.shop-hangar` 完全相同的蓝色渐变。前两层（46px rarity 顶部条 + 白色 radial 高光）、1px 亮边、16px 圆角、hover 黄框、6 列网格、装备光晕全部保留。`cardHtml()` 无内联背景，59 张卡共用一条规则。
- **改这里必须同步 2 份既有测试**：`tests/site-shop-top-band.test.mjs`（3 个渐变层、linear tint 精确匹配、不再断言 `#080e22`）与 `tests/site-shop-rarity.test.mjs`（底色断言），否则全量测试会多 2 项失败。
- **版本链仍不 bump** `20261112-gamelanes1`，靠 no-store + Ctrl+F5。
- 验证：新增 `tests/site-shop-card-blue-bg.test.mjs` **6/6**；全量 `npm test` **669/673**（4 项其它会话遗留）；CDP `.workbuddy/tmp/cardblue-cdp.mjs` **26/26**：59/59 卡与横幅蓝一致、浅色文字、hover 黄框、下方分区、390px 零溢出、0 异常 / 0 404。改前对照用同页注入旧底色生成，避免视口/画帧差异。
- 截图 `verification/cardblue-*.png`（含 `cardblue-before-after-20261113.png` 与单卡放大对照）。只改底色，未动横幅/内容/价格/装备逻辑；未作真人视觉确认。未提交、未部署，须 **Ctrl+F5**。详见 `docs/QA.md` 11:48 段。

## 2026-11-13 12:02 · 兑换确认弹窗排版优化
- 用户截图「要兑换这个道具吗？」弹窗反馈排版乱。CDP 量过：两栏本来就等高对齐，真问题是**两条几乎相同的金色规则说明**（左栏 `shop-buy-rarity` 框 + 右栏 `shop-buy-vip-note`）以及右栏顺序 `价格卡→主按钮→说明→取消`，说明被夹在 CTA 与取消之间、左栏金框贴底像第二个按钮。
- 根因：`open()` 的 owned / `freeFor` 分支直接 buy 不开弹窗，所以 `rarityNote` 与 `vipNote` 在弹窗里永远成对出现且内容重复。
- 实现：`renderDialog()` 里 `rarityNote` 改纯文本 `gradeNote` + `routeNote=gradeNote||vipNote`；左栏只留预览/名称/描述；右栏顺序改 `支付方式→价格卡→唯一说明→.shop-buy-actions(主按钮/short/取消)`。**两条双语文案和 `.shop-buy-vip-note` 类名必须保留**，`tests/site-shop.test.mjs` 与 `tests/site-shop-rarity.test.mjs` 有源码字符串断言。事件委托监听在 dialog 上，包一层 div 不影响 confirm/cancel。
- CSS：`.shop-buy-art` 加 `justify-content:center`、删掉 `.shop-buy-art p.shop-buy-rarity` 死规则；`.shop-buy-vip-note` 改 `var(--jp-muted)` / 600 / 左对齐 / `text-wrap:balance`（修掉「换。」孤字行）；新增 `.shop-buy-actions{margin-top:auto}` 靠留白分组、不加分隔线；520px 断点 `margin-top:0`。
- **版本链仍不 bump** `20261112-gamelanes1`，靠 no-store + Ctrl+F5。
- 验证：新增 `tests/site-shop-redeem-layout.test.mjs` **6/6**（含 mini DOM 实跑中英双语、confirm/cancel 委托点击）；全量 `npm test` 复跑 **675/679**（4 项其它会话遗留；首次多出的 `bot-difficulty` 随机抽样是 flaky，单跑 3 次 1 次失败）。CDP `.workbuddy/tmp/redeem-cdp.mjs`（端口 9322）`after` **21/21**、0 异常 / 0 404、390px 零溢出；`before` 14/15 的未通过项正是「旧版有 2 条说明」的取证断言。截图 `verification/redeem-*.png`。
- 边界：只重排 DOM 顺序与样式，未动价格 / 余额 / 购买 / 装备逻辑与按钮文案；未作真人视觉确认。未提交、未部署，须 **Ctrl+F5**。详见 `docs/QA.md` 12:02 段。

## 12:20 商城白色浮动光点（`20261110-glove2`）
- 用户问「为什么商城的白色光点，没有了？」CDP 取证：门户首页 10 个 `.joymote`，商城 0 个；两页 `body::after` 均为 `display:none`，商城 `<main>` 底色不透明 `rgb(9,13,28)`。
- 根因：11-09 全站把 `ambient.css` 的 18 个静态星点关掉、改由 `dist/site-floating-dots.js` 的 10 个白色针点接管并接入 14 个 HTML；11-11 新建的 `dist/shop.html` 只拿了 ambient.css + 流星脚本，**漏了浮动光点脚本**，所以商城是全站唯一没有白点的壳页。不是 11:48 蓝底 / 12:02 弹窗改坏的。
- 改动只有一行：`dist/shop.html` 在 `site-shop.js` 之后、`site-shooting-star.js` 之前加 `<script defer src="/site-floating-dots.js?v=20261110-glove2"></script>`（同 key、同顺序）。**别顺手 bump 共享 `20261112-gamelanes1`**，会破坏 one-cache-key 测试；也别去改 `site-floating-dots.js` 本身。
- 验证：`tests/site-shop-motes.test.mjs` **6/6**（含 VM 实跑 10 点 / iframe 与 reduced-motion 不重复建层）；全量 `npm test` **681/685**，4 项仍是其它会话遗留基线；CDP `.workbuddy/tmp/shopdots-after-cdp.mjs`（端口 9326）**17/17**，0 异常 / 0 404，390px 零溢出。截图 `verification/shopdots-*.png`。
- 边界：白点极淡、随机分布，静态截图只拍到几个属正常；`site-pointer-fx.js` / `site-context-menu.js` 仍未接入商城，本次没动。未提交、未部署，须 **Ctrl+F5**。详见 `docs/QA.md` 12:20 段。

## 12:41 台球瞄准线 = 斯诺克纯白实线（未提交）
- 两份渲染文件：`dist/table/pool-view.js`（`guide()` / `drawTargetRings()` 改用 `AIM_COLOUR='#ffffff'` + `AIM_WIDTH=2.4` + `AIM_OUTLINE='#102015'` 的 `strokeAim()`，去掉虚线，近侧边缘收笔）、`dist/table/pool-table.js`（台球开球线提亮为白色）。斯诺克侧一行未改，常量直接对齐它。
- **别 bump 共享 `20261112-gamelanes1`**：`pool-view.js` / `pool-table.js` 被 20 多处引用，one-cache-key 测试会挂；服务器 `no-store`，Ctrl+F5 就够。规则 / 物理 / 指令 / 音频没动。
- 验证：`tests/pool-white-aim.test.mjs` **6/6**（VM 实跑 canvas 绘制）；全量 `npm test` **687/691**，4 项仍是其它会话遗留；CDP `.workbuddy/tmp/poolwhite-cdp.mjs` 改前/改后各 **8/8**，纯白像素 50→2770、连续白段 12px→604px。改前用 `.workbuddy/tmp/poolwhite-flip.py revert|restore` 临时回退源码采集，注意 `pool-view.js` 是 CRLF、`pool-table.js` 是 LF，脚本按行尾分别替换。
- 边界：开球线一并变白；若用户只想改瞄准线或想保留虚线，按 `docs/QA.md` 12:41 段分别回退。未提交、未部署、Ctrl+F5。

## 12:56 · 斯诺克撞库声（小球音色）
- 音频模块现在有两条 rail 分支：`cushionSamples()`（台球原样）与 `snookerCushionSamples()`（更短 / 更亮 / 更轻）。`poolImpact()` 按 `kind==='rail' && snookerVoice()` 选择；`snooker-view.js` 的 `createSnooker()` 调 `setImpactVoice('snooker')`，默认 `'auto'` 还能读 `body.snooker-game` 兜底。**别给 `pool-view.js` 加 setImpactVoice**，否则台球会串味。
- **13 处 importer 已统一 bump 到 `20261113-snookerrail1`**（`.workbuddy/tmp/bump-snookerrail.mjs`）；mp3 URL 仍是 `20261112-hitbefore1`，因为球-球录音没变，别顺手一起 bump。`tests/pool-hit-before.test.mjs` 的 importer 正则已放宽成 `\d{8}-`，下次 bump 不用再改正则。
- 验证：`tests/snooker-rail-voice.test.mjs` **8/8**；全量 `npm test` **690/694**（4 项其它会话遗留）；CDP `.workbuddy/tmp/snookerrail-cdp.mjs` **19/19**，真实 Chrome 44.1 kHz 下 68.21→32.81 ms、peak 0.4342→0.2244，mp3 200、0 异常。试听页 `docs/verification/snookerrail-audition-20261113.html`（WAV 与波形图内嵌）。
- 边界：只改撞库声，球-球击球声 / 袋口 / 滚动 / 球杆 / 物理 / 台球页全未动；真人听感待确认。未提交、未部署、Ctrl+F5。详见 `docs/QA.md` 12:56 段。

## 13:40 · 斯诺克球径 8 → 11（未提交）
- 用户选的是「桌面红球直径 12px → 16px」，`dist/table/snooker.js` 的 `export const radius=11` 是**唯一真源**；改球径时别只改 `snooker.js`，下面 6 处都要跟着：`snooker.js` 的 `RACK_X=774 / RACK_COL=19.525 / RACK_ROW=22.55` 与 `simulateCueShot(...,radius,...)`、`snooker-view.js` 的 `R=radius`、`snooker-duel.js` 的 `2*radius` 幽灵球/阻挡、`snooker-pocket-motion.js` 的 `import {radius as R}`、`snooker-collection.js` 的 `spacing=2*BALL_RADIUS+2`、`snooker-proportions.html` 的文案。
- 首列 `769→774` 不是随手挪：粉球点 `752`、黑球点 `918` 必须与首/末列红球各留一个球直径净空，否则球会压在彩球点上。
- **坑**：球堆摊开后机器人 Pro 反而弱于 Normal，`snooker-duel.js` 权重 `pl*.35→pl*.7` 才恢复单调；`tests/bot-difficulty-strength.test.mjs` 必须改成 3 个固定种子平均，单局随机样本会 flaky。另外 `tests/table-snooker-detail.test.mjs` 硬编码了 `radius`，改球径一定要同步。
- 验证：`tests/snooker-ball-size.test.mjs` **4/4**，相关 5 份专项 **32/32**；全量 `npm test` **701/705**（4 项既有基线）；CDP `.workbuddy/tmp/snookerball-cdp.mjs` **10/10**（radius=11、22 球、桌面与 390px 零溢出、0 异常）。像素对照 `.workbuddy/tmp/snookerball-compare.py`：独立红球宽度中位数 **12.0→16.0px（×1.333）**。
- **坑2**：专用 CDP 截图落在倒计时遮罩上（`#0006` 压暗），红球像素掩膜检出 0；改后取证请用倒计结束后的同视口截图（`fb-after-snooker-hud-desktop.png`）。产物 `verification/snookerball-before-after-20261113.png` 与 `snookerball-single-ball-zoom-20261113.png`。未提交、未部署、Ctrl+F5。详见 `docs/QA.md` 13:40 段。

## 14:00 · 六项截图反馈批次（未提交）
- 用户连发 5 组截图，前几次因 `429` 只回了限流文案，后续「请继续完成未完成的任务。」才恢复执行；6 项都在这一批里，别当成多个独立需求再改一遍。
- **HUD**：`dist/table/snooker-shell.css` 整条放大（`.snooker-matchup 88px / gap 190px / avatar 48 / score 23px / centre 140×60 / targetBall 21`），860 / 520 断点同步但保留防溢出。key `20261113-hudbig1`。
- **结算音**：`dist/table/table.js` 里 `isCanvasGame`（bubbles / snooker）跳过 `playResultSound(options)`，交给 `updateGridResult()` → `pool-shell.js` 的 `reveal()` 在动画结算后播一次，和台球一致。**别把 `updateGridResult(options)` 那行一起删掉**，它才是弹窗与 jingle 的入口。
- **白球**：`snooker-view.js` 删的是 `#e25046` 红点；`pool-ball.js` 的 `plain&&id===0` 黑色旋转点必须留；`spinOffset()` 还要保留（球杆 tip 偏移）。左栏白球控件上的 `#df5048` 是击球点标记，属于另一个 canvas，别一并删。
- **国际象棋**：`#board` 加 `data-sfx="off"` 就够，`site-hover-sfx.js` 的 `SKIP` 已支持 `closest()`；**别 bump `site-hover-sfx.js?v=20261112-gamelanes1`**。非法走棋用 `showChessNotice()` 的 `.pool-turn-toast chess-illegal-toast` 浮层，不再写 `#message`。
- **井字棋**：`body.xo-game` + `fourSeatPiece()` 条件扩到 `four||xo`；`four-seat-piece.css` 新增 `body.xo-game` 规则（X / O / `--personal-mark`），**别动 `body.connect-four-game` 原规则**。key `20261113-xoseat1`。
- **两个 CDP 验收陷阱（最容易再踩）**：① 扫全画布找「红点」必然误报，15 颗红球 `#e34235` 的渐变有 2 万多个近似红色像素；只扫白球圆盘（`((cells[0]/10+72)*2, R*2)`）才对。② 模拟结算时**必须先 `updateTableChat(options)` 再 `updateGridResult(options)`**，顺序与 `syncPresentation()` 一致，否则 `pool-shell.js` 的 `current.board.over` 守卫直接让 reveal 退出，看起来像「结算音丢了」。
- 验证：`tests/feedback-batch-20261113.test.mjs` **7/7**；相关专项 **32/32**；全量 `npm test` **701/705**（4 项既有基线，首次复跑多出的 `bot-difficulty.test.mjs:130` 是随机抽样 flaky，单跑 3 次 11/11）；CDP `.workbuddy/tmp/fb-batch-cdp.mjs` **33/33**（HUD 尺寸、`sfxAtStart=[]`、白球 `redDot=0/blackDot=32`、结算一次 `win` jingle 且弹窗 open、国际象棋静音 + 浮层、井字棋 2 个座位棋子、0 异常 / 0 意外 404）。
- 截图 `verification/fb-batch-hud-before-after-20261113.png`、`fb-batch-overview-20261113.png`、`fb-after-*.png`、`snookerball-*.png`。只改表现层与时机，未动物理 / 规则 / 计分 / 装扮 / 音频样本；真人视觉与听感待确认。未提交、未部署、Ctrl+F5。详见 `docs/QA.md` 14:00 段。

## 14:50 · 井字棋座位卡头像换成棋子（未提交）
- 用户只发一张截图，红框圈住左侧两个一模一样的笑脸头像、没有文字；澄清后选「头像换成棋子」＝**替换**左侧头像并**删掉**右侧重复的 X/O 徽标，每行只留一个标识。别再往右侧 append。
- `dist/table/table.js` 的 seats 分支：`game==='xo'` 时 `card.querySelector('.avatar-shell')` → 给 `fourSeatPiece()` 节点加 `avatar-shell` class → `shell.replaceWith(mark)`；`game==='four'` 仍 `card.append(mark)`；空座位「等待加入」不替换。**不要改 `presentation.js` 的 `playerCard()`**，那是 10 个游戏共用的。
- `dist/table/four-seat-piece.css`：`body.xo-game .four-seat-piece` 改成 `position:relative;display:block;margin:0`（去掉 42px / `margin-left:auto` 与 520px 的 34px 断点），尺寸交给继承的 `.avatar-shell`；X clip-path / O mask / `--personal-mark` 三条保留；`body.connect-four-game` 整段别动。key `20261113-xoseat2`。
- **坑1**：`.players-panel .avatar-shell` (0,2,0) 压过 760px 断点里的裸 `.avatar-shell` (0,1,0)，桌面与 390px 实际都是 **50px**；别按 43px 写断言，也别补硬编码尺寸。**坑2**：CDP 复用 profile 会让注入的 `xo-piece-aurora` 串到默认页，必须每次唯一 profile。**坑3**：四子连珠点「取消」主题弹窗会退回首页，要点 `.four-picker-confirm` 才开局、才能截到座位卡。**坑4**：截图查看器是缩放的，裁切对比图要换算回原始 bitmap 坐标（`x 762..1100, y 80..380`）。
- 验证：新增 `tests/xo-seat-avatar.test.mjs` **5/5**（mini DOM 实跑 `playerCard()` + 从 `table.js` 花括号配对抽出的真实 seat 分支），同步更新 `tests/feedback-batch-20261113.test.mjs` 第 7 项，合并 **12/12**；全量 `npm test` **706/710**（4 项既有基线）；CDP `.workbuddy/tmp/xo-seat-avatar-cdp.mjs` **22/22**（替换结构、装备款、390px 零溢出、四子连珠回归、0 异常）。
- 截图 `verification/xo-seat-avatar-before-after-20261113.png`、`xo-seat-avatar-after-{desktop,mobile,equipped}.png`、`xo-seat-avatar-four-regression.png`。边界：只改井字棋座位卡左侧槽位；会员头像框在井字棋会被棋子取代（预期）。真人视觉待确认、未提交、未部署、Ctrl+F5。详见 `docs/QA.md` 14:50 段。
- **15:18（本节取代 14:50 的结论）**：用户纠正「我是让你把头像框改成方框，还原下」，14:50 的「笑脸头像换成 X/O」改动**已整体回退**。`table.js` 恢复 `card.append(fourSeatPiece(...))`、`four-seat-piece.css` 恢复 42px 右侧徽标、`index.html` 版本键 `xoseat2→xoseat1`、删除旧专项测试并恢复 `feedback-batch-20261113.test.mjs` 第 7 项断言。新增 `dist/table/seat-frame-square.css` + `index.html` 引用 `?v=20261113-squareframe1`，把座位卡圆形头像框改为 22% 圆角方形（与排行榜一致），空座位同步，VIP 圆形徽饰 `:has(.avatar-frame)` 例外保持 50%；笑脸头像与右侧 X/O 徽标都保留。新增 `tests/seat-avatar-square.test.mjs`。专项 13/13、全量 711/707/4（4 项既有基线）、CDP 24/24。截图 `verification/seat-frame-before-after-20261113.png`、`seat-frame-after-*.png`、`seat-frame-four-regression.png`。注意：Chrome computed 百分比圆角返回 `"22%"` 而不是 px。真人视觉待确认、未提交、未部署、Ctrl+F5。详见 `docs/QA.md` 15:18 段。
- **15:13 斯诺克（本轮完成）**：「顶部整体放大 + 桌子往右移 + 中心对齐」。改前实测 1378 视口 `matchup.cx=539 / canvas.cx=594`、1920 `810 / 865`，右侧仅 ~29px 富余，直接右移 20px 会裁 6px。`snooker-shell.css` 顶部条二次放大（104px 高 / 58 头像 / 28px 比分 / 166×72 比分牌 / 25px 目标球 / gap 210，860 与 520 断点同步），并引入共享 `--snooker-axis-shift:20px`（窄屏 0）：顶部条 `translateX(S)`、舞台 `padding-right:calc(S*2)`、球桌 `translateX(calc(S*2))`，净位移都是 S，中心关系严格不变且零裁切。版本键 `snooker-shell.css?v=20261113-hudbig2`。新增 `tests/snooker-hud-align.test.mjs`、更新 `feedback-batch-20261113.test.mjs` 前 2 项。专项 17/17、全量 715/711/4（既有基线）、CDP 35/35（桌面 net shift 20 / barShift 20 / centreGap 55→55，390px 0，零裁切零溢出）。截图 `verification/snooker-hud-align-{hud-before-after,overview}-20261113.png`、`snooker-hud-align-after-*.png`。坑：只加 padding 会让净位移减半并破坏对齐；390px 目标球标签裁切为既有问题。真人视觉待确认、未提交、未部署、Ctrl+F5。详见 `docs/QA.md` 15:13 段。
- **15:46 斯诺克力量 −30%（本轮完成）**：用户「斯诺克的力量减少30%，要跟台球分开」。`pool.js` 的 `simulateCueShot` 新增可选第 6 参 `shotSpeed=SHOT_SPEED`（初速与 `spinSpeed` 都用它），台球 `poolMove()` 不传、默认路径字节级不变；`snooker.js` 导出 `SNOOKER_POWER_SCALE=.7` / `SNOOKER_SHOT_SPEED=SHOT_SPEED*.7=0.336` 并显式传入；后端 `SnookerRules.java` 独立常量 `.48*.7`，`PoolRules.java` 未动。力度条仍显示 0–100%，只缩放物理速度。**关键**：机器人若不补偿会崩难度阶梯（3 种子净分 `-8.33/-2/-17/-17`，Pro 比 Easy 差），故 `snooker-duel.js` 用 `BOT_POWER=Math.min(100,Math.round(62/.7))=89`（`aim` 默认 + Hell 物理探针 + 后端 bot 同步），恢复 `Easy<Normal<Pro≤Hell`；玩家拉满仍比机器人快。实测首帧位移 `66.8→46.8 (×0.70)`、路径 `3757→2980`、台球末帧完全一致。新增 `tests/snooker-shot-power.test.mjs`（6 项）、更新 `snooker-ball-size.test.mjs`；专项 18/18、全量 721/717/4（既有基线）、CDP 23/23。坑：合成 `PointerEvent` 验收力度条要先覆盖 `setPointerCapture`；`mvn` 不可用，Java 改动未编译验证。产物 `verification/snooker-power-{split,acceptance}-20261113.png`。边界：规则/计分/装扮/音频样本/UI 显示/台球物理未动；真人手感待确认、Ctrl+F5、未提交未部署。详见 `docs/QA.md` 15:46 段。

## 16:04 · 结算弹窗「本局奖励 + 当前积分逐分累加」（未提交）
- 用户圈出结算弹窗的「这一局，胜利属于你。」一行，要「先提示奖励多少积分，接着显示当前积分，200→201→202 一直加到奖励后的分数」。**描述文案保留**，在其下加一块两行面板；九个棋类共用同一个 `pool-shell.js` 弹窗，接一次即全覆盖。
- 新增 `dist/table/result-points.js` + `result-points.css`（独立文件，键 `20261113-pointticker1`）。**计分不改**：ticker 只监听 `game-points.js` 的 `joyflock:game-points` 快照，`before=points-last.points`、`after=points`、`reward=last.points`；`table.js` 唯一的 `record()` 调用没动，重渲染 / 彩带 / 重开都不会二次加分。面板由 `openResult()` 的 `reveal()` 启动：先 `reward` 相位 380ms 只显示 `+N`，再 `counting` 逐帧 +1，最后 `done` 停在终值；`close` 里 `finish()` 把数字补齐。
- **别踩的三个坑**：① 按真实 rAF 时间 `floor(elapsed/16)` 会跳号（CDP 实测 `200,202,203,205...`），必须每帧把**虚拟** elapsed 加固定 `stepSize`，才会 200/201/202 一个不漏；② `tests/table-pool-animation.test.mjs` 在无 DOM 的 Node 里 import `pool-shell.js`，模块顶层不能用裸 `document`，已加 `typeof document` 守卫；③ `table.js?v=` / `intro-boot.js?v=` / `table-home-clean.css?v=` / `presentation.js?v=` 被 3 份测试要求**同值**，bump 必须四个一起改（本轮统一 `fourfx1 → pointticker1`），`pool-shell.css?v=20261112-gamelanes1` 则**绝对不能动**（与 `site-points.js` VERSION 绑定）。
- 验证：新增 `tests/result-points-ticker.test.mjs` **6/6**（确定性时钟实跑 200..400 全整数、重开/重渲染不重播、两种事件顺序、中英文、guest、减少动效）；全量 `npm test` **727 总 / 723 pass / 4 fail**（4 项既有基线）；Chrome CDP `.workbuddy/tmp/points-ticker-cdp.mjs` **41/41**（预置 200 分→真实胜利 +200→终值 400、三相位、英中切换、390px 零溢出、减少动效、0 异常 0 意外 404）。
- 截图 `verification/points-ticker-phases-20261113.png`（三阶段对照）与 `points-ticker-{reward,counting,done,english,mobile,reduced}-20261113.png`。边界：只加表现层，计分表 / 存档 / 排行榜 / 规则 / 结算文案未动；累加时长约 3.2s（`pointsStepMs` 可调）。真人视觉待确认、Ctrl+F5、未提交未部署。详见 `docs/QA.md` 16:04 段。

## 16:33 · 商城 hover：外边框不动 + 内框 50% 金色（未提交）
- 用户「这个效果错了，鼠标移动上去，外边框不动，内边框的金色显示50%透明度」。**与 20:02 `hover501` 不同**：那次只改内框 `.5`、外框仍会在 hover 时消失；20:11 `frameback1` 又全部回退。本轮是两者同时成立。
- 唯一改动 `dist/site-shop.css`：删掉三条 hover 覆盖（`.shop-card:hover,.shop-card:focus-visible{border-color:transparent;box-shadow:0 10px 22px #0008}`、`.shop-card:hover{transform:translateY(-2px)}`、equipped 的 box-shadow 覆盖），外框颜色 / 宽度 / 蓝色光晕 / 顶部高光 / 位置在 hover 时全部静止；`.shop-card:hover::after,.shop-card:focus-visible::after` 由 `opacity:1` 改 `opacity:.5`（整层变淡，描边与辉光同比）。`::after` 的 `inset:3px` / `#ffd84d` / `0 0 12px #ffd84d55` / 静止 0 / `.18s` 过渡、focus outline、reduced-motion 都没动。
- **别 bump 共享 `20261112-gamelanes1`**：`shop.html` 的 `site-shop.css?v=` 与 `site-points.js` 的 VERSION 被 3 份 one-cache-key 测试 + ~20 处硬编码锁死；靠 `no-store` + **Ctrl+F5**。
- **坑（下轮别踩）**：① 5 份旧测试（`site-shop-single-frame` / `glow-border` / `top-band` / `rarity` / `card-blue-bg`）原本断言 `border-color:transparent` 与 `opacity:1`，需求变更后必须同步改成守护新行为，否则会误以为回归；② CDP 的 computed `boxShadow` 是 `rgba(...)`，别用 `rgb(`；③ 6 列网格会因滚动条切换整体重排（每列 ±2.5px），`clientWidth` 却不变，「hover 前后 rect 全等」会误报，用 `stabilize()` + 纵向几何 / `transform=none` / hover 期间静止来判定。
- 验证：新增 `tests/site-shop-hover-static-frame.test.mjs`（7 项），商城专项 **41/41**、全量 `npm test` **735/731/4**（4 项既有基线）、Chrome CDP `.workbuddy/tmp/shophover-static-cdp.mjs` **34/34**（hover 前后 5 项 outer computed 逐项相同 `outerDiff=[]`、`transform=none`、内框 0→0.5→0、旧效果注入对照、390px 零溢出、0 异常）。截图 `verification/shophover-static-phases-20261113.png` + `shophover-static-{idle,hover,old,new,mobile}-20261113.png`。边界：纯 CSS 表现层；真人视觉待确认、Ctrl+F5、未提交未部署。详见 `docs/QA.md` 16:33 段。

## 17:23 · 商城操作提示上移（未提交）
- 用户截图 +「放上面吧」，红箭头从下往上、没圈具体元素；先给 4 个选项澄清，用户答「下面提示语，下面完全看不到，放到我指定的位置」→ 指的是**底部那条 toast「成功替换头像」**，不是分区顺序、不是分区标题说明小字。教训：红箭头只表示方向时，先确认移动对象，别按分区顺序猜。
- toast 来自 `site-points.js` 的 `toast()`（创建 `div.jp-toast` 并 append 到 body），`site-shop.js` 用 `API.toast()` 调用；共享样式 `site-points.css` 里 `position:fixed;left:50%;bottom:26px;z-index:9999`，**15 页共用，不能直接改共享文件**。
- 唯一改动 `dist/site-shop.css` 末尾：`body:has(.shop-page) .jp-toast{top:26%;bottom:auto;transform:translateX(-50%) translateY(-10px)}` + `body:has(.shop-page) .jp-toast[data-show="1"]{transform:translateX(-50%)}`。26% 对应箭头尖端（视口上四分之一）；`shop.html` 静态 `<main class="shop-page">` 提供 `:has()` 钩子，`site-shop.css` 排在 `site-points.css` 之后。**别 bump 共享 `20261112-gamelanes1`**，靠 `no-store` + Ctrl+F5。
- **两个坑（下轮别踩）**：① 作用域基础规则特异性 (0,2,1) 压过共享 `.jp-toast[data-show="1"]` (0,2,0)，不补同作用域的显示态覆盖就会残留 `translateY(-10px)`；② Chrome 对 fixed 元素把 `bottom:auto` 解析成 **used px**（`778px`）、`top:auto` 解析成 `1038px`，`getComputedStyle()` 不返回字面 `auto`，CDP 断言要改成 CSSOM 校验声明 + used 几何（上半屏 / `bottom > 50%` 视口高）。
- 验证：新增 `tests/site-shop-toast-position.test.mjs`（6 项），商城专项 **47/47**、全量 `npm test` **741/737/4**（4 项既有基线）、Chrome CDP `.workbuddy/tmp/shop-toast-position-cdp.mjs` **24/24**（`top=286px` / `rect.y=286`、真实点击已拥有卡也在上方、其它页面仍 `bottom=26px` 且 `scoped=false`、390px `top=219.4px` 零溢出、0 异常）。截图 `verification/shop-toast-before-after-20261113.png` 与 `shop-toast-{up,down,up-after,mobile}-20261113.png`。边界：只加商城作用域 CSS 定位；价格 / 购买 / 装备 / 结算 / 共享钱包 JS 与 CSS 未动；位置可调 `top:26%`。真人视觉待确认、Ctrl+F5、未提交未部署。详见 `docs/QA.md` 17:23 段。

## 15:05 · 邀请链接直开的顶栏统一（未提交）
- 用户两张截图（游客 / zhiyuanC 两个身份）问「看得出来问题吗」，澄清后明确是 **「上面的列头样式不一样，修改下」**；「两位玩家棋盘不同步」本次先不动。不要按「邀请链接看到残局」去改房间逻辑——那部分已查明但本轮不修。
- 根因：`$('share')` 在 iframe 内用 `location.href` 生成链接（`table/index.html?…&embed=joyflock&room=…`）。顶层打开时 `window.parent===window`，`html.embedded-game` 不成立，`html.embedded-game body>header{display:none!important}` 不生效；**play 屏**自带 header 走 `table.css:19` 的浅色云纹（68px / 2px 白边 / `#234080` / 面包屑 / 无导航），portal 外层却是 `site-chrome.css` 的深色 38px `.topbar`。intro 屏本来就是深色，只有 play 屏露馅。
- 改动：`dist/table/index.html` 加 inline script 仅在「顶层 + 有 `?room=`」时给 html 打 `invite-standalone`，header 补 `.invite-nav`（游戏/商城）与 `.brand-mark`，末尾引入新 `header-invite.css?v=20261114-inviteheader1`；新增 `dist/table/header-invite.css` 用 `html.invite-standalone body[data-screen]>header` 统一成深色 chrome。
- **三个坑（下轮别踩）**：① CDP 必须先把 `document.body.dataset.screen='play'`，否则 intro 屏本来就是深色，复现不出浅色云纹；② `.table-home-theme:not([data-screen="play"]) header` 特异性 (0,2,1) 会压过普通 `html.invite-standalone body>header` (0,1,3)，要用 `body[data-screen]` 提到 (0,2,3)；③ `table.css button{}` 的白色渐变 / `min-height:42px` / `box-shadow:0 3px 0` 会残留，必须显式 `min-height:24px;box-shadow:none`，否则登录胶囊更高且带白色下沿。
- 验证：`tests/table-invite-header.test.mjs` **7/7**；CDP `.workbuddy/tmp/invite-header-cdp.mjs` **30/30**（改前 / 改后 / portal 三态对比、恢复标记可逆、无 room 与嵌入态不受影响、390px 零溢出、0 异常）；截图 `verification/invite-header-before-after-20261114.png`。
- **待办（未修）**：`TableService.join()` 不检查 `OVER`、不跟随 `successor_id`（`snapshot()` 会跟随），`apply()` 不更新 `?room=`；两个 four 房间实测都是 OVER / winner=1 / 7 步，所以旧链接进来就是「zhiyuanC 获胜」的残局。`#turn-instruction` 常驻玩法说明也让「获胜！」标题下文案错配。详见 `docs/QA.md` 15:05 段。Ctrl+F5、未提交未部署。

## 17:58 · 多人在线统一托管状态机（未提交，规范见 `docs/ONLINE-GAME-MANAGEMENT.md`）
- 用户三条连发需求：两人朋友房都真人 / 4 人可多真人+多电脑；退出先 30 秒倒计时、到期简单机器人代走、席位旁显示托管状态；双托管跑到结束；重新选在线对决连回原局；托管结束不记录数据不给积分；所有游戏一致且**按游戏隔离**；**打机器人豁免**（退出即退、再进即新局）；并明确「把在线游戏的管理记录到文档」。
- **唯一语义源**：`com.flightparty.online.CustodyPolicy` ↔ `dist/online-custody.js` + `dist/online-custody-ui.js`。桌游 `TableService.Seat` 与飞行棋 `RoomRules.Seat` 都加 `custody`/`graceUntil(Ms)`，托管时保留身份且 `bot=false`；`grace` 冻结回合，`hosted` 用 `GridRules.easyBot()` / `GameRules.easyChoice()`。`managed = 真人身份 ≥ 2`，computer match 直接 `CLOSED`。
- **不记分链**：桌游 `settle()` 跳过托管席；飞行棋 `V25__online_custody_no_score.sql` → `hosted_at_end` → `MatchCompletionWorker` → `SettlementService` 跳过全部积分/统计；前端跳过 `game-points.record()` / `track('game_end')`。
- **下轮别踩的坑**：① `graceUntil` 必须用包装 `Long`，原始 `long` 会让旧房间 JSON 在 Jackson 3 反序列化时炸（`MismatchedInputException`）；② 新增 import 会破坏 6 份 legacy `vm` 片段测试，必须在 `vm.createContext()` 里注入真实模块导出，别在业务代码里加 `typeof` 兜底；③ 简单机器人必须**保证终局**：`puzzle` 不能随机交换、`cards` 不能只摸牌，另有 `HOSTED_MOVE_CAP=240` 仅在全员托管时兜底；④ CDP 验证时**退出方在 30 秒内不要调用任何权威 GET**，否则 `bind()` 会立刻把席位收回。
- 验收：`npm test` **787/787**、`mvn -B test` **133/133**、镜像内 `mvn -B verify` **133/133**；`deploy-backend-1` 重建重启，Flyway `24 → 25` 成功；Chrome CDP `.workbuddy/tmp/online-custody-cdp.mjs` **23/23**（等待重连 29s→27s、托管中·简单电脑并落子、重连徽章消失、单机豁免、0 异常 0 意外 4xx）。截图 `verification/online-custody-*-20261114.png`。
- **边界**：双托管长局与飞行棋 `hosted_at_end` 不记分只由 Java 单测覆盖；飞行棋 `STARTING` 开局事务仍未接线，在线对局本身尚不可玩。新模块独立版本键 `20261114-custody1`，共享键未 bump，需 **Ctrl+F5**。详见 `docs/QA.md` 17:58 段。

## 20:38 · 每日 2000 积分上限 + 结算框三行等距（未提交）
- 用户两张截图：① 加每日积分上限、每天最多累计 2000 分，在「当前积分」下面做进度条；② 奖励框三行间距不一致，改成一样并加大。
- **上限只放在唯一记分器 `dist/game-points.js`**：`DAILY_CAP=2000`、本地日 `YYYY-MM-DD` 计数，`record()` 把奖励裁到 `2000 - 已累计` 再入账，`last.full/capped` 留理论值，`snapshot().daily={date,earned,cap,remaining,reached,pct}` 下发。`load/sync/reset/身份切换` 都要带 `daily`；**`reset()` 必须保留当日额度**，否则清空战绩就能刷上限。游客仍不落盘，Joy Coin 钱包不动。
- **弹窗只渲染不算规则**：`dist/table/result-points.js` 在 `totalRow` 后加 `.pool-result-daily`（标签行+进度条+说明），`dailyFromSnapshot()` 夹紧异常值，旧快照无 `daily` 就整块隐藏。封顶时 `last.points=0` 但 `capped=true` 仍要算有效奖励，否则当天弹窗直接消失；同时隐藏 `100 + 20` 拆分行避免与 `+0` 矛盾。
- **三行等距根因**：grid `gap` 本来就均匀，是 17/12/18px 的 value 配 `align-items:baseline` 让视觉基线间距不等。改成每行 `min-height:22px` + `align-items:center` + `gap:14px`，实测 `gaps=[36,36]`。
- **版本链坑**：`game-points.js` 的 `var VERSION='20261112-gamelanes1'` 必须等于 `site-points.js` 的 VERSION，约 20 个测试硬编码这个键 → **不能 bump**；用 `&d=...` 附加参数刷新缓存（既有 `new RegExp('game-points\\.js\\?v='+VERSION)` 无 `$` 锚定，仍通过）。其余共享链 `20261114-hosted1` → `20261114-dailycap1` 共 23 处。
- **验收坑**：`dist/pool-result-preview.html` 在当前工作区的内联 module 有既存字符串损坏（`node --check` 直接报 `Invalid or unexpected token`），不能用它做 CDP；改在真实 `/table/index.html?game=pool` 页面动态 `import('/table/pool-shell.js?v=...')` 调 `updatePoolShell()` 打开同一个弹窗。headless Chrome 的 rAF 被节流，积分滚动要等满 `WALL_CAP=4500ms` 再截图；进度条轨道有 1px 边框，满格宽度测出来是 99% 而不是 100%。
- 验收：`npm test` **827/827**（新增 `tests/daily-points-cap.test.mjs` 11 项）；CDP `.workbuddy/tmp/daily-cap-cdp.mjs` **22/22**、0 异常 0 意外 4xx，用真实记分器验证 `+120 / 7,870 / 1,240 / 2,000 / 62%`、英文文案、封顶 `+0 / 2,000 / 2,000 / 100%`。截图 `verification/daily-cap-result-{zh,en,capped}-20261114.png`。需 **Ctrl+F5**，未提交、未部署生产。详见 `docs/QA.md` 20:38 段。

## 20:51 · 追加：今日积分上限改两段前台动画、删说明文字（未提交）
- 用户追加：「今日积分上限」也要跟「当前积分」一样的逐分效果与音效；**先**加完当前积分**再**加今日积分上限；要前台可见效果；截图里「每日最多累计 2,000 积分」文字去掉。
- `result-points.js`：删 `dailyNote` DOM + `dailyCaption/capReached/capDone` 视觉文案 + 对应 CSS；封顶解释只留在 `aria-label`（`cappedAria`）。`paint()` 只管静态文案，**动态数字改由独立逐帧写入器驱动**（否则 locale 切换 / MutationObserver 重绘会把滚动动画拍到终值）。新增 `dailyStartValue()=max(0,daily.earned-award.reward)`、`dailyEndValue()`、`paintDailyValue()`（数值 + aria + 进度条宽度一起更新）。
- **串行两阶段** `reward → counting → daily → done`：`counting` 逐整数加「当前积分」，**落地后**才切 `daily` 用同一虚拟时钟逐整数加「今日积分上限」，两段每步都 `coinSfx()`，全结束才 `coinSfx(true)`。`WALL_CAP 4500→20000` 且切阶段重置 `wallStart`（两段需要双倍预算）；封顶/reduced motion 直接拍终值。`showFinal()/finish()/receive()` 都要同步两个数字，别只处理 total。
- CSS：`daily` phase 必须加进**所有** reveal 规则（`.pool-result-points-row` 与 `.pool-result-daily` 两处），否则第二阶段整块透明；`[data-phase="daily"] .pool-result-daily-value` 转金色 + `done` 时 `pool-points-pop`；动画阶段关掉进度条 `transition:width`，否则金色条滞后于数字。
- **版本链坑**：又改了 result-points.js/css → 再 bump `20261114-dailycap1`→`20261114-dailycap2`（dist 29 处 + 3 个硬编码测试 + 新测试断言）。`game-points.js` 本身没改，冻结 VERSION 不动，`&d=` 参数随链更新即可。
- **CDP 坑**：headless rAF 被节流，两段 120 步共约 14s，轮询等 `phase==='done'` 要给到 28s；验证音效别去听 AudioContext（headless 可能 autoplay 被锁），直接包装 `window.__joyflockResultSfx.coinTick` 计数（`api` 是普通对象、属性可写，window 上才是 `configurable:false`）。
- 验收：`npm test` **829/829**；CDP **22/22**、0 异常 0 意外 4xx，25ms 采样实测 `phases=["reward","counting","daily","done"]`、total 第 244 样本落地 vs daily 第 247 样本起步、daily 121 个不同中间值、金币 `counting 120 + daily 120 + final 1`、进度条 56%→62%、说明文字节点 0、三行间距仍 `[36,36]`。截图已用新版覆盖。需 **Ctrl+F5**，未提交、未部署生产。详见 `docs/QA.md` 20:51 段。

## 21:00 · 每日上限与当前积分换位

- `result-points.js` 只把 `panel.append(...)` 改成 `rewardRow, breakdownRow, dailyWrap, totalRow`（daily 块含进度条在上、当前积分在下），并导出 `totalRow/dailyRow`。**动画阶段不要跟着换**：用户要求仍是先滚当前积分、再滚今日上限，`reward → counting → daily → done` 保持不变。
- **等距坑**：daily 块成为非末行后，原来 `display:grid;gap:7px` 的进度条会多撑一行、把四行间距拉成 `[36,36,49]`。修法：`.pool-result-daily` 改 `block + position:relative`，`.pool-result-daily-track` 绝对定位浮进 14px grid gap（`top:calc(100% + 2px)`），删掉 `.pool-result-daily-row{min-height:20px}` 让它继承 22px；移动端 track 6px / +1px。四行实测 `[36,36,36]`。
- 版本链 `20261114-dailycap2` → `20261114-dailycap3`（dist 29 处 + 4 个硬编码测试 + CDP 脚本），`game-points.js` 冻结 VERSION 不动、只更新 `&d=`。`npm test` **829/829**；CDP **23/23**、0 JS 异常 0 意外 4xx，行序 labels、四行等距、两段动画与金币音效均复验。截图已覆盖。需 **Ctrl+F5**，未提交、未部署生产。详见 `docs/QA.md` 21:00 段。

## 21:13 · 结算卡片插画
- 新增 `dist/assets/result/{winner,loser,draw}.svg`：同一 `100×120` 奖杯轮廓，靠金色 / 冷蓝倾斜 / 青绿等号区分三态。`pool-shell.js#updateResult()` 用 `artKind=!details.winner?'draw':won?'winner':'loser'` 选图，**跟结果不跟座位**；`row.dataset.outcome` 供 CSS 与验收；文字收进 `pool-result-player-copy`，`img.pool-result-player-art` 放右侧。
- **缓存键坑**：卡片基础样式在 `pool-shell.css`，但它的 `?v=20261112-gamelanes1` 与钱包链绑定，且 `tests/{result-buttons,snooker-hud-align,pool-rail-countdown-cursor}.mjs` 都硬编码。新样式一律写进**后加载**的 `result-points.css` 覆盖，别动 `pool-shell.css` 或其键；包了一层 copy 后原 `.pool-result-player>span` 字号失效，要补 `.pool-result-player-copy>span`。
- 图片 `src` 带共享版本参数；reduced motion 与 480px 适配都在 `result-points.css`。9 个桌游共用该弹窗，飞行棋结算页不受影响。
- 版本链 `20261114-dailycap3` → `20261114-dailycap4`（dist 30 处 + 4 测试 + 两个 CDP 脚本），`game-points.js` 冻结 VERSION 不动、只更新 `&d=`。`npm test` **834/834**（新增 `tests/result-player-art.test.mjs` 5 项）；CDP `.workbuddy/tmp/result-art-cdp.mjs` **33/33**、0 异常 0 4xx，三态 outcome/src、图片加载、左右布局、不溢出全绿，奖励框同屏。截图 `verification/result-art-{win,loss,draw}-20261114.png`。需 **Ctrl+F5**，未提交、未部署生产。详见 `docs/QA.md` 21:13 段。

## 21:39 · 傍晚批处理
- 上限只在 `game-points.js` 的 `DAILY_CAP`（唯一记分器）。改数字要同步 `tests/daily-points-cap.test.mjs` 里 VM 跑真实记分器的期望值（`remaining / pct / earned / 跨日`），但 `dailyFromSnapshot` 纯函数用例里的 `cap:2000` 只是任意输入，**不要全局替换**。
- 进度条已从 `result-points.js/css` 彻底删除，`dailyWrap` 只有 1 个子元素；别再引用 `dailyTrack / dailyFill`。aria 改在 `dailyRow` 上，四行等距仍 `[36,36,36]`。
- **缓存键坑（两条）**：`pool-shell.css?v=20261112-gamelanes1` 与钱包链绑定不能动 → 结算/卡片样式一律写进后加载的 `result-points.css`；`portal-editorial.css` 有独立键 `20261114-cardart1`，`tests/site-card-hover-blur.test.mjs` 硬编码它，改 CSS 必须同步。
- **头像坑**：iframe 是独立 JS realm，同步首屏时 `__joyflockShop` 可能还没发布、`me` 还没回来。`avatar-display.js#equippedAvatar()` 从同源 localStorage `joyflock.shop.v1` 兜底，`table.js` 的 `signedIn` 未加载时必须是 `undefined` 而非 `false`（`false` 会被当成明确登出而短路回默认笑脸）。头像键 `20261114-avatar5` 有 20 处引用（含 avatars manifest、CSS、`site-points.js` 的 `AVATAR_VERSION`），要一起 bump。
- 警灯在 `online-custody-ui.js` 的共享 CSS：`37.5%` inset + `25%` 尺寸 = 1/4 且居中，`conic-gradient` 旋转 + reduced motion 静态；grace / 原生 bot 不显示。
- Sign up 由 6 个 HTML 的内联 `document.write` 生成（不是 JS 模块），`tests/site-header-compact.test.mjs` 已改为断言它不存在；注册入口仍在登录弹窗 `data-auth-switch="register"`。
- 游戏卡片：`.game-card` 去掉固定 `aspect-ratio:1/1`、`.card-art` 改为完整正方形 `flex:0 0 auto`，黑栏自然落到图片外；CTA 的 `--card-caption-half` 归零。
- 验收：`npm test` **838/838**；CDP `.workbuddy/tmp/batch-2114-cdp.mjs` **25/25**、0 异常 0 意外 4xx。历史脚本 `.workbuddy/tmp/daily-cap-cdp.mjs` 写于 2000 分 / 有进度条时代，重跑请用新脚本。需 **Ctrl+F5**，未提交、未部署生产。详见 `docs/QA.md` 21:39 段。

## 22:03 — 各游戏 SEO
- **单一数据源**：`dist/seo-games.js`，改文案只改这里。依次跑 `node scripts/build-game-seo.mjs`（20 页 + sitemap/robots/meta 脚本 + OG 清单）与 `python scripts/build-game-og.py`（10 张 1200×630 图）。产物是纯静态文件，nginx `try_files $uri $uri/ =404` 能直接命中目录里的 index.html。
- **不要手改生成物**：`dist/games/**`、`dist/en/games/**`、`dist/games/games.css`、`dist/sitemap.xml`、`dist/robots.txt`、`dist/game-seo-meta.js`、`dist/assets/og/manifest.json` 都会被覆盖。
- **新增游戏流程**：在 `seo-games.js` 的 `GAMES` 加一条（`id` 必须等于 `portal.js` 的 `?game=` 值），重跑两个生成器；`tests/game-seo.test.mjs` 会自动校验页面 / sitemap / OG 图齐全。
- **canonical 设计**：落地页自引用；`?game=` 门户页与 `table/index.html?game=` 由 `game-seo-meta.js` 把 canonical 指向落地页，避免 query 参数页分散权重；`/` 飞行棋本体仍保留自己的 canonical。
- **两个坑**：`portal.js#updateLanguage()` 在 `/api/me` 返回后二次覆盖 `document.title` → `game-seo-meta.js` 用 title MutationObserver + account-changed/storage 监听守住；`.hero-art` 必须写 `height:auto`，否则 HTML `height` 属性会压过 `aspect-ratio` 把封面拉成竖条。
- 域名统一在 `SITE.origin`（当前 `https://flight.joyflock.com`）。验收：`npm test` **851/851**、CDP `.workbuddy/tmp/seo-cdp.mjs` **24/24**。需 **Ctrl+F5**，未提交、未部署生产。详见 `docs/QA.md` 22:03 段。

## 23:25 — 顶栏昵称胶囊
- 登录态 `#chrome-account` 宽度与 `.top-actions` 预留宽度**必须成对修改**（`dist/site-points.css` 四档 + `dist/site-chrome.css` 的 guest 档），否则右侧积分胶囊会漂移或组内溢出。当前 signed 值：桌面 `112/303`、760 `96/279`、600 `84/242`、480 `76/218`；guest 恒为 `377/271/234/218`。
- `tests/site-account-width-grant.test.mjs` 与 `tests/site-points.test.mjs` 硬编码这些数字，改宽度必须同步；`site-points.css` 的缓存键绑定钱包 `VERSION`，不要 bump，靠 nginx no-cache + Ctrl+F5 生效。
- 验收：`npm test` **851/851**、CDP `.workbuddy/tmp/account-gap-cdp.mjs` **13/13**。详见 `docs/QA.md` 23:25 段。

## 23:36 — 结算弹窗 DOM 幂等
- **通用坑**：`updateResult()` 会在**每一次** `render()` 时被调用（在线房间终局后仍持续轮询），任何在里面无条件 `replaceChildren` 的东西都会重启动画 / 重置状态。新增卡片或徽章时一律按 `resultKey`（room id + moves + winner）做幂等，或复用 `resultPlayersKey` 模式。
- `resultPlayersKey` 签名包含 `key / lang / isFour / archived / names / scores`；`!ended` 与 `resultKey!==key` 时必须重置，否则新一局不刷新。弹窗已 `resultShown` 时的迟到重建要写 `style.animation='none'`。
- `setResultEmblem()` 本来就有 `dataset.outcome===kind` 防重入，顶部 8 号球不受此 bug 影响。
- 共享链 `20261114-dailycap5 → 20261114-cardstable1`（38 处）。验收：`npm test` **856/856**（`tests/result-art-stable.test.mjs` 用 VM 真跑生产函数）、CDP `.workbuddy/tmp/result-art-stable-cdp.mjs` **9/9**。详见 `docs/QA.md` 23:36 段。

## 23:59 — 再来一次：按原模式重进
- **不要在 `#again` 里原地重置棋盘**。桌游 `restartMatch()` 与飞行棋 `#rematch` 都必须先回中间页（`screen='home'` / `show('welcome')`）再重进原模式；否则在线房会残留 OVER 房间、结算弹窗与旧 `?room=`。
- **三模式**：电脑 `localStart(computer)` / `start()` 直接新局；QUICK `enter('QUICK')` / `openRoom('quick')` 重新排队；FRIENDS `POST /api/table/rooms/{old}/rematch` / `social.rematchFriends(oldId)` 进 successor 等待房。
- **后端好友房续局已改**：`TableService.rematch()` 不再要两人投票、不再直接 PLAYING；用 `successor_id` 建唯一 `WAITING` 房，只保留真人、准备票清空，双方各点「准备」才开局。`snapshot()` 跟随 `successor_id`，所以没点「再来一次」、仍在轮询旧房的朋友也会被自动带过去。`table_rematch_votes` 表保留但不再读写。
- **两个坑**：`localStart()` 内部会 `generation++`，race token 必须在它之后取；飞行棋**不要**调 `/leave`（SETTLED 房 409），用 `returnToModeScreen()` 只做本地清理。
- 改这些行为必须同步：`tests/rematch-flow.test.mjs`（VM 真跑生产函数）、`tests/room-origin.test.mjs`、Java `TableCosmeticsServiceTest`、`docs/ONLINE-GAME-MANAGEMENT.md` 的「再来一次按原模式重进」章节；共享链整条 bump（`20261114-rematch1`）。
- 验收：`npm test` **864/864**、Maven **147/0 失败**、CDP `.workbuddy/tmp/rematch-cdp.mjs` **36/36**。需 **Ctrl+F5**，未提交、未部署生产。详见 `docs/QA.md` 23:59 段。

## 00:50 — 结算两段逐分动画的顺序必须跟 DOM 顺序一致
- `result-points.js` 的 `phase` 名不要按「第几阶段」理解：`daily` 表示**上面**「今日积分上限」在计数，`counting` 表示**下面**「当前积分」在计数。改行序时必须同时改 `play()` 的首阶段选择与 `step()` 的切换方向，否则会出现「下面的先加、上面的后加」。
- 阶段切换时务必重置 `wallStart`（`WALL_CAP=20000` 是**每阶段**的挂钟预算）；两个虚拟时钟 `elapsed / dailyElapsed` 各自独立，`pointsStepMs()` 按各自 delta 算。
- 改这两个文件必须整条 bump 共享键（当前 `20261115-joincoin1`，dist + tests 共 18 处），并同步 `tests/daily-points-cap.test.mjs` 的阶段序列断言。真机脚本 `.workbuddy/tmp/result-order-cdp.mjs` 可直接复跑（需要 Chrome CDP 端口 9223 与 8081 静态服务）。需 **Ctrl+F5**。

## 01:10 — 只有一个 Joy Coins 余额（不要再引入第二套积分）
- **权威在 `site-points.js` 的钱包**：`state.total` / `localStorage['joyflock.shop.v1'].points`。`game-points.js` 只做计分与镜像，绝不自己累计第二个数；`record()` 通过 `walletAdd()` 把 credited 写进钱包，`walletTotal()` 是唯一的读取入口。
- **不要改 `site-points.js` 的 `VERSION`**：`20261112-gamelanes1` 被 20+ 测试与商城资源 URL 硬编码。桥接只用现成的 `__joyflockPoints.get/set`、`joyflock:shop-changed` 和 `storage` 事件；`game-points.js` 自己的 cache-bust 用已有的 `&d=` 参数。
- **事件纪律**：只有一局结束才派发 `joyflock:game-points`（结算动画靠它识别 award）；购买 / 迁移 / 跨标签同步一律走 `joyflock:shop-changed` 或 `storage`，否则 `result-points.js` 会把余额变化误当成新一局奖励并重播动画。
- `load()` / `reset()` / 登出清理 / `__joyflockMe` 判定都必须保留钱包余额，只能清 `games / wins / byGame / last`；`daily` 额度任何情况下都不能被清（否则可绕过每日 5,000 上限）。
- 每日上限限制的是**每天赚取的量**，不是余额上限；商城消费会同步降低排行榜数值，这是单一余额的必然结果。
- 文案：全站中文「积分」已清零，统一 `Joy Coins`；斯诺克「单杆分 / pts」是局内得分，保持原样。改文案要同步 `dist/table/table-locale.js` 的中文键（翻译表以中文原串为键）、`tests/site-joycoin.test.mjs` 与 `tests/table-member-facts.test.mjs`。
- 验收：`npm test` **865/865**、CDP `.workbuddy/tmp/joycoin-unified-cdp.mjs` **24/24**。共享键 `20261115-joincoin1`；需 **Ctrl+F5**。

## 01:20 — 商城三档价格只有一处真源
- `dist/site-points.js` 的 `PRICE=1000`（稀有）/ `EPIC_PRICE=3000` / `LEGEND_PRICE=5000` 是唯一价目表；`RARITY` 与 `__joyflockShop.{price,epicPrice,legendPrice}` 都从这里派生。改价必须改这三个常量，**不要**在 `site-shop.js` 的卡片里逐项写死。
- 但 `site-shop.js` 有 9 处**静态文案**写死了数字（顶部档位说明、hero 页脚、底部长说明、史诗/传说兑换提示与会员路线说明，中英文各一份），改价时务必一起改，否则文案与实扣金额不一致。
- `site-points.js` / `site-shop.js` / `site-points.css` 的 `VERSION='20261112-gamelanes1'` 是**冻结键**：`tests/site-shop-redeem-layout.test.mjs`、`site-points.test.mjs` 等 20+ 处硬编码，bump 会连锁失败；改内容后靠 **Ctrl+F5** 验收。
- 改价要同步 10 个测试文件里的 `priceOf` / `buy().cost` / shortfall / 余额断言（清单见 `docs/QA.md` 01:20 段）。注意区分稀有商品：`plane-cloud2d`、`cursor-ember`、`trail-star` 等仍是 1,000，别被批量替换误伤。
- 会员权益与免费默认款不随价格变化：史诗对 VIP / 年费免费、传说对年费免费，default 恒为 0。验收 `.workbuddy/tmp/shop-prices-cdp.mjs` **19/19**；`npm test` **865/865**。

## 01:40 — 页脚链接删改须知
- 共用页脚是**每个 HTML 里手写的静态片段**，没有统一组件：改动必须覆盖 6 个文件（`dist/portal/index.html` + `membership/terms/privacy/contact/shop.html`），且 `shop.html` 的那条商城链接带 `class="active"`，精确字符串匹配时要单独处理。
- 顶部导航的商城链接与 footer 的商城链接是两回事；删 footer 时**不要**顺手删 `header nav` 里的 `nav-shop`，否则商城页失去入口（`tests/site-shop-nav.test.mjs` 会拦）。
- 页脚 `<a>` 数量断言在 `tests/site-membership-footer.test.mjs`（01:46 起是 **5**：brand + 会员/条款/隐私/联系 4 条），`tests/site-joycoin.test.mjs`、`tests/site-shop-nav.test.mjs`、`tests/game-seo.test.mjs` 也各有一条 footer 断言，改页脚必须同步这四处。
- `dist/site-shop.css` 的 `.shop-page{background:#090d1c}` 是 `tests/site-shop-motes.test.mjs` 的守卫（商城主区域不透明，ambient 静态星场才不会顶替 10 个动态光点）；不要移除该声明。
- 验收 `.workbuddy/tmp/footer-shop-link-cdp.mjs` **30/30**、`npm test` **865/865**。静态 HTML 需 **Ctrl+F5**。

## 01:46 — 页脚「全部游戏介绍」也已删除
- 6 个 shell 页面的 `<a href="/games/">…全部游戏介绍…</a>` 全部移除，footer 现在只有 brand + 会员/条款/隐私/联系 5 个 `<a>`。顶部导航、`/games/` 与 `/en/games/` 目录页、20 个落地页、sitemap / robots 都保留——只是不再从页脚链接。
- `tests/game-seo.test.mjs` 末尾的断言已反转：六个 shell **不得**再含该链接，但目录页文件与 sitemap 收录必须存在。改页脚时别把这条守卫一起删掉。
- 验收 `.workbuddy/tmp/footer-game-guides-cdp.mjs` **50/50**、`npm test` **865/865**。静态 HTML 需 **Ctrl+F5**；未提交、未部署生产。

## 02:37 — 页眉全屏按钮与右侧簇宽度须知
- 全站页眉的「全屏」按钮是**两套文件 + 26 个静态 HTML**：`dist/site-fullscreen.css`（样式、`order:99`、≤480px 收紧到 218px 预算）、`dist/site-fullscreen.js`（通用全屏切换、中英标签、portal 游戏态让位），所有页面用共享键 `20261115-joincoin1` 引用。按钮静态写在 HTML 里，脚本只绑行为，所以首帧不会跳动。
- 改 `.top-actions` 宽度必须**同时**改 `site-chrome.css`（基础 373 / 480 段 266 / 760 段 275 / 600 段 194）与 `site-points.css`（479/405、373/381、282/290、266/266），并同步 `tests/site-points.test.mjs`、`tests/site-account-width-grant.test.mjs`、`tests/site-fullscreen-header.test.mjs` 的宽度断言。桌面槽位 = 92px + 10px gap，≤600px = 42px + 6px gap。
- `scripts/build-game-seo.mjs` 的 `head()` / `shell()` 模板必须保留 `FULLSCREEN_KEY` 的 link、button、script；重跑生成脚本会重写 20 个落地页 + `games.css` + sitemap + robots。模板里的内联 CSS 已同步回工作区版本（body 无背景渐变、`.hero-art{height:auto}`），重跑幂等；**若以后改了 games.css，记得同步模板**。
- portal 的 `bindPoolFullscreen` 与共享脚本共用同一个 `#fullscreen` 元素：游戏态由 pool 独占，返回大厅靠共享 listener 的 `stopImmediatePropagation` 拦住残留 handler，不要给按钮再加第三个 click listener。
- 验收 `.workbuddy/tmp/fullscreen-header-cdp.mjs` **107/107**、`npm test` **875/875**。静态资源需 **Ctrl+F5**；未提交、未部署生产。

## 03:05 — 左侧 dock 背景须知
- `#play aside.game-rail` 在**大厅态**必须保持 `background:transparent`（`portal.css` 桌面 hover 媒体块里的既有规则）；只有 `body.playing` 态才用 `body.playing #play aside.game-rail{background:#0b1020;background-image:none}` 压成与 `.game-stage` / iframe 一致的底色。别把这条基础规则写进 hover 媒体查询，也别给它加 `border-right`。
- 那条「看起来有背景」的竖条是 `body::before` 的 ambient 径向光晕从透明栏里透出、被右侧不透明 iframe 截断造成的；关光晕或压同色都能消除，但关光晕会改变整站氛围，当前选压同色。若以后要「整页透出星空」，需改嵌入态 iframe 首页（`html.embedded-game` / `body.portal-embedded:not([data-screen="play"])`）的背景，注意别影响 `data-screen="play"` 的 9 个游戏画面。
- `portal.css` 的缓存键是独立链（当前 `20261115-railbg1`，6 个 shell 页面引用）；改 portal.css 内容记得 bump，并同步 `tests/portal-rail-background.test.mjs`。
- 验收 `.workbuddy/tmp/rail-bg-acceptance.mjs` **11/11**、`npm test` **877/877**；诊断脚本 `.workbuddy/tmp/rail-bg-debug.mjs`、`rail-layer-debug.mjs`、`iframe-bg-debug.mjs`、`rail-bg-options.mjs` 可复用定位层叠背景。需 **Ctrl+F5**；未提交、未部署生产。

## 03:18 — ambient 动画首帧覆盖须知
- `dist/ambient.css` 的 `body::before` 是 `position:fixed;inset:0`（**正好一个视口**），由 `@keyframes ambient-drift` 做 26s 漂移。任何修改平移/缩放的关键帧都必须保证变换后四边仍盖住视口，否则刷新首帧会在平移方向露出 `body` 纯色（右侧黑条）。判据：`50% + scale*50% + translateX >= 100%` 且 `50% - scale*50% + translateX <= 0%`（Y 同理）。当前 `from` = `-4% / scale(1.12)`、`to` = `+5% / scale(1.16)`；旧值 `scale(1.05)` 会让右边缘停在 98.5%。
- `dist/site-floating-dots.js` 用 `sessionStorage` epoch 计算负 `--nebula-delay`，让刷新后动画相位连续；**不要删掉这段**，但它只在脚本执行后生效，救不了首帧，所以覆盖必须由关键帧本身保证。
- `ambient.css` 是独立缓存键（当前 `20261115-nebula1`），被 27 个 HTML 与 `scripts/build-game-seo.mjs` 引用；改内容要整条 bump 并重跑 SEO 生成验证幂等。守卫在 `tests/ambient-nebula-coverage.test.mjs`。
- 验收 `.workbuddy/tmp/nebula-flash-cdp.mjs` **15/15**、`npm test` **880/880**；诊断脚本 `.workbuddy/tmp/nebula-flash-debug.mjs` 可强制首帧/中段相位对比。需 **Ctrl+F5**；未提交、未部署生产。

## 03:27 — 会员卡片的链接在 HTML，不在脚本
- `/table/index.html` 是 9 个游戏共用的内嵌首页（portal `?game=<id>` 通过 `#game-frame` 载入）；「会员与支持」卡片与它的 `<a href="/membership.html">会员说明 ↗</a>` 都静态写在这个 HTML 里，`table.js` / `intro-boot.js` 不动态生成，改这类元素直接改 HTML 即可。注意 portal 的游戏 id（`pool / flight / four / gomoku / chess / xo / cards / snooker / bubbles`）与 SEO 目录名（`connect-four` 等）不同，写验收脚本要用前者。
- 本轮删了该链接及 5 处 `.member-note a` 死 CSS 规则 + 1 条 locale 词条；**没有 bump 缓存键**，因为这些死规则无匹配元素、旧缓存等价。守卫在 `tests/table-member-note-link.test.mjs`，真机脚本 `.workbuddy/tmp/member-note-link-cdp.mjs`。`npm test` **885/885**、CDP **44/44**。需 **Ctrl+F5**；未提交、未部署生产。

## 11:40 — 商城装配栏须知
- `#shop-current` 由 `dist/site-shop.js` 的 `LOADOUT_SLOTS` + `currentLoadoutHtml(s)` 生成，是 `getState().equipped` 的只读视图；**新增装备槽位时必须同步这张表**（目前 16 项，与 `site-points.js` 的 `GAME_DEFAULTS` 以及 `ball/cue/table` 槽位一一对应）。表里字段名刻意用 `slot` 而不是 `kind`，否则 `tests/site-shop-grid6.test.mjs` 的 `kind:'fourPiece'` 统计会把槽位误当商品。
- 后 12 项图标走 `/assets/shop/game-styles/<id>.svg` 与 `/assets/shop/billiards-v2/<id>.svg`；新增商品要保证同名 SVG 存在，守卫在 `tests/shop-current-loadout.test.mjs`。前 4 项保留原 DOM 标记，`site-plane-fx.js` 的 `[data-plane-current]` 与 `site-trail.css` 的 `[data-trail-dot]` 仍依赖它们。
- 冻结键 `20261112-gamelanes1` 不能 bump（20+ 断言）；需要让浏览器拿新商城脚本/样式时，在 `dist/shop.html` 的两个 `?v=` 后追加 `&d=<版本>`，并确认 `tests/site-shop.test.mjs`、`site-shop-redeem-layout.test.mjs` 的键值提取正则带 `&` 排除。
- 验收 `tests/shop-current-loadout.test.mjs` **7 项**、`npm test` **892/892**、CDP `.workbuddy/tmp/shop-current-loadout-cdp.mjs` **27/27**。未提交、未部署生产。

## 11:59 — 顶栏右侧预留宽度必须等于真实内容宽度
- `.top-actions` 的固定宽度是**首帧锚定**用的，不能用 `justify-content:flex-end` 掩盖余量（积分胶囊运行时插入会把语言选择器推左）；正确做法是让预算精确等于各胶囊宽度 + gap。当前桌面 guest **381**、signed **405**，760px **373/381**，600px **282/290**，480px 两态统一 **218**。算术守卫在 `tests/site-topbar-right-gap.test.mjs`，改任一胶囊宽度必须同步这张表与 `site-fullscreen.css` 的 480px 预算。
- 顶栏右侧 padding 单独收紧为 16px（`padding:0 16px 0 var(--chrome-pad)`）；`--chrome-pad` 仍用于左侧品牌与 footer，不要直接改变量值，否则全站内容区都会跟着变。
- `portal-editorial.css` 的 600px 规则 `body:not(.playing) .topbar{...padding:0 12px}` 特异性高于 shell 断点，480px 以下必须再覆盖一次，否则 390px 大厅首页会横向溢出。
- 冻结键不能 bump；需要刷新 CSS 时在 HTML 引用后加 `&d=<版本>`，并确认 `site-points.test.mjs`、`site-header-compact.test.mjs`、`site-cursor-usable.test.mjs`、`site-shop*.test.mjs` 的键值提取正则都排除了 `&`。
- 验收 `npm test` **897/897**、CDP `.workbuddy/tmp/topbar-right-gap-cdp.mjs` **153/153**；诊断脚本 `.workbuddy/tmp/topbar-gap-debug.mjs`、`topbar-gap-matrix.mjs` 可复测各断点内外余量。未提交、未部署生产。

## 12:24 — 排行榜头像框与缓存链
- 内嵌首页排行榜由 `intro-boot.js` 的 `window.__joyflockRankRow` 生成 `.avatar-shell` + `.seat-avatar`；前三名专属装饰全部集中在 `dist/table/table-home-clean.css` 的 `body.table-home-theme:not([data-screen="play"]) #leaderboard li:has(.rank-medal.rank-N)` 规则组里（行渐变 / `::before` accent bar / 头像 ring）。本轮只删 ring 三条，其它两条是独立于头像的 podium 视觉，勿一起删。
- `table-home-clean.css` 的键属于整条共享链（`20261115-joincoin1`），不能单独 bump；改这个 CSS 后在 `dist/table/index.html` 的引用加 `&d=<版本>`，并同步 `tests/table-avatar-fallback.test.mjs`、`table-join-removed.test.mjs`、`table-member-facts.test.mjs`、`table-ranking-width.test.mjs` 的键值提取正则为排除 `&`。守卫 `tests/table-rank-avatar-frame.test.mjs` 会扫描全站 CSS 防止别处重新画框。
- 头像自身的白色 / VIP 金色圆角描边是通用样式（`rank-badges.css` 76-88、`visual-v7.css` 第 8 行），不属于「前三名头像框」，删它会让所有页面头像一起变样。
- 验收 `npm test` **901/901**、CDP `.workbuddy/tmp/rank-frame-cdp.mjs` **51/51**；诊断脚本 `.workbuddy/tmp/rank-frame-debug.mjs` 可逐行打印 computed 样式与匹配规则。未提交、未部署生产。

## 12:35 — 游戏内全屏按钮与跨 iframe 协议
- 聊天面板由 `dist/table/pool-shell.js` 的 `createChat()` 生成，是 9 个游戏共用的模块。`#leaderboard` 之类静态文案走 `table-locale.js` 的字典，但**这个按钮例外**：`bindTableLocale()` 的 TreeWalker 监听 `characterData` 并用 `data-system-english` 改写文本，会与运行时标签打架，因此字典 walker 里显式跳过 `.pool-chat-fullscreen`。以后新增「JS 自己维护文字」的控件要照此处理，或改走字典词条。
- 全屏状态机只在 `dist/portal/pool-fullscreen.js`（`bindPoolFullscreen`）。iframe 内**不要**自己调 `requestFullscreen()`：发 `joyflock:toggle-fullscreen`，外层复用 `enter()/exitStage()` 并广播 `joyflock:game-fullscreen`；子页面加载时发 `joyflock:fullscreen-query` 问初始状态。`portal-controls.js` 仍负责把广播写成 `body[data-game-fullscreen=1]`。`window.parent===window` 时才用本页原生全屏兜底。
- 改这些文件要在 7 处引用后加 `&d=<版本>`：`pool-shell.js`（`table/table.js` + `pool-result-preview.html`）、`pool-shell.css`（`table/index.html` + 两个 preview）、`pool-fullscreen.js`（`portal/portal.js`）、`table-locale.js`（`table/table.js`）。四个 `?v=` 键都是冻结/共享键，不能单独 bump。守卫 `tests/table-chat-fullscreen.test.mjs` 会检查强刷参数与协议。
- 验收 `npm test` **906/906**、CDP `.workbuddy/tmp/chat-fullscreen-cdp.mjs` **23/23**。CDP 进入对局态要连点 `computer` 与 `[data-lg-start]`（难度确认），只点 `computer` 会停在 home。未提交、未部署生产。

## 12:57 — 排行榜宽度链路与标签均分
- 桌游首页排行榜实际网格容器是 `#intro`（`.intro-grid` 被 `display:contents` 化），`table-home-clean.css` 里 `grid-template-columns:minmax(0,1fr) 460px` 同时出现在 `.intro-grid` 和 `#intro` 两处，改宽度必须一起改；1201–1450px 断点另有一处 `390px`。shell 宽度由后面 `#intro{zoom:...;max-width:min(1160px,74vw)}` 决定，改右栏不放大 shell 会挤压左侧游戏介绍。
- 行 / 表头必须成对改：`#leaderboard li{grid-template-columns:32px minmax(0,1fr) 64px 48px;column-gap:16px}` 与 `.ranking-columns{grid-template-columns:1fr 64px 48px;column-gap:16px}`。表头首列 1fr 正好等于行「奖牌列 + 间距 + seat 列」，两个数字列才能对齐；`--rank-row:34px` / `min-height:calc(var(--rank-row)*10)` / 各 min-height 断点不能动，否则十行高度与 iframe 适配全变。
- `.period-tabs` 在文件后面还有一条只写 `margin-bottom:6px` 的同名规则，所以 `tests/table-ranking-width.test.mjs` 的 `block()`（取最后一条）不适用，新增断言用 `blocks().find(b => b.includes('gap:0'))` 取真正的布局块。
- 缓存：`table-home-clean.css?v=20261115-joincoin1` 是共享冻结键，改 CSS 只在 `dist/table/index.html` 换 `&d=`（本轮 `rankframe1 → ranklayout1`），并同步 `tests/table-rank-avatar-frame.test.mjs` 的 `REFRESH` 常量；`tests/table-ranking-width.test.mjs` 的版本正则已排除 `&`。
- 验收 `npm test` **909/909**、CDP `.workbuddy/tmp/rank-layout-cdp.mjs` **106/106**（脚本自带 Chrome headless 启动与关闭，不需预开 9223）；对比图 `docs/verification/rank-layout-20261115-compare.png`。未提交、未部署生产。

## 13:13 — 飞行棋头像框与共享相框样式表
- 飞行棋首页（`dist/index.html`）有两套头像：对局 `#players .player-avatar`、大厅 `#seat-grid .seat-avatar`，形状都由 `dist/visual-v2.css` 的 `.player-avatar / .seat-avatar{border-radius:50%}` 决定；`styles.css` 的 13px 圆角是更早的基线，被 v2 覆盖。后续 visual-v3/v5/v7 只改尺寸，不改圆角。
- 全站统一方框规则在 `dist/rank-badges.css` 末尾：排行榜 `body.table-home-theme #leaderboard .seat-avatar, .leaderboard-avatar{22% + #F3D2AD}`；桌游座位在 `dist/table/seat-frame-square.css`；飞行棋本轮加 `#players .player-avatar, #seat-grid .seat-avatar{22% + #F3D2AD}`。**必须用 ID 限定**，否则全局 `.seat-avatar` 会把桌游 `table.css` 里刻意保留的圆形座位一并改方。
- 圆形 VIP 徽章例外要成组维护：`rank-badges.css` 里 `.leaderboard-avatar[data-frame=...]` 与 `#players .player-avatar[data-frame=...]` 都保持 50%，`seat-frame-square.css` 用 `:has(.avatar-frame)` 处理桌游。
- `rank-badges.css?v=20261113-avatarframe1` 是 `index.html` / `table/index.html` 共用冻结键（测试断言），改文件后只给 `dist/index.html` 加 `&d=20261115-flightsquare1`；若以后需要同时改桌游外观，两个 HTML 要一起加参数。守卫 `tests/seat-avatar-square.test.mjs` 现已覆盖飞行棋方框、VIP 例外与加载顺序。
- CDP 脚本 `.workbuddy/tmp/flight-avatar-square-cdp.mjs` 自带 Chrome 启动；进入对局点 `#practice`，回大厅点 `#edit-crew`。验收 `npm test` **910/910**、CDP **11/11**；对比图 `docs/verification/flight-avatar-square-20261115-compare.png`。未提交、未部署生产。

## 13:25 — 门户快捷栏透明度与背景层归属
- 详情页左侧图标栏形状由 `dist/portal/portal.css` 决定：基础 `.game-rail{background:#0f162b}`，桌面 `@media(min-width:601px) and (hover:hover) and (pointer:fine)` 里改成 `background:transparent`，但 `body.playing #play aside.game-rail` 这条更高优先级规则曾在 `body.playing` 时刷成实色 #0b1020。本轮把它改回 `transparent`，所以三种宽度都透出 `dist/ambient.css` 的 `body::before` 星云。
- 背景层只有一份：`ambient.css` 的 `body::before`（`--ambient-nebula-opacity` 默认 1）/ `body::after` 星点。首页 `dist/portal/portal-editorial.css` 只设 `--home-bg:#0b1020`，**不要**在这里覆盖 `--ambient-*`，否则会把 6 个信息页一起改掉。内嵌游戏 iframe 有 `html.embedded-game` 把星云降到 .62，两者是不同 viewport，视觉上允许 x≈76px 交界有轻微亮度差。
- `portal.css?v=20261115-railbg1` 被 `portal/index.html` + membership/terms/privacy/contact/shop 共 6 页引用，属共享键；改 CSS 后必须给 **6 处**都加同一个 `&d=`（本轮 `20261115-railclear1`），不要只改 portal 首页。守卫 `tests/portal-rail-background.test.mjs` 会检查透明规则、首页变量未动、6 页同键。
- 验收 `npm test` **911/911**、CDP `.workbuddy/tmp/portal-rail-transparent-cdp.mjs` **16/16**；对比图 `docs/verification/portal-rail-transparent-20261115-compare.png`。未提交、未部署生产。

## 13:38 — 难度加成的名次条件
- 全站唯一计分器是 `dist/game-points.js` 的 `pointsFor(r)`；`rankOf(r)` 返回 1=胜、0=平、>1=负（桌游用 1-based `winner`，飞行棋用 `ranking` 数组）。本轮把 `bonusPct` 改成 `rank===1? ... :0`，所以 `record()` 写进 `state.last` 的 `bonus / bonusPct` 在非胜局都是 0。
- `dist/table/table.js` 仍在每次本地电脑结算时传 `BOT_BONUS[难度] (+ 台球无辅助线 20)`，**不要**在那里按胜负删参数：判定放在计分器里才能覆盖所有调用方（含飞行棋与未来新增游戏）。
- `dist/table/result-points.js` 的 `paint()` 已有 `award.bonus>0 && !capInfo.capped` 才显示 `基础分 + 难度加成` 行的逻辑，因此计分器归零后该行自动隐藏，结算模块无需改动。注意隐藏时 `breakdownValue` 的旧文本仍留在 DOM 里，但 `hidden=true` 不会渲染。
- 缓存：`game-points.js` 的 `VERSION` 与 `?v=20261112-gamelanes1` 被 4 个测试断言为冻结键，改这个文件时**不能** bump，也不能替换 `&d=20261115-joincoin1`（`rematch-flow.test.mjs` 要求 `dist/index.html` 仍含该串）。本轮在 3 个 HTML 引用后追加 `&r=20261115-nolossbonus1`；以后改计分器照此追加新的 `&r=` 即可。
- 验收 `npm test` **914/914**、CDP `.workbuddy/tmp/noloss-bonus-cdp.mjs` **13/13**；对比图 `docs/verification/result-no-loss-bonus-20261115-compare.png`。未提交、未部署生产。

## 13:48 — 头像框形状的唯一真源
- 所有玩家头像的形状现在由 `dist/rank-badges.css` 末尾那条全局 `.seat-avatar, ... {border-radius:22%;background-color:#F3D2AD}` 决定。基础圆形声明仍留在 `dist/table/table.css`、`.visual-v2.css`、`visual-v7.css`（多个旧测试明确依赖它们存在），靠**加载顺序**覆盖：`rank-badges.css` 必须在 `table.css` / `room-dialog.css` / `snooker-shell.css` / `visual-v2.css` / `reaction-preview.css` 之后加载，两个页面目前都满足。
- 新增任何头像类名时，把它加进这条全局规则即可；不要再写单页面的 `border-radius:50%` 覆盖。`seat-frame-square.css` 与 `rank-badges.css` 里三处 VIP `:has(.avatar-frame)` / `[data-frame]` 例外是刻意的，会员相框图是圆形，内圈必须跟着圆。
- 缓存链约束：`rank-badges.css?v=20261113-avatarframe1` 与 `site-chrome.css?v=20261112-gamelanes1&d=20261115-topbar1` 都被测试断言为冻结键，改这两个 CSS 时**不要** bump 或替换这些串，只在后面追加/更新 `&d=` 或再追加 `&r=`。本轮两页统一 `&d=20261115-squareall1`，6 个 shell 页追加 `&r=20261115-squareall1`。
- 测试 `tests/avatar-square-everywhere.test.mjs` 是全站守卫；`tests/seat-avatar-square.test.mjs`、`tests/leaderboard-avatar-frame.test.mjs` 保留旧的圆形基础断言。验收 `npm test` **922/922**、CDP `.workbuddy/tmp/avatar-square-all-cdp.mjs` **46/46**；对比图 `docs/verification/avatar-square-all-20261115-compare.png`。未提交、未部署生产。

## 14:00 — 排行榜奖牌留白的两个真源
- 桌游详情页：装饰竖条是 `dist/table/table-home-clean.css` 里 `#leaderboard li:has(.rank-medal.rank-N)::before` 的 `left:0` 绝对定位。奖牌列与竖条之间靠 `li{padding-left:14px}` 留白；**`.ranking-columns` 必须用同一个 14px**，否则表头数字列会与行错位（`tests/leader-medal-spacing.test.mjs` 断言两者相等）。
- 首页：`.leaderboard-shell` 的 `--lb-pad` / `--lb-gap` 同时驱动 `.leaderboard-row` 与 `.leaderboard-columns`，改这两个变量即可，`grid-template-columns:var(...)` 会自动同步。注意名字列是 `minmax(0,1fr)`，pad + gap 每多 1px 会吃掉 2 / 4px 名字宽度；实测最长示例名需 106px，默认断点名字列不能低于约 120px，否则出现省略号（480 / 360 断点只加 pad 就是为此）。
- 缓存：`table-home-clean.css?v=20261115-joincoin1`、`visual-v7.css?v=20261106-vip` 均为测试断言的冻结键，改这两个文件只在后面更新 / 追加 `&d=`。本轮两页统一 `&d=20261115-medalspace1`。
- 验收 `npm test` **926/926**、CDP `.workbuddy/tmp/leader-medal-spacing-cdp.mjs` **19/19**；四联对比图 `docs/verification/leader-medal-spacing-20261115-compare.png`。奖牌造型仍是圆形金银铜币，未改成飞行器图标；未提交、未部署生产。

## 14:19 — 内嵌页背景的真源与边界
- 详情页左侧那条「像边框」的线不是 `border`，而是透明度不一致：`aside.game-rail` 早已透明，但 `.game-stage`、`.game-stage iframe`、内嵌页 `html` / `body` 仍有实色 `#0b1020`。现在四层都透明，portal 的 `body::before` 星云是唯一背景。以后若再改这里，先查这四层而不是去找 `border`。
- 透明规则集中在 `dist/ambient.css` 末尾，全部用 `html.embedded-game body.table-home-theme:not([data-screen="play"])` 限定。**不要**改成 `html.embedded-game body{...}`：飞行棋内嵌页是另一套主题，洗成透明会让深蓝文字不可读；对局态也需要自己的 `data-screen="play"` 表面。`dist/table/table-home-clean.css` 里 `body.table-home-theme:not([data-screen="play"]){background:#0b1020}` 是独立页的底色，必须保留。
- 内嵌页自己的 `body::before/::after` 与 `i.joymote` 被 `display:none`，避免第二层 .62 星云和重复星点。`html.embedded-game` 的 `--ambient-nebula-opacity:.62` / `--ambient-star-opacity:.55` 变量仍保留（`tests/portal-rail-background.test.mjs` 有断言，JS 也会读），但已不再用于绘制该层。
- 缓存：`portal.css?v=20261115-railbg1`、`ambient.css?v=20261115-nebula1` 两个冻结键被测试断言，改这两个文件只在后面更新 / 追加 `&d=`。本轮 6 个 portal.css 引用与 27 个 ambient.css 引用统一 `&d=20261115-clearstage1`；SEO 生成器保持冻结键即可。
- 验收 `npm test` **931/931**、CDP `.workbuddy/tmp/portal-stage-transparent-cdp.mjs` **20/20**；对比图 `docs/verification/portal-stage-transparent-20261115-compare.png`。390×844 内嵌桌游页既有 44px 横向溢出（改前改后相同），未处理。未提交、未部署生产。

## 14:33 — 星云现在是静态帧，别再按动画思路排查背景差异
- `dist/ambient.css` 的 `body::before` 现在是 `animation:none` + `transform:translate3d(-4%,-2.5%,0) scale(1.12)`。`@keyframes ambient-drift` 与 `animation-delay:var(--nebula-delay,0s)` 保留为未来 opt-in 钩子和既有测试依赖；`dist/site-floating-dots.js` 仍写 `--nebula-delay`（墙钟相位），但当前不参与绘制。
- 排查「两页背景不一样」的正确顺序：① `aside.game-rail` / `.game-stage` / `#game-frame` / 内嵌 `html` / 内嵌 `body` 五层是否都透明（14:19 的结论）；② `body::before` 的 `animationName` 是否 `none`、transform 是否一致；③ 取样区域是否被卡片/顶栏内容覆盖（内容不同不是背景不同）。不要再去找 CSS `border`。
- 历史原因：旧实现用每标签页 `sessionStorage` 的 `joyflock.nebula.epoch` 回绕 52s 漂移周期，动画又从首帧渲染开始，iframe 重的页面更晚 → 两页永远停在不同帧。若恢复动效，必须同时解决「动画起点绝对时间轴」问题（例如用 JS 每帧按 `Date.now()%52000` 直接写 transform），否则会重现本次问题。
- 缓存三套引用（6 portal.css / 27 ambient.css / 19 site-floating-dots.js）统一 `&d=20261115-staticnebula1`，冻结 `v=` 不动。`tests/site-shop-motes.test.mjs` 的共享键正则已改成 `([^"'&]+)`，以后再追加参数不会误判。
- 验收 `npm test` **935/935**、CDP `.workbuddy/tmp/nebula-phase-sync-cdp.mjs` **15/15**；对比图 `docs/verification/portal-bg-static-20261115-compare.png`。未提交、未部署生产。

## 14:49 — 页眉全屏控件只有文字，别再找按钮样式
- `dist/site-fullscreen.css` 是唯一视觉来源：`header.topbar #fullscreen` 现在是 `background:transparent / border:0 / border-radius:0 / box-shadow:none / appearance:none`，文字色 `#c8d3ff`，hover 与 `aria-pressed="true"` 只改颜色（hover 另加下划线）。`dist/portal/portal.css` 里的 `body.playing #fullscreen` 只剩 `display:inline-flex;flex:none;order:3` 可见性钩子，旧的渐变胶囊和 hover transform 已删除；`body.playing #fullscreen:hover{color:#fff}` 必须保留，因为 `tests/portal-rail-background.test.mjs` 用它作位置锚点。
- **不要为了「看起来更整齐」把 92 / 42 / 38px 固定槽位改成 auto**：`tests/site-topbar-right-gap.test.mjs` 与 `site-chrome.css` / `site-points.css` 的所有预留宽度都按这三个数字算，改成自适应会让「全屏 ↔ 退出全屏」时整个右簇跳动，或顶栏溢出 390px 屏幕。
- 手机端是 `font-size:0` + `::before{content:"⛶"}` 的无框字符，不是按钮；如果用户之后要求手机也显示完整文字，需要同时调整 218px 预算与两个样式表里的断点数字，不能只改 `site-fullscreen.css`。
- 强刷参数 `&d=20261115-fstext1` 同时写在 26 个 HTML 与 `scripts/build-game-seo.mjs`（`FULLSCREEN_REFRESH` 常量）；冻结 `v=20261115-joincoin1` 不要 bump。重建 SEO 页会重新生成同样的引用。`portal.css` 也因本轮删掉旧胶囊，在 6 个 shell 页追加了 `&r=20261115-fstext1`；删改该文件时记得继续 bump 这个参数。
- 验收 `npm test` **937/937**、CDP `.workbuddy/tmp/fullscreen-text-cdp.mjs` **71/71**；对比图 `docs/verification/fullscreen-text-20261115-compare.png`。未提交、未部署生产。

## 15:04 — 站内现在有两处纯文字全屏控件，别混为一谈
- **顶栏**：`dist/site-fullscreen.css` 的 `header.topbar #fullscreen`（26 个页面 + SEO 生成器），14:49 改成纯文字，本轮**故意没动**。用户明确说「这个不动」。
- **房间聊天**：`dist/table/pool-shell.css` 的 `.pool-chat-fullscreen`（桌游 iframe / 独立 table 页），15:04 改成纯文字。文案与状态由 `dist/table/pool-shell.js` 的 `chatFullscreenCopy/syncChatFullscreen` 维护，点击通过 `joyflock:toggle-fullscreen` 交给 portal 的 `bindPoolFullscreen`，这层逻辑一行没改。
- 两处都保留了各自的固定/弹性布局策略：顶栏保留 92/42/38px 槽位（改 auto 会打乱 `.top-actions` 预留宽度）；聊天按钮去掉 `min-width:76px`，因为标题行是 `space-between`，文字变长不会推动其它元素。
- 缓存：顶栏链 `&d=20261115-fstext1`，portal.css 另 `&r=20261115-fstext1`；聊天链在 3 个 HTML 上 `&d=20261115-chatfs1&r=20261115-chattext1`。以后改 `pool-shell.css` 记得继续 bump `&r=`，不要动 `v=20261112-gamelanes1` / `&d=20261115-chatfs1`（`tests/table-chat-fullscreen.test.mjs` 有断言）。
- 验收 `npm test` **938/938**、CDP `.workbuddy/tmp/chat-fs-text-cdp.mjs` **23/23**；对比图 `docs/verification/chat-fs-text-20261115-compare.png`。未提交、未部署生产。

## 15:25 — 「自己」这行的身份源是 game-points.js，不要再写死「你」
- `dist/game-points.js` 的 `leaderboardRow()` 现在是唯一身份源：`accountName()`（localStorage `joyflock.accountName` → cookie `joyflock_account`，`'0'` 视为游客）决定昵称与 `signedIn`；`isSelf:true` 让 `avatar-display.js` 的 `resolve()` 读取 `joyflock.shop.v1` 的 `equipped.avatar`。游客 fallback 到「你 / You」+ 默认笑脸。
- `dist/social-ui.js` 的首页排行榜用 `avatarStyle({...p, isSelf:p.self===true, signedIn:p.signedIn!==false})`；**不要改回 `this.viewer.authenticated`**，那是 UI 预览账号状态，会把已登录用户的头像强制回退成默认笑脸。桌游 iframe 侧不需要额外代码：`intro-boot.js` 的 `__joyflockRankRow` 把整行 profile 交给 `__joyflockAvatar`。
- 排查「头像与顶栏不一致」的顺序：① 看 self row 有没有 `data-self="1"`；② 看 `leaderboardRow()` 是否带 `isSelf` / `signedIn`；③ 看 `avatar-display.resolve()` 是否读到 `joyflock.shop.v1` 的 `equipped.avatar`（iframe 有独立 JS realm 但同源共享 localStorage）；④ 顶栏 `--shop-avatar` 由 `site-points.js` 写入，登录态由 `site-account.js` 的 `/api/me` 决定。
- 缓存：3 个 HTML 的 `game-points.js` 带 `&s=20261115-selfrow1`，`app.js` 的 social-ui import 与 `dist/index.html` 的 app.js 引用带 `&d=20261115-selfrow1`；冻结 `v=` 不要 bump。以后再改 `social-ui.js` 记得同时 bump 这两处。
- 验收 `npm test` **940/940**、CDP `.workbuddy/tmp/self-row-avatar-cdp.mjs` **10/10**；对比图 `docs/verification/self-row-avatar-20261115-compare.png`。未提交、未部署生产。

## 15:37 — 全屏控件最终约定：顶栏是胶囊，聊天区只负责退出
- `dist/site-fullscreen.css` 现在**是**渐变胶囊（14:49 的纯文字版本已废止）：与 `.jp-pill` 同款 `linear-gradient(180deg,#1d2850,#141d3c)` / `1px solid #ffffff24` / `999px`，hover 光圈，按下态 `#2a3b76 → #1b2a55`。改这个文件时要保留 92×28 槽位、600/480 断点预算与 `user-select:none`。
- **不要再给任何全屏控件写 `button.title`**：`site-fullscreen.js`、`pool-fullscreen.js`、`portal.js`、`pool-shell.js` 都改成 `aria-label` + `removeAttribute('title')`。原生 tooltip 是 15:37 那个浅蓝白字方块的来源；按钮文字也必须保持 `user-select:none`，否则双击同样出现浅色选区。
- `dist/table/pool-shell.css` 的 `html.embedded-game .pool-chat-fullscreen{display:none}` + `[aria-pressed="true"]{display:inline-block}` 是刻意的：嵌入态只有顶栏负责进入全屏，聊天标题只在全屏显示出口。**独立标签页（`html` 没有 `embedded-game`）必须保留常驻按钮**，否则没有进入全屏的入口。排查「按钮不见了」先查 `aria-pressed` 与 `html.embedded-game`。
- 缓存链：26 个 HTML 的 `site-fullscreen.css/js` = `&d=20261115-fspill1`（生成器 `FULLSCREEN_REFRESH` 同值）；`pool-shell.css` 追加 `&t=20261115-fspill1`；`pool-shell.js`（table.js + preview）与 `pool-fullscreen.js`（portal.js import）追加 `&r=20261115-fspill1`；`portal.js` 追加 `&d=20261115-fspill1`。冻结 `v=` 不动，以后改这些文件继续 bump 对应参数。
- 已知既有现象（本轮未改）：浏览器拒绝原生全屏时走 `pool-stage-expanded` 降级，门户顶栏会盖住 iframe 顶部约 38px；原生全屏成功时顶栏本就不渲染，不受影响。headless CDP 只能跑降级路径，故聊天标题的干净 AFTER 图用独立页同状态补拍。
- 验收 `npm test` **941/941**、CDP `.workbuddy/tmp/fs-final-polish-cdp.mjs` **35/35**；对比图 `docs/verification/fs-polish-20261115-compare.png`。未提交、未部署生产。

## 16:01 — 胜率榜的身份源与两套排序
- `/table/index.html` 的 `.home-ranking` 现在是**胜率榜**：`intro-boot.js` 的 `__joyflockRankRow` 输出 `wins/games` 与 `winRate.toFixed(1)+'%'`；demo 数据 `wins` 数组与 `winRate` 由 `__joyflockDemoRows` 提供。改列内容时别只改 HTML 列头，行 DOM 在这个函数里。
- **两套排序共存**：`game-points.js` 的 `rankRows(rows,by)` 默认按 `points`（首页 `social-ui.js` 调用 `rankRows(rows)` 不带参数），只有 `.home-ranking` 存在的详情页传 `'winRate'`。`table.js` 的 `refreshLeaderboard()` 显式传 `'winRate'`。不要把默认排序改成胜率，否则首页列头与数据会不一致。
- 真实联机行的 `wins` 来自 `TableService.leaderboard` 的 `sum(case when t.rank=1 then 1 else 0 end)`；`Ranking` record 末尾追加了 `long wins`，SQL 按 `::numeric/nullif(count(*),0)` 排序。旧后端没有该字段时前端降级为 `0/N` + `0.0%`，**不要**在前端反推胜场。后端改动需重新构建镜像。
- 缓存链：`intro-boot.js` / 详情页 `table.js` = `&d=20261115-winrate1`，`table-home-clean.css` = `&t=`，`table-locale.js`（在 table.js 内 import）= `&r=`，3 个 HTML 的 `game-points.js` = `&w=`，冻结 `v=` 不动。多个旧测试把 `?v=` 后整串当版本，已统一改为只取 `v` 值（`[^"'&]+`），以后再 bump 不要回退这个写法。
- 列宽 60px/60px 与 `padding-left:14px` 是表头对齐的关键；`tests/winrate-leaderboard.test.mjs` 守卫标签、列头、demo 递减、行格式、双模式排序、后端 SQL 与缓存链。
- 验收 `npm test` **948/948**、Maven 容器编译通过、CDP `.workbuddy/tmp/winrate-board-cdp.mjs` **23/23**；对比图 `docs/verification/winrate-board-20261115-compare.png`。底部 `#stats` 与首页 Pilot leaderboard 仍是 Joy Coins 口径。未提交、未部署生产。

## 17:37 — 聊天全屏按钮的悬停态是「全局按钮皮肤」，不是 tooltip
- 更正 15:37 段：浅蓝方块主要来自 `dist/table/table.css` 的 `button:hover:not(:disabled){background:#eaf2ff;transform:translateY(-1px)}`；`table-home-theme.css` / `pool-home.css` 的 `:not([data-screen="play"]) button:hover` 在非对局屏还会给 `#293657`。`title` / 文字选区只是叠加因素。
- `dist/table/pool-shell.css` 的平坦规则必须带 `.pool-chat-panel .pool-chat-heading` 前缀（0,5,0）：只写 `.pool-chat-heading`（0,4,0）会被主题的 0,4,1 压过。以后别删父级前缀，也别去改 `table.css` 的全局按钮皮肤（会影响所有桌游按钮）。
- 缓存链新增 `&h=20261115-nohover1`（3 个 HTML 的 `pool-shell.css`）；冻结 `v=` 与 `&d/&r/&t=` 不动。`tests/table-chat-fullscreen.test.mjs` 同时断言全局浅色 hover 规则仍在、由本地覆盖，避免后人误改全局。
- 验收 `npm test` **948/948**、CDP 三态计算样式全透明且对照复现浅块；截图 `docs/verification/chat-fullscreen-hover-flat-20261115.png`。未提交、未部署生产。

## 17:40 — 胜率榜只显示局数，但 wins 仍是数据源
- `dist/table/intro-boot.js` 的 `window.__joyflockRankRow` 是**详情页** demo 行、`table.js` 真实行与 `game-points.js` 的 `renderBoard()` 共用的行构建器。17:40 起左列只打印 `String(row.games)`，右列仍是 `winRate.toFixed(1)+'%'`；首页 Pilot leaderboard 走 `social-ui.js` / `#leaderboard-shell`，不要在这里改首页列。
- **`wins` 不能删**：`__joyflockDemoRows` 的 `winRate`、`table.js` 的 `games?wins/games*100:0`、`game-points.js` 的 `rankRows(rows,'winRate')`、后端 `TableService` 的胜场聚合与按胜率排序都依赖它。它只是不再显示。列宽保持 60px/60px。
- 列头中文是「局数」；`table-locale.js` 已有 `'局数':'Games'`，所以英文态不用改字典。旧的 `'胜/局':'Wins/Games'` 条目故意保留，兼容仍带旧列头的缓存页面。
- 缓存链：`intro-boot.js` 追加 `&g=20261115-gamesonly1`（只此一处，改的是行内容）；冻结 `v=20261115-joincoin1`、`&d=20261115-winrate1` 与其它 `&r/&t/&w/&s/&h` 不动。以后再改行构建器继续 bump `&g=`。
- 验收 `npm test` **948/948**、CDP 月/周/英文三态；截图 `docs/verification/games-column-20261115.png`。未提交、未部署生产。
