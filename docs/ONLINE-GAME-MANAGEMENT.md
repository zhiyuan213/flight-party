# 在线游戏管理规范（Online Game Management）

> 适用范围：JoyFlock 全部在线对局 —— 飞行棋 4 人房（`flight`）与 10 个桌游
> （`four` 四子连珠、`gomoku` 五子棋、`xo` 井字棋、`puzzle` 趣味拼图、
> `chess` 国际象棋、`draw` 你画我猜、`cards` 欢乐纸牌、`pool` 欢乐台球、
> `snooker` 斯诺克、`bubbles` 泡泡射击）。街机页的 `snooker` / `bubbles`
> 是同一房间 API 的另一视图，不另立规则。
>
> 权威状态一律在服务端。浏览器只渲染服务端下发的 `custody` / `graceUntil`，
> 本地 `localStorage` 只保存「本游戏上一次房间 id」作为重连提示，不参与判定。

---

## 1. 需求与最终语义

| # | 需求 | 落地语义 |
|---|------|----------|
| 1 | 朋友一起玩，两人必须都是真人 | `FRIENDS` 房只有真人加入才会进入 `PLAYING`；两人房不会用服务器机器人补位 |
| 2 | 4 人可以是 4 真人，也可以是多真人 + 多电脑 | 飞行棋 `FRIENDS` / `MATCHING` 房满 4 真人直接开局；未满则 `fillBots()` 补到 4 席，`managed` 只要求 ≥2 个真人身份 |
| 3 | 开局后有人退出，先 30 秒倒计时 | 席位进入 `grace`，`graceUntil = serverNow + 30000`；宽限内该席位**冻结回合**，其余真人仍可操作 |
| 4 | 30 秒仍未操作则由简单机器人操作 | 宽限到期转 `hosted`，由 **`easy`** 机器人代走（不是普通机器人，也不读取玩家保存的单机难度） |
| 5 | 游戏页面人物旁边有托管状态提示 | 席位卡名字旁显示「等待重连 30s」/「托管中 · 简单电脑」，带 `title` 说明与脉冲点；飞行棋船员列表同步显示 |
| 6 | 两个人都退出则双托管直到结束 | 每个席位独立 `active → grace → hosted`；全托管时 `tick()` / `automate()` 继续推进到 `board.over()` / `OVER` |
| 7 | 重新选择在线对决会连回现有对局 | 服务端按 `(game, principal/account)` 找到 `WAITING`/`PLAYING` 房并 `bind()` 还原席位；前端还按游戏保存房间 id 作为重连提示 |
| 8 | 托管状态结束不记录数据、不给积分 | 桌游跳过 `table_results`；飞行棋 `match_participants.hosted_at_end=true` → 跳过 `points_delta` / `score_recording_decisions` / `account_match_results` / `account_statistics` / outbox；前端跳过 `game-points.record()` 与结算积分滚动 |
| 9 | 所有游戏相同操作 | 后端 `CustodyPolicy`、前端 `online-custody.js` / `online-custody-ui.js` 是唯一语义来源 |
| 10 | 状态按游戏隔离 | 房间、状态、重连目标、计分账本全部按 `game` 分键/分表字段；`joyflock.online.room.<game>` 按游戏独立 |
| 11 | 打机器人不用此套逻辑 | 单机电脑对战与「只有 1 个真人 + 服务器机器人」的房间都是 computer match：退出即结束（房间 `CLOSED`），重新进入即新开一局 |
| 12 | 托管后不再一直倒计时 | `hosted` 席位**不再显示回合倒计时**，简单电脑按自己的短节奏（1.2s）连续代走；只有真人（active / grace）回合才显示 30 秒回合时钟 |
| 13 | 在线但不打也会托管 | `active` 真人在自己回合的 30 秒时钟到期且没有任何有效操作时，**直接进入 hosted**（不再叠加第二个 30 秒宽限）；只有当前回合席位可被这样托管 |
| 14 | 重新接入 / 动鼠标立刻取消托管 | 重新进入页面、重选在线对决、或真实 `pointermove` / `pointerdown` / `keydown` / `wheel` / `touchstart` 都会打 `/activity`，服务端把 grace / hosted 席位还原为 `active` 并补一个全新 30 秒回合；**普通轮询快照不是在线证明**，否则空闲玩家每 400ms 就会把自己的托管取消掉 |

