// ==UserScript==
// @name         豆影 DouView — 豆瓣 Top250 清爽海报墙
// @namespace    https://github.com/muzi-xiaoren/MyScripts
// @version      1.1.2
// @description  将豆瓣电影 Top250 改为清爽海报墙，隐藏广告，保留原生观影操作，可调整海报大小和卡片间距。
// @author       muzi-xiaoren
// @match        https://movie.douban.com/top250*
// @run-at       document-end
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
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
    .douview a:focus-visible, .douview button:focus-visible, .douview summary:focus-visible {
      outline: 2px solid var(--dv-green); outline-offset: 3px;
    }
    @media (max-width: 600px) {
      .douview .douview-controls { right: -1px; width: min(300px, calc(100vw - 60px)); }
    }
    @media (prefers-reduced-motion: reduce) {
      #douview-chrome-toggle svg, #douview-chrome-toggle > * { transition: none; }
    }
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
  function positionNavigation() {
    if (!navigation.open) return;
    const anchor = navigation.querySelector('summary').getBoundingClientRect();
    const menuWidth = Math.min(420, window.innerWidth - 32);
    const left = Math.max(16, Math.min(anchor.right - menuWidth, window.innerWidth - menuWidth - 16));
    const top = Math.max(8, Math.min(anchor.bottom + 8, window.innerHeight - 100));
    navigation.style.setProperty('--dv-menu-left', `${left}px`);
    navigation.style.setProperty('--dv-menu-top', `${top}px`);
  }
  navigation.addEventListener('toggle', positionNavigation);
  window.addEventListener('resize', positionNavigation);
  window.addEventListener('scroll', positionNavigation, { passive: true });
  toggleButton.addEventListener('click', () => {
    chromeCollapsed = !chromeCollapsed;
    panel.open = false;
    navigation.open = false;
    updateChrome();
    GM_setValue('douview-chrome-collapsed', chromeCollapsed);
  });
  document.body.append(toggle);
  updateChrome();

  const menus = [panel, navigation];
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

  function decorateCards() {
    list.querySelectorAll('.item').forEach(item => {
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
      if (quote) fullInfo.append(quote);
      credits.append(summary, fullInfo);
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
})();
