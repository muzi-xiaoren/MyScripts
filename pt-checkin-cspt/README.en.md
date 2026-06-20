English · [中文](README.md)

# PT 签到 · CSPT

Automatically does the daily check-in (签到, for bonus points) whenever you open any [cspt.top](https://cspt.top/) page:

- **Not checked in yet** → check in, then go to `torrents.php` and reload (or just reload if already there).
- **Already checked in** → do nothing, no reload.

## Install

Install [Tampermonkey](https://www.tampermonkey.net/) first, then [click here to install the script](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-cspt/pt-checkin-cspt.user.js).

## Config: which page to land on after check-in

The `RETURN_TO` constant at the top of the script controls where you end up after a successful check-in:

```js
const RETURN_TO = 'https://cspt.top/torrents.php';
```

Set to `''` (empty string) to just reload the page that triggered the check-in, no navigation.

## How it works

cspt.top runs on NexusPHP but with a custom theme: the check-in entry is an **icon** link `<a class="not-attended" href="attendance.php">` (its icon is `no-qiandao` when pending), and after check-in that class flips from `not-attended` to `attended` with a `qiandao.png` icon. The script keys off that — if `a.not-attended[href*=attendance.php]` is present, today's check-in is still pending → send a credentialed request to `attendance.php`, then go to `RETURN_TO` on success. The request has a timeout + auto-retry (8s, up to 3 tries by default), and a per-day `localStorage` flag backstops so it checks in at most once per day.
