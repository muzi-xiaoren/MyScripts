中文 · [English](README.en.md)

# PT 签到 · KamePT

打开 [kamept.com](https://kamept.com/) 的任意页面时，自动完成每日签到（领魔力）：

- **未签到** → 自动签到，然后回到 `torrents.php?tag_id=10` 并刷新（已经在该页就原地刷新）。
- **已签到** → 什么都不做，也不刷新。

## 安装

需先安装 [Tampermonkey](https://www.tampermonkey.net/)，然后 [点此安装脚本](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-kamept/pt-checkin-kamept.user.js)。

## 配置：签到后回到哪个页面

脚本顶部的 `RETURN_TO` 决定签到成功后停留 / 跳转到的页面：

```js
const RETURN_TO = 'https://kamept.com/torrents.php?tag_id=10';
```

设为 `''`（空串）则只刷新触发签到的当前页面，不跳转。

## 原理

kamept.com 基于 NexusPHP（经典签到）：未签到时页面顶部有一个 `<a class="faqlink" href="attendance.php">[签到得魔力]</a>`，签到后该链接的 `faqlink` class 被清空、文字变成「签到已得…」（注意不是「已签到」，所以脚本靠 `faqlink` 结构判断而非文字）。脚本据此判断——存在 `a.faqlink[href*=attendance.php]` 就代表今天还没签 → 对 `attendance.php` 发一个带 cookie 的请求完成签到，成功后回到 `RETURN_TO`。另用一个「按天」的 `localStorage` 标记兜底，保证一天最多自动签一次。
