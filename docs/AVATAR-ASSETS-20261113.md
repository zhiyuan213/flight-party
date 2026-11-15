# 商城头像 · 2026-11-13

> 历史版本：同日用户追加要求后，商城已切换为 [avatar3 人脸头像](AVATAR-HUMAN-ASSETS-20261113.md)。以下 v2 动物/拟物素材与验证记录保留作回退参考。

本轮按用户“设计大众能接受的头像”的要求，为现有十个商品制作新的友善角色插画。保留商品 ID、名称、稀有度、价格、拥有状态和装备流程；头像仍不设默认款。

![十款最终头像素材总览](design/shop-avatars-v2-20261113.png)

| ID | 最终造型 | 运行素材 |
|---|---|---|
| avatar-starling | 蓝羽小鸟、星星天线 | [PNG](../dist/assets/shop/avatars-v2/avatar-starling.png) |
| avatar-cloudy | 白色蓬松云朵 | [PNG](../dist/assets/shop/avatars-v2/avatar-cloudy.png) |
| avatar-owl | 翠绿猫头鹰、琥珀眼睛 | [PNG](../dist/assets/shop/avatars-v2/avatar-owl.png) |
| avatar-bear | 暖棕小熊 | [PNG](../dist/assets/shop/avatars-v2/avatar-bear.png) |
| avatar-rocket | 珊瑚红与象牙白小火箭 | [PNG](../dist/assets/shop/avatars-v2/avatar-rocket.png) |
| avatar-luna | 蜂蜜金月牙 | [PNG](../dist/assets/shop/avatars-v2/avatar-luna.png) |
| avatar-fox | 橙色狐狸、白色面颊 | [PNG](../dist/assets/shop/avatars-v2/avatar-fox.png) |
| avatar-bot | 青色复古机器人 | [PNG](../dist/assets/shop/avatars-v2/avatar-bot.png) |
| avatar-octo | 紫色章鱼、粉色吸盘 | [PNG](../dist/assets/shop/avatars-v2/avatar-octo.png) |
| avatar-crown | 金色小皇冠角色 | [PNG](../dist/assets/shop/avatars-v2/avatar-crown.png) |

来源与制作：使用内置 `image_gen.imagegen`，每款分别生成一张，不使用下载的第三方头像。每张原始图保留在工具返回的 generated_images 路径；最终图等比缩小为 512×512 PNG，未裁切或手绘修改角色。十张运行素材全部随项目本地交付，不依赖运行期外链。完整逐字提示词、源图路径、最终相对路径见 [avatar-prompts-20261113.json](avatar-prompts-20261113.json)。

接入：`dist/site-points.js` 的既有 `assetUrl(id)` 为头像 ID 返回 `assets/shop/avatars-v2/*.png?v=20261113-avatar2`；商城卡片、兑换弹窗、顶部已装备头像与当前装备栏共用此来源。旧 SVG 保留作历史素材，当前商城不再引用它们。只更新头像素材版本 `AVATAR_VERSION`，其余商品与页面公共版本不变。已有本地页面需 Ctrl+F5 刷新脚本。

验证：修改 JS 的 `node --check` 通过。商城、钱包、装备与关联资源的 110 项聚焦测试全部通过；商品素材测试执行真实 `assetUrl`，检查返回文件存在、PNG 文件头和 512×512 尺寸，避免旧 SVG 掩盖缺失资源。人工检查了十张生成图及以上素材总览。实际浏览器布局和全套回归由本轮主任务统一记录到 QA；本文件的总览是素材展示，不是浏览器实拍，也不表示用户最终视觉批准。
