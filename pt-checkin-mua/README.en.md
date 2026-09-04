English · [中文](README.md)

# PT 签到 · Mua

Automatically does the daily check-in (签到, for magic/bonus points) whenever you open any [mua.xloli.cc](https://mua.xloli.cc/) page:

- **Not checked in yet** → take you to the check-in page `attendance.php`, submit the check-in once the site's Cloudflare security check clears, then go to `special.php`.
- **Already checked in** → do nothing, no reload.

## Install

Install [Tampermonkey](https://www.tampermonkey.net/) first, then [click here to install the script](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-mua/pt-checkin-mua.user.js).

## Config: which page to land on after check-in

The `RETURN_TO` constant at the top of the script controls where you end up after a successful check-in:

```js
const RETURN_TO = 'https://mua.xloli.cc/special.php';
```

Set to `''` (empty string) to just reload the check-in page, no navigation.

## How it works

mua.xloli.cc runs on NexusPHP (classic attendance): when not checked in, the page header has `<a class="faqlink" href="attendance.php">[今日签到，得到魔力加成]</a>`; after check-in that link loses its `faqlink` class and the text becomes "已签到…". The script keys off that — if `a.faqlink[href*=attendance.php]` is present, today's check-in is still pending.

**Why 1.x stopped working**: the site added a Cloudflare Turnstile security check to the check-in page. Checking in is now three steps — open `attendance.php` → Turnstile writes a token into the hidden `cf-turnstile-response` field → POST the form with that token — whereas 1.x only sent a GET to `attendance.php`, which just returns the verification page and credits nothing.

So 2.0 makes the browser actually walk through the check-in page:

1. On any other page, if the check-in is pending → navigate to `attendance.php` (no more background fetch).
2. On the check-in page, poll the site's own form for `cf-turnstile-response` and **wait for Cloudflare's own widget to issue the token in your browser**, then submit the site's own form. The script takes no part in the verification itself: if no token arrives within `TOKEN_TIMEOUT` (20s by default) — meaning Cloudflare wants human interaction — it does nothing and leaves the page as-is for you to click "立即签到" yourself.
3. After a successful POST the header banner flips to "已签到", which the script reads as confirmation → records today's flag → goes to `RETURN_TO`.

Two backstops: a per-day `localStorage` completion flag (at most one automatic check-in per day), and a per-day attempt counter `MAX_TRIES` (3 by default, so an expired token or a failed submit can't cause repeated navigation).
