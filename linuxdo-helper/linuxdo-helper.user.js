// ==UserScript==
// @name         LINUX DO 助手
// @namespace    https://github.com/muzi-xiaoren/MyScripts
// @version      1.3.0
// @description  linux.do 侧边悬浮框，两个独立开关：① 刷帖：从列表页(默认 /top)从上到下逐个打开帖子，每屏等发言的小蓝点(未读标记)消失再往下滚，读完回列表点下一个 ② 领红包：站点一推送新帖就立刻扫（另有定时兜底）积分乐园的新帖，从楼主发言里找出 credit.linux.do 红包(直链 / base64 / base58 / hex / 倒序 / o→0、中文数字等变形)直接领取，需要解谜的列出来留给你。列表地址都能在悬浮框里改。
// @author       muzi-xiaoren
// @match        https://linux.do/*
// @run-at       document-end
// @noframes
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      credit.linux.do
// @homepageURL  https://github.com/muzi-xiaoren/MyScripts
// @supportURL   https://github.com/muzi-xiaoren/MyScripts/issues
// @downloadURL  https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/linuxdo-helper/linuxdo-helper.user.js
// @updateURL    https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/linuxdo-helper/linuxdo-helper.user.js
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  const READ = {
    stepRatio: 0.7,        // 每次往下滚多少屏
    stepPause: 900,        // 滚完停一下，给站点时间把新进视野的发言挂上计时
    dotTimeout: 20000,     // 一屏的小蓝点最多等这么久，超时就当它不会消失、继续往下
    nudgeEvery: 4000,      // 等小蓝点时每隔这么久挪 1 像素，让站点重新开始计时
    flushAfter: 12000,     // 一屏等了这么久还没清掉，就让站点立刻把攒下的阅读时长再报一次
    leaveWait: 10000,      // 读完离开前最多等这么久，让站点把没报完的阅读时长报完
    bottomRetries: 4,      // 到底后再等几次（每次 1.2s）看有没有加载出更多回复，都没有就算读完
    hopDelay: 1500,
  };

  const RP = {
    scanTopics: 30,        // 每次扫列表最前面多少个帖子
    gapMs: 500,            // 两次请求之间的间隔，别把论坛 / credit 打出 429
    decodeDepth: 3,        // 编码套编码最多拆几层
  };

  const DEFAULTS = {
    read: { on: false, url: 'https://linux.do/top', maxReplies: 300 },   // 回复数超过 maxReplies 的帖子跳过，0 = 不限
    rp: { on: false, url: 'https://linux.do/c/credit/106/l/new?subset=topics', interval: 60 },
  };

  const today = new Date().toLocaleDateString('en-CA');
  const sleep = (ms) => new Promise((s) => setTimeout(s, ms));
  const errMsg = (e) => (e && e.message ? e.message : String(e));
  const W = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
  const el = (tag, css, props) => Object.assign(Object.assign(document.createElement(tag), props || {}), { style: css });
  const ls = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };

  // ---------- 存储 ----------
  // 配置跨天保留；当天记录（读了几个帖、领了多少）按天重置；领过的红包 id 跨天保留，避免重复请求。
  const CFG_KEY = 'mzx-linuxdo-cfg';
  const DAY_KEY = 'mzx-linuxdo-day';
  const SEEN_KEY = 'mzx-linuxdo-rp-seen';
  const UI_KEY = 'mzx-linuxdo-ui';
  const DONE_KEY = 'mzx-linuxdo-puzzle-done';

  const cfg = (() => {
    const c = ls.get(CFG_KEY, {});
    return {
      read: Object.assign({}, DEFAULTS.read, c.read),
      rp: Object.assign({}, DEFAULTS.rp, c.rp),
    };
  })();
  const saveCfg = () => ls.set(CFG_KEY, cfg);

  const blankDay = () => ({
    date: today,
    read: { done: 0, visited: {}, cur: null },
    rp: { count: 0, amount: 0, topics: {} },
    puzzles: [],
    log: [],
  });
  let day = (() => {
    const d = ls.get(DAY_KEY, null);
    if (!d || d.date !== today) return blankDay();
    const b = blankDay();
    return Object.assign(b, d, { read: Object.assign(b.read, d.read), rp: Object.assign(b.rp, d.rp) });
  })();
  const saveDay = () => ls.set(DAY_KEY, day);

  // id → 结果；只记已经有定论的（领到 / 站点明确拒绝），网络错误和未登录不记，下轮还会再试。
  const seen = ls.get(SEEN_KEY, {});
  const saveSeen = () => {
    const keys = Object.keys(seen);
    if (keys.length > 3000) for (const k of keys.slice(0, keys.length - 2000)) delete seen[k];
    ls.set(SEEN_KEY, seen);
  };

  // 「要手动解的」里打过勾的帖子 id → 打勾时间。跨天保留：第二天重新扫到同一个帖子也不再列出来。
  const puzzleDone = ls.get(DONE_KEY, {});
  function markPuzzleDone(topic) {
    puzzleDone[topic] = Date.now();
    const keys = Object.keys(puzzleDone);
    if (keys.length > 500) for (const k of keys.slice(0, keys.length - 300)) delete puzzleDone[k];
    ls.set(DONE_KEY, puzzleDone);
    day.puzzles = day.puzzles.filter((p) => p.topic !== topic);
    saveDay();
    paint();
  }

  function log(t) {
    const hh = new Date().toTimeString().slice(0, 5);
    day.log.unshift(`${hh} ${t}`);
    day.log.length = Math.min(day.log.length, 40);
    saveDay();
    paint();
  }

  // ---------- 悬浮框 ----------
  const ui = ls.get(UI_KEY, {});
  const saveUi = () => ls.set(UI_KEY, ui);
  const BOX_W = 340;
  const BALL_D = 52;
  const FONT = 'system-ui,-apple-system,"PingFang SC",sans-serif';

  const box = el('div', `position:fixed;left:0;top:0;z-index:2147483000;width:${BOX_W}px;max-height:80vh;overflow:auto;
    background:#1f2328;color:#e6edf3;border:1px solid #3d444d;border-radius:12px;padding:14px 16px;
    font:13px/1.6 ${FONT};box-shadow:0 12px 48px rgba(0,0,0,.55)`);
  const ball = el('div', `position:fixed;left:0;top:0;z-index:2147483000;width:${BALL_D}px;height:${BALL_D}px;display:none;
    align-items:center;justify-content:center;border-radius:50%;background:#1f2328;color:#e6edf3;
    border:1px solid #3d444d;cursor:grab;user-select:none;box-shadow:0 8px 28px rgba(0,0,0,.55);
    font:13px/1 ${FONT}`, { textContent: 'LD', title: '点击展开，拖动可移位' });

  const head = el('div', 'display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;cursor:grab;user-select:none');
  head.appendChild(el('b', 'font-weight:600', { textContent: 'LINUX DO 助手' }));
  const ctrl = el('div', 'display:flex;gap:6px;align-items:center');
  const minBtn = el('span', 'cursor:pointer;opacity:.6;padding:0 4px;font-size:16px', { textContent: '–', title: '最小化' });
  const closeBtn = el('span', 'cursor:pointer;opacity:.6;padding:0 2px;font-size:16px', { textContent: '×', title: '关掉，刷新后再出现' });
  ctrl.append(minBtn, closeBtn);
  head.appendChild(ctrl);

  const BTN = `padding:4px 10px;border-radius:6px;border:1px solid #3d444d;background:#0d1117;color:#e6edf3;cursor:pointer;font:12px ${FONT}`;
  const INPUT = `flex:1;min-width:0;padding:4px 6px;border-radius:6px;border:1px solid #3d444d;background:#0d1117;color:#e6edf3;font:12px ui-monospace,monospace`;

  function section(title) {
    const wrap = el('div', 'border-top:1px solid #3d444d;padding-top:8px;margin-top:8px');
    const row = el('div', 'display:flex;align-items:center;justify-content:space-between;gap:8px');
    row.appendChild(el('b', 'font-weight:600', { textContent: title }));
    const toggle = el('button', BTN);
    row.appendChild(toggle);
    const urlRow = el('div', 'display:flex;gap:6px;margin-top:6px');
    const input = el('input', INPUT, { type: 'text', spellcheck: false });
    const saveBtn = el('button', BTN, { textContent: '保存' });
    urlRow.append(input, saveBtn);
    const status = el('div', 'font-size:12px;opacity:.8;margin-top:6px;white-space:pre-wrap;word-break:break-all');
    wrap.append(row, urlRow, status);
    return { wrap, toggle, input, saveBtn, status, urlRow };
  }

  const secRead = section('刷帖');
  const secRp = section('领红包');
  const intervalInput = el('input', INPUT + ';flex:0 0 52px', { type: 'number', min: 20, title: '扫描间隔（秒）' });
  secRp.urlRow.insertBefore(intervalInput, secRp.saveBtn);
  const maxRepliesInput = el('input', INPUT + ';flex:0 0 52px', { type: 'number', min: 0, title: '回复数超过这个的帖子跳过，0 = 不限' });
  secRead.urlRow.insertBefore(maxRepliesInput, secRead.saveBtn);
  const puzzleEl = el('div', 'font-size:12px;margin-top:6px;word-break:break-all');
  secRp.wrap.appendChild(puzzleEl);
  const logEl = el('div', 'border-top:1px solid #3d444d;margin-top:8px;padding-top:6px;white-space:pre-wrap;font:11px/1.6 ui-monospace,monospace;opacity:.8;max-height:160px;overflow:auto');
  box.append(head, secRead.wrap, secRp.wrap, logEl);
  document.body.append(box, ball);

  function place() {
    const node = ui.collapsed ? ball : box;
    const w = ui.collapsed ? BALL_D : BOX_W;
    const h = ui.collapsed ? BALL_D : Math.min(node.offsetHeight || 240, innerHeight - 16);
    const left = ui.left == null ? innerWidth - BOX_W - 16 : ui.left;
    const top = ui.top == null ? 96 : ui.top;
    ui.left = Math.min(Math.max(left, 8), Math.max(8, innerWidth - w - 8));
    ui.top = Math.min(Math.max(top, 8), Math.max(8, innerHeight - h - 8));
    node.style.left = ui.left + 'px';
    node.style.top = ui.top + 'px';
  }

  function setCollapsed(v) {
    ui.collapsed = !!v;
    saveUi();
    box.style.display = ui.collapsed ? 'none' : 'block';
    ball.style.display = ui.collapsed ? 'flex' : 'none';
    place();
  }

  // 拖动和点击共用一个手柄：位移不到 4px 当点击，超过就当拖动并记下落点。
  function draggable(handle, onClick) {
    let sx = 0, sy = 0, ol = 0, ot = 0, moved = false, on = false;
    handle.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.__nodrag) return;
      const r = (ui.collapsed ? ball : box).getBoundingClientRect();
      sx = e.clientX; sy = e.clientY; ol = r.left; ot = r.top; moved = false; on = true;
      handle.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    handle.addEventListener('pointermove', (e) => {
      if (!on) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 4) return;
      moved = true;
      ui.left = ol + dx;
      ui.top = ot + dy;
      place();
    });
    const end = (e) => {
      if (!on) return;
      on = false;
      try { handle.releasePointerCapture(e.pointerId); } catch (err) {}
      if (moved) saveUi();
      else if (onClick) onClick();
    };
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  }

  minBtn.__nodrag = true;
  closeBtn.__nodrag = true;
  minBtn.onclick = () => setCollapsed(true);
  closeBtn.onclick = () => { box.style.display = 'none'; ball.style.display = 'none'; };
  draggable(head, null);
  draggable(ball, () => setCollapsed(false));
  addEventListener('resize', place);
  setCollapsed(!!ui.collapsed);

  let readNote = '';
  let rpNote = '';

  function paint() {
    secRead.toggle.textContent = cfg.read.on ? '停止' : '启动';
    secRp.toggle.textContent = cfg.rp.on ? '停止' : '启动';
    secRead.status.textContent = `${cfg.read.on ? '运行中' : '已停止'} · 今天读完 ${day.read.done} 个帖子` + (readNote ? '\n' + readNote : '');
    secRp.status.textContent = `${cfg.rp.on ? '运行中' : '已停止'} · 今天领到 ${day.rp.count} 个，共 ${+day.rp.amount.toFixed(2)} LDC` + (rpNote ? '\n' + rpNote : '');
    puzzleEl.replaceChildren();
    if (day.puzzles.length) {
      puzzleEl.appendChild(el('div', 'opacity:.8', { textContent: '要手动解的（点开看题，做完点 ✓ 就不再显示）：' }));
      for (const p of day.puzzles.slice(0, 8)) {
        const row = el('div', 'display:flex;align-items:flex-start;gap:6px');
        const ok = el('span', 'flex:none;cursor:pointer;color:#3fb950;padding:0 2px', { textContent: '✓', title: '已经处理了，不再显示' });
        ok.onclick = () => markPuzzleDone(p.topic);
        row.append(ok, el('a', 'flex:1;color:#7cc4ff;text-decoration:none', {
          href: `/t/topic/${p.topic}`, target: '_blank', textContent: `${p.title} — ${p.hint}`,
        }));
        puzzleEl.appendChild(row);
      }
    }
    logEl.textContent = day.log.join('\n') || '还没有记录。';
    place();
  }

  function bindSection(sec, key) {
    sec.input.value = cfg[key].url;
    sec.saveBtn.onclick = () => {
      const v = sec.input.value.trim();
      let u;
      try { u = new URL(v, location.origin); } catch (e) { u = null; }
      if (!u || u.hostname !== location.hostname) { sec.input.style.borderColor = '#f85149'; return; }
      sec.input.style.borderColor = '';
      cfg[key].url = u.href;
      if (key === 'rp') cfg.rp.interval = Math.max(20, Number(intervalInput.value) || DEFAULTS.rp.interval);
      if (key === 'read') {
        const raw = maxRepliesInput.value.trim();
        const n = raw === '' ? NaN : Math.floor(Number(raw));
        cfg.read.maxReplies = isFinite(n) && n >= 0 ? n : DEFAULTS.read.maxReplies;
        maxRepliesInput.value = cfg.read.maxReplies;
      }
      saveCfg();
      sec.input.value = cfg[key].url;
      sec.saveBtn.textContent = '已保存';
      setTimeout(() => (sec.saveBtn.textContent = '保存'), 1200);
    };
  }
  bindSection(secRead, 'read');
  bindSection(secRp, 'rp');
  intervalInput.value = cfg.rp.interval;
  maxRepliesInput.value = cfg.read.maxReplies;

  // ---------- 功能一：刷帖 ----------
  const topicIdNow = () => {
    const m = location.pathname.match(/^\/t\/[^/]+\/(\d+)/);
    return m ? m[1] : null;
  };
  const onReadList = () => {
    const u = new URL(cfg.read.url);
    return location.pathname.replace(/\/$/, '') === u.pathname.replace(/\/$/, '') && location.search === u.search;
  };

  // 回复数在列表的 .posts-map .number 里，「1.4k」这种要换算
  function repliesOf(row) {
    const t = ((row.querySelector('.posts-map .number, td.posts .number') || {}).textContent || '').trim().toLowerCase();
    const n = parseFloat(t);
    if (!isFinite(n)) return 0;
    return t.endsWith('k') ? n * 1000 : n;
  }

  async function waitFor(fn, ms) {
    const t0 = Date.now();
    for (;;) {
      const v = fn();
      if (v) return v;
      if (Date.now() - t0 > ms) return null;
      await sleep(300);
    }
  }

  async function pickNext() {
    const rows = await waitFor(() => {
      const r = document.querySelectorAll('tr.topic-list-item[data-topic-id]');
      return r.length ? r : null;
    }, 15000);
    if (!rows) { readNote = '列表页没有找到帖子'; paint(); return; }
    // 从上到下找第一个今天还没点过的；列表到底了就滚一下让站点加载下一页，最多加载 5 次
    for (let more = 0; more <= 5 && cfg.read.on; more++) {
      for (const row of document.querySelectorAll('tr.topic-list-item[data-topic-id]')) {
        const id = row.getAttribute('data-topic-id');
        if (day.read.visited[id]) continue;
        day.read.visited[id] = 1;
        const link = row.querySelector('a.title');
        if (!link) continue;
        if (cfg.read.maxReplies > 0 && repliesOf(row) > cfg.read.maxReplies) { log(`刷帖跳过（回复太多）：${link.textContent.trim()}`); continue; }
        day.read.cur = id;
        saveDay();
        readNote = `正在读：${link.textContent.trim()}`;
        paint();
        link.click();
        return;
      }
      scrollTo(0, document.documentElement.scrollHeight);
      await sleep(2500);
    }
    cfg.read.on = false;
    saveCfg();
    readNote = '列表里的帖子都读过了，已自动停止';
    log('刷帖：列表读完，停止');
  }

  // 小蓝点就是发言右上角的 .read-state，站点算这条读过后会给它加上 read 类再淡出。
  // 只看视野里的发言：视野外的本来就不会被计时。
  function unreadInView() {
    let n = 0;
    for (const dot of document.querySelectorAll('.topic-post .read-state:not(.read)')) {
      const r = dot.closest('.topic-post').getBoundingClientRect();
      if (r.bottom > 0 && r.top < innerHeight) n++;
    }
    return n;
  }

  // 站点的阅读计时服务（Discourse screen-track）。上报被拒（比如被 Cloudflare 挡成 403）时站点不重试，
  // 这几楼又已经算「报过」，要等每 60 秒一次的例行上报才会再带上；赶在这之前跳回列表，它们就永远未读。
  // flush() 是站点自己的上报，发的是这段时间真实累计的停留时长。
  function screenTrack() {
    try { return W.Discourse.__container__.lookup('service:screen-track'); } catch (e) { return null; }
  }
  function flushTimings() {
    const t = screenTrack();
    try { if (t) t.flush(); } catch (e) {}
  }
  async function drainTimings(ms) {
    flushTimings();
    const t0 = Date.now();
    for (;;) {
      const t = screenTrack();
      if (!t || (!t._inProgress && !(t._consolidatedTimings || []).length)) return;
      if (Date.now() - t0 > ms) return;
      await sleep(300);
    }
  }

  function nudge() {
    const atBottom = innerHeight + scrollY >= document.documentElement.scrollHeight - 1;
    scrollBy(0, atBottom ? -1 : 1);
  }

  async function readTopic(id) {
    let waited = 0, bottom = 0;
    await waitFor(() => document.querySelector('.topic-post'), 15000);
    while (cfg.read.on && topicIdNow() === id) {
      // 站点只看页面是否可见（visibilitychange），不管窗口有没有焦点：窗口露在屏幕上、你在用别的程序时照样计时
      if (document.hidden) {
        readNote = '标签页不可见，站点不计阅读，先暂停';
        paint();
        await sleep(1000);
        continue;
      }
      const pending = unreadInView();
      if (pending && waited < READ.dotTimeout) {
        // 原地等时每隔一阵挪 1 像素：站点超过 3 分钟没收到滚动就停止计时（切到后台再回来就是这样），
        // 新加载出来的楼层也要等下一次滚动才开始计时，不挪的话蓝点会一直等不掉
        if (waited % READ.nudgeEvery === 0) nudge();
        if (waited === READ.flushAfter) flushTimings();
        readNote = `等 ${pending} 个小蓝点消失…`;
        paint();
        await sleep(400);
        waited += 400;
        continue;
      }
      waited = 0;
      const atBottom = innerHeight + scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom) {
        if (++bottom > READ.bottomRetries) return true;
        await sleep(1200);
        continue;
      }
      bottom = 0;
      readNote = '往下滚…';
      paint();
      scrollBy({ top: Math.round(innerHeight * READ.stepRatio), behavior: 'smooth' });
      await sleep(READ.stepPause);
    }
    return false;
  }

  let reading = false;
  async function readTick() {
    if (!cfg.read.on || reading) return;
    reading = true;
    try {
      const id = topicIdNow();
      if (id && id === day.read.cur) {
        if (await readTopic(id)) {
          day.read.done += 1;
          day.read.cur = null;
          saveDay();
          log(`刷帖读完：${document.title.replace(/ - LINUX DO$/, '')}`);
          // 跳回列表是整页刷新，站点内存里还没报出去的阅读时长会被丢掉，先报完再走
          readNote = '等站点把阅读时长报完…';
          paint();
          await drainTimings(READ.leaveWait);
          await sleep(READ.hopDelay);
          if (cfg.read.on) location.href = cfg.read.url;
        }
      } else if (onReadList()) {
        await pickNext();
      } else {
        // 手动逛到别的页面时不抢方向盘，回到列表页或点「启动」才继续
        readNote = '不在列表页，回到列表页会接着刷';
        paint();
      }
    } catch (e) {
      log('刷帖出错：' + errMsg(e));
    } finally {
      reading = false;
    }
  }

  secRead.toggle.onclick = () => {
    cfg.read.on = !cfg.read.on;
    saveCfg();
    readNote = '';
    paint();
    if (cfg.read.on && !onReadList() && topicIdNow() !== day.read.cur) location.href = cfg.read.url;
  };

  // ---------- 功能二：领红包 ----------
  const ID_RE = /^1\d{16,19}$/;   // credit 的红包 id 是 18 位左右的雪花号，以 1 开头
  const CN_DIGITS = { '零': '0', '〇': '0', '一': '1', '二': '2', '三': '3', '四': '4', '五': '5', '六': '6', '七': '7', '八': '8', '九': '9' };
  const LOOKALIKE = { o: '0', O: '0', l: '1', I: '1' };
  const printable = (s) => s && s.length >= 8 && /^[\x20-\x7e\r\n\t]+$/.test(s);

  function b64(s) {
    try {
      let t = s.replace(/-/g, '+').replace(/_/g, '/');
      while (t.length % 4) t += '=';
      const bin = atob(t);
      return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
    } catch (e) { return ''; }
  }
  function b58(s) {
    const A = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let n = 0n;
    for (const c of s) { const i = A.indexOf(c); if (i < 0) return ''; n = n * 58n + BigInt(i); }
    let hex = n.toString(16);
    if (hex.length % 2) hex = '0' + hex;
    return hexStr(hex);
  }
  function hexStr(h) {
    try {
      return new TextDecoder().decode(Uint8Array.from(h.match(/../g) || [], (x) => parseInt(x, 16)));
    } catch (e) { return ''; }
  }
  const rot13 = (s) => s.replace(/[a-z]/gi, (c) => {
    const b = c <= 'Z' ? 65 : 97;
    return String.fromCharCode((c.charCodeAt(0) - b + 13) % 26 + b);
  });

  // 一段文字里找红包：先认直链；链接尾巴有变形（o→0、中文数字）就还原；还原不了（X 占位、要答题）记成待解谜。
  // 再把看着像编码的串逐个试着解开，解出可读文字就递归再找一遍。编码解出来的纯数字也认，直链以外的裸数字不认。
  function extract(text, depth, out) {
    for (const m of text.matchAll(/redenvelope\/([0-9A-Za-z零〇一二三四五六七八九]{8,32})/g)) {
      const strict = m[1].match(/^\d+/);
      if (strict && ID_RE.test(strict[0]) && !/^[零〇一二三四五六七八九]/.test(m[1].slice(strict[0].length))) {
        out.ids.add(strict[0]);
        continue;
      }
      const norm = [...m[1]].map((c) => CN_DIGITS[c] || LOOKALIKE[c] || c).join('');
      const d = norm.match(/^\d+/);
      if (d && ID_RE.test(d[0])) out.ids.add(d[0]);
      else out.puzzles.add(m[1]);
    }
    if (depth > 0) for (const m of text.matchAll(/(?<!\d)1\d{16,19}(?!\d)/g)) out.ids.add(m[0]);
    if (depth >= RP.decodeDepth) return;

    const tried = new Set();
    const tryDecoded = (s) => { if (printable(s) && !tried.has(s)) { tried.add(s); extract(s, depth + 1, out); } };
    for (const m of text.matchAll(/[A-Za-z0-9+/_-]{16,}={0,2}/g)) {
      if (/^\d+$/.test(m[0])) continue;
      tryDecoded(b64(m[0]));
      if (/^[1-9A-HJ-NP-Za-km-z]+$/.test(m[0])) tryDecoded(b58(m[0]));
    }
    for (const m of text.matchAll(/(?:[0-9a-fA-F]{2}){12,}/g)) if (/[a-fA-F]/.test(m[0])) tryDecoded(hexStr(m[0]));
    if (/%[0-9A-Fa-f]{2}/.test(text)) { try { tryDecoded(decodeURIComponent(text)); } catch (e) {} }
    if (/epolevneder/i.test(text)) tryDecoded([...text].reverse().join(''));
    if (/erqrairybcr/i.test(text)) tryDecoded(rot13(text));
  }

  const getJSON = async (u) => {
    const r = await fetch(u, { headers: { Accept: 'application/json' }, credentials: 'same-origin' });
    if (!r.ok) throw new Error(`${u} → HTTP ${r.status}`);
    return r.json();
  };
  const getText = async (u) => {
    const r = await fetch(u, { credentials: 'same-origin' });
    if (!r.ok) throw new Error(`${u} → HTTP ${r.status}`);
    return r.text();
  };

  // credit 是另一个域，页面里直接 fetch 会被 CORS 挡，走油猴的跨域请求（带 credit 自己的登录 cookie）。
  // 站点统一回 { error_msg, data }：成功时 error_msg 为空。
  function credit(method, path, body) {
    return new Promise((resolve) => {
      GM_xmlhttpRequest({
        method,
        url: 'https://credit.linux.do/api/v1/redenvelope' + path,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        data: body ? JSON.stringify(body) : undefined,
        timeout: 15000,
        onload: (r) => {
          let b = null;
          try { b = JSON.parse(r.responseText); } catch (e) {}
          if (r.status === 401) return resolve({ login: true });
          if (r.status >= 200 && r.status < 300 && b && b.data) return resolve({ ok: true, data: b.data });
          resolve({ ok: false, final: r.status < 500 && r.status !== 429, msg: (b && b.error_msg) || `HTTP ${r.status}` });
        },
        onerror: () => resolve({ ok: false, final: false, msg: '网络错误' }),
        ontimeout: () => resolve({ ok: false, final: false, msg: '超时' }),
      });
    });
  }

  // 先查详情再领：详情里有 status / remaining_count，自己领过时还带 user_claimed，
  // 领完的、领过的、不存在的（补全题猜错的 id）都不用再发领取请求。
  async function claim(id) {
    const d = await credit('GET', '/' + id);
    if (d.login || !d.ok) return d;
    const e = d.data.red_envelope || {};
    if (d.data.user_claimed) return { ok: false, final: true, msg: '已经领过' };
    if (e.status !== 'active' || !(Number(e.remaining_count) > 0)) return { ok: false, final: true, msg: '已领完' };
    await sleep(RP.gapMs);
    const r = await credit('POST', '/claim', { id });
    return r.ok ? { ok: true, amount: Number(r.data.amount) || 0 } : r;
  }

  // 同一浏览器开着多个 linux.do 标签页时只让一个去扫，免得同一个红包被请求好几次
  const LOCK_KEY = 'mzx-linuxdo-rp-lock';
  const TAB = Math.random().toString(36).slice(2);
  function takeLock() {
    const l = ls.get(LOCK_KEY, null);
    if (l && l.tab !== TAB && Date.now() - l.at < cfg.rp.interval * 1000 + 30000) return false;
    ls.set(LOCK_KEY, { tab: TAB, at: Date.now() });
    return true;
  }

  function listJsonUrl(u) {
    const x = new URL(u);
    x.pathname = x.pathname.replace(/\/$/, '') + '.json';
    return x.href;
  }

  let scanning = false;
  let rescan = false;
  let needLogin = false;
  // 推送点名的帖子：这一轮不管 bumped_at 有没有变都重看一遍（楼主编辑首帖追加红包不会顶帖）
  const forced = new Set();
  async function rpScan() {
    if (!cfg.rp.on || needLogin) return;
    if (scanning) { rescan = true; return; }
    if (!takeLock()) return;
    scanning = true;
    try {
      rpNote = '扫描中…';
      paint();
      const must = new Set(forced);
      forced.clear();
      const list = await getJSON(listJsonUrl(cfg.rp.url));
      const topics = ((list.topic_list || {}).topics || []).slice(0, RP.scanTopics);
      let fresh = 0;
      for (const t of topics) {
        if (!cfg.rp.on || needLogin) break;
        // 帖子没有新回复就不用再看：楼主追加红包也会顶起 bumped_at
        const stamp = `${t.bumped_at}|${t.posts_count}`;
        if (day.rp.topics[t.id] === stamp && !must.has(t.id)) continue;
        must.delete(t.id);
        day.rp.topics[t.id] = stamp;
        fresh++;
        await rpTopic(t);
        await sleep(RP.gapMs);
      }
      // 推送来的帖子可能不在这个列表里（比如「新」列表已经把它算成看过了），单独看
      for (const id of must) {
        if (!cfg.rp.on || needLogin) break;
        fresh++;
        await rpTopic({ id });
        await sleep(RP.gapMs);
      }
      saveDay();
      rpNote = needLogin ? rpNote : `上次扫描 ${new Date().toTimeString().slice(0, 5)}，看了 ${fresh} 个有更新的帖子`;
    } catch (e) {
      rpNote = '扫描出错：' + errMsg(e);
    } finally {
      scanning = false;
      paint();
      if (rescan) { rescan = false; rpScan(); }
    }
  }

  // ---------- 推送：有新帖立刻扫 ----------
  // 列表页那条「查看 N 个新的或更新的话题」蓝条就是站点收到 MessageBus 推送后画的。
  // 这里直接订阅同一个推送，所以开着任意 linux.do 页面都能第一时间知道，不用停在列表页。
  // /new 的 new_topic = 新帖，立刻扫；/latest = 帖子有新回复或被编辑，同一个帖子 20 秒内只重看一次，
  // 不然热门红包帖底下一排「谢谢佬」会让它被反复拉取。
  const rpCategory = () => {
    const m = new URL(cfg.rp.url).pathname.match(/\/c\/(?:[^/]+\/)*?(\d+)(?:\/|$)/);
    return m ? Number(m[1]) : null;
  };
  const pokedAt = {};
  let pokeTimer = null;
  function poke(topicId, urgent) {
    if (!cfg.rp.on || !topicId) return;
    if (!urgent && Date.now() - (pokedAt[topicId] || 0) < 20000) return;
    pokedAt[topicId] = Date.now();
    forced.add(topicId);
    clearTimeout(pokeTimer);
    // 稍等一下再扫：同一时刻常常连着来好几条，也给站点一点时间把帖子内容落库
    pokeTimer = setTimeout(rpScan, urgent ? 1500 : 3000);
  }
  async function subscribeBus() {
    let bus = null;
    for (let i = 0; i < 60 && !bus; i++) {
      try { bus = W.Discourse.__container__.lookup('service:message-bus'); } catch (e) {}
      if (!bus) await sleep(500);
    }
    if (!bus) { log('没接上站点推送，只按间隔定时扫'); return; }
    // 列表地址不是某个分类（比如 /latest）就不按分类过滤
    const hit = (d) => {
      const c = rpCategory();
      return !!(d && d.payload) && (c == null || d.payload.category_id === c);
    };
    bus.subscribe('/new', (d) => { if (d.message_type === 'new_topic' && hit(d)) poke(d.topic_id, true); });
    bus.subscribe('/latest', (d) => { if (hit(d)) poke(d.topic_id, false); });
  }

  async function rpTopic(t) {
    const topic = await getJSON(`/t/${t.id}.json`);
    const posts = ((topic.post_stream || {}).posts || []);
    const op = posts.length ? posts[0].username : null;
    const out = { ids: new Set(), puzzles: new Set() };
    // 只看楼主自己的发言：回复里常有人贴别人的红包链接或已领完的旧链接
    for (const p of posts) {
      if (p.username !== op) continue;
      await sleep(RP.gapMs);
      // raw 是 markdown 原文，藏在 <!-- --> 注释、折叠块里的链接也在里面
      const raw = await getText(`/raw/${t.id}/${p.post_number}`).catch(() => '');
      const d = document.createElement('div');
      d.innerHTML = p.cooked || '';
      const hrefs = [...d.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).join('\n');
      extract(raw + '\n' + hrefs, 0, out);
    }
    const title = topic.title || t.title || String(t.id);
    for (const id of out.ids) {
      if (seen[id]) continue;
      const r = await claim(id);
      await sleep(RP.gapMs);
      if (r.login) {
        needLogin = true;
        rpNote = '没登录 credit.linux.do：先去 https://credit.linux.do 登录一次，然后刷新本页';
        log('领红包：credit 未登录，暂停');
        return;
      }
      if (r.ok) {
        seen[id] = 'ok';
        day.rp.count += 1;
        day.rp.amount += r.amount;
        log(`领到 ${r.amount} LDC：${title}`);
      } else {
        if (r.final) seen[id] = r.msg;
        if (r.msg !== '已领完' && r.msg !== '已经领过') log(`没领到（${r.msg}）：${title}`);
      }
      saveSeen();
      saveDay();
    }
    if (out.puzzles.size && !out.ids.size && !puzzleDone[t.id] && !day.puzzles.some((p) => p.topic === t.id)) {
      day.puzzles.unshift({ topic: t.id, title, hint: [...out.puzzles][0] });
      day.puzzles.length = Math.min(day.puzzles.length, 20);
      saveDay();
    }
  }

  let rpTimer = null;
  function scheduleRp() {
    clearInterval(rpTimer);
    if (!cfg.rp.on) return;
    rpScan();
    rpTimer = setInterval(rpScan, cfg.rp.interval * 1000);
  }

  secRp.toggle.onclick = () => {
    cfg.rp.on = !cfg.rp.on;
    saveCfg();
    needLogin = false;
    rpNote = '';
    // 手动点启动时把锁让出来，立刻扫一次
    if (cfg.rp.on) ls.set(LOCK_KEY, null);
    paint();
    scheduleRp();
  };
  const origSave = secRp.saveBtn.onclick;
  secRp.saveBtn.onclick = () => { origSave(); scheduleRp(); };

  paint();
  setInterval(readTick, 1000);
  scheduleRp();
  subscribeBus();
})();
