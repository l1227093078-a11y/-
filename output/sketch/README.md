# 直播答题宣传图 · Sketch 交付

- [下载 Sketch 文件](live-quiz-editable.sketch)
- [查看重绘预览](live-quiz-preview.png)

根据聊天中提供的截图重建，画布为 1239 × 1152。包含 10 个命名分组、204 个子图层，主要文字、卡片、按钮、手机外框和红包插画均为原生可编辑图层。下载 `.sketch` 文件后用 Sketch 打开，展开图层面板即可修改。

## 还原范围

这是一份依据截图的近似分层重绘，并非原始设计源文件，也不是截图的无损转换。视频画面、主播形象、头像及部分图标用简化矢量重新绘制；细节、阴影和字形会与截图不同。未将聊天截图嵌入文件。文字使用 macOS 的 PingFang SC，其他系统可能发生字体替换。PNG 为生成器绘制的参考预览，并非 Sketch 桌面软件导出，实际排版可能有细微差异。

## 验证

文件为标准 ZIP 封装的 Sketch 文档。`document.json`、页面 JSON、`meta.json` 和 `user.json` 均通过 Sketch 官方 `@sketch-hq/sketch-file-format@6.5.0` JSON Schema 校验（文档格式版本 146）；ZIP 完整性和图层引用也已检查。当前 Linux 环境未安装 Sketch 桌面版，因此尚未进行桌面打开验证。

## 重新生成

需要 Python 3、Pillow 和系统 Noto Sans CJK 字体：

```sh
python3 output/sketch/source/build.py
```

`source/templates.json` 是依据上述官方 JSON Schema 生成的最小结构模板；`source/build.py` 中保留布局、文字与绘制过程。生成命令会覆盖此目录中的 Sketch 文件和 PNG 预览，不修改其他文件。
