# 井字棋封面风格实机（2026-11-23）

状态：本地已实现，未部署，待用户查看视觉效果。与前一轮三张封面、纸牌反馈修正一起保留在工作区。

## 实现

- 新增 `dist/table/xo-polish.css`：紫蓝厚边框、棋盘底座厚度、凹槽阴影、柔和透视、高光及悬停/键盘焦点。
- 默认 X/O 使用可编辑 SVG：`dist/assets/xo/mark-x-3d.svg`、`mark-o-3d.svg`，带倒角、高光、厚度及接触投影。非封面截图贴图，九个原生按钮仍可独立操作。
- 玩家席位使用同款 X/O，个人棋子 `[data-cosmetic-piece]` 的现有装扮优先级保留；棋盘装扮继续控制原有色彩变量。此兼容性来自选择器审查，未在浏览器逐个购买/换装验证。
- 新落子有 320ms 落入效果；减少动态效果设置关闭该动画。
- 不修改棋子状态、3×3 点击索引、AI、联网命令、胜负及结算规则。

## 验证

- Chrome 本地实际电脑对战：点击中心和左上角，电脑回应，四枚棋子按正确格子显示。透明底色与 SVG 的高光已实看。
- 浏览器检查桌面及 390×844 手机尺寸；保存证据后恢复默认视口。
- `npm.cmd test` 1083/1083 通过，日志 `.workbuddy/tmp/xo-covermatch-final-20261123.log`；`git diff --check` 通过。
- 新增 CSS 已进入 table HTML 及重新生成的 native-table 页面；无需运行时构建。
- 截图：[桌面实机](verification/xo-covermatch-desktop-20261123.jpg)、[手机实机](verification/xo-covermatch-mobile-20261123.jpg)。这不是生产截图，也不是 GPU 三维渲染验证。
