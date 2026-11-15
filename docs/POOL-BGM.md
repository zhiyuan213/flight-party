# 台球背景音乐 · 曲库与选曲（2026-11-10）

> 用户反馈「背景音乐不太喜欢，做几个我选吧，适合台球的、玩游戏可以放松的音乐」。
> 本文是曲库与选曲实现的准绳；`docs/POOL-IMPACT-EFFECTS.md` §9 记录的是**最初单曲版本**的历史实现。

> **当前状态（2026-11-10，用户「先把背景音乐去掉」）：游戏页已停用。**
> `dist/table/index.html` 里那行 `<script type="module" src="./pool-bgm.js?...">` 已移除，
> 因此台球 / 斯诺克详情页与对局页**不再加载音乐模块、不播放、也不显示左下角 ♫ 按钮**。
> 模块 `dist/table/pool-bgm.js`、5 首曲库、`pool-bgm-select.html` / `pool-bgm-preview.html`、
> `tests/table-pool-bgm.test.mjs` **全部保留**，两个独立页面仍可试听与设默认（页面顶部已加停用提示），
> 选择继续写入 `localStorage`。
> **恢复方法**：在 `dist/table/index.html` 末尾 `table.js` 的 script 前加回
> `<script type="module" src="./pool-bgm.js?v=<当时的统一标记>"></script>` 一行即可，
> 无需改任何其它文件（模块自启动、静音联动、跨标签同步逻辑都还在）。恢复后会按上次保存的开关与曲目播放。

## 1. 曲库

`dist/table/pool-bgm.js` 导出 `POOL_BGM_TRACKS`（5 首）、`DEFAULT_BGM_TRACK='tape'`、
`POOL_BGM_SCORE`（默认曲的元信息）。全部为 8 小节 D 小调族无缝循环、纯程序合成 PCM，
没有音频文件、外链、解码器或版权素材。

| id | 名称 | BPM / 循环 | 风格 | 编曲要点 | 混音 |
|---|---|---|---|---|---|
| `tape` **（默认）** | 慢拍磁带 / Tape Deck | 68 / 28.24s | lo-fi，最安静 | 电钢和弦每小节只落一次、稀疏钢片琴、软底鼓 + 沙锤（swing .14）、walking 低音 | 低通 3.4k、混响 30%、轻磁带饱和与 wow |
| `bossa` | 午后 Bossa / Sunday Bossa | 96 / 20.00s | bossa，最有律动 | 尼龙吉他五连切分、沙锤、钢片琴旋律、根音/五度贝斯 | 低通 7.2k、混响 16% |
| `felt` | 呢面余韵 / Felt & Wood | 60 / 32.00s | ambient，无鼓 | 长和弦垫音 + 一条 `sub` 低音 + 每小节一声钟，**完全没有鼓** | 低通 4.8k、混响 45%、总线 ×0.9 |
| `warm` | 暖灯爵士 / Warm Lights | 76 / 25.26s | jazz，温厚 | 每拍 walking bass、切分电钢、刷鼓摇摆 | 低通 5.6k、混响 24%、轻饱和 |
| `lounge` | 夜色球厅（原版） | 82 / 23.41s | lounge，用户不喜欢的那首 | 原版 Dm9–G13–Cmaj9–A7♭9 电钢 + 刷鼓 | 低通 6.2k、混响 20% |

**默认已从 `lounge` 换成 `tape`**；原版保留为第五张卡，随时可换回。

## 2. 合成器

- 共享 `VOICES` 音色表：`pad / rhodes / melody / bass / upright / guitar / bell / sub`，
  各自有泛音比、衰减、起音、释放、颤音与非谐系数。包络用递推而非逐样本 `Math.exp`。
- 共享 `COMP` 节奏表（`lounge / sparse / bossa / swing / none`）、`bassStyle`
  （`lounge / two / bossa / walking / sustained`）、`drums`（kick/snare/brush/hat/swing）。
  每首曲子只有**数据**不同：和弦、旋律、音色、鼓、混音、随机种子。
- `renderState()` 按 `bpm/bars` 计算 `beat/bar/loop`，`renderBar()` 渲染一小节，
  `finishLoop()` 负责收尾：
  1. 最后一小节的持续音延长 `WRAP=1.2s` 越过循环点；超出部分的余音折回开头做 25ms 交叉淡化
     （氛围曲还额外加一声长钟），**保证循环点两侧都有声音**，不会出现「静一下再进第一拍」。
  2. `drive` 用 `tanh(k·x)/k` 软饱和（小信号电平不变、只压峰，绝不削波）；
     `wow` 是整数 3 周期的轻微振幅起伏，首尾同相。
  3. **统一 RMS 到 0.052**（受 `peak ≤ .82` 约束）：五首实测 RMS 0.0512–0.0521，
     切歌不会忽大忽小。修复前氛围曲只有 lounge 的 46%。
  4. 最后 2ms 向首样本平滑，接缝跳变实测 **0**。
