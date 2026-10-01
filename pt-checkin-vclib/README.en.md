English · [中文](README.md)

# PT 签到 · VC-Lib

Automatically does the daily check-in (签到, for magic/bonus points) whenever you open any [pt.vclib.online](https://pt.vclib.online/) page:

- **Not checked in yet** → take you to the check-in page `attendance.php`, submit the check-in once the site's Cloudflare security check clears, then bring you back to the page you were on.
- **Already checked in** → do nothing, no reload.

## Install

Install [Tampermonkey](https://www.tampermonkey.net/) first, then [click here to install the script](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-vclib/pt-checkin-vclib.user.js).

## Config: where to go after check-in

`RETURN_TO` at the top of the script defaults to `''`, meaning go back to the page you were on before being taken to the check-in page. Set it to land somewhere fixed instead:

```js
const RETURN_TO = 'https://pt.vclib.online/torrents.php';
```

## How it works

When the check-in is pending, the page header has `<a class="faqlink" href="attendance.php">[签到得魔力]</a>`; after checking in, that link loses its `faqlink` class and the text becomes "已签到…". The script keys off that structure rather than the wording (which differs per site).

**Why 1.x stopped working**: the site replaced the check-in page's image captcha (`image.php` + `imagehash`) with Cloudflare Turnstile. 1.x showed the captcha on the page you were on and POSTed it back in the background, but a Turnstile token can only be issued by the widget on the check-in page itself, so that route is gone.

2.0 therefore works like [pt-checkin-mua](../pt-checkin-mua) and makes the browser actually walk through the check-in page:

1. On any other page, if the check-in is pending → remember the current page and navigate to `attendance.php`.
2. On the check-in page, poll the site's own form for `cf-turnstile-response` and **wait for Cloudflare's own widget to issue the token in your browser**, then submit the site's own form. The script takes no part in the verification itself: if no token arrives within `TOKEN_TIMEOUT` (20s by default) — meaning Cloudflare wants human interaction — it does nothing and leaves the page as-is for you to tick the box and click "立即签到" yourself.
3. After a successful POST the header banner flips to "已签到", which the script reads as confirmation → records today's flag → goes back to the page you came from (or `RETURN_TO`).

Two backstops: a per-day `localStorage` completion flag (at most one automatic check-in per day), and a per-day attempt counter `MAX_TRIES` (3 by default, so an expired token or a failed submit can't cause repeated navigation).
