// ==UserScript==
// @name         PT 签到 · PTerClub
// @namespace    https://github.com/muzi-xiaoren/MyScripts
// @version      1.0.0
// @description  打开 PTerClub 时自动检测签到状态：未签到就签到并刷新页面，已签到则什么都不做。
// @author       muzi-xiaoren
// @match        https://pterclub.net/*
// @run-at       document-end
// @grant        none
// @homepageURL  https://github.com/muzi-xiaoren/MyScripts
// @supportURL   https://github.com/muzi-xiaoren/MyScripts/issues
// @downloadURL  https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-pterclub/pt-checkin-pterclub.user.js
// @updateURL    https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-pterclub/pt-checkin-pterclub.user.js
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  // 【配置】签到成功后停留 / 跳转到的页面。
  //   - 设为某个 URL：签完就跳到这里（已经在该页则直接刷新）——保证最终停在你想要的页面。
  //   - 设为 ''（空串）：只刷新触发签到的当前页面，不跳转。
  const RETURN_TO = 'https://pterclub.net/torrents.php?cat=403';

  // PTerClub（NexusPHP）的签到入口在每个页面顶部：
  //   未签到：<a id="do-attendance" data-url="attendance-ajax.php">签到得猫粮</a>
  //   已签到：<span id="attendance-wrap">(签到已得 N)</span>，没有 #do-attendance
  // 所以「页面上有没有 #do-attendance」就等于「今天还没签到」。
  const link = document.querySelector('#do-attendance');
  if (!link) return; // 已签到（或当前页没有签到入口）→ 什么都不做，也不刷新

  const dataUrl = link.getAttribute('data-url') || 'attendance-ajax.php';

  // 兜底：万一签到成功后页面仍渲染出 #do-attendance（缓存 / 同步延迟），
  // 用「按天」标记保证一天最多自动签一次，避免 fetch + reload 死循环。
  const today = new Date().toLocaleDateString('en-CA'); // 本地时区 YYYY-MM-DD
  if (localStorage.getItem('mzx-pter-attendance') === today) return;

  // 签到 = 对 data-url 发一个带 cookie 的请求（等价于点击「签到得猫粮」，但不依赖站点自身 JS）。
  // 返回 JSON：{"status":"1",...} 成功 /{"status":"0",...} 今天已签过——两种都说明已是已签到态。
  // 成功后：若已在 RETURN_TO 页面（或未配置）就刷新；否则跳到 RETURN_TO（跳转本身就是一次新加载）。
  // 仅网络 / HTTP 出错时不动，留到下次再试。
  fetch(dataUrl, { credentials: 'same-origin' })
    .then((r) => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      localStorage.setItem('mzx-pter-attendance', today);
      const here = location.href.replace(/#.*$/, '');
      if (RETURN_TO && here !== RETURN_TO) {
        location.href = RETURN_TO; // 回到目标页面（例如种子页 cat=403）
      } else {
        location.reload(); // 已在目标页 → 原地刷新
      }
    })
    .catch(() => {
      /* 网络异常：不写标记、不刷新，下次打开页面再试 */
    });
})();
