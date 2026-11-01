# 飞机独立螺旋桨资源

2026-11-01 使用内置imagegen精确编辑四张原飞机图，未覆盖原图。

输出文件（项目绝对目录 `D:/code/flight-party/dist/assets/`）：
- `plane-blue-body.png`
- `plane-orange-body.png`
- `plane-green-body.png`
- `plane-red-body.png`

共同提示词（每次仅替换颜色，分别引用对应原plane-COLOR.png）：Precise production game sprite edit. Change ONLY the propeller on the supplied COLOR cartoon plane. Remove all three colored propeller BLADES, leaving the round GOLD/YELLOW HUB in exactly the same position and size. Reconstruct only the small white nose/fuselage surface previously hidden by those blades; preserve genuine alpha transparency. Keep framing, canvas size, perspective, pose, silhouette, wings, fuselage white panel, eyes, mouth, wheels, tail, aircraft symbol, COLOR colors, highlights and shadows unchanged. Do not move, rescale or rotate the plane. No new propeller, blades, speed lines, text, layout or background. The separate animated propeller will be rendered in code over the existing hub.

生成后原样复制。蓝色原/新图均1312×1199。使用propeller.js作为渲染部件，不修改引擎坐标、飞机身份或投影。主页hero-plane.js是真实程序化Three.js模型；游戏默认CanvasBoard仍2.5D图像主体加活动螺旋桨。3D模型付费收藏功能仍未实现。

## VIP standalone geometry (UI37)
Model source: dist/member-plane.js; studio: dist/hero-plane.js. Gold biplane / Cloud twin-engine floatplane / Night swept-wing twin-tail racer. The original illustrated sprite assets remain the classic/gameboard baseline. The same Three geometry exports to binary glTF via scripts/export-member-planes.mjs with named propeller pivots and embedded texture/material data. Concept art is retained in docs/design/vip-aircraft-three-shapes-concept.png; actual rendering differs from the offline concept.

## 2026-11-01 UI38 · 金翼领航（可用于对局的2D资源）
- 使用内置 imagegen 的编辑模式，引用 D:/code/flight-party/dist/assets/plane-blue-body.png，transparent_background=true。
- 输出原件：C:/Users/Administrator/.codex/generated_images/01a19019-d8c5-7ee3-b7d9-73f50f5771b4/exec-6a5db254-7566-4265-b504-171050497870.png。
- 项目原样复制：D:/code/flight-party/dist/assets/plane-vip-gold-body.png，1312×1199；未用图像脚本重绘或修改像素。
- Prompt summary: precise production sprite edit; preserve original silhouette, proportions, camera, pose, subject position, wheels, wing tips, spinner center and white number panel. Premium warm champagne-gold body and tail, ivory lower nose, sapphire/navy cockpit brow and wing bands, thin gold edging, embossed wing badge on tail, gold wheel hubs. Keep side white fuselage panel blank for runtime 1/2 numbers. No propeller blades, text, halos, floating particles or background. Genuine alpha transparency, readable at 90px board size.
- This bitmap is the actual live-game body, not a 3D concept/model. CanvasBoard retains the original projection, shadow and number anchors, with a separate animated golden rotor. Membership and public planeStyle come from the server. Homepage and hangar reuse this same bitmap. Historical 3D model files and exports above were removed at the user's request.

## 2026-11-02 UI39 · 云海巡航 / 星夜疾风
Built-in imagegen EDIT mode, transparent_background=true; both reference D:/code/flight-party/dist/assets/plane-blue-body.png and preserve the exact 1312×1199 registration, silhouette, camera, wheel/spinner centers, blank runtime number panel and propeller-free body. Original outputs copied without raster modification:
- Cloud: C:/Users/Administrator/.codex/generated_images/01a19019-d8c5-7ee3-b7d9-73f50f5771b4/exec-b1d98c93-2c9e-4c08-8aff-01578c33d794.png → D:/code/flight-party/dist/assets/plane-vip-cloud-body.png.
- Night: C:/Users/Administrator/.codex/generated_images/01a19019-d8c5-7ee3-b7d9-73f50f5771b4/exec-e11b3952-deef-4fa1-83c1-bae8e0e8b26e.png → D:/code/flight-party/dist/assets/plane-vip-night-body.png.
Prompt set: exact production sprite edit; preserve canvas framing/subject position, cute face and all game registration anchors; no text/numbers, propeller blades, background, halo or floating particles. Cloud: pearlescent ivory-white body/tail, saturated ice-blue wings, azure leading bands, thin platinum trims, turquoise brow, cloud-and-wing enamel tail badge, silver hub. Night: lustrous midnight navy body/tail, controlled violet iridescence, royal-violet wings/brow, polished silver edge and wing-tip bands, crescent/star tail and shooting-star wing-root insignia, silver hub. Blank white side panel retained for runtime 1/2. These are authored 2D livery variants on the same base aircraft, not new 3D meshes. Shared plane catalog and renderer consume these exact files; cloud/night use silver animated hubs.

## 2026-11-02 UI40 · 黑曜猎隼 / 极光幻翼（年VIP）
Built-in imagegen EDIT mode, transparent_background=true; reference D:/code/flight-party/dist/assets/plane-blue-body.png. The two original outputs were copied directly without pixel editing:
- Obsidian: C:/Users/Administrator/.codex/generated_images/01a19019-d8c5-7ee3-b7d9-73f50f5771b4/exec-0e84a0ae-53ea-471d-870d-9c5318b5bdc2.png → D:/code/flight-party/dist/assets/plane-vip-obsidian-body.png.
- Aurora: C:/Users/Administrator/.codex/generated_images/01a19019-d8c5-7ee3-b7d9-73f50f5771b4/exec-d5c8a81d-87cb-4b4d-80c2-acf3cd30d3f2.png → D:/code/flight-party/dist/assets/plane-vip-aurora-body.png.
Prompt set: precise production sprite EDIT, preserve source1312x1199 framing/scale/position, wheel/spinner/wing tips/side blank number panel, cute eyes and smile. Premium annual-VIP collectible livery readable at90px. Genuine alpha; NO PROPELLER BLADES; no letters/numbers/UI/halo/external shadow/particles. Obsidian Falcon: mainly black body/upper nose/wings/tail, deep obsidian satin charcoal, subtle carbon-fiber wing inlays, silver highlights, thin rose-gold edge/cockpit/wing-tip bands, rose-gold spinner at same center, embossed rose-gold falcon/diamond tail crest, rose-gold wheel hubs with dark garnet core; retain ivory lower chin and white eyes/panel. Aurora Wings: polished jade teal/deep aquamarine body/tail, pearl mint/opal wings with cyan/lavender/rose iridescence, platinum edges, turquoise brow, inset opal diamond-wing tail badge, silver spinner/wheel hubs with teal gem. These are same-airframe 2D livery variants, not 3D models. Obsidian uses shared rose-metal animated hub; aurora silver. Actual CanvasBoard output is retained in docs/verification/annual-vip-board-ui40.png.
