# 台球旋转物理升级改造方案

> **状态：方案，未实施**（未修改任何代码、协议或测试）
> 日期：2026-11-09 · 适用模块：休闲台球 `pool`（`dist/table/pool.js`）
> 前置阅读：`docs/RULES.md` §2026-11-05/06、`docs/HANDOFF.md` 台球章节、`docs/QA.md` §2026-11-06、`backend/.../PoolRules.java` 类注释

---

## 1. 结论摘要

当前台球给人的"碰碰球"感**不是实现缺陷，而是被明确记录的工程取舍**：物理是纯 2D 质点近似，球状态中没有角速度，旋转只以两个离散冲量形式存在。项目的 Java 后端权威物理、整数击球指令、16ms 回放与跨语言黄金位置比对共同构成一套确定性联机契约，本次升级的目标是**在保留该契约的前提下，把旋转从"一次性冲量"升级为"随时间演化的状态量"**，而不是推翻重写为 3D 刚体引擎。

推荐路线：**P0 独立沙盒验证 → P1 双端同步实现 → P2 输入与视觉接线 → P3 回归与灰度**。核心约束是 JS 与 Java 两端必须逐帧一致，且 `tests/table-pool-spin.test.mjs:78` 的反向断言必须删除。

---

## 2. 现状判定

### 2.1 与"物理引擎 + 渲染引擎 + 胶水层"三层架构的核对

| 层 | 通用建议 | 本项目实际 | 判定 |
|---|---|---|---|
| 物理 | Rapier / cannon-es 确定性引擎，3D 刚体 + 角速度 | 自研 2D 解析解 `pool.js`，无引擎、无角速度 | 刻意取舍（联机确定性） |
| 光影 | Three.js / PBR / 软阴影 | Canvas 2D 手绘：`pool-ball.js:34` 径向渐变模拟球体光照 + 椭圆投影阴影 | 刻意取舍（2.5D 美术统一）；`HANDOFF.md:172` 明确「不是 WebGL 模型」 |
| 逻辑 | 模型写胶水层 | 完整：分组/犯规/8 球判定、罚杆、16ms 回放、音效、回球通道、联机同步 | 成熟，不需改动 |

### 2.2 "旋转出不来"的六个根因

| # | 位置 | 事实 | 后果 |
|---|---|---|---|
| 1 | `pool.js:5`、`PoolRules.java:11` | 球状态仅 `x[] y[] vx[] vy[] alive[]`，**无 ω** | 物理上不存在"旋转"这个量 |
| 2 | `pool.js:17`、`PoolRules.java:12` | 摩擦是单一指数衰减 `v *= 0.991^0.25`，永远平行于速度，不区分滑动/滚动 | 白球必然走直线，塞球无法产生弧线 |
| 3 | `pool.js:15`、`pool.js:18–21` | 旋转只在两处生效：母球碰库时加切向扰动后立即归一化（只改方向不改速率，仅 `i===0` 且 `side≠0`）；**第一次**球-球碰撞后一次性注入 `forward/lateral` 冲量，`contactSpin=true` 后永久关闭 | 空杆、连续碰撞、后续走位全无旋转演化；`spinLife` 每步衰减但只用于这两处，几乎不起作用 |
| 4 | `pool.js:18`、`PoolGeometry.java:87` / `pool-geometry.js:87` | 球-球碰撞只交换法向冲量（e=1，无摩擦）；库边恢复写死 `1.92*incoming`（等效 e=0.92），无切向摩擦 | 斜碰严格 90° 分离，无 throw、无旋转传递；侧旋不改变反弹角 |
| 5 | `pool-input.js:11` `spotCode(x,y)` | 只用 `atan2` 归到「中心 + 8 方向」共 9 档，`hypot<.25` 判中心，其余**半径信息被丢弃** | 击球点选得多偏效果完全相同；力度为线性映射 `power*0.48`，不受杆法调制 |
| 6 | `pool-view.js:231–237`、`pool-ball.js:5` | 注释原文「Integrate residual spin by time, **even when the replay's ball center has stopped**」；`rollSphere` 只按位移累积贴图朝向矩阵 | 看到的"球在转"是纹理在转，与力学完全解耦 |

