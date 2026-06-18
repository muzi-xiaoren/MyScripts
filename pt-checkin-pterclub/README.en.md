English · [中文](README.md)

# PTerClub Auto Attendance

Automatically does the daily check-in (签到 / "claim cat food") whenever you open any [PTerClub](https://pterclub.net/) page:

- **Not checked in yet** → check in, then go to the torrents page `torrents.php?cat=403` and reload (or just reload if already there), so the header (cat-food balance / attendance display) updates.
- **Already checked in** → do nothing, no reload.

Check-in does not navigate away (the site uses an AJAX request to `attendance-ajax.php`); the script reuses that same endpoint, so it does not depend on the site's own JS having finished loading.

## Config: which page to land on after check-in

The `RETURN_TO` constant at the top of the script controls where you end up after a successful check-in:

```js
const RETURN_TO = 'https://pterclub.net/torrents.php?cat=403';
```

- Set to a URL (defaults to the `cat=403` torrents page): after checking in, navigate there; if the check-in happened on that page already, just reload. This guarantees you always end up on your preferred page no matter where the check-in fired.
- Set to `''` (empty string): only reload the page that triggered the check-in, no navigation.

## Install

Install [Tampermonkey](https://www.tampermonkey.net/) first, then [click here to install the script](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-pterclub/pt-checkin-pterclub.user.js).

## Scope

Any `https://pterclub.net/*` page. The check-in entry lives in the header of every page, so it triggers no matter which page you open first; after checking in, the reload keeps you on the current page.

> To restrict it to a single page (e.g. the torrents page `torrents.php`), change
> `@match https://pterclub.net/*` in the script header to a narrower pattern.

## How it works

PTerClub runs on NexusPHP, whose check-in entry renders in one of two shapes:

| State | DOM |
|---|---|
| Not checked in | `<a id="do-attendance" data-url="attendance-ajax.php">签到得猫粮</a>` |
| Checked in | `<span id="attendance-wrap">(签到已得 N)</span>`, no `#do-attendance` |

So the script keys off it: if `#do-attendance` **is present**, today's check-in is still pending → send a credentialed request to its `data-url` (the endpoint returns JSON: `status:"1"` success / `status:"0"` already done today), then reload on success. A per-day `localStorage` flag is used as a backstop so it checks in at most once per day, preventing a reload loop in edge cases.
