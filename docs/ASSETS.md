# v0.6.2 素材与制作说明

图片、音频和字体在 `dist/assets`；程序几何在对应JS模块，无运行期CDN依赖。

## v0.6.2道路标定

没有生成或修改环境位图。`dist/ground-projection.js` 依据 `airport-island-v5.png` 的1254px实测角点TL(145,105)、TR(1109,105)、BR(1128,1076)、BL(124,1076)建立固定地面射影映射；机场图的绘制比例保持不变。低路缘切角与地板裁切由Canvas几何实现。

用户最新标注原图复制为 [`design/v062-road-alignment-feedback.png`](design/v062-road-alignment-feedback.png)，用于UI验收与后续开发追溯。包内旧视频保留v0.6骰子、v0.5撞机身份，不代表本轮地面校准。

## v0.6程序3D骰子

- `dist/die-geometry.js` 程序生成完整六面网格、圆角和浅凹点；蓝色位于真实凹面顶点颜色上，会随光照变化。
- `dist/die3d.js` 使用同一几何、面值与姿态进行WebGL或CPU软件3D渲染，并驱动1120ms翻滚、轻跳和回弹。
- 本轮没有为骰子调用图像生成，没有新增骰子PNG，也不需要下载GLB文件；它是真实程序几何模型。
- 使用已有本地Three.js依赖及随包MIT许可证。当前软件3D路径已视觉检查，GPU路径尚未实测。
- 飞机与环境位图沿用已有素材；棋盘几何以当前版本的地面标定为准，新骰子不代表整个棋盘迁移到实时3D。

## v0.5新增与更新素材（沿用）

v0.5使用内置image_gen生成/编辑三张图片，原始输出复制至项目。完整逐字提示词、工具模式和目标路径保存在 [`asset-prompts-v05.json`](asset-prompts-v05.json)，不是只保留摘要。

| 当前运行文件 | 完整提示词键 | 制作与用途 |
|---|---|---|
| dist/assets/airport-island-v5.png | islandPrompt | 以旧机场图编辑：移除右上机库，接续道路/绿植，缩小塔台体量；保留空地、道路位置与原相机布局 |
| dist/assets/ocean-water-v5.png | oceanPrompt | 新生成的蓝色海水纹理，用于岛屿之外的视口背景；实际画面泡沫与亮度仍比参考图更强 |
| dist/assets/avatars-v5.png | avatarPrompt | 以旧头像布局和原设计图为参考，重做2×2玩具卡通头像：蓝色男孩、橙帽女孩、柯基、兔子 |

程序运行时将机场外侧约2.4%–2.5%的海水像素羽化，与海面背景衔接，未离线修改原始PNG。机场图片保持固定比例，棋盘几何按同一地面坐标标定。

标题栏和骰子区复用cloud-bank.png；飞机图仍使用四套原素材。机身1/2编号、棋格、基地、旗帜、星星和运动路径由程序绘制。v0.5的CSS三面骰子已在v0.6由上述真实六面几何替代。骰子正面点数与编号身份来自真实规则状态，不通过图像生成猜测。图片整体缩放、旋转、镜像属于实时渲染。

## v0.2原始图像素材（历史来源，飞机继续使用）

- `plane-blue.png`：以原对局设计图为参考，生成透明背景的单架蓝色玩具飞机。提示核心：精致3D塑料、白色脸部、风挡双眼、黑色轮子、黄色螺旋桨中心、固定俯视三分之四角度、完整轮廓、无背景/棋盘/UI。
- `plane-orange.png` / `plane-green.png` / `plane-red.png`：以蓝色飞机为基准，只改变蓝色涂装为对应颜色，保持镜头、造型、白色脸部、黑色轮子和黄色中心。使用独立图片，避免整个飞机色相旋转导致中心和脸部变色。
- `airport-island.png`：参考图同风格的海岛机场环境，中央留空；只有边缘道路、塔台、航站楼、树木、灯光和海水。准确棋格由代码绘制。
- `avatars.png`：2×2四头像图集：蓝色耳机男飞行员、橙色帽女飞行员、绿色柯基、红色兔子。界面按象限显示。

