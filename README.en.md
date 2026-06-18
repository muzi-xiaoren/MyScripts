English · [中文](README.md)

# MyScripts

My collection of [Tampermonkey](https://www.tampermonkey.net/) / Greasemonkey userscripts.

Each script lives in its own folder with its own README.

## Scripts

| Script | Description | Install |
|---|---|---|
| [github-pr-tab](./github-pr-tab) | GitHub PR/Issue pages: show only `#number` in the browser tab, and color the favicon by status | [Install](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/github-pr-tab/github-pr-tab.user.js) |
| [github-repo-visibility-color](./github-repo-visibility-color) | GitHub profile / repo list: the `Public` badge turns green and `Private` turns blue (outline style, matching the native “Public archive”) | [Install](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/github-repo-visibility-color/github-repo-visibility-color.user.js) |
| [pt-checkin-pterclub](./pt-checkin-pterclub) | PTerClub: on page open, auto-detect and do the daily check-in — if pending, check in then return to the torrents page and reload; do nothing if already done | [Install](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-pterclub/pt-checkin-pterclub.user.js) |
| [pt-checkin-mua](./pt-checkin-mua) | mua: on page open, auto-detect and do the daily check-in — if pending, check in then return to `special.php` and reload; do nothing if already done | [Install](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-mua/pt-checkin-mua.user.js) |
| [pt-checkin-kamept](./pt-checkin-kamept) | KamePT: on page open, auto-detect and do the daily check-in — if pending, check in then return to `torrents.php?tag_id=10` and reload; do nothing if already done | [Install](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-kamept/pt-checkin-kamept.user.js) |

## How to install

1. Install [Tampermonkey](https://www.tampermonkey.net/) or the open-source [Violentmonkey](https://violentmonkey.github.io/) in your browser (Chrome / Edge / Firefox).
2. Click the **Install** link for a script above (ending in `.user.js`); Tampermonkey will open its install screen.
3. Click **Install**. It then runs automatically on matching pages.

> **Edge / Chrome (Manifest V3) note:** if a script shows as enabled but does nothing, open Tampermonkey's details page in `edge://extensions` (or `chrome://extensions`) and turn on **"Allow user scripts"** (or enable Developer mode in the top-right), then reload the page.

> Installed scripts auto-update via the `@updateURL` in each script header.

## License

[MIT](./LICENSE)
