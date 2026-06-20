中文 · [English](README.en.md)

# PT 签到 · BitPorn

打开 [bitporn.eu](https://bitporn.eu/) 时，自动领取当月「Daily Reward / Napi jutalom」签到日历里**今天**那一格的奖励（BON 积分）：

- **今天还没领** → 自动领取，然后回到 `/trending`。
- **今天已领** → 什么都不做，回到 `/trending`。

> 打开 `/trending` 或任意 `/events/<id>` 页面都会触发；脚本会自己算出当月事件页、领完把你带回 `/trending`。

## 安装

需先安装 [Tampermonkey](https://www.tampermonkey.net/)，然后 [点此安装脚本](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-bitporn/pt-checkin-bitporn.user.js)。

## 配置

```js
const RETURN_TO = 'https://bitporn.eu/trending'; // 领完回到的页面
const BASE_ID = 11;     // 基准事件 id
const BASE_YEAR = 2026; // 基准年
const BASE_MONTH = 6;   // 基准月（1-12）
```

- `RETURN_TO`：领取后回到的页面。
- **当月事件 id 是算出来的**：`id = BASE_ID + (当前年-BASE_YEAR)*12 + (当前月-BASE_MONTH)`。基准是「2026 年 6 月 = 事件 11」，之后每个月 +1（7 月=12、8 月=13……）。

## 原理

BitPorn 是 UNIT3D（Laravel）站，签到不是 NexusPHP 那种，而是一个**每月一个的「Daily Reward」日历事件**：`/events/<id>` 页面列出当月每一天（Jun 1、Jun 2…），其中**只有「今天」那张卡**会渲染一个 Claim 按钮（在 `<form action="/events/<id>/claims" method="POST">` 里，含 Laravel 的 `_token`）。

脚本流程：

1. 按上面的公式算出当月事件 id。
2. 在 `/trending` 等非事件页 → 跳到 `/events/<id>`。
3. 在 `/events/<id>`：
   - 有 Claim 表单 → 用它的 FormData（自带 `_token`）发 `POST /events/<id>/claims` 完成领取（带超时 + 自动重试），然后回 `/trending`。
   - 没有 Claim 表单 → 今天已领（或该页今天无奖励）→ 回 `/trending`。

「有没有 Claim 表单」== 今天还能不能领；它**只在当月事件页 + 当天**出现，所以即使 id 算偏了也不会误领（顶多是没领到）。另用一个「按天」的 `localStorage` 标记兜底，保证一天最多自动领一次、不会反复跳转。

> ⚠️ 若 BitPorn 中途插入了别的事件、导致「每月 +1」不再成立（某月打开后没领到、页面月份对不上），把脚本顶部的 `BASE_ID`/`BASE_YEAR`/`BASE_MONTH` 改成当月正确的对应关系即可。
