// ==UserScript==
// @name         GitHub Repo Visibility Badge Colors
// @namespace    https://github.com/muzi-xiaoren/MyScripts
// @version      1.0.0
// @description  Color repository visibility badges on GitHub: Public = green, Private = blue (outline pill, like the native "Public archive" badge).
// @author       muzi-xiaoren
// @match        https://github.com/*
// @run-at       document-end
// @grant        none
// @homepageURL  https://github.com/muzi-xiaoren/MyScripts
// @supportURL   https://github.com/muzi-xiaoren/MyScripts/issues
// @downloadURL  https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/github-repo-visibility-color/github-repo-visibility-color.user.js
// @updateURL    https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/github-repo-visibility-color/github-repo-visibility-color.user.js
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  // 注入主题感知样式（用 GitHub 自带 CSS 变量，自动适配亮/暗色）
  const style = document.createElement('style');
  style.textContent = `
    .mzx-vis-public {
      color: var(--fgColor-success, var(--color-success-fg, #1f883d)) !important;
      border-color: var(--fgColor-success, var(--color-success-fg, #1f883d)) !important;
    }
    .mzx-vis-private {
      color: var(--fgColor-accent, var(--color-accent-fg, #0969da)) !important;
      border-color: var(--fgColor-accent, var(--color-accent-fg, #0969da)) !important;
    }
  `;
  document.head.appendChild(style);

  function paint() {
    // 可见性徽章是 .Label 系列的描边胶囊
    const labels = document.querySelectorAll('span.Label, [class*="Label--"]');
    labels.forEach(el => {
      const t = (el.textContent || '').trim();
      if (t === 'Public') {
        el.classList.add('mzx-vis-public');
        el.classList.remove('mzx-vis-private');
      } else if (t === 'Private') {
        el.classList.add('mzx-vis-private');
        el.classList.remove('mzx-vis-public');
      }
      // "Public archive" / "Private archive" 保持 GitHub 原样（橙色）
    });
  }

  paint();

  // 列表筛选/翻页是 AJAX，DOM 变化时重新上色（加 class 幂等，安全；
  // 只监听 childList，不监听 attributes，避免自身改 class 触发死循环）
  const obs = new MutationObserver(() => {
    clearTimeout(window.__mzxVisT);
    window.__mzxVisT = setTimeout(paint, 150);
  });
  obs.observe(document.body, { childList: true, subtree: true });

  ['turbo:load', 'pjax:end'].forEach(ev => document.addEventListener(ev, paint));
})();
