中文 · [English](README.en.md)

# PT 签到 · Rousi

打开 [rousi.pro](https://rousi.pro/) 的任意页面时，自动完成每日签到：

- **未签到** → 自动点签到，确认成功后回到指定的种子列表页并刷新（已经在该页就原地刷新）。
- **已签到** → 什么都不做，也不刷新。

## 安装

需先安装 [Tampermonkey](https://www.tampermonkey.net/)，然后 [点此安装脚本](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-rousi/pt-checkin-rousi.user.js)。

## 配置：签到后回到哪个页面

脚本顶部的 `RETURN_TO` 决定签到成功后停留 / 跳转到的页面：

```js
const RETURN_TO = 'https://rousi.pro/list?category=9kg&page=0';
```

设为 `''`（空串）则只刷新触发签到的当前页面，不跳转。

## 原理

Rousi 不是 NexusPHP，而是自研的 React 单页应用，签到入口是导航栏里的一个按钮：未签到时文字是「签到」、签到后变成「已签到」。它的接口需要应用自带的鉴权 token（直接用 cookie 发请求会被判「登录状态无效」），所以脚本不直接发接口，而是**模拟点击那个签到按钮**、让应用自己发带鉴权的请求，最稳。

因为是单页应用、按钮可能在脚本运行之后才渲染出来，脚本用 `MutationObserver` 等按钮出现（最多 15 秒）：

- 取到的按钮是「已签到」→ 什么都不做。
- 是「签到」→ 点击它，再等按钮变成「已签到」以**确认签到成功**（最多 8 秒），然后回到 `RETURN_TO`。没确认成功就不标记、不跳，下次打开页面再试。

另用一个「按天」的 `localStorage` 标记兜底，保证一天最多自动签一次。