---

## 2. 状态机

```
                 leave / 掉线                     重连 / 重新选择在线对决 / 动鼠标
  ┌────────┐  ─────────────────►  ┌─────────┐  ─────────────────────────►  ┌────────┐
  │ active │                      │  grace  │                              │ active │
  │ 真人   │  ◄─────────────────  │ 30 秒   │   (同一席位 / 同一身份 / 同一装扮) └────────┘
  └────────┘   30 秒内任意操作     │ 冻结回合│                                     ▲
       │  ▲                       └────┬────┘                                     │
       │  │                            │ 30 秒到期                                 │
       │  │                            ▼                                          │
       │  │                       ┌──────────┐   双托管也一直跑到游戏结束          │
       │  └───────────────────────│  hosted  │──────────────────────────────┐     │
       │      重连 / 动鼠标        │ 简单电脑 │                              │     │
       │                          │ 无倒计时 │   结束 → 不记录数据/不计积分 ◄┘     │
       │                          └────▲─────┘                                    │
       │ 在线但 30 秒回合时钟到期       │                                          │
       └───────────────────────────────┘                    /activity 回收 ────────┘

  独立分支：computer match（真人身份 < 2）
      退出 ──► CLOSED ──► 重新进入 ──► 全新一局（无宽限/无托管/无重连）
```

**两条进入 hosted 的路径**：① 离开/掉线 → `grace` 30 秒 → 到期转 `hosted`；
② 在线但**空闲**（自己回合 30 秒倒计时走完、期间没有有效操作）→ 直接 `hosted`，
不重复第二个 30 秒。两条路径的退出方式相同：重新接入或真实指针/键盘活动打
`/activity`，席位立刻回 `active`，简单电脑停手，并补一个全新 30 秒回合时钟。

**hosted 没有倒计时**：`View.turnClockUntil` 在当前回合是 hosted / 原生 bot 时
固定为 `0`，桌游顶栏「回合 Ns」与飞行棋 `timer` 都直接留空；服务端把下一步的
`deadline` 设为 `hostedPaceDeadline(now)=now+1200`（机器人自己的节奏），而不是
`now+30000`。下一回合回到真人时才重新给 30 秒。

**两套外壳都按「当前回合席位」判断，而不是按自己席位**：桌游 `table.js` 直接渲染
服务端下发的 `turnClockUntil`（旧后端回退到 `turnClockVisible(room.custody[turnIndex])`）；
飞行棋 `app.js#turnClockHidden()` 用 `flightCustody(game.turn)` 解析当前回合席位后交给
`turnClockVisible()`。这样对手托管、轮到他走时看不到倒计时；自己托管但轮到对手时，
对手的 30 秒仍正常显示。`myCustodyState()` 只用于判断要不要上报 presence，不决定时钟。

`CustodyPolicy.resolve(state, graceUntil, now, nativeBot)` 是唯一的状态推导入口：
过期的 `grace` 直接解析为 `hosted`，因此前端与后端在时钟漂移下结论一致。
`recordsScore(state)` 只在 `active` / `bot` 为真；`grace` 与 `hosted` 一律不记分。

### 30 秒时钟
- 服务端 `graceUntil` 是**绝对服务器毫秒时间戳**。
- 桌游 `View.serverNow`、飞行棋 `RoomSnapshot.serverNow` 下发服务器时钟。
- 前端用 `serverClock(serverNow, receivedAt)` = `serverNow + (Date.now() - receivedAt)` 推算当前服务器时刻，避免用户本机时钟错误。
- 桌游轮询（400ms / 1000ms）+ 1 秒徽章重绘；飞行棋 WebSocket 快照 250ms + 1 秒徽章重绘。

---

## 3. 席位规则

