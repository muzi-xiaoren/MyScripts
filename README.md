# MyScripts

我的 [Tampermonkey](https://www.tampermonkey.net/) / 油猴用户脚本合集。

每个脚本放在独立的文件夹里，附带自己的 README。

## 脚本列表

| 脚本 | 说明 | 安装 |
|---|---|---|
| [github-pr-tab](./github-pr-tab) | GitHub PR/Issue 页面：浏览器标签只显示 `#编号`，并按状态给图标(favicon)上色 | [安装](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/github-pr-tab/github-pr-tab.user.js) |

## 如何安装脚本

1. 给浏览器（Chrome / Edge / Firefox 通用）安装 [Tampermonkey](https://www.tampermonkey.net/) 或开源的 [Violentmonkey](https://violentmonkey.github.io/) 扩展。
2. 点击上表中对应脚本的 **安装** 链接（`.user.js` 结尾），Tampermonkey 会自动弹出安装界面。
3. 点 **安装 / Install** 即可。之后访问匹配的页面会自动生效。

> 已安装过的脚本，Tampermonkey 会根据脚本头部的 `@updateURL` 自动检查更新。

## License

[MIT](./LICENSE)
