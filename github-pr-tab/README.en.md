English · [中文](README.md)

# GitHub PR Tab — Compact Number + Status Color

Make GitHub PRs / Issues easier to recognize in the browser **tab**:

- **Compact title**: the tab shows just `#12241` (the PR/Issue number) instead of the long `(core) ... · Pull Request #12241 · owner/repo`, so the number is always visible and never cut off by `…`.
- **Status-colored favicon**: the tab's favicon is recolored by PR status, so multiple tabs are easy to tell apart.

| Status | Color |
|---|---|
| Open | 🟢 Green `#1f883d` |
| Merged | 🟣 Purple `#8250df` |
| Closed | 🔴 Red `#cf222e` |
| Draft | ⚪ Gray `#6e7781` |

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
- Reads the status badge on the page (`.State--*`) to determine the status, then draws a colored circle with `<canvas>` to replace the favicon.
- GitHub is an SPA (Turbo navigation), so it uses a `MutationObserver` on the title and listens for `turbo:load` / `pjax:end` events to keep working after switching PRs.

> Purely local rendering; nothing is sent to GitHub.

## License

[MIT](../LICENSE)