| 项 | 桌游（PostgreSQL `table_rooms`） | 飞行棋（Redis `fp:{rooms}:room:*`） |
|----|-----------------------------------|--------------------------------------|
| 席位数 | 2 | 4 |
| 状态载体 | `TableService.Seat.custody` / `graceUntil` | `RoomRules.Seat.custody` / `graceUntilMs` |
| 托管时身份 | 保留 `principal` / `account` / `name` / `piece` / `board`，`bot=false` | 保留 `principal` / `index` / `invited`，`bot=false`（因此仍在 `fp:{rooms}:active` 里，可重连） |
| 原生机器人 | `new Seat(null,null,"电脑",true)` → `custody=bot` | `fillBots()` → `new Seat(i,null,true,true)` → `custody=bot` |
| 是否托管 | `managed(room)` = 真人身份数 ≥ 2 | `RoomRules.managed(room)` = 真人身份数 ≥ 2 |
| 宽限触发 | `POST /api/table/rooms/{id}/leave` | `POST /api/rooms/{id}/leave` 或 `RoomPresence.disconnect()`（无其它活动窗口时） |
| 空闲托管 | `TableService.tick()`：当前回合 `active` 席位且 `deadline<=now` 直接转 `hosted` | `RoomRollService.automate()`：`actionDeadline` 到期且当前回合是真人 → `RoomRules.hostIdle()` |
| 宽限到期 | `TableService.tick()`（`TableScheduler` 每秒） | `RoomPresence.prune()`（每秒） |
| 回收托管 | `POST /activity`、`join()`、`create()`、`move()`、`sketch()` → `reclaim()` | `POST /activity`、REST `view()`、WS SUBSCRIBE → `presence.resume()`；pong 只续租约 |
| 回合时钟 | `View.turnClockUntil`（当前回合 hosted/bot 时为 0），`table.js#syncPresentation()` 只渲染这个服务端决定 | 飞行棋 `app.js#turnClockHidden()` 按**当前回合席位** `game.turn` 调 `turnClockVisible()` 隐藏 `timer`；`actionDeadline` 已由 15s 统一为 `CustodyPolicy.IDLE_MS=30s` |
| 代走 | `GridRules.easyBot(board)` | `GameRules.easyChoice(game)` + 自动掷骰 |
| 重连还原 | `bind()` / `recover()`（`snapshot` / `create` / `join` 都会调用）；普通轮询 GET **不回收** | `RoomPresence.resume()`（REST `view()` / WS SUBSCRIBE）；`heartbeat()` 的 pong **只续租约，不回收** |

### 简单机器人（Easy bot）
`GridRules.easyBot(State)` 针对 10 个桌游各自返回**合法指令**，不搜索胜负：

| 游戏族 | 简单策略 |
|--------|----------|
| `four` / `gomoku` / `xo` | 从 `legal()` 里按 `moves/turn` 确定性取一步，不做连珠/堵点判断 |
| `puzzle` | 每回合把「第一块放错位置的拼图」换到正确位置，≤16 步必然完成（随机交换永远解不开 15 宫格） |
| `chess` | 从 `ChessRules.legal()` 确定性取一步，不做吃子/将军估值 |
| `cards` | 优先打一张合法牌（按 `moves` 轮换），只有无牌可出才摸牌；不能一直只摸牌耗到 1000 步上限 |
| `bubbles` | 确定性发射角度 `2 + ((moves*17 + turn*7) % 145)` |
| `pool` | 沿用普通机器人的球/旋转，但力度降到 28、角度偏移 120 |
| `snooker` | 沿用普通机器人的目标/指定彩球，但力度降到 32、角度偏移 96 |
| `draw` | 走 `SketchRules.advance()` 的既有超时路径（不使用 `easyBot`） |

飞行棋 `GameRules.easyChoice(State)` 返回 `legal().getFirst()`，
与贪心的 `botChoice()`（取进度最大的飞机）形成明确强弱差。

