# 商城人脸头像 · 2026-11-13 · avatar3

用户认可上一版的绘制质量，并要求改为人脸头像、带不同友好表情。本轮将十款头像替换为原创人物近景插画，沿用柔光、立体造型、素色背景与圆角卡片。人物包含五男五女、自然不同发型和肤色，表情包括露齿笑、浅笑、大笑、眨眼与从容微笑。

![十款最终人脸头像素材总览](design/shop-human-avatars-v3-20261113.png)

| 保留商品 ID | 新显示名 | 表情与外观 | 运行素材 |
|---|---|---|---|
| avatar-starling | 阳光青年 / Sunny | 棕色短发，明亮露齿笑 | [PNG](../dist/assets/shop/avatars-v3/avatar-starling.png) |
| avatar-cloudy | 元气女孩 / Breezy | 黑色短发，亲切微笑 | [PNG](../dist/assets/shop/avatars-v3/avatar-cloudy.png) |
| avatar-owl | 温柔学长 / Sage | 眼镜与卷发，安静浅笑 | [PNG](../dist/assets/shop/avatars-v3/avatar-owl.png) |
| avatar-bear | 暖心大叔 / Cozy | 花白短胡须，温暖笑容 | [PNG](../dist/assets/shop/avatars-v3/avatar-bear.png) |
| avatar-rocket | 活力女孩 / Spark | 铜棕马尾，开怀大笑 | [PNG](../dist/assets/shop/avatars-v3/avatar-rocket.png) |
| avatar-luna | 月光姐姐 / Luna | 黑色长发，从容微笑 | [PNG](../dist/assets/shop/avatars-v3/avatar-luna.png) |
| avatar-fox | 俏皮女生 / Wink | 赤棕短发与雀斑，俏皮眨眼 | [PNG](../dist/assets/shop/avatars-v3/avatar-fox.png) |
| avatar-bot | 酷酷青年 / Cool | 黑色短发，轻松自信的嘴角 | [PNG](../dist/assets/shop/avatars-v3/avatar-bot.png) |
| avatar-octo | 开朗姑娘 / Joy | 蓬松卷发，笑弯眼睛 | [PNG](../dist/assets/shop/avatars-v3/avatar-octo.png) |
| avatar-crown | 自信绅士 / Sterling | 整齐短胡须，沉稳微笑 | [PNG](../dist/assets/shop/avatars-v3/avatar-crown.png) |

来源：使用内置 `image_gen.imagegen` 分别生成十张原创人物插画，每个头像单独一次调用；没有真实人物或名人参考，也未下载第三方头像。每张图等比缩小为 512×512 PNG，没有裁切或手绘修改人物；原始生成图保留在记录的 generated_images 路径中。完整逐字提示词、原始来源路径、最终文件映射见 [avatar-human-prompts-20261113.json](avatar-human-prompts-20261113.json)。十张运行素材均随项目本地交付。

接入：`dist/site-points.js` 的既有 `assetUrl(id)` 为原有头像 ID 返回 `assets/shop/avatars-v3/*.png?v=20261113-avatar3`。商城卡片、兑换弹窗、当前装备栏和页头头像共用这一路径。`site-shop.js` 只同步中英名称与描述，商品 ID、稀有度、价格、拥有状态和装备流程保持不变。只调整 `AVATAR_VERSION`，公共 `VERSION` 及页面脚本标签保持原样；已有本地页面使用 Ctrl+F5 刷新。

回退资料：上一版动物/拟物头像仍完整保留在 `dist/assets/shop/avatars-v2/`，其提示词与总览见 [上一版来源说明](AVATAR-ASSETS-20261113.md)，不删除历史资产。

验证：人工检查了十张生成图和以上总览；修改 JS 的 `node --check` 通过，42 项核心商城/钱包/装备测试通过。资源测试运行实际 `assetUrl`，检查头像新路径、avatar3 版本、文件存在性、PNG 文件头和 512×512 尺寸。总览为素材展示，不是浏览器实拍；本轮实际浏览器及全套测试由主任务统一记录至 QA，仍待用户最终视觉确认。
