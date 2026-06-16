# GitHub PR Tab — Compact Number + Status Color

让 GitHub 的 PR / Issue 在浏览器**标签页**上更好认：

- **标题紧凑**：标签只显示 `#12241`（PR/Issue 号），不再被 `(core) ...· Pull Request #12241 · owner/repo` 一长串占满，号永远看得见、不会被 `…` 截掉。
- **图标按状态上色**：标签的小图标(favicon)根据 PR 状态变色，多个标签一眼区分。

| 状态 | 颜色 |
|---|---|
| Open | 🟢 绿 `#1f883d` |
| Merged | 🟣 紫 `#8250df` |
| Closed | 🔴 红 `#cf222e` |
| Draft | ⚪ 灰 `#6e7781` |

## 安装

1. 安装 [Tampermonkey](https://www.tampermonkey.net/)（或 [Violentmonkey](https://violentmonkey.github.io/)）。
2. 点击安装：[github-pr-tab.user.js](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/github-pr-tab/github-pr-tab.user.js)

## 自定义

打开脚本 `update()` 函数，按需调整：

### 标题显示模式

三选一，留一行、其余两行注释掉：

```js
const desired = `#${number}`;                          // ① 最紧凑：只显示号（默认）
// const desired = `#${number} ${prTitle}`;            // ② 号 + 干净标题
// const desired = `#${number} ${prTitle.slice(0, 20)}…`; // ③ 号 + 标题截断到 20 字
```

### 图标颜色

改脚本顶部的 `COLORS`：

```js
const COLORS = {
  open:   '#1f883d',
  merged: '#8250df',
  closed: '#cf222e',
  draft:  '#6e7781',
};
```

## 工作原理

- 从 URL 路径 `…/pull/123` 或 `…/issues/123` 提取编号，改写 `document.title`。
- 读取页面上的状态徽章（`.State--*`）判断状态，用 `<canvas>` 画一个对应颜色的圆形图标替换 favicon。
- GitHub 是单页应用（Turbo 导航），用 `MutationObserver` 监听标题变化、监听 `turbo:load` / `pjax:end` 翻页事件，确保切换 PR 后仍然生效。

> 纯本地渲染，不向 GitHub 发送任何数据。

## License

[MIT](../LICENSE)