**全托管的终局兜底**：`pool`（200 步）、`bubbles`（`MAX_MOVES`）、`cards`（1000 步）
自带上限；`chess` 有和棋判定、`puzzle` 由上面的确定性解法兜底。其余棋盘
（尤其 `snooker` 没有天然步数上限）由 `TableService.tick()` 在**所有真人席位都已托管**
且 `board.moves() >= HOSTED_MOVE_CAP(240)` 时判定和棋并 `settle()` 关房。只要还有
一个 `active` 真人，就绝不触发该兜底、绝不替真人结束对局。托管席位本来就不记分，
所以这个兜底不会给任何人写结果或积分。

---

## 4. 重连（Reconnect）

1. **桌游**：`create(game, mode)` 先在 `where game=:game and phase in ('WAITING','PLAYING')` 中按 `principal` 或 `account` 找席位 → `recover()` 换会话 / `bind()` 清托管 → 返回**原房间**。前端 `enter()` 还会优先用本游戏的 `joyflock.online.room.<game>` 提示做一次 `GET /api/table/rooms/{id}` 快照续接；`OVER` / `CLOSED` 的提示会被清掉并开新局。
2. **飞行棋**：`RoomController.create()/quick()/join()` 通过 `store.active(user)` 返回原房间；`view()` 调 `presence.resume()` 把席位还原为 `active`。页面加载时 `identity.activeRoomId` 也会自动 `restore()` 回原局。
3. **邀请链接**：桌游 `join()` 对已在同一房间的 principal 直接 `tick(bind())` 续局；房间 `OVER` 时 `snapshot()` 跟随 `successor_id` 到再来一局的新房。
4. **游戏隔离**：桌游 SQL 永远带 `game=:game`；桌游提示键 `custodyStorageKey(game)`；飞行棋固定 `custodyStorageKey('flight')`；`table_results.game` 与 `game-points.byGame[game]` 各自独立；飞行棋账本按 `match_id` 独立。四子棋的托管/重连/积分不可能影响台球。

---

## 5. 结算与不记分

| 层 | 桌游 | 飞行棋 |
|----|------|--------|
| 服务端标记 | `Seat.resolved(now)` 为 `grace`/`hosted` | `RoomRules.noScoreSeats(room, now)` → `MatchCompletionService.complete(match, hostedSeats)` → `match_participants.hosted_at_end` |
| 服务端跳过 | `TableService.settle()` 不写 `table_results` | `SettlementService.settle()` 不写 `points_delta` / `score_recording_decisions` / `account_match_results` / `account_statistics` / `statistics_outbox` |
| 前端跳过 | `table.js` 的 `game-points.record()` | `app.js` 的 `record()`、`track('game_end')`、结算面板改为「本局以托管结束…」、`pointsBySeat` 全 0 |
| 结果弹窗 | `custody-no-score` 提示 | `custody-no-score` 提示 |
| 迁移 | 无需迁移（状态存在房间 JSON 里） | `V25__online_custody_no_score.sql` 新增 `hosted_at_end` 列 |

**旧房间兼容**：`TableService.Seat.graceUntil` 与 `RoomRules.Seat.graceUntilMs`
声明为包装类型 `Long` 而不是原始 `long`。Jackson 3 无法把「字段缺失 / `null`」
映射到原始类型，旧 PostgreSQL `table_rooms.state` 与旧 Redis 快照里根本没有这两个
字段；record 的紧凑构造器把 `null`/负数统一归零、`custody` 归一为 `active`/`bot`，
因此线上滚动升级无需数据迁移（回归用例：`TableCosmeticsTest`、
`RoomSnapshotTest`、`RoomRulesCustodyTest`）。

**注意**：`rank` 仍写入 `match_participants`（服务端完整排名是规则引擎的必填结果），
但托管席位不产生任何积分、统计、排行榜或完成局数。玩家若在结束前重连回 `active`，
则完全按正常对局结算。

---

## 6. 单机 / 打机器人豁免

- 单机「电脑对战」（`table.js#localStart(true)`、`app.js#playComputer()`）根本不创建房间，
  不进入任何宽限/托管/重连/账本逻辑；退出即丢弃画面，重新进入一律 `start()` 新 `Game`。