**接线本身是好的**：`pool-view.js:113` → `encodePoolShot` → `button.dataset.position` → `simulateCueShot` 全链路已由 `HANDOFF.md:217` 与 `QA.md:822` 验证（9/9 通过）。问题在物理模型，不在 UI 接线。附带体验问题：`pool-view.js:111` 在出杆动画结束后执行 `host._spin=0`，塞的选择不跨杆保留。

### 2.3 已被项目文档承认

- `backend/src/main/java/com/flightparty/table/PoolRules.java:6`：`Spin is a bounded arcade approximation, not a rigid-body model.`
- `docs/QA.md:834`：「自由滚动在尚未接触球/库时仍无虚构弯曲；偏心距离不是连续旋转强度，模型仍是受限二维近似。」
- `docs/HANDOFF.md:217`：「八向简化旋转：高低杆影响首次撞球后的白球，左右塞另影响撞库，空台自由滚动和直线瞄准提示不会变化；点击偏心距离不控制旋转强度。」
- `tests/table-pool-spin.test.mjs:78–81`：**把上述限制固化成了反向断言** `spin does not invent a curve before any contact`，逐一比对 8 个档位与中杆的 `history` 完全相等。

> 该测试是本次升级的第一道关卡：新物理必然使这条断言失败，必须删除或反转为"应产生可测偏移"。

---

## 3. 目标物理模型

保持 2D 平面运动（所有球心共面），但为每个球引入角速度状态，并用「滑动 → 滚动」两阶段摩擦替代单一指数衰减。侧旋造成的曲线路经由**台呢接触斑的非对称摩擦**产生，不引入马格努斯项（球速 <5 m/s 时空气效应可忽略）。

### 3.1 单位与几何（必须先统一，否则摩擦量级会失真）

现有代码：桌面 1000 × 500 单位，碰撞半径 `R=16` 单位。真实 9 ft 台面 2.54 × 1.27 m，球半径 0.028575 m。两者存在约 1.4× 的视觉放大。

- 定义 `SCALE = 2.54 / 1000 = 0.00254 m/unit`，`R_real = 0.028575 m`。
- **碰撞检测继续用 `R_collision = 16`**（保持现有摆球间距与袋口判定，避免连锁回归）；**摩擦与转动惯量计算用 `R_real`**。这两个半径必须在代码中显式命名并注释，禁止混用。
- 重力 `g = 9.81 m/s²`，质量 `m = 0.17 kg`，实心球 `I = (2/5) m R_real²`。

### 3.2 状态量

```
Ball { x, y, vx, vy, ωx, ωy, ωz, alive }
```

- `ωz`：垂直台面的侧旋（English / 塞）。
- `(ωx, ωy)`：滚动角速度；纯滚动条件为 `ωy = vx/R_real`、`ωx = -vy/R_real`。
- 角速度**只存在于模拟内部**，不进入 `cells[]` 状态、不进入 `history` 回放帧（见 §8 风险）。

### 3.3 击球初始化（连续击球点）

把 `spotCode(x,y)` 从 9 档离散改为返回归一化击球点 `(a, b)`，`a` 为水平偏心、`b` 为垂直偏心，均在 `[-1, 1]`，且 `hypot(a,b) ≤ 0.47`（超过约 0.47 触发滑杆 miscue，皮头-球摩擦 μ≈0.6）。

设出杆方向 `d̂`、水平侧向 `t̂ = ẑ × d̂`、初速 `v0 = power · k`（`k` 沿用现有 0.48，需按新摩擦重新标定）。由冲量矩 `ω = (r_tip × m v0 d̂)/I`，`r_tip ≈ -R d̂ + a R t̂ + b R ẑ`，得：

```
ωz    = -(5 v0 / (2 R_real)) · a        // 左右塞
ω_t   =  (5 v0 / (2 R_real)) · b        // 高杆 / 低杆，沿 t̂ 轴
```

