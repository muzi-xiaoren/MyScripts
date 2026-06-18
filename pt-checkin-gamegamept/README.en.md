English · [中文](README.md)

# PT 签到 · GGPT

Automatically does the daily check-in (签到, for G points) whenever you open any [gamegamept.com](https://www.gamegamept.com/) (GGPT) page:

- **Not checked in yet** → check in, then reload the current page in place.
- **Already checked in** → do nothing, no reload.

## Install

Install [Tampermonkey](https://www.tampermonkey.net/) first, then [click here to install the script](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-gamegamept/pt-checkin-gamegamept.user.js).

## Config: which page to land on after check-in

This site has no specific landing page, so the `RETURN_TO` constant at the top of the script is empty by default (just reloads the page that triggered the check-in):

```js
const RETURN_TO = '';
```

Set it to a URL if you want to jump somewhere fixed after check-in, e.g. `'https://www.gamegamept.com/index.php'`.

## How it works

gamegamept.com runs on NexusPHP (classic faqlink attendance): when not checked in, the page header has `<a class="faqlink" href="attendance.php">[签到得G值]</a>`; after check-in that link loses its `faqlink` class and the text becomes "签到已得…" (note: not "已签到", which is why the script keys off the `faqlink` structure rather than the text). The script keys off that — if `a.faqlink[href*=attendance.php]` is present, today's check-in is still pending → send a credentialed request to `attendance.php`, then go to `RETURN_TO` on success (empty = reload in place). The request has a timeout + auto-retry (8s, up to 3 tries by default) for flaky networks, and a per-day `localStorage` flag backstops so it checks in at most once per day.
