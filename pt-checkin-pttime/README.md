中文 · [English](README.en.md)

# PT 签到 · PTtime

打开 [pttime.org](https://www.pttime.org/) 的任意页面时，自动完成每日签到（领魔力）：

- **未签到** → 自动签到，然后回到指定的成种页面并刷新（已经在该页就原地刷新）。
- **已签到** → 什么都不做，也不刷新。

## 安装

需先安装 [Tampermonkey](https://www.tampermonkey.net/)，然后 [点此安装脚本](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-pttime/pt-checkin-pttime.user.js)。

## 配置：签到后回到哪个页面

脚本顶部的 `RETURN_TO` 决定签到成功后停留 / 跳转到的页面：

```js
const RETURN_TO = 'https://www.pttime.org/adults.php?spstate=0&tags=&actor=&cat440=1&incldead=1&search=&search_area=1';
```

设为 `''`（空串）则只刷新触发签到的当前页面，不跳转。

## 原理

pttime.org 基于 NexusPHP，但签到入口是**带 `type` 参数的变体**：未签到时页面顶部有一个 `<a href="attendance.php?type=sign&uid=…">签到领魔力</a>`，签到后同一位置变成 `<a href="attendance.php?type=list">签到详情</a>`（`type` 从 `sign` 变成 `list`）。脚本据此判断——存在 `attendance.php?type=sign` 的链接就代表今天还没签 → 直接读取该链接的 `href`（含你自己的 `uid`）发一个带 cookie 的请求完成签到，成功后回到 `RETURN_TO`。请求带超时 + 自动重试（默认 8 秒、最多 3 次），网络卡顿更稳；另用一个「按天」的 `localStorage` 标记兜底，保证一天最多自动签一次。
