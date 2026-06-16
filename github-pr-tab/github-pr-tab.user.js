// ==UserScript==
// @name         GitHub PR Tab — Compact Number + Status Color
// @namespace    https://github.com/muzi-xiaoren/MyScripts
// @version      3.3.0
// @description  Show the PR/Issue number in the browser tab (compact) and color the favicon by status (CI failure, review/merge, draft, open).
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

  // favicon 颜色
  const COLORS = {
    green:  '#1f883d', // open（基础色）
    black:  '#000000', // draft（基础色）
    red:    '#cf222e', // CI 有失败 / closed
    gold:   '#d4a017', // 有人 approve 或 merge 不再被 block
    purple: '#8250df', // merged
  };

  let lastColorKey = null;
  let bodyTimer = null;

  function getNumber() {
    const m = location.pathname.match(/\/(pull|issues)\/(\d+)/);
    return m ? m[2] : null;
  }

  // PR 状态：从头部 StateLabel 的 octicon 判断（新版 UI，语言无关）
  function getState() {
    const label = document.querySelector('[class*="StateLabel"]');
    if (label) {
      const oc = (label.querySelector('svg.octicon') || {}).classList?.value || '';
      if (/git-pull-request-draft/.test(oc))  return 'draft';
      if (/git-merge/.test(oc))               return 'merged';
      if (/git-pull-request-closed/.test(oc)) return 'closed';
      if (/git-pull-request/.test(oc))        return 'open';
      const t = label.textContent.trim().toLowerCase();
      if (t.includes('draft'))  return 'draft';
      if (t.includes('merged')) return 'merged';
      if (t.includes('closed')) return 'closed';
      if (t.includes('open'))   return 'open';
    }
    // 旧版兜底
    const old = document.querySelector('.State, [class*="State--"]');
    if (old) {
      const c = old.className || '';
      if (/merged/i.test(c)) return 'merged';
      if (/draft/i.test(c))  return 'draft';
      if (/closed/i.test(c)) return 'closed';
      if (/open/i.test(c))   return 'open';
    }
    return null;
  }

  // 合并框（仅 PR 会话页 /pull/N 存在；其它子页读不到 CI/审查状态）
  function getMergeBox() {
    return document.querySelector('[data-testid="mergebox-partial"]')
        || document.querySelector('[data-testid="mergebox-border-container"]');
  }

  // 综合判定 favicon 颜色（优先级：merged > closed > CI失败 > approve/未block > draft > open）
  function getColorKey() {
    const state = getState();
    if (state === 'merged') return 'purple';
    if (state === 'closed') return 'red';

    const box = getMergeBox();
    if (box) {
      const text = box.textContent || '';
      // CI 有失败的检查 -> 红（覆盖 open / draft）
      if (/were not successful|checks? have failed|\d+\s*failing/i.test(text)) return 'red';
      // 金色：必须有"明确正向信号"（有人 approve / 能合 / 无冲突），且没有 blocked。
      // 不再用"没有 blocked 文字"来推断金色——否则合并框加载到一半、blocked
      // 文字还没渲染时会先闪一下金再变回绿（这就是之前看到的"出错/闪烁"）。
      const blocked   = /merging is blocked/i.test(text);
      const approved  = /changes approved|approved these changes/i.test(text);
      const mergeable = /merging can be performed|no conflicts with base branch/i.test(text);
      if (!blocked && (approved || mergeable)) return 'gold';
    }

    if (state === 'draft') return 'black';
    if (state === 'open')  return 'green';
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

    // 2) favicon 上色（颜色变了才重画）
    const key = getColorKey();
    if (key && COLORS[key] && key !== lastColorKey) {
      setFavicon(COLORS[key]);
      lastColorKey = key;
    }
  }

  update();

  // 监听 <head>：捕获标题文字变化，以及 GitHub 整体替换 <title> 节点的情况
  // （只盯单个 title 节点时，节点被替换后旧观察器就失效 → 标题会被改回去）
  new MutationObserver(update).observe(document.head, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  // 监听 <body>：合并框 / 状态徽章是异步加载、且会随 CI 与审查实时变化的，
  // 节流后重新判定 favicon 颜色（加 class / 改 favicon 不动 body，不会自触发）。
  new MutationObserver(() => {
    clearTimeout(bodyTimer);
    bodyTimer = setTimeout(update, 150);
  }).observe(document.body, { childList: true, subtree: true });

  // 切回前台标签时再校正一次
  document.addEventListener('visibilitychange', () => { if (!document.hidden) update(); });

  // 翻页（SPA 导航）时重置颜色并重跑
  ['turbo:load', 'pjax:end'].forEach(ev =>
    document.addEventListener(ev, () => { lastColorKey = null; update(); })
  );
})();
