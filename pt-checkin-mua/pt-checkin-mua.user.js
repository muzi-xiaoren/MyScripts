// ==UserScript==
// @name         PT 签到 · Mua
// @namespace    https://github.com/muzi-xiaoren/MyScripts
// @version      2.0.1
// @description  打开 mua.xloli.cc 时自动检测签到状态：未签到就去签到页完成签到并回到指定页面，已签到则什么都不做（自己打开签到页也不会被带走）。适配站点新增的 Cloudflare Turnstile 安全验证。
// @author       muzi-xiaoren
// @match        https://mua.xloli.cc/*
// @run-at       document-end
// @noframes
// @grant        none
// @homepageURL  https://github.com/muzi-xiaoren/MyScripts
// @supportURL   https://github.com/muzi-xiaoren/MyScripts/issues
// @downloadURL  https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-mua/pt-checkin-mua.user.js
// @updateURL    https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-mua/pt-checkin-mua.user.js
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  // 【配置】签到成功后停留 / 跳转到的页面。留空 '' 则只刷新签到页所在的当前页。
  const RETURN_TO = 'https://mua.xloli.cc/special.php';
  // 等 Turnstile 发令牌的最长时间(毫秒)。超时就把签到页留给用户手动点。
  const TOKEN_TIMEOUT = 20000;
  const TOKEN_POLL = 300;
  // 一天最多自动尝试几次（令牌过期 / 提交失败时的上限，防止反复跳转）。
  const MAX_TRIES = 3;

  const ATTENDANCE_PATH = '/attendance.php';
  const DONE_KEY = 'mzx-pter-attendance';
  const TRY_KEY = 'mzx-pter-attendance-tries';
  // 脚本自己提交签到表单前记一下，回显页据此判断「这次是脚本签的」才跳回 RETURN_TO。
  // 用 sessionStorage：只在这个标签页里有效，不会影响你另开的签到页。
  const SUBMIT_KEY = 'mzx-pter-attendance-submitted';
  const today = new Date().toLocaleDateString('en-CA');

  // 站点顶部横幅在每个页面都有：未签到时是 <a class="faqlink" href="attendance.php">[今日签到…]</a>，
  // 签到后 faqlink class 被清空、文字变成「已签到…」。所以靠这个结构判断（各站文案不同，别匹配文字）。
  const pending = !!document.querySelector('a.faqlink[href*="attendance.php"]');

  function markDone() {
    localStorage.setItem(DONE_KEY, today);
    localStorage.removeItem(TRY_KEY);
  }

  function tries() {
    const raw = localStorage.getItem(TRY_KEY) || '';
    const [day, n] = raw.split('|');
    return day === today ? Number(n) || 0 : 0;
  }

  function bumpTries() {
    localStorage.setItem(TRY_KEY, today + '|' + (tries() + 1));
  }

  function leave() {
    const here = location.href.replace(/#.*$/, '');
    if (RETURN_TO && here !== RETURN_TO) location.href = RETURN_TO;
    else location.reload();
  }

  // 签到页：站点现在会先渲染一个 Cloudflare Turnstile 小组件，签到表单要带
  // Turnstile 自己写进隐藏域的 cf-turnstile-response 令牌 POST 过去才算数。
  // 本脚本不碰验证本身 —— 只是等 Cloudflare 的组件在你自己的浏览器里把令牌发下来，
  // 令牌到手就提交站点原本的表单；令牌一直不来（说明 Cloudflare 要求人工交互），
  // 就什么都不做，把页面原样留给你自己点。
  async function checkInHere() {
    if (!pending) {
      markDone();
      // 只有脚本刚提交完的回显页才跳回去；签到后你自己点进签到页就留在这儿
      if (sessionStorage.getItem(SUBMIT_KEY)) {
        sessionStorage.removeItem(SUBMIT_KEY);
        leave();
      }
      return;
    }
    if (tries() >= MAX_TRIES) return;

    const form = document.querySelector('form[action*="attendance.php"]');
    if (!form) return;

    const deadline = Date.now() + TOKEN_TIMEOUT;
    while (Date.now() < deadline) {
      const token = form.querySelector('input[name="cf-turnstile-response"]');
      if (token && token.value) {
        bumpTries();
        sessionStorage.setItem(SUBMIT_KEY, '1');
        form.submit();
        return;
      }
      await new Promise((s) => setTimeout(s, TOKEN_POLL));
    }
  }

  if (location.pathname === ATTENDANCE_PATH) {
    checkInHere();
    return;
  }

  // 其它页面：未签到就把浏览器带去签到页（旧版直接 fetch attendance.php 已失效——
  // 那样只会拿回一张验证页面，签到不会生效）。签到页跑完会自动回到 RETURN_TO。
  if (!pending) return;
  if (localStorage.getItem(DONE_KEY) === today) return;
  if (tries() >= MAX_TRIES) return;
  location.href = 'https://mua.xloli.cc' + ATTENDANCE_PATH;
})();
