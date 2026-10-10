// ==UserScript==
// @name         豆影 DouView — 豆瓣 Top250 清爽海报墙
// @namespace    https://github.com/muzi-xiaoren/MyScripts
// @version      1.2.0
// @description  将豆瓣电影 Top250 改为清爽海报墙，隐藏广告，保留原生观影操作，可在海报上直接打分，可调整海报大小和卡片间距，可将看过的电影和评分上传到 GitHub。
// @author       muzi-xiaoren
// @match        https://movie.douban.com/top250*
// @run-at       document-end
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      api.github.com
// @homepageURL  https://github.com/muzi-xiaoren/MyScripts/tree/main/douview
// @supportURL   https://github.com/muzi-xiaoren/MyScripts/issues
// @downloadURL  https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/douview/douview.user.js
// @updateURL    https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/douview/douview.user.js
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  if (!/^\/top250\/?$/.test(location.pathname)) return;
  const list = document.querySelector('#content .grid_view');
  const heading = document.querySelector('#content h1');
  if (!list || !heading || document.getElementById('douview-settings')) return;

  const DEFAULTS = { posterWidth: 240, gap: 22 };
  const STORAGE_KEY = 'douview-appearance';
  const stored = GM_getValue(STORAGE_KEY, {}) || {};
  const settings = {
    posterWidth: bounded(stored.posterWidth, 160, 360, DEFAULTS.posterWidth),
    gap: bounded(stored.gap, 8, 40, DEFAULTS.gap),
  };

  function bounded(value, min, max, fallback) {
    return typeof value === 'number' && Number.isFinite(value)
      ? Math.round(Math.min(max, Math.max(min, value))) : fallback;
  }

  const style = document.createElement('style');
  style.id = 'douview-style';
  style.textContent = `
    body.douview {
      --dv-bg: #f5f7f5;
      --dv-panel: #fff;
      --dv-ink: #24382d;
      --dv-soft: #65726a;
      --dv-line: #e3e9e4;
      --dv-green: #28774c;
      width: auto;
      background: var(--dv-bg);
      color: var(--dv-ink);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif;
      font-size: 14px;
      line-height: 1.6;
    }
    .douview #wrapper, .douview #db-nav-movie .nav-primary,
    .douview #db-nav-movie .nav-secondary {
      width: auto;
      max-width: 1280px;
      margin-inline: auto;
      box-sizing: border-box;
      padding-inline: 32px;
    }
    .douview #wrapper { margin-top: 36px; }
    .douview #db-nav-movie, .douview #db-global-nav { min-width: 0; }
    .douview #db-global-nav .global-nav-items ul { display: flex; flex-wrap: wrap; }
    .douview #db-global-nav .global-nav-items li { float: none; }
    .douview #content .article { float: none; width: 100%; padding: 0; }
    .douview #content .aside { display: none; }
    .douview #db-nav-movie { background: var(--dv-panel); margin-bottom: 0; }
    .douview #db-nav-movie .nav-wrap { border-color: var(--dv-line); }
    .douview #db-nav-movie .nav-primary {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      padding-block: 12px;
    }
    .douview #db-nav-movie .nav-logo {
      float: none;
      width: auto;
      height: auto;
      margin: 0;
      background: none;
    }
    .douview #db-nav-movie .nav-logo a {
      display: block;
      width: auto;
      height: auto;
      font-size: 20px;
      font-weight: 600;
      line-height: 1.4;
      color: var(--dv-green);
    }
    .douview #db-nav-movie .nav-search { margin-left: auto; max-width: 100%; }
    .douview #db-nav-movie .nav-search form { margin: 0; }
    .douview #db-nav-movie .nav-search fieldset { min-width: 0; }
    .douview #db-nav-movie .nav-search .inp {
      width: min(320px, 40vw);
      height: 34px;
      border-radius: 8px 0 0 8px;
      background: var(--dv-bg);
    }
    .douview #db-nav-movie #inp-query {
      width: 100%;
      height: 34px;
      box-sizing: border-box;
      background: transparent;
    }
    .douview #db-nav-movie .nav-search .inp-btn { height: 34px; }
    .douview #db-nav-movie .nav-search .inp-btn input {
      width: 46px;
      height: 34px;
      padding: 0;
      text-indent: 0;
      background: var(--dv-green);
      color: #fff;
      font-size: 13px;
      border-radius: 0 8px 8px 0;
      cursor: pointer;
    }
    #douview-navigation { position: relative; }
    #douview-navigation > summary { cursor: pointer; color: var(--dv-soft); }
    .douview-navigation-content {
      position: absolute;
      right: 0;
      top: calc(100% + 14px);
      z-index: 10;
      width: min(480px, calc(100vw - 48px));
      padding: 16px;
      box-sizing: border-box;
      background: var(--dv-panel);
      border: 1px solid var(--dv-line);
      border-radius: 12px;
      box-shadow: 0 12px 36px #24382d18;
    }
    .douview #db-nav-movie .douview-navigation-content .nav-secondary {
      padding: 0;
      margin: 0;
      overflow: visible;
    }
    .douview #db-global-nav { height: auto; margin-bottom: 16px; background: transparent; }
    .douview #db-global-nav a { color: var(--dv-soft); }
    .douview #db-global-nav .top-nav-info,
    .douview #db-global-nav .top-nav-reminder { float: none; }
    .douview #db-global-nav .global-nav-items a { padding: 0 12px 0 0; }
    .douview #db-nav-movie .nav-items ul { display: flex; flex-wrap: wrap; gap: 8px 24px; }
    .douview #db-nav-movie .nav-items li { margin: 0; }
    .douview #db-nav-movie .nav-items a { color: var(--dv-soft); font-size: 13px; }
    .douview #db-nav-movie .movieannual,
    .douview .mobile-app-entrance,
    .douview [id^="dale_movie_top250"],
    .douview #db-global-nav .top-nav-doubanapp { display: none !important; }
    .douview-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
    .douview #content h1 {
      color: var(--dv-green);
      font-size: 13px;
      letter-spacing: 2px;
      font-weight: 500;
      padding: 0;
      margin: 0;
    }
    .douview-intro { margin: 24px 0 12px; color: var(--dv-soft); font-size: 12px; }
    .douview-intro strong { font-weight: 500; }
    .douview-intro p { display: inline; margin-left: 8px; }
    .douview #mine-selector { float: none; display: block; margin: 0; color: var(--dv-soft); }
    .douview #mine-selector input { accent-color: var(--dv-green); margin-right: 8px; }
    #douview-settings {
      position: relative;
      flex-shrink: 0;
      color: var(--dv-soft);
    }
    #douview-settings > summary { width: fit-content; cursor: pointer; color: var(--dv-green); }
    .douview-controls {
      position: absolute;
      right: 0;
      top: calc(100% + 12px);
      z-index: 10;
      display: grid;
      gap: 20px;
      width: min(320px, calc(100vw - 32px));
      padding: 20px;
      box-sizing: border-box;
      background: var(--dv-panel);
      border: 1px solid var(--dv-line);
      border-radius: 12px;
      box-shadow: 0 12px 36px #24382d18;
    }
    .douview-control { display: grid; gap: 8px; width: min(280px, 100%); }
    .douview-control span { display: flex; justify-content: space-between; gap: 12px; }
    .douview-control output { font-variant-numeric: tabular-nums; }
    .douview-control input { width: 100%; margin: 0; accent-color: var(--dv-green); }
    #douview-reset {
      padding: 8px 14px;
      border: 1px solid var(--dv-line);
      border-radius: 8px;
      background: var(--dv-panel);
      color: var(--dv-soft);
      font: inherit;
      cursor: pointer;
    }
    .douview .grid_view {
      display: grid;
      border: 0;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, var(--dv-poster-width)), 1fr));
      gap: var(--dv-gap);
      margin: 0;
      padding: 0;
    }
    .douview .grid_view > li {
      container-type: inline-size;
      margin: 0;
      padding: 0;
      border: 0;
      width: auto;
      min-width: 0;
      list-style: none;
      background: var(--dv-panel);
      border-radius: 14px;
      box-shadow: 0 3px 14px #24382d05;
    }
    .douview .grid_view .item { padding: 0; display: flex; flex-direction: column; height: 100%; }
    .douview .grid_view .pic {
      float: none;
      position: relative;
      width: 100%;
      margin: 0;
      padding: 0;
      overflow: hidden;
      border-radius: 14px 14px 0 0;
    }
    .douview .grid_view .pic > a { display: block; width: 100%; aspect-ratio: 2 / 3; }
    .douview .grid_view .pic img {
      display: block;
      width: 100%;
      height: 100%;
      max-width: none;
      object-fit: contain;
      background: var(--dv-panel);
    }
    .douview .grid_view .pic em {
      position: absolute;
      z-index: 1;
      top: 12px;
      left: 12px;
      width: auto;
      min-width: 22px;
      padding: 4px 8px;
      border-radius: 7px;
      background: #17291cdd;
      color: #fff;
      font-size: 13px;
      font-style: normal;
      text-align: center;
    }
    .douview .grid_view .info {
      margin: 0;
      min-width: 0;
      padding: 16px;
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .douview .grid_view .hd { margin: 0 0 8px; line-height: 1.5; }
    .douview .grid_view .hd a { display: block; background: transparent; color: var(--dv-ink); }
    .douview .grid_view .hd a:hover { color: var(--dv-green); }
    .douview .grid_view .hd .title:first-child { display: block; color: inherit; font-size: 17px; font-weight: 500; }
    .douview .grid_view .hd .title:not(:first-child),
    .douview .grid_view .hd .other { display: block; color: var(--dv-soft); font-size: 11px; }
    .douview .grid_view .hd .other { margin-top: 2px; }
    .douview .grid_view .hd .playable {
      display: inline-block;
      margin-top: 8px;
      padding: 2px 7px;
      border-radius: 5px;
      background: #edf6ed;
      color: var(--dv-green);
      font-size: 11px;
    }
    .douview .grid_view .bd { display: flex; flex-direction: column; flex: 1; }
    .douview .grid_view .bd p { margin: 0 0 10px; font-size: 12px; line-height: 1.7; color: var(--dv-soft); }
    .douview .douview-meta { order: -2; }
    .douview .douview-credits { order: 2; margin: 0 0 12px; font-size: 11px; color: var(--dv-soft); }
    .douview .douview-credits summary { cursor: pointer; }
    .douview .grid_view .douview-credits p { margin-top: 8px; overflow-wrap: anywhere; }
    .douview .douview-rating { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 4px 0 10px; }
    .douview .douview-rating [class^="rating"][class$="-t"] { display: none; }
    .douview .douview-rating .rating_num { color: var(--dv-green); font-size: 20px; font-weight: 500; }
    .douview .douview-rating .rating_num::before { content: '★ '; font-size: 15px; }
    .douview .douview-rating span:last-child { color: var(--dv-soft); font-size: 11px; }
    .douview .grid_view .quote { padding: 0; min-height: 2em; background: none; }
    .douview .grid_view .quote span { background: none; padding: 0; }
    .douview .grid_view .bd .douview-actions {
      order: 3;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin: auto 0 0;
      padding-top: 8px;
    }
    .douview .douview-actions .gact { display: contents; }
    .douview .douview-actions a {
      display: inline-block;
      flex: 1;
      min-width: 54px;
      padding: 7px 10px;
      border: 1px solid var(--dv-line);
      border-radius: 8px;
      color: var(--dv-green);
      background: var(--dv-panel);
      text-align: center;
      font-size: 12px;
    }
    .douview .douview-actions a:hover { color: var(--dv-green); background: #edf6ed; border-color: #b9d7c3; }
    .douview .paginator {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      gap: 8px;
      margin: 36px 0;
      font-size: 13px;
    }
    .douview .paginator a, .douview .paginator .thispage { margin: 0; padding: 6px 12px; border-radius: 7px; }
    .douview .paginator a { color: var(--dv-green); }
    .douview .paginator a:hover { background: #edf6ed; }
    .douview .paginator .thispage { background: var(--dv-green); color: #fff; }
    .douview #footer { border-color: var(--dv-line); color: var(--dv-soft); font-size: 11px; }
    .douview #footer .fright, .douview #footer .fleft { float: none; display: block; margin: 8px 0; }
    @media (max-width: 600px) {
      .douview #wrapper, .douview #db-nav-movie .nav-primary,
      .douview #db-nav-movie .nav-secondary { padding-inline: 16px; }
      .douview #db-nav-movie .nav-search { order: 3; width: 100%; margin-left: 0; }
      .douview #db-nav-movie .nav-search .inp { width: calc(100% - 46px); }
      .douview #db-nav-movie .nav-search fieldset { width: 100%; }
      #douview-navigation { margin-left: auto; }
      .douview #content h1 { font-size: 12px; letter-spacing: 0; }
      .douview .grid_view .info { padding: 12px; }
      .douview .paginator a, .douview .paginator .thispage { padding: 6px 9px; }
    }
    @media (pointer: coarse) {
      .douview .douview-actions a, #douview-reset { min-height: 44px; box-sizing: border-box; }
      .douview-control input { min-height: 44px; }
    }
    /* 顶部沿用 IMDbView 的入口与折叠方式，浮层不占海报空间。 */
    .douview.dv-chrome-collapsed #db-nav-movie { display: none; }
    .douview #content h1[hidden] { display: none !important; }
    #douview-chrome-toggle {
      position: fixed; top: 0; left: 50%; transform: translateX(-50%);
      z-index: 60; padding: 0 16px 10px;
    }
    #douview-chrome-toggle button {
      display: flex; align-items: center; gap: 10px; height: 28px;
      padding: 0 12px; border: 1px solid var(--dv-line); border-radius: 0 0 9px 9px;
      background: #fffffff2; color: var(--dv-green); cursor: pointer;
      font-family: inherit; font-size: 12px; font-weight: 500; line-height: 1.4;
      box-shadow: 0 2px 8px #24382d12;
    }
    #douview-chrome-toggle svg { transition: transform 150ms; }
    .dv-chrome-collapsed #douview-chrome-toggle svg { transform: rotate(180deg); }
    #douview-chrome-toggle {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      min-width: 200px; min-height: 32px; padding: 0 12px 8px;
    }
    #douview-chrome-toggle > * { opacity: 0; pointer-events: none; transition: opacity 150ms; }
    #douview-chrome-toggle:hover > *, #douview-chrome-toggle:focus-within > * {
      opacity: 1; pointer-events: auto;
    }
    .douview #douview-chrome-toggle #mine-selector {
      display: block; margin: 0; padding: 5px 10px; float: none;
      border: 1px solid var(--dv-line); border-radius: 0 0 9px 9px;
      background: #fffffff2; font-size: 12px; line-height: 20px; color: var(--dv-green);
      white-space: nowrap; cursor: pointer;
    }
    .douview #mine-selector a { color: var(--dv-green); background: transparent; }
    #douview-chrome-toggle button { width: 28px; justify-content: center; padding: 0; }
    .douview #db-nav-movie {
      position: relative; z-index: 40; overflow: visible; border-bottom: 1px solid var(--dv-line);
      padding-top: 32px;
    }
    .douview #db-nav-movie .nav-wrap, .douview #db-nav-movie .nav-primary {
      overflow: visible; height: auto;
    }
    .douview #db-nav-movie .nav-primary { gap: 12px; padding-block: 16px; }
    .douview #db-nav-movie .nav-search { flex: 0 1 340px; padding: 0; }
    .douview #db-nav-movie .nav-search form { width: 100%; }
    .douview #db-nav-movie .nav-search fieldset {
      display: flex; align-items: center; margin: 0; padding: 0;
      border: 1px solid var(--dv-line); border-radius: 10px; overflow: hidden;
      height: 38px; width: 100%; box-sizing: border-box; background: var(--dv-bg);
    }
    .douview #db-nav-movie .nav-search fieldset:focus-within { border-color: #8eb59b; }
    .douview #db-nav-movie .nav-search .inp {
      flex: 1; float: none; width: auto; min-width: 0; height: 36px;
      padding: 0; border: 0; background: transparent; border-radius: 0;
    }
    .douview #db-nav-movie #inp-query {
      height: 36px; padding: 0 12px; border: 0; outline: none; margin: 0;
      font: 13px/36px -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif;
      box-shadow: none;
    }
    .douview #db-nav-movie #inp-query::placeholder { color: #89958d; }
    .douview #db-nav-movie .nav-search .inp-btn {
      flex: 0 0 52px; float: none; position: static; height: 36px; width: 52px;
      margin: 0; padding: 0; background: transparent;
    }
    .douview #db-nav-movie .nav-search .inp-btn input {
      display: block; width: 52px; height: 36px; padding: 0; margin: 0;
      border: 0; border-left: 1px solid var(--dv-line); border-radius: 0;
      background: transparent; color: var(--dv-green); font-size: 12px; font-weight: 600;
      text-indent: 0; line-height: 36px;
    }
    .douview #db-nav-movie .nav-search .inp-btn input:hover { background: #eaf3ec; }
    #douview-navigation > summary, #douview-settings > summary {
      display: flex; align-items: center; gap: 6px; list-style: none;
      padding: 9px 10px; border: 1px solid var(--dv-line); border-radius: 9px;
      font-size: 12px; line-height: 18px; color: var(--dv-soft); background: var(--dv-panel);
      cursor: pointer; white-space: nowrap;
    }
    #douview-navigation > summary::-webkit-details-marker,
    #douview-settings > summary::-webkit-details-marker { display: none; }
    #douview-navigation > summary::after { content: '⌄'; }
    #douview-navigation[open] > summary { color: var(--dv-green); background: var(--dv-bg); }
    .douview-navigation-content {
      position: fixed; top: var(--dv-menu-top, 72px); left: var(--dv-menu-left, 16px);
      right: auto; z-index: 100; width: min(420px, calc(100vw - 32px));
      max-height: calc(100dvh - var(--dv-menu-top, 72px) - 16px); overflow: auto;
      padding: 18px; text-align: left;
    }
    .douview #db-nav-movie .douview-navigation-content #db-global-nav,
    .douview #db-nav-movie .douview-navigation-content .nav-secondary {
      position: static; display: block; width: auto; min-width: 0; max-width: 100%;
      height: auto; margin: 0; padding: 0; border: 0; background: transparent;
      overflow: visible; box-sizing: border-box;
    }
    .douview #db-nav-movie .douview-navigation-content #db-global-nav {
      padding-bottom: 12px; margin-bottom: 12px; border-bottom: 1px solid var(--dv-line);
    }
    .douview .douview-navigation-content #db-global-nav .top-nav-info,
    .douview .douview-navigation-content #db-global-nav .top-nav-reminder,
    .douview .douview-navigation-content #db-global-nav .global-nav-items {
      position: relative; float: none; display: block; margin: 0; padding: 0;
    }
    .douview .douview-navigation-content #db-global-nav a {
      display: inline-block; padding: 4px 8px; line-height: 24px; color: var(--dv-soft);
    }
    .douview .douview-navigation-content #db-global-nav ul,
    .douview .douview-navigation-content .nav-items ul {
      display: flex; flex-wrap: wrap; gap: 4px 12px; margin: 0; padding: 0;
    }
    .douview .douview-navigation-content .nav-items a { display: block; padding: 4px 0; }
    #douview-settings { margin: 0; }
    @media (max-width: 600px) {
      .douview #db-nav-movie .nav-search { flex-basis: 100%; order: 4; width: 100%; }
      .douview #db-nav-movie .nav-search .inp { width: auto; }
      #douview-navigation { margin-left: auto; }
    }
    @media (hover: none) {
      #douview-chrome-toggle > * { opacity: 1; pointer-events: auto; }
    }
    .douview .grid_view .info { padding: 14px; gap: 6px; }
    .douview .grid_view .hd { margin: 0; position: relative; }
    .douview .grid_view .hd .title:first-child {
      display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2;
      overflow: hidden; min-height: 48px; font-size: 16px; line-height: 24px; font-weight: 600;
    }
    .douview .grid_view .hd .title:not(:first-child) {
      display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      height: 18px; margin-top: 2px; font-size: 11px; line-height: 18px;
    }
    .douview .grid_view .hd .other { display: none; }
    .douview .grid_view .hd .playable {
      position: absolute; bottom: calc(100% + 26px); right: 0; margin: 0;
      background: #fffffff2; border: 1px solid #e3e9e4; padding: 2px 7px;
    }
    .douview .grid_view .bd { gap: 8px; }
    .douview .grid_view .bd .douview-meta {
      margin: 0; font-size: 11px; line-height: 18px; white-space: nowrap;
      overflow: hidden; text-overflow: ellipsis;
    }
    .douview .douview-rating { margin: 0; gap: 8px; min-height: 28px; }
    .douview .douview-rating .rating_num { font-size: 19px; line-height: 28px; }
    .douview .douview-rating span:last-child { font-size: 10px; }
    .douview .grid_view .bd > .quote { display: none; }
    .douview .douview-credits { order: 2; margin: 0; font-size: 11px; }
    .douview .douview-credits > summary {
      width: fit-content; padding: 3px 0; color: var(--dv-soft); cursor: pointer;
    }
    .douview .douview-credits[open] > summary { color: var(--dv-green); }
    .douview .douview-credits .douview-full-info {
      padding: 10px; margin-top: 6px; border-radius: 8px; background: var(--dv-bg);
    }
    .douview .douview-credits .douview-full-info p {
      margin: 0 0 8px; font-size: 11px; overflow-wrap: anywhere;
    }
    .douview .douview-credits .douview-full-info p:last-child { margin-bottom: 0; }
    .douview .grid_view .bd .douview-actions { padding-top: 8px; }
    .douview .douview-actions a { padding: 6px 10px; }
    /* 按实际卡片宽度缩放文字，避免窄海报字号过大；上下限保持可读性。 */
    .douview .grid_view .hd .title:first-child {
      font-size: clamp(13px, calc(10px + 2.5cqw), 19px);
      line-height: 1.5; min-height: 3em;
    }
    .douview .grid_view .hd .title:not(:first-child),
    .douview .grid_view .bd .douview-meta,
    .douview .douview-credits,
    .douview .douview-credits .douview-full-info p,
    .douview .grid_view .hd .playable {
      font-size: clamp(10px, calc(7px + 1.67cqw), 13px); line-height: 1.6;
    }
    .douview .grid_view .hd .title:not(:first-child) { height: 1.6em; }
    .douview .douview-rating { min-height: 1.6em; }
    .douview .douview-rating .rating_num {
      font-size: clamp(16px, calc(10px + 3.75cqw), 24px); line-height: 1.5;
    }
    .douview .douview-rating .rating_num::before { font-size: .8em; }
    .douview .douview-rating span:last-child {
      font-size: clamp(10px, calc(6px + 1.67cqw), 12px);
    }
    .douview .douview-actions a { font-size: clamp(11px, calc(6px + 2.5cqw), 15px); }
    .douview .grid_view .pic em { font-size: clamp(11px, calc(7px + 2.5cqw), 16px); }
    /* C 方案：海报评分叠层，短评直显，详情与原生操作共用一行。 */
    .douview .grid_view .info { padding: clamp(10px, 4cqw, 14px); gap: 4px; }
    .douview .grid_view .hd .title:first-child { min-height: 0; }
    .douview .grid_view .hd .title:not(:first-child) { display: none; }
    .douview .grid_view .bd { gap: 4px; }
    .douview .grid_view .pic .douview-rating {
      position: absolute; right: 10px; bottom: 10px; z-index: 1;
      margin: 0; min-height: 0; padding: 3px 8px; border-radius: 7px;
      background: #17291ce8; pointer-events: none;
    }
    .douview .grid_view .pic .douview-rating > :not(.rating_num) { display: none; }
    .douview .grid_view .pic .douview-rating .rating_num {
      color: #fff; font-size: clamp(14px, calc(8px + 3cqw), 20px); line-height: 1.5;
    }
    .douview .grid_view .pic .playable {
      position: absolute; top: 10px; right: 10px; bottom: auto;
      margin: 0; padding: 2px 6px; border-radius: 5px; background: #fffffff2;
      color: var(--dv-green); font-size: clamp(10px, calc(7px + 1.67cqw), 13px);
    }
    .douview .grid_view .bd > .quote {
      display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2;
      overflow: hidden; min-height: 0; margin: 0; padding: 0;
      font-size: clamp(11px, calc(7px + 1.67cqw), 13px); line-height: 1.6;
    }
    .douview .douview-card-footer {
      display: flex; flex-wrap: wrap; align-items: center; gap: 6px;
      margin-top: auto; padding-top: 4px; order: 3;
    }
    .douview .douview-card-footer .douview-credits { flex: 0 0 auto; }
    .douview .douview-card-footer .douview-credits[open] { flex-basis: 100%; }
    .douview .douview-card-footer .douview-actions {
      flex: 1; flex-wrap: nowrap; gap: 4px; min-width: 0; margin: 0; padding: 0;
    }
    .douview .douview-card-footer .douview-actions a {
      flex: 1 1 0; min-width: 0; padding: 4px 3px; box-sizing: border-box;
      white-space: nowrap; font-size: clamp(10px, calc(6px + 2.5cqw), 14px);
    }
    .douview .paginator[hidden] { display: none !important; }
    .douview-page-size {
      display: flex; flex-wrap: wrap; justify-content: center; align-items: center;
      gap: 10px; margin: 24px 0 12px; color: var(--dv-soft); font-size: 12px;
    }
    .douview-page-size select, .douview-page-size button {
      border: 1px solid var(--dv-line); border-radius: 8px; padding: 6px 10px;
      background: var(--dv-panel); color: var(--dv-green); font: inherit; cursor: pointer;
    }
    .douview-page-size [role="status"] { text-align: center; }
    .douview-page-size label { white-space: nowrap; }
    .douview a:focus-visible, .douview button:focus-visible, .douview summary:focus-visible {
      outline: 2px solid var(--dv-green); outline-offset: 3px;
    }
    @media (max-width: 600px) {
      .douview .douview-controls { right: -1px; width: min(300px, calc(100vw - 60px)); }
    }
    @media (prefers-reduced-motion: reduce) {
      #douview-chrome-toggle svg, #douview-chrome-toggle > * { transition: none; }
    }
    .douview .grid_view .pic .douview-my-rating {
      position: absolute; left: 10px; bottom: 10px; z-index: 2; display: flex;
      padding: 1px 5px; border-radius: 7px; background: #17291ce8;
    }
    .douview-my-rating button {
      margin: 0; padding: 0 1px; border: 0; background: none; color: #ffffff59; cursor: pointer;
      font: inherit; font-size: clamp(11px, calc(6px + 2.5cqw), 18px); line-height: 1.5;
    }
    .douview-my-rating button.on { color: #ffc94d; }
    .douview-my-rating:hover button { color: #ffffff59; }
    .douview-my-rating:hover button:hover,
    .douview-my-rating:hover button:has(~ button:hover) { color: #ffc94d; }
    .douview-my-rating[aria-busy="true"] { opacity: .6; pointer-events: none; }
    #douview-sync { position: relative; flex-shrink: 0; margin: 0; color: var(--dv-soft); }
    #douview-sync > summary {
      display: flex; align-items: center; gap: 6px; list-style: none;
      padding: 9px 10px; border: 1px solid var(--dv-line); border-radius: 9px;
      font-size: 12px; line-height: 18px; color: var(--dv-green); background: var(--dv-panel);
      cursor: pointer; white-space: nowrap;
    }
    #douview-sync > summary::-webkit-details-marker { display: none; }
    #douview-sync .douview-controls {
      position: fixed; left: var(--dv-menu-left, 16px); top: var(--dv-menu-top, 72px); right: auto; z-index: 100;
      gap: 12px; width: min(340px, calc(100vw - 32px));
      max-height: calc(100dvh - var(--dv-menu-top, 72px) - 16px); overflow: auto;
    }
    #douview-sync label { display: grid; gap: 6px; color: var(--dv-ink); font-size: 13px; }
    #douview-sync input {
      width: 100%; box-sizing: border-box; padding: 7px 9px; border: 1px solid var(--dv-line);
      border-radius: 7px; background: var(--dv-bg); color: var(--dv-ink); font: inherit;
    }
    #douview-sync .douview-sync-actions { display: flex; gap: 8px; }
    #douview-sync button {
      padding: 7px 12px; border: 1px solid var(--dv-line); border-radius: 8px;
      background: var(--dv-panel); color: var(--dv-soft); font: inherit; cursor: pointer;
    }
    #douview-sync button[data-action="upload"] { background: var(--dv-green); border-color: var(--dv-green); color: #fff; }
    #douview-sync button:disabled { cursor: progress; opacity: .6; }
    #douview-sync [role="status"] { margin: 0; font-size: 12px; overflow-wrap: anywhere; }
    #douview-sync [role="status"]:empty { display: none; }
  `;
  document.head.appendChild(style);
  document.body.classList.add('douview');

  const intro = document.createElement('div');
  intro.className = 'douview-intro';
  intro.innerHTML = '<strong>好电影，值得慢慢看。</strong><p>在光影里，遇见另一个世界。</p>';
  const footer = document.querySelector('#footer');
  if (footer) footer.before(intro);
  else list.after(intro);

  // 移动原导航节点，保留链接与账号操作；展开时覆盖页面，不推挤海报。
  const primaryNav = document.querySelector('#db-nav-movie .nav-primary');
  const secondaryNav = document.querySelector('#db-nav-movie .nav-secondary');
  const globalNav = document.querySelector('#db-global-nav');
  const navigation = document.createElement('details');
  navigation.id = 'douview-navigation';
  navigation.innerHTML = '<summary>导航与账号</summary><div class="douview-navigation-content"></div>';
  if (primaryNav) {
    const content = navigation.querySelector('.douview-navigation-content');
    if (globalNav) content.append(globalNav);
    if (secondaryNav) content.append(secondaryNav);
    primaryNav.append(navigation);
  }

  const panel = document.createElement('details');
  panel.id = 'douview-settings';
  panel.innerHTML = `
    <summary>外观设置</summary>
    <div class="douview-controls">
      <label class="douview-control">
        <span>海报大小（目标宽度）<output id="douview-width-value" for="douview-width"></output></span>
        <input id="douview-width" type="range" min="160" max="360" step="10">
      </label>
      <label class="douview-control">
        <span>卡片间距<output id="douview-gap-value" for="douview-gap"></output></span>
        <input id="douview-gap" type="range" min="8" max="40" step="2">
      </label>
      <button id="douview-reset" type="button">恢复默认</button>
    </div>
  `;
  const filter = document.querySelector('#mine-selector');
  heading.hidden = true;
  if (primaryNav) primaryNav.append(panel);
  else list.before(panel);

  const sync = document.createElement('details');
  sync.id = 'douview-sync';
  sync.innerHTML = `
    <summary>GitHub 同步</summary>
    <div class="douview-controls">
      <label>GitHub Token<input name="token" type="password" autocomplete="off" spellcheck="false" placeholder="github_pat_…"></label>
      <label>仓库地址<input name="repo" type="url" spellcheck="false" placeholder="https://github.com/owner/repo"></label>
      <label>分支（可选）<input name="branch" spellcheck="false" placeholder="默认分支"></label>
      <label>文件路径（可选）<input name="path" spellcheck="false" placeholder="movies/douban"></label>
      <div class="douview-sync-actions"><button type="button" data-action="save">保存</button><button type="button" data-action="upload">上传看过的电影</button></div>
      <p role="status" aria-live="polite"></p>
    </div>
  `;
  panel.after(sync);

  let chromeCollapsed = GM_getValue('douview-chrome-collapsed', true) === true;
  const toggle = document.createElement('div');
  toggle.id = 'douview-chrome-toggle';
  toggle.innerHTML = '<button type="button" aria-controls="db-nav-movie"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 15 6-6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>';
  if (filter) {
    const oldContainer = filter.parentElement;
    // 原站可能使用 span 包住复选框；用 label 让整段文字都能直接点击。
    if (!filter.matches('label') && !filter.querySelector('label') && filter.querySelector('input[type="checkbox"]')) {
      const filterLabel = document.createElement('label');
      filterLabel.append(...filter.childNodes);
      filter.append(filterLabel);
    }
    toggle.prepend(filter);
    if (!oldContainer.textContent.trim() && !oldContainer.querySelector('input, a, button')) oldContainer.remove();
  }
  const toggleButton = toggle.querySelector('button');
  function updateChrome() {
    document.body.classList.toggle('dv-chrome-collapsed', chromeCollapsed);
    toggleButton.setAttribute('aria-expanded', String(!chromeCollapsed));
    const label = `${chromeCollapsed ? '展开' : '收起'}搜索、导航与账号`;
    toggleButton.setAttribute('aria-label', label);
  }
  function positionMenu(menu, maxWidth) {
    if (!menu.open) return;
    const anchor = menu.querySelector('summary').getBoundingClientRect();
    const menuWidth = Math.min(maxWidth, window.innerWidth - 32);
    const left = Math.max(16, Math.min(anchor.right - menuWidth, window.innerWidth - menuWidth - 16));
    const top = Math.max(8, Math.min(anchor.bottom + 8, window.innerHeight - 100));
    menu.style.setProperty('--dv-menu-left', `${left}px`);
    menu.style.setProperty('--dv-menu-top', `${top}px`);
  }
  function positionNavigation() {
    positionMenu(navigation, 420);
    positionMenu(sync, 340);
  }
  navigation.addEventListener('toggle', positionNavigation);
  sync.addEventListener('toggle', positionNavigation);
  window.addEventListener('resize', positionNavigation);
  window.addEventListener('scroll', positionNavigation, { passive: true });
  toggleButton.addEventListener('click', () => {
    chromeCollapsed = !chromeCollapsed;
    panel.open = false;
    sync.open = false;
    navigation.open = false;
    updateChrome();
    GM_setValue('douview-chrome-collapsed', chromeCollapsed);
  });
  document.body.append(toggle);
  updateChrome();

  const menus = [panel, sync, navigation];
  document.addEventListener('click', event => {
    menus.forEach(menu => { if (!menu.contains(event.target)) menu.open = false; });
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    menus.forEach(menu => {
      if (!menu.open) return;
      const restoreFocus = menu.contains(document.activeElement);
      menu.open = false;
      if (restoreFocus) menu.querySelector('summary').focus();
    });
  });
  const widthInput = panel.querySelector('#douview-width');
  const gapInput = panel.querySelector('#douview-gap');

  function applySettings() {
    document.body.style.setProperty('--dv-poster-width', `${settings.posterWidth}px`);
    document.body.style.setProperty('--dv-gap', `${settings.gap}px`);
    widthInput.value = settings.posterWidth;
    gapInput.value = settings.gap;
    panel.querySelector('#douview-width-value').value = `${settings.posterWidth} px`;
    panel.querySelector('#douview-gap-value').value = `${settings.gap} px`;
  }

  panel.addEventListener('input', event => {
    if (event.target === widthInput) settings.posterWidth = Number(widthInput.value);
    else if (event.target === gapInput) settings.gap = Number(gapInput.value);
    else return;
    applySettings();
  });
  panel.addEventListener('change', () => GM_setValue(STORAGE_KEY, { ...settings }));
  panel.querySelector('#douview-reset').addEventListener('click', () => {
    Object.assign(settings, DEFAULTS);
    applySettings();
    GM_setValue(STORAGE_KEY, { ...settings });
  });
  applySettings();

  const loggedIn = Boolean(document.querySelector('.nav-user-account'));
  const RATINGS_KEY = 'douview-my-ratings';
  const storedRatings = GM_getValue(RATINGS_KEY, null);
  const myRatings = storedRatings && typeof storedRatings.ratings === 'object'
    ? storedRatings : { updatedAt: 0, ratings: {} };
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  function subjectId(item) {
    return item.querySelector('.pic a[href]')?.getAttribute('href').match(/\/subject\/(\d+)/)?.[1];
  }

  function renderStars(widget, id) {
    const rating = myRatings.ratings[id] || 0;
    widget.querySelectorAll('button').forEach(button => button.classList.toggle('on', Number(button.dataset.star) <= rating));
    widget.title = rating ? `我的评分：${rating} 星，点击星星修改` : '点击星星标记为看过并打分';
  }

  function addRatingStars(item) {
    const poster = item.querySelector('.pic');
    const id = subjectId(item);
    if (!loggedIn || !poster || !id || poster.querySelector('.douview-my-rating')) return;
    const widget = document.createElement('div');
    widget.className = 'douview-my-rating';
    widget.dataset.subject = id;
    widget.setAttribute('role', 'group');
    widget.setAttribute('aria-label', '我的评分');
    for (let star = 1; star <= 5; star++) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.star = String(star);
      button.textContent = '★';
      button.setAttribute('aria-label', `评 ${star} 星`);
      widget.append(button);
    }
    widget.addEventListener('click', event => {
      const button = event.target instanceof Element ? event.target.closest('button[data-star]') : null;
      if (button) void submitRating(widget, id, Number(button.dataset.star));
    });
    renderStars(widget, id);
    poster.append(widget);
  }

  async function submitRating(widget, id, stars) {
    if (widget.getAttribute('aria-busy') === 'true') return;
    widget.setAttribute('aria-busy', 'true');
    try {
      await rateSubject(id, stars);
      myRatings.ratings[id] = stars;
      GM_setValue(RATINGS_KEY, myRatings);
      list.querySelectorAll(`.douview-my-rating[data-subject="${id}"]`).forEach(element => renderStars(element, id));
    } catch (error) {
      alert(`豆瓣打分失败：${error.message}`);
    } finally {
      widget.removeAttribute('aria-busy');
    }
  }

  // 沿用原站收藏弹窗的表单：先读取现有短评、标签和可见性，只替换星级，避免覆盖已有内容。
  async function rateSubject(id, stars) {
    const headers = { 'X-Requested-With': 'XMLHttpRequest' };
    const formResponse = await fetch(`/j/subject/${id}/interest?interest=collect`, { credentials: 'same-origin', headers });
    const formData = await formResponse.json().catch(() => null);
    if (formResponse.status === 403) throw new Error('请先登录豆瓣');
    const form = formData?.html && new DOMParser().parseFromString(formData.html, 'text/html').querySelector('form');
    if (!formResponse.ok || !form) throw new Error('没有读取到收藏表单');
    const body = new URLSearchParams();
    form.querySelectorAll('input[name], textarea[name], select[name]').forEach(field => {
      if (/share|sync/i.test(field.name) || ['submit', 'button', 'image'].includes(field.type)) return;
      if (['checkbox', 'radio'].includes(field.type) && !field.checked) return;
      body.append(field.name, field.value);
    });
    body.set('interest', 'collect');
    body.set('rating', String(stars));
    if (!body.get('ck')) {
      const ck = document.cookie.match(/(?:^|;\s*)ck=([^;]+)/)?.[1];
      if (!ck) throw new Error('缺少登录校验参数，请刷新页面后重试');
      body.set('ck', decodeURIComponent(ck));
    }
    const action = new URL(form.getAttribute('action') || `/j/subject/${id}/interest`, location.href);
    if (action.origin !== location.origin) throw new Error('收藏表单地址异常');
    const response = await fetch(action.href, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body,
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result || result.r) throw new Error(`豆瓣返回 ${response.status}`);
  }

  async function doubanUserId() {
    const response = await fetch('/mine', { credentials: 'same-origin' });
    const page = response.ok ? new DOMParser().parseFromString(await response.text(), 'text/html') : null;
    const link = page?.querySelector('a[href*="/people/"][href$="/collect"]')?.getAttribute('href');
    const id = (response.url + ' ' + (link || '')).match(/\/people\/([^/?#\s]+)/)?.[1];
    if (!id) throw new Error('没有识别到豆瓣账号，请先登录');
    return decodeURIComponent(id);
  }

  // 豆瓣「看过」列表模式每页 30 条，按标记时间顺序读取；间隔请求，降低触发验证的概率。
  async function collectDoubanMovies(onProgress) {
    const uid = await doubanUserId();
    const movies = new Map();
    let start = 0;
    let total = Infinity;
    while (start < total) {
      onProgress(`正在读取豆瓣看过的电影：${movies.size}${Number.isFinite(total) ? ` / ${total}` : ''} 部…`);
      const url = `/people/${encodeURIComponent(uid)}/collect?start=${start}&sort=time&rating=all&filter=all&mode=list&type=all`;
      const response = await fetch(url, { credentials: 'same-origin', signal: AbortSignal.timeout(15000) });
      if (!response.ok || !new URL(response.url).pathname.startsWith('/people/')) {
        throw new Error(`豆瓣拒绝了请求（${response.status}），可能需要验证，请稍后再试`);
      }
      const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
      const count = Number(doc.querySelector('.subject-num')?.textContent.match(/\/\s*(\d+)/)?.[1]);
      if (Number.isFinite(count)) total = count;
      const items = Array.from(doc.querySelectorAll('li.item'));
      const before = movies.size;
      items.forEach(item => {
        const link = item.querySelector('.title a[href*="/subject/"]');
        const id = link?.getAttribute('href').match(/\/subject\/(\d+)/)?.[1];
        if (!id || movies.has(id)) return;
        const stars = Number(item.querySelector('[class^="rating"][class$="-t"]')?.className.match(/rating(\d)-t/)?.[1]);
        movies.set(id, {
          id,
          title: link.textContent.replace(/\s+/g, ' ').trim(),
          year: Number(item.querySelector('.intro')?.textContent.match(/\b(?:18|19|20)\d{2}\b/)?.[0]) || null,
          myRating: stars >= 1 && stars <= 5 ? stars : null,
          markedAt: item.querySelector('.date')?.textContent.match(/\d{4}-\d{2}-\d{2}/)?.[0] || null,
          url: `https://movie.douban.com/subject/${id}/`,
        });
      });
      // 下架条目会被隐藏，单页可能不足 30 条，偏移量仍按固定页长前进。
      if (!items.length || (movies.size === before && !Number.isFinite(total))) break;
      start += 30;
      if (start < total) await sleep(800);
    }
    const ratings = {};
    movies.forEach(movie => { if (movie.myRating) ratings[movie.id] = movie.myRating; });
    Object.assign(myRatings, { updatedAt: Date.now(), ratings });
    GM_setValue(RATINGS_KEY, myRatings);
    list.querySelectorAll('.douview-my-rating').forEach(widget => renderStars(widget, widget.dataset.subject));
    return Array.from(movies.values());
  }

  const SYNC_KEY = 'douview-github';
  const syncStatus = sync.querySelector('[role="status"]');
  const uploadButton = sync.querySelector('[data-action="upload"]');
  const savedSync = GM_getValue(SYNC_KEY, {}) || {};
  sync.querySelectorAll('input').forEach(input => { input.value = typeof savedSync[input.name] === 'string' ? savedSync[input.name] : ''; });

  function saveSyncConfig() {
    const config = {};
    sync.querySelectorAll('input').forEach(input => { config[input.name] = input.value.trim(); });
    GM_setValue(SYNC_KEY, config);
    return config;
  }

  function parseRepository(value) {
    const match = value.trim().match(/^(?:https?:\/\/github\.com\/|git@github\.com:)?([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/i);
    return match ? { owner: match[1], repo: match[2] } : null;
  }

  function githubRequest(method, url, token, body) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method,
        url,
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        data: body ? JSON.stringify(body) : undefined,
        anonymous: true,
        timeout: 30000,
        onload(response) {
          let json = null;
          try { json = JSON.parse(response.responseText); } catch { /* 非 JSON 响应只看状态码 */ }
          resolve({ status: response.status, json });
        },
        onerror: () => reject(new Error('无法连接 GitHub')),
        ontimeout: () => reject(new Error('连接 GitHub 超时')),
      });
    });
  }

  function base64Utf8(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(binary);
  }

  async function putGithubFile({ token, owner, repo, branch, path, content, message }) {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}`;
    const result = await githubRequest('PUT', url, token, { message, content: base64Utf8(content), ...(branch ? { branch } : {}) });
    if (result.status !== 200 && result.status !== 201) throw githubError(result);
  }

  function uploadStamp(date = new Date()) {
    const pad = value => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  }

  function githubError(response) {
    const reason = { 401: 'Token 无效或已过期', 403: 'Token 没有写入权限', 404: '找不到仓库或分支，或 Token 无权访问', 409: '仓库正在被修改，请重试', 422: '同名文件已存在，或分支、路径无效' }[response.status];
    return new Error(`GitHub 返回 ${response.status}：${reason || response.json?.message || '请求失败'}`);
  }

  function markdownText(value) {
    return String(value ?? '').replace(/[\\|[\]]/g, '\\$&').replace(/\s+/g, ' ').trim();
  }

  function buildDoubanFiles(movies) {
    const exportedAt = new Date().toISOString();
    const byDate = (a, b) => (b.markedAt || '').localeCompare(a.markedAt || '') || a.title.localeCompare(b.title, 'zh');
    const rated = movies.filter(movie => movie.myRating !== null).sort((a, b) => b.myRating - a.myRating || byDate(a, b));
    rated.forEach((movie, index) => {
      movie.rank = index > 0 && movie.myRating === rated[index - 1].myRating ? rated[index - 1].rank : index + 1;
    });
    const unrated = movies.filter(movie => movie.myRating === null).sort(byDate);
    unrated.forEach(movie => { movie.rank = null; });
    const ranked = [...rated, ...unrated];
    const json = {
      source: 'douban',
      ratingScale: 5,
      exportedAt,
      total: ranked.length,
      rated: rated.length,
      movies: ranked.map(({ rank, id, title, year, myRating, markedAt, url }) => ({ rank, id, title, year, myRating, markedAt, url })),
    };
    const markdown = [
      '# 豆瓣看过的电影',
      '',
      `共 ${json.total} 部，已评分 ${json.rated} 部，按我的评分（5 星制）从高到低排列。导出时间：${exportedAt}`,
      '',
      '| 排名 | 片名 | 年份 | 我的评分 | 标记日期 |',
      '| ---: | --- | ---: | --- | --- |',
      ...ranked.map(movie => `| ${movie.rank ?? '—'} | [${markdownText(movie.title)}](${movie.url}) | ${movie.year ?? ''} | ${movie.myRating ? '★'.repeat(movie.myRating) : '未评分'} | ${movie.markedAt ?? ''} |`),
      '',
    ].join('\n');
    return { json: `${JSON.stringify(json, null, 2)}\n`, markdown };
  }

  let syncing = false;
  async function uploadWatched() {
    if (syncing) return;
    const config = saveSyncConfig();
    const repository = parseRepository(config.repo || '');
    if (!config.token) { syncStatus.textContent = '请填写 GitHub Token。'; return; }
    if (!repository) { syncStatus.textContent = '仓库地址格式应为 https://github.com/owner/repo。'; return; }
    if (!loggedIn) { syncStatus.textContent = '请先登录豆瓣。'; return; }
    const path = (config.path || 'movies/douban').replace(/^\/+|\/+$/g, '').replace(/\.(?:json|md)$/i, '') + `-${uploadStamp()}`;
    syncing = true;
    uploadButton.disabled = true;
    try {
      const movies = await collectDoubanMovies(text => { syncStatus.textContent = text; });
      const files = buildDoubanFiles(movies);
      const target = { token: config.token, ...repository, branch: config.branch, message: `Update Douban watched movies (${movies.length})` };
      syncStatus.textContent = `正在上传 ${path}.json…`;
      await putGithubFile({ ...target, path: `${path}.json`, content: files.json });
      syncStatus.textContent = `正在上传 ${path}.md…`;
      await putGithubFile({ ...target, path: `${path}.md`, content: files.markdown });
      syncStatus.textContent = `已上传 ${movies.length} 部（已评分 ${movies.filter(movie => movie.myRating !== null).length} 部）到 ${repository.owner}/${repository.repo}：${path}.json / .md。`;
    } catch (error) {
      syncStatus.textContent = `上传失败：${error.message}`;
    } finally {
      syncing = false;
      uploadButton.disabled = false;
    }
  }

  sync.querySelector('[data-action="save"]').addEventListener('click', () => {
    saveSyncConfig();
    syncStatus.textContent = '已保存。';
  });
  uploadButton.addEventListener('click', () => void uploadWatched());

  // 海报星级来自「看过」列表缓存；缓存缺失或超过 7 天时在后台刷新一次。
  async function refreshMyRatings() {
    if (syncing) return;
    syncing = true;
    uploadButton.disabled = true;
    try {
      await collectDoubanMovies(text => { syncStatus.textContent = text; });
      syncStatus.textContent = '';
    } catch (error) {
      syncStatus.textContent = `读取我的评分失败：${error.message}`;
    } finally {
      syncing = false;
      uploadButton.disabled = false;
    }
  }

  function decorateCards() {
    list.querySelectorAll('.item').forEach(item => {
      addRatingStars(item);
      const rating = item.querySelector('.rating_num');
      if (rating) {
        rating.parentElement.classList.add('douview-rating');
        const votes = rating.parentElement.querySelector('span:last-child');
        if (votes && votes !== rating && !votes.dataset.douviewVotes) {
          const original = votes.textContent.trim();
          const count = original.match(/^(\d+)人评价$/)?.[1];
          if (count) {
            votes.dataset.douviewVotes = original;
            votes.title = original;
            votes.textContent = Number(count) >= 10000
              ? `${(Number(count) / 10000).toFixed(1)}万评价` : original;
          }
        }
      }

      // 保留原节点和事件；豆瓣更新收藏区域时，也重新识别所有原生操作。
      item.querySelectorAll('.gact').forEach(action => {
        const paragraph = action.closest('p');
        if (paragraph) paragraph.classList.add('douview-actions');
      });

      if (item.dataset.douviewDecorated) return;
      item.dataset.douviewDecorated = 'true';
      const description = item.querySelector('.bd > p:not(.quote):not(.douview-actions)');
      const lineBreak = description?.querySelector('br');
      if (!lineBreak) return;

      // 简短年份与类型留在卡片，完整信息保存在可展开区域。
      const metadata = document.createElement('p');
      metadata.className = 'douview-meta';
      let node = lineBreak.nextSibling;
      while (node) {
        const next = node.nextSibling;
        metadata.appendChild(node);
        node = next;
      }
      lineBreak.remove();
      const fullMetadata = metadata.textContent.replace(/\s+/g, ' ').trim();
      const parts = fullMetadata.split(/\s*\/\s*/);
      const year = parts[0]?.match(/\b\d{4}\b/)?.[0];
      const genres = parts.length >= 3 ? parts.slice(2).join(' / ').trim().split(/\s+/).slice(0, 2).join(' · ') : '';
      metadata.title = fullMetadata;
      metadata.textContent = year && genres ? `${year} · ${genres}` : fullMetadata;
      const credits = document.createElement('details');
      credits.className = 'douview-credits';
      const summary = document.createElement('summary');
      summary.textContent = '影片信息';
      description.before(metadata, credits);
      const fullInfo = document.createElement('div');
      fullInfo.className = 'douview-full-info';
      const fullMeta = document.createElement('p');
      fullMeta.textContent = fullMetadata;
      fullInfo.append(fullMeta, description);
      const titleLink = item.querySelector('.hd a');
      if (titleLink) {
        titleLink.title = titleLink.textContent.replace(/\s+/g, ' ').trim();
        const originalTitle = titleLink.querySelector('.title:not(:first-child)');
        if (originalTitle) originalTitle.textContent = originalTitle.textContent.replace(/^\s*\/\s*/, '').trim();
        const fullTitle = document.createElement('p');
        fullTitle.textContent = Array.from(titleLink.querySelectorAll('.title'))
          .map(node => node.textContent.trim()).filter(Boolean).join(' · ');
        fullInfo.prepend(fullTitle);
        const aliases = titleLink.querySelector('.other');
        if (aliases) {
          const aliasText = document.createElement('p');
          aliasText.textContent = `别名：${aliases.textContent.replace(/^\s*\/\s*/, '').trim()}`;
          fullTitle.after(aliasText);
        }
      }
      const quote = item.querySelector('.bd > .quote');
      if (quote) {
        quote.title = quote.textContent.trim();
        fullInfo.append(quote.cloneNode(true));
      }
      const poster = item.querySelector('.pic');
      const ratingRow = rating?.parentElement;
      if (poster && ratingRow) {
        const votes = ratingRow.querySelector('[data-douview-votes]');
        if (votes) {
          const voteInfo = document.createElement('p');
          votes.textContent = votes.dataset.douviewVotes;
          voteInfo.append(votes);
          fullInfo.append(voteInfo);
        }
        poster.append(ratingRow);
        const playable = item.querySelector('.hd .playable');
        if (playable) poster.append(playable);
      }
      summary.textContent = '详情';
      credits.append(summary, fullInfo);
      const cardFooter = document.createElement('div');
      cardFooter.className = 'douview-card-footer';
      credits.before(cardFooter);
      cardFooter.append(credits);
      const actions = item.querySelector('.douview-actions');
      if (actions) cardFooter.append(actions);
    });
  }

  decorateCards();
  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      decorateCards();
    });
  });
  // 只观察卡片内容的变化，不监听样式属性，避免调节外观触发重复处理。
  observer.observe(list, { childList: true, subtree: true });
  if (loggedIn && Date.now() - (myRatings.updatedAt || 0) > 7 * 86400000) setTimeout(refreshMyRatings, 3000);

  // 豆瓣每个响应最多 25 条，顺序读取原分页以组成用户选择的一页。
  const PAGE_SIZES = [25, 50, 100, 250];
  const savedPageSize = GM_getValue('douview-page-size', 25);
  const pageSize = PAGE_SIZES.includes(savedPageSize) ? savedPageSize : 25;
  const pageUrl = new URL(location.href);
  const nativeStart = Math.max(0, Number.parseInt(pageUrl.searchParams.get('start'), 10) || 0);
  const pageStart = Math.floor(nativeStart / pageSize) * pageSize;
  const nativePaginator = document.querySelector('#content .paginator');
  const pageControls = document.createElement('div');
  pageControls.className = 'douview-page-size';
  pageControls.innerHTML = '<span role="status" aria-live="polite"></span><label>每页 <select aria-label="每页条数"></select> 条</label><button type="button" hidden>重试加载</button>';
  const pageSizeSelect = pageControls.querySelector('select');
  PAGE_SIZES.forEach(size => pageSizeSelect.add(new Option(String(size), String(size))));
  pageSizeSelect.value = String(pageSize);
  if (nativePaginator) nativePaginator.after(pageControls);
  else list.after(pageControls);
  const pageStatus = pageControls.querySelector('[role="status"]');
  const retryButton = pageControls.querySelector('button');
  pageSizeSelect.addEventListener('change', () => {
    GM_setValue('douview-page-size', Number(pageSizeSelect.value));
    const url = new URL(location.href);
    url.searchParams.set('start', '0');
    if (url.href === location.href) location.reload();
    else location.assign(url.href);
  });
  if (pageSize > 25 && nativeStart !== pageStart) {
    pageUrl.searchParams.set('start', String(pageStart));
    location.replace(pageUrl.href);
    return;
  }

  function nextPageUrl(doc, afterStart) {
    const candidates = Array.from(doc.querySelectorAll('.paginator a[href]'))
      .map(link => new URL(link.getAttribute('href'), location.href))
      .filter(url => url.origin === location.origin && url.pathname === location.pathname)
      .filter(url => Number(url.searchParams.get('start')) > afterStart)
      .sort((a, b) => Number(a.searchParams.get('start')) - Number(b.searchParams.get('start')));
    if (!candidates.length) return null;
    // 保留当前的未看筛选等参数，只替换原站分页偏移。
    const next = new URL(location.href);
    next.searchParams.set('start', candidates[0].searchParams.get('start'));
    return next;
  }
  const initialCards = list.querySelectorAll(':scope > li').length;
  const offsets = Array.from(nativePaginator?.querySelectorAll('a[href]') || [])
    .map(link => Number(new URL(link.getAttribute('href'), location.href).searchParams.get('start')) || 0);
  const countText = nativePaginator?.textContent.match(/共\s*(\d+)\s*[部条]/);
  const unwatchedCount = filter?.querySelector('input:checked')
    ? filter.textContent.match(/[（(]\s*(\d+)\s*[）)]/) : null;
  let total = Math.min(250, Number(countText?.[1] || unwatchedCount?.[1]) || Math.max(pageStart, ...offsets) + initialCards);
  pageStatus.textContent = `本页 ${initialCards} 条 · 共 ${total} 条`;
  if (pageSize === 25) return;
  let nextUrl = nextPageUrl(document, pageStart);
  let loading = false;
  const pagination = document.createElement('div');
  pagination.className = 'paginator douview-pagination';
  pageControls.before(pagination);
  if (nativePaginator) nativePaginator.hidden = true;

  function renderPagination() {
    pagination.replaceChildren();
    const pages = Math.max(1, Math.ceil(total / pageSize));
    for (let page = 0; page < pages; page++) {
      const offset = page * pageSize;
      const element = document.createElement(offset === pageStart ? 'span' : 'a');
      element.textContent = String(page + 1);
      if (offset === pageStart) {
        element.className = 'thispage';
        element.setAttribute('aria-current', 'page');
      } else {
        const url = new URL(location.href);
        url.searchParams.set('start', String(offset));
        element.href = url.href;
      }
      pagination.append(element);
    }
    pagination.hidden = pages === 1;
  }

  async function loadPage() {
    if (loading) return;
    loading = true;
    retryButton.hidden = true;
    renderPagination();
    try {
      while (nextUrl && list.querySelectorAll(':scope > li').length < pageSize) {
        const count = list.querySelectorAll(':scope > li').length;
        pageStatus.textContent = `正在加载：${count} / ${Math.min(pageSize, total - pageStart)} 条…`;
        const requestedUrl = nextUrl;
        const response = await fetch(requestedUrl.href, { credentials: 'same-origin', signal: AbortSignal.timeout(15000) });
        if (!response.ok || new URL(response.url).pathname !== pageUrl.pathname) throw new Error('分页请求未成功');
        const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
        const cards = Array.from(doc.querySelectorAll('#content .grid_view > li'));
        if (!cards.length) throw new Error('未读取到电影列表');
        const existing = new Set(Array.from(list.querySelectorAll('.pic a[href]')).map(a => a.getAttribute('href')));
        const additions = cards.filter(card => !existing.has(card.querySelector('.pic a[href]')?.getAttribute('href')))
          .slice(0, pageSize - count);
        if (!additions.length) throw new Error('分页内容重复');
        const fragment = document.createDocumentFragment();
        additions.forEach(card => {
          card.querySelectorAll('script').forEach(script => script.remove());
          fragment.append(document.importNode(card, true));
        });
        list.append(fragment);
        decorateCards();
        nextUrl = nextPageUrl(doc, Number(requestedUrl.searchParams.get('start')));
        if (!nextUrl) total = Number(requestedUrl.searchParams.get('start')) + cards.length;
      }
      renderPagination();
      pageStatus.textContent = `本页 ${list.querySelectorAll(':scope > li').length} 条 · 共 ${total} 条`;
    } catch (error) {
      pageStatus.textContent = `已显示 ${list.querySelectorAll(':scope > li').length} 条，其余内容加载失败，可重试。`;
      retryButton.hidden = false;
    } finally {
      loading = false;
    }
  }
  retryButton.addEventListener('click', loadPage);
  loadPage();
})();
