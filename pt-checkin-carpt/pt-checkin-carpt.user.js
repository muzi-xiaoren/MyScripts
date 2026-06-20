// ==UserScript==
// @name         PT 签到 · CarPT
// @namespace    https://github.com/muzi-xiaoren/MyScripts
// @version      1.0.0
// @description  打开 CarPT 时自动检测签到状态：未签到就签到并回到指定页面，已签到则什么都不做。
// @author       muzi-xiaoren
// @match        https://carpt.net/*
// @run-at       document-end
// @grant        none
// @homepageURL  https://github.com/muzi-xiaoren/MyScripts
// @supportURL   https://github.com/muzi-xiaoren/MyScripts/issues
// @downloadURL  https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-carpt/pt-checkin-carpt.user.js
// @updateURL    https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-carpt/pt-checkin-carpt.user.js
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  // 【配置】签到成功后停留 / 跳转到的页面。留空 '' 则只刷新触发签到的当前页。
  const RETURN_TO = 'https://carpt.net/torrents.php';
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

  // NexusPHP 签到入口有多种写法，统一探测（取到「未签入口」就签，取不到=已签/无入口 → 什么都不做）：
  //   ① AJAX 变体（PTerClub）：<a id="do-attendance" data-url="attendance-ajax.php">。
  //   ② 经典 faqlink 变体（Mua/KamePT/NicePT/GGPT/CarPT）：<a class="faqlink" href="attendance.php">；已签后 faqlink class 被清空，靠结构判断。
  //   ③ 带 type 参数变体（PTtime）：<a href="attendance.php?type=sign&uid=..">；已签变 type=list，靠 type=sign 判断。
  //   ④ BTSchool 每日签到插件：<a href="index.php?action=addbonus">每日签到</a>；已签后该链接消失，靠链接是否存在判断。
  const ajaxLink = document.querySelector('#do-attendance');
  const classicLink = document.querySelector('a.faqlink[href*="attendance.php"]');
  const signParamLink = Array.prototype.find.call(
    document.querySelectorAll('a[href*="attendance.php"]'),
    function (a) {
      try {
        return new URL(a.getAttribute('href'), location.origin).searchParams.get('type') === 'sign';
      } catch (e) {
        return false;
      }
    }
  );
  const addbonusLink = document.querySelector('a[href*="action=addbonus"]');
  const endpoint = ajaxLink
    ? (ajaxLink.getAttribute('data-url') || 'attendance-ajax.php')
    : classicLink
    ? classicLink.getAttribute('href')
    : signParamLink
    ? signParamLink.getAttribute('href')
    : addbonusLink
    ? addbonusLink.getAttribute('href')
    : null;
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
