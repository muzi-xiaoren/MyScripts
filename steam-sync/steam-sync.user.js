// ==UserScript==
// @name         蒸汽同步 SteamSync — Steam 年度回顾与游玩时长上传到 GitHub
// @namespace    https://github.com/muzi-xiaoren/MyScripts
// @version      1.0.0
// @description  在 Steam 商店顶部导航加入「年度回顾」和「GitHub 同步」，把每年的 Steam 年度回顾（含每个游戏的小时数）和全部游戏的累计时长上传到 GitHub，并合并多个账号生成总表。
// @author       muzi-xiaoren
// @match        https://store.steampowered.com/*
// @run-at       document-end
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      api.github.com
// @homepageURL  https://github.com/muzi-xiaoren/MyScripts/tree/main/steam-sync
// @supportURL   https://github.com/muzi-xiaoren/MyScripts/issues
// @downloadURL  https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/steam-sync/steam-sync.user.js
// @updateURL    https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/steam-sync/steam-sync.user.js
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  const nav = document.querySelector('#global_header .supernav_container');
  if (!nav || document.getElementById('steamsync')) return;

  const SYNC_KEY = 'steam-sync-config';
  const DEFAULT_DIR = 'steam';
  const FIRST_REPLAY_YEAR = 2022;
  const STEAM_API = 'https://api.steampowered.com';
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  const style = document.createElement('style');
  style.textContent = `
    #steamsync-replay, #steamsync { display: inline-block; vertical-align: top; }
    #steamsync > summary { list-style: none; cursor: pointer; }
    #steamsync > summary::-webkit-details-marker { display: none; }
    #steamsync[open] > summary { color: #fff; }
    #steamsync .steamsync-panel {
      position: fixed; top: 76px; left: 50%; transform: translateX(-50%); z-index: 1000;
      display: grid; gap: 10px; width: min(360px, calc(100vw - 16px)); box-sizing: border-box;
      max-height: calc(100vh - 92px); overflow: auto; padding: 16px;
      border: 1px solid #3a4b5f; border-radius: 6px; background: #1b2838; color: #c6d4df;
      box-shadow: 0 12px 36px rgba(0, 0, 0, .55); text-align: left; text-transform: none;
      font: 13px/1.5 "Motiva Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif;
    }
    #steamsync .steamsync-panel strong { font-size: 15px; color: #fff; }
    #steamsync label { display: grid; gap: 4px; }
    #steamsync input {
      width: 100%; box-sizing: border-box; padding: 6px 8px; border: 1px solid #3a4b5f;
      border-radius: 3px; background: #0e1621; color: #c6d4df; font: inherit;
    }
    #steamsync input:focus { outline: none; border-color: #66c0f4; }
    #steamsync .steamsync-secret { -webkit-text-security: disc; }
    #steamsync .steamsync-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    #steamsync .steamsync-actions { display: flex; flex-wrap: wrap; gap: 8px; }
    #steamsync button {
      padding: 6px 12px; border: 1px solid #3a4b5f; border-radius: 3px; background: #2a3f5a;
      color: #c6d4df; font: inherit; cursor: pointer;
    }
    #steamsync button:hover { color: #fff; }
    #steamsync button[data-action="upload"] { background: #4c8b2b; border-color: #4c8b2b; color: #fff; }
    #steamsync button:disabled { cursor: progress; opacity: .6; }
    #steamsync [role="status"] { margin: 0; color: #8f98a0; overflow-wrap: anywhere; white-space: pre-line; }
    #steamsync [role="status"]:empty { display: none; }
    #steamsync :focus-visible { outline: 2px solid #66c0f4; outline-offset: 2px; }
  `;
  document.head.append(style);

  const userInfo = (() => {
    try { return JSON.parse(document.querySelector('#application_config')?.dataset.userinfo || '{}'); } catch { return {}; }
  })();

  const replayLink = document.createElement('a');
  replayLink.id = 'steamsync-replay';
  replayLink.className = 'menuitem';
  replayLink.href = userInfo.steamid ? `https://store.steampowered.com/replay/${userInfo.steamid}/` : 'https://store.steampowered.com/replay/';
  replayLink.textContent = '年度回顾';

  // 输入框不使用 name 和 password 类型，避免浏览器把面板当成登录表单自动填入账号密码。
  const field = (key, placeholder, secret = false) =>
    `<input data-field="${key}" type="text"${secret ? ' class="steamsync-secret"' : ''} autocomplete="off" spellcheck="false" data-1p-ignore data-lpignore="true" data-bwignore data-form-type="other" placeholder="${placeholder}">`;
  const sync = document.createElement('details');
  sync.id = 'steamsync';
  sync.innerHTML = `
    <summary class="menuitem">GitHub 同步</summary>
    <div class="steamsync-panel">
      <strong>上传 Steam 年度回顾到 GitHub</strong>
      <label>GitHub Token${field('token', 'github_pat_…', true)}</label>
      <label>仓库地址${field('repo', 'https://github.com/owner/repo')}</label>
      <div class="steamsync-row">
        <label>分支（可选）${field('branch', '默认分支')}</label>
        <label>文件目录（可选）${field('path', DEFAULT_DIR)}</label>
      </div>
      <div class="steamsync-actions">
        <button type="button" data-action="save">保存</button>
        <button type="button" data-action="upload">上传</button>
        <button type="button" data-action="index">只重新生成总表</button>
      </div>
      <p role="status" aria-live="polite"></p>
    </div>`;
  nav.append(replayLink, sync);

  const status = sync.querySelector('[role="status"]');
  const buttons = [...sync.querySelectorAll('[data-action="upload"], [data-action="index"]')];
  const saved = GM_getValue(SYNC_KEY, {}) || {};
  sync.querySelectorAll('input').forEach(input => {
    input.value = typeof saved[input.dataset.field] === 'string' ? saved[input.dataset.field] : '';
  });
  document.addEventListener('click', event => { if (sync.open && !sync.contains(event.target)) sync.open = false; });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !sync.open) return;
    const restoreFocus = sync.contains(document.activeElement);
    sync.open = false;
    if (restoreFocus) sync.querySelector('summary').focus();
  });

  function saveConfig() {
    const config = {};
    sync.querySelectorAll('input').forEach(input => { config[input.dataset.field] = input.value.trim(); });
    GM_setValue(SYNC_KEY, config);
    return config;
  }

  const hours = seconds => Math.round(seconds / 360) / 10;
  const pad = value => String(value).padStart(2, '0');
  const localDate = rtime => {
    if (!rtime) return null;
    const date = new Date(rtime * 1000);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };
  const storeUrl = appid => `https://store.steampowered.com/app/${appid}/`;

  function markdownText(value) {
    return String(value ?? '').replace(/[\\|[\]]/g, '\\$&').replace(/\s+/g, ' ').trim();
  }

  const gameLink = game => `[${markdownText(game.name || `App ${game.appid}`)}](${storeUrl(game.appid)})`;

  // 并列名次相同，下一名跳过并列的数量。
  function competitionRanks(items, value) {
    let rank = 0;
    let previous;
    return items.map((item, index) => {
      if (index === 0 || value(item) !== previous) rank = index + 1;
      previous = value(item);
      return rank;
    });
  }

  async function webApiToken() {
    try {
      const token = JSON.parse(document.querySelector('#application_config')?.dataset.store_user_config || '{}').webapi_token;
      if (token) return token;
    } catch { /* 页面没有内嵌配置时改用接口读取 */ }
    const response = await fetch('/pointssummary/ajaxgetasyncconfig', { credentials: 'include' });
    const json = await response.json().catch(() => null);
    if (!json?.data?.webapi_token) throw new Error('读取不到 Steam 登录凭证，请刷新页面后重试');
    return json.data.webapi_token;
  }

  async function steamApi(path, params) {
    const query = new URLSearchParams(params);
    const response = await fetch(`${STEAM_API}/${path}/v1/?${query}`);
    const json = await response.json().catch(() => null);
    if (!response.ok || !json?.response) throw new Error(`Steam 接口 ${path} 返回 ${response.status}`);
    return json.response;
  }

  async function appNames(token, appids) {
    const names = new Map();
    for (let i = 0; i < appids.length; i += 100) {
      const input = {
        ids: appids.slice(i, i + 100).map(appid => ({ appid })),
        context: { language: 'schinese', country_code: userInfo.country_code || 'CN' },
        data_request: {},
      };
      const { store_items: items } = await steamApi('IStoreBrowseService/GetItems', { access_token: token, input_json: JSON.stringify(input) });
      (items || []).forEach(item => { if (item.appid && item.name) names.set(item.appid, item.name); });
    }
    return names;
  }

  async function tagNames() {
    const { tags } = await steamApi('IStoreService/GetTagList', { language: 'schinese' });
    return new Map((tags || []).map(tag => [tag.tagid, tag.name]));
  }

  async function fetchReplay(steamid, accountid, year) {
    const response = await fetch(`/replay/${steamid}/${year}`, { credentials: 'include' });
    if (!response.ok) return null;
    const html = await response.text();
    const config = new DOMParser().parseFromString(html, 'text/html').querySelector('#application_config');
    const raw = config?.getAttribute(`data-yearinreview_${accountid}_${year}`);
    if (!raw) return null;
    const stats = JSON.parse(raw).playtime_stats;
    return stats?.game_summary?.length ? stats : null;
  }

  // 回顾里年度和单个游戏的总秒数为空，但每个月都带了当月总秒数和每个游戏的秒数，逐月相加即为全年精确时长。
  function buildReplay(stats, year) {
    const yearSeconds = {};
    const months = (stats.months || []).map(month => {
      const games = (month.appid || [])
        .map(game => ({ appid: game.appid, seconds: game.stats?.total_playtime_seconds || 0 }))
        .filter(game => game.seconds > 0)
        .sort((a, b) => b.seconds - a.seconds);
      games.forEach(game => { yearSeconds[game.appid] = (yearSeconds[game.appid] || 0) + game.seconds; });
      return { month: `${year}-${pad(new Date(month.rtime_month * 1000).getUTCMonth() + 1)}`, seconds: month.stats?.total_playtime_seconds || 0, games };
    }).sort((a, b) => a.month.localeCompare(b.month));
    const totalSeconds = months.reduce((sum, month) => sum + month.seconds, 0);
    const games = stats.game_summary.map(game => ({
      appid: game.appid,
      seconds: yearSeconds[game.appid] || Math.round(game.total_playtime_percentagex100 / 10000 * totalSeconds),
      percent: game.total_playtime_percentagex100 / 100,
      newThisYear: Boolean(game.new_this_year),
      firstPlayed: localDate(game.rtime_first_played_lifetime),
      platforms: [['played_windows', 'Windows'], ['played_mac', 'Mac'], ['played_linux', 'Linux'], ['played_deck', 'Steam Deck'], ['played_vr', 'VR'], ['played_controller', '手柄']]
        .filter(([key]) => game[key]).map(([, label]) => label),
      demo: Boolean(game.demo || game.playtest),
    })).sort((a, b) => b.seconds - a.seconds);
    const ranks = competitionRanks(games, game => game.seconds);
    return {
      year,
      totalSeconds,
      totalHours: hours(totalSeconds),
      achievements: {
        total: stats.summary_stats?.total_achievements ?? null,
        rare: stats.summary_stats?.total_rare_achievements ?? null,
        games: stats.summary_stats?.total_games_with_achievements ?? null,
      },
      games: games.map((game, index) => ({ rank: ranks[index], ...game, hours: hours(game.seconds) })),
      months: months.map(month => ({ ...month, hours: hours(month.seconds), games: month.games.map(game => ({ ...game, hours: hours(game.seconds) })) })),
      tags: (stats.tag_stats?.stats || []).map(tag => ({ tagid: tag.tag_id, weight: Math.round(Number(tag.tag_weight) * 10) / 10 })),
    };
  }

  function nameReplay(replay, names, tags) {
    const named = game => ({ ...game, name: names.get(game.appid) || null });
    return {
      ...replay,
      games: replay.games.map(named),
      months: replay.months.map(month => ({ ...month, games: month.games.map(named) })),
      tags: replay.tags.map(tag => ({ ...tag, name: tags.get(tag.tagid) || null })),
    };
  }

  function replayMarkdown(steamid, replay) {
    const newGames = replay.games.filter(game => game.newThisYear).length;
    const { achievements } = replay;
    return [
      `# ${replay.year} 年 Steam 年度回顾`,
      '',
      `- 账号：${steamid}`,
      `- 总时长：${replay.totalHours} 小时，游戏 ${replay.games.length} 个（当年新玩 ${newGames} 个）`,
      ...(achievements.total != null ? [`- 成就：${achievements.total} 个（稀有 ${achievements.rare ?? 0} 个，涉及 ${achievements.games ?? 0} 个游戏）`] : []),
      `- 原页面：https://store.steampowered.com/replay/${steamid}/${replay.year}`,
      '',
      '## 游戏',
      '',
      '| 排名 | 游戏 | 小时 | 占比 | 当年新玩 | 首次游玩 | 平台 |',
      '| ---: | --- | ---: | ---: | :---: | --- | --- |',
      ...replay.games.map(game => `| ${game.rank} | ${gameLink(game)}${game.demo ? '（试玩）' : ''} | ${game.hours} | ${game.percent}% | ${game.newThisYear ? '✓' : ''} | ${game.firstPlayed ?? ''} | ${game.platforms.join(' / ')} |`),
      '',
      '## 每月',
      '',
      '| 月份 | 小时 | 玩得最多 |',
      '| --- | ---: | --- |',
      ...replay.months.map(month => `| ${month.month} | ${month.hours} | ${month.games.filter(game => game.hours > 0).slice(0, 3).map(game => `${gameLink(game)} ${game.hours} 小时`).join('、')} |`),
      '',
      ...(replay.tags.length ? [
        '## 标签',
        '',
        '| 标签 | 权重 |',
        '| --- | ---: |',
        ...replay.tags.map(tag => `| ${markdownText(tag.name || tag.tagid)} | ${tag.weight} |`),
        '',
      ] : []),
    ].join('\n');
  }

  function buildLifetime(played, names) {
    const games = played
      .filter(game => game.playtime_forever > 0)
      .map(game => ({
        appid: game.appid,
        name: names.get(game.appid) || null,
        minutes: game.playtime_forever,
        hours: Math.round(game.playtime_forever / 6) / 10,
        recentMinutes: game.playtime_2weeks || 0,
        firstPlayed: localDate(game.first_playtime),
        lastPlayed: localDate(game.last_playtime),
      }))
      .sort((a, b) => b.minutes - a.minutes);
    const ranks = competitionRanks(games, game => game.minutes);
    return games.map((game, index) => ({ rank: ranks[index], ...game }));
  }

  function lifetimeMarkdown(steamid, exportedAt, games) {
    const total = games.reduce((sum, game) => sum + game.minutes, 0);
    return [
      '# Steam 累计游玩时长',
      '',
      `- 账号：${steamid}`,
      `- 导出时间：${exportedAt}`,
      `- 玩过的游戏：${games.length} 个，共 ${Math.round(total / 6) / 10} 小时（包含以前家庭共享借玩的游戏）`,
      '',
      '| 排名 | 游戏 | 小时 | 近两周（分钟） | 首次游玩 | 最近游玩 |',
      '| ---: | --- | ---: | ---: | --- | --- |',
      ...games.map(game => `| ${game.rank} | ${gameLink(game)} | ${game.hours} | ${game.recentMinutes || ''} | ${game.firstPlayed ?? ''} | ${game.lastPlayed ?? ''} |`),
      '',
    ].join('\n');
  }

  // 合并所有账号：累计时长取每个账号最新的快照，年度时长来自各年回顾。
  function buildIndex(accounts, generatedAt) {
    const steamids = Object.keys(accounts).sort();
    const years = [...new Set(steamids.flatMap(steamid => Object.keys(accounts[steamid].replays)))].map(Number).sort();
    const games = new Map();
    const entry = (appid, name) => {
      if (!games.has(appid)) games.set(appid, { appid, name: null, minutes: {}, yearSeconds: {}, firstPlayed: null });
      const game = games.get(appid);
      if (!game.name && name) game.name = name;
      return game;
    };
    const earliest = (a, b) => (!a ? b : !b ? a : a < b ? a : b);
    for (const steamid of steamids) {
      const { lifetime, replays } = accounts[steamid];
      (lifetime?.games || []).forEach(item => {
        const game = entry(item.appid, item.name);
        game.minutes[steamid] = item.minutes;
        game.firstPlayed = earliest(game.firstPlayed, item.firstPlayed);
      });
      Object.values(replays).forEach(replay => replay.games.forEach(item => {
        const game = entry(item.appid, item.name);
        game.yearSeconds[replay.year] = (game.yearSeconds[replay.year] || 0) + item.seconds;
        game.firstPlayed = earliest(game.firstPlayed, item.firstPlayed);
      }));
    }
    const list = [...games.values()].map(game => {
      const totalMinutes = Object.values(game.minutes).reduce((sum, value) => sum + value, 0);
      return {
        ...game,
        totalMinutes,
        totalHours: Math.round(totalMinutes / 6) / 10,
        accounts: steamids.filter(steamid => game.minutes[steamid] || Object.values(accounts[steamid].replays).some(replay => replay.games.some(item => item.appid === game.appid))),
      };
    }).sort((a, b) => b.totalMinutes - a.totalMinutes || (a.firstPlayed || '').localeCompare(b.firstPlayed || ''));
    const ranks = competitionRanks(list, game => game.totalMinutes);
    const summary = steamids.map(steamid => ({
      steamid,
      lifetimeExportedAt: accounts[steamid].lifetime?.exportedAt || null,
      years: Object.fromEntries(Object.values(accounts[steamid].replays).map(replay => [replay.year, { hours: replay.totalHours, games: replay.games.length }])),
    }));
    return { generatedAt, steamids, years, summary, games: list.map((game, index) => ({ rank: ranks[index], ...game })) };
  }

  function indexMarkdown(index) {
    const { steamids, years } = index;
    const accountMinutes = steamid => index.games.reduce((sum, game) => sum + (game.minutes[steamid] || 0), 0);
    return [
      '# Steam 游戏总表',
      '',
      `生成时间：${index.generatedAt}。合并 ${steamids.length} 个账号，共 ${index.games.length} 个游戏，按各账号累计时长之和排名；同一个游戏在多个账号玩过的合并为一行。`,
      '',
      '## 账号',
      '',
      `| 账号 | 累计小时 | 累计时长快照 | ${years.map(year => `${year} 年`).join(' | ')} |`,
      `| --- | ---: | --- |${years.map(() => ' ---: |').join('')}`,
      ...index.summary.map(account => `| ${account.steamid} | ${Math.round(accountMinutes(account.steamid) / 6) / 10} | ${account.lifetimeExportedAt ?? '无'} | ${years.map(year => (account.years[year] ? `${account.years[year].hours} 小时 / ${account.years[year].games} 个` : '')).join(' | ')} |`),
      '',
      '## 游戏',
      '',
      '年度列为该年各账号回顾中的小时数之和；账号列为各账号的累计小时数。',
      '',
      `| 排名 | 游戏 | 合计小时 | ${steamids.join(' | ')} | ${years.map(year => `${year}`).join(' | ')} | 首次游玩 |`,
      `| ---: | --- | ---: |${steamids.map(() => ' ---: |').join('')}${years.map(() => ' ---: |').join('')} --- |`,
      ...index.games.map(game => `| ${game.rank} | ${gameLink(game)} | ${game.totalHours || ''} | ${steamids.map(steamid => (game.minutes[steamid] ? Math.round(game.minutes[steamid] / 6) / 10 : '')).join(' | ')} | ${years.map(year => (game.yearSeconds[year] ? hours(game.yearSeconds[year]) : '')).join(' | ')} | ${game.firstPlayed ?? ''} |`),
      '',
    ].join('\n');
  }

  function parseRepository(value) {
    const match = value.trim().match(/^(?:https?:\/\/github\.com\/|git@github\.com:)?([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/i);
    return match ? { owner: match[1], repo: match[2] } : null;
  }

  function uploadStamp(date = new Date()) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  }

  function request(method, url, headers, body) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method,
        url,
        headers: { ...headers, ...(body ? { 'Content-Type': 'application/json' } : {}) },
        data: body ? JSON.stringify(body) : undefined,
        anonymous: true,
        timeout: 60000,
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

  function githubError(response) {
    const reason = { 401: 'Token 无效或已过期', 403: 'Token 没有读写权限', 404: '找不到仓库或分支，或 Token 无权访问', 409: '仓库为空或正在被修改，请稍后重试', 422: '分支或路径无效，或分支在上传期间被修改' }[response.status];
    return new Error(`GitHub 返回 ${response.status}：${reason || response.json?.message || '请求失败'}`);
  }

  // 读取分支最新提交和完整目录树；上传时在这棵树上追加文件，合成一次提交后移动分支指针。
  async function openRepository({ token, owner, repo, branch }) {
    const api = `https://api.github.com/repos/${owner}/${repo}`;
    const headers = { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' };
    const call = async (method, path, body, ok = [200]) => {
      const response = await request(method, `${api}${path}`, headers, body);
      if (!ok.includes(response.status)) throw githubError(response);
      return response.json;
    };
    const target = branch || (await call('GET', '')).default_branch;
    const ref = await call('GET', `/git/ref/heads/${encodeURIComponent(target)}`);
    const parent = await call('GET', `/git/commits/${ref.object.sha}`);
    const tree = await call('GET', `/git/trees/${parent.tree.sha}?recursive=1`);
    if (tree.truncated) throw new Error('仓库文件太多，GitHub 无法一次列出目录树');
    const blobs = new Map(tree.tree.filter(item => item.type === 'blob').map(item => [item.path, item.sha]));
    return {
      branch: target,
      paths: [...blobs.keys()],
      async readJson(path) {
        const blob = await call('GET', `/git/blobs/${blobs.get(path)}`);
        const bytes = Uint8Array.from(atob(blob.content.replace(/\s/g, '')), char => char.charCodeAt(0));
        return JSON.parse(new TextDecoder().decode(bytes));
      },
      async commit(files, message) {
        const next = await call('POST', '/git/trees', {
          base_tree: parent.tree.sha,
          tree: files.map(file => ({ path: file.path, mode: '100644', type: 'blob', content: file.content })),
        }, [201]);
        const commit = await call('POST', '/git/commits', { message, tree: next.sha, parents: [ref.object.sha] }, [201]);
        await call('PATCH', `/git/refs/heads/${encodeURIComponent(target)}`, { sha: commit.sha });
      },
    };
  }

  // 每个账号读取仓库里全部年度回顾和最新一份累计时长快照；fresh 中是本次刚生成、尚未提交的数据。
  async function loadAccounts(repository, dir, fresh = {}) {
    const prefix = (dir ? `${dir}/` : '').replace(/[.*+?^$()|[\]{}\\]/g, '\\$&');
    const pattern = new RegExp(`^${prefix}(\\d{17})/(replay-(\\d{4})|lifetime-[\\d-]+)\\.json$`);
    const accounts = {};
    const latestLifetime = {};
    const replayPaths = [];
    for (const path of repository.paths) {
      const match = path.match(pattern);
      if (!match) continue;
      const [, steamid, , year] = match;
      accounts[steamid] ??= { lifetime: null, replays: {} };
      if (year) replayPaths.push([steamid, path]);
      else if (!latestLifetime[steamid] || path > latestLifetime[steamid]) latestLifetime[steamid] = path;
    }
    for (const [steamid, data] of Object.entries(fresh)) {
      accounts[steamid] ??= { lifetime: null, replays: {} };
      if (data.lifetime) delete latestLifetime[steamid];
    }
    const reads = [...replayPaths.filter(([steamid, path]) => !fresh[steamid]?.replays?.[path.match(/replay-(\d{4})/)[1]]), ...Object.entries(latestLifetime)];
    for (const [index, [steamid, path]] of reads.entries()) {
      status.textContent = `正在读取仓库数据 ${index + 1} / ${reads.length}…`;
      const json = await repository.readJson(path);
      if (/\/replay-\d{4}\.json$/.test(path)) accounts[steamid].replays[json.year] = json;
      else accounts[steamid].lifetime = json;
    }
    for (const [steamid, data] of Object.entries(fresh)) {
      Object.assign(accounts[steamid].replays, data.replays);
      if (data.lifetime) accounts[steamid].lifetime = data.lifetime;
    }
    return accounts;
  }

  function indexFiles(base, accounts, generatedAt, stamp) {
    const index = buildIndex(accounts, generatedAt);
    return {
      index,
      files: [
        { path: `${base}index-${stamp}.json`, content: `${JSON.stringify({ source: 'steam', ...index }, null, 2)}\n` },
        { path: `${base}index-${stamp}.md`, content: indexMarkdown(index) },
      ],
    };
  }

  let busy = false;
  async function run(mode) {
    if (busy) return;
    const config = saveConfig();
    const repo = parseRepository(config.repo || '');
    if (!/^(?:github_pat_|gh[pousr]_)\w+$/.test(config.token || '')) { status.textContent = '请填写 GitHub Token（以 github_pat_ 或 ghp_ 开头）。'; return; }
    if (!repo) { status.textContent = '仓库地址格式应为 https://github.com/owner/repo。'; return; }
    if (mode === 'upload' && (!userInfo.logged_in || !userInfo.steamid)) { status.textContent = '请先登录 Steam。'; return; }
    const dir = (config.path || DEFAULT_DIR).replace(/^\/+|\/+$/g, '');
    const base = dir ? `${dir}/` : '';
    busy = true;
    buttons.forEach(button => { button.disabled = true; });
    try {
      status.textContent = '正在读取 GitHub 仓库…';
      const repository = await openRepository({ token: config.token, ...repo, branch: config.branch });
      const generatedAt = new Date().toISOString();
      const stamp = uploadStamp();
      const files = [];
      const fresh = {};
      let summary = '';
      if (mode === 'upload') {
        const { steamid, accountid } = userInfo;
        const existing = new Set(repository.paths);
        const token = await webApiToken();
        const replays = {};
        const skipped = [];
        for (let year = FIRST_REPLAY_YEAR; year <= new Date().getFullYear(); year += 1) {
          if (existing.has(`${base}${steamid}/replay-${year}.json`)) { skipped.push(year); continue; }
          status.textContent = `正在读取 ${year} 年回顾…`;
          const stats = await fetchReplay(steamid, accountid, year);
          if (stats) replays[year] = buildReplay(stats, year);
          await sleep(300);
        }
        status.textContent = '正在读取累计游玩时长…';
        const { games: played = [] } = await steamApi('IPlayerService/ClientGetLastPlayedTimes', { access_token: token, min_last_played: 0 });
        const appids = [...new Set([...played.map(game => game.appid), ...Object.values(replays).flatMap(replay => replay.games.map(game => game.appid))])];
        status.textContent = `正在读取 ${appids.length} 个游戏的名称…`;
        const [names, tags] = await Promise.all([appNames(token, appids), tagNames()]);
        const lifetime = { source: 'steam', steamid, exportedAt: generatedAt, games: buildLifetime(played, names) };
        files.push(
          { path: `${base}${steamid}/lifetime-${stamp}.json`, content: `${JSON.stringify(lifetime, null, 2)}\n` },
          { path: `${base}${steamid}/lifetime-${stamp}.md`, content: lifetimeMarkdown(steamid, generatedAt, lifetime.games) },
        );
        for (const [year, replay] of Object.entries(replays)) {
          const named = { source: 'steam', steamid, exportedAt: generatedAt, ...nameReplay(replay, names, tags) };
          replays[year] = named;
          files.push(
            { path: `${base}${steamid}/replay-${year}.json`, content: `${JSON.stringify(named, null, 2)}\n` },
            { path: `${base}${steamid}/replay-${year}.md`, content: replayMarkdown(steamid, named) },
          );
        }
        fresh[steamid] = { lifetime, replays };
        const added = Object.keys(replays);
        summary = `账号 ${steamid}：${skipped.length ? `已有 ${skipped.join('、')} 年回顾，` : ''}${added.length ? `新增 ${added.join('、')} 年回顾` : '没有新的年度回顾'}，累计时长 ${lifetime.games.length} 个游戏。\n`;
      }
      const accounts = await loadAccounts(repository, dir, fresh);
      if (!Object.keys(accounts).length) throw new Error('仓库里还没有任何账号的数据，请先上传');
      const { index, files: generated } = indexFiles(base, accounts, generatedAt, stamp);
      files.push(...generated);
      status.textContent = `正在上传 ${files.length} 个文件…`;
      await repository.commit(files, mode === 'upload'
        ? `Update Steam data for ${userInfo.steamid} (${files.length} files)`
        : `Regenerate Steam index (${index.steamids.length} accounts)`);
      status.textContent = `${summary}总表合并 ${index.steamids.length} 个账号、${index.games.length} 个游戏。\n已上传到 ${repo.owner}/${repo.repo}@${repository.branch}：\n${files.map(file => file.path).join('\n')}`;
    } catch (error) {
      status.textContent = `上传失败：${error.message}`;
    } finally {
      busy = false;
      buttons.forEach(button => { button.disabled = false; });
    }
  }

  sync.querySelector('[data-action="save"]').addEventListener('click', () => {
    saveConfig();
    status.textContent = '已保存。';
  });
  sync.querySelector('[data-action="upload"]').addEventListener('click', () => void run('upload'));
  sync.querySelector('[data-action="index"]').addEventListener('click', () => void run('index'));
})();
