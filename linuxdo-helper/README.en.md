[中文](README.md) · English

# LINUX DO Helper

A side panel for [linux.do](https://linux.do/) with two features, each with its own Start / Stop button. Both list URLs can be edited right in the panel and take effect on Save (stored locally, kept across days).

## Feature 1: auto-read

Default list: `https://linux.do/top`. After Start:

1. Go to the list page, pick the first topic from the top that hasn't been opened today, and click it.
2. Scroll the topic one screen at a time. **Before each scroll, wait until the small blue dots (unread markers) on the posts in view disappear.** A dot that stays for more than 20 s is treated as stuck and skipped.
3. When the bottom is reached and no more replies load for a few seconds, the topic counts as read; go back to the list and open the next one.
4. When every topic in the list has been opened (a few more pages are auto-loaded), stop.

Notes:

- The site only counts reading time **while the tab is in front and the browser window has focus**; otherwise the dots never clear. The script pauses when you switch away and resumes when you come back.
- Topics with more than 300 replies are skipped (`READ.maxReplies` at the top of the script).
- While running, if you navigate elsewhere yourself, the script won't drag you back; it resumes once you are on the list page again.

## Feature 2: red packets

Default list: `https://linux.do/c/credit/106/l/new?subset=topics` (积分乐园 · new topics), scanned every 60 s by default (editable next to the URL, minimum 20 s).

**Scans run on a timer**: once when any linux.do page opens or Start is clicked, then every interval (not triggered by topic updates). Each scan looks at the first 30 topics, skipping those with no new replies since the previous scan (topics with new replies, including the author adding packets, are re-read), **only at posts by the topic author** (raw markdown, so links hidden in `<!-- -->` comments are found too), and claims recognised packets via the `credit.linux.do` claim API. Handled forms:

| Form | Example |
| --- | --- |
| Plain link | `https://credit.linux.do/redenvelope/110243991475191808` |
| Hidden in a markdown comment | `<!-- https://credit.linux.do/redenvelope/… -->` |
| Letters posing as digits | `…/redenvelope/11o24…` (o/O→0, l/I→1) |
| Chinese numerals | `…/redenvelope/11021794257403904零` |
| base64 (whole link or just the id) | `aHR0cHM6Ly9jcmVkaXQubGludXguZG8v…` |
| base58 / hex / URL-encoding / reversed / ROT13 | decoded and searched again, up to 3 levels |

Puzzles (“replace X with the last digit of my name”, riddles, …) are **not guessed**; they are listed under “要手动解的” in the panel with a link to the topic. Password packets on `hb.unsnow.org` are not credit packets and are ignored.

Notes:

- Claims use your `credit.linux.do` session, which is separate from the forum's. **Log in once at [credit.linux.do](https://credit.linux.do) with LINUX DO first**; the panel tells you and pauses claiming if you're not logged in.
- On the first claim Tampermonkey asks whether to allow access to `credit.linux.do`; choose “Always allow”.
- Before claiming, the packet's detail is checked: empty, already claimed by you, or non-existent ids are never sent a claim.
- Packet ids that were claimed or definitively rejected (empty, already claimed) are remembered and never requested again; network errors are retried next round.
- With several linux.do tabs open, only one of them scans.

## Panel

- Drag by the title bar; “–” collapses it to a ball (click to expand), “×” hides it until reload; position and collapsed state are remembered.
- Each section shows its state and today's totals (topics read / packets claimed and LDC received).
- The bottom shows the latest 40 log lines. Daily data resets each day.
