// ==UserScript==
// @name         PT 签到 · Rousi
// @namespace    https://github.com/muzi-xiaoren/MyScripts
// @version      1.0.0
// @description  打开 Rousi 时自动检测签到状态：未签到就点签到并回到指定页面，已签到则什么都不做。
// @author       muzi-xiaoren
// @match        https://rousi.pro/*
// @run-at       document-end
// @grant        none
// @homepageURL  https://github.com/muzi-xiaoren/MyScripts
// @supportURL   https://github.com/muzi-xiaoren/MyScripts/issues
// @downloadURL  https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-rousi/pt-checkin-rousi.user.js
// @updateURL    https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-rousi/pt-checkin-rousi.user.js
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  // 【配置】签到成功后停留 / 跳转到的页面。留空 '' 则只刷新触发签到的当前页。
  const RETURN_TO = 'https://rousi.pro/list?category=9kg&page=0';
  // SPA 渲染出签到按钮的最长等待 / 点击后等「已签到」确认的最长等待（毫秒）。
  const READY_TIMEOUT = 15000;
  const CONFIRM_TIMEOUT = 8000;

  // Rousi 是自研 React 单页应用，签到入口是导航栏里的一个 <button>：未签文字「签到」、已签「已签到」。
  // 它的接口要应用自带的鉴权 token（裸 fetch 带 cookie 会被判「登录状态无效」），所以这里走「点击按钮」让应用自己发请求，最稳。
  const isSigned = (b) => /已签到|已簽到/.test((b && b.textContent) || '');
  const findBtn = () =>
    Array.prototype.find.call(document.querySelectorAll('button'), function (b) {
      const t = (b.textContent || '').trim();
      return t === '签到' || t === '已签到' || t === '簽到' || t === '已簽到';
    });

  // 等到 test() 返回真值或超时（SPA 异步渲染，按钮可能在脚本运行后才出现）。
  function waitFor(test, timeout) {
    return new Promise((resolve) => {
      const hit = test();
      if (hit) return resolve(hit);
      const obs = new MutationObserver(() => {
        const h = test();
        if (h) {
          obs.disconnect();
          resolve(h);
        }
      });
      obs.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
      setTimeout(() => {
        obs.disconnect();
        resolve(test());
      }, timeout);
    });
  }

  // 兜底：一天最多自动签一次，避免异常下反复点击 + 跳转 / 刷新。（localStorage 按域隔离，各站互不影响）
  const today = new Date().toLocaleDateString('en-CA');
  if (localStorage.getItem('mzx-pter-attendance') === today) return;

  (async () => {
    const btn = await waitFor(findBtn, READY_TIMEOUT);
    if (!btn) return; // 没渲染出签到按钮 → 什么都不做
    if (isSigned(btn)) return; // 已签到 → 不点、不跳、不刷

    btn.click(); // 触发应用自带（带鉴权）的签到请求

    // 等按钮变「已签到」以确认签到成功，再跳转；没确认成功就不标记、不跳，下次打开页面再试。
    const confirmed = await waitFor(function () {
      const b = findBtn();
      return b && isSigned(b) ? b : null;
    }, CONFIRM_TIMEOUT);
    if (!confirmed) return;

    localStorage.setItem('mzx-pter-attendance', today);
    const here = location.href.replace(/#.*$/, '');
    if (RETURN_TO && here !== RETURN_TO) {
      location.href = RETURN_TO;
    } else {
      location.reload();
    }
  })();
})();
