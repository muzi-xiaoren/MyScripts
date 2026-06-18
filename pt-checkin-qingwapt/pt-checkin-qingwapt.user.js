// ==UserScript==
// @name         PT 签到 · QingwaPT
// @namespace    https://github.com/muzi-xiaoren/MyScripts
// @version      1.0.0
// @description  打开青蛙(QingwaPT)主页时自动完成每日任务：先①领每日福利(1蝌蚪换1000蝌蚪)+②(可选)群聊发言，最后③签到，然后回到主页。已签到则什么都不做。
// @author       muzi-xiaoren
// @match        https://www.qingwapt.com/
// @match        https://www.qingwapt.com/index.php*
// @run-at       document-end
// @grant        none
// @homepageURL  https://github.com/muzi-xiaoren/MyScripts
// @supportURL   https://github.com/muzi-xiaoren/MyScripts/issues
// @downloadURL  https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-qingwapt/pt-checkin-qingwapt.user.js
// @updateURL    https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-qingwapt/pt-checkin-qingwapt.user.js
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  // ============ 配置 ============
  // 三件事做完后回到的页面（已在该页就原地刷新）。留空 '' 则只刷新当前页、不跳转。
  const RETURN_TO = 'https://www.qingwapt.com/index.php';

  // 【第三件事开关】true = 开启 / false = 关闭。改这一个值即可开关「群聊发言」。
  const ENABLE_CHAT = true;
  const CHAT_MESSAGE = '蛙总，求上传'; // 群聊要发的内容

  // 蝌蚪商店「每日福利：1000蝌蚪」的物品 id（页面上显示的 9625378 是展示编号，真正的 id 是 28）
  const DAILY_GIFT_ID = 28;
  // ==============================

  // 用「是否已签到」作为当天的总开关：青蛙(经典 NexusPHP)未签到时页面顶部有
  //   <a class="faqlink" href="attendance.php">[签到得蝌蚪]</a>；签到后该 faqlink 消失、文字变「签到已得…」。
  // 因此「有没有未签到的 faqlink 入口」== 今天是否还没做。已签到 == 今天都做过了 → 什么都不做。
  const checkinLink = document.querySelector('a.faqlink[href*="attendance.php"]');
  if (!checkinLink) return;

  const today = new Date().toLocaleDateString('en-CA'); // 本地时区 YYYY-MM-DD

  // 顺序（按需求）：先「领福利 + 发言」，最后才「签到」。
  // 签到放最后，是为了让「已签到」成为「今天已完成」的可靠标志——重载后上面的 guard 命中即不再重复。
  (async () => {
    const first = [];

    // ② 领每日福利：POST /api/bonus-shop/exchange（FormData：id + amount）
    //    返回 {"success":true,...} 成功 / {"success":false,"msg":"超过限购数量。"} 今天已领（无害）
    const fd = new FormData();
    fd.append('id', String(DAILY_GIFT_ID));
    fd.append('amount', '1');
    first.push(fetch('/api/bonus-shop/exchange', { method: 'POST', body: fd, credentials: 'same-origin' }));

    // ③ 群聊发言（可选）：经典 NexusPHP 喊话器 GET /shoutbox.php?shbox_text=..&sent=yes&type=shoutbox
    //    额外加「每天最多一条」的 localStorage 上限，防刷屏/封号——即使签到失败导致重复进入也不会重复发。
    if (ENABLE_CHAT && localStorage.getItem('mzx-qingwa-chat') !== today) {
      localStorage.setItem('mzx-qingwa-chat', today);
      const q = 'shbox_text=' + encodeURIComponent(CHAT_MESSAGE) + '&sent=yes&type=shoutbox';
      first.push(fetch('/shoutbox.php?' + q, { credentials: 'same-origin' }));
    }

    await Promise.allSettled(first);

    // ① 最后签到（GET attendance.php；幂等）
    await fetch(checkinLink.getAttribute('href') || '/attendance.php', { credentials: 'same-origin' }).catch(() => {});

    // 回到 RETURN_TO（已在该页就原地刷新）；此时已签到，重载后顶部 guard 命中，不再重复。
    const here = location.href.replace(/#.*$/, '');
    if (RETURN_TO && here !== RETURN_TO) {
      location.href = RETURN_TO;
    } else {
      location.reload();
    }
  })();
})();
