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
| 3 | Stacked：base 不是主干（`main`/`master`），而是叠在别的分支上 | ⚪ 灰 `#6e7781` |
| 4 | 有**必需**检查失败（optional 检查失败不算，它不拦合并） | 🔴 红 `#cf222e` |
| 5 | 有冲突（需解决才能合） | 🔴 红 `#cf222e` |
| 6 | 有人 approve，或 merge 不再被 block | 🟠 橙 `#f66a0a` |
| 7 | Draft（无上述情况） | ⚫ 黑 `#000000` |
| 8 | Open（无上述情况） | 🟢 绿 `#1f883d` |

> **approve 是"明确正向信号"，不受 blocked 影响**：走 trunk 合并队列时，检查跑完前 GitHub 会一直挂着 `Merging is blocked`。所以只要审批进度条显示已满足（`reviews-progress-fulfilled`，没有待审），就直接判橙，不再要求"没有 blocked"——否则已 approve 的 PR 会一路显示绿色。反之，"没 approve 但已经能合"是靠没有拦截文字**推断**出来的，仍要求没有 blocked，避免合并框半加载时闪一下橙。

> **灰色（stacked）优先于红色**：叠在别的分支上的 PR，其合并态是「临时」的——等它的 base 合入主干后才真正评估，所以此刻的冲突 / CI 都先不当回事，用灰色标成「暂不关注」。只有真正冲着主干合的 PR，冲突 / CI 失败才会亮红。
>
> CI 与审查/合并状态只在 **PR 会话页**（`/pull/N`，头部有检查 / 审批进度条和「Merge status」按钮）能读到；在 Files / Commits 等子页只按 open/draft/merged/closed 上基础色。
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
  green:  '#1f883d', // Open
  black:  '#000000', // Draft
  red:    '#cf222e', // Closed / CI 失败 / 冲突
  orange: '#f66a0a', // 已 approve / 可合
  purple: '#8250df', // Merged
  gray:   '#6e7781', // Stacked（base 非主干）
};
```

## 工作原理

- 从 URL 路径 `…/pull/123` 或 `…/issues/123` 提取编号，改写 `document.title`。
- 读取头部状态徽章（`[class*="StateLabel"]` 里的 octicon）判断 open / draft / merged / closed，再读头部常驻的状态（2026-11 改版后合并框只在点开「Merge status」时才渲染）：
  - base 分支：`[class*="baseBranchGroup"]` 里的 `/tree/` 链接；
  - 必需检查失败：`checks-progress-required-failure` 进度条段，或检查进度条 aria-label 里的 `N required failing`；
  - 冲突：「Merge status」按钮提示文字含 `conflict`；
  - 已批准：`reviews-progress-fulfilled` 段且没有 `outstanding` / `pending`；
  - 旧版合并框（`[data-testid="mergebox-partial"]`）仍作兜底。

  然后画对应颜色的 SVG 圆形替换 favicon。
- GitHub 是单页应用（Turbo 导航），用 `MutationObserver` 同时监听 `<head>`（标题）与 `<body>`（进度条 / 状态的异步加载和实时变化），并监听 `turbo:load` / `pjax:end` 翻页和 `visibilitychange`，确保切换 PR、状态变化后都生效。

> 纯本地渲染，不向 GitHub 发送任何数据。

## License

[MIT](../LICENSE)