- 联机但对手是服务器机器人（桌游 `QUICK` 超时补位、飞行棋 `quick()` 补到 4 席且真人 < 2）：
  `managed=false`。桌游 `leave()` 直接 `CLOSED`；飞行棋 `RoomRules.beginCustody()` 直接 `CLOSED`，
  `SAVE` Lua 会把它从 `fp:{rooms}:active` 移除，因此重新进入必然新建房间 = 重新开局。
- `discardLocalGame()` / `localStart()` / `start()` 会清掉本游戏的房间提示键与托管标记。

---

## 7. API / 数据契约

桌游 `GET|POST /api/table/rooms* → TableService.View`：

```jsonc
{
  "custody": ["active", "grace"],     // 每席位：active | grace | hosted | bot
  "graceUntil": [0, 1731600000000],   // 绝对服务器毫秒，0 表示无倒计时
  "managed": true,                    // 是否走托管流程
  "serverNow": 1731599970000,
  "profiles": [{"custody": "active", "graceUntil": 0, ...}, ...],
  "turnClockUntil": 0                 // 当前回合若是 hosted/bot 则为 0（不显示倒计时）
}
```

新增 `POST /api/table/rooms/{id}/activity` / `POST /api/rooms/{id}/activity`：
显式在线证明（页面重进、重选在线对决、真实鼠标/键盘/触摸事件），body 为
`{"reason":"resume"|"pointer"}`。把调用者的 `grace` / `hosted` 席位还原为
`active` 并补一个全新 30 秒回合。**普通轮询 `GET /api/table/rooms/{id}` 与
WebSocket 快照/pong 都不算在线证明**；前者仍会 `tick()` 推进时钟（空闲席位因此
会转托管），但不会回收托管。`active` 席位上的 `pointer` 请求是**只读**的，晃动
鼠标不能延长 30 秒空闲时钟；只有 `resume` 会给已在自己回合的玩家补满 30 秒。
客户端在 hosted/grace 时按 1.2 秒节流、active 时按 5 秒节流，并且每次都上报，
这样「服务端刚转托管、客户端还没轮询到」时的第一次鼠标移动也不会漏掉。

飞行棋 `RoomSnapshot`（REST + WebSocket `SNAPSHOT.room`）：

```jsonc
{
  "managed": true,
  "serverNow": "2026-11-14T09:00:00Z",
  "seats": [{"index": 1, "bot": false, "custody": "grace", "graceUntil": 1731600000000, ...}]
}
```

共享常量（`dist/online-custody.js` ↔ `com.flightparty.online.CustodyPolicy`）：

| 常量 | 值 |
|------|-----|
| `RECONNECT_GRACE_MS` / `GRACE_MS` | `30000` |
| `IDLE_TURN_MS` / `IDLE_MS` | `30000`（在线空闲的回合时钟，桌游与飞行棋统一） |
| `HOSTED_PACE_MS` | `1200`（托管后机器人自己的节奏，不是倒计时） |
| `HOST_BOT_LEVEL` / `BOT_LEVEL` | `"easy"` |
| `ACTIVE` / `GRACE` / `HOSTED` / `BOT` | `"active"` / `"grace"` / `"hosted"` / `"bot"` |
| `CUSTODY_STORAGE_PREFIX` | `"joyflock.online.room."` |

---

## 8. 文件清单

