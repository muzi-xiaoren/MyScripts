// ==UserScript==
// @name         番组同步 BangumiSync — Bangumi 收藏上传到 GitHub
// @namespace    https://github.com/muzi-xiaoren/MyScripts
// @version      1.0.1
// @description  在 Bangumi 右下角 dock 加入「GitHub 同步」，把动画、书籍、音乐、游戏、三次元的全部收藏按我的评分排名，上传为带时间戳的 JSON 和 Markdown。
// @author       muzi-xiaoren
// @match        https://bangumi.tv/*
// @match        https://bgm.tv/*
// @match        https://chii.in/*
// @run-at       document-end
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      api.bgm.tv
// @connect      api.github.com
// @homepageURL  https://github.com/muzi-xiaoren/MyScripts/tree/main/bangumi-sync
// @supportURL   https://github.com/muzi-xiaoren/MyScripts/issues
// @downloadURL  https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/bangumi-sync/bangumi-sync.user.js
// @updateURL    https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/bangumi-sync/bangumi-sync.user.js
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  const dockList = document.querySelector('#dock ul');
  if (!dockList || document.getElementById('bgmsync')) return;

  const SYNC_KEY = 'bangumi-sync-config';
  const DEFAULT_DIR = 'bangumi';
  const USER_AGENT = 'muzi-xiaoren/BangumiSync (https://github.com/muzi-xiaoren/MyScripts)';
  const TYPES = [
    { id: 2, key: 'anime', name: '动画', verb: '看' },
    { id: 1, key: 'book', name: '书籍', verb: '读' },
    { id: 3, key: 'music', name: '音乐', verb: '听' },
    { id: 4, key: 'game', name: '游戏', verb: '玩' },
    { id: 6, key: 'real', name: '三次元', verb: '看' },
  ];
  const STATUS_ORDER = [2, 3, 1, 4, 5];
  const statusName = (type, status) => ({ 1: `想${type.verb}`, 2: `${type.verb}过`, 3: `在${type.verb}`, 4: '搁置', 5: '抛弃' })[status] || '未知';
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  const style = document.createElement('style');
  style.textContent = `
    #bgmsync { position: relative; }
    #bgmsync > summary { cursor: pointer; list-style: none; }
    #bgmsync > summary::-webkit-details-marker { display: none; }
    #bgmsync .bgmsync-panel {
      position: fixed; right: 8px; bottom: var(--bgmsync-bottom, 40px); z-index: 1000;
      display: grid; gap: 10px; width: min(340px, calc(100vw - 16px)); box-sizing: border-box;
      max-height: calc(100vh - var(--bgmsync-bottom, 40px) - 16px); overflow: auto;
      padding: 16px; border: 1px solid #e4e4e4; border-radius: 10px; background: #fff;
      box-shadow: 0 10px 32px rgba(0, 0, 0, .14); color: #444; text-align: left;
      font: 13px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif;
    }
    #bgmsync .bgmsync-panel strong { font-size: 14px; color: #f09199; }
    #bgmsync label { display: grid; gap: 4px; }
    #bgmsync label small { color: #999; font-size: 11px; }
    #bgmsync input {
      width: 100%; box-sizing: border-box; padding: 6px 8px; border: 1px solid #ddd;
      border-radius: 6px; background: #fafafa; color: #333; font: inherit;
    }
    #bgmsync input:focus { outline: none; border-color: #f09199; background: #fff; }
    #bgmsync .bgmsync-secret { -webkit-text-security: disc; }
    #bgmsync .bgmsync-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    #bgmsync .bgmsync-actions { display: flex; gap: 8px; }
    #bgmsync button {
      padding: 6px 12px; border: 1px solid #ddd; border-radius: 6px; background: #fff;
      color: #666; font: inherit; cursor: pointer;
    }
    #bgmsync button[data-action="upload"] { background: #f09199; border-color: #f09199; color: #fff; }
    #bgmsync button:disabled { cursor: progress; opacity: .6; }
    #bgmsync [role="status"] { margin: 0; color: #777; font-size: 12px; overflow-wrap: anywhere; white-space: pre-line; }
    #bgmsync [role="status"]:empty { display: none; }
    #bgmsync :focus-visible { outline: 2px solid #f09199; outline-offset: 2px; }
  `;
  document.head.append(style);

  // 输入框不使用 name 和 password 类型，避免浏览器把面板当成登录表单自动填入账号密码。
  const field = (key, placeholder, secret = false) =>
    `<input data-field="${key}" type="text"${secret ? ' class="bgmsync-secret"' : ''} autocomplete="off" spellcheck="false" data-1p-ignore data-lpignore="true" data-bwignore data-form-type="other" placeholder="${placeholder}">`;
  const entry = document.createElement('li');
  entry.innerHTML = `
    <details id="bgmsync">
      <summary><a>GitHub 同步</a></summary>
      <div class="bgmsync-panel">
        <strong>上传收藏到 GitHub</strong>
        <label>GitHub Token${field('token', 'github_pat_…', true)}</label>
        <label>仓库地址${field('repo', 'https://github.com/owner/repo')}</label>
        <div class="bgmsync-row">
          <label>分支（可选）${field('branch', '默认分支')}</label>
          <label>文件目录（可选）${field('path', DEFAULT_DIR)}</label>
        </div>
        <label>Bangumi 用户名（可选）${field('username', '默认读取当前登录账号')}</label>
        <label>Bangumi Token（可选）${field('bgmToken', '用于读取仅自己可见的收藏', true)}<small>在 next.bgm.tv/demo/access-token 生成</small></label>
        <div class="bgmsync-actions"><button type="button" data-action="save">保存</button><button type="button" data-action="upload">上传全部收藏</button></div>
        <p role="status" aria-live="polite"></p>
      </div>
    </details>`;
  const last = dockList.querySelector('li.last');
  dockList.insertBefore(entry, last);

  const sync = entry.querySelector('#bgmsync');
  const status = sync.querySelector('[role="status"]');
  const uploadButton = sync.querySelector('[data-action="upload"]');
  const saved = GM_getValue(SYNC_KEY, {}) || {};
  sync.querySelectorAll('input').forEach(input => { input.value = typeof saved[input.dataset.field] === 'string' ? saved[input.dataset.field] : ''; });

  function positionPanel() {
    if (!sync.open) return;
    const dock = document.getElementById('dock').getBoundingClientRect();
    sync.style.setProperty('--bgmsync-bottom', `${Math.max(8, innerHeight - dock.top + 8)}px`);
  }
  sync.addEventListener('toggle', positionPanel);
  window.addEventListener('resize', positionPanel);
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

  function request(method, url, headers, body) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method,
        url,
        headers: { ...headers, ...(body ? { 'Content-Type': 'application/json' } : {}) },
        data: body ? JSON.stringify(body) : undefined,
        anonymous: true,
        timeout: 30000,
        onload(response) {
          let json = null;
          try { json = JSON.parse(response.responseText); } catch { /* 非 JSON 响应只看状态码 */ }
          resolve({ status: response.status, json });
        },
        onerror: () => reject(new Error(`无法连接 ${new URL(url).host}`)),
        ontimeout: () => reject(new Error(`连接 ${new URL(url).host} 超时`)),
      });
    });
  }

  async function bangumiApi(path, token) {
    const response = await request('GET', `https://api.bgm.tv${path}`, {
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    });
    if (response.status === 401) throw new Error('Bangumi Token 无效或已过期');
    if (response.status === 404) throw new Error('找不到这个 Bangumi 用户');
    if (response.status !== 200) throw new Error(`Bangumi 返回 ${response.status}：${response.json?.description || response.json?.title || '请求失败'}`);
    return response.json;
  }

  async function resolveUsername(config) {
    if (config.username) return config.username.replace(/^.*\/user\//, '').replace(/[/?#].*$/, '');
    if (config.bgmToken) return (await bangumiApi('/v0/me', config.bgmToken)).username;
    const link = document.querySelector('.idBadgerNeue a[href*="/user/"], #dock a[href*="/user/"]');
    const username = link?.getAttribute('href').match(/\/user\/([^/?#]+)/)?.[1];
    if (!username) throw new Error('没有识别到 Bangumi 账号，请登录或填写用户名');
    return decodeURIComponent(username);
  }

  async function collectType(username, type, token) {
    const items = [];
    let offset = 0;
    let total = Infinity;
    while (offset < total) {
      status.textContent = `正在读取${type.name}收藏：${items.length}${Number.isFinite(total) ? ` / ${total}` : ''}…`;
      const page = await bangumiApi(`/v0/users/${encodeURIComponent(username)}/collections?subject_type=${type.id}&limit=50&offset=${offset}`, token);
      total = Number(page.total) || 0;
      const data = Array.isArray(page.data) ? page.data : [];
      items.push(...data);
      if (!data.length) break;
      offset += data.length;
      if (offset < total) await sleep(300);
    }
    return items.map(item => {
      const subject = item.subject || {};
      const id = item.subject_id ?? subject.id;
      return {
        id,
        name: subject.name || '',
        nameCn: subject.name_cn || null,
        date: subject.date || null,
        status: statusName(type, item.type),
        statusCode: item.type,
        myRating: item.rate >= 1 && item.rate <= 10 ? item.rate : null,
        score: subject.score || null,
        progress: type.id === 1 ? { volumes: item.vol_status || 0, chapters: item.ep_status || 0 } : (item.ep_status ? { episodes: item.ep_status } : null),
        tags: Array.isArray(item.tags) ? item.tags : [],
        comment: item.comment || null,
        private: Boolean(item.private),
        updatedAt: item.updated_at ? item.updated_at.slice(0, 10) : null,
        url: `https://bgm.tv/subject/${id}`,
      };
    });
  }

  function markdownText(value) {
    return String(value ?? '').replace(/[\\|[\]]/g, '\\$&').replace(/\s+/g, ' ').trim();
  }

  function buildFiles(type, username, entries, exportedAt) {
    const recent = (a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '');
    const rated = entries.filter(entry => entry.myRating !== null)
      .sort((a, b) => b.myRating - a.myRating || (b.score ?? 0) - (a.score ?? 0) || recent(a, b));
    rated.forEach((entry, index) => {
      entry.rank = index > 0 && entry.myRating === rated[index - 1].myRating ? rated[index - 1].rank : index + 1;
    });
    const unrated = entries.filter(entry => entry.myRating === null)
      .sort((a, b) => STATUS_ORDER.indexOf(a.statusCode) - STATUS_ORDER.indexOf(b.statusCode) || recent(a, b));
    unrated.forEach(entry => { entry.rank = null; });
    const ranked = [...rated, ...unrated];
    const counts = STATUS_ORDER.map(code => [statusName(type, code), ranked.filter(entry => entry.statusCode === code).length])
      .filter(([, count]) => count);
    const json = {
      source: 'bangumi',
      type: type.key,
      user: username,
      ratingScale: 10,
      exportedAt,
      total: ranked.length,
      rated: rated.length,
      statusCounts: Object.fromEntries(counts),
      items: ranked.map(({ statusCode, ...entry }) => entry),
    };
    const markdown = [
      `# Bangumi ${type.name}收藏`,
      '',
      `共 ${json.total} 部（${counts.map(([name, count]) => `${name} ${count}`).join('，')}），已评分 ${json.rated} 部，按我的评分（10 分制）从高到低排列。导出时间：${exportedAt}`,
      '',
      '| 排名 | 名称 | 年份 | 状态 | 我的评分 | Bangumi 评分 | 更新日期 |',
      '| ---: | --- | ---: | --- | ---: | ---: | --- |',
      ...ranked.map(entry => {
        const name = [entry.nameCn, entry.name].filter((value, index, list) => value && list.indexOf(value) === index).map(markdownText).join(' · ');
        return `| ${entry.rank ?? '—'} | [${name || entry.id}](${entry.url}) | ${entry.date?.slice(0, 4) ?? ''} | ${entry.status} | ${entry.myRating ?? '未评分'} | ${entry.score ?? ''} | ${entry.updatedAt ?? ''} |`;
      }),
      '',
    ].join('\n');
    return { json: `${JSON.stringify(json, null, 2)}\n`, markdown };
  }

  function parseRepository(value) {
    const match = value.trim().match(/^(?:https?:\/\/github\.com\/|git@github\.com:)?([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/i);
    return match ? { owner: match[1], repo: match[2] } : null;
  }

  function uploadStamp(date = new Date()) {
    const pad = value => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  }

  function githubError(response) {
    const reason = { 401: 'Token 无效或已过期', 403: 'Token 没有写入权限', 404: '找不到仓库或分支，或 Token 无权访问', 409: '仓库为空或正在被修改，请稍后重试', 422: '分支或路径无效' }[response.status];
    return new Error(`GitHub 返回 ${response.status}：${reason || response.json?.message || '请求失败'}`);
  }

  // 多个文件合成一次提交：读取分支最新提交，在其目录树上追加文件后移动分支指针。
  async function commitFiles({ token, owner, repo, branch, files, message }) {
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
    const tree = await call('POST', '/git/trees', {
      base_tree: parent.tree.sha,
      tree: files.map(file => ({ path: file.path, mode: '100644', type: 'blob', content: file.content })),
    }, [201]);
    const commit = await call('POST', '/git/commits', { message, tree: tree.sha, parents: [ref.object.sha] }, [201]);
    await call('PATCH', `/git/refs/heads/${encodeURIComponent(target)}`, { sha: commit.sha });
    return target;
  }

  let uploading = false;
  async function upload() {
    if (uploading) return;
    const config = saveConfig();
    const repository = parseRepository(config.repo || '');
    if (!/^(?:github_pat_|gh[pousr]_)\w+$/.test(config.token || '')) { status.textContent = '请填写 GitHub Token（以 github_pat_ 或 ghp_ 开头）。'; return; }
    if (!repository) { status.textContent = '仓库地址格式应为 https://github.com/owner/repo。'; return; }
    const dir = (config.path || DEFAULT_DIR).replace(/^\/+|\/+$/g, '');
    uploading = true;
    uploadButton.disabled = true;
    try {
      const username = await resolveUsername(config);
      const stamp = uploadStamp();
      const exportedAt = new Date().toISOString();
      const files = [];
      const summary = [];
      for (const type of TYPES) {
        const entries = await collectType(username, type, config.bgmToken);
        if (!entries.length) continue;
        const built = buildFiles(type, username, entries, exportedAt);
        const base = `${dir ? `${dir}/` : ''}${type.key}-${stamp}`;
        files.push({ path: `${base}.json`, content: built.json }, { path: `${base}.md`, content: built.markdown });
        summary.push(`${type.name} ${entries.length}`);
      }
      if (!files.length) { status.textContent = `${username} 没有可上传的收藏。`; return; }
      status.textContent = `正在上传 ${files.length} 个文件…`;
      const branch = await commitFiles({
        token: config.token, ...repository, branch: config.branch, files,
        message: `Update Bangumi collections (${summary.join(', ')})`,
      });
      status.textContent = `已上传 ${username} 的收藏（${summary.join('，')}）到 ${repository.owner}/${repository.repo}@${branch}：\n${dir ? `${dir}/` : ''}*-${stamp}.json / .md`;
    } catch (error) {
      status.textContent = `上传失败：${error.message}`;
    } finally {
      uploading = false;
      uploadButton.disabled = false;
    }
  }

  sync.querySelector('[data-action="save"]').addEventListener('click', () => {
    saveConfig();
    status.textContent = '已保存。';
  });
  uploadButton.addEventListener('click', () => void upload());
})();
