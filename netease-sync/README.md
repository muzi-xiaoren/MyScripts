# 云音同步 NeteaseSync

把[网易云音乐](https://music.163.com/)的歌单和听歌排行上传到 GitHub 仓库。

当前版本：`1.0.0`。

## 功能

- 在顶部导航栏头像左侧加入「GitHub 同步」，所有页面可用；点击外部或按 Escape 关闭面板。
- 填写 GitHub Token、仓库地址，以及可选的分支（默认仓库默认分支）和文件目录（默认 `netease`），点击「上传歌单」。
- 读取当前登录账号的全部歌单：自建歌单上传全部歌曲，保持歌单原顺序；收藏的歌单只记录名称、简介、创建者、歌曲数和链接。
- 附带听歌排行：所有时间和最近一周各前 100 首，含播放次数。
- 每次上传新建一个带本地时间戳的目录，全部文件合成一次提交，不覆盖旧数据：

```
netease/2026-10-11-111105/
├── README.md              总览：自建歌单列表、收藏歌单、听歌排行入口
├── playlists/<歌单ID>.json / .md
├── subscribed.json        收藏的歌单
└── ranking.json / .md     听歌排行
```

## 数据

歌单 JSON 包含名称、简介、标签、歌曲数、播放数、创建和更新日期、链接，以及每首歌的序号、歌曲 ID、歌名、别名或译名、歌手、专辑、时长、加入日期和链接。Markdown 为对应的表格。

网易云标注的歌曲数与歌单实际列表可能相差几首（下架或灰色歌曲的计数口径不同），文件按实际列表收录，总览显示实际收录数量。

数据通过网易云网页使用的接口读取，需要已登录；请求只读取当前账号的数据，歌单之间间隔 0.3 秒。

## 安全

GitHub Token 以明文保存在油猴存储中，建议使用只授权目标仓库、只开放 Contents 读写的 fine-grained token。上传前会检查 Token 是否以 `github_pat_` 或 `ghp_` 等前缀开头。输入框不使用登录表单的字段名和密码类型，避免浏览器把已保存的账号密码自动填进来。GitHub 请求不携带网易云的 Cookie。

## 安装

安装 [Tampermonkey](https://www.tampermonkey.net/) 后，点击 [安装 NeteaseSync](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/netease-sync/netease-sync.user.js)。

## 验证状态

`1.0.0` 已在已登录的真实网易云页面验证：入口位置与面板样式、读取 37 个自建歌单共 4034 首歌（顺序与网页一致，无缺失歌名）、23 个收藏歌单、听歌排行两组各 100 首，生成 78 个文件并按 Git Data API 合成一次提交；非 GitHub 格式的 Token 会被拒绝。GitHub 写入为模拟接口。

## License

[MIT](../LICENSE)