| 文件 | 职责 |
|------|------|
| `backend/.../online/CustodyPolicy.java` | 后端唯一语义（常量、状态推导、是否记分） |
| `backend/.../table/TableService.java` | 10 个桌游的宽限 / 托管 / 重连 / 跳过结算 / View 字段 |
| `backend/.../table/GridRules.java` | `easyBot()` 覆盖 10 个桌游的合法简单指令 |
| `backend/.../game/GameRules.java` | `easyChoice()` 飞行棋简单选机 |
| `backend/.../room/RoomRules.java` | 4 人房席位 custody 字段与 `beginCustody` / `expireCustody` / `resumeCustody` / `noScoreSeats` |
| `backend/.../room/RoomPresence.java` | 掉线 30 秒宽限、心跳重连、宽限到期转托管 |
| `backend/.../room/RedisRoomStore.java` | `mutate()` 版本化 custody 写入 |
| `backend/.../room/RoomRollService.java` | 托管席位冻结/由简单机器人代走，拒绝托管席位手动指令 |
| `backend/.../room/RoomSnapshot.java` / `RoomViewService.java` | 公开快照的托管字段 |
| `backend/.../room/RoomController.java` | `view()` 即重连 |
| `backend/.../stats/MatchCompletionService.java` / `MatchCompletionWorker.java` / `SettlementService.java` | 托管结束不记分 |
| `backend/.../db/migration/V25__online_custody_no_score.sql` | `hosted_at_end` 列 |
| `dist/online-custody.js` | 前端纯函数契约（状态、倒计时、标签、按游戏键） |
| `dist/online-custody-ui.js` | 共享徽章 / CSS / 倒计时重绘 / 不记分提示 |
| `dist/table/table.js` / `dist/app.js` | 两套游戏外壳的接线与积分护栏 |
| `dist/live-room-ui.js` | 在线房间弹窗的托管状态 |

---

## 9. 验收矩阵

| 场景 | 期望 |
|------|------|
| 两人 FRIENDS 开局 | 两席都是真人，`managed=true` |
| 4 人 FRIENDS 全真人 | 4 真人直接开局 |
| 2 真人 + 2 电脑 | `managed=true`，托管只作用于真人席位 |
| 1 真人 + 3 电脑 | `managed=false`，退出即 `CLOSED`，再进入是新局 |
| 一人在回合中退出 | 该席显示「等待重连 30s」，倒计时逐秒递减，其余真人可继续 |
| 30 秒无人回来 | 徽章变「托管中 · 简单电脑」，简单机器人开始代走；**回合倒计时消失**，机器人按 1.2s 节奏连续代走 |
| 宽限内回来 | 徽章消失，原席位/原装扮继续，正常记分 |
| 在线但 30 秒回合时钟走完 | 该席直接变 hosted（无第二个 30 秒），简单电脑接管，不显示倒计时 |
| hosted 时动一下鼠标 / 重新进入 | `/activity` 立刻把席位还原 `active`，简单电脑停手，重新给 30 秒回合时钟 |
| 只轮询、不操作 | 托管不会被取消；空闲席位照常转 hosted |
| 两人先后都退出 | 双托管，游戏自动跑到结束 |
| 托管中重新选择在线对决 | 连回原房间原席位，状态回 `active` |
| 托管状态结束 | 无 `table_results` / 无 `account_match_results` / 无积分 / 结算显示不记分提示 |
| 跨游戏 | `four` 的托管与房间提示不影响 `pool`；重连目标按 `game` 严格匹配 |
| 单机电脑对战退出再进 | 全新一局，不出现任何托管提示 |

---

## 10. 验收记录（2026-11-14 17:58）

**单元测试**
- 前端：`npm test`（`node --test tests/*.test.mjs`）**787 / 787 全绿**。新增
  `tests/online-custody.test.mjs`（纯契约 + 共享 DOM 渲染器，12 项）与
  `tests/online-custody-wiring.test.mjs`（两套外壳 / 后端 / 文档的接线，9 项）。
  修复了 6 份 legacy `vm` 片段测试：它们会剥离 ESM import，需要显式注入
  `ensureCustodyStyles` / `CUSTODY_LABELS` / `custodyBadgeHTML` /
  `startCustodyClock` / `clearNoScoreNotice` / `flightCustody` 等依赖。
- 后端：Maven 容器 `mvn -B test` **133 / 133 通过，0 失败**（21 项需外部服务的
  集成测试按既有基线跳过）。新增 `CustodyPolicyTest`(6)、`RoomRulesCustodyTest`(7)、
  `GridRulesEasyBotTest`(4)，`TableCosmeticsServiceTest` 增加 3 项（宽限到期转托管、
  双托管强制终局且不写 `table_results`、还有真人时不触发兜底）。
  `docker compose build backend` 内嵌的 `mvn -B verify` 同样 **133 / 133**。

