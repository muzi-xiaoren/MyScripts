// ==UserScript==
// @name         PT 签到 · KamePT
// @namespace    https://github.com/muzi-xiaoren/MyScripts
// @version      1.0.0
// @description  打开 kamept.com 时自动检测签到状态：未签到就签到并回到指定页面，已签到则什么都不做。
// @author       muzi-xiaoren
// @match        https://kamept.com/*
// @run-at       document-end
// @grant        none
// @homepageURL  https://github.com/muzi-xiaoren/MyScripts
// @supportURL   https://github.com/muzi-xiaoren/MyScripts/issues
// @downloadURL  https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-kamept/pt-checkin-kamept.user.js
// @updateURL    https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-kamept/pt-checkin-kamept.user.js
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  // 【配置】签到成功后停留 / 跳转到的页面。留空 '' 则只刷新触发签到的当前页。
  const RETURN_TO = 'https://kamept.com/torrents.php?tag_id=10';

  // NexusPHP 有两种签到入口：
  //   ① AJAX 变体（如 PTerClub）：未签 <a id="do-attendance" data-url="attendance-ajax.php">；已签后该节点消失。
  //   ② 经典变体（如 Mua / KamePT）：未签 <a class="faqlink" href="attendance.php">[…签到…]</a>；
  //      已签后变成无 faqlink 的纯文本链接（class 被清空）。注意各站「已签」文字不同
  //      （mua 是「已签到」、kamept 是「签到已得」），所以靠 faqlink 结构判断而非文字。
  // 取到「未签入口」就签，取不到（已签 / 无入口）就什么都不做。
  const ajaxLink = document.querySelector('#do-attendance');
  const classicLink = document.querySelector('a.faqlink[href*="attendance.php"]');
  const endpoint = ajaxLink
    ? (ajaxLink.getAttribute('data-url') || 'attendance-ajax.php')
    : (classicLink ? classicLink.getAttribute('href') : null);
  if (!endpoint) return; // 已签到 / 当前页无签到入口 → 不签、不跳、不刷

  // 兜底：一天最多自动签一次，避免异常下反复 fetch + 跳转 / 刷新。（localStorage 按域隔离，各站互不影响）
  const today = new Date().toLocaleDateString('en-CA');
  if (localStorage.getItem('mzx-pter-attendance') === today) return;

  // 签到 = 对入口发一个带 cookie 的请求（AJAX 变体回 JSON，经典变体回 HTML；都只看 HTTP 是否 200）。
  // 成功后：已在 RETURN_TO 页就原地刷新，否则跳到 RETURN_TO（跳转本身即一次新加载）。
  // 仅网络 / HTTP 出错时不动，留到下次再试。
  fetch(endpoint, { credentials: 'same-origin' })
    .then((r) => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      localStorage.setItem('mzx-pter-attendance', today);
      const here = location.href.replace(/#.*$/, '');
      if (RETURN_TO && here !== RETURN_TO) {
        location.href = RETURN_TO;
      } else {
        location.reload();
      }
    })
    .catch(() => {
      /* 网络异常：不写标记、不跳、不刷，下次打开页面再试 */
    });
})();
