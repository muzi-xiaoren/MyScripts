// ==UserScript==
// @name         PT 签到 · VC-Lib
// @namespace    https://github.com/muzi-xiaoren/MyScripts
// @version      1.0.1
// @description  打开 pt.vclib.online 时自动检测签到状态：未签到就在当前页正中央弹出站点自己的验证码，输满字符即自动完成签到（验证码由你本人识别，脚本不代填）；已签到则什么都不做。
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

// 【为什么这个站不能像别的站那样全自动】
// VC-Lib 的签到页是 NexusPHP 的经典图形验证码：一张 image.php 生成的扭曲字符图 +
// 一个 imagestring 输入框 + 一个 imagehash 隐藏域，POST 回 attendance.php 才算签到。
// 这道题就是用来确认「屏幕前是人」的，脚本去识别它就等于把这道防线拆了——本脚本不做这件事。
// 能自动的部分全自动：判断今天签没签、把验证码取到你当前页面、提交、回填结果、刷新页面；
// 唯一留给你的动作是照着图片敲 6 个字符（输满自动提交）。

(function () {
  'use strict';

  // 【配置】签到成功后跳转到的页面。留空 '' 则原地刷新当前页。
  const RETURN_TO = '';
  // 验证码字符数：输满这么多字符就自动提交，不用再按回车（回车照样能提交）。
  // 站点当前是 6 位；哪天改了长度，把这里改掉即可（改小了也不会卡住，回车兜底）。
  const CODE_LENGTH = 6;
  // 验证码图放大倍数 + 滤镜：原图只有 150x40，放大加对比度纯粹是为了让你看清，
  // 不做任何识别（见文件顶部说明）。
  const IMAGE_SCALE = 2;
  const IMAGE_FILTER = 'contrast(1.35) saturate(0.9)';
  // 网络抗抖：单次请求超时(毫秒) + 失败最多重试次数（线性退避）。
  const FETCH_TIMEOUT = 8000;
  const FETCH_TRIES = 3;

  const DONE_KEY = 'mzx-pter-attendance';
  const HIDE_KEY = 'mzx-pter-attendance-hidden';
  const today = new Date().toLocaleDateString('en-CA');

  // NexusPHP 经典签到入口：未签到时顶部是 <a class="faqlink" href="attendance.php">[签到得魔力]</a>，
  // 签到后 faqlink class 被清空、文字变成「已签到…」。靠这个结构判断，不匹配文字（各站文案不同）。
  const isPending = (doc) => !!doc.querySelector('a.faqlink[href*="attendance.php"]');
  if (!isPending(document)) return;                       // 已签到 / 当前页无入口
  if (localStorage.getItem(DONE_KEY) === today) return;   // 兜底：一天只弹一次
  if (sessionStorage.getItem(HIDE_KEY) === today) return; // 本次浏览器会话里被你关掉过

  async function tryFetch(url, opts) {
    let lastErr;
    for (let i = 1; i <= FETCH_TRIES; i++) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
      try {
        const r = await fetch(url, Object.assign({ credentials: 'same-origin' }, opts, { signal: ctrl.signal }));
        clearTimeout(timer);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r;
      } catch (e) {
        clearTimeout(timer);
        lastErr = e;
        if (i < FETCH_TRIES) await new Promise((s) => setTimeout(s, 800 * i));
      }
    }
    throw lastErr;
  }

  const parse = async (r) => new DOMParser().parseFromString(await r.text(), 'text/html');

  // 取一张新验证码：图片地址和 imagehash 必须来自同一次请求（服务端按 hash 存答案），
  // 所以「换一张」也是重新拉整个签到页，而不是单独刷图片。
  async function loadCaptcha() {
    const doc = await parse(await tryFetch('/attendance.php'));
    const form = doc.querySelector('form[action*="attendance.php"]');
    const img = form && form.querySelector('img[src*="image.php"]');
    const hash = form && form.querySelector('input[name="imagehash"]');
    if (!img || !hash || !hash.value) return null;
    return { src: new URL(img.getAttribute('src'), location.origin).href, hash: hash.value };
  }

  // 提交签到。成功与否不看文案，仍然看顶部横幅：返回的页面里签到入口没了就是成功。
  async function submit(hash, text) {
    const doc = await parse(await tryFetch('/attendance.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ imagehash: hash, imagestring: text }),
    }));
    const banner = doc.querySelector('a[href*="attendance.php"]');
    return {
      ok: !isPending(doc),
      note: banner ? banner.textContent.trim() : '',
      err: (doc.body ? doc.body.innerText : '').replace(/\s+/g, ' ').slice(0, 120),
    };
  }

  const el = (tag, css, props) => Object.assign(Object.assign(document.createElement(tag), props || {}), { style: css });

  function panel() {
    const box = el('div', `position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2147483000;
      background:#1f2328;color:#e6edf3;border:1px solid #3d444d;border-radius:12px;
      padding:16px 18px;font:13px/1.5 system-ui,-apple-system,"PingFang SC",sans-serif;
      box-shadow:0 12px 48px rgba(0,0,0,.55)`);

    const head = el('div', 'display:flex;align-items:center;justify-content:space-between;gap:24px;margin-bottom:10px');
    head.appendChild(el('b', 'font-weight:600', { textContent: '今日未签到' }));
    const close = el('span', 'cursor:pointer;opacity:.6;padding:0 2px;font-size:16px', { textContent: '×', title: '今天不再提醒' });
    close.onclick = () => { sessionStorage.setItem(HIDE_KEY, today); box.remove(); };
    head.appendChild(close);

    // 放大用 width/image-rendering 而不是 transform，免得把下面的输入框顶开。
    const img = el('img', `display:block;width:${150 * IMAGE_SCALE}px;border-radius:6px;background:#fff;
      cursor:pointer;margin-bottom:10px;filter:${IMAGE_FILTER};image-rendering:auto`,
      { title: '点击换一张' });
    const input = el('input', `width:100%;box-sizing:border-box;padding:7px 9px;border-radius:6px;
      border:1px solid #3d444d;background:#0d1117;color:#e6edf3;
      font:15px/1.4 ui-monospace,monospace;letter-spacing:2px;text-align:center`,
      { placeholder: `输入图中 ${CODE_LENGTH} 个字符`, autocomplete: 'off', spellcheck: false });
    const tip = el('div', 'margin-top:8px;font-size:12px;opacity:.75;min-height:16px;text-align:center');

    box.append(head, img, input, tip);
    document.body.appendChild(box);
    return { box, img, input, tip };
  }

  (async function run() {
    let cap;
    try {
      cap = await loadCaptcha();
    } catch (e) {
      return; // 网络失败：不打扰，下次开页面再说
    }
    if (!cap) return;

    const ui = panel();
    ui.img.src = cap.src;

    // 只在你没在输别的东西时才抢焦点，免得打断站内搜索。
    if (document.activeElement === document.body) ui.input.focus();

    // msg：换图的原因（如「验证码不对」）。换完要把它留在提示区——早先版本在这里
    // 无条件清空提示，输错验证码时就只是悄悄换一张图，一个字的反馈都没有，
    // 手感和「输完没反应」一模一样。
    async function refresh(msg) {
      ui.tip.textContent = msg ? msg + '，换一张…' : '换一张…';
      try {
        const next = await loadCaptcha();
        if (next) { cap = next; ui.img.src = next.src; }
        ui.tip.textContent = msg || '';
        ui.input.value = '';
        ui.input.focus();
      } catch (e) {
        ui.tip.textContent = '取验证码失败，点图片重试';
      }
    }
    // 包一层：onclick 会把 MouseEvent 当成 msg 传进去。
    ui.img.onclick = () => refresh();

    let busy = false;
    async function go() {
      const text = ui.input.value.trim();
      if (busy || !text) return;
      busy = true;
      ui.tip.textContent = '签到中…';
      try {
        const res = await submit(cap.hash, text);
        if (res.ok) {
          localStorage.setItem(DONE_KEY, today);
          ui.tip.textContent = res.note || '签到成功';
          setTimeout(() => {
            if (RETURN_TO && location.href.replace(/#.*$/, '') !== RETURN_TO) location.href = RETURN_TO;
            else location.reload();
          }, 1200);
          return;
        }
        // 多半是验证码看错了：换一张接着来（hash 已被服务端消费，不能重投）。
        await refresh(/验证码|captcha/i.test(res.err) ? '验证码不对' : '签到未成功');
      } catch (e) {
        ui.tip.textContent = '网络失败，回车重试';
      } finally {
        busy = false;
      }
    }

    // 输满 CODE_LENGTH 位就自动提交；回车始终可用（长度变了 / 粘贴多余字符时的兜底）。
    ui.input.addEventListener('input', () => {
      if (ui.input.value.trim().length >= CODE_LENGTH) go();
    });
    ui.input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') go(); });
  })();
})();
