English · [中文](README.md)

# PT 签到 · BitPorn

When you open [bitporn.eu](https://bitporn.eu/), it automatically claims **today's** reward (BON points) from the current month's "Daily Reward / Napi jutalom" calendar:

- **Not claimed today** → claim it, then go to `/trending`.
- **Already claimed today** → do nothing, go to `/trending`.

> Triggered by opening `/trending` or any `/events/<id>` page; the script figures out the current month's event page, claims, and brings you back to `/trending`.

## Install

Install [Tampermonkey](https://www.tampermonkey.net/) first, then [click here to install the script](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-bitporn/pt-checkin-bitporn.user.js).

## Config

```js
const RETURN_TO = 'https://bitporn.eu/trending'; // where to land after claiming
const BASE_ID = 11;     // anchor event id
const BASE_YEAR = 2026; // anchor year
const BASE_MONTH = 6;   // anchor month (1-12)
```

- `RETURN_TO`: the page to return to after claiming.
- **The monthly event id is computed**: `id = BASE_ID + (year - BASE_YEAR)*12 + (month - BASE_MONTH)`. The anchor is "June 2026 = event 11", and it goes +1 each month (Jul = 12, Aug = 13, …).

## How it works

BitPorn runs on UNIT3D (Laravel), so check-in isn't the NexusPHP kind — it's a **monthly "Daily Reward" calendar event**: `/events/<id>` lists every day of the month (Jun 1, Jun 2, …), and **only today's card** renders a Claim button (inside `<form action="/events/<id>/claims" method="POST">`, with Laravel's `_token`).

Script flow:

1. Compute the current month's event id with the formula above.
2. On a non-event page like `/trending` → redirect to `/events/<id>`.
3. On `/events/<id>`:
   - Claim form present → submit it via its FormData (which carries `_token`) as `POST /events/<id>/claims` (with timeout + auto-retry), then go to `/trending`.
   - No claim form → already claimed today (or nothing today) → go to `/trending`.

"Is there a claim form" == "can I still claim today"; it only appears on the current month's event page and only on the current day, so even if the id is off it won't mis-claim (at worst it just doesn't claim). A per-day `localStorage` flag backstops so it claims at most once per day and never bounces repeatedly.

> ⚠️ If BitPorn ever inserts other events and breaks the "+1 per month" rule (some month you open it and nothing gets claimed, the page month doesn't match), update `BASE_ID`/`BASE_YEAR`/`BASE_MONTH` at the top of the script to the correct mapping for that month.
