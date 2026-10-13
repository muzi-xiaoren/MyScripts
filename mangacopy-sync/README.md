# 拷贝漫画同步 MangaCopySync

把[拷贝漫画](https://www.mangacopy.com/)书架上收藏的全部漫画上传到 GitHub 仓库。

当前版本：`1.0.0`。

## 功能

- 在个人中心（`/web/person/…`）右下角加入「GitHub 同步」；其他页面不显示。点击外部或按 Escape 关闭面板。
- 填写 GitHub Token、仓库地址，以及可选的分支（默认仓库默认分支）和文件目录（默认 `mangacopy`），点击「上传书架」。
- 读取书架上收藏的全部漫画，按网站「最近更新」的顺序排列。
- 每次上传新建带本地时间戳的文件，例如 `mangacopy/shelf-2026-10-13-230802.json` 和 `.md`，不覆盖旧文件；两个文件合成一次提交。

## 数据

JSON 每部漫画包含序号、名称、链接、作者、连载状态（连载中 / 已完结 / 短篇）、最新话、更新日期、看到哪一话、热度和所在收藏夹。Markdown 是同样顺序的表格，开头统计各状态数量和收藏了多部作品的作者。

书架通过网站自己前端用的接口 `/api/v3/member/collect/comics` 读取，每页 50 条，间隔 0.3 秒。接口需要登录：脚本从网站的登录 Cookie 里取 `token`，只发往拷贝漫画本站，和网站前端的做法一样。

接口返回的「看到哪一话」有时是乱码，例如 `ç¬¬24è©±`：这是 UTF-8 字节被按 Windows-1252 解读了。脚本会反查回原字节，再按 UTF-8 解码还原成 `第24話`；解不开的保持原样。

## 安全

GitHub Token 以明文保存在油猴存储中，建议使用只授权目标仓库、只开放 Contents 读写的 fine-grained token。上传前会检查 Token 是否以 `github_pat_` 或 `ghp_` 等前缀开头。输入框不使用登录表单的字段名和密码类型，避免浏览器把已保存的账号密码自动填进来。GitHub 请求不携带拷贝漫画的 Cookie。

## 安装

安装 [Tampermonkey](https://www.tampermonkey.net/) 后，点击 [安装 MangaCopySync](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/mangacopy-sync/mangacopy-sync.user.js)。适用于 `www.mangacopy.com`。

## 验证状态

`1.0.0` 已在已登录的真实账号上验证：读取书架 43 部（连载中 24、已完结 16、短篇 3），40 部有阅读记录，其中 34 条乱码全部还原。生成 2 个文件，并按 Git Data API 合成一次提交。GitHub 写入用的是模拟接口。

## License

[MIT](../LICENSE)
