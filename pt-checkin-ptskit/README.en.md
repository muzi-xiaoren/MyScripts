English · [中文](README.md)

# PT 签到 · PTSKit

Automatically does the daily check-in (签到, for magic/bonus points) whenever you open any [www.ptskit.org](https://www.ptskit.org/) (拾刻) page:

- **Not checked in yet** → check in, then go to `torrents.php?tag_id=238` (the "PTS官方" tag) and reload (or just reload if already there).
- **Already checked in** → do nothing, no reload.

## Install

Install [Tampermonkey](https://www.tampermonkey.net/) first, then [click here to install the script](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-ptskit/pt-checkin-ptskit.user.js).

## Config: which page to land on after check-in

The `RETURN_TO` constant at the top of the script controls where you end up after a successful check-in:

```js
const RETURN_TO = 'https://www.ptskit.org/torrents.php?tag_id=238';
```

Set to `''` (empty string) to just reload the page that triggered the check-in, no navigation.

## How it works

PTSKit runs on NexusPHP (classic attendance): when not checked in, the page header has `<a class="faqlink" href="attendance.php">[签到得魔力]</a>`; after check-in that link loses its `faqlink` class and the text becomes "[签到已得N, 补签卡: N]". The script keys off that — if `a.faqlink[href*=attendance.php]` is present, today's check-in is still pending → send a credentialed GET to `attendance.php` (this site's check-in page has no captcha and no Cloudflare check; the GET itself is the check-in), then go to `RETURN_TO` on success. The request has a timeout + auto-retry (8s, up to 3 tries by default), and a per-day `localStorage` flag backstops so it checks in at most once per day.
