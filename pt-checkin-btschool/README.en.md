English · [中文](README.md)

# PT 签到 · BTSchool

Automatically does the daily check-in (签到, for magic/bonus points) whenever you open any [pt.btschool.club](https://pt.btschool.club/) page:

- **Not checked in yet** → check in, then go to `torrents.php` and reload (or just reload if already there).
- **Already checked in** → do nothing, no reload.

## Install

Install [Tampermonkey](https://www.tampermonkey.net/) first, then [click here to install the script](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-btschool/pt-checkin-btschool.user.js).

## Config: which page to land on after check-in

The `RETURN_TO` constant at the top of the script controls where you end up after a successful check-in:

```js
const RETURN_TO = 'https://pt.btschool.club/torrents.php';
```

Set to `''` (empty string) to just reload the page that triggered the check-in, no navigation.

## How it works

pt.btschool.club runs on NexusPHP, but its check-in uses BTSchool's own "每日签到" (daily check-in) plugin — the entry is **not** `attendance.php`: when not checked in, the page header has `<a href="index.php?action=addbonus">每日签到</a>`, and after check-in that link disappears entirely. The script keys off that — if `a[href*="action=addbonus"]` is present, today's check-in is still pending → send a credentialed request to it, then go to `RETURN_TO` on success. The request has a timeout + auto-retry (8s, up to 3 tries by default) for flaky networks, and a per-day `localStorage` flag backstops so it checks in at most once per day.
