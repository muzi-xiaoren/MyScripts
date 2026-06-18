English · [中文](README.md)

# PT 签到 · QingwaPT

When you open the [QingwaPT](https://www.qingwapt.com/) homepage, it automatically does the daily tasks:

1. **Claim the daily gift** (bonus shop: exchange 1 蝌蚪 for 1000 蝌蚪)
2. **Post to the shoutbox** (optional, on by default) — sends one "蛙总，求上传" to the homepage group chat
3. **Check in** (签到)

Order is "claim + post first, check in last". **The check-in state is the daily switch**: on opening the homepage, if already checked in, it does nothing; otherwise it does the three tasks and returns to the homepage (where it's now checked in, so the next open is skipped).

## Install

Install [Tampermonkey](https://www.tampermonkey.net/) first, then [click here to install the script](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-qingwapt/pt-checkin-qingwapt.user.js).

## Config (top of the script)

```js
const RETURN_TO = 'https://www.qingwapt.com/index.php'; // page to land on when done; '' = just reload current page
const ENABLE_CHAT = true;        // <- task 3 toggle: true = on / false = off (shoutbox post)
const CHAT_MESSAGE = '蛙总，求上传';
const DAILY_GIFT_ID = 28;        // bonus-shop daily gift item id (the 9625378 shown in the UI is a display number)
```

**To disable the shoutbox post**, set `ENABLE_CHAT` to `false`.

> ⚠️ The shoutbox post is public. Private trackers are often sensitive to automated spam; this script limits it to at most once per day, but assess your own account risk and turn it off if needed.

## How it works (all three tasks hit the backend directly)

| Task | Endpoint |
|---|---|
| Check-in | `GET /attendance.php` (classic NexusPHP, idempotent) |
| Daily gift | `POST /api/bonus-shop/exchange`, FormData `id=28&amount=1`; returns `{"success":true}` / `{"success":false,"msg":"超过限购数量。"}` (already claimed) |
| Shoutbox | `GET /shoutbox.php?shbox_text=…&sent=yes&type=shoutbox` |

Check-in detection: when not checked in, the page header has `<a class="faqlink" href="attendance.php">[签到得蝌蚪]</a>`; after check-in that link loses its `faqlink` class (text becomes "签到已得…"). The script keys off whether that unsigned `faqlink` entry is present.
