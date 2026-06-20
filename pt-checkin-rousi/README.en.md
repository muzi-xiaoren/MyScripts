English · [中文](README.md)

# PT 签到 · Rousi

Automatically does the daily check-in whenever you open any [rousi.pro](https://rousi.pro/) page:

- **Not checked in yet** → click check-in, and once it's confirmed, go to the configured torrents list page and reload (or just reload if already there).
- **Already checked in** → do nothing, no reload.

## Install

Install [Tampermonkey](https://www.tampermonkey.net/) first, then [click here to install the script](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-rousi/pt-checkin-rousi.user.js).

## Config: which page to land on after check-in

The `RETURN_TO` constant at the top of the script controls where you end up after a successful check-in:

```js
const RETURN_TO = 'https://rousi.pro/list?category=9kg&page=0';
```

Set to `''` (empty string) to just reload the page that triggered the check-in, no navigation.

## How it works

Rousi is not NexusPHP — it's a custom React single-page app, and the check-in entry is a button in the nav bar: its text is "签到" when pending and "已签到" once done. Its API requires the app's own auth token (a plain cookie-credentialed request is rejected as "登录状态无效" / invalid login), so the script does **not** call the API directly — it simulates a click on that button and lets the app issue its own authenticated request, which is the most robust approach.

Because it's a SPA and the button may render after the script runs, the script uses a `MutationObserver` to wait for the button (up to 15s):

- If the button reads "已签到" → do nothing.
- If it reads "签到" → click it, then wait for the button to turn "已签到" to **confirm success** (up to 8s), then go to `RETURN_TO`. If success isn't confirmed, it doesn't flag or navigate — the next page open retries.

A per-day `localStorage` flag backstops so it checks in at most once per day.
