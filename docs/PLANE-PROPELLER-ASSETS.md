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
