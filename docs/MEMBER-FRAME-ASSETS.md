# 会员头像框材质资源 · 2026-11-01

使用内置 imagegen 生成，用户确认后接入。三款均为透明PNG外框，不含人物；现有头像保持不变，不是实时3D模型。旧SVG保留作历史资源，新CSS改用v2 PNG。

项目文件：
- `D:/code/flight-party/dist/assets/member/frame-gold-v2.png`
- `D:/code/flight-party/dist/assets/member/frame-cloud-v2.png`
- `D:/code/flight-party/dist/assets/member/frame-night-v2.png`

全部1254×1254，中心alpha=0；生成后原样复制，未用脚本修改图片。按每款透明圆孔位置分别校准CSS覆盖层，保留人物脸部，金翼装饰位于底部。

参考：`docs/design/member-appearance-reference.png`。内置生成工具的提示词按以下共同要求和各款描述组织：

共同要求：Create ONLY a SINGLE premium game UI circular avatar FRAME overlay. Genuine transparent alpha outside AND throughout the circular center opening. No face, portrait, person, letters, text, scenery, background or painted checkerboard. Perfect front view, square canvas, rich physically shaded 3D game render, convincing bevels, clear studio highlights, soft ambient occlusion, readable at small icon sizes. Original presentation is style reference only; the existing generated gold frame is layout reference for subsequent variants. This is a reusable overlay above an existing avatar, not a full avatar or UI panel.

Gold: polished sculpted warm gold ring, bright top-left metallic reflections, amber inner shadows, compact separated feather relief on a pair of lower aviation wings, faceted blue gem at the bottom. Circular opening approximately centered at x50%, y48%, radius32%; decorations outside the hole.

Cloud: layered pearl-white enamel, polished icy-blue/silver beveled rims, sculpted soft white cloud clusters with blue shaded undersides around lower sides, compact glossy white/sky-blue airplane ornament at bottom; circular transparent opening approximately x50%,y44%,radius31%.

Night: rich midnight cobalt/violet enamel, beveled polished silver rims, a few dimensional gold stars, compact gold crescent outside upper-right rim, no glow in the center, same transparent opening and general composition as gold reference.

UI本轮同时隐藏账号弹窗滚动条（仍允许滚轮/触摸滚动），移除胜利效果下拉项，会员胜利效果继续默认gold，预览和保存固定使用gold；减少动态效果仍静态显示。没有更改头像身份、会员资格或分数。