**部署与迁移**：`deploy-backend-1` 已用新镜像重建重启，Flyway 日志确认
`Migrating schema "public" to version "25 - online custody no score"` →
`Successfully applied 1 migration … now at version v25`；`8080 / 8081 / 8082`
的 `/api/csrf` 全部 200。

**真实浏览器端到端**：`.workbuddy/tmp/online-custody-cdp.mjs`（Chrome CDP，
**23 / 23**，0 JS 异常、0 意外 4xx）。两个真实游客会话：A 用 HTTP 创建 `xo`
好友房，B 用 Chrome 打开 `?game=xo&room=…` 作为第二个真人加入（该次验收时仍是满员自动准备，19:06 起已改为双方手动准备，见下节）。

| 时刻 | 实测 |
|------|------|
| 加入后 | `#mode=在线对局`、2 席、`managed=true`、`custody=["active","active"]`、只写 `joyflock.online.room.xo` 一个提示键 |
| A 退出 1.6s | 席位卡名字旁出现黄色徽章「等待重连 29s」、`title=玩家已离开，30 秒内回来可继续本局`、`data-custody=grace` |
| 再过 2.2s | 徽章变「等待重连 27s」，倒计时逐秒递减 |
| 30.2s 后 | 徽章变蓝紫色「托管中 · 简单电脑」、`title=由简单电脑代走，回来即可接管原席位`，棋盘出现 1 颗由简单机器人落下的棋子 |
| A 再次读取房间 | `custody` 回 `["active","active"]`，B 页面徽章消失、`data-custody` 清空 |
| 点「单机 · 电脑对战」 | `#mode=单机 · 电脑对战`、0 个徽章、房间提示键与 `?room=` 全部清空 |

截图：`verification/online-custody-grace-20261114.png`、
`-hosted-20261114.png`、`-reconnected-20261114.png`、
`-computer-exempt-20261114.png`；结果 JSON
`.workbuddy/tmp/online-custody-cdp-result.json`。

## 好友房手动准备（19:06 追加）

两人好友房不再满员即自动开局；必须双方各自点「准备」。

| 阶段 | 前端 | 后端 |
|---|---|---|
| 只有房主 1 席 | 按钮置灰禁用（`data-ready=waiting`），文字「准备」 | `View.ready=[false]`，不启动 30 秒电脑补位 |
| 第 2 个真人加入 | 按钮高亮蓝色渐变（`data-ready=available`），可点 | `View.ready=[false,false]`，phase 仍 `WAITING` |
| 一方点准备 | 高亮取消、文字变「已准备」、按钮禁用；该席位卡片右上角绿色「已准备」标签 + 头像绿框 | `POST /api/table/rooms/{id}/ready` 写 `table_room_ready`；`View.ready=[true,false]` |
| 另一方点准备 | 其席位右上角同步刷出「已准备」；副标题「双方已准备，即将开始…」；弹窗保持 200ms | 第二票使 phase → `PLAYING`，`View.ready=[true,true]` |
| 200ms 后 | 弹窗关闭、棋盘出现 | 服务器权威开局 |

`View.ready` 是每席一个布尔值，由 `table_room_ready`（V22）在 `view()` 里查出并下发；客户端不猜测对方状态，刷新页面也能看到双方标签。`autoReadyFriendsRoom()` 保留符号但改为 no-op（legacy 测试片段仍会调用它）。QUICK 匹配房与单机电脑对战不显示该按钮、不进入此流程。版本链统一 bump 到 **`20261114-ready1`**：`table.js`、`room-dialog.css`、`intro-boot.js`、`table-home-clean.css`、`result-points.js/css`、`pool-shell.js`、`presentation.js` 引用、`pool-result-preview.html`。

