// ==UserScript==
// @name         PT 签到 · VC-Lib
// @namespace    https://github.com/muzi-xiaoren/MyScripts
// @version      2.0.0
// @description  打开 pt.vclib.online 时自动检测签到状态：未签到就去签到页，等站点的 Cloudflare Turnstile 安全验证放行后提交签到，再回到你原来所在的页面；已签到则什么都不做。
// @author       muzi-xiaoren
// @match        https://pt.vclib.online/*
// @run-at       document-end
// @noframes
// @grant        none
// @homepageURL  https://github.com/muzi-xiaoren/MyScripts
// @supportURL   https://github.com/muzi-xiaoren/MyScripts/issues
// @downloadURL  https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-vclib/pt-checkin-vclib.user.js
// @updateURL    https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-vclib/pt-checkin-vclib.user.js
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  // 【配置】签到成功后跳转到的页面。留空 '' 则回到被带去签到页之前你所在的那一页。
  const RETURN_TO = '';
  // 等 Turnstile 发令牌的最长时间(毫秒)。超时就把签到页留给用户手动点。
  const TOKEN_TIMEOUT = 20000;
  const TOKEN_POLL = 300;
  // 一天最多自动尝试几次（令牌过期 / 提交失败时的上限，防止反复跳转）。
  const MAX_TRIES = 3;

  const ATTENDANCE_PATH = '/attendance.php';
  const DONE_KEY = 'mzx-pter-attendance';
  const TRY_KEY = 'mzx-pter-attendance-tries';
  const FROM_KEY = 'mzx-pter-attendance-from';
  const today = new Date().toLocaleDateString('en-CA');

  // 站点顶部横幅在每个页面都有：未签到时是 <a class="faqlink" href="attendance.php">[签到得魔力]</a>，
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

  // 回哪儿：RETURN_TO 优先，否则回到来签到之前的那页。两个都没有（你自己直接打开的签到页）
  // 就原地不动 —— 不能 reload，签到页已签状态下再 reload 会一直刷自己。
  function leave() {
    const from = sessionStorage.getItem(FROM_KEY);
    sessionStorage.removeItem(FROM_KEY);
    const target = RETURN_TO || from;
    if (target && target !== location.href.replace(/#.*$/, '')) location.href = target;
  }

  // 签到页：站点把原来的图形验证码换成了 Cloudflare Turnstile 小组件，签到表单要带
  // Turnstile 自己写进隐藏域的 cf-turnstile-response 令牌 POST 过去才算数。
  // 本脚本不碰验证本身 —— 只是等 Cloudflare 的组件在你自己的浏览器里把令牌发下来，
  // 令牌到手就提交站点原本的表单；令牌一直不来（说明 Cloudflare 要求人工交互），
  // 就什么都不做，把页面原样留给你自己点。
  async function checkInHere() {
    if (!pending) {         // 已签到（含 POST 成功后的回显页）→ 收工回去
      markDone();
      leave();
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

  // 其它页面：未签到就把浏览器带去签到页。旧版在当前页弹图形验证码、后台 POST 回去，
  // 站点换成 Turnstile 后那条路断了：Turnstile 的令牌只能由签到页上的组件当场发。
  if (!pending) return;
  if (localStorage.getItem(DONE_KEY) === today) return;
  if (tries() >= MAX_TRIES) return;
  sessionStorage.setItem(FROM_KEY, location.href.replace(/#.*$/, ''));
  location.href = location.origin + ATTENDANCE_PATH;
})();
