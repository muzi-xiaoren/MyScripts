中文 · [English](README.en.md)

# excookie-igneous

[`excookie.64396439.xyz`](https://excookie.64396439.xyz/) 上的侧边悬浮框助手：粘贴自己账号的 `ipb_member_id` / `ipb_pass_hash`，一键填入页面、选美国节点、请求并取回新的 `igneous`，结果可**单击复制、双击编辑**。

> 本脚本**不列入根目录 `README.md` 的脚本表**，只保留在本目录，按需安装即可。

## 安装

[点此安装](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/excookie-igneous/excookie-igneous.user.js)（需先装 [Tampermonkey](https://www.tampermonkey.net/)）。

## 用法

1. 打开 `https://excookie.64396439.xyz/`，右上角出现「igneous 助手」悬浮框。
2. 在文本框粘贴（只要包含 `ipb_member_id` 和 `ipb_pass_hash` 两行即可，`igneous` 可留空）：

   ```
   ipb_member_id:8973071
   ipb_pass_hash:feba317f5aa71e5db28f63c5402918cd
   igneous:
   ```

3. 点「填入页面 · 选美国节点 · 取 igneous」。脚本会把账号填进页面、选中美国节点、提交请求，并等待页面生成新的 `igneous`。
4. 结果区显示：

   ```
   ipb_member_id:8973071
   ipb_pass_hash:feba317f5aa71e5db28f63c5402918cd
   igneous:<页面新生成的值>
   ```

   - **单击**结果区 → 复制全部内容到剪贴板。
   - **双击**结果区 → 进入编辑态，可手动修改；失焦后退出编辑。

## 说明

- 只处理**你本人账号**的 cookie，全部在本地浏览器里完成，不上传任何第三方。
- 页面结构若有变化，脚本顶部的 `CONFIG` 收纳了全部选择器（输入框、节点、提交按钮、结果读取位置），按真实 DOM 调整候选项即可，无需改动逻辑。
- 悬浮框标题栏可拖动，右侧「—」可折叠/展开。