**验收**：`npm test` **798/798**（新增 `tests/table-ready-button.test.mjs` 10 项）；Maven `mvn -B test` **134/134**（新增 `readyVotesArePublishedPerSeatAndStartTheRoomOnTheSecondVote`）；`deploy-backend-1` 重建重启。真实 Chrome CDP `.workbuddy/tmp/table-ready-cdp.mjs` **23/23**：房主 Chrome 建 `xo` 房，HTTP 游客加入；实测未满 `waiting` 禁用 → 满员 `available` 蓝色渐变 → 房主点后 `done`「已准备」且 1 个标签 → 对方投票后 2 个标签，停留 **211ms**（20ms 采样）后 `screen=play`、弹窗关闭、服务端 `ready=[true,true]`；0 JS 异常 / 0 意外 4xx。截图 `verification/table-ready-{highlight,own-vote,started}-20261114.png`，结果 JSON `.workbuddy/tmp/table-ready-cdp-result.json`。本地需 **Ctrl+F5**；改动未提交、未部署到生产。

**边界**：本轮 CDP 用的是两真人 `xo` 房 + 单席位托管；「两人都退出」的双托管、
`hosted_at_end` 不写积分、以及 10 个游戏逐个的托管推进由后端单元测试覆盖，
未做 4 人飞行棋长局的浏览器实测（飞行棋 `STARTING` 开局事务仍未接线，在线对局
本身尚不可玩）。改动未提交、未部署到生产；本地需 **Ctrl+F5** 强刷静态资源。

## 再来一次按原模式重进（23:38 追加）

结算页的「再来一次 / 再玩一局 / 再来一局」不是在原房间里重置棋盘，而是**按这局的模式重新走一遍入口流程**。三种模式语义固定：

| 模式 | 桌游 `table.js#restartMatch()` | 飞行棋 `app.js#rematch` | 后端 |
|---|---|---|---|
| 打电脑（无 `room` / `!onlineMode`） | `localStart(computer)` 直接开一局新的电脑对战 | `start()` 直接新建 Game | 无请求，本地对局一次性 |
| 在线随机 QUICK | 先 `localStart(false)` + `screen='home'` **返回中间页**，再 `enter('QUICK')` 重新排队 | 先 `returnToModeScreen()` 回 `welcome`，再 `social.openRoom('quick')` → `session.quick()` | `TableService.rematch()` 对 QUICK 走 `create(game,"QUICK")`，重新找/建 WAITING 公共房；飞行棋 `/api/rooms/quick` 同理 |
| 好友房 FRIENDS | 先返回中间页，再 `POST /api/table/rooms/{old}/rematch` 进入 successor 房 | 先回 `welcome`，再 `social.rematchFriends(oldId)` 打开房间页 | 桌游建**唯一 WAITING successor**（`successor_id` 幂等）；飞行棋 Redis `REMATCH` 原子建 `WAITING_FRIENDS` 房 |

**好友房的关键语义**：双方各自在结算页点「再来一次」，后端用 `successor_id`（桌游）/`rematchRoomId`（飞行棋）保证**两人落到同一个新房**，一起回到等待准备阶段；房内只保留真人席位（去掉电脑补位），phase=`WAITING`、无补位倒计时、准备票清空。于是房间页重新出现「邀请好友 / 准备」，**可以点准备，同时等待朋友进来房间**，两票齐了才开局——与第一局完全一致。桌游旧实现要求两人投票后才直接跳 `PLAYING`，本轮已移除 `table_rematch_votes` 门槛（表保留但不再读写）。

**中间页回流必须清理的东西**：终局棋盘、旧 `room`、本游戏的 `joyflock.online.room.<game>` 重连提示、地址栏 `?room=`、结算弹窗与结果面板、在线会话 socket（`onlineSession.close()`）。飞行棋**不要**调用 `/leave`：SETTLED 房会被 `RoomRules.leave()` 以 409 拒绝，且服务端在结算时已释放 `fp:{rooms}:active`。`returnToModeScreen()` 因此只做本地清理 + `show('welcome')`。

**竞态**：`restartMatch()` 用 `generation` token 防止迟到的 rematch 响应覆盖用户后续新操作；`pending` 在 `finally` 必然释放；`localStart()` 会先 `generation++`，所以 token 必须在它之后取。共享版本链 bump 到 **`20261114-rematch1`**。
