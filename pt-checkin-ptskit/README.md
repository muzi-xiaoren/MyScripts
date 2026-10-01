中文 · [English](README.en.md)

# PT 签到 · PTSKit

打开 [www.ptskit.org](https://www.ptskit.org/)（拾刻）的任意页面时，自动完成每日签到（领魔力）：

- **未签到** → 自动签到，然后回到 `torrents.php?tag_id=238`（「PTS官方」标签）并刷新（已经在该页就原地刷新）。
- **已签到** → 什么都不做，也不刷新。

## 安装

需先安装 [Tampermonkey](https://www.tampermonkey.net/)，然后 [点此安装脚本](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-ptskit/pt-checkin-ptskit.user.js)。

## 配置：签到后回到哪个页面

脚本顶部的 `RETURN_TO` 决定签到成功后停留 / 跳转到的页面：

```js
const RETURN_TO = 'https://www.ptskit.org/torrents.php?tag_id=238';
```

设为 `''`（空串）则只刷新触发签到的当前页面，不跳转。

## 原理

拾刻基于 NexusPHP（经典签到）：未签到时页面顶部有一个 `<a class="faqlink" href="attendance.php">[签到得魔力]</a>`，签到后该链接的 `faqlink` class 被清空、文字变成「[签到已得N, 补签卡: N]」。脚本据此判断——存在 `a.faqlink[href*=attendance.php]` 就代表今天还没签 → 对 `attendance.php` 发一个带 cookie 的 GET 完成签到（这个站签到页没有验证码，也没有 Cloudflare 验证，GET 一下就算签到），成功后回到 `RETURN_TO`。请求带超时 + 自动重试（默认 8 秒、最多 3 次）；另用一个「按天」的 `localStorage` 标记兜底，保证一天最多自动签一次。
