English · [中文](README.md)

# PT 签到 · PTtime

Automatically does the daily check-in (签到, for magic/bonus points) whenever you open any [pttime.org](https://www.pttime.org/) page:

- **Not checked in yet** → check in, then go to the configured torrents page and reload (or just reload if already there).
- **Already checked in** → do nothing, no reload.

## Install

Install [Tampermonkey](https://www.tampermonkey.net/) first, then [click here to install the script](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-pttime/pt-checkin-pttime.user.js).

## Config: which page to land on after check-in

The `RETURN_TO` constant at the top of the script controls where you end up after a successful check-in:

```js
const RETURN_TO = 'https://www.pttime.org/adults.php?spstate=0&tags=&actor=&cat440=1&incldead=1&search=&search_area=1';
```

Set to `''` (empty string) to just reload the page that triggered the check-in, no navigation.

## How it works

pttime.org runs on NexusPHP, but its attendance entry is the **`type`-parameter variant**: when not checked in, the page header has `<a href="attendance.php?type=sign&uid=…">签到领魔力</a>`; after check-in the same spot becomes `<a href="attendance.php?type=list">签到详情</a>` (`type` goes from `sign` to `list`). The script keys off that — if a link with `attendance.php?type=sign` is present, today's check-in is still pending → it reads that link's `href` (which carries your own `uid`) and sends a credentialed request to complete the check-in, then goes to `RETURN_TO` on success. The request has a timeout + auto-retry (8s, up to 3 tries by default) for flaky networks, and a per-day `localStorage` flag backstops so it checks in at most once per day.