- `buildPoolBgm(sampleRate, trackId)` 为纯确定性函数（Node 可验证）；
  `buildPoolBgmAsync()` 按小节分帧（8 段 `setTimeout(0)`），结果与同步版**逐样本一致**，
  避免 170–390ms 的合成卡住首帧。单曲同步耗时：felt 170ms / lounge 268ms / tape 346ms。
- 播放链路仍是 `BiquadFilter(track.mix.cutoff) → Gain(BASE_GAIN=.16 × trim × volume) →
  dry .9 + convolver(0.9s) → wet(track.mix.wet)`，单条 `loop=true` 的 BufferSource。

## 3. 选曲与播放器

- 打开 **`dist/pool-bgm-select.html`**（`http://127.0.0.1:8081/pool-bgm-select.html`）：
  5 张卡带风格说明、BPM / 时长 / 调性 / 低通 / 混响、逐首波形（异步生成不卡页面）。
  - 「▶ 试听这首」→ `previewPoolBgmTrack(id)`：**只改本页播放，不写入选择**。
  - 「✓ 设为游戏默认」→ `setPoolBgmTrack(id)`：写入 `localStorage['joyflock.pool.bgm.track']`
    并同时试听；游戏里已打开的标签页经 `storage` 事件自动切换。
- 游戏页 `table/index.html?game=pool|snooker` 启动时 `readPrefs()` 读取该键，
  缺省用 `tape`。左下角 ♫ 圆钮：单击开关（`joyflock.pool.bgm`）、
  **双击打开选曲页**；title 显示当前曲目名。
- 切歌 `ensureGraph()` 用 `renderToken` 防竞态：合成新曲 → `retireSource()` 让旧源
  淡出 0.35s 后 `stop()` → 换新 buffer 与 graph → 淡入 0.8s（冷启动 1.6s）。
  全程**只有一个 AudioContext**，不会留下两条常驻音轨；快速连点由 token 丢弃旧结果。
- 对局里的「声音/静音」仍经 `joyflock.pool.muted` 联动静音；页面隐藏淡出 + suspend、
  可见恢复；`pagehide` 收尾；父页 `joyflock:hello` 与任意 pointerdown/keydown/touchstart 解锁。
  浏览器自动播放策略不变：直接敲 URL 时首次交互解锁，从大厅点卡片进入则直接起播。
- `dist/pool-bgm-preview.html` 保留为技术预览（当前默认曲的包络、接缝、播放器状态）。

## 4. 验证

- `npm test` **287/287**；`tests/table-pool-bgm.test.mjs` 由 6 项扩到 **8 项**：
  曲库元信息与默认值、每首确定性 / 双声道 / 不削波 / **响度匹配**、每首循环接缝与两侧能量、
  每首 8 小节不静音与低中频、五首波形与亮度确实不同、每首 async 与 sync 逐样本一致、
  Node 无副作用、mock Web Audio 下**单源循环 + 试听不写盘 + 持久化 + storage 跨标签 + 切歌不叠轨 + 静音/音量/位置**。
- 无头 Chrome 实机（新 profile，`--autoplay-policy=no-user-gesture-required`）：
  选曲页 5 张卡与 5 个波形全部绘制 → 点试听 bossa：本页播放切换、`localStorage` 仍为 `null`
  → 点设为默认 warm：写入 `warm`、卡片双高亮 → 导航到台球详情页：`track=warm / bpm=76 /
  playing=true / ♫ title=暖灯爵士` → 点「单机·电脑对战」进 `screen=play`：仍 `playing=true`
  → **0 运行时异常**。
- 物理、53 格状态、shot 协议、Java、golden fixtures、parity 168/168 全部未动；
  Docker Java 回归 **101 通过 / 21 跳过**。纯前端改动，dist 是 bind mount，**无需 rebuild**。

## 5. 界限与调参

1. 是程序合成的短循环氛围曲，不是编曲成品；长时间游玩仍可能听出重复。
2. 音乐音量固定，**不随撞击强度自动 duck**；`BASE_GAIN=.16` 明显低于撞击音效。
3. 试听页波形按 8000Hz 生成，只表示包络；最终音色还经过播放器里的低通与混响。
4. 调参入口：`POOL_BGM_TRACKS` 每项的 `chords / melody / compStyle / voice / drums / mix`；
   通用常量 `TARGET_RMS / WRAP / XFADE / BASE_GAIN / FADE_IN / FADE_OUT` 在文件顶部。
   想整体更安静改 `BASE_GAIN` 或试听页音量；想更暗改 `mix.cutoff`。
5. 浏览器需 **Ctrl+F5**（当前全项目 194 处 `.js?v=` 与 4 处 `bot-difficulty.css?v=` 统一 `20261110-glove2`；BGM 停用那一轮本身未 bump，后续手套重画轮统一 bump 到 `glove2`）。
   **未提交、未部署**；哪首最耐听、音量平衡仍待用户实机试听定夺。
