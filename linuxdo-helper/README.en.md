[中文](README.md) · English

# LINUX DO Helper

A side panel for [linux.do](https://linux.do/) with two features, each with its own Start / Stop button. Both list URLs can be edited right in the panel and take effect on Save (stored locally, kept across days).

## Feature 1: auto-read

Default list: `https://linux.do/top`. After Start:

1. Go to the list page, pick the first topic from the top that hasn't been opened today, and click it.
2. Scroll the topic one screen at a time. **Before each scroll, wait until the small blue dots (unread markers) on the posts in view disappear.** Each screen waits at most 14 s for its dots.
3. When the bottom is reached and no more replies load for a few seconds, the topic counts as read; rest 6–25 s, then go back to the list in-page (no full reload) and open the next one.
4. When every topic in the list has been opened (a few more pages are auto-loaded), stop.

Notes:

- The site only counts reading time **while the page is visible**; window focus doesn't matter, so a browser window left visible (e.g. on a second screen) keeps counting while you use other apps. When the tab is switched away, minimised or fully covered, the dots never clear; the script pauses and resumes once the page is visible again.
- The site stops counting after 3 minutes without a scroll, and doesn't count freshly loaded posts until the next scroll, so while waiting for dots the script nudges the page by 1 px every 3 s to restart the timer.
- How far each scroll goes, how long it pauses and how long it rests between topics are all random, with an occasional longer pause: a perfectly regular rhythm with back-to-back requests is what Cloudflare most readily flags as a bot.
- Occasionally a reading upload is rejected (e.g. a Cloudflare 403) and the site waits 60 s before reporting those posts again. When a screen hasn't cleared after 9 s, and before leaving a topic, the script asks the site to report right away (real time on screen) and waits up to 7 s for it to finish.
- Cloudflare sometimes blocks a single list or topic load, leaving the page empty. That doesn't count as read: the script retries after 20 s, doubling the wait on each further failure (up to 3 min), and skips a topic that fails to open twice. After 3 failures in a row it's most likely waiting for a human check, so the script pauses and tells you: reload the page, pass the check, and it carries on by itself.
- Topics with more replies than the limit are skipped (logged as “刷帖跳过（回复太多）”). Set the limit in the number box next to the auto-read URL in the panel (default 300, 0 = no limit) and click Save.
- While running, if you navigate elsewhere yourself, the script won't drag you back; it resumes once you are on the list page again.

## Feature 2: red packets

Default list: `https://linux.do/c/credit/106/l/new?subset=topics` (积分乐园 · new topics), scanned every 60 s by default (editable next to the URL, minimum 20 s).

**When it scans**:

- **Immediately on new topics**: the blue “查看 N 个新的或更新的话题” bar on list pages is drawn by the site when it receives a live push. The script subscribes to the same push, so with **any** linux.do page open (not only the 积分乐园 list) a new topic is checked right away. A push less than 15 s after the previous scan waits until 15 s have passed, and pushes arriving meanwhile are merged into one scan.
- **Timer fallback**: every interval, in case the push connection drops. Opening a page doesn't trigger a scan; clicking Start or Save scans right away.

Each scan looks at the first 30 topics that **haven't been checked yet**; **every topic is checked once, and only the topic author's posts** (raw markdown, so links hidden in `<!-- -->` comments are found too). New replies or bumps never make a checked topic be checked again. Recognised packets are claimed via the `credit.linux.do` claim API. Handled forms:

| Form | Example |
| --- | --- |
| Plain link | `https://credit.linux.do/redenvelope/110243991475191808` |
| Hidden in a markdown comment | `<!-- https://credit.linux.do/redenvelope/… -->` |
| Letters posing as digits | `…/redenvelope/11o24…` (o/O→0, l/I→1) |
| Chinese numerals | `…/redenvelope/11021794257403904零` |
| base64 (whole link or just the id) | `aHR0cHM6Ly9jcmVkaXQubGludXguZG8v…` |
| base58 / hex / URL-encoding / reversed / ROT13 | decoded and searched again, up to 3 levels |

Puzzles (“replace X with the last digit of my name”, riddles, …) are **not guessed**; they are listed under “要手动解的” in the panel with a link to the topic; click the ✓ next to one once you’ve handled it and it stays hidden (also on later days). Password packets on `hb.unsnow.org` are not credit packets and are ignored.

Notes:

- Claims use your `credit.linux.do` session, which is separate from the forum's. **Log in once at [credit.linux.do](https://credit.linux.do) with LINUX DO first**; the panel tells you and pauses claiming if you're not logged in.
- On the first claim Tampermonkey asks whether to allow access to `credit.linux.do`; choose “Always allow”.
- Before claiming, the packet's detail is checked: empty, already claimed by you, or non-existent ids are never sent a claim.
- Packet ids that were claimed or definitively rejected (empty, already claimed) are remembered and never requested again; network errors are retried next round.
- Each scan checks at most 5 new topics and leaves the rest for the next one, with 1.5–2.5 s (random) between requests. If the site blocks a request (403 / 429), the scan stops and waits 1 min, doubling on each further block (up to 10 min).
- A topic whose packet couldn't be claimed because credit isn't logged in or the network failed isn't marked as checked and is retried next scan.
- With several linux.do tabs open, only one of them scans.

## Panel

- Drag by the title bar; “–” collapses it to a ball (click to expand), “×” hides it until reload; position and collapsed state are remembered.
- Each section shows its state and today's totals (topics read / packets claimed and LDC received).
- The bottom shows the latest 40 log lines. Daily data resets each day.
