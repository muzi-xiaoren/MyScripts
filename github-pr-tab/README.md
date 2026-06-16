中文 · [English](README.en.md)

# GitHub PR Tab — Compact Number + Status Color

让 GitHub 的 PR / Issue 在浏览器**标签页**上更好认：

- **标题紧凑**：标签只显示 `#12241`（PR/Issue 号），不再被 `(core) ...· Pull Request #12241 · owner/repo` 一长串占满，号永远看得见、不会被 `…` 截掉。
- **图标按综合状态上色**：标签的小图标(favicon)按 PR 的综合状态变色，多个标签一眼区分。

favicon 颜色按优先级判定（高 → 低）：

| 优先级 | 情况 | 颜色 |
|---|---|---|
| 1 | Merged（已合并） | 🟣 紫 `#8250df` |
| 2 | Closed（已关闭未合并） | 🔴 红 `#cf222e` |
| 3 | CI 有失败的检查 | 🔴 红 `#cf222e` |
| 4 | 有人 approve，或 merge 不再被 block | 🟡 金 `#d4a017` |
| 5 | Draft（无上述情况） | ⚫ 黑 `#000000` |
| 6 | Open（无上述情况） | 🟢 绿 `#1f883d` |

> CI 与审查/合并状态只在 **PR 会话页**（`/pull/N`，合并框所在）能读到；在 Files / Commits 等子页只按 open/draft/merged/closed 上基础色。
>
> ⚫ 黑色在深色标签栏上可能不明显——若看不清，把脚本里 `COLORS.black` 改成别的深色即可。

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
- 读取头部状态徽章（`[class*="StateLabel"]` 里的 octicon）判断 open / draft / merged / closed，再读合并框（`[data-testid="mergebox-partial"]`）的文案判断 CI 与审查 / 合并状态，用 `<canvas>` 画对应颜色的圆形替换 favicon。
- GitHub 是单页应用（Turbo 导航），用 `MutationObserver` 同时监听 `<head>`（标题）与 `<body>`（合并框 / 状态的异步加载和实时变化），并监听 `turbo:load` / `pjax:end` 翻页和 `visibilitychange`，确保切换 PR、状态变化后都生效。

> 纯本地渲染，不向 GitHub 发送任何数据。

## License

[MIT](../LICENSE)
