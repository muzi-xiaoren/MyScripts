// ==UserScript==
// @name         PT 签到 · Mua
// @namespace    https://github.com/muzi-xiaoren/MyScripts
// @version      1.1.0
// @description  打开 mua.xloli.cc 时自动检测签到状态：未签到就签到并回到指定页面，已签到则什么都不做。
// @author       muzi-xiaoren
// @match        https://mua.xloli.cc/*
// @run-at       document-end
// @grant        none
// @homepageURL  https://github.com/muzi-xiaoren/MyScripts
// @supportURL   https://github.com/muzi-xiaoren/MyScripts/issues
// @downloadURL  https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-mua/pt-checkin-mua.user.js
// @updateURL    https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-mua/pt-checkin-mua.user.js
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  // 【配置】签到成功后停留 / 跳转到的页面。留空 '' 则只刷新触发签到的当前页。
  const RETURN_TO = 'https://mua.xloli.cc/special.php';
  // 网络抗抖：单次请求超时(毫秒) + 失败最多重试次数（线性退避）。
  const FETCH_TIMEOUT = 8000;
  const FETCH_TRIES = 3;

  // 带超时 + 自动重试的 fetch：单次超 FETCH_TIMEOUT 毫秒就中断重发，最多 FETCH_TRIES 次。
  // 网络卡顿时更稳；若全部失败，则交给「下次打开页面」的被动重试兜底（本次不写已完成标记）。
  async function tryFetch(url, opts) {
    let lastErr;
    for (let i = 1; i <= FETCH_TRIES; i++) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
      try {
        const r = await fetch(url, Object.assign({ credentials: 'same-origin' }, opts, { signal: ctrl.signal }));
        clearTimeout(timer);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r;
      } catch (e) {
        clearTimeout(timer);
        lastErr = e;
        if (i < FETCH_TRIES) await new Promise((s) => setTimeout(s, 800 * i));
      }
    }
    throw lastErr;
  }

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

  // 签到（带超时 + 重试）。成功后标记今天已完成并回到 RETURN_TO（已在该页就原地刷新）；
  // 重试仍全失败则不标记，下次打开页面再试。
  tryFetch(endpoint)
    .then(() => {
      localStorage.setItem('mzx-pter-attendance', today);
      const here = location.href.replace(/#.*$/, '');
      if (RETURN_TO && here !== RETURN_TO) {
        location.href = RETURN_TO;
      } else {
        location.reload();
      }
    })
    .catch(() => {
      /* 重试后仍失败：不写标记、不跳、不刷，下次打开页面再试 */
    });
})();