即 `(ωx, ωy) = ω_t · t̂`。高杆 `b>0` 产生前滚（滑动阶段额外耗能后跟进），低杆 `b<0` 产生后旋（缩杆），侧旋 `a≠0` 产生 ωz。符号约定以实现时的坐标系为准，量级关系不变。

### 3.4 每子步：滑动 / 滚动状态机（核心）

沿用现有 2ms 子步（代码中的 `.25` quarter-step 与 `step<4800` 上限）。每步对每个活球：

1. 接触点相对台呢的滑移速度（接触点在 `(0,0,-R)`）：
   ```
   u = (vx - R_real·ωy, vy + R_real·ωx)
   ```
2. 若 `|u| > ε`（滑动阶段）：
   ```
   û   = u / |u|
   a_f = -μ_slide · g · û                       // 平动减速
   α   = -(5 μ_slide g / (2 R_real)) · (ẑ × û) // 摩擦力矩，使 ω 趋向纯滚动
   v  += a_f · dt
   ω  += α · dt
   ωz *= exp(-μ_spin · g · dt / |u|)            // 侧旋随滑动耗散
   ```
   侧旋曲线用经验耦合项实现（接触斑摩擦积分的工程近似）：
   ```
   a_side = -k_side · μ_slide · g · clamp(ωz·R_real / |u|, -1, 1) · (ẑ × û)
   v += a_side · dt
   ```
   `k_side` 为**待标定**参数（建议起始 0.15–0.35）。这不是严格刚体解，但与项目 arcade 定位一致且能产生可感知的弧线；须在文档中如实标注为近似。
3. 若 `|u| ≤ ε`（纯滚动）：令 `ωy = vx/R_real`、`ωx = -vy/R_real`，施加更小的滚动摩擦 `a_f = -μ_roll · g · v̂`，并继续衰减 ωz。
4. 静止阈值沿用 `|v| < 0.035` 时归零，同时清零 ω。

> 这一步是整个升级的价值所在：它与 `pool.js:17` 的单一指数衰减互斥，必须整体替换，不能叠加。

### 3.5 球-球碰撞：法向冲量 + 切向摩擦（throw）

在现有 `pool.js:18` 的分离与法向冲量基础上：

```
e_ball = 0.94 ~ 0.96
j_n = -(1 + e_ball) · (v_rel · n) / 2          // 等质量，1/m1 + 1/m2 = 2
v_i -= j_n · n ;  v_j += j_n · n

t = (-ny, nx)
v_t = (v_rel · t) + R_real · (ωz_i + ωz_j)     // 接触点切向相对速度含自旋
j_t = clamp( -v_t / (2/m + 2 R_real²/I),  -μ_bb · |j_n|,  +μ_bb · |j_n| )
v_i -= j_t · t / m ;  v_j += j_t · t / m
ωz_i -= j_t · R_real / I ;  ωz_j -= j_t · R_real / I
```

`μ_bb ≈ 0.03–0.08`，产生目标球 1–2° 的 throw，并使分离角偏离 90°。**删除**现有的 `contactSpin` 一次性冲量逻辑与 `spinLife`。

### 3.6 库边：切向摩擦与侧旋耦合

在 `pool-geometry.js:87` / `PoolGeometry.java` 的 `1.92*incoming` 基础上，把恢复系数改为参数 `e_rail = 0.70–0.80`，并加入切向冲量：

```
u_t = v · t + R_real · ωz · sign
j_t = clamp( -u_t / (1/m + R_real²/I), -μ_rail · |j_n|, +μ_rail · |j_n| )
```

`μ_rail ≈ 0.2`。**删除** `pool.js:15` 的手工"加速后归一化"扰动，让反弹角变化自然来自摩擦。

### 3.7 参数表（起始值，须实测标定）

