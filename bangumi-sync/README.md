# 番组同步 BangumiSync

把 [Bangumi 番组计划](https://bgm.tv/) 的全部收藏上传到 GitHub 仓库。

当前版本：`1.0.1`。

## 功能

- 在页面右下角的 dock 栏（「个性化」「隐藏」旁边）加入「GitHub 同步」，所有页面可用；面板向上展开，点击外部或按 Escape 关闭。
- 填写 GitHub Token、仓库地址，以及可选的分支（默认仓库默认分支）、文件目录（默认 `bangumi`）、Bangumi 用户名和 Bangumi Token，点击「上传全部收藏」。
- 读取动画、书籍、音乐、游戏、三次元五类条目的全部收藏状态：想看、看过、在看、搁置、抛弃；书籍、音乐、游戏分别显示为读、听、玩。
- 每类条目生成一组 JSON 和 Markdown，按我的评分（10 分制）从高到低排名，同分并列，同分时 Bangumi 评分高的在前；未评分的条目排在最后，按看过、在看、想看、搁置、抛弃的顺序。没有收藏的类型不生成文件。
- 每次上传新建带本地时间戳的文件，例如 `bangumi/anime-2026-10-11-103829.json` 和 `.md`，不覆盖旧文件；全部文件合成一次提交。

## 数据

JSON 每个条目包含排名、条目 ID、原名、中文名、日期、收藏状态、我的评分、Bangumi 评分、进度（动画为已看集数，书籍为卷数和话数）、我的标签、短评、是否仅自己可见、更新日期和链接，并附各状态数量。Markdown 是同样排序的表格，列出名称、年份、状态、我的评分、Bangumi 评分和更新日期。

收藏通过 [Bangumi 公开 API](https://bangumi.github.io/api/) 读取，每页 50 条，间隔 0.3 秒。未填写用户名时使用当前登录账号；填写了 Bangumi Token 时从 Token 识别账号，并包含仅自己可见的收藏。Bangumi Token 可在 <https://next.bgm.tv/demo/access-token> 生成。

## 安全

两个 Token 都以明文保存在油猴存储中。GitHub Token 建议使用只授权目标仓库、只开放 Contents 读写的 fine-grained token；上传前会检查它是否以 `github_pat_` 或 `ghp_` 等前缀开头。输入框不使用登录表单的字段名和密码类型（`1.0.1` 起），避免浏览器把已保存的 Bangumi 账号密码自动填进来。请求只发往 `api.bgm.tv` 和 `api.github.com`，不携带 Bangumi 网站的 Cookie。

## 安装

安装 [Tampermonkey](https://www.tampermonkey.net/) 后，点击 [安装 BangumiSync](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/bangumi-sync/bangumi-sync.user.js)。适用于 `bangumi.tv`、`bgm.tv` 和 `chii.in`。

## 验证状态

`1.0.0` 已在代理加载的真实 Bangumi 首页验证：dock 入口与面板定位、外部点击和 Escape 关闭、配置保存；用公开账号的真实收藏（五类共 1592 条，35 次请求）验证了分页、全部状态、状态用词、书籍进度、排序与并列排名、Markdown 转义，以及 10 个文件合成一次提交的 Git Data API 调用顺序；用户不存在、Bangumi Token 无效、未登录且未填用户名、GitHub 401 均有提示。GitHub 写入为模拟接口；登录状态下自动识别用户名和带 Bangumi Token 读取私密收藏尚未实测。

## License

[MIT](../LICENSE)
