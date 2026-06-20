// ==UserScript==
// @name         PT 签到 · BitPorn
// @namespace    https://github.com/muzi-xiaoren/MyScripts
// @version      1.0.0
// @description  打开 BitPorn 时自动领取当月「Daily Reward」日历里今天的奖励（事件 id 按月自动 +1），领完回到 /trending；已领则什么都不做。
// @author       muzi-xiaoren
// @match        https://bitporn.eu/trending*
// @match        https://bitporn.eu/events/*
// @run-at       document-end
// @grant        none
// @homepageURL  https://github.com/muzi-xiaoren/MyScripts
// @supportURL   https://github.com/muzi-xiaoren/MyScripts/issues
// @downloadURL  https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-bitporn/pt-checkin-bitporn.user.js
// @updateURL    https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-bitporn/pt-checkin-bitporn.user.js
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  // 【配置】领取后回到的页面。
  const RETURN_TO = 'https://bitporn.eu/trending';
  // 网络抗抖：单次请求超时(毫秒) + 失败最多重试次数（线性退避）。
  const FETCH_TIMEOUT = 8000;
  const FETCH_TRIES = 3;

  // 当月「Daily Reward」事件 id：基准 2026 年 6 月 = 11，之后每个月 +1。
  // 若哪天 BitPorn 中途插入了别的事件、导致月份与 id 不再严格 +1，把下面这俩基准改掉即可。
  const BASE_ID = 11;
  const BASE_YEAR = 2026;
  const BASE_MONTH = 6; // 1-12
  function currentEventId() {
    const d = new Date();
    return BASE_ID + (d.getFullYear() - BASE_YEAR) * 12 + (d.getMonth() + 1 - BASE_MONTH);
  }

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

  const today = new Date().toLocaleDateString('en-CA');
  // 兜底：一天最多自动领一次，避免反复跳转。（localStorage 按域隔离）
  if (localStorage.getItem('mzx-bitporn-claim') === today) return;

  const id = currentEventId();
  const eventPath = '/events/' + id;
  const path = location.pathname;

  // BitPorn 是 UNIT3D(Laravel)。每个月一个「Daily Reward」日历事件，页面只在「今天」那张卡渲染唯一一个
  // <form action="/events/<id>/claims" method="POST"> 里的 Claim 按钮（含 CSRF _token）。
  // 因此「有没有这个 Claim 表单」== 今天还能不能领；它只在当月事件页+当天出现，天然不会误领。
  const claimForm = Array.prototype.find.call(
    document.querySelectorAll('form[action*="/claims"]'),
    function (f) {
      return /\/events\/\d+\/claims$/.test(f.getAttribute('action') || '');
    }
  );

  if (/^\/events\/\d+/.test(path)) {
    // 在事件页：先确保是当月的事件 id，不是就跳到当月。
    if (path !== eventPath) {
      location.href = eventPath;
      return;
    }
    if (!claimForm) {
      // 没有可领（今天已领 / 该页今天无奖励）→ 标记今天已完成并回到 trending。
      localStorage.setItem('mzx-bitporn-claim', today);
      if (RETURN_TO) location.href = RETURN_TO;
      return;
    }
    // 提交领取表单（FormData 自带 _token），成功后标记 + 回 trending；失败则不标记、回 trending，下次再试。
    const action = claimForm.getAttribute('action');
    const fd = new FormData(claimForm);
    tryFetch(action, { method: 'POST', body: fd })
      .then(function () {
        localStorage.setItem('mzx-bitporn-claim', today);
        if (RETURN_TO) location.href = RETURN_TO;
      })
      .catch(function () {
        if (RETURN_TO) location.href = RETURN_TO;
      });
    return;
  }

  // 不在事件页（如 /trending）：跳到当月事件页去领（领完会被带回 trending）。
  location.href = eventPath;
})();
