English · [中文](README.md)

# PT Helper · tangpt

A daily-routine helper for [www.tangpt.top](https://www.tangpt.top/). **One toggle per step** — turning a step off makes the chain skip straight to the next one:

```js
const FEATURES = {
  mailClean: true,   // step 1: inbox cleanup
  lottery: true,     // step 2: 100-draw × 10 rounds + cumulative log
  task: true,        // step 3: claim a task
  checkin: true,     // step 4: daily check-in
  slot: true,        // step 5: slot machine spins
  home: true,        // step 6: back to the homepage
  redpacket: true,   // not a chain step: claim every available red packet whenever the homepage opens
};
```

Open any supported page and the script works through all six steps, hopping to the next step's page on its own (`CHAIN.enabled = false` disables the chaining and only runs the step belonging to the current page). Progress and results live in a side panel, persisted per day, surviving reloads.

On top of that, **every time the homepage opens** (whether or not the routine runs or today's check-in is done) it first claims every red packet the header banner offers, logging the count and bonus in the panel's 【红包】 block.

## What the six steps do

| Step | Page | Action |
| --- | --- | --- |
| Inbox | `messages.php` | Delete every read message plus unread ones whose subject starts with 「任务」; keep all other unread |
| Lottery | `omnibot_lottery.php` | Click the 100-draw button round after round, 10 rounds (1,000 draws) by default, accumulating the results |
| Task | `task.php` | Claim `VIP` on the last day of the month, otherwise `苍蝇腿`; the outcome stays in the panel's 【任务】 block |
| Check-in | `index.php` | Daily check-in for bonus points |
| Slot | `omnibot_slot.php` | Spin twice, logged in its own section |
| Home | `index.php` | Back to the homepage, routine done |

## What the panel records

Task, lottery, slot and red packets each get their own block. Bonus points are tracked as totals only, never per win:

```
【抽奖】
消耗魔力值：4,000,000
抽中魔力值：3,560,000点
折算魔力值：185,160
变化魔力值：+2,586,514.7

上传量：9GB
未发放补签卡，1 张补签卡全部折算 (当前上限 365 张) ×5
...

【老虎机】
开转次数：2（免费 1 次）
消耗魔力值：5,000
中奖魔力值：1,875
净变化：-3,125
```

`变化魔力值` is today's opening balance versus the current one, read off the header user bar rather than derived from the draws — so check-in, tasks and the slot machine all count towards it.

Prize lines accumulate by occurrence (a repeated sentence collapses into `×N`). **Undelivered medals get no line of their own**: their converted bonus already lands in `折算魔力值`, and listing every medal name only floods the panel.

Prize lines prefer the site's own `summary_entries` (`{key,label,amount,unit}`): when a quantity is available it renders as `name: qty unit (granted X, the rest converted to N bonus)`. **When no quantity can be derived** — converted prizes report `amount` 0 and keep the count only inside the sentence — **the site's own line is copied verbatim**, with duplicates collapsed into `×N`.

`复制` copies the whole record; `重置流程` clears today's progress and log (local only, the site is untouched).

The `–` in the title bar shrinks the panel into a small ball; click the ball to expand it again. Both the title bar and the ball can be dragged. Position and collapsed state are stored separately, survive across days, and `重置流程` does not clear them.

## Install

Install [Tampermonkey](https://www.tampermonkey.net/) first, then [click here to install the script](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-tangpt-helper/pt-tangpt-helper.user.js).

## Config

At the top of the script, besides `FEATURES`:

| Variable | Default | Meaning |
| --- | --- | --- |
| `CHAIN.enabled` | `true` | Whether to hop to the next step automatically |
| `CHAIN.requirePendingCheckin` | `true` | Only start the routine while the header still shows 「签到得魔力」 (i.e. today's check-in is still pending); if it's already done, nothing starts |
| `CHAIN.maxAttempts` | `2` | Per-step retry cap, so a failing step can't loop forever |
| `MAIL.unreadDeletePrefix` | `'任务'` | Unread messages are deleted only with this subject prefix |
| `LOTTERY.drawCount` | `100` | Which button to press (the site offers 1 / 10 / 20 / 50 / 100) |
| `LOTTERY.maxDrawsPerDay` | `10` | Rounds per day, i.e. at most `drawCount × this` draws. One 100-draw costs 2,000,000 bonus, so this cap is the footgun guard. If the site's own "draws left today" is lower, the site wins |
| `TASK.dailyName` / `monthlyName` | `'苍蝇腿'` / `'VIP'` | Matched against the task-name prefix |
| `SLOT.spins` | `2` | Slot machine spins |

## How it works

- **Inbox**: each row carries one `input[name="messages[]"]` (`value` is the message id); read/unread comes from the row's `img` `alt` (`Read`/`Unread` — `title` is the localized string and can't be trusted). Deleting POSTs `messages.php` with `action=moveordel` + `delete` + a batch of `messages[]`. **Pages are walked from the last one backwards**: deleting shifts later messages up, so walking forward would skip whole batches as they cross a page boundary.
- **Lottery / slot**: both are the site's own `$.post` calls. The script doesn't reimplement the requests — it taps `jQuery.post` and reads the responses, identifying them by fields (`results` + `draw_count` for the lottery, `reels` + `result` for the slot) rather than by URL. The lottery still goes through the site's own button.
  Between rounds it waits for the button to re-enable: after the response arrives the site plays a ~0.5s reveal animation with the button `disabled`, and a click during that sends nothing. 1.1.0 clicked once and marked the step done, which is why only 100 draws happened per day.
- **Task**: sent exactly like the site's own claim button — `POST ajax.php {action:'claimTask', params:{exam_id:<data-id>}}`, parsed as JSON, success means `ret === 0` — sidestepping the page's layui confirm dialog. 1.1.0 put `exam_id` at the top level and didn't parse JSON, so the server ignored it and the script couldn't read the result: it showed "submitted" every day without ever claiming.
- **Red packets**: the banner reads `GET /api/redpacket/latest` (packets still claimable) and the 「開」 button sends `POST /api/redpacket/claim {packet_id}`. The script calls those two endpoints directly instead of driving the modal; packets it can't get (all taken / already claimed) come back as errors and are skipped. On the homepage it claims first and only then continues the routine, so the routine's navigation can't cut it short.
- **Check-in**: on this site the check-in is just a GET to `attendance.php`, no captcha.

The gate governs *starting*, not *continuing*: step 4 removes that header link on success, so re-checking it on every page load would let the just-completed check-in block steps 5 and 6. Any routine that has already made progress today is therefore let through.
