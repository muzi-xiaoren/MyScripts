English · [中文](README.md)

# MyScripts

My collection of [Tampermonkey](https://www.tampermonkey.net/) / Greasemonkey userscripts.

Each script lives in its own folder with its own README.

## Scripts

| Script | Version | Description | Install |
|---|---|---|---|
| [github-pr-tab](./github-pr-tab) | 3.8.0 | GitHub PR/Issue pages: show only `#number` in the browser tab, and color the favicon by status | [Install](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/github-pr-tab/github-pr-tab.user.js) |
| [github-repo-visibility-color](./github-repo-visibility-color) | 1.0.0 | GitHub profile / repo list: the `Public` badge turns green and `Private` turns blue (outline style, matching the native “Public archive”) | [Install](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/github-repo-visibility-color/github-repo-visibility-color.user.js) |
| [pt-checkin-pterclub](./pt-checkin-pterclub) | 1.2.0 | PTerClub: on page open, auto-detect and do the daily check-in — if pending, check in then return to the torrents page and reload; do nothing if already done | [Install](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-pterclub/pt-checkin-pterclub.user.js) |
| [pt-checkin-mua](./pt-checkin-mua) | 1.1.0 | mua: on page open, auto-detect and do the daily check-in — if pending, check in then return to `special.php` and reload; do nothing if already done | [Install](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-mua/pt-checkin-mua.user.js) |
| [pt-checkin-kamept](./pt-checkin-kamept) | 1.1.0 | KamePT: on page open, auto-detect and do the daily check-in — if pending, check in then return to `torrents.php?tag_id=10` and reload; do nothing if already done | [Install](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-kamept/pt-checkin-kamept.user.js) |
| [pt-checkin-qingwapt](./pt-checkin-qingwapt) | 1.1.0 | QingwaPT: on homepage open, claim the daily gift + (optional) shoutbox post + check in; does nothing if already checked in; the shoutbox post is one toggle away from off | [Install](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-qingwapt/pt-checkin-qingwapt.user.js) |
| [pt-checkin-nicept](./pt-checkin-nicept) | 1.0.0 | NicePT: on page open, auto-detect and do the daily check-in — if pending, check in then return to `torrents.php` and reload; do nothing if already done | [Install](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-nicept/pt-checkin-nicept.user.js) |
| [pt-checkin-pttime](./pt-checkin-pttime) | 1.0.0 | PTtime: on page open, auto-detect and do the daily check-in — if pending, check in then return to the configured torrents page and reload; do nothing if already done | [Install](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-pttime/pt-checkin-pttime.user.js) |
| [pt-checkin-gamegamept](./pt-checkin-gamegamept) | 1.0.0 | GGPT (GameGamePT): on page open, auto-detect and do the daily check-in — if pending, check in then reload in place; do nothing if already done | [Install](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-gamegamept/pt-checkin-gamegamept.user.js) |
| [pt-checkin-carpt](./pt-checkin-carpt) | 1.0.0 | CarPT: on page open, auto-detect and do the daily check-in — if pending, check in then return to `torrents.php` and reload; do nothing if already done | [Install](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-carpt/pt-checkin-carpt.user.js) |
| [pt-checkin-btschool](./pt-checkin-btschool) | 1.0.0 | BTSchool: on page open, do the daily check-in (BTSchool's `index.php?action=addbonus` plugin) — if pending, check in then return to `torrents.php` and reload; do nothing if already done | [Install](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-btschool/pt-checkin-btschool.user.js) |
| [pt-checkin-rousi](./pt-checkin-rousi) | 1.0.0 | Rousi (custom React tracker): on page open, simulate a click on the check-in button — if pending, check in then return to the configured list page and reload; do nothing if already done | [Install](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-rousi/pt-checkin-rousi.user.js) |

## How to install

1. Install [Tampermonkey](https://www.tampermonkey.net/) or the open-source [Violentmonkey](https://violentmonkey.github.io/) in your browser (Chrome / Edge / Firefox).
2. Click the **Install** link for a script above (ending in `.user.js`); Tampermonkey will open its install screen.
3. Click **Install**. It then runs automatically on matching pages.

> **Edge / Chrome (Manifest V3) note:** if a script shows as enabled but does nothing, open Tampermonkey's details page in `edge://extensions` (or `chrome://extensions`) and turn on **"Allow user scripts"** (or enable Developer mode in the top-right), then reload the page.

> Installed scripts auto-update via the `@updateURL` in each script header.

## License

[MIT](./LICENSE)
