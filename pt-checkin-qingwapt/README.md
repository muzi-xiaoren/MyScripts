中文 · [English](README.en.md)

# PT 签到 · QingwaPT

打开 [青蛙 QingwaPT](https://www.qingwapt.com/) 主页时，自动完成每日任务：

1. **领每日福利**（蝌蚪商店：1 蝌蚪兑换 1000 蝌蚪）
2. **群聊发言**（可选，默认开）——往主页群聊发一条「蛙总，求上传」
3. **签到**

顺序是「先领福利 + 发言，最后签到」。**以「是否已签到」作为当天总开关**：进主页时若发现已签到，就什么都不做；否则做完上面三件事并回到主页（回来后已是已签到状态，下次打开自动跳过）。

## 安装

需先安装 [Tampermonkey](https://www.tampermonkey.net/)，然后 [点此安装脚本](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-checkin-qingwapt/pt-checkin-qingwapt.user.js)。

## 配置（脚本顶部）

```js
const RETURN_TO = 'https://www.qingwapt.com/index.php'; // 做完回到的页面；'' = 只刷新当前页
const ENABLE_CHAT = true;        // ← 第三件事开关：true 开 / false 关（群聊发言）
const CHAT_MESSAGE = '蛙总，求上传';
const DAILY_GIFT_ID = 28;        // 每日福利物品 id（UI 上显示的 9625378 是展示编号）
```

**关闭群聊发言**：把 `ENABLE_CHAT` 改成 `false` 即可。

> ⚠️ 群聊发言是公开发帖。PT 站对自动刷屏通常较敏感，本脚本已限制「每天最多一条」，但仍建议自行评估账号风险，必要时关掉。

## 原理（三件事都直接走后端接口）

| 任务 | 接口 |
|---|---|
| 签到 | `GET /attendance.php`（经典 NexusPHP，幂等） |
| 每日福利 | `POST /api/bonus-shop/exchange`，FormData `id=28&amount=1`；返回 `{"success":true}` 成功 / `{"success":false,"msg":"超过限购数量。"}` 今天已领 |
| 群聊 | `GET /shoutbox.php?shbox_text=…&sent=yes&type=shoutbox` |

「已签到」检测：未签到时页面顶部有 `<a class="faqlink" href="attendance.php">[签到得蝌蚪]</a>`，签到后该 `faqlink` class 消失、文字变「签到已得…」。脚本据此判断今天是否还没做。
