English · [中文](README.md)

# PT 签到 · Mua

Automatically does the daily check-in (签到, for magic/bonus points) whenever you open any [mua.xloli.cc](https://mua.xloli.cc/) page:

- **Not checked in yet** → check in, then go to `special.php` and reload (or just reload if already there).
- **Already checked in** → do nothing, no reload.

## Install

Install [Tampermonkey](https://www.tampermonkey.net/) first, then [click here to install the script](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-mua/pt-checkin-mua.user.js).

## Config: which page to land on after check-in

The `RETURN_TO` constant at the top of the script controls where you end up after a successful check-in:

```js
const RETURN_TO = 'https://mua.xloli.cc/special.php';
```

Set to `''` (empty string) to just reload the page that triggered the check-in, no navigation.

## How it works

mua.xloli.cc runs on NexusPHP (classic attendance): when not checked in, the page header has `<a class="faqlink" href="attendance.php">[今日签到，得到魔力加成]</a>`; after check-in that link loses its `faqlink` class and the text becomes "已签到…". The script keys off that — if `a.faqlink[href*=attendance.php]` is present, today's check-in is still pending → send a credentialed request to `attendance.php`, then go to `RETURN_TO` on success. A per-day `localStorage` flag backstops so it checks in at most once per day.