| 参数 | 起始值 | 依据 / 备注 |
|---|---|---|
| 球半径 `R_real` | 0.028575 m | 美式标准球径 57.15 mm |
| 质量 `m` | 0.17 kg | 美式标准球重 |
| `e_ball` | 0.94 – 0.96 | 酚醛树脂球实测 0.92–0.98 |
| `e_rail` | 0.70 – 0.80 | 库边能量损失明显大于球间 |
| `μ_slide` | 0.18 – 0.22 | 台呢滑动摩擦 |
| `μ_roll` | 0.010 – 0.015 | 与现有 `0.991^0.25` 每秒衰减量级对齐 |
| `μ_bb` | 0.03 – 0.08 | 球间摩擦，产生 throw |
| `μ_rail` | 0.2 | 碰库切向减速 |
| `μ_tip` | 0.6 | 皮头-球，决定 miscue 阈值 |
| `k_side` | 0.15 – 0.35 | **经验项，必须由轨迹实测标定** |

### 3.8 明确不做

- 不引入马格努斯力、不模拟跳球/曲球（masse）的离台运动、不做软体/台呢形变。
- 不引入 Rapier / Three.js（会同时破坏双端确定性、Java 权威与 2.5D 美术）。
- 不改 15 球分组、犯规、罚杆、8 球判胜与 200 杆上限。

---

## 4. 协议与兼容性

### 4.1 现状

```
command = spot * 363600 + power * 3600 + angle     // SPIN_STRIDE = 363600
spot ∈ [0,8]，power ∈ [1,100]，angle ∈ [0,3599]
```

`spot` 只有 9 个取值，`pool-opponent-cue.js:7`、`snooker-duel.js:17`（`NOM_BASE` 需大于最大 spin 编码）、后端 `PoolRulesTest.java:64` 的参数校验都依赖这个上界。

### 4.2 推荐扩展方案（保持整数指令 + 向后兼容）

把 `spot` 的 9 档语义保留为**兼容档位**，在其上方增加"连续模式"高位，不复用低位的 0–8：

```
command = MODE * 10_000_000 + (aQ * 32 + bQ) * 363600 + power * 3600 + angle
MODE = 0  → 旧 9 档（aQ/bQ 由 spot 映射为固定值，行为走新物理但保持可复现）
MODE = 1  → 连续模式，aQ、bQ 为 5 bit 有符号量化（范围 ±15，即 a = aQ/15 · 0.47）
```

- `MODE=0` 保证老客户端、老回放、老房间、Bot（`poolBot` 返回 `75*3600+a`，无 spin 位）继续可用。
- 校验上限从 `spinCode>8` 改为按 MODE 分支；`snooker-duel.js` 的 `NOM_BASE` 需按新最大指令值复核。
- 前端 `spot.onpointerdown` 保留半径信息传给 `encodePoolShot`；键盘操作映射到 8 个固定 `(a,b)` 值。
- 若不接受协议变更，可退化为 P0 方案：仅在 `MODE=0` 下用 9 档固定偏移量驱动新物理，先拿到真实感，后续再上连续模式。

### 4.3 双端一致性契约（硬约束）

物理在 `dist/table/pool.js` 与 `backend/.../PoolRules.java` **各有一份**，`tests/table-pool-spin.test.mjs:9` 与 `PoolRulesTest.java` 通过"黄金位置"逐点比对。任何模型改动必须同时改两端，并同步重刷两组 fixtures，否则联机对局会出现前端预览与服务器判定不一致。

---

## 5. 文件级改动清单

