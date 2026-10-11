// ==UserScript==
// @name         云音同步 NeteaseSync — 网易云歌单上传到 GitHub
// @namespace    https://github.com/muzi-xiaoren/MyScripts
// @version      1.0.0
// @description  在网易云音乐顶部导航加入「GitHub 同步」，把自建歌单的全部歌曲、收藏歌单的名称与简介和听歌排行，上传到 GitHub 带时间戳的目录。
// @author       muzi-xiaoren
// @match        https://music.163.com/*
// @run-at       document-end
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      api.github.com
// @homepageURL  https://github.com/muzi-xiaoren/MyScripts/tree/main/netease-sync
// @supportURL   https://github.com/muzi-xiaoren/MyScripts/issues
// @downloadURL  https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/netease-sync/netease-sync.user.js
// @updateURL    https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/netease-sync/netease-sync.user.js
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  const head = document.querySelector('#g-topbar .m-tophead');
  if (!head || document.getElementById('ncmsync')) return;

  const SYNC_KEY = 'netease-sync-config';
  const DEFAULT_DIR = 'netease';
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  const style = document.createElement('style');
  style.textContent = `
    #ncmsync { float: right; position: relative; height: 70px; margin: 0 6px 0 14px; }
    #ncmsync > summary {
      list-style: none; cursor: pointer; line-height: 70px; color: #ccc; font-size: 12px; white-space: nowrap;
    }
    #ncmsync > summary::-webkit-details-marker { display: none; }
    #ncmsync > summary:hover, #ncmsync[open] > summary { color: #fff; }
    #ncmsync .ncmsync-panel {
      position: fixed; top: 64px; right: max(8px, calc((100vw - 1100px) / 2)); z-index: 1000;
      display: grid; gap: 10px; width: min(340px, calc(100vw - 16px)); box-sizing: border-box;
      max-height: calc(100vh - 80px); overflow: auto; padding: 16px;
      border: 1px solid #ddd; border-radius: 8px; background: #fff; color: #333;
      box-shadow: 0 10px 32px rgba(0, 0, 0, .25); text-align: left;
      font: 12px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif;
    }
    #ncmsync .ncmsync-panel strong { font-size: 14px; color: #c20c0c; }
    #ncmsync label { display: grid; gap: 4px; }
    #ncmsync input {
      width: 100%; box-sizing: border-box; height: auto; padding: 6px 8px; border: 1px solid #ddd;
      border-radius: 4px; background: #fafafa; color: #333; font: inherit;
    }
    #ncmsync input:focus { outline: none; border-color: #c20c0c; background: #fff; }
    #ncmsync .ncmsync-secret { -webkit-text-security: disc; }
    #ncmsync .ncmsync-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    #ncmsync .ncmsync-actions { display: flex; gap: 8px; }
    #ncmsync button {
      padding: 6px 12px; border: 1px solid #ddd; border-radius: 4px; background: #fff;
      color: #555; font: inherit; cursor: pointer;
    }
    #ncmsync button[data-action="upload"] { background: #c20c0c; border-color: #c20c0c; color: #fff; }
    #ncmsync button:disabled { cursor: progress; opacity: .6; }
    #ncmsync [role="status"] { margin: 0; color: #666; overflow-wrap: anywhere; white-space: pre-line; }
    #ncmsync [role="status"]:empty { display: none; }
    #ncmsync :focus-visible { outline: 2px solid #c20c0c; outline-offset: 2px; }
  `;
  document.head.append(style);

  // 输入框不使用 name 和 password 类型，避免浏览器把面板当成登录表单自动填入账号密码。
  const field = (key, placeholder, secret = false) =>
    `<input data-field="${key}" type="text"${secret ? ' class="ncmsync-secret"' : ''} autocomplete="off" spellcheck="false" data-1p-ignore data-lpignore="true" data-bwignore data-form-type="other" placeholder="${placeholder}">`;
  const sync = document.createElement('details');
  sync.id = 'ncmsync';
  sync.innerHTML = `
    <summary>GitHub 同步</summary>
    <div class="ncmsync-panel">
      <strong>上传歌单到 GitHub</strong>
      <label>GitHub Token${field('token', 'github_pat_…', true)}</label>
      <label>仓库地址${field('repo', 'https://github.com/owner/repo')}</label>
      <div class="ncmsync-row">
        <label>分支（可选）${field('branch', '默认分支')}</label>
        <label>文件目录（可选）${field('path', DEFAULT_DIR)}</label>
      </div>
      <div class="ncmsync-actions"><button type="button" data-action="save">保存</button><button type="button" data-action="upload">上传歌单</button></div>
      <p role="status" aria-live="polite"></p>
    </div>`;
  head.after(sync);

  const status = sync.querySelector('[role="status"]');
  const uploadButton = sync.querySelector('[data-action="upload"]');
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

  async function neteaseApi(path) {
    const response = await fetch(path, { credentials: 'include' });
    const json = await response.json().catch(() => null);
    if (!response.ok || !json || json.code !== 200) throw new Error(`网易云返回 ${json?.code ?? response.status}：${json?.message || json?.msg || '请求失败'}`);
    return json;
  }

  const artists = song => (song.ar || song.artists || []).map(artist => artist.name).filter(Boolean);
  const albumName = song => (song.al || song.album)?.name || null;
  const formatDuration = ms => (ms ? `${Math.floor(ms / 60000)}:${String(Math.round(ms / 1000) % 60).padStart(2, '0')}` : null);
  const localDate = time => {
    if (!time) return null;
    const date = new Date(time);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  const songEntry = song => ({
    id: song.id,
    name: song.name,
    alias: [...(song.tns || []), ...(song.alia || [])].filter(Boolean),
    artists: artists(song),
    album: albumName(song),
    duration: formatDuration(song.dt),
    url: `https://music.163.com/#/song?id=${song.id}`,
  });

  async function playlistSongs(id) {
    const { playlist } = await neteaseApi(`/api/v6/playlist/detail?id=${id}&n=100000&s=0`);
    const known = new Map((playlist.tracks || []).map(song => [song.id, song]));
    const trackIds = playlist.trackIds || [];
    const missing = trackIds.map(track => track.id).filter(songId => !known.has(songId));
    for (let i = 0; i < missing.length; i += 300) {
      const batch = missing.slice(i, i + 300).map(songId => ({ id: songId }));
      const { songs } = await neteaseApi(`/api/v3/song/detail?c=${encodeURIComponent(JSON.stringify(batch))}`);
      (songs || []).forEach(song => known.set(song.id, song));
    }
    const songs = trackIds.map((track, index) => {
      const song = known.get(track.id);
      return { index: index + 1, ...(song ? songEntry(song) : { id: track.id, name: null, url: `https://music.163.com/#/song?id=${track.id}` }), addedAt: localDate(track.at) };
    });
    return { playlist, songs };
  }

  function playlistInfo(playlist) {
    return {
      id: playlist.id,
      name: playlist.name,
      description: playlist.description || null,
      tags: playlist.tags || [],
      trackCount: playlist.trackCount,
      playCount: playlist.playCount ?? null,
      creator: playlist.creator?.nickname || null,
      createdAt: localDate(playlist.createTime),
      updatedAt: localDate(playlist.trackUpdateTime || playlist.updateTime),
      url: `https://music.163.com/#/playlist?id=${playlist.id}`,
    };
  }

  function markdownText(value) {
    return String(value ?? '').replace(/[\\|[\]]/g, '\\$&').replace(/\s+/g, ' ').trim();
  }

  function songTitle(song) {
    const name = markdownText(song.name || `歌曲 ${song.id}`);
    return `[${name}](${song.url})${song.alias?.length ? ` (${markdownText(song.alias.join(' / '))})` : ''}`;
  }

  function playlistMarkdown(info, songs) {
    return [
      `# ${markdownText(info.name)}`,
      '',
      ...(info.description ? [info.description.replace(/\n+/g, '  \n'), ''] : []),
      `- 歌曲：${songs.length} 首`,
      ...(info.tags.length ? [`- 标签：${info.tags.map(markdownText).join('、')}`] : []),
      `- 创建：${info.createdAt ?? ''}，最近更新：${info.updatedAt ?? ''}`,
      `- 链接：${info.url}`,
      '',
      '| # | 歌曲 | 歌手 | 专辑 | 时长 | 加入日期 |',
      '| ---: | --- | --- | --- | ---: | --- |',
      ...songs.map(song => `| ${song.index} | ${songTitle(song)} | ${markdownText((song.artists || []).join(' / '))} | ${markdownText(song.album)} | ${song.duration ?? ''} | ${song.addedAt ?? ''} |`),
      '',
    ].join('\n');
  }

  function rankingEntries(list) {
    return (list || []).map((item, index) => ({ rank: index + 1, playCount: item.playCount ?? null, score: item.score ?? null, ...songEntry(item.song || {}) }));
  }

  function rankingMarkdown(ranking) {
    const table = entries => [
      '| 排名 | 歌曲 | 歌手 | 播放次数 |',
      '| ---: | --- | --- | ---: |',
      ...entries.map(song => `| ${song.rank} | ${songTitle(song)} | ${markdownText(song.artists.join(' / '))} | ${song.playCount ?? ''} |`),
    ];
    return ['# 听歌排行', '', '## 所有时间', '', ...table(ranking.allTime), '', '## 最近一周', '', ...table(ranking.week), ''].join('\n');
  }

  function overviewMarkdown(user, exportedAt, created, subscribed, ranking) {
    return [
      `# ${markdownText(user.nickname)} 的网易云音乐`,
      '',
      `导出时间：${exportedAt}。自建歌单 ${created.length} 个，收藏歌单 ${subscribed.length} 个。[听歌排行](ranking.md)：所有时间 ${ranking.allTime.length} 首，最近一周 ${ranking.week.length} 首。`,
      '',
      '## 自建歌单',
      '',
      '| 歌单 | 歌曲 | 最近更新 | 简介 |',
      '| --- | ---: | --- | --- |',
      ...created.map(info => `| [${markdownText(info.name)}](playlists/${info.id}.md) | ${info.songCount} | ${info.updatedAt ?? ''} | ${markdownText(info.description).slice(0, 80)} |`),
      '',
      '## 收藏歌单',
      '',
      '| 歌单 | 创建者 | 歌曲 | 简介 |',
      '| --- | --- | ---: | --- |',
      ...subscribed.map(info => `| [${markdownText(info.name)}](${info.url}) | ${markdownText(info.creator)} | ${info.trackCount} | ${markdownText(info.description)} |`),
      '',
    ].join('\n');
  }

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
      status.textContent = '正在读取账号…';
      const profile = (await neteaseApi('/api/nuser/account/get')).profile;
      if (!profile?.userId) throw new Error('请先登录网易云音乐');
      const exportedAt = new Date().toISOString();
      const base = `${dir ? `${dir}/` : ''}${uploadStamp()}`;
      const lists = [];
      for (let offset = 0; ; offset += 1000) {
        const page = await neteaseApi(`/api/user/playlist?uid=${profile.userId}&limit=1000&offset=${offset}`);
        lists.push(...(page.playlist || []));
        if (!page.more || !page.playlist?.length) break;
      }
      const createdLists = lists.filter(list => list.creator?.userId === profile.userId);
      const subscribed = lists.filter(list => list.creator?.userId !== profile.userId).map(playlistInfo);
      const files = [];
      const created = [];
      for (const [index, list] of createdLists.entries()) {
        status.textContent = `正在读取歌单 ${index + 1} / ${createdLists.length}：${list.name}`;
        const { playlist, songs } = await playlistSongs(list.id);
        const info = playlistInfo(playlist);
        created.push({ ...info, songCount: songs.length });
        files.push(
          { path: `${base}/playlists/${info.id}.json`, content: `${JSON.stringify({ source: 'netease', exportedAt, ...info, songs }, null, 2)}\n` },
          { path: `${base}/playlists/${info.id}.md`, content: playlistMarkdown(info, songs) },
        );
        await sleep(300);
      }
      status.textContent = '正在读取听歌排行…';
      const [allTime, week] = await Promise.all([0, 1].map(type => neteaseApi(`/api/v1/play/record?uid=${profile.userId}&type=${type}`)));
      const ranking = { allTime: rankingEntries(allTime.allData), week: rankingEntries(week.weekData) };
      const user = { id: profile.userId, nickname: profile.nickname };
      files.push(
        { path: `${base}/README.md`, content: overviewMarkdown(user, exportedAt, created, subscribed, ranking) },
        { path: `${base}/subscribed.json`, content: `${JSON.stringify({ source: 'netease', exportedAt, total: subscribed.length, playlists: subscribed }, null, 2)}\n` },
        { path: `${base}/ranking.json`, content: `${JSON.stringify({ source: 'netease', exportedAt, ...ranking }, null, 2)}\n` },
        { path: `${base}/ranking.md`, content: rankingMarkdown(ranking) },
      );
      status.textContent = `正在上传 ${files.length} 个文件…`;
      const branch = await commitFiles({
        token: config.token, ...repository, branch: config.branch, files,
        message: `Update NetEase Music playlists (${created.length} created, ${subscribed.length} subscribed)`,
      });
      status.textContent = `已上传自建歌单 ${created.length} 个、收藏歌单 ${subscribed.length} 个和听歌排行到 ${repository.owner}/${repository.repo}@${branch}：\n${base}/`;
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
