# 哔哩同步 BilibiliSync

把自己在 [B 站](https://www.bilibili.com/)的投稿视频、动态、自建收藏夹和关注列表上传到 GitHub 仓库。

当前版本：`1.0.0`。

## 功能

- 在 B 站页面左下角加入「GitHub 同步」（B 站新旧顶栏结构不一，所以不放在顶栏），点击外部或按 Escape 关闭面板。
- 填写 GitHub Token、仓库地址，以及可选的分支（默认仓库默认分支）和文件目录（默认 `bilibili`），点击「上传」。
- 每次上传新建一个带本地时间戳的目录，全部文件合成一次提交，不覆盖旧数据：

```
bilibili/
├── descriptions.json            视频画面和动态图片的文字描述（由 AI 补写，脚本只读取）
└── 2026-10-13-160000/
    ├── README.md                总览：账号、各文件入口、自建收藏夹列表
    ├── uploads.json / .md       投稿视频
    ├── subtitles/<BV号>.md      有字幕的视频的字幕全文
    ├── dynamics.json / .md      动态
    ├── favorites/<收藏夹ID>.json / .md
    └── following.json / .md     关注列表
```

## 上传内容

- **投稿视频**：全部投稿，按发布时间从新到旧。每个视频记录标题、发布日期、时长、分区、标签、简介、分 P、播放 / 点赞 / 投币 / 收藏 / 评论数；有字幕的（包括 B 站自动生成的 AI 字幕）保存全文；有 B 站「AI 视频总结」的保存总结和分段。
- **动态**：全部动态的全文（长图文会读取详情拿到完整正文）、类型、发布时间、图片张数；转发的动态记录原作者和原动态的标题或摘要。投稿视频自动生成的动态在 Markdown 中只列出带附言的。
- **自建收藏夹**：每个收藏夹的简介和全部条目：标题、UP 主、时长、简介、收藏日期、发布日期，已失效的条目会标出。
- **关注列表**：UP 主、分组（含特别关注）、关注日期、认证和签名。

图片和视频画面脚本无法理解，不保存图片地址。Markdown 中每个投稿视频有一行「内容描述」，每条自己发的带图动态有一行「图片描述」，内容取自仓库里的 `descriptions.json`，没有时显示「（待补）」。这份文件由 AI 看过视频抽帧和动态图片后写入，脚本每次上传时读取并写进新的 Markdown。

## 数据来源

数据通过 B 站网页使用的接口读取，需要已登录；只读取当前登录账号自己的数据。需要 WBI 签名的接口（投稿列表、播放器字幕、AI 总结）由脚本按网页的方式签名。请求之间间隔 0.3 秒，遇到风控返回码会等几秒后重试。上传一次大约需要几分钟，面板会显示进度。

## 安全

GitHub Token 以明文保存在油猴存储中，建议使用只授权目标仓库、只开放 Contents 读写的 fine-grained token（读取 `descriptions.json` 需要读权限）。上传前会检查 Token 是否以 `github_pat_` 或 `ghp_` 等前缀开头。输入框不使用登录表单的字段名和密码类型，避免浏览器把已保存的账号密码自动填进来。GitHub 请求不携带 B 站的 Cookie。

## 安装

安装 [Tampermonkey](https://www.tampermonkey.net/) 后，点击 [安装 BilibiliSync](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/bilibili-sync/bilibili-sync.user.js)。

## 验证状态

`1.0.0` 已在已登录的真实 B 站首页和个人空间页面验证：入口位置与面板样式；读取 117 个投稿（含字幕）、全部动态、27 个自建收藏夹和 255 个关注，生成文件并按 Git Data API 合成一次提交；读取仓库里已有的 `descriptions.json` 后，117 个视频和 12 条动态的描述都正确写进了 Markdown。GitHub 读写为模拟接口。

## License

[MIT](../LICENSE)
