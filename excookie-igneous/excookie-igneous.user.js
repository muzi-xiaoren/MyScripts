// ==UserScript==
// @name         ExCookie igneous 助手
// @name:en      ExCookie igneous Helper
// @namespace    https://github.com/muzi-xiaoren/MyScripts
// @version      1.0.0
// @description  excookie.64396439.xyz 侧边悬浮框：粘贴含 ipb_member_id / ipb_pass_hash 的文本，自动填入页面、选美国节点、请求并取回新的 igneous，结果可单击复制、双击编辑
// @description:en  Floating box on excookie.64396439.xyz: paste text containing ipb_member_id / ipb_pass_hash, auto-fill the page, pick the US node, request and read back the fresh igneous; result is click-to-copy, double-click-to-edit
// @author       muzi-xiaoren
// @match        https://excookie.64396439.xyz/*
// @icon         https://excookie.64396439.xyz/favicon.ico
// @grant        GM_setClipboard
// @run-at       document-idle
// @noframes
// @downloadURL  https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/excookie-igneous/excookie-igneous.user.js
// @updateURL    https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/excookie-igneous/excookie-igneous.user.js
// ==/UserScript==

(function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   * CONFIG —— 页面结构可能变化，选择器都收在这里，按真实 DOM 调即可。    *
   * 每一项都是「候选列表」，脚本会依次尝试，取第一个命中的元素。          *
   * ------------------------------------------------------------------ */
  const CONFIG = {
    // 填 ipb_member_id 的输入框（页面上 id/name/label 均为 ipb_member_id）
    memberIdInput: [
      '#ipb_member_id',
      'input[name="ipb_member_id"]',
      'input[name*="member_id" i]',
      'input[id*="member_id" i]',
      'input[aria-label*="member_id" i]',
      'input[placeholder*="member_id" i]',
    ],
    // 填 ipb_pass_hash 的输入框
    passHashInput: [
      '#ipb_pass_hash',
      'input[name="ipb_pass_hash"]',
      'input[name*="pass_hash" i]',
      'input[id*="pass_hash" i]',
      'input[aria-label*="pass_hash" i]',
      'input[placeholder*="pass_hash" i]',
    ],
    // 节点选择 —— 本站是「美国 / 德国」两个 radio；也兼容下拉
    nodeSelect: ['select[name*="node" i]', 'select[id*="node" i]', 'select'],
    // 节点里代表美国的关键词（radio 标签 / option 文本 / value）
    usKeywords: ['美国', 'united states', 'usa', '(us)', 'us '],
    // 触发请求 / 生成 igneous 的按钮（本站文本：请求并获取 igneous）
    submitBtn: [
      'form button[type="submit"]',
      'button[type="submit"]',
      'input[type="submit"]',
      'button',
      'input[type="button"]',
    ],
    // 提交按钮文本关键词（从多个 button 里挑对的那个）
    submitKeywords: ['请求并获取', '获取', 'igneous', '请求', '生成', '提交', 'get', 'submit'],
    // 结果 igneous 的读取位置（显式候选，命中优先）；否则回退到「结果」标题下方节点
    resultOutput: [
      'input[name*="igneous" i]',
      'input[id*="igneous" i]',
      'textarea[name*="igneous" i]',
      '[class*="igneous" i]',
      '#result',
      '.result',
      'textarea[readonly]',
      'input[readonly]',
    ],
    // 「结果」标题文本，用于定位结果容器
    resultHeading: ['结果', 'result'],
  };

  // 等待 igneous 出现的最长时间（毫秒）与轮询间隔
  const WAIT_TIMEOUT = 20000;
  const POLL_INTERVAL = 400;

  /* ----------------------------- 工具函数 ----------------------------- */

  const $first = (selectors, root = document) => {
    for (const sel of selectors) {
      try {
        const el = root.querySelector(sel);
        if (el) return el;
      } catch (_) {
        /* 无效选择器直接跳过 */
      }
    }
    return null;
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // 给 React/Vue 受控组件用的「原生」赋值，确保框架能感知到 input 事件
  const setNativeValue = (el, value) => {
    const proto = Object.getPrototypeOf(el);
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc && desc.set) desc.set.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };

  // 从任意文本里抽 igneous 候选值（16~64 位字母数字）
  const extractIgneousFromText = (text) => {
    if (!text) return '';
    const m =
      text.match(/igneous["'\s:=]*([A-Za-z0-9]{10,64})/i) ||
      text.match(/\b([a-z0-9]{16,64})\b/i);
    return m ? m[1] : '';
  };

  // 解析用户粘贴的三行文本
  const parseInput = (raw) => {
    const out = { member_id: '', pass_hash: '', igneous: '' };
    for (const line of raw.split(/[\r\n;]+/)) {
      const mm = line.match(/ipb_member_id\s*[:=]\s*([^\s,]+)/i);
      const mp = line.match(/ipb_pass_hash\s*[:=]\s*([^\s,]+)/i);
      const mi = line.match(/\bigneous\s*[:=]\s*([^\s,]+)/i);
      if (mm) out.member_id = mm[1].trim();
      if (mp) out.pass_hash = mp[1].trim();
      if (mi) out.igneous = mi[1].trim();
    }
    return out;
  };

  /* ----------------------------- UI 构建 ----------------------------- */

  const STYLE = `
    #xck-box{position:fixed;top:80px;right:16px;z-index:999999;width:340px;
      font:13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;
      background:#1f2430;color:#e6e6e6;border:1px solid #39404f;border-radius:10px;
      box-shadow:0 8px 28px rgba(0,0,0,.4);overflow:hidden}
    #xck-box *{box-sizing:border-box}
    #xck-head{display:flex;align-items:center;justify-content:space-between;
      padding:8px 10px;background:#2a3140;cursor:move;user-select:none}
    #xck-head b{font-size:13px}
    #xck-min{cursor:pointer;opacity:.7;padding:0 4px}
    #xck-min:hover{opacity:1}
    #xck-body{padding:10px}
    #xck-in{width:100%;height:92px;resize:vertical;background:#11151c;color:#e6e6e6;
      border:1px solid #39404f;border-radius:6px;padding:6px 8px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px}
    #xck-go{width:100%;margin-top:8px;padding:8px;border:0;border-radius:6px;cursor:pointer;
      background:#4c7dff;color:#fff;font-size:13px;font-weight:600}
    #xck-go:hover{background:#3b6bf0}
    #xck-go:disabled{background:#3a4254;cursor:not-allowed}
    #xck-status{margin-top:8px;min-height:16px;font-size:12px;color:#9aa4b2;white-space:pre-wrap}
    #xck-out{display:none;margin-top:8px;background:#11151c;border:1px solid #39404f;border-radius:6px;
      padding:8px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;white-space:pre;
      cursor:pointer;word-break:break-all}
    #xck-out:hover{border-color:#4c7dff}
    #xck-out[contenteditable="true"]{cursor:text;outline:1px solid #4c7dff;white-space:pre-wrap}
    #xck-hint{margin-top:6px;font-size:11px;color:#6b7280}
    #xck-box.min #xck-body{display:none}
  `;

  const box = document.createElement('div');
  box.id = 'xck-box';
  box.innerHTML = `
    <div id="xck-head"><b>igneous 助手</b><span id="xck-min" title="折叠/展开">—</span></div>
    <div id="xck-body">
      <textarea id="xck-in" spellcheck="false" placeholder="粘贴（含 ipb_member_id 与 ipb_pass_hash 即可）：
ipb_member_id:8973071
ipb_pass_hash:feba317f...
igneous:（可留空）"></textarea>
      <button id="xck-go">填入页面 · 选美国节点 · 取 igneous</button>
      <div id="xck-status"></div>
      <div id="xck-out" title="单击复制 · 双击编辑"></div>
      <div id="xck-hint">结果区：单击复制，双击编辑</div>
    </div>
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = STYLE;

  const mount = () => {
    if (document.getElementById('xck-box')) return;
    document.head.appendChild(styleEl);
    document.body.appendChild(box);
    wire();
  };

  /* ----------------------------- 交互逻辑 ----------------------------- */

  const setStatus = (msg, color) => {
    const el = box.querySelector('#xck-status');
    el.textContent = msg;
    el.style.color = color || '#9aa4b2';
  };

  const renderResult = (member_id, pass_hash, igneous) => {
    const out = box.querySelector('#xck-out');
    out.textContent =
      `ipb_member_id:${member_id}\n` +
      `ipb_pass_hash:${pass_hash}\n` +
      `igneous:${igneous}`;
    out.style.display = 'block';
  };

  // 选美国节点：先试 <select>，再试 radio / 可点元素
  const pickUsNode = () => {
    const kw = CONFIG.usKeywords.map((k) => k.toLowerCase());
    const hit = (s) => kw.some((k) => s.includes(k));

    const sel = $first(CONFIG.nodeSelect);
    if (sel && sel.tagName === 'SELECT') {
      for (const opt of sel.options) {
        const txt = `${opt.textContent} ${opt.value}`.toLowerCase();
        if (hit(txt)) {
          sel.value = opt.value;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
      }
    }
    // radio / label / 按钮
    const candidates = document.querySelectorAll(
      'label, button, [role="radio"], input[type="radio"], .node, [class*="node" i]'
    );
    for (const el of candidates) {
      const txt = (el.textContent || el.value || '').toLowerCase();
      if (txt && hit(txt)) {
        (el.querySelector('input,button') || el).click();
        return true;
      }
    }
    return false;
  };

  const pickSubmit = () => {
    const kw = CONFIG.submitKeywords.map((k) => k.toLowerCase());
    const btns = document.querySelectorAll(CONFIG.submitBtn.join(','));
    // 先找文本匹配关键词的
    for (const b of btns) {
      const txt = (b.textContent || b.value || '').toLowerCase();
      if (kw.some((k) => txt.includes(k))) return b;
    }
    // 退而求其次：第一个 submit
    return $first(CONFIG.submitBtn);
  };

  // 定位「结果」容器：先试显式候选，再找「结果」标题后面的那块内容
  const getResultContainer = () => {
    const el = $first(CONFIG.resultOutput);
    if (el) return el;
    const kw = CONFIG.resultHeading.map((k) => k.toLowerCase());
    const heads = document.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"],b,strong,legend');
    for (const h of heads) {
      const t = (h.textContent || '').trim().toLowerCase();
      if (kw.some((k) => t === k || t.includes(k))) {
        // 取标题之后第一个有内容的兄弟/邻近元素
        let n = h.nextElementSibling;
        while (n && !(n.textContent || '').trim()) n = n.nextElementSibling;
        if (n) return n;
        if (h.parentElement) return h.parentElement;
      }
    }
    return null;
  };

  const readRawResult = () => {
    const el = getResultContainer();
    if (!el) return '';
    return (el.value || el.textContent || '').trim();
  };

  const readIgneous = () => {
    const raw = readRawResult();
    if (raw && !/等待输入|waiting|请/i.test(raw)) {
      const g = extractIgneousFromText(raw);
      if (g) return g;
    }
    // 兜底：全页文本里找 igneous=...
    return extractIgneousFromText(document.body.innerText);
  };

  const run = async () => {
    const goBtn = box.querySelector('#xck-go');
    const raw = box.querySelector('#xck-in').value;
    const { member_id, pass_hash, igneous: inIgneous } = parseInput(raw);

    if (!member_id || !pass_hash) {
      setStatus('未识别到 ipb_member_id 和 ipb_pass_hash，两者都要有。', '#ff8080');
      return;
    }

    goBtn.disabled = true;
    try {
      // 1) 填输入框
      const midEl = $first(CONFIG.memberIdInput);
      const phEl = $first(CONFIG.passHashInput);
      if (!midEl || !phEl) {
        setStatus(
          '没找到页面上的 member_id / pass_hash 输入框。\n请打开脚本顶部 CONFIG 调整选择器。',
          '#ff8080'
        );
        goBtn.disabled = false;
        return;
      }
      setNativeValue(midEl, member_id);
      setNativeValue(phEl, pass_hash);
      setStatus('已填入账号信息…');

      // 2) 选美国节点
      const nodeOk = pickUsNode();
      setStatus(nodeOk ? '已选美国节点，提交请求…' : '未找到美国节点，直接提交…');
      await sleep(200);

      // 3) 记录提交前的 igneous，便于判断是否刷新出新值
      const before = readIgneous();

      // 4) 点提交
      const submit = pickSubmit();
      if (!submit) {
        setStatus('没找到提交按钮，请调整 CONFIG.submitBtn。', '#ff8080');
        goBtn.disabled = false;
        return;
      }
      submit.click();

      // 5) 轮询等待新的 igneous
      const deadline = Date.now() + WAIT_TIMEOUT;
      let igneous = '';
      while (Date.now() < deadline) {
        await sleep(POLL_INTERVAL);
        const now = readIgneous();
        if (now && now !== before) {
          igneous = now;
          break;
        }
      }
      if (!igneous) igneous = readIgneous();

      if (igneous) {
        renderResult(member_id, pass_hash, igneous);
        setStatus('完成 ✓', '#7ddb8a');
      } else {
        // 拿不到也把已知的展示出来（igneous 留空或用输入里的）
        renderResult(member_id, pass_hash, inIgneous || '');
        setStatus('已提交，但没自动读到新的 igneous。\n请在页面上确认，或调整 CONFIG.resultOutput。', '#ffc56b');
      }
    } catch (e) {
      setStatus('出错：' + (e && e.message ? e.message : e), '#ff8080');
    } finally {
      goBtn.disabled = false;
    }
  };

  const wire = () => {
    box.querySelector('#xck-go').addEventListener('click', run);

    // 折叠/展开
    box.querySelector('#xck-min').addEventListener('click', () => {
      box.classList.toggle('min');
      box.querySelector('#xck-min').textContent = box.classList.contains('min') ? '+' : '—';
    });

    // 结果区：单击复制，双击编辑
    const out = box.querySelector('#xck-out');
    let clickTimer = null;
    out.addEventListener('click', () => {
      if (out.isContentEditable) return; // 编辑态不触发复制
      if (clickTimer) return;
      clickTimer = setTimeout(() => {
        clickTimer = null;
        const text = out.textContent;
        try {
          if (typeof GM_setClipboard === 'function') GM_setClipboard(text, 'text');
          else navigator.clipboard.writeText(text);
          const hint = box.querySelector('#xck-hint');
          const old = hint.textContent;
          hint.textContent = '已复制 ✓';
          hint.style.color = '#7ddb8a';
          setTimeout(() => {
            hint.textContent = old;
            hint.style.color = '#6b7280';
          }, 1200);
        } catch (_) {}
      }, 250); // 等一下，区分单击/双击
    });
    out.addEventListener('dblclick', () => {
      if (clickTimer) {
        clearTimeout(clickTimer);
        clickTimer = null;
      }
      out.setAttribute('contenteditable', 'true');
      out.focus();
      // 选中全部，方便改
      const r = document.createRange();
      r.selectNodeContents(out);
      const s = window.getSelection();
      s.removeAllRanges();
      s.addRange(r);
    });
    out.addEventListener('blur', () => out.removeAttribute('contenteditable'));

    // 头部拖动
    const head = box.querySelector('#xck-head');
    let drag = null;
    head.addEventListener('mousedown', (e) => {
      if (e.target.id === 'xck-min') return;
      const rect = box.getBoundingClientRect();
      drag = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
      e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
      if (!drag) return;
      box.style.left = e.clientX - drag.dx + 'px';
      box.style.top = e.clientY - drag.dy + 'px';
      box.style.right = 'auto';
    });
    document.addEventListener('mouseup', () => (drag = null));
  };

  if (document.body) mount();
  else window.addEventListener('DOMContentLoaded', mount);
})();
