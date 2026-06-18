中文 · [English](README.en.md)

# PTerClub 自动签到

打开 [PTerClub](https://pterclub.net/) 的任意页面时，自动完成每日签到（领猫粮）：

- **未签到** → 自动签到，然后回到种子页 `torrents.php?cat=403` 并刷新（已经在该页就原地刷新），让头部的猫粮余额 / 签到显示更新到最新。
- **已签到** → 什么都不做，也不刷新。

签到本身不会跳转页面（站点用的是对 `attendance-ajax.php` 的 AJAX 请求），脚本直接复用同一个接口，因此不依赖站点自身 JS 是否加载完成，更稳。

## 配置：签到后回到哪个页面

脚本顶部的 `RETURN_TO` 决定签到成功后停留 / 跳转到的页面：

```js
const RETURN_TO = 'https://pterclub.net/torrents.php?cat=403';
```

- 设为某个 URL（默认是种子页 `cat=403`）：签完就跳到这里；若签到本来就发生在该页，则原地刷新。这样无论在站内哪个页面触发签到，最终都会停在你想要的页面。
- 设为 `''`（空串）：只刷新触发签到的当前页面，不跳转。

## 安装

需先安装 [Tampermonkey](https://www.tampermonkey.net/)，然后 [点此安装脚本](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-pterclub/pt-checkin-pterclub.user.js)。

## 生效范围

任意 `https://pterclub.net/*` 页面。签到入口在每个页面顶部，所以无论先打开站内哪个页面都会触发；签完刷新会停留在当前页面。

> 只想在某个页面（例如种子页 `torrents.php`）生效的话，把脚本头部的
> `@match https://pterclub.net/*` 改成更窄的匹配即可。

## 原理

PTerClub 基于 NexusPHP，签到入口的 DOM 有两种形态：

| 状态 | DOM |
|---|---|
| 未签到 | `<a id="do-attendance" data-url="attendance-ajax.php">签到得猫粮</a>` |
| 已签到 | `<span id="attendance-wrap">(签到已得 N)</span>`，没有 `#do-attendance` |

脚本据此判断：页面上**有** `#do-attendance` 就代表今天还没签 → 对其 `data-url` 发一个带 cookie 的请求完成签到（接口返回 JSON：`status:"1"` 成功 / `status:"0"` 今天已签过），成功后刷新页面。另用一个「按天」的 `localStorage` 标记兜底，保证一天最多自动签一次，避免异常情况下反复刷新。