图像均由本会话内置图像生成工具制作，原始生成结果完整复制进项目，无离线Python改色或背景替换。游戏中的缩放、镜像、旋转属于实时渲染。

## 字体

Nunito 700 / 900，来自 @fontsource/nunito 5.3.0，仅随包附带拉丁字符woff2。许可证见 `assets/NUNITO-LICENSE.txt`。中文使用设备系统字体。

## 音频

原创程序合成WAV，生成脚本为 `scripts/build_audio.py`。不包含第三方录音。

- bump-1至5：橡胶低频撞击＋阻尼弹簧滑音＋滑稽回落声，约0.95秒。
- roll：轻敲/滚动节奏，0.6秒。
- takeoff：短促上滑音，0.36秒。
- land：柔和落地声，0.18秒。
- click：短音，0.09秒。
- win：短旋律，1.7秒。

音效经音量控制与动态压缩输出；背景音乐默认关闭，可在设置开启。视觉碰撞回调同时触发声音和星星/文字特效。


## v0.3新增图像素材

内置imagegen生成，原始透明PNG完整复制到 `dist/assets`，未离线改图。游戏内缩放缓存是实时渲染优化。

- `cloud-bank.png`：1774×887 RGBA。完整提示词：

> Use case: stylized-concept. Asset type: one transparent PNG foreground cloud bank for a high-quality 3D toy aeroplane chess browser game. Generate ONE isolated fluffy white cumulus cloud bank, elongated horizontal silhouette, approximately 2:1 width to height. Beautiful volumetric cloud texture with many naturally billowing lobes, bright warm-white upper-left sunlight and subtle cool pale-blue shadow volumes underneath, soft luminous edges and fine wispy feathering into genuine alpha transparency. Style: premium animated feature-film cloud, believable fluffy vapor, cheerful sunlit tropical sky, not a flat vector cloud and not a pile of hard spheres. Viewed from a lightly elevated camera to match a toy island board. The cloud should occupy about 85% of image width and be fully visible, with transparent padding all sides. No backdrop, no sky color rectangle, no shadow on a ground plane, no sea, no islands, no text, no airplane, no sparkles. Deliver the standalone cloud asset only, true transparent background.

- `smoke-puff.png`：1358×1159 RGBA。完整提示词：

> Use case: stylized-concept. Asset type: one transparent PNG sprite of a compact white cartoon collision smoke puff for a premium 3D toy airplane party game. Generate ONE isolated dense soft puff made from 8–12 overlapping rounded cloudy lobes, compact roughly circular silhouette but naturally irregular, with several tiny trailing wisps. This is harmless funny cartoon steam from a silly boop collision, no fire. Highly polished animated-feature 3D volumetric rendering: bright clean white sunlight on upper left, very subtle light blue-grey creases and underside, soft material, pleasing depth, softer wispy edges that fade into genuine alpha transparency. Camera slightly above at three-quarter view. Crisp readable at 70 pixels, large smooth cloud lobes rather than fine noisy smoke, fluffy but substantial. Center it, fully visible, 15% transparent padding on all sides. Absolutely no text, no stars, no airplane, no explosion flash, no yellow, no debris, no ground, no backdrop. Deliver only the single white puff on true transparent background.

棋格、底板、基地、金色星星和运动轨迹均由程序绘制，确保位置准确。飞机素材沿用v0.2，只有实时比例、投影、阴影和运动改变。音频沿用原WAV，接触事件同步逻辑重用。


## 当前材质配色（v0.6.1更新，v0.6.2沿用）

| 阵营 | 基地 | 底板 | 归航线 | 路线圆点 |
|---|---|---|---|---|
| 蓝 | #087fff | #168efb | #1285f9 | #168fff |
| 橙 | #ff8316 | #ffa628 | #ff9f18 | #ff9229 |
| 绿 | #27bb4d | #30c45b | #2dbb4e | #32c75a |
| 红 | #f83e36 | #ff4c43 | #ff463c | #ff4c43 |

上述颜色直接用于程序材质；高光、侧面、凹槽另有明暗计算。没有对现有飞机PNG和机场PNG施加整体色相滤镜。新增切角底座与旗帜也均由程序绘制。

v0.6.1未生成或修改位图素材；校色、基地明暗和接触阴影均由程序材质/Canvas绘制。