| 文件 | 改动 | 风险 |
|---|---|---|
| `dist/table/pool.js` | 球状态加 ω；用 §3.4 状态机替换 `pool.js:17`；按 §3.5/§3.6 重写碰撞与库边冲量；删除 `contactSpin` / `spinLife` / `pool.js:15` 扰动；按 §4.2 解码 | 高，核心 |
| `backend/src/main/java/com/flightparty/table/PoolRules.java` | 与上一行**逐行等价**实现；更新类注释（删除 "arcade approximation"） | 高，必须与 JS 逐帧一致 |
| `backend/src/main/java/com/flightparty/table/PoolGeometry.java` | 库边恢复系数参数化，新增切向冲量 | 中 |
| `dist/table/pool-geometry.js` | 同上 | 中 |
| `dist/table/pool-input.js` | `spotCode` 返回连续 `(a,b)`；`encodePoolShot` 支持 MODE；新增 `decodePoolShot` 供回放使用 | 中，协议 |
| `dist/table/pool-view.js` | 击球点 UI 传半径；瞄准线按初始 ω 预演弧线；`:111` 的 `_spin=0` 改为按用户偏好保留；`:231–237` 的装饰性 residual spin 改为由 ω 重建 | 中 |
| `dist/table/pool-ball.js` | `rollSphere` 由位移驱动改为可接受 ω 驱动（保持现有绘制接口，避免破坏 `pool-return.js` 调用） | 低 |
| `dist/table/pool-opponent-cue.js`、`dist/table/snooker-duel.js` | 复核指令上界与 `NOM_BASE` | 低 |
| `tests/table-pool-spin.test.mjs` | **删除 `:78–81` 反向断言**；重刷 `:9` 与 `:70` 的 golden 值；新增 §7 用例 | 高 |
| `backend/src/test/java/com/flightparty/table/PoolRulesTest.java` | 重刷黄金位置、`:63` 库边断言、`:64` 指令校验 | 高 |
| `tests/table-pool*.test.mjs`（其余约 10 个文件） | 回归： pocket、audio、animation、groups、pocket-physics、return-timing 等位置断言可能全部漂移 | 中，批量 |
| `docs/RULES.md` / `docs/QA.md` / `docs/HANDOFF.md` | 追加版本记录；**核对系数漂移**：`RULES.md:82` 记 `power×0.32`，而当前两端代码均为 `power×0.48`，需以代码为准修订 | 低 |

> 附注：`npm test` = `node --test tests/*.test.mjs`（约 165 项），Java 侧另有 `PoolRulesTest` 与 Docker 台球用例，两条流水线都要跑。

---

## 6. 分阶段实施

| 阶段 | 内容 | 产出 / 准出条件 |
|---|---|---|
| **P0 沙盒验证** | 新建独立单文件 JS 原型（不进主项目、不改协议），只实现 §3.2–§3.4，用 `spinScene` 同款布局跑轨迹 | 右塞空台走出可见弧线；高/低杆滑行距离有差异；能量单调不增、无 NaN |
| **P1 双端核心** | 按 §5 同步改 `pool.js` + `PoolRules.java` + 两个 geometry；先启用 `MODE=0` 兼容档 | JS/Java 逐帧位置差 ≤1 单位；黄金位置双向重刷 |
| **P2 输入与视觉** | 连续击球点、瞄准线弧线预览、ω 驱动的贴图旋转、`MODE=1` 协议 | 9 档与连续档都可在 UI 复现；老指令不回归 |
| **P3 回归与灰度** | 全量 `npm test` + Java/Docker 用例；新增加速度/守恒断言；QA 记录定量对照与实机手感 | 全套通过；`docs/QA.md` 新增对照表；灰度开关可回退到旧物理 |

每一阶段都保留旧物理的开关或版本位，便于线上回退。

---

## 7. 验收用例（可写入测试）

| 用例 | 布置 | 期望 | 现状 |
|---|---|---|---|
| 空台右塞弧线 | `spinScene()` 无目标球，power=5，`a=+0.5` | 白球终点 y 相对中杆偏移 **>30 单位**，轨迹中间帧亦应单调偏移 | `table-pool-spin.test.mjs:78` 断言**严格相等**（须反转） |
| 高/低杆滑行差 | 空台，power=65，`b=±0.5` vs `b=0` | 滑行距离差 >5%（滑动阶段额外耗能），方向符合前冲/回缩 | 无差异 |
| 缩杆持续回退 | `spinScene(250,450)`，`b=-0.6`，撞目标球后 | 白球持续倒退，而非一次性速度注入后立即停止 | `pool.js:18–21` 一次性冲量且被 `limit` clamp |
| 斜碰 throw | `offset=28`，`a=0` | 目标球分离角偏离 90° 约 1–2° | 严格 90° |
| 侧旋碰库 | `angle=1800` 打向库边，`a=±0.5` | 反弹角与无旋相差 2–5°，左右镜像，速率符合 `e_rail` | `pool.js:15` 手工归一化扰动 |
| 能量不增 | 所有档位 × 薄碰/厚碰组合 | 系统动能单调不增，无 NaN、无自加速 | `:99–109` 现有 14% 容差断言需按新模型重定 |
| 双端一致 | 同一指令在 JS 与 Java 各跑一遍 | 每个 16ms 帧的 48 格位置差 ≤1 单位 | 现有黄金位置机制 |

