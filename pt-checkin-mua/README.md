中文 · [English](README.en.md)

# PT 签到 · Mua

打开 [mua.xloli.cc](https://mua.xloli.cc/) 的任意页面时，自动完成每日签到（领魔力）：

- **未签到** → 自动带你到签到页 `attendance.php`，等站点的 Cloudflare 安全验证放行后提交签到，然后回到 `special.php`。
- **已签到** → 什么都不做，也不刷新。

## 安装

需先安装 [Tampermonkey](https://www.tampermonkey.net/)，然后 [点此安装脚本](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-mua/pt-checkin-mua.user.js)。

## 配置：签到后回到哪个页面

脚本顶部的 `RETURN_TO` 决定签到成功后停留 / 跳转到的页面：

```js
const RETURN_TO = 'https://mua.xloli.cc/special.php';
```

设为 `''`（空串）则只刷新签到页，不跳转。

## 原理

mua.xloli.cc 基于 NexusPHP（经典签到）：未签到时页面顶部有一个 `<a class="faqlink" href="attendance.php">[今日签到，得到魔力加成]</a>`，签到后该链接的 `faqlink` class 被清空、文字变成「已签到…」。脚本据此判断今天签没签——存在 `a.faqlink[href*=attendance.php]` 就代表还没签。

**为什么 1.x 失效了**：站点给签到页加上了 Cloudflare Turnstile 安全验证。签到现在是「打开 `attendance.php` → Turnstile 把令牌写进隐藏域 `cf-turnstile-response` → 带着令牌 POST 表单」三步，而 1.x 只是对 `attendance.php` 发一个 GET —— 拿回来的只是一张验证页面，签到根本没生效。

2.0 因此改成让浏览器真的走一遍签到页：

1. 在其它页面发现「未签到」→ 把浏览器带到 `attendance.php`（不再后台 fetch）。
2. 在签到页轮询站点表单里的 `cf-turnstile-response`，**等 Cloudflare 自己的组件在你的浏览器里把令牌发下来**，到手就提交站点原本的那个表单。脚本不参与验证本身：令牌在 `TOKEN_TIMEOUT`（默认 20 秒）内一直没来（说明 Cloudflare 要求人工交互），就什么都不做，把页面原样留给你自己点「立即签到」。
3. POST 成功后页面顶部横幅变成「已签到」，脚本据此确认成功 → 记下当天标记 → 回到 `RETURN_TO`。

另外有两个兜底：按天的 `localStorage` 完成标记（一天只自动签一次），以及按天的尝试计数 `MAX_TRIES`（默认 3 次，令牌过期 / 提交失败时不会反复跳转）。
