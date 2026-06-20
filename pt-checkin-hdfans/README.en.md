English · [中文](README.md)

# PT 签到 · HDFans

Automatically does the daily check-in (签到, for magic/bonus points) whenever you open any [hdfans.org](https://hdfans.org/) page:

- **Not checked in yet** → check in, then go to `torrents.php` and reload (or just reload if already there).
- **Already checked in** → do nothing, no reload.

## Install

Install [Tampermonkey](https://www.tampermonkey.net/) first, then [click here to install the script](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-hdfans/pt-checkin-hdfans.user.js).

## Config: which page to land on after check-in

The `RETURN_TO` constant at the top of the script controls where you end up after a successful check-in:

```js
const RETURN_TO = 'https://hdfans.org/torrents.php';
```

Set to `''` (empty string) to just reload the page that triggered the check-in, no navigation.

## How it works

hdfans.org runs on NexusPHP (classic faqlink attendance): when not checked in, the page header has `<a class="faqlink" href="attendance.php">[签到得魔力]</a>`; after check-in that link loses its `faqlink` class (the script keys off the structure rather than the text). If `a.faqlink[href*=attendance.php]` is present, today's check-in is still pending → send a credentialed request to `attendance.php`, then go to `RETURN_TO` on success. The request has a timeout + auto-retry (8s, up to 3 tries by default), and a per-day `localStorage` flag backstops so it checks in at most once per day.
