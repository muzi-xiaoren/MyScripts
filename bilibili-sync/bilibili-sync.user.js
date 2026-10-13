// ==UserScript==
// @name         哔哩同步 BilibiliSync — B 站投稿、动态、收藏夹和关注上传到 GitHub
// @namespace    https://github.com/muzi-xiaoren/MyScripts
// @version      1.1.0
// @description  在 B 站页面左下角加入「GitHub 同步」，把自己的投稿视频（含字幕、B 站识别的 BGM 和 AI 总结）、动态全文、全部自建收藏夹和关注列表，上传到 GitHub 带时间戳的目录。
// @author       muzi-xiaoren
// @match        https://www.bilibili.com/*
// @match        https://space.bilibili.com/*
// @match        https://t.bilibili.com/*
// @run-at       document-end
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      api.github.com
// @homepageURL  https://github.com/muzi-xiaoren/MyScripts/tree/main/bilibili-sync
// @supportURL   https://github.com/muzi-xiaoren/MyScripts/issues
// @downloadURL  https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/bilibili-sync/bilibili-sync.user.js
// @updateURL    https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/bilibili-sync/bilibili-sync.user.js
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  if (document.getElementById('bilisync')) return;

  const SYNC_KEY = 'bilibili-sync-config';
  const DEFAULT_DIR = 'bilibili';
  const API = 'https://api.bilibili.com';
  const PENDING_VIDEO = '- 内容描述：（待补）';
  const PENDING_IMAGES = '- 图片描述：（待补）';
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  const style = document.createElement('style');
  style.textContent = `
    #bilisync { position: fixed; left: 16px; bottom: 16px; z-index: 1001; }
    #bilisync > summary {
      list-style: none; cursor: pointer; white-space: nowrap; padding: 6px 12px; border-radius: 16px;
      background: #fff; color: #18191c; font: 13px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif;
      box-shadow: 0 2px 10px rgba(0, 0, 0, .15);
    }
    #bilisync > summary::-webkit-details-marker { display: none; }
    #bilisync > summary:hover, #bilisync[open] > summary { color: #fb7299; }
    #bilisync .bilisync-panel {
      position: fixed; left: 16px; bottom: 56px; z-index: 1002;
      display: grid; gap: 10px; width: min(340px, calc(100vw - 16px)); box-sizing: border-box;
      max-height: calc(100vh - 80px); overflow: auto; padding: 16px;
      border: 1px solid #e3e5e7; border-radius: 8px; background: #fff; color: #18191c;
      box-shadow: 0 10px 32px rgba(0, 0, 0, .18); text-align: left;
      font: 12px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif;
    }
    #bilisync .bilisync-panel strong { font-size: 14px; color: #fb7299; }
    #bilisync label { display: grid; gap: 4px; }
    #bilisync input {
      width: 100%; box-sizing: border-box; padding: 6px 8px; border: 1px solid #e3e5e7;
      border-radius: 4px; background: #f6f7f8; color: #18191c; font: inherit;
    }
    #bilisync input:focus { outline: none; border-color: #fb7299; background: #fff; }
    #bilisync .bilisync-secret { -webkit-text-security: disc; }
    #bilisync .bilisync-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    #bilisync .bilisync-actions { display: flex; gap: 8px; }
    #bilisync button {
      padding: 6px 12px; border: 1px solid #e3e5e7; border-radius: 4px; background: #fff;
      color: #61666d; font: inherit; cursor: pointer;
    }
    #bilisync button[data-action="upload"] { background: #fb7299; border-color: #fb7299; color: #fff; }
    #bilisync button:disabled { cursor: progress; opacity: .6; }
    #bilisync [role="status"] { margin: 0; color: #61666d; overflow-wrap: anywhere; white-space: pre-line; }
    #bilisync [role="status"]:empty { display: none; }
    #bilisync :focus-visible { outline: 2px solid #fb7299; outline-offset: 2px; }
  `;
  document.head.append(style);

  // 输入框不使用 name 和 password 类型，避免浏览器把面板当成登录表单自动填入账号密码。
  const field = (key, placeholder, secret = false) =>
    `<input data-field="${key}" type="text"${secret ? ' class="bilisync-secret"' : ''} autocomplete="off" spellcheck="false" data-1p-ignore data-lpignore="true" data-bwignore data-form-type="other" placeholder="${placeholder}">`;
  const sync = document.createElement('details');
  sync.id = 'bilisync';
  sync.innerHTML = `
    <summary>GitHub 同步</summary>
    <div class="bilisync-panel">
      <strong>上传 B 站数据到 GitHub</strong>
      <label>GitHub Token${field('token', 'github_pat_…', true)}</label>
      <label>仓库地址${field('repo', 'https://github.com/owner/repo')}</label>
      <div class="bilisync-row">
        <label>分支（可选）${field('branch', '默认分支')}</label>
        <label>文件目录（可选）${field('path', DEFAULT_DIR)}</label>
      </div>
      <div class="bilisync-actions"><button type="button" data-action="save">保存</button><button type="button" data-action="upload">上传</button></div>
      <p role="status" aria-live="polite"></p>
    </div>`;

  // B 站新旧顶栏结构不一，入口固定在左下角；单页切换时 body 可能被重绘，被移除后重新挂上。
  const mount = () => { if (!sync.isConnected) document.body.append(sync); };
  mount();
  setInterval(mount, 1000);

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

  function md5(text) {
    const add = (a, b) => { const low = (a & 0xffff) + (b & 0xffff); return (((a >> 16) + (b >> 16) + (low >> 16)) << 16) | (low & 0xffff); };
    const rotate = (value, bits) => (value << bits) | (value >>> (32 - bits));
    const shifts = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
    const constants = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) | 0);
    const bytes = new TextEncoder().encode(text);
    const words = new Array((((bytes.length + 8) >> 6) + 1) * 16).fill(0);
    bytes.forEach((byte, i) => { words[i >> 2] |= byte << ((i % 4) * 8); });
    words[bytes.length >> 2] |= 0x80 << ((bytes.length % 4) * 8);
    words[words.length - 2] = bytes.length * 8;
    let [a0, b0, c0, d0] = [0x67452301, 0xefcdab89 | 0, 0x98badcfe | 0, 0x10325476];
    for (let block = 0; block < words.length; block += 16) {
      let [a, b, c, d] = [a0, b0, c0, d0];
      for (let i = 0; i < 64; i += 1) {
        const round = i >> 4;
        const f = [(b & c) | (~b & d), (b & d) | (c & ~d), b ^ c ^ d, c ^ (b | ~d)][round];
        const index = [i, (5 * i + 1) % 16, (3 * i + 5) % 16, (7 * i) % 16][round];
        const next = add(b, rotate(add(add(a, f), add(constants[i], words[block + index])), shifts[round * 4 + (i % 4)]));
        [a, b, c, d] = [d, next, b, c];
      }
      [a0, b0, c0, d0] = [add(a0, a), add(b0, b), add(c0, c), add(d0, d)];
    }
    return [a0, b0, c0, d0].map(word => [0, 8, 16, 24].map(shift => ((word >>> shift) & 0xff).toString(16).padStart(2, '0')).join('')).join('');
  }

  // B 站部分接口要求 WBI 签名：用导航接口给出的两段 key 按固定顺序重排成 mixin key，参数排序后连同时间戳取 MD5。
  const WBI_ORDER = [46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52];
  let mixinKey = null;
  function signQuery(params) {
    const query = { ...params, wts: Math.round(Date.now() / 1000) };
    const text = Object.keys(query).sort()
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(String(query[key]).replace(/[!'()*]/g, ''))}`)
      .join('&');
    return `${text}&w_rid=${md5(text + mixinKey)}`;
  }

  async function biliApi(path, params = {}, { wbi = false } = {}) {
    for (let attempt = 0; ; attempt += 1) {
      const query = wbi ? signQuery(params) : new URLSearchParams(params).toString();
      const response = await fetch(`${API}${path}${query ? `?${query}` : ''}`, { credentials: 'include' });
      const json = await response.json().catch(() => null);
      if (json && json.code === 0) return json.data;
      // -352 / -412 / -799 是风控或请求过快，稍等后重试。
      if (attempt < 3 && [-352, -412, -799].includes(json?.code)) { await sleep(3000 * (attempt + 1)); continue; }
      throw new Error(`B 站返回 ${json?.code ?? response.status}：${json?.message || '请求失败'}（${path}）`);
    }
  }

  const pad = value => String(value).padStart(2, '0');
  const localDate = seconds => {
    if (!seconds) return null;
    const date = new Date(seconds * 1000);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };
  const localDateTime = seconds => {
    if (!seconds) return null;
    const date = new Date(seconds * 1000);
    return `${localDate(seconds)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };
  const formatDuration = seconds => {
    if (seconds == null) return null;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  };
  const videoUrl = bvid => `https://www.bilibili.com/video/${bvid}`;

  function markdownText(value) {
    return String(value ?? '').replace(/[\\|[\]]/g, '\\$&').replace(/\s+/g, ' ').trim();
  }

  function paragraph(value) {
    return String(value ?? '').trim().replace(/\n{2,}/g, '\n').split('\n').map(line => line.trim()).join('  \n');
  }

  async function readSubtitle(subtitle) {
    const url = subtitle.subtitle_url.replace(/^\/\//, 'https://');
    const json = await fetch(url).then(response => response.json());
    return {
      language: subtitle.lan_doc || subtitle.lan,
      lines: (json.body || []).map(line => ({ from: Math.round(line.from * 10) / 10, content: line.content })),
    };
  }

  async function uploads(mid, report) {
    const search = async (tid = 0) => {
      const found = [];
      let types = [];
      for (let pn = 1; ; pn += 1) {
        const data = await biliApi('/x/space/wbi/arc/search', { mid, ps: 50, pn, tid, order: 'pubdate' }, { wbi: true });
        types = Object.values(data.list?.tlist || {});
        found.push(...(data.list?.vlist || []));
        await sleep(300);
        if (!data.list?.vlist?.length || found.length >= data.page.count) return { found, types };
      }
    };
    report('正在读取投稿列表…');
    const { found: list, types } = await search();
    // 列表里的 typeid 是子分区，按主分区分别查询一次，得到每个视频所属的主分区。
    const categories = new Map();
    for (const type of types) {
      (await search(type.tid)).found.forEach(item => categories.set(item.bvid, type.name));
    }
    const videos = [];
    for (const [index, item] of list.entries()) {
      report(`正在读取投稿 ${index + 1} / ${list.length}：${item.title}`);
      const view = await biliApi('/x/web-interface/view', { bvid: item.bvid });
      const tags = await biliApi('/x/tag/archive/tags', { bvid: item.bvid }).catch(() => []);
      const subtitles = [];
      const bgm = [];
      for (const page of view.pages || []) {
        const player = await biliApi('/x/player/wbi/v2', { bvid: item.bvid, cid: page.cid }, { wbi: true });
        const subtitle = (player.subtitle?.subtitles || []).find(entry => entry.subtitle_url);
        if (subtitle) subtitles.push({ page: page.page, part: page.part, ...(await readSubtitle(subtitle)) });
        // B 站自动识别的 BGM 只出现在带 cid 的标签接口里（视频标签栏的「发现《…》」）。
        const pageTags = await biliApi('/x/web-interface/view/detail/tag', { bvid: item.bvid, cid: page.cid }).catch(() => []);
        for (const tag of (pageTags || []).filter(entry => entry.tag_type === 'bgm' && entry.music_id)) {
          if (bgm.some(entry => entry.musicId === tag.music_id)) continue;
          const music = await biliApi('/x/copyright-music-publicity/bgm/detail', { music_id: tag.music_id }).catch(() => null);
          bgm.push({
            musicId: tag.music_id,
            title: music?.music_title || tag.tag_name.replace(/^发现《(.*)》$/, '$1'),
            artist: music?.origin_artist || null,
            album: music?.album || null,
            page: (view.pages || []).length > 1 ? page.page : null,
          });
        }
      }
      const conclusion = await biliApi('/x/web-interface/view/conclusion/get', { bvid: item.bvid, cid: view.cid, up_mid: mid }, { wbi: true }).catch(() => null);
      const summary = conclusion?.code === 0 ? conclusion.model_result : null;
      videos.push({
        bvid: item.bvid,
        title: view.title,
        publishedAt: localDate(view.pubdate),
        duration: formatDuration(view.duration),
        category: categories.get(item.bvid) || view.tname || null,
        tags: (tags || []).map(tag => tag.tag_name),
        description: view.desc && view.desc.trim() !== view.title.trim() ? view.desc.trim() : null,
        pages: (view.pages || []).length > 1 ? view.pages.map(page => ({ page: page.page, part: page.part, duration: formatDuration(page.duration) })) : null,
        stat: { view: view.stat.view, like: view.stat.like, coin: view.stat.coin, favorite: view.stat.favorite, danmaku: view.stat.danmaku, reply: view.stat.reply },
        aiSummary: summary?.summary ? { summary: summary.summary, outline: (summary.outline || []).map(part => ({ title: part.title, at: formatDuration(part.timestamp) })) } : null,
        bgm,
        subtitles,
        url: videoUrl(item.bvid),
      });
      await sleep(300);
    }
    return videos;
  }

  const DYNAMIC_TYPES = {
    DYNAMIC_TYPE_AV: '视频',
    DYNAMIC_TYPE_DRAW: '图文',
    DYNAMIC_TYPE_WORD: '文字',
    DYNAMIC_TYPE_FORWARD: '转发',
    DYNAMIC_TYPE_ARTICLE: '专栏',
    DYNAMIC_TYPE_COMMON_SQUARE: '卡片',
    DYNAMIC_TYPE_MUSIC: '音频',
    DYNAMIC_TYPE_PGC: '番剧',
    DYNAMIC_TYPE_LIVE_RCMD: '直播',
  };

  function dynamicContent(item) {
    const module = item.modules?.module_dynamic || {};
    const major = module.major || {};
    const content = {
      type: DYNAMIC_TYPES[item.type] || item.type,
      title: null,
      text: module.desc?.text || null,
      images: 0,
      video: null,
      card: null,
      textTruncated: false,
    };
    if (major.opus) {
      content.title = major.opus.title || null;
      content.text = major.opus.summary?.text || content.text;
      content.images = (major.opus.pics || []).length;
      content.textTruncated = !!major.opus.summary?.has_more;
    } else if (major.draw) {
      content.images = (major.draw.items || []).length;
    } else if (major.archive) {
      content.video = { bvid: major.archive.bvid, title: major.archive.title, url: videoUrl(major.archive.bvid) };
    } else if (major.article) {
      content.title = major.article.title || null;
      content.text = content.text || major.article.desc || null;
    } else if (major.common) {
      content.card = [major.common.title, major.common.desc].filter(Boolean).join(' · ') || null;
    } else if (major.pgc) {
      content.card = major.pgc.title || null;
    }
    return content;
  }

  async function dynamics(mid, report) {
    const items = [];
    for (let offset = ''; ;) {
      report(`正在读取动态，已读 ${items.length} 条…`);
      const data = await biliApi('/x/polymer/web-dynamic/v1/feed/space', { host_mid: mid, offset, features: 'itemOpusStyle' });
      items.push(...(data.items || []));
      if (!data.has_more || !data.items?.length) break;
      offset = data.offset;
      await sleep(300);
    }
    const result = [];
    for (const item of items) {
      const content = dynamicContent(item);
      // 动态列表里的长文只给摘要，被截断时读取详情拿全文。
      if (content.textTruncated) {
        const detail = await biliApi('/x/polymer/web-dynamic/v1/opus/detail', { id: item.id_str });
        const body = (detail.item?.modules || []).find(module => module.module_type === 'MODULE_TYPE_CONTENT')?.module_content?.paragraphs || [];
        content.text = body.filter(part => part.para_type === 1).map(part => (part.text?.nodes || []).map(node => node.word?.words ?? node.rich?.text ?? '').join('')).join('\n');
        await sleep(300);
      }
      delete content.textTruncated;
      const entry = { id: item.id_str, publishedAt: localDateTime(item.modules?.module_author?.pub_ts), ...content, url: `https://www.bilibili.com/opus/${item.id_str}` };
      if (item.orig) {
        const original = dynamicContent(item.orig);
        delete original.textTruncated;
        entry.original = item.orig.type === 'DYNAMIC_TYPE_NONE'
          ? { deleted: true }
          : { id: item.orig.id_str, author: item.orig.modules?.module_author?.name || null, ...original };
      }
      result.push(entry);
    }
    return result;
  }

  async function favorites(mid, report) {
    const folders = (await biliApi('/x/v3/fav/folder/created/list-all', { up_mid: mid }))?.list || [];
    const result = [];
    for (const [index, folder] of folders.entries()) {
      const medias = [];
      let info = null;
      for (let pn = 1; ; pn += 1) {
        report(`正在读取收藏夹 ${index + 1} / ${folders.length}：${folder.title}（${medias.length} / ${folder.media_count}）`);
        const data = await biliApi('/x/v3/fav/resource/list', { media_id: folder.id, pn, ps: 40, platform: 'web' });
        info ??= data.info;
        medias.push(...(data.medias || []));
        if (!data.has_more || !data.medias?.length) break;
        await sleep(300);
      }
      result.push({
        id: folder.id,
        title: folder.title,
        intro: info?.intro || null,
        count: medias.length,
        createdAt: localDate(info?.ctime),
        items: medias.map(media => ({
          title: media.title,
          invalid: media.attr === 9 || media.attr === 1 || media.title === '已失效视频',
          upper: media.upper?.name || null,
          duration: formatDuration(media.duration),
          intro: media.intro || null,
          favoritedAt: localDate(media.fav_time),
          publishedAt: localDate(media.pubtime),
          bvid: media.bvid || media.bv_id || null,
          url: media.bvid ? videoUrl(media.bvid) : media.link || null,
        })),
      });
      await sleep(300);
    }
    return result;
  }

  async function following(mid, report) {
    const groups = Object.fromEntries(((await biliApi('/x/relation/tags')) || []).map(tag => [tag.tagid, tag.name]));
    const list = [];
    for (let pn = 1; ; pn += 1) {
      report(`正在读取关注，已读 ${list.length} 个…`);
      const data = await biliApi('/x/relation/followings', { vmid: mid, pn, ps: 50 });
      list.push(...(data.list || []));
      if (!data.list?.length || list.length >= data.total) break;
      await sleep(300);
    }
    return list.map(user => ({
      mid: user.mid,
      name: user.uname,
      groups: (user.tag || []).map(id => groups[id]).filter(Boolean),
      special: user.special === 1,
      followedAt: localDate(user.mtime),
      verified: user.official_verify?.desc || null,
      sign: user.sign || null,
      url: `https://space.bilibili.com/${user.mid}`,
    }));
  }

  function countBy(values) {
    const counts = new Map();
    values.forEach(value => counts.set(value, (counts.get(value) || 0) + 1));
    return [...counts].sort((a, b) => b[1] - a[1]).map(([name, count]) => `${name} ${count}`).join('、');
  }

  function uploadsMarkdown(user, exportedAt, videos, descriptions) {
    const lines = [
      `# ${markdownText(user.name)} 的投稿视频`,
      '',
      `共 ${videos.length} 个（${countBy(videos.map(video => video.category || '未分区'))}），按发布时间从新到旧。导出时间：${exportedAt}`,
      '',
      `有字幕的 ${videos.filter(video => video.subtitles.length).length} 个，全文在 [subtitles/](subtitles/)。「内容描述」由 AI 看过视频画面后补写，存在仓库的 descriptions.json 里，「（待补）」表示还没写。`,
      '',
    ];
    for (const video of videos) {
      const stat = video.stat;
      lines.push(
        `## [${markdownText(video.title)}](${video.url})`,
        '',
        `- ${video.publishedAt} 发布 · ${video.duration} · ${video.category || '未分区'} · 播放 ${stat.view} · 点赞 ${stat.like} · 投币 ${stat.coin} · 收藏 ${stat.favorite} · 评论 ${stat.reply}`,
      );
      if (video.tags.length) lines.push(`- 标签：${video.tags.map(markdownText).join('、')}`);
      if (video.pages) lines.push(`- 分 P：${video.pages.map(page => `P${page.page} ${markdownText(page.part)}（${page.duration}）`).join('；')}`);
      if (video.description) lines.push(`- 简介：${paragraph(video.description)}`);
      if (video.aiSummary) {
        lines.push(`- B 站 AI 总结：${markdownText(video.aiSummary.summary)}`);
        if (video.aiSummary.outline.length) lines.push(`- 分段：${video.aiSummary.outline.map(part => `${part.at} ${markdownText(part.title)}`).join('；')}`);
      }
      if (video.bgm.length) {
        lines.push(`- BGM：${video.bgm.map(music => `${music.page ? `P${music.page} ` : ''}《${markdownText(music.title)}》${music.artist ? ` — ${markdownText(music.artist)}` : ''}`).join('；')}`);
      }
      if (video.subtitles.length) {
        const count = video.subtitles.reduce((sum, subtitle) => sum + subtitle.lines.length, 0);
        lines.push(`- 字幕：[全文](subtitles/${video.bvid}.md)，${count} 句（${video.subtitles[0].language}）`);
      }
      lines.push(descriptions[video.bvid] ? `- 内容描述：${markdownText(descriptions[video.bvid])}` : PENDING_VIDEO, '');
    }
    return lines.join('\n');
  }

  function subtitleMarkdown(video) {
    const lines = [`# ${markdownText(video.title)} · 字幕`, '', `[视频](${video.url}) · ${video.publishedAt} 发布 · ${video.duration}`, ''];
    for (const subtitle of video.subtitles) {
      if (video.subtitles.length > 1) lines.push(`## P${subtitle.page} ${markdownText(subtitle.part)}`, '');
      subtitle.lines.forEach(line => lines.push(`- [${formatDuration(line.from)}] ${markdownText(line.content)}`));
      lines.push('');
    }
    return lines.join('\n');
  }

  function dynamicsMarkdown(user, exportedAt, entries, descriptions) {
    const shown = entries.filter(entry => entry.type !== '视频' || entry.text);
    const lines = [
      `# ${markdownText(user.name)} 的动态`,
      '',
      `共 ${entries.length} 条（${countBy(entries.map(entry => entry.type))}），按时间从新到旧。导出时间：${exportedAt}`,
      '',
      '投稿视频自动生成的动态只列出带了附言的，视频本身见 [uploads.md](uploads.md)。自己发的图片由 AI 看过后补写「图片描述」，存在仓库的 descriptions.json 里，「（待补）」表示还没写；转发的别人的图片不描述。',
      '',
    ];
    for (const entry of shown) {
      lines.push(`## ${entry.publishedAt} · ${entry.type}${entry.title ? ` · ${markdownText(entry.title)}` : ''}`, '');
      if (entry.text) lines.push(paragraph(entry.text), '');
      if (entry.video) lines.push(`- 视频：[${markdownText(entry.video.title)}](${entry.video.url})`);
      if (entry.card) lines.push(`- 卡片：${markdownText(entry.card)}`);
      if (entry.images) {
        lines.push(`- 图片：${entry.images} 张`);
        lines.push(descriptions[entry.id] ? `- 图片描述：${markdownText(descriptions[entry.id])}` : PENDING_IMAGES);
      }
      if (entry.original) {
        const original = entry.original;
        if (original.deleted) {
          lines.push('- 转发的原动态已删除');
        } else {
          const what = original.video ? `的视频 [${markdownText(original.video.title)}](${original.video.url})` : `的${original.type}${original.title ? `「${markdownText(original.title)}」` : ''}`;
          lines.push(`- 转发自 ${markdownText(original.author)} ${what}${original.images ? `（${original.images} 张图）` : ''}`);
          if (original.text) lines.push(`- 原文：${markdownText(original.text).slice(0, 300)}`);
        }
      }
      lines.push(`- 链接：${entry.url}`, '');
    }
    return lines.join('\n');
  }

  function favoriteMarkdown(folder) {
    return [
      `# 收藏夹：${markdownText(folder.title)}`,
      '',
      ...(folder.intro ? [paragraph(folder.intro), ''] : []),
      `- ${folder.count} 条，创建于 ${folder.createdAt ?? ''}，按收藏时间从新到旧`,
      `- 链接：https://space.bilibili.com/favlist?fid=${folder.id}`,
      '',
      '| # | 视频 | UP 主 | 时长 | 收藏日期 | 简介 |',
      '| ---: | --- | --- | ---: | --- | --- |',
      ...folder.items.map((item, index) => {
        const title = item.invalid ? `${markdownText(item.title)}（已失效）` : item.url ? `[${markdownText(item.title)}](${item.url})` : markdownText(item.title);
        return `| ${index + 1} | ${title} | ${markdownText(item.upper)} | ${item.duration ?? ''} | ${item.favoritedAt ?? ''} | ${markdownText(item.intro).slice(0, 60)} |`;
      }),
      '',
    ].join('\n');
  }

  function followingMarkdown(user, exportedAt, users) {
    return [
      `# ${markdownText(user.name)} 的关注`,
      '',
      `共 ${users.length} 个，其中特别关注 ${users.filter(entry => entry.special).length} 个，按关注时间从新到旧。导出时间：${exportedAt}`,
      '',
      '| UP 主 | 分组 | 关注日期 | 认证 | 签名 |',
      '| --- | --- | --- | --- | --- |',
      ...users.map(entry => `| [${markdownText(entry.name)}](${entry.url}) | ${markdownText(entry.groups.join('、'))} | ${entry.followedAt ?? ''} | ${markdownText(entry.verified)} | ${markdownText(entry.sign)} |`),
      '',
    ].join('\n');
  }

  function overviewMarkdown(user, exportedAt, videos, entries, folders, users) {
    return [
      `# ${markdownText(user.name)} 的 B 站`,
      '',
      `- 主页：https://space.bilibili.com/${user.mid}`,
      `- 等级 Lv${user.level}，关注 ${user.following}，粉丝 ${user.follower}`,
      `- 导出时间：${exportedAt}`,
      '',
      `- [投稿视频](uploads.md)：${videos.length} 个，${videos.at(-1)?.publishedAt ?? ''} 至 ${videos[0]?.publishedAt ?? ''}`,
      `- [动态](dynamics.md)：${entries.length} 条，${entries.at(-1)?.publishedAt?.slice(0, 10) ?? ''} 至 ${entries[0]?.publishedAt?.slice(0, 10) ?? ''}`,
      `- [关注](following.md)：${users.length} 个`,
      '',
      '## 自建收藏夹',
      '',
      '| 收藏夹 | 条数 | 创建日期 | 简介 |',
      '| --- | ---: | --- | --- |',
      ...folders.map(folder => `| [${markdownText(folder.title)}](favorites/${folder.id}.md) | ${folder.count} | ${folder.createdAt ?? ''} | ${markdownText(folder.intro).slice(0, 80)} |`),
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

  // 读取分支最新提交和目录树：先取出已有的 descriptions.json，上传时在这棵树上追加文件，合成一次提交后移动分支指针。
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
      async readJson(path) {
        if (!blobs.has(path)) return null;
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

  const toJson = value => `${JSON.stringify(value, null, 2)}\n`;

  let uploading = false;
  async function upload() {
    if (uploading) return;
    const config = saveConfig();
    const repository = parseRepository(config.repo || '');
    if (!/^(?:github_pat_|gh[pousr]_)\w+$/.test(config.token || '')) { status.textContent = '请填写 GitHub Token（以 github_pat_ 或 ghp_ 开头）。'; return; }
    if (!repository) { status.textContent = '仓库地址格式应为 https://github.com/owner/repo。'; return; }
    const dir = (config.path || DEFAULT_DIR).replace(/^\/+|\/+$/g, '');
    const report = text => { status.textContent = text; };
    uploading = true;
    uploadButton.disabled = true;
    try {
      report('正在读取账号…');
      const nav = await biliApi('/x/web-interface/nav').catch(() => null);
      if (!nav?.isLogin) throw new Error('请先登录 B 站');
      const key = url => url.split('/').pop().split('.')[0];
      const raw = key(nav.wbi_img.img_url) + key(nav.wbi_img.sub_url);
      mixinKey = WBI_ORDER.map(index => raw[index]).join('').slice(0, 32);
      const stat = await biliApi('/x/web-interface/nav/stat');
      const user = { mid: nav.mid, name: nav.uname, level: nav.level_info?.current_level, following: stat.following, follower: stat.follower };

      report('正在连接 GitHub…');
      const repo = await openRepository({ token: config.token, ...repository, branch: config.branch });
      const saved = (await repo.readJson(`${dir ? `${dir}/` : ''}descriptions.json`)) || {};
      const descriptions = { ...(saved.videos || {}), ...(saved.dynamics || {}) };

      const exportedAt = new Date().toISOString();
      const base = `${dir ? `${dir}/` : ''}${uploadStamp()}`;
      const videos = await uploads(user.mid, report);
      const entries = await dynamics(user.mid, report);
      const folders = await favorites(user.mid, report);
      const users = await following(user.mid, report);

      const header = { source: 'bilibili', mid: user.mid, exportedAt };
      const files = [
        { path: `${base}/README.md`, content: overviewMarkdown(user, exportedAt, videos, entries, folders, users) },
        { path: `${base}/uploads.json`, content: toJson({ ...header, total: videos.length, videos }) },
        { path: `${base}/uploads.md`, content: uploadsMarkdown(user, exportedAt, videos, descriptions) },
        { path: `${base}/dynamics.json`, content: toJson({ ...header, total: entries.length, dynamics: entries }) },
        { path: `${base}/dynamics.md`, content: dynamicsMarkdown(user, exportedAt, entries, descriptions) },
        { path: `${base}/following.json`, content: toJson({ ...header, total: users.length, following: users }) },
        { path: `${base}/following.md`, content: followingMarkdown(user, exportedAt, users) },
        ...videos.filter(video => video.subtitles.length).map(video => ({ path: `${base}/subtitles/${video.bvid}.md`, content: subtitleMarkdown(video) })),
        ...folders.flatMap(folder => [
          { path: `${base}/favorites/${folder.id}.json`, content: toJson({ ...header, ...folder }) },
          { path: `${base}/favorites/${folder.id}.md`, content: favoriteMarkdown(folder) },
        ]),
      ];
      report(`正在上传 ${files.length} 个文件…`);
      await repo.commit(files, `Update Bilibili data (投稿 ${videos.length}, 动态 ${entries.length}, 收藏夹 ${folders.length}, 关注 ${users.length})`);
      report(`已上传投稿 ${videos.length} 个、动态 ${entries.length} 条、收藏夹 ${folders.length} 个、关注 ${users.length} 个到 ${repository.owner}/${repository.repo}@${repo.branch}：\n${base}/`);
    } catch (error) {
      report(`上传失败：${error.message}`);
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
