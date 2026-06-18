中文 · [English](README.en.md)

# MyScripts

我的 [Tampermonkey](https://www.tampermonkey.net/) / 油猴用户脚本合集。

每个脚本放在独立的文件夹里，附带自己的 README。

## 脚本列表

| 脚本 | 说明 | 安装 |
|---|---|---|
| [github-pr-tab](./github-pr-tab) | GitHub PR/Issue 页面：浏览器标签只显示 `#编号`，并按状态给图标(favicon)上色 | [安装](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/github-pr-tab/github-pr-tab.user.js) |
| [github-repo-visibility-color](./github-repo-visibility-color) | GitHub 个人主页/仓库列表：`Public` 徽章变绿、`Private` 变蓝（描边样式，与原生 “Public archive” 一致） | [安装](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/github-repo-visibility-color/github-repo-visibility-color.user.js) |
| [pt-checkin-pterclub](./pt-checkin-pterclub) | PTerClub：打开页面时自动检测并完成每日签到，未签到则签到后回到种子页并刷新，已签到则不动 | [安装](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-pterclub/pt-checkin-pterclub.user.js) |
| [pt-checkin-mua](./pt-checkin-mua) | mua：打开页面时自动检测并完成每日签到，未签到则签到后回到 `special.php` 并刷新，已签到则不动 | [安装](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-mua/pt-checkin-mua.user.js) |
| [pt-checkin-kamept](./pt-checkin-kamept) | KamePT：打开页面时自动检测并完成每日签到，未签到则签到后回到 `torrents.php?tag_id=10` 并刷新，已签到则不动 | [安装](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-kamept/pt-checkin-kamept.user.js) |
| [pt-checkin-qingwapt](./pt-checkin-qingwapt) | QingwaPT(青蛙)：打开主页时领每日福利 + （可选）群聊发言 + 签到，已签到则不动；群聊开关可一键关闭 | [安装](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-qingwapt/pt-checkin-qingwapt.user.js) |

## 如何安装脚本

1. 给浏览器（Chrome / Edge / Firefox 通用）安装 [Tampermonkey](https://www.tampermonkey.net/) 或开源的 [Violentmonkey](https://violentmonkey.github.io/) 扩展。
2. 点击上表中对应脚本的 **安装** 链接（`.user.js` 结尾），Tampermonkey 会自动弹出安装界面。
3. 点 **安装 / Install** 即可。之后访问匹配的页面会自动生效。

> **Edge / Chrome（Manifest V3）注意**：脚本显示「已启用」却不生效时，去 `edge://extensions`（或 `chrome://extensions`）打开 Tampermonkey 的详情页，开启 **“允许用户脚本 / Allow user scripts”** 开关（或打开右上角的开发者模式），然后刷新页面。

> 已安装过的脚本，Tampermonkey 会根据脚本头部的 `@updateURL` 自动检查更新。

## License

[MIT](./LICENSE)
