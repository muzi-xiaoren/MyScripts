# GitHub Repo Visibility Badge Colors

给 GitHub 个人主页 / 仓库列表里的**可见性徽章**上色：

- **Public** → 绿色文字 + 绿色描边
- **Private** → 蓝色文字 + 蓝色描边

样式与 GitHub 原生的 “Public archive” 描边胶囊一致；`Public archive` / `Private archive` 保持原样（橙色）不动。颜色用 GitHub 自带的 CSS 变量，自动适配亮色 / 暗色主题。

## 安装

需先安装 [Tampermonkey](https://www.tampermonkey.net/)，然后 [点此安装脚本](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/github-repo-visibility-color/github-repo-visibility-color.user.js)。

## 生效范围

任意 `https://github.com/*` 页面中，文字恰好为 `Public` / `Private` 的徽章，包括：

- 个人主页（Overview / Repositories 标签）的仓库列表
- 仓库页头部的可见性徽章

## 自定义颜色

编辑脚本顶部注入的 CSS，修改 `.mzx-vis-public` / `.mzx-vis-private` 的颜色值即可。
