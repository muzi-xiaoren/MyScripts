// ==UserScript==
// @name         映幕 IMDbView — IMDb Top250 清爽海报墙
// @namespace    https://github.com/muzi-xiaoren/MyScripts
// @version      1.1.5
// @description  IMDb Top250 海报墙：隐藏广告、紧凑布局，保留原生评分、已看和片单操作，海报大小与间距可调。
// @author       muzi-xiaoren
// @match        https://www.imdb.com/chart/top*
// @run-at       document-start
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      query.wikidata.org
// @homepageURL  https://github.com/muzi-xiaoren/MyScripts/tree/main/imdbview
// @supportURL   https://github.com/muzi-xiaoren/MyScripts/issues
// @downloadURL  https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/imdbview/imdbview.user.js
// @updateURL    https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/imdbview/imdbview.user.js
// @license      MIT
// ==/UserScript==

(function () {
  function initialize() {
  'use strict';

  if (!/^\/chart\/top\/?$/.test(location.pathname)) return;
  if (document.getElementById('imdbview-style')) return;
  document.documentElement.classList.add('iv-boot');
  let domReady = document.readyState !== 'loading';
  const bootTimeout = setTimeout(() => document.documentElement.classList.remove('iv-boot'), 2500);
  const compactAttempts = new WeakMap();
  let startupRetry = null;
  function retryStartup(delay = 1000) {
    if (startupRetry !== null) return;
    startupRetry = setTimeout(() => {
      startupRetry = null;
      enhance();
    }, delay);
  }

  const DEFAULTS = { posterWidth: 240, gap: 22 };
  const STORAGE_KEY = 'imdbview-appearance';
  const stored = GM_getValue(STORAGE_KEY, {}) || {};
  const settings = {
    posterWidth: bounded(stored.posterWidth, 160, 360, DEFAULTS.posterWidth),
    gap: bounded(stored.gap, 8, 40, DEFAULTS.gap),
  };
  const MAIN = '[data-testid="chart-layout-main-column"]';
  const TITLE = '[data-testid="chart-layout-sidebar-title-container"]';
  let chromeCollapsed = GM_getValue('imdbview-chrome-collapsed', true) === true;
  let infoCloseTimer;
  let shareAnchor;
  const actionStyles = new WeakMap();
  const INFO_HEADER = `[data-testid="chart-layout-parent"] > div:has(> ${TITLE})`;
  const INFO_PROGRESS = `${MAIN} > div:has([role="progressbar"])`;
  const TITLE_CACHE_KEY = 'imdbview-chinese-titles';
  const cachedTitles = GM_getValue(TITLE_CACHE_KEY, {}) || {};
  const titleCache = typeof cachedTitles === 'object' && !Array.isArray(cachedTitles) ? cachedTitles : {};
  const requestedTitles = new Set();
  const pendingTitles = new Set();
  let loadingTitles = false;
  const preparedImages = new WeakMap();
  function upgradeImage(img) {
    const larger = img.src.replace(/\._V1_QL75_UX\d+_CR[^.]+\.jpg$/, '._V1_QL75_UX720_.jpg');
    if (larger !== img.src && img.src.startsWith('https://m.media-amazon.com/')) {
      const original = { src: img.src, srcset: img.srcset, sizes: img.sizes };
      img.addEventListener('error', () => { Object.assign(img, original); preparedImages.set(img, original.src); }, { once: true });
      img.srcset = `${larger} 720w`;
      img.sizes = `${settings.posterWidth}px`;
      img.src = larger;
    }
    preparedImages.set(img, img.src);
  }
  const posterObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      posterObserver.unobserve(entry.target);
      upgradeImage(entry.target);
    });
  }, { rootMargin: '300px' });

  function bounded(value, min, max, fallback) {
    return typeof value === 'number' && Number.isFinite(value)
      ? Math.round(Math.min(max, Math.max(min, value))) : fallback;
  }

  const style = document.createElement('style');
  style.id = 'imdbview-style';
  style.textContent = `
    html.iv-boot main, html.iv-boot #imdbHeader { visibility: hidden; }
    body.imdbview {
      --iv-bg: #f5f7f5;
      --iv-panel: #fff;
      --iv-ink: #24382d;
      --iv-soft: #65726a;
      --iv-line: #e3e9e4;
      --iv-green: #28774c;
      background: var(--iv-bg);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif;
    }
    .imdbview main, .imdbview main > .ipc-page-content-container,
    .imdbview [data-testid="chart-layout-parent"] > .ipc-page-grid,
    .imdbview main .ipc-page-background {
      background: var(--iv-bg);
    }
    .imdbview main > .ipc-page-content-container {
      max-width: 1280px;
      width: 100%;
      padding-inline: 32px;
      box-sizing: border-box;
    }
    .imdbview main .ipc-page-background { padding-block: 16px; }
    .imdbview.iv-chrome-collapsed #imdbHeader,
    .imdbview.iv-chrome-collapsed [data-testid="chart-layout-parent"] > div:has(> ${TITLE}),
    .imdbview.iv-chrome-collapsed ${MAIN} > div { display: none !important; }
    .imdbview.iv-chrome-collapsed ${MAIN} > .ipc-metadata-list { margin-top: 0; }
    .imdbview ${INFO_HEADER}, .imdbview ${INFO_PROGRESS} { display: none !important; }
    .imdbview.iv-info-open ${INFO_HEADER} {
      display: block !important;
      position: fixed;
      top: calc(var(--iv-toggle-top, 0px) + 30px);
      left: 50%;
      transform: translateX(-50%);
      width: min(620px, calc(100vw - 32px));
      box-sizing: border-box;
      padding: 16px;
      z-index: 31;
      background: var(--iv-panel);
      border: 1px solid var(--iv-line);
      border-radius: 12px;
      box-shadow: 0 12px 40px #24382d20;
    }
    .imdbview.iv-info-open ${TITLE} { flex-wrap: wrap; margin: 0; }
    #imdbview-chrome-toggle {
      display: none;
      position: fixed;
      top: var(--iv-toggle-top, 0px);
      left: 50%;
      transform: translateX(-50%);
      width: 220px;
      height: 30px;
      z-index: 30;
      align-items: center;
      justify-content: center;
    }
    .imdbview #imdbview-chrome-toggle { display: flex; }
    #imdbview-chrome-toggle button {
      opacity: 0;
      transition: opacity 150ms ease;
      cursor: pointer;
      width: auto;
      height: 24px;
      padding: 2px 10px;
      display: flex;
      align-items: center;
      gap: 7px;
      font: 500 12px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      white-space: nowrap;
      border: 1px solid var(--iv-line);
      border-radius: 8px;
      color: var(--iv-green);
      background: #fffffff2;
      box-shadow: 0 2px 8px #24382d12;
    }
    #imdbview-chrome-toggle:hover button,
    #imdbview-chrome-toggle:focus-within button { opacity: 1; }
    #imdbview-chrome-toggle button:focus-visible {
      outline: 2px solid var(--iv-green); outline-offset: 3px;
    }
    .iv-chrome-collapsed #imdbview-chrome-toggle svg { transform: rotate(180deg); }
    @media (hover: none) {
      #imdbview-chrome-toggle button { opacity: 1; }
    }
    @media (prefers-reduced-motion: reduce) {
      #imdbview-chrome-toggle button { transition: none; }
    }
    .imdbview main .ipc-page-content-container .ipc-page-content-container {
      width: 100%; max-width: 100%; padding: 0; margin: 0;
    }
    .imdbview #ipc-wrap-background-id { display: none; }
    .imdbview [data-testid="chart-layout-parent"] > div:has(> ${TITLE}) {
      padding: 0;
    }
    .imdbview [data-testid="chart-layout-parent"] > .ipc-page-grid {
      display: block;
      padding: 0;
    }
    .imdbview [data-testid="chart-layout-sidebar"],
    .imdbview .inline20-page-background,
    .imdbview [class*="DesktopAdhesionAdSlot_shell"],
    .imdbview .nas-slot, .imdbview .slot_wrapper,
    .imdbview #inline20_responsive_wrapper,
    .imdbview #inline40_responsive_wrapper,
    .imdbview #inlinebottom_responsive_wrapper { display: none !important; }
    .imdbview ${TITLE} {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 8px;
      margin: 0 0 10px;
      padding: 0;
      position: relative;
      color: var(--iv-ink);
    }
    .imdbview ${TITLE} > .ipc-title {
      order: -1;
      flex: 1;
      min-width: min(100%, 240px);
      width: auto;
      margin: 0;
      padding: 0;
    }
    .imdbview ${TITLE} .ipc-title__text {
      font-size: 22px;
      line-height: 1.4;
      font-weight: 700;
      color: var(--iv-ink);
    }
    .imdbview ${TITLE} .ipc-title__description,
    .imdbview ${TITLE} .type-overline,
    .imdbview ${TITLE} [aria-hidden="true"]:not(svg),
    .imdbview [data-testid="chart-layout-view-options"] { display: none; }
    .imdbview ${MAIN} {
      width: 100%;
      display: grid;
      grid-template-columns: 1fr auto auto;
      align-items: center;
      gap: 8px 12px;
      padding: 0;
    }
    .imdbview ${MAIN} > div:has([role="progressbar"]) {
      grid-column: 1 / -1;
      margin: 0;
      padding: 0;
      max-width: 360px;
      font-size: 12px;
      color: var(--iv-soft);
    }
    .imdbview ${MAIN} div:has(> [role="progressbar"]) { margin: 0; padding: 0; }
    .imdbview ${MAIN} [role="progressbar"] { height: 3px; min-height: 3px; margin: 0; }
    .imdbview ${MAIN} [role="progressbar"] svg { height: 3px; }
    .imdbview ${MAIN} [data-testid="watched-progress-text-wrapper"] { margin-top: 4px; }
    .imdbview ${MAIN} > div:has([data-testid="chart-layout-total-items"]),
    .imdbview ${MAIN} > div:has([data-testid="sort-container"]),
    .imdbview ${MAIN} > .ipc-chip-list { margin: 0; padding: 0; min-width: 0; }
    .imdbview [data-testid="chart-layout-total-items"] { color: var(--iv-soft); font-size: 13px; }
    .imdbview ${MAIN} > .ipc-metadata-list {
      grid-column: 1 / -1;
      display: grid !important;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, var(--iv-poster-width)), 1fr));
      gap: var(--iv-gap);
      margin: 4px 0 0;
      padding: 0;
      border: 0;
      background: transparent;
    }
    .imdbview ${MAIN} > .ipc-metadata-list > .ipc-metadata-list-summary-item {
      display: block;
      min-width: 0;
      padding: 0;
      border: 1px solid var(--iv-line);
      border-radius: 14px;
      background: var(--iv-panel) !important;
      color: var(--iv-ink);
      box-shadow: 0 3px 12px #24382d06;
      overflow: hidden;
    }
    .imdbview ${MAIN} .ipc-metadata-list-summary-item__c,
    .imdbview ${MAIN} .ipc-metadata-list-summary-item__tc { display: block; padding: 0; }
    .imdbview ${MAIN} .ipc-metadata-list-summary-item__t { display: none; }
    .imdbview ${MAIN} .cli-parent {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 0;
      position: relative;
      padding: 0;
    }
    .imdbview ${MAIN} .cli-parent > div:has(> .cli-poster-container),
    .imdbview ${MAIN} .cli-poster-container,
    .imdbview ${MAIN} .ipc-poster {
      width: 100%; max-width: none; min-width: 0; margin: 0;
    }
    .imdbview ${MAIN} .cli-parent > div:has(> .cli-poster-container) {
      display: flex;
      flex-direction: column;
      align-items: stretch;
    }
    .imdbview ${MAIN} .ipc-poster { border-radius: 0; }
    .imdbview ${MAIN} .ipc-poster__poster-image {
      aspect-ratio: 2 / 3;
      height: auto;
      padding: 0;
      border-radius: 0;
      background: #edf1ed;
    }
    .imdbview ${MAIN} .ipc-poster__poster-image::before,
    .imdbview ${MAIN} .ipc-poster__poster-image::after { display: none; }
    .imdbview ${MAIN} .ipc-poster__poster-image img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .imdbview ${MAIN} .cli-children {
      padding: 14px;
      width: auto;
      min-width: 0;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 8px;
    }
    .imdbview ${MAIN} [data-testid="title-list-item-ranking"] {
      position: absolute;
      top: 12px;
      right: 12px;
      z-index: 2;
      padding: 4px 9px;
      border-radius: 8px;
      background: #ffffffeb;
      color: var(--iv-green);
      font-weight: 700;
      pointer-events: none;
    }
    .imdbview ${MAIN} [data-testid="title-list-item-ranking"]::before { display: none; }
    .imdbview ${MAIN} .cli-title { margin: 0; padding: 0; }
    .imdbview ${MAIN} .cli-title .ipc-title__text {
      color: var(--iv-ink);
      font-size: 16px;
      line-height: 1.45;
      white-space: normal;
      overflow-wrap: anywhere;
    }
    .imdbview ${MAIN} .iv-chinese-title {
      color: var(--iv-green);
      font-size: 14px;
      font-weight: 500;
    }
    .imdbview ${MAIN} .iv-chinese-title::before { content: " · "; color: var(--iv-soft); }
    .imdbview ${MAIN} .cli-title-metadata { color: var(--iv-soft); font-size: 12px; }
    .imdbview ${MAIN} .cli-ratings-container { flex-wrap: wrap; gap: 6px; margin: 0; }
    .imdbview ${MAIN} .ipc-rating-star--voteCount { font-size: 12px; }
    .imdbview ${MAIN} .cli-children > span { display: flex; flex-direction: column; gap: 6px; }
    .imdbview ${MAIN} [data-testid^="inline-watched-button-"] {
      align-self: flex-start;
      color: var(--iv-soft);
      font-size: 12px;
      min-height: 32px;
      height: auto;
    }
    .imdbview ${MAIN} [data-testid^="inline-watched-button-"][aria-pressed="true"] {
      color: var(--iv-green);
      background: #eaf3ec;
    }
    .imdbview ${MAIN} .cli-post-element {
      align-self: flex-end;
      margin: -44px 8px 8px 0;
      z-index: 1;
    }
    .imdbview ${MAIN} a:focus-visible,
    .imdbview ${MAIN} button:focus-visible,
    #imdbview-settings :focus-visible { outline: 2px solid var(--iv-green); outline-offset: 3px; }
    #imdbview-settings { margin-left: auto; flex: 0 0 auto; font-size: 13px; }
    #imdbview-settings summary {
      cursor: pointer;
      list-style: none;
      border: 1px solid var(--iv-line);
      border-radius: 9px;
      padding: 7px 11px;
      background: var(--iv-panel);
      color: var(--iv-green);
    }
    #imdbview-settings summary::-webkit-details-marker { display: none; }
    #imdbview-settings .iv-panel {
      position: absolute;
      right: 0;
      top: calc(100% + 8px);
      z-index: 20;
      width: min(300px, calc(100vw - 32px));
      box-sizing: border-box;
      padding: 18px;
      border: 1px solid var(--iv-line);
      border-radius: 12px;
      background: var(--iv-panel);
      box-shadow: 0 12px 40px #24382d20;
    }
    #imdbview-settings label { display: block; margin-bottom: 14px; }
    #imdbview-settings output { float: right; color: var(--iv-soft); }
    #imdbview-settings input { display: block; width: 100%; margin: 10px 0 0; accent-color: var(--iv-green); }
    #imdbview-settings button {
      cursor: pointer;
      border: 1px solid var(--iv-line);
      border-radius: 7px;
      padding: 6px 10px;
      background: var(--iv-bg);
      color: var(--iv-ink);
    }
    @media (max-width: 600px) {
      .imdbview main > .ipc-page-content-container { padding-inline: 16px; }
      .imdbview ${TITLE} .ipc-title__text { font-size: 18px; }
      .imdbview ${MAIN} { gap: 8px; }
    }
    .imdbview.iv-info-open ${INFO_HEADER} {
      left: max(16px, calc((100vw - 620px) / 2)); transform: none;
    }
    .imdbview ${TITLE} .ipc-title__text { font-size: 18px; line-height: 1.4; }
    .imdbview ${TITLE} > .ipc-title { min-width: 0; }
    .imdbview ${TITLE} [data-testid="share-button"] {
      display: inline-flex; width: 36px; height: 36px; min-width: 36px;
      padding: 8px; color: var(--iv-soft); border-radius: 9px;
    }
    #imdbview-settings > summary { padding: 9px 10px; font-size: 12px; line-height: 18px; }
    #imdbview-settings label > span { display: flex; justify-content: space-between; gap: 12px; }
    #imdbview-settings output { float: none; }
    #imdbview-settings .iv-panel {
      position: fixed; left: var(--iv-settings-left, 16px); top: var(--iv-settings-top, 72px);
      right: auto; max-height: calc(100dvh - var(--iv-settings-top, 72px) - 16px); overflow: auto;
    }
    #imdbview-progress { margin-top: 12px; color: var(--iv-soft); font-size: 12px; }
    #imdbview-progress .iv-progress-labels {
      display: flex; justify-content: space-between; gap: 12px; line-height: 20px;
    }
    #imdbview-progress .iv-progress-track {
      height: 4px; margin-top: 8px; overflow: hidden; border-radius: 4px; background: var(--iv-line);
    }
    #imdbview-progress .iv-progress-fill { height: 100%; background: var(--iv-green); }
    #imdbview-share {
      position: fixed; z-index: 100; width: min(220px, calc(100vw - 32px));
      box-sizing: border-box; padding: 6px; background: var(--iv-panel);
      border: 1px solid var(--iv-line); border-radius: 12px; box-shadow: 0 12px 36px #24382d18;
      font: 13px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    #imdbview-share[hidden] { display: none; }
    #imdbview-share a, #imdbview-share button {
      display: block; width: 100%; box-sizing: border-box; padding: 9px 12px;
      border: 0; border-radius: 7px; background: transparent; color: var(--iv-ink);
      font: inherit; text-align: left; text-decoration: none; cursor: pointer;
    }
    #imdbview-share a:hover, #imdbview-share button:hover { background: var(--iv-bg); color: var(--iv-green); }
    #imdbview-share :focus-visible { outline: 2px solid var(--iv-green); outline-offset: -2px; }
    .imdbview ${MAIN} > .ipc-metadata-list > .ipc-metadata-list-summary-item { container-type: inline-size; }
    .imdbview ${MAIN} .cli-children { padding: clamp(10px, 4cqw, 14px); gap: 4px; }
    .imdbview ${MAIN} .cli-title .ipc-title__text {
      font-size: clamp(13px, calc(10px + 2.5cqw), 19px); line-height: 1.5;
      display: block; -webkit-line-clamp: unset; overflow: visible; max-height: none;
    }
    .imdbview ${MAIN} .iv-chinese-title,
    .imdbview ${MAIN} .cli-title-metadata,
    .imdbview ${MAIN} .ipc-rating-star--voteCount {
      font-size: clamp(10px, calc(7px + 1.67cqw), 13px); line-height: 1.6;
    }
    .imdbview ${MAIN} .ipc-rating-star { font-size: clamp(12px, calc(8px + 2.5cqw), 18px); }
    .imdbview ${MAIN} .cli-children > span { flex-direction: row; flex-wrap: wrap; align-items: center; gap: 4px; }
    .imdbview ${MAIN} [data-testid^="inline-watched-button-"] {
      font-size: clamp(11px, calc(6px + 2.5cqw), 15px); min-height: 28px;
    }
    .imdbview ${MAIN} > .ipc-metadata-list { align-items: start; }
    .imdbview ${MAIN} .cli-parent,
    .imdbview ${MAIN} .ipc-metadata-list-summary-item__c,
    .imdbview ${MAIN} .ipc-metadata-list-summary-item__tc,
    .imdbview ${MAIN} .cli-children { height: auto; min-height: 0; }
    .imdbview ${MAIN} .cli-children { margin: 0; gap: 4px; }
    .imdbview ${MAIN} .cli-title { height: auto; min-height: 0; max-height: none; overflow: visible; }
    .imdbview ${MAIN} .iv-chinese-title { display: block; }
    .imdbview ${MAIN} .iv-chinese-title::before { content: none; }
    .imdbview ${MAIN} .cli-poster-container { position: relative; }
    .imdbview ${MAIN} .ipc-poster__poster-image { position: relative; }
    .imdbview ${MAIN} .iv-poster-rating {
      position: absolute; right: 10px; bottom: 10px; z-index: 3;
      border-radius: 7px; padding: 3px 8px; background: #17291ce8; color: #fff;
      font-size: clamp(14px, calc(8px + 3cqw), 20px); line-height: 1.5;
      font-weight: 500; pointer-events: none;
    }
    .imdbview ${MAIN} .iv-overlay-source { display: none !important; }
    .imdbview ${MAIN} .cli-ratings-container { display: contents; }
    .imdbview ${MAIN} .cli-children > span:last-child { padding-right: 36px; }
    .imdbview ${MAIN} .cli-post-element {
      position: absolute; right: 10px; bottom: 10px; margin: 0; align-self: auto;
    }
    .imdbview ${MAIN} .cli-post-element .ipc-icon-button,
    .imdbview ${MAIN} .cli-post-element button {
      width: 28px; height: 28px; min-width: 28px; min-height: 28px; padding: 4px;
    }
    .imdbview ${MAIN} .cli-title .ipc-title__text { margin: 0; }
    .imdbview ${MAIN} .iv-chinese-title { padding-right: 34px; line-height: max(1.6em, 28px); }
    .imdbview ${MAIN} .cli-title-metadata { display: block; width: 100%; box-sizing: border-box; margin: 0; padding: 0; }
    .imdbview ${MAIN} .cli-children { gap: 2px; }
    .imdbview ${MAIN} .cli-children > span:last-child { padding-right: 0; }
    .imdbview ${MAIN} .iv-native-rate,
    .imdbview ${MAIN} .iv-native-watched,
    .imdbview ${MAIN} .iv-native-info {
      position: absolute !important; right: auto; bottom: auto; margin: 0 !important;
      transform: none !important; z-index: 4;
    }
    .imdbview ${MAIN} .iv-native-rate {
      color: #fff; background: #17291ce8; border: 0; border-radius: 7px;
      padding: 3px 7px; min-height: 0; height: auto;
      font-size: clamp(14px, calc(8px + 3cqw), 20px); line-height: 1.5;
    }
    .imdbview ${MAIN} .iv-native-rate svg { width: 18px; height: 18px; color: #fff; }
    .imdbview ${MAIN} .iv-native-watched { padding: 2px 6px; min-height: 24px; }
    .imdbview ${MAIN} .iv-native-info { width: 28px; height: 28px; }
    #imdbview-chrome-toggle { height: 36px; width: min(620px, calc(100vw - 32px)); }
    #imdbview-chrome-toggle button {
      height: 36px; padding: 4px 14px; font-size: 14px; gap: 10px;
      border-radius: 12px 12px 0 0;
    }
    #imdbview-chrome-toggle svg { width: 22px; height: 22px; }
    .imdbview.iv-info-open #imdbview-chrome-toggle button { opacity: 1; transition: none; }
    .imdbview.iv-info-open ${INFO_HEADER} {
      top: calc(var(--iv-toggle-top, 0px) + 36px); border-radius: 12px;
    }
    .imdbview ${MAIN} > div:has([data-testid="chart-layout-total-items"]) { grid-column: 1; }
    .imdbview ${MAIN} > div:has([data-testid="sort-container"]) { grid-column: 2; }
    .imdbview ${MAIN} > .ipc-chip-list { grid-column: 1 / -1; justify-self: end; }
    .imdbview [data-testid="sort-container"] {
      display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--iv-soft);
    }
    .imdbview [data-testid="sort-container"] button,
    .imdbview ${MAIN} .ipc-chip { font-size: 12px; min-height: 30px; }
    .imdbview ${MAIN} .iv-poster-rating,
    .imdbview ${MAIN} .iv-native-rate {
      height: 28px; min-height: 28px; box-sizing: border-box;
      display: inline-flex; align-items: center; justify-content: center;
    }
  `;
  (document.head || document.documentElement).append(style);

  function applySettings() {
    document.body.style.setProperty('--iv-poster-width', `${settings.posterWidth}px`);
    document.body.style.setProperty('--iv-gap', `${settings.gap}px`);
    document.querySelectorAll('#imdbview-settings input').forEach(input => {
      input.value = settings[input.name];
      const output = input.closest('label').querySelector('output');
      const text = `${settings[input.name]} px`;
      // 不重复写入文本，否则页面观察器会被设置面板自身的更新持续触发。
      if (output.value !== text) output.value = text;
    });
    requestAnimationFrame(syncCardActions);
  }

  function createSettings(host) {
    const menu = document.createElement('details');
    menu.id = 'imdbview-settings';
    menu.innerHTML = `
      <summary>外观设置</summary>
      <div class="iv-panel">
        <label><span>海报大小（目标宽度）<output></output></span><input aria-label="海报宽度" name="posterWidth" type="range" min="160" max="360" step="10"></label>
        <label><span>卡片间距<output></output></span><input aria-label="卡片间距" name="gap" type="range" min="8" max="40" step="2"></label>
        <button type="button">恢复默认</button>
      </div>`;
    menu.addEventListener('input', event => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement)) return;
      if (!(input.name in DEFAULTS)) return;
      settings[input.name] = Number(input.value);
      applySettings();
    });
    menu.addEventListener('change', () => GM_setValue(STORAGE_KEY, { ...settings }));
    menu.querySelector('button').addEventListener('click', () => {
      Object.assign(settings, DEFAULTS);
      applySettings();
      GM_setValue(STORAGE_KEY, { ...settings });
    });
    menu.addEventListener('toggle', positionSettings);
    host.append(menu);
  }

  function positionSettings() {
    const menu = document.getElementById('imdbview-settings');
    if (!menu?.open) return;
    const anchor = menu.querySelector('summary').getBoundingClientRect();
    const panel = menu.querySelector('.iv-panel');
    const width = Math.min(300, innerWidth - 32);
    menu.style.setProperty('--iv-settings-left', `${Math.max(16, Math.min(anchor.right - width, innerWidth - width - 16))}px`);
    menu.style.setProperty('--iv-settings-top', `${Math.max(8, Math.min(anchor.bottom + 8, innerHeight - panel.offsetHeight - 16))}px`);
  }

  function positionChromeToggle() {
    const list = document.querySelector(`${MAIN} > .ipc-metadata-list`);
    if (!list) return;
    const top = chromeCollapsed ? 0 : Math.max(0, document.getElementById('imdbHeader')?.getBoundingClientRect().bottom || 0);
    document.body.style.setProperty('--iv-toggle-top', `${top}px`);
    positionShare();
    positionSettings();
  }

  function syncProgress() {
    const native = document.querySelector(INFO_PROGRESS);
    const header = document.querySelector(INFO_HEADER);
    if (!native || !header) { document.getElementById('imdbview-progress')?.remove(); return; }
    const text = native.querySelector('[data-testid="watched-progress-text-wrapper"]')?.textContent.trim() || '';
    const counts = text.match(/(\d+)\s*(?:of|\/)\s*(\d+)/i);
    const bar = native.querySelector('[role="progressbar"]');
    const max = Number(bar?.getAttribute('aria-valuemax')) || 100;
    const now = bar?.getAttribute('aria-valuenow');
    const percent = counts && Number(counts[2]) > 0 ? Number(counts[1]) / Number(counts[2]) * 100
      : now !== null && now !== undefined ? Number(now) / max * 100 : NaN;
    if (!Number.isFinite(percent)) { document.getElementById('imdbview-progress')?.remove(); return; }
    let progress = document.getElementById('imdbview-progress');
    if (!progress) {
      progress = document.createElement('div');
      progress.id = 'imdbview-progress';
      progress.innerHTML = '<div class="iv-progress-labels"><span></span><span></span></div><div class="iv-progress-track" role="progressbar" aria-label="观看进度" aria-valuemin="0" aria-valuemax="100"><div class="iv-progress-fill"></div></div>';
      header.append(progress);
    }
    const value = Math.min(100, Math.max(0, percent));
    const labels = progress.querySelectorAll('.iv-progress-labels span');
    const label = counts ? `已看 ${counts[1]} / ${counts[2]} 部` : text || '观看进度';
    if (labels[0].textContent !== label) labels[0].textContent = label;
    const percentText = `${Math.round(value)}%`;
    if (labels[1].textContent !== percentText) labels[1].textContent = percentText;
    progress.querySelector('[role="progressbar"]').setAttribute('aria-valuenow', String(value));
    progress.querySelector('.iv-progress-fill').style.width = `${value}%`;
  }

  function positionShare() {
    const menu = document.getElementById('imdbview-share');
    if (!menu || menu.hidden) return;
    if (!shareAnchor?.isConnected) { closeShare(); return; }
    const rect = shareAnchor.getBoundingClientRect();
    const width = Math.min(220, innerWidth - 32);
    const height = menu.offsetHeight;
    menu.style.left = `${Math.max(16, Math.min(rect.right - width, innerWidth - width - 16))}px`;
    menu.style.top = `${Math.max(8, Math.min(rect.bottom + 8, innerHeight - height - 16))}px`;
  }

  function closeShare() {
    const menu = document.getElementById('imdbview-share');
    if (menu) menu.hidden = true;
    shareAnchor?.setAttribute('aria-expanded', 'false');
    scheduleHideChartInfo();
  }

  function toggleShare(anchor) {
    let menu = document.getElementById('imdbview-share');
    if (menu && !menu.hidden) { closeShare(); return; }
    shareAnchor = anchor;
    if (!menu) {
      menu = document.createElement('div');
      menu.id = 'imdbview-share';
      menu.setAttribute('aria-label', '分享榜单');
      menu.innerHTML = '<a data-share="facebook" target="_blank" rel="noopener noreferrer">Facebook</a><a data-share="twitter" target="_blank" rel="noopener noreferrer">X / Twitter</a><a data-share="email">邮件分享</a><button type="button">复制链接</button>';
      menu.querySelector('button').addEventListener('click', async event => {
        try { await navigator.clipboard.writeText(location.href); event.target.textContent = '已复制'; }
        catch { event.target.textContent = '复制失败，请手动复制地址'; }
      });
      document.body.append(menu);
    }
    const url = encodeURIComponent(location.href);
    menu.querySelector('[data-share="facebook"]').href = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    menu.querySelector('[data-share="twitter"]').href = `https://twitter.com/intent/tweet?url=${url}`;
    menu.querySelector('[data-share="email"]').href = `mailto:?subject=IMDb%20Top%20250&body=${url}`;
    menu.querySelector('button').textContent = '复制链接';
    anchor.setAttribute('aria-expanded', 'true');
    menu.hidden = false;
    showChartInfo();
    positionShare();
  }

  function showChartInfo() {
    clearTimeout(infoCloseTimer);
    document.body.classList.add('iv-info-open');
    positionChromeToggle();
  }

  function scheduleHideChartInfo() {
    clearTimeout(infoCloseTimer);
    // 留出穿过入口与面板间隙的时间，让分享和外观设置能够正常操作。
    infoCloseTimer = setTimeout(() => {
      const regions = `#imdbview-chrome-toggle, ${INFO_HEADER}, ${INFO_PROGRESS}`;
      if (document.activeElement?.matches(':focus-visible') && document.activeElement.closest(regions)) return;
      if (document.getElementById('imdbview-settings')?.open) return;
      if (document.getElementById('imdbview-share')?.hidden === false) return;
      document.body.classList.remove('iv-info-open');
    }, 180);
  }

  function updateChromeToggle() {
    document.body.classList.toggle('iv-chrome-collapsed', chromeCollapsed);
    const button = document.querySelector('#imdbview-chrome-toggle button');
    if (button) {
      const label = chromeCollapsed ? 'IMDb Top 250：展开顶部导航和工具栏' : 'IMDb Top 250：收起顶部导航和工具栏';
      button.setAttribute('aria-label', label);
      button.setAttribute('aria-expanded', String(!chromeCollapsed));
      button.title = label;
    }
    positionChromeToggle();
  }

  function createChromeToggle() {
    const control = document.createElement('div');
    control.id = 'imdbview-chrome-toggle';
    control.innerHTML = `<button type="button"><span>IMDb Top 250</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 15 6-6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
    control.querySelector('button').addEventListener('click', () => {
      chromeCollapsed = !chromeCollapsed;
      closeShare();
      document.getElementById('imdbview-settings')?.removeAttribute('open');
      updateChromeToggle();
      GM_setValue('imdbview-chrome-collapsed', chromeCollapsed);
    });
    // 浮动控制独立于 React 区域，收起导航后仍可用键盘或鼠标展开。
    document.body.append(control);
  }

  function cachedChineseTitle(id) {
    const entry = titleCache[id];
    if (!entry || typeof entry.expires !== 'number' || entry.expires <= Date.now()) return undefined;
    return typeof entry.name === 'string' || entry.name === null ? entry.name : undefined;
  }

  function syncPosterRatings(main) {
    main.querySelectorAll('.cli-parent').forEach(card => {
      const poster = card.querySelector('.ipc-poster__poster-image') || card.querySelector('.cli-poster-container');
      const source = card.querySelector('.cli-ratings-container .ipc-rating-star--imdb')
        || card.querySelector('.cli-ratings-container .ipc-rating-star');
      const score = source?.querySelector('.ipc-rating-star--rating')?.textContent.trim()
        || source?.textContent.match(/\b(?:10|\d)(?:\.\d)?\b/)?.[0];
      let badge = poster?.querySelector('.iv-poster-rating');
      if (!poster || !source || !score) { badge?.remove(); source?.classList.remove('iv-overlay-source'); return; }
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'iv-poster-rating';
        poster.append(badge);
      }
      const text = `★ ${score}`;
      if (badge.textContent !== text) badge.textContent = text;
      badge.title = source.getAttribute('aria-label') || source.textContent.trim();
      badge.setAttribute('aria-label', `IMDb 评分 ${score}，${source.textContent.trim()}`);
      source.classList.add('iv-overlay-source');
    });
  }

  // 只定位原生控件，不移动 React 节点，以保留事件和观影状态更新。
  function syncCardActions() {
    if (!document.body.classList.contains('imdbview')) return;
    const main = document.querySelector(MAIN);
    if (!main) return;
    const remember = element => {
      if (!actionStyles.has(element)) actionStyles.set(element,
        ['left', 'top', 'padding-bottom', 'min-height'].map(name => [name, element.style.getPropertyValue(name), element.style.getPropertyPriority(name)]));
    };
    const place = (element, left, top) => {
      const parent = element.offsetParent;
      if (!parent) return;
      const origin = parent.getBoundingClientRect();
      element.style.left = `${left - origin.left - parent.clientLeft + parent.scrollLeft}px`;
      element.style.top = `${top - origin.top - parent.clientTop + parent.scrollTop}px`;
    };
    const lastTextRect = element => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const rects = Array.from(range.getClientRects()).filter(rect => rect.width > 0 && rect.height > 0);
      return rects.at(-1) || element.getBoundingClientRect();
    };
    const cards = Array.from(main.querySelectorAll('.cli-parent'));
    const rows = new Map();
    const rowLayout = new WeakMap();
    cards.forEach(card => {
      const title = card.querySelector('.cli-title');
      const metadata = card.querySelector('.cli-title-metadata');
      const watched = card.querySelector('[data-testid^="inline-watched-button-"]');
      if (title) { remember(title); title.classList.add('iv-action-title'); title.style.minHeight = '0px'; }
      if (metadata) { remember(metadata); metadata.style.minHeight = '0px'; metadata.style.paddingBottom = '0px'; }
      if (watched) { remember(watched); watched.classList.add('iv-native-watched'); }
    });
    cards.forEach(card => {
      const key = Math.round(card.getBoundingClientRect().top);
      if (!rows.has(key)) rows.set(key, []);
      rows.get(key).push(card);
    });
    rows.forEach(row => {
      const titleHeight = Math.max(...row.map(card => card.querySelector('.cli-title')?.getBoundingClientRect().height || 0));
      const metadataHeight = Math.max(...row.map(card => card.querySelector('.cli-title-metadata')?.getBoundingClientRect().height || 0));
      const wrap = row.some(card => {
        const metadata = card.querySelector('.cli-title-metadata');
        const watched = card.querySelector('[data-testid^="inline-watched-button-"]');
        return metadata && watched && lastTextRect(metadata).right + watched.getBoundingClientRect().width + 8 > metadata.getBoundingClientRect().right;
      });
      row.forEach(card => {
        const title = card.querySelector('.cli-title');
        if (title) title.style.minHeight = `${titleHeight}px`;
        rowLayout.set(card, { wrap, metadataHeight });
      });
    });
    cards.forEach(card => {
      const image = card.querySelector('.ipc-poster__poster-image');
      const badge = card.querySelector('.iv-poster-rating');
      const rate = card.querySelector('.cli-ratings-container button, .cli-ratings-container [role="button"]');
      if (image && badge && rate) {
        remember(rate);
        rate.classList.add('iv-native-rate');
        const rect = image.getBoundingClientRect();
        const size = rate.getBoundingClientRect();
        place(rate, rect.right - size.width - 10, rect.bottom - size.height - 10);
        badge.style.right = `${size.width + 16}px`;
      }
      const heading = card.querySelector('.iv-chinese-title') || card.querySelector('.cli-title .ipc-title__text');
      const info = card.querySelector('.cli-post-element');
      if (heading && info) {
        remember(info);
        info.classList.add('iv-native-info');
        const text = lastTextRect(heading);
        const size = info.getBoundingClientRect();
        const content = card.querySelector('.cli-children').getBoundingClientRect();
        place(info, Math.min(text.right + 5, content.right - size.width - 10), text.top + (text.height - size.height) / 2);
      }
      const metadata = card.querySelector('.cli-title-metadata');
      const watched = card.querySelector('[data-testid^="inline-watched-button-"]');
      if (metadata && watched) {
        remember(watched);
        remember(metadata);
        metadata.classList.add('iv-action-metadata');
        watched.classList.add('iv-native-watched');
        metadata.style.paddingBottom = '0px';
        metadata.style.minHeight = '0px';
        const text = lastTextRect(metadata);
        const rect = metadata.getBoundingClientRect();
        const size = watched.getBoundingClientRect();
        const layout = rowLayout.get(card);
        if (!layout.wrap) {
          metadata.style.minHeight = `${Math.max(layout.metadataHeight, size.height)}px`;
          place(watched, text.right + 8, Math.max(rect.top, text.top + (text.height - size.height) / 2));
        } else {
          metadata.style.minHeight = `${layout.metadataHeight + size.height + 4}px`;
          metadata.style.paddingBottom = `${size.height + 4}px`;
          place(watched, rect.left, rect.top + layout.metadataHeight + 4);
        }
      }
    });
  }

  function addChineseTitles(main) {
    main.querySelectorAll('.cli-title a[href*="/title/"]').forEach(link => {
      const id = link.getAttribute('href')?.match(/^\/title\/(tt\d+)\//)?.[1];
      const heading = link.querySelector('.ipc-title__text');
      if (!id || !heading) return;
      const name = cachedChineseTitle(id);
      const existing = heading.querySelector('.iv-chinese-title');
      if (name === undefined) {
        if (!requestedTitles.has(id)) pendingTitles.add(id);
        return;
      }
      const originalName = Array.from(heading.childNodes)
        .filter(node => node !== existing).map(node => node.textContent).join('').trim();
      if (!name || name === originalName) {
        existing?.remove();
        return;
      }
      if (existing?.dataset.imdbId === id && existing.textContent === name) return;
      const translation = existing || document.createElement('span');
      translation.className = 'iv-chinese-title';
      translation.dataset.imdbId = id;
      translation.lang = 'zh';
      translation.title = '中文片名 · Wikidata';
      translation.textContent = name;
      if (!existing) heading.append(translation);
      heading.title = `${originalName} · ${name}`;
    });
    if (!loadingTitles && pendingTitles.size) void loadChineseTitles();
  }

  function fetchChineseTitles(ids) {
    // 按 IMDb ID 精确关联，优先大陆及简体名称，不用片名模糊搜索。
    const query = `
      PREFIX wdt: <http://www.wikidata.org/prop/direct/>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      SELECT ?id ?film ?label WHERE {
        VALUES ?id { ${ids.map(id => `"${id}"`).join(' ')} }
        ?film wdt:P345 ?id; rdfs:label ?label.
        FILTER(LANG(?label) IN ("zh-cn", "zh-hans", "zh", "zh-sg", "zh-hant", "zh-tw"))
      }`;
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url: `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`,
        headers: { Accept: 'application/sparql-results+json' },
        anonymous: true,
        timeout: 25000,
        onload(response) {
          if (response.status !== 200) {
            reject(new Error(`中文片名服务返回 ${response.status}`));
            return;
          }
          try {
            const rows = JSON.parse(response.responseText)?.results?.bindings;
            if (!Array.isArray(rows)) throw new Error('中文片名数据格式不正确');
            resolve(rows);
          } catch (error) { reject(error); }
        },
        onerror: () => reject(new Error('中文片名服务连接失败')),
        ontimeout: () => reject(new Error('中文片名服务连接超时')),
      });
    });
  }

  async function loadChineseTitles() {
    loadingTitles = true;
    try {
      while (pendingTitles.size) {
        const ids = Array.from(pendingTitles).slice(0, 50);
        ids.forEach(id => { pendingTitles.delete(id); requestedTitles.add(id); });
        let rows;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            rows = await fetchChineseTitles(ids);
            break;
          } catch (error) {
            if (attempt === 1) console.warn('IMDbView：暂时无法补充中文片名，下次打开页面会重试。', error);
            else await new Promise(resolve => setTimeout(resolve, 3000));
          }
        }
        if (!rows) {
          pendingTitles.clear();
          break;
        }
        const languages = ['zh-cn', 'zh-hans', 'zh', 'zh-sg', 'zh-hant', 'zh-tw'];
        const matches = new Map();
        for (const row of rows) {
          const id = row.id?.value;
          const name = row.label?.value;
          const film = row.film?.value;
          const priority = languages.indexOf(row.label?.['xml:lang']);
          if (!ids.includes(id) || typeof name !== 'string' || !/[\u3400-\u9fff]/.test(name)
            || typeof film !== 'string' || priority < 0) continue;
          const match = matches.get(id);
          if (!match) matches.set(id, { name, film, priority, ambiguous: false });
          else if (match.film !== film) match.ambiguous = true;
          else if (priority < match.priority) Object.assign(match, { name, priority });
        }
        ids.forEach(id => {
          const match = matches.get(id);
          const name = match && !match.ambiguous ? match.name : null;
          titleCache[id] = { name, expires: Date.now() + (name ? 30 : 7) * 86400000 };
        });
        GM_setValue(TITLE_CACHE_KEY, titleCache);
        const main = document.querySelector(MAIN);
        if (main && /^\/chart\/top\/?$/.test(location.pathname)) addChineseTitles(main);
        if (pendingTitles.size) await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } finally { loadingTitles = false; }
  }

  // 只改布局，不搬走 React 管理的节点，保留 IMDb 的事件和状态更新。
  function enhance() {
    if (!domReady || !document.body) return;
    if (!/^\/chart\/top\/?$/.test(location.pathname)) {
      clearTimeout(startupRetry);
      startupRetry = null;
      document.body.classList.remove('imdbview');
      document.body.classList.remove('iv-chrome-collapsed');
      document.body.classList.remove('iv-info-open');
      document.getElementById('imdbview-settings')?.remove();
      document.getElementById('imdbview-chrome-toggle')?.remove();
      document.getElementById('imdbview-share')?.remove();
      document.getElementById('imdbview-progress')?.remove();
      document.querySelectorAll('.iv-poster-rating').forEach(badge => badge.remove());
      document.querySelectorAll('.iv-overlay-source').forEach(source => source.classList.remove('iv-overlay-source'));
      document.querySelectorAll('.iv-native-rate, .iv-native-watched, .iv-native-info, .iv-action-metadata, .iv-action-title').forEach(element => {
        actionStyles.get(element)?.forEach(([name, value, priority]) => element.style.setProperty(name, value, priority));
        element.classList.remove('iv-native-rate', 'iv-native-watched', 'iv-native-info', 'iv-action-metadata', 'iv-action-title');
        actionStyles.delete(element);
      });
      return;
    }
    // 原站 hydration 可能重建 head/body，保留的样式节点需要重新接回页面。
    if (!style.isConnected) (document.head || document.documentElement).append(style);
    const main = document.querySelector(MAIN);
    const title = document.querySelector(TITLE);
    const card = main?.querySelector('.cli-parent');
    if (!title || !main) { retryStartup(); return; }

    // 统一用原生紧凑视图的数据结构，避免用户上次选择的视图影响卡片布局。
    if (!card?.classList.contains('li-compact')) {
      const button = document.getElementById('list-view-option-compact');
      if (button && !button.disabled) {
        const attempt = compactAttempts.get(button) || { count: 0, time: 0 };
        const interval = attempt.count < 3 ? 550 : 2000;
        if (Date.now() - attempt.time >= interval) {
          compactAttempts.set(button, { count: attempt.count + 1, time: Date.now() });
          button.click();
        }
      }
      // React 的事件处理器可能晚于 DOM 就绪；未切换成功时继续低频检查。
      retryStartup(1000);
      return;
    }
    clearTimeout(startupRetry);
    startupRetry = null;
    document.body.classList.add('imdbview');
    document.documentElement.classList.remove('iv-boot');
    clearTimeout(bootTimeout);
    if (!document.getElementById('imdbview-settings')) createSettings(title);
    if (!document.getElementById('imdbview-chrome-toggle')) createChromeToggle();
    applySettings();
    updateChromeToggle();
    syncProgress();
    addChineseTitles(main);
    syncPosterRatings(main);
    syncCardActions();

    // 接近视口时再加载大图，减少与原生账号状态请求的竞争。
    main.querySelectorAll('.ipc-poster__poster-image img').forEach(img => {
      if (preparedImages.get(img) === img.src) return;
      img.loading = 'lazy';
      img.decoding = 'async';
      preparedImages.set(img, img.src);
      posterObserver.observe(img);
    });
  }

  document.addEventListener('click', event => {
    if (!document.body.classList.contains('imdbview')) return;
    const anchor = event.target instanceof Element ? event.target.closest(`${TITLE} [data-testid="share-button"]`) : null;
    if (anchor) {
      event.preventDefault();
      event.stopImmediatePropagation();
      toggleShare(anchor);
    }
  }, true);
  document.addEventListener('click', event => {
    const menu = document.getElementById('imdbview-settings');
    if (menu?.open && !menu.contains(event.target)) menu.open = false;
    const share = document.getElementById('imdbview-share');
    if (share && !share.contains(event.target)) closeShare();
  });
  document.addEventListener('keydown', event => {
    const menu = document.getElementById('imdbview-settings');
    if (event.key === 'Escape' && document.getElementById('imdbview-share')?.hidden === false) {
      closeShare();
      shareAnchor?.focus();
    } else if (event.key === 'Escape' && menu?.open) {
      menu.open = false;
      menu.querySelector('summary').focus();
    } else if (event.key === 'Escape') {
      document.body.classList.remove('iv-info-open');
    }
  });
  // 通过样式浮出原生标题、分享和进度，不搬动 React 管理的节点。
  const infoRegions = `#imdbview-chrome-toggle, ${INFO_HEADER}, ${INFO_PROGRESS}`;
  document.addEventListener('pointerover', event => {
    if (!document.body.classList.contains('imdbview')) return;
    if (event.target instanceof Element && event.target.closest(infoRegions)) showChartInfo();
    else scheduleHideChartInfo();
  });
  document.addEventListener('focusin', event => {
    if (!document.body.classList.contains('imdbview')) return;
    if (event.target instanceof Element && event.target.closest(infoRegions)) showChartInfo();
  });
  document.addEventListener('focusout', scheduleHideChartInfo);
  document.addEventListener('pointerout', event => {
    if (!event.relatedTarget) scheduleHideChartInfo();
  });
  // 箭头跟随顶部工具区的边缘；滚出屏幕时回到上沿，仍能找到展开入口。
  window.addEventListener('scroll', positionChromeToggle, { passive: true });
  window.addEventListener('resize', positionChromeToggle);
  window.addEventListener('resize', () => requestAnimationFrame(syncCardActions));

  // IMDb 会在排序、筛选及登录状态变化时重建榜单，合并更新避免反复扫描。
  let scheduled = false;
  const observer = new MutationObserver(records => {
    const own = '#imdbview-progress, #imdbview-settings, #imdbview-share, #imdbview-chrome-toggle, .iv-poster-rating, .iv-chinese-title';
    if (records.every(record => {
      const target = record.target instanceof Element ? record.target : record.target.parentElement;
      if (record.type === 'attributes' && record.attributeName === 'class') {
        if (target === document.body) return target.classList.contains('imdbview') &&
          target.classList.contains('iv-chrome-collapsed') === chromeCollapsed;
        if (!target?.matches('.cli-parent') && !/(?:^|\s)cli-parent(?:\s|$)/.test(record.oldValue || '')) return true;
        return /(?:^|\s)li-compact(?:\s|$)/.test(record.oldValue || '') === target.classList.contains('li-compact');
      }
      if (record.type === 'attributes' && record.attributeName === 'disabled') {
        return target?.id !== 'list-view-option-compact';
      }
      if (target?.closest(own) || target?.closest('.ipc-loader, .ipc-spinner')) return true;
      if ([...record.removedNodes].some(node => node instanceof Element && node.matches(own))) return false;
      const nodes = [...record.addedNodes, ...record.removedNodes];
      return nodes.length > 0 && nodes.every(node => node instanceof Element && node.matches(own));
    })) return;
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      enhance();
    });
  });
  observer.observe(document.documentElement, {
    childList: true, characterData: true, subtree: true,
    attributes: true, attributeOldValue: true,
    attributeFilter: ['aria-valuenow', 'aria-valuemax', 'aria-pressed', 'class', 'disabled'],
  });
  document.addEventListener('DOMContentLoaded', () => { domReady = true; enhance(); }, { once: true });
  // 仅检查关键节点，不周期性扫描卡片；覆盖原站晚到的初始化和整块替换。
  setInterval(() => {
    if (!domReady || !document.body || !/^\/chart\/top\/?$/.test(location.pathname)) return;
    if (!style.isConnected || !document.body.classList.contains('imdbview') ||
        document.body.classList.contains('iv-chrome-collapsed') !== chromeCollapsed ||
        !document.getElementById('imdbview-chrome-toggle') || !document.getElementById('imdbview-settings')) enhance();
  }, 2000);
  enhance();
  }
  if (document.documentElement) initialize();
  else {
    const rootObserver = new MutationObserver(() => {
      if (!document.documentElement) return;
      rootObserver.disconnect();
      initialize();
    });
    rootObserver.observe(document, { childList: true });
  }
})();