---

## 8. 风险与约束

1. **跨语言浮点确定性（最高风险）**：JS 与 Java 均为 IEEE-754 double，但 `Math.hypot` / `Math.pow` / `Math.exp` 的库实现可能存在 ULP 级差异，在 4800 步积分中被放大。建议：衰减系数预计算为常量、关键路径只用 `+ - * / sqrt`、避免 `Math.pow`；必要时把角速度量化为整数定点。P1 必须做逐帧 diff 而非只比终点。
2. **回放帧不含 ω**：`history` 仍是 `16 × (x,y,alive)` 的 48 格位置串，角速度无法传给客户端。视觉层需从 `shotCommand` 重建初始 ω 并在本地按同一模型积分，或与 P2 一起扩展帧格式（会破坏协议，不推荐）。
3. **现有测试是反向契约**：`:78` 的"不得弯曲"、`:70` 的 5 个固定终点、`:9` 的 8 档 golden 数组，以及 Java 侧对应 fixtures，都会随模型改变而失效；这不是回归，是预期变更，需一次性重刷并在 QA 中留档。
4. **历史参数漂移**：`RULES.md` 与 `QA.md` 对初速系数的记载（0.20 / 0.32 / 0.40 / +25%）与当前代码 `0.48` 不完全一致。改造前须以代码为唯一事实来源，并顺手修订文档。
5. **数值稳定性**：切向冲量必须按 Coulomb 锥 clamp（`|j_t| ≤ μ|j_n|`），滑动/滚动切换需加滞回（ε 与退出阈值不同），否则会在阈值附近抖动并产生能量注入。
6. **性能**：16 球 × 4800 子步的滑移判定与碰撞遍历，相对现有实现增加约 2–3 倍常数开销，浏览器端与服务端均仍在可接受范围；若实测吃紧，可在 `|v|` 与 `|ω|` 均低于阈值时提前休眠该球。
7. **不做的事**：不重写为 3D 刚体、不换渲染管线、不改联机权威架构。若未来确需完整真实感，应作为独立项目评估，而非在现有确定性契约上叠加 WASM。

---

## 附录 A　现有代码索引

| 关注点 | 位置 |
|---|---|
| JS 物理主循环 | `dist/table/pool.js:5–23` |
| Java 权威物理 | `backend/src/main/java/com/flightparty/table/PoolRules.java:11–17` |
| 击球点编码 | `dist/table/pool-input.js:2,11,15` |
| 库边几何 / 反弹 | `dist/table/pool-geometry.js:68–92`、`backend/.../PoolGeometry.java` |
| 击球点 UI | `dist/table/pool-view.js:104–124` |
| 装饰性 residual spin | `dist/table/pool-view.js:203–238` |
| 球面纹理与旋转基 | `dist/table/pool-ball.js:4–16` |
| 回球通道（依赖 `rollSphere`） | `dist/table/pool-return.js:130,146,156` |
| 旋转测试 | `tests/table-pool-spin.test.mjs`、`backend/src/test/java/.../PoolRulesTest.java` |
| 项目文档 | `docs/RULES.md:70–86`、`docs/HANDOFF.md:172,191,217`、`docs/QA.md:779,822,834` |

## 附录 B　需要撤除的现有断言（原文）

```js
// tests/table-pool-spin.test.mjs:78
test('spin does not invent a curve before any contact',()=>{
 const center=spinShot(spinScene(),0,5);
 for(let spot=1;spot<=8;spot++)assert.deepEqual(spinShot(spinScene(),spot,5).history,center.history);
});
```

```java
// backend/src/main/java/com/flightparty/table/PoolRules.java:6
* left, follow-left. Spin is a bounded arcade approximation, not a rigid-body model.
```

---

**本方案未修改任何代码、协议或测试；实施前请确认 §4.2 的协议扩展与 §8.1 的确定性策略。**
