# 会话概览（代码骨架已落地）

## 本次完成内容
- 按 DDD 定制分层，从零落地计算器小程序**可运行代码骨架**，并配套 Node 单测 + 构建校验。
- 对齐参考文档《Flutter DDD 架构分析》：ui → application → domain ← persistence，infrastructure 作为 wx.* 防腐层。

## 产物清单
### 分层代码（零 wx 依赖的可单测核心）
- `domain/`：types(Decimal/Expression)、exceptions(8 个领域异常)、cqe、entity(CalcSession 聚合根/HistoryEntry)、service(ExpressionEvaluator/UnitConverter/HistoryRetentionService)、facade、repository(接口)、event(预留)。
- `application/`：calc/历史的/分享/单位 4 个用例 + errors(领域异常→用户文案) + `di.js`(组合根)。
- `infrastructure/`：wx_storage/wx_login/wx_share/wx_subscribe/cloud_rpc/wx_error（极薄防腐层，Promise 化 + 错误归一化）。
- `persistence/`：history_repository_storage(本地仓储实现) + serializers(存取格式唯一归属地)。

### UI 骨架（微信小程序）
- 配置：`app.js / app.json / app.wxss / sitemap.json / project.config.json`（主包 4 tab + packageTool 分包）。
- 主包页：`pages/calc`、`pages/toolbox`、`pages/history`、`pages/mine`。
- 组件：`components/calc-keyboard`、`components/tool-card`。
- 分包：`packageTool/unit-convert`(单位换算)、`packageTool/result-share`(结果分享落地页)。

### 验证
- `test/run.test.js`：20 项纯 Node 单测全绿（覆盖 Decimal 精度、调度场求值、表达式校验、CalcSession、历史留存去重/上限、单位换算、application 用例编排含内存仓储注入）。
- `test/check_build.js`：全部分层 + 页面/组件 JS 与所有 JSON 配置加载零失败（验证语法、循环依赖、配置合法性）。

## 关键决策（与参考文档一致）
- 仓储接口定义在 domain（依赖倒置），实现在 persistence。
- 序列化（DTO）只归 persistence，不泄露到 domain。
- 应用层只做用例编排 + 原始输入→领域原语翻译，不装业务规则。
- infrastructure 说技术语言（唯一允许 wx.*），极薄；出现业务判断即上移 application/domain。
- 领域事件预留 `domain/event/`，暂不启用。

## 运行方式
- 查看/运行：微信开发者工具导入 `E:\WorkSpace\WorkBuddy\calculator_applet`（appid 现为 `touristappid`，需替换真实 AppID）。
- 单测：`node test/run.test.js`；构建校验：`node test/check_build.js`。

## 后续事项
- 接入微信云开发（login/getHistory 云函数）以替换本地存储为云端同步。
- 补齐订阅消息（wx_subscribe 已就绪，需在结果页/历史页按场景请求）。
- 工具箱陆续扩展垂直工具（每加一个只在 packageTool 加分包页 + toolbox.js 加一项）。
