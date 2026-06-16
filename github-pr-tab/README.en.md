English · [中文](README.md)

# GitHub PR Tab — Compact Number + Status Color

Make GitHub PRs / Issues easier to recognize in the browser **tab**:

- **Compact title**: the tab shows just `#12241` (the PR/Issue number) instead of the long `(core) ... · Pull Request #12241 · owner/repo`, so the number is always visible and never cut off by `…`.
- **Status-colored favicon**: the tab's favicon is recolored by the PR's overall status, so multiple tabs are easy to tell apart.

The favicon color is decided by priority (high → low):

| Priority | Condition | Color |
|---|---|---|
| 1 | Merged | 🟣 Purple `#8250df` |
| 2 | Closed (not merged) | 🔴 Red `#cf222e` |
| 3 | CI has a failed check | 🔴 Red `#cf222e` |
| 4 | Someone approved, or merge is no longer blocked | 🟡 Gold `#d4a017` |
| 5 | Draft (none of the above) | ⚫ Black `#000000` |
| 6 | Open (none of the above) | 🟢 Green `#1f883d` |

> CI and review/merge status can only be read on the **PR conversation page** (`/pull/N`, where the merge box lives); on Files / Commits sub-tabs only the base color (open/draft/merged/closed) applies.
>
> ⚫ Black may be hard to see on a dark tab strip — change `COLORS.black` in the script if so.

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) (or [Violentmonkey](https://violentmonkey.github.io/)).
2. Click to install: [github-pr-tab.user.js](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/github-pr-tab/github-pr-tab.user.js)

## Customize

Open the `update()` function and adjust as needed.

### Title display mode

Pick one; keep one line and comment out the other two:

```js
const desired = `#${number}`;                          // ① Most compact: number only (default)
// const desired = `#${number} ${prTitle}`;            // ② Number + clean title
// const desired = `#${number} ${prTitle.slice(0, 20)}…`; // ③ Number + title truncated to 20 chars
```

### Favicon colors

Edit `COLORS` at the top of the script:

```js
const COLORS = {
  open:   '#1f883d',
  merged: '#8250df',
  closed: '#cf222e',
  draft:  '#6e7781',
};
```

## How it works

- Extracts the number from the URL path `…/pull/123` or `…/issues/123` and rewrites `document.title`.
- Reads the header state badge (the octicon inside `[class*="StateLabel"]`) for open / draft / merged / closed, then reads the merge box (`[data-testid="mergebox-partial"]`) text for CI and review/merge status, and draws a colored circle with `<canvas>` to replace the favicon.
- GitHub is an SPA (Turbo navigation), so it uses a `MutationObserver` on both `<head>` (title) and `<body>` (the async-loaded, live-updating merge box / status), plus `turbo:load` / `pjax:end` and `visibilitychange` listeners, to keep working after navigation and status changes.

> Purely local rendering; nothing is sent to GitHub.

## License

[MIT](../LICENSE)
