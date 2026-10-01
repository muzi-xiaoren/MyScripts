中文 · [English](README.en.md)

# PT 签到 · VC-Lib

打开 [pt.vclib.online](https://pt.vclib.online/) 的任意页面时，自动完成每日签到（领魔力）：

- **未签到** → 自动带你到签到页 `attendance.php`，等站点的 Cloudflare 安全验证放行后提交签到，然后回到你原来所在的页面。
- **已签到** → 什么都不做，也不刷新。

## 安装

需先安装 [Tampermonkey](https://www.tampermonkey.net/)，然后 [点此安装脚本](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-vclib/pt-checkin-vclib.user.js)。

## 配置：签到后去哪

脚本顶部的 `RETURN_TO` 默认是空串 `''`，即回到被带去签到页之前你所在的那一页。想固定跳到某页就填上：

```js
const RETURN_TO = 'https://pt.vclib.online/torrents.php';
```

## 原理

未签到时页面顶部是 `<a class="faqlink" href="attendance.php">[签到得魔力]</a>`，签到后 `faqlink` class 被清空、文字变成「已签到…」。脚本据此判断今天签没签（靠结构不靠文字，各站文案不同）。

**为什么 1.x 失效了**：站点把签到页的图形验证码（`image.php` + `imagehash`）换成了 Cloudflare Turnstile。1.x 是在当前页弹出验证码、后台 POST 回去，而 Turnstile 的令牌只能由签到页上的组件当场发，那条路走不通了。

2.0 因此改成和 [pt-checkin-mua](../pt-checkin-mua) 一样，让浏览器真的走一遍签到页：

1. 在其它页面发现「未签到」→ 记下当前页，把浏览器带到 `attendance.php`。
2. 在签到页轮询站点表单里的 `cf-turnstile-response`，**等 Cloudflare 自己的组件在你的浏览器里把令牌发下来**，到手就提交站点原本的那个表单。脚本不参与验证本身：令牌在 `TOKEN_TIMEOUT`（默认 20 秒）内一直没来（说明 Cloudflare 要求人工交互），就什么都不做，把页面原样留给你自己勾选、点「立即签到」。
3. POST 成功后页面顶部横幅变成「已签到」，脚本据此确认成功 → 记下当天标记 → 回到原来那页（或 `RETURN_TO`）。

另外有两个兜底：按天的 `localStorage` 完成标记（一天只自动签一次），以及按天的尝试计数 `MAX_TRIES`（默认 3 次，令牌过期 / 提交失败时不会反复跳转）。
