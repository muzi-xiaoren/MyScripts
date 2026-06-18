English · [中文](README.md)

# PT 签到 · KamePT

Automatically does the daily check-in (签到, for magic/bonus points) whenever you open any [kamept.com](https://kamept.com/) page:

- **Not checked in yet** → check in, then go to `torrents.php?tag_id=10` and reload (or just reload if already there).
- **Already checked in** → do nothing, no reload.

## Install

Install [Tampermonkey](https://www.tampermonkey.net/) first, then [click here to install the script](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-kamept/pt-checkin-kamept.user.js).

## Config: which page to land on after check-in

The `RETURN_TO` constant at the top of the script controls where you end up after a successful check-in:

```js
const RETURN_TO = 'https://kamept.com/torrents.php?tag_id=10';
```

Set to `''` (empty string) to just reload the page that triggered the check-in, no navigation.

## How it works

kamept.com runs on NexusPHP (classic attendance): when not checked in, the page header has `<a class="faqlink" href="attendance.php">[签到得魔力]</a>`; after check-in that link loses its `faqlink` class and the text becomes "签到已得…" (note: not "已签到", which is why the script keys off the `faqlink` structure rather than the text). The script keys off that — if `a.faqlink[href*=attendance.php]` is present, today's check-in is still pending → send a credentialed request to `attendance.php`, then go to `RETURN_TO` on success. A per-day `localStorage` flag backstops so it checks in at most once per day.
