// ==UserScript==
// @name         拷贝漫画同步 MangaCopySync — 书架收藏上传到 GitHub
// @namespace    https://github.com/muzi-xiaoren/MyScripts
// @version      1.0.0
// @description  在拷贝漫画个人中心加入「GitHub 同步」，把书架上收藏的全部漫画（作者、连载状态、最新话、看到第几话）上传到 GitHub。
// @author       muzi-xiaoren
// @match        https://www.mangacopy.com/*
// @run-at       document-idle
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      api.github.com
// @homepageURL  https://github.com/muzi-xiaoren/MyScripts/tree/main/mangacopy-sync
// @supportURL   https://github.com/muzi-xiaoren/MyScripts/issues
// @downloadURL  https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/mangacopy-sync/mangacopy-sync.user.js
// @updateURL    https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/mangacopy-sync/mangacopy-sync.user.js
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  const SYNC_KEY = 'mangacopy-sync-config';
  const DEFAULT_DIR = 'mangacopy';
  const PAGE_SIZE = 50;
  const STATUS_NAMES = { 0: '连载中', 1: '已完结', 2: '短篇' };
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  // 个人中心是单页应用，切换路由不会重新注入脚本，所以按地址显示或隐藏入口。
  let sync = null;
  const refresh = () => {
    const visible = location.pathname.startsWith('/web/person');
    if (visible && !sync) sync = mount();
    if (sync) sync.hidden = !visible;
  };
  refresh();
  setInterval(refresh, 1000);

  function mount() {
    const style = document.createElement('style');
    style.textContent = `
      #mcsync { position: fixed; right: 20px; bottom: 20px; z-index: 10000; }
      #mcsync[hidden] { display: none; }
      #mcsync > summary {
        list-style: none; cursor: pointer; padding: 8px 14px; border-radius: 18px;
        background: #f0a020; color: #fff; box-shadow: 0 4px 14px rgba(0, 0, 0, .2);
        font: 600 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
      }
      #mcsync > summary::-webkit-details-marker { display: none; }
      #mcsync .mcsync-panel {
        position: absolute; right: 0; bottom: calc(100% + 10px);
        display: grid; gap: 10px; width: min(340px, calc(100vw - 40px)); box-sizing: border-box;
        max-height: calc(100vh - 100px); overflow: auto; padding: 16px;
        border: 1px solid #e4e4e4; border-radius: 10px; background: #fff; color: #444;
        box-shadow: 0 10px 32px rgba(0, 0, 0, .14); text-align: left;
        font: 13px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
      }
      #mcsync .mcsync-panel strong { font-size: 14px; color: #d88a10; }
      #mcsync label { display: grid; gap: 4px; }
      #mcsync input {
        width: 100%; box-sizing: border-box; padding: 6px 8px; border: 1px solid #ddd;
        border-radius: 6px; background: #fafafa; color: #333; font: inherit;
      }
      #mcsync input:focus { outline: none; border-color: #f0a020; background: #fff; }
      #mcsync .mcsync-secret { -webkit-text-security: disc; }
      #mcsync .mcsync-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
      #mcsync .mcsync-actions { display: flex; gap: 8px; }
      #mcsync button {
        padding: 6px 12px; border: 1px solid #ddd; border-radius: 6px; background: #fff;
        color: #666; font: inherit; cursor: pointer;
      }
      #mcsync button[data-action="upload"] { background: #f0a020; border-color: #f0a020; color: #fff; }
      #mcsync button:disabled { cursor: progress; opacity: .6; }
      #mcsync [role="status"] { margin: 0; color: #777; font-size: 12px; overflow-wrap: anywhere; white-space: pre-line; }
      #mcsync [role="status"]:empty { display: none; }
      #mcsync :focus-visible { outline: 2px solid #f0a020; outline-offset: 2px; }
    `;
    document.head.append(style);

    // 输入框不使用 name 和 password 类型，避免浏览器把面板当成登录表单自动填入账号密码。
    const field = (key, placeholder, secret = false) =>
      `<input data-field="${key}" type="text"${secret ? ' class="mcsync-secret"' : ''} autocomplete="off" spellcheck="false" data-1p-ignore data-lpignore="true" data-bwignore data-form-type="other" placeholder="${placeholder}">`;
    const panel = document.createElement('details');
    panel.id = 'mcsync';
    panel.innerHTML = `
      <summary>GitHub 同步</summary>
      <div class="mcsync-panel">
        <strong>上传书架收藏到 GitHub</strong>
        <label>GitHub Token${field('token', 'github_pat_…', true)}</label>
        <label>仓库地址${field('repo', 'https://github.com/owner/repo')}</label>
        <div class="mcsync-row">
          <label>分支（可选）${field('branch', '默认分支')}</label>
          <label>文件目录（可选）${field('path', DEFAULT_DIR)}</label>
        </div>
        <div class="mcsync-actions">
          <button type="button" data-action="save">保存</button>
          <button type="button" data-action="upload">上传书架</button>
        </div>
        <p role="status" aria-live="polite"></p>
      </div>`;
    document.body.append(panel);

    const status = panel.querySelector('[role="status"]');
    const uploadButton = panel.querySelector('[data-action="upload"]');
    const saved = GM_getValue(SYNC_KEY, {}) || {};
    panel.querySelectorAll('input').forEach(input => {
      input.value = typeof saved[input.dataset.field] === 'string' ? saved[input.dataset.field] : '';
    });
    document.addEventListener('click', event => { if (panel.open && !panel.contains(event.target)) panel.open = false; });
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || !panel.open) return;
      const restoreFocus = panel.contains(document.activeElement);
      panel.open = false;
      if (restoreFocus) panel.querySelector('summary').focus();
    });

    function saveConfig() {
      const config = {};
      panel.querySelectorAll('input').forEach(input => { config[input.dataset.field] = input.value.trim(); });
      GM_setValue(SYNC_KEY, config);
      return config;
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
        const comics = await collectShelf(offset => { status.textContent = `正在读取书架（已读 ${offset} 部）…`; });
        if (!comics.length) { status.textContent = '书架上没有收藏的漫画。'; return; }
        const stamp = uploadStamp();
        const exportedAt = new Date().toISOString();
        const base = `${dir ? `${dir}/` : ''}shelf-${stamp}`;
        status.textContent = '正在上传 2 个文件…';
        const branch = await commitFiles({
          token: config.token, ...repository, branch: config.branch,
          files: [
            { path: `${base}.json`, content: `${JSON.stringify({ source: 'mangacopy', exportedAt, total: comics.length, comics }, null, 2)}\n` },
            { path: `${base}.md`, content: shelfMarkdown(comics, exportedAt) },
          ],
          message: `Update MangaCopy shelf (${comics.length} comics)`,
        });
        status.textContent = `已上传书架 ${comics.length} 部漫画到 ${repository.owner}/${repository.repo}@${branch}：\n${base}.json / .md`;
      } catch (error) {
        status.textContent = `上传失败：${error.message}`;
      } finally {
        uploading = false;
        uploadButton.disabled = false;
      }
    }

    panel.querySelector('[data-action="save"]').addEventListener('click', () => {
      saveConfig();
      status.textContent = '已保存。';
    });
    uploadButton.addEventListener('click', () => void upload());
    return panel;
  }

  // —— 拷贝漫画 ——

  // 网站自己的前端也是用登录 Cookie 里的 token 调接口；这里同样只发往本站。
  async function collectShelf(onProgress) {
    const token = document.cookie.match(/(?:^|;\s*)token=([^;]+)/)?.[1];
    if (!token) throw new Error('拷贝漫画未登录');
    const comics = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
      onProgress(offset);
      const query = new URLSearchParams({ limit: PAGE_SIZE, offset, free_type: 1, ordering: '-datetime_modifier' });
      const response = await fetch(`/api/v3/member/collect/comics?${query}`, { headers: { authorization: `Token ${decodeURIComponent(token)}` } });
      const json = await response.json().catch(() => null);
      if (response.status === 401) throw new Error('拷贝漫画登录已失效，请重新登录');
      if (!response.ok || json?.code !== 200) throw new Error(`拷贝漫画返回 ${response.status}：${json?.message || '请求失败'}`);
      const { list, total } = json.results;
      list.forEach(item => comics.push(shelfEntry(item, comics.length + 1)));
      if (!list.length || comics.length >= total) return comics;
      await sleep(300);
    }
  }

  function shelfEntry(item, order) {
    const comic = item.comic;
    return {
      order,
      name: comic.name,
      pathWord: comic.path_word,
      url: `https://www.mangacopy.com/comic/${comic.path_word}`,
      authors: comic.author.map(author => author.name),
      status: STATUS_NAMES[comic.status] || String(comic.status),
      latestChapter: comic.last_chapter_name,
      updated: comic.datetime_updated,
      readTo: repairMojibake(item.last_browse?.last_browse_name) || null,
      popular: comic.popular,
      folder: item.b_folder ? item.name : null,
    };
  }

  // 接口返回的阅读进度有时是把 UTF-8 字节按 Windows-1252 解出来的，例如「ç¬¬24è©±」「ç•ªå¤–2」，这里反查回字节再按 UTF-8 解码。
  const CP1252_BYTES = new Map(Array.from({ length: 256 }, (_, byte) => [new TextDecoder('windows-1252').decode(Uint8Array.of(byte)), byte]));
  function repairMojibake(value) {
    if (!value || !/[\x80-\xff]/.test(value)) return value;
    const bytes = [...value].map(char => CP1252_BYTES.get(char) ?? (char.charCodeAt(0) < 256 ? char.charCodeAt(0) : -1));
    if (bytes.includes(-1)) return value;
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bytes));
    } catch {
      return value;
    }
  }

  // —— Markdown ——

  const markdownText = value => String(value ?? '').replace(/\s+/g, ' ').trim().replace(/[\\|[\]<>*_`]/g, '\\$&');

  function shelfMarkdown(comics, exportedAt) {
    const counts = Object.values(STATUS_NAMES).map(name => [name, comics.filter(comic => comic.status === name).length]).filter(([, count]) => count);
    const authors = new Map();
    comics.forEach(comic => comic.authors.forEach(author => authors.set(author, (authors.get(author) || 0) + 1)));
    const repeated = [...authors].filter(([, count]) => count > 1).sort((a, b) => b[1] - a[1]);
    return [
      '# 拷贝漫画书架',
      '',
      `- 导出时间：${exportedAt}`,
      `- 共 ${comics.length} 部：${counts.map(([name, count]) => `${name} ${count}`).join('、')}；${comics.filter(comic => comic.readTo).length} 部有阅读记录`,
      ...(repeated.length ? [`- 收藏多部的作者：${repeated.map(([name, count]) => `${markdownText(name)}（${count}）`).join('、')}`] : []),
      '',
      '按最近更新阅读或收藏的顺序排列。',
      '',
      '| # | 漫画 | 作者 | 状态 | 最新 | 更新日期 | 看到 |',
      '| ---: | --- | --- | --- | --- | --- | --- |',
      ...comics.map(comic => `| ${comic.order} | [${markdownText(comic.name)}](${comic.url}) | ${markdownText(comic.authors.join('、'))} | ${comic.status} | ${markdownText(comic.latestChapter)} | ${comic.updated || ''} | ${markdownText(comic.readTo || '—')} |`),
      '',
    ].join('\n');
  }

  // —— GitHub ——

  function parseRepository(value) {
    const match = value.trim().match(/^(?:https?:\/\/github\.com\/|git@github\.com:)?([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/i);
    return match ? { owner: match[1], repo: match[2] } : null;
  }

  function uploadStamp(date = new Date()) {
    const pad = value => String(value).padStart(2, '0');
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
})();
