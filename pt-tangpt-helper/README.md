中文 · [English](README.en.md)

# PT 助手 · 不可躺

[www.tangpt.top](https://www.tangpt.top/) 的每日流程助手。**每一步一个独立开关**，关掉某步流程会直接跳到下一步：

```js
const FEATURES = {
  mailClean: true,   // 第一步：收件箱清理
  lottery: true,     // 第二步：一百连抽 + 结果累计
  task: true,        // 第三步：领取任务
  checkin: true,     // 第四步：签到得魔力
  slot: true,        // 第五步：老虎机开转
  home: true,        // 第六步：回主页
};
```

打开站点任意受支持的页面后，脚本按顺序把这六步做完，做完一步自己跳到下一步的页面（`CHAIN.enabled = false` 可以关掉自动串联，只做当前页那一步）。进度和结果都记在右侧悬浮框里，按天保存，刷新不丢。

## 六步都做什么

| 步 | 页面 | 动作 |
| --- | --- | --- |
| 邮箱 | `messages.php` | 删除所有已读邮件 + 标题以「任务」开头的未读邮件，其余未读一律保留 |
| 抽奖 | `omnibot_lottery.php` | 点一百连抽，累计记录结果 |
| 任务 | `task.php` | 每月最后一天领 `VIP`，平时领 `苍蝇腿` |
| 签到 | `index.php` | 签到得魔力 |
| 老虎机 | `omnibot_slot.php` | 开转 2 次，结果单独记一块 |
| 主页 | `index.php` | 回到主页，流程结束 |

## 悬浮框记什么

抽奖和老虎机各占一块。魔力值只记总变化，不逐条列：

```
【抽奖】
消耗魔力值：4,000,000
抽中魔力值：3,560,000点
折算魔力值：185,160
变化魔力值：+2,586,514.7

上传量：9GB
未发放补签卡，1 张补签卡全部折算 (当前上限 365 张) ×5
...

【老虎机】
开转次数：2（免费 1 次）
消耗魔力值：5,000
中奖魔力值：1,875
净变化：-3,125
```

`变化魔力值` 是当天第一次打开站点时的魔力值和当前魔力值的差值（从顶部用户栏读，不是抽奖收支算出来的，所以签到、任务、老虎机的进账也都算在里面）。

奖品行按出现次数累计（同一句重复出现就合并成 `×N`）。**未发放的勋章不单独占行**：它折算的魔力已经计进 `折算魔力值`，逐条列勋章名字只会把框刷满。

口径优先用站点自己的 `summary_entries`（`{key,label,amount,unit}`），能算出数量就按 `名称：数量单位（已发放X，其余折算N魔力）` 排版；**算不出数量的（折算类奖品 `amount` 是 0，数量只写在那句话里）就把站点原话整行照搬**，重复的合并成 `×N`。

`复制` 按钮把整份记录复制走，`重置流程` 清掉当天的进度和记录（只动本地，不影响站点）。

标题栏的 `–` 把框收成一个小球，点小球再展开；标题栏和小球都能拖着走。位置和折叠状态单独存一份、跨天保留，`重置流程` 不会把它清掉。

## 安装

需先安装 [Tampermonkey](https://www.tampermonkey.net/)，然后 [点此安装脚本](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/pt-tangpt-helper/pt-tangpt-helper.user.js)。

## 配置

脚本顶部，除 `FEATURES` 外：

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `CHAIN.enabled` | `true` | 是否自动串联跳下一步 |
| `CHAIN.requirePendingCheckin` | `true` | 顶部「签到得魔力」还在（= 今天还没签到）才启动流程；已签到就整个不启动 |
| `CHAIN.maxAttempts` | `2` | 单步失败重试上限，防止卡在一步上反复刷 |
| `MAIL.unreadDeletePrefix` | `'任务'` | 未读邮件只删这个标题前缀的 |
| `LOTTERY.drawCount` | `100` | 点哪个按钮（站点只有 1 / 10 / 20 / 50 / 100） |
| `LOTTERY.maxDrawsPerDay` | `10` | 每天最多 `drawCount × 这个数` 抽。一次一百连抽是 200 万魔力，这个上限是防手滑 |
| `TASK.dailyName` / `monthlyName` | `'苍蝇腿'` / `'VIP'` | 按任务名首字匹配 |
| `SLOT.spins` | `2` | 老虎机开转次数 |

## 原理

- **邮箱**：一行一个 `input[name="messages[]"]`（`value` 是邮件 id），已读/未读看行内 `img` 的 `alt`（`Read`/`Unread`，`title` 是中文文案不可靠）。删除是 POST `messages.php` 带 `action=moveordel` + `delete` + 一批 `messages[]`。**翻页从最后一页往前**：删掉一封后面的会往前挪，正序翻会把挪过页边界的整批漏掉。
- **抽奖 / 老虎机**：都是站点自己发 `$.post`，脚本不重实现请求，只在 `jQuery.post` 上搭一层旁路读响应，靠字段（抽奖看 `results` + `draw_count`，老虎机看 `reels` + `result`）而不是 URL 来认领域。抽奖仍然点站点原本那个按钮。
- **任务**：`POST ajax.php {action:'claimTask', exam_id:<data-id>}`，绕开页面自带的 layui 确认框。
- **签到**：这个站签到就是 GET `attendance.php`，没有验证码。

闸门只管「启不启动」，不管「继不继续」：第四步签到成功后顶部那个入口就消失了，如果每次页面加载都拿它拦一次，第五、六步会被自己刚做完的签到挡死。所以当天已经动过的流程一律放行。
