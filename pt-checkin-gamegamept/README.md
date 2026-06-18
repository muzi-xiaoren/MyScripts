中文 · [English](README.en.md)

# PT 签到 · GGPT

打开 [gamegamept.com](https://www.gamegamept.com/)（GGPT）的任意页面时，自动完成每日签到（领 G 值）：

- **未签到** → 自动签到，然后原地刷新当前页面。
- **已签到** → 什么都不做，也不刷新。

## 安装

需先安装 [Tampermonkey](https://www.tampermonkey.net/)，然后 [点此安装脚本](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-gamegamept/pt-checkin-gamegamept.user.js)。

## 配置：签到后回到哪个页面

本站签到后无特定返回页，脚本顶部 `RETURN_TO` 默认留空（只刷新触发签到的当前页）：

```js
const RETURN_TO = '';
```

若想签到后跳到某个固定页面，把它设成对应 URL 即可，例如 `'https://www.gamegamept.com/index.php'`。

## 原理

gamegamept.com 基于 NexusPHP（经典 faqlink 签到）：未签到时页面顶部有一个 `<a class="faqlink" href="attendance.php">[签到得G值]</a>`，签到后该链接的 `faqlink` class 被清空、文字变成「签到已得…」（注意不是「已签到」，所以脚本靠 `faqlink` 结构判断而非文字）。脚本据此判断——存在 `a.faqlink[href*=attendance.php]` 就代表今天还没签 → 对 `attendance.php` 发一个带 cookie 的请求完成签到，成功后回到 `RETURN_TO`（留空即原地刷新）。请求带超时 + 自动重试（默认 8 秒、最多 3 次），网络卡顿更稳；另用一个「按天」的 `localStorage` 标记兜底，保证一天最多自动签一次。
