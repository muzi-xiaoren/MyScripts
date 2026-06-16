// ==UserScript==
// @name         GitHub PR Tab — Compact Number + Status Color
// @namespace    https://github.com/muzi-xiaoren/MyScripts
// @version      3.0.0
// @description  Show the PR/Issue number in the browser tab (compact) and color the favicon by status (open/merged/closed/draft).
// @author       muzi-xiaoren
// @match        https://github.com/*
// @run-at       document-end
// @grant        none
// @homepageURL  https://github.com/muzi-xiaoren/MyScripts
// @supportURL   https://github.com/muzi-xiaoren/MyScripts/issues
// @downloadURL  https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/github-pr-tab/github-pr-tab.user.js
// @updateURL    https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/github-pr-tab/github-pr-tab.user.js
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  // 状态 -> 颜色（GitHub 官方配色）
  const COLORS = {
    open:   '#1f883d', // 绿
    merged: '#8250df', // 紫
    closed: '#cf222e', // 红
    draft:  '#6e7781', // 灰
  };

  let lastState = null;

  function getNumber() {
    const m = location.pathname.match(/\/(pull|issues)\/(\d+)/);
    return m ? m[2] : null;
  }

  function getState() {
    const el = document.querySelector('.State, [class*="State--"]');
    if (!el) return null;
    const cls = el.className || '';
    if (/State--merged/.test(cls)) return 'merged';
    if (/State--draft/.test(cls))  return 'draft';
    if (/State--closed/.test(cls)) return 'closed';
    if (/State--open/.test(cls))   return 'open';
    const t = (el.textContent || '').toLowerCase();
    if (t.includes('merged')) return 'merged';
    if (t.includes('draft'))  return 'draft';
    if (t.includes('closed')) return 'closed';
    if (t.includes('open'))   return 'open';
    return null;
  }

  function setFavicon(color) {
    const size = 32;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    let link = document.querySelector('link[rel~="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.type = 'image/png';
    link.href = c.toDataURL('image/png');
  }

  function update() {
    const number = getNumber();
    if (!number) return;

    // 1) 标题（紧凑）
    const clean = document.title.replace(/^#\d+\s·?\s?/, '');   // 去掉自己加过的前缀
    const prTitle = clean.split(' · ')[0];                      // 只保留 PR 标题（如需用到）

    // ↓ 三选一：留一行，其余两行注释掉 ↓
    const desired = `#${number}`;                          // ① 最紧凑：只显示号
    // const desired = `#${number} ${prTitle}`;            // ② 号 + 干净标题
    // const desired = `#${number} ${prTitle.slice(0, 20)}…`; // ③ 号 + 标题截断到 20 字

    if (document.title !== desired) document.title = desired;

    // 2) favicon 上色（状态变了才重画）
    const state = getState();
    if (state && COLORS[state] && state !== lastState) {
      setFavicon(COLORS[state]);
      lastState = state;
    }
  }

  // 状态徽章可能异步加载，带重试
  function run(tries = 15) {
    update();
    if (getNumber() && lastState === null && tries > 0) {
      setTimeout(() => run(tries - 1), 200);
    }
  }

  run();

  // 标题变化（SPA 导航）
  const titleEl = document.querySelector('title');
  if (titleEl) new MutationObserver(update).observe(titleEl, { childList: true });

  // 翻页时重置状态并重跑
  ['turbo:load', 'pjax:end'].forEach(ev =>
    document.addEventListener(ev, () => { lastState = null; run(); })
  );
})();
