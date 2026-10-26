# 经营报表与退款金额统计 · 移动端交互原型

**经营报表入口：[打开经营报表](https://l1227093078-a11y.github.io/-/)**。点击列表中的“退货金额统计”进入统计原型，统计页左上角返回列表。库存统计已开发并接入；其余 5 个报表仅展示入口，点击提示暂未开放。

**统计页直达：[打开退款金额统计](https://l1227093078-a11y.github.io/-/refund.html)**，可直接分享给他人。

[查看退款统计 HTML 源文件](refund.html)。下载 `refund.html` 后直接用浏览器打开，无需安装依赖，支持离线使用。

包含退款金额汇总、可左右滑动的柱状图与折线图、时间及商品/分类/市场门店/产品经理筛选，以及四类统计明细与规则说明。界面适配手机和桌面浏览器。

此文件包含最新确认的设计与文案，CSS、JavaScript、图标和缩略图均已内嵌。数据为演示数据，未连接业务后台。GitHub 文件页面显示源代码；下载后可查看交互界面。

图标及缩略图的来源与许可见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## Sketch 设计稿

[下载可编辑 Sketch 文件](sketch/refund-report-mobile.sketch) · [查看画板预览与使用说明](sketch/README.md)。包含 14 个页面与弹层状态，保留可编辑文字、卡片、图表和图标。

经营报表首页为 [index.html](index.html)，[reports.html](reports.html) 保留为兼容入口。离线体验时，将 `index.html` 与 `refund.html` 下载到同一目录。

## 库存统计 H5

[在线体验](https://l1227093078-a11y.github.io/-/inventory.html?v=20261026-inventory) · [使用说明及权限演示](inventory-README.md) · [下载完整 H5 代码包](../inventory-h5.zip)。支持商品/分类、产品经理、关联组织筛选与产品经理分仓明细。
