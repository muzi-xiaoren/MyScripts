// ==UserScript==
// @name         PT 助手 · 不可躺
// @namespace    https://github.com/muzi-xiaoren/MyScripts
// @version      1.0.1
// @description  www.tangpt.top 每日流程助手，每一步一个独立开关：① 收件箱清理 ② 一百连抽 + 结果累计 ③ 领取任务(月末领 VIP，平时领苍蝇腿) ④ 签到得魔力 ⑤ 老虎机开转两次 ⑥ 回主页。抽奖与老虎机结果记在侧边悬浮框里，按天持久化。
// @author       muzi-xiaoren
// @match        https://www.tangpt.top/index.php*
// @match        https://www.tangpt.top/messages.php*
// @match        https://www.tangpt.top/task.php*
// @match        https://www.tangpt.top/omnibot_lottery.php*
// @match        https://www.tangpt.top/omnibot_slot.php*
// @run-at       document-end
// @noframes
// @grant        none
// @homepageURL  https://github.com/muzi-xiaoren/MyScripts
// @supportURL   https://github.com/muzi-xiaoren/MyScripts/issues
// @downloadURL  https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-tangpt-helper/pt-tangpt-helper.user.js
// @updateURL    https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-tangpt-helper/pt-tangpt-helper.user.js
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  // ===== 每一步一个开关，改 false 就跳过这步（流程会直接走下一步）=====
  const FEATURES = {
    mailClean: true,   // 第一步：收件箱清理
    lottery: true,     // 第二步：一百连抽 + 结果累计
    task: true,        // 第三步：领取任务
    checkin: true,     // 第四步：签到得魔力
    slot: true,        // 第五步：老虎机开转
    home: true,        // 第六步：回主页
  };

  // 自动串联：做完一步就自己跳到下一步的页面。关掉则只做当前页面这一步。
  const CHAIN = {
    enabled: true,
    hopDelay: 1200,
    maxAttempts: 2,
    // 入口闸门：顶部「签到得魔力」还在（= 今天还没签到）才启动流程；
    // 已经签到过就说明今天跑过了，整个不启动。改 false 可以无条件启动。
    requirePendingCheckin: true,
  };

  const MAIL = {
    unreadDeletePrefix: '任务',  // 未读只删标题以此开头的，其余未读一律保留
    box: 1,
    pageSleep: 400,
    maxPages: 500,
  };

  const LOTTERY = {
    drawCount: 100,          // 点哪个按钮：1 / 10 / 20 / 50 / 100
    maxDrawsPerDay: 10,      // 每天最多抽 drawCount × 这个数（= 1000 抽）。上限是防手滑，
                             // 一次一百连抽就是 200 万魔力，没它刷几次页面就抽空了
  };

  const TASK = {
    dailyName: '苍蝇腿',     // 平时领这个（站点上就叫「苍蝇腿」）
    monthlyName: 'VIP',     // 每月最后一天领这个
  };

  const SLOT = {
    spins: 2,               // 开转几次
    gapMs: 1500,            // 两次之间的等待（另外还会尊重服务端返回的冷却时间）
  };

  const RESPONSE_TIMEOUT = 30000;

  const today = new Date().toLocaleDateString('en-CA');
  const path = location.pathname;
  const sleep = (ms) => new Promise((s) => setTimeout(s, ms));
  const fmt = (n) => Number(n || 0).toLocaleString('en-US');
  const errMsg = (e) => (e && e.message ? e.message : String(e));
  const el = (tag, css, props) => Object.assign(Object.assign(document.createElement(tag), props || {}), { style: css });

  const isLastDayOfMonth = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() === d.getDate();
  };

  // ---------- 当天状态 ----------
  const KEY = 'mzx-tangpt';
  const blank = () => ({
    date: today,
    done: {},
    attempts: {},
    notes: {},
    lottery: { draws: 0, cost: 0, comp: 0, bonusWon: 0, bonusAfter: null, items: {} },
    slot: { spins: 0, free: 0, cost: 0, payout: 0, wins: 0, jackpots: 0, balanceAfter: null, combos: {} },
  });

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!s || s.date !== today) return blank();
      const b = blank();
      return Object.assign(b, s, { lottery: Object.assign(b.lottery, s.lottery), slot: Object.assign(b.slot, s.slot) });
    } catch (e) {
      return blank();
    }
  }
  let st = load();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };

  // ---------- 悬浮框 ----------
  const box = el('div', `position:fixed;right:16px;top:96px;z-index:2147483000;width:330px;max-height:74vh;overflow:auto;
    background:#1f2328;color:#e6edf3;border:1px solid #3d444d;border-radius:12px;padding:14px 16px;
    font:13px/1.6 system-ui,-apple-system,"PingFang SC",sans-serif;box-shadow:0 12px 48px rgba(0,0,0,.55)`);
  const head = el('div', 'display:flex;align-items:center;justify-content:space-between;margin-bottom:6px');
  head.appendChild(el('b', 'font-weight:600', { textContent: '今日记录' }));
  const closeBtn = el('span', 'cursor:pointer;opacity:.6;padding:0 2px;font-size:16px', { textContent: '×' });
  closeBtn.onclick = () => box.remove();
  head.appendChild(closeBtn);
  const statusEl = el('div', 'font-size:12px;opacity:.75;margin-bottom:8px;white-space:pre-wrap');
  const bodyEl = el('div', 'white-space:pre-wrap;font:12px/1.7 ui-monospace,monospace');
  const barEl = el('div', 'display:flex;gap:8px;margin-top:10px');
  const BTN = `flex:1;padding:6px 0;border-radius:6px;border:1px solid #3d444d;background:#0d1117;color:#e6edf3;cursor:pointer;font:12px system-ui`;
  const copyBtn = el('button', BTN, { textContent: '复制' });
  const resetBtn = el('button', BTN, { textContent: '重置流程' });
  barEl.append(copyBtn, resetBtn);
  box.append(head, statusEl, bodyEl, barEl);
  document.body.appendChild(box);

  const note = (t) => { st.notes[path] = t; save(); statusEl.textContent = progressLine() + (t ? '\n' + t : ''); };

  function progressLine() {
    return STEPS.filter((s) => FEATURES[s.key])
      .map((s) => (st.done[s.key] ? '✓' : '·') + s.label)
      .join(' ');
  }

  // 奖品口径直接用站点自己的 summary_entries（{key,label,amount,unit}），
  // 不去解析 content —— content 是「2张补签卡全部折算」这类整句，切不干净。
  // key === 'bonus' 的是抽中的魔力，按「只记总变化」单独汇总，不逐条列。
  function absorbLottery(res) {
    const L = st.lottery;
    L.draws += Number(res.draw_count) || 0;
    L.cost += Number(res.total_cost) || 0;
    L.comp += Number(res.total_compensated_bonus) || 0;
    if (res.user_bonus_after != null) L.bonusAfter = Number(res.user_bonus_after);

    for (const r of res.results || []) {
      const fallback = String(r.prize_name || '未命名奖品');
      const entries = Array.isArray(r.summary_entries) && r.summary_entries.length
        ? r.summary_entries
        : [{ key: fallback, label: fallback, amount: 0, unit: '' }];
      entries.forEach((e, idx) => {
        const key = String(e.key || e.label || fallback);
        const amount = Number(e.amount) || 0;
        if (key === 'bonus') { L.bonusWon += amount; return; }
        const b = L.items[key] || (L.items[key] = {
          label: String(e.label || key), unit: String(e.unit || ''),
          amount: 0, granted: 0, compBonus: 0, count: 0, raw: {},
        });
        b.amount += amount;
        b.count += 1;
        // 站点原话留着当兜底：折算类奖品的 entry.amount 是 0，数量只写在 content 那句里
        // （「2张补签卡全部折算」），规则算不出数量时就把这句照搬进悬浮框。
        const raw = String(r.content == null ? '' : r.content).trim();
        if (raw) b.raw[raw] = (b.raw[raw] || 0) + 1;
        // comp_bonus 挂在整条 result 上，只落到它的第一个条目，多条目时不重复计入
        if (r.is_compensated) { if (idx === 0) b.compBonus += Number(r.comp_bonus) || 0; }
        else b.granted += amount;
      });
    }
    save();
    paint();
  }

  function absorbSlot(res) {
    const S = st.slot;
    S.spins += 1;
    if (res.is_free_spin) S.free += 1;
    S.cost += Number(res.total_cost) || 0;
    S.payout += Number(res.payout != null ? res.payout : res.reward) || 0;
    if (res.result === 'win') S.wins += 1;
    if (res.is_jackpot || res.result === 'jackpot') S.jackpots += 1;
    if (res.balance_after != null) S.balanceAfter = Number(res.balance_after);
    const name = (res.row && (res.row.name || res.row.combo)) || (res.result === 'win' ? '中奖' : '未中奖');
    const c = S.combos[name] || (S.combos[name] = { count: 0, payout: 0 });
    c.count += 1;
    c.payout += Number(res.payout != null ? res.payout : res.reward) || 0;
    save();
    paint();
  }

  // 行的形状按「有没有单位」「有没有实发」决定：
  //   有单位 + 有实发 → 名称：总量单位（已发放X单位，其余折算N魔力）
  //   有单位 + 全折算 → 名称：总量单位（已折算N魔力）
  //   有单位 + 无折算 → 名称：总量单位
  //   无单位          → 名称：折算N魔力 / 已折算N魔力
  function lotteryLines() {
    const L = st.lottery;
    const out = [
      `消耗魔力值：${fmt(L.cost)}`,
      `魔力值：${L.bonusAfter == null ? '—' : fmt(L.bonusAfter) + '点'}`,
      `抽中魔力值：${fmt(L.bonusWon)}点`,
      `折算魔力值：${fmt(L.comp)}`,
      '',
    ];
    for (const b of Object.values(L.items)) {
      // 规则算不出数量（折算类奖品的 amount 是 0）就退回站点原话，一行一条、带出现次数
      if (!(b.amount > 0)) {
        const raws = Object.entries(b.raw || {});
        if (raws.length) {
          for (const [text, n] of raws) out.push(n > 1 ? `${text} ×${fmt(n)}` : text);
        } else {
          out.push(`${b.label}：${fmt(b.count)} 次`);
        }
        continue;
      }
      const head = `${b.label}：${fmt(b.amount)}${b.unit}`;
      if (!b.compBonus) { out.push(head); continue; }
      out.push(b.granted
        ? `${head}（已发放${fmt(b.granted)}${b.unit}，其余折算${fmt(b.compBonus)}魔力）`
        : `${head}（已折算${fmt(b.compBonus)}魔力）`);
    }
    return out.join('\n');
  }

  function slotLines() {
    const S = st.slot;
    const out = [
      `开转次数：${fmt(S.spins)}${S.free ? `（免费 ${fmt(S.free)} 次）` : ''}`,
      `消耗魔力值：${fmt(S.cost)}`,
      `中奖魔力值：${fmt(S.payout)}`,
      `净变化：${S.payout - S.cost >= 0 ? '+' : ''}${fmt(S.payout - S.cost)}`,
      `魔力值：${S.balanceAfter == null ? '—' : fmt(S.balanceAfter) + '点'}`,
      '',
    ];
    for (const [name, c] of Object.entries(S.combos)) {
      out.push(`${name}：${fmt(c.count)} 次${c.payout ? `，${fmt(c.payout)}魔力` : ''}`);
    }
    return out.join('\n');
  }

  function report() {
    const parts = [];
    parts.push('【抽奖】\n' + (st.lottery.draws ? lotteryLines() : '今天还没有抽奖记录。'));
    parts.push('【老虎机】\n' + (st.slot.spins ? slotLines() : '今天还没有开转记录。'));
    return parts.join('\n\n');
  }

  function paint() {
    statusEl.textContent = progressLine() + (st.notes[path] ? '\n' + st.notes[path] : '');
    bodyEl.textContent = report();
  }

  copyBtn.onclick = () => {
    navigator.clipboard.writeText(report()).then(
      () => { copyBtn.textContent = '已复制'; setTimeout(() => (copyBtn.textContent = '复制'), 1200); },
      () => { copyBtn.textContent = '复制失败'; }
    );
  };
  resetBtn.onclick = () => {
    if (!confirm('重置今天的流程进度和记录？只清本地数据，不影响站点。')) return;
    st = blank();
    save();
    paint();
  };

  // ---------- 抓站点自己的 $.post ----------
  // 抽奖和老虎机都由站点自己发请求，这里只搭一层旁路读响应，不重实现请求。
  // 认领域靠字段而不靠 URL——带查询串的字符串在浏览器扩展里读不到。
  const waiters = [];
  function dispatch(res) {
    if (!res || typeof res !== 'object') return;
    if (Array.isArray(res.results) && res.draw_count != null) absorbLottery(res);
    else if (res.reels && res.result != null) absorbSlot(res);
    for (const w of waiters.splice(0)) w(res);
  }
  function tap() {
    const jq = window.jQuery;
    if (!jq) return false;
    if (jq.__mzxTapped) return true;
    const orig = jq.post;
    jq.post = function () {
      const p = orig.apply(this, arguments);
      if (p && typeof p.then === 'function') p.then(dispatch, () => {});
      return p;
    };
    jq.__mzxTapped = true;
    return true;
  }
  const nextResponse = (ms) => new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('等响应超时')), ms);
    waiters.push((res) => { clearTimeout(t); resolve(res); });
  });

  // ---------- fetch 抗抖 ----------
  async function tryFetch(url, opts) {
    let lastErr;
    for (let i = 1; i <= 3; i++) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10000);
      try {
        const r = await fetch(url, Object.assign({ credentials: 'same-origin' }, opts, { signal: ctrl.signal }));
        clearTimeout(timer);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r;
      } catch (e) {
        clearTimeout(timer);
        lastErr = e;
        if (i < 3) await sleep(800 * i);
      }
    }
    throw lastErr;
  }
  const parse = async (r) => new DOMParser().parseFromString(await r.text(), 'text/html');

  // ---------- 各步实现 ----------
  const RUNNERS = {
    async mailClean() {
      const pageUrl = (p) => `/messages.php?action=viewmailbox&box=${MAIL.box}&page=${p}`;
      const scanDoc = (doc) =>
        [...doc.querySelectorAll('input[name="messages[]"]')].map((cb) => {
          const tr = cb.closest('tr');
          const img = tr.querySelector('img[alt="Read"], img[alt="Unread"]');
          const link = tr.querySelector('a[href*="viewmessage"]');
          return { id: cb.value, subject: link ? link.textContent.trim() : '', read: img ? img.alt === 'Read' : false };
        });
      const hit = (m) => m.read || m.subject.startsWith(MAIL.unreadDeletePrefix);

      const first = await parse(await tryFetch(pageUrl(0)));
      const nums = [...first.querySelectorAll('a[href*="page="]')]
        .map((a) => Number(new URLSearchParams((a.getAttribute('href') || '').split('?')[1]).get('page')))
        .filter((n) => Number.isFinite(n));
      const last = nums.length ? Math.min(Math.max(...nums), MAIL.maxPages) : 0;

      let del = 0, keep = 0;
      // 倒着翻页。删掉一封，它后面的邮件会往前挪一格；正序翻会把挪过页边界的整批漏掉。
      for (let p = last; p >= 0; p--) {
        const list = scanDoc(await parse(await tryFetch(pageUrl(p))));
        const doomed = list.filter(hit);
        del += doomed.length;
        keep += list.length - doomed.length;
        if (doomed.length) {
          const body = new URLSearchParams({ action: 'moveordel', delete: '1' });
          doomed.forEach((m) => body.append('messages[]', m.id));
          await tryFetch('/messages.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body,
          });
        }
        note(`清理中… 第 ${last - p + 1}/${last + 1} 页 · 已删 ${fmt(del)} · 保留 ${fmt(keep)}`);
        await sleep(MAIL.pageSleep);
      }
      note(`清理完成：已删 ${fmt(del)} 封，保留 ${fmt(keep)} 封`);
    },

    async lottery() {
      if (st.lottery.draws >= LOTTERY.drawCount * LOTTERY.maxDrawsPerDay) {
        note('今天的抽奖已达上限，跳过');
        return;
      }
      const b = document.querySelector(`button.omnibot-draw-trigger[data-draw-count="${LOTTERY.drawCount}"]`);
      if (!b) throw new Error(`页面上没有「${LOTTERY.drawCount} 连」按钮`);
      const wait = nextResponse(RESPONSE_TIMEOUT);
      b.click();
      await wait;
      note(`已抽 ${LOTTERY.drawCount} 连`);
    },

    async task() {
      const last = isLastDayOfMonth();
      const want = last ? TASK.monthlyName : TASK.dailyName;
      const inp = [...document.querySelectorAll('input.claim')].find((i) => {
        const tr = i.closest('tr');
        const c0 = tr && tr.cells[0];
        return c0 && c0.textContent.trim().startsWith(want);
      });
      if (!inp) {
        note(`没找到可领取的「${want}」（可能已领过）`);
        return;
      }
      const res = await window.jQuery.post('ajax.php', { action: 'claimTask', exam_id: inp.getAttribute('data-id') });
      const msg = res && res.msg ? String(res.msg).replace(/<[^>]*>/g, '').trim() : '';
      note(`${last ? '月末' : '日常'}任务「${want}」：${msg || '已提交领取'}`);
    },

    async checkin() {
      const doc = await parse(await tryFetch('/attendance.php'));
      const tds = doc.querySelectorAll('td.text');
      const detail = tds.length ? tds[tds.length - 1].textContent.trim().replace(/\s+/g, ' ') : '';
      const pending = !!doc.querySelector('a.faqlink[href*="attendance.php"]');
      note('签到：' + (detail.slice(0, 60) || (pending ? '未生效' : '已完成')));
      if (pending) throw new Error('签到似乎没有生效');
    },

    async slot() {
      const btn = document.querySelector('#slot-spin-btn');
      if (!btn) throw new Error('页面上没有「开始开转」按钮');
      for (let i = st.slot.spins; i < SLOT.spins; i++) {
        note(`开转 ${i + 1}/${SLOT.spins}…`);
        const wait = nextResponse(RESPONSE_TIMEOUT);
        btn.click();
        const res = await wait;
        const cd = Number(res && res.page_state && res.page_state.spin_cooldown_remaining) || 0;
        await sleep(Math.max(SLOT.gapMs, cd * 1000));
      }
      note(`开转完成 ${fmt(st.slot.spins)} 次`);
    },

    async home() {
      note('流程结束');
    },
  };

  const STEPS = [
    { key: 'mailClean', page: '/messages.php', label: '邮箱' },
    { key: 'lottery', page: '/omnibot_lottery.php', label: '抽奖' },
    { key: 'task', page: '/task.php', label: '任务' },
    { key: 'checkin', page: '/index.php', label: '签到' },
    { key: 'slot', page: '/omnibot_slot.php', label: '老虎机' },
    { key: 'home', page: '/index.php', label: '主页' },
  ];

  const firstPending = () =>
    STEPS.find((s) => FEATURES[s.key] && !st.done[s.key] && (st.attempts[s.key] || 0) < CHAIN.maxAttempts);

  async function runChain() {
    if (!tap()) { note('页面 jQuery 未就绪'); return; }
    for (;;) {
      const step = firstPending();
      if (!step) { note('今天的流程已全部完成'); return; }
      if (step.page !== path) {
        if (!CHAIN.enabled) { note('下一步：' + step.label + '（自动串联已关闭）'); return; }
        note('前往「' + step.label + '」…');
        await sleep(CHAIN.hopDelay);
        location.href = step.page;
        return;
      }
      st.attempts[step.key] = (st.attempts[step.key] || 0) + 1;
      save();
      note('「' + step.label + '」进行中…');
      try {
        await RUNNERS[step.key]();
        st.done[step.key] = true;
        save();
        paint();
      } catch (e) {
        note('「' + step.label + '」失败：' + errMsg(e));
        return;
      }
    }
  }

  // 闸门只管「启不启动」，不管「继不继续」：第四步签到成功后顶部那个入口就没了，
  // 要是每次页面加载都拿它拦一下，第五、六步会被自己刚做完的签到挡死。
  // 所以当天已经动过的流程一律放行。
  const checkinPending = () => !!document.querySelector('a.faqlink[href*="attendance.php"]');
  const startedToday = Object.keys(st.done).length > 0 || Object.keys(st.attempts).length > 0;

  paint();
  if (CHAIN.requirePendingCheckin && !startedToday && !checkinPending()) {
    note('今天已签到，流程不启动');
  } else {
    runChain();
  }
})();
