# 计算器小程序架构设计方案（DDD 版）

> 目标：快速上线（3 周内首发）+ 快速获得用户（增长钩子内建于架构）。
> 定位假设：工具类计算器小程序（基础计算 + 单位换算 + 垂直场景计算器工具箱）。
> 分层风格：对齐公司 Flutter DDD 定制架构（参考《Flutter DDD 架构分析》，含阿里 COLA CQE 与六边形防腐层思想），保证跨端（Flutter App / 小程序）统一语言与一致结构。

## 一、总体技术选型

| 维度 | 选型 | 理由 |
|------|------|------|
| 框架 | **原生小程序**（WXML/WXSS/JS） | 包体积最小、启动最快，工具类不需要跨端框架 |
| UI 组件 | **TDesign 小程序组件库** | 腾讯官方出品、按需引入 |
| 后端 | **微信云开发（CloudBase）** | 免运维、免域名备案，上线最快 |
| 状态管理 | app.globalData + 页面级 data | 规模小不引入 Mobx |
| 渲染引擎 | Webview 默认，Skyline 二期 | 首发求稳 |
| 基础库 | 最新稳定 + `lazyCodeLoading: requiredComponents` | 按需注入，加快启动 |

## 二、分层架构（对齐公司 DDD 定制）

依赖方向：`ui → application → domain`；`persistence / infrastructure` 反向依赖 `domain`（实现其接口）。`domain/types`、`domain/exceptions` 为最底层，无任何依赖。

| 公司 Flutter DDD | 小程序对应 | 职责 | 关键点 |
|---|---|---|---|
| ui | `pages/` + `components/` | page / widget | 页面与组件只做绑定与交互转发；`pages/calc/calc.js` 仅 20-30 行，不装逻辑 |
| application | `application/` | 原始输入 → domain 对象；用例编排 | 薄翻译层；page 的字符串/JSON → cqe → 调 domain；不含业务规则；产出领域对象，不做展示格式化 |
| presenter（MVP 补充） | `application/presenter/` | 持有 IView，编排页面用例，产出 view state | 每页一个 Presenter 实例，生命周期跟随 View；可异步回推（toast/确认框）；零 wx 依赖，用 mock View 单测 |
| domain | `domain/` | cqe / entity / service / facade / event / repository 接口 / types / exceptions | 充血模型、无公开 setter；service 只做跨 entity 操作；**零 wx 依赖，纯 JS 可 Node 单测** |
| persistence | `persistence/` | repository 实现 + serializer | 依赖倒置：实现 `domain/repository` 的接口；序列化格式只在此层 |
| Packages 防腐层 | `infrastructure/` | wx.* 外部能力适配 | 采纳参考文档建议：Packages → infrastructure；可 mock，可替换 |
| types | `domain/types/` | domain primitive | 值对象、无 setter、工厂校验，"parse, don't validate" |
| exceptions | `domain/exceptions/` | 领域异常 | 命名统一 `xxx_exception` / `invalid_xxx_exception` |

> 采纳参考文档"待补充约定"：① Repository 接口定义在 domain；② 序列化/mapper 归属 persistence；③ Packages 更名 infrastructure；④ 领域事件订阅暂不启用（只预留命名与文件位）；⑤ 不用 ECS entity+component（小程序 JS 无此必要），实体用常规聚合形态。

## 三、项目结构

```
├── app.js / app.json / app.wxss / sitemap.json / project.config.json
├── pages/                          # ui：page（路由 + 绑定，瘦）
│   ├── calc/  toolbox/  history/  mine/
├── components/                     # ui：widgets（展示与交互，triggerEvent 上抛）
│   ├── calc-keyboard/  result-card/  tool-card/
├── application/                    # 应用层：用例编排（薄翻译）
│   ├── history-app.js              # 历史用例（Model 侧服务，产出领域对象）
│   ├── unit-app.js                 # 单位换算用例
│   ├── share-app.js                # 分享参数生成用例
│   ├── errors.js                   # 领域异常 → 用户文案
│   └── presenter/                  # MVP 的 P：每页一个 Presenter（持有 IView）
│       ├── view-contract.js        # IView 契约（render/toast/confirm/copy/navigate/switchTab）
│       ├── calc-presenter.js       # 计算器：按键 → 求值 → 落历史（失败回推 toast）
│       ├── history-presenter.js    # 历史：列表/复制/删除/清空二次确认
│       ├── unit-presenter.js       # 单位换算：交互状态与默认选中规则
│       ├── toolbox-presenter.js    # 工具箱：工具清单与跳转
│       ├── mine-presenter.js       # 关于页：版本号
│       └── result-share-presenter.js # 分享落地页：query 解析与二次分享
├── domain/                         # 领域层：零外部依赖，可单测
│   ├── cqe/                        # 命令/查询对象：key-press-input.js、save-history-cmd.js
│   ├── entity/                     # 富领域模型：calc-session.js、history-entry.js
│   ├── service/                    # 领域服务（跨 entity）：expression-evaluator.js、unit-converter.js
│   ├── facade/                     # 领域模块对外收口（模块外只可经 facade 调 domain 能力）
│   ├── event/                      # 领域事件（预留位）：history-changed-event.js
│   ├── repository/                 # 仓储接口（契约，persistence 实现）：history-repository.js
│   ├── types/                      # domain primitive：expression.js、decimal.js、rate.js
│   └── exceptions/                 # 领域异常：expression_invalid_exception.js 等
├── persistence/                    # 仓储实现 + 序列化
│   ├── history-repository-storage.js   # 实现 domain/repository，落 wx 本地 storage
│   ├── history-repository-cloud.js     # 预留：云数据库实现（二期云端同步）
│   └── serializers/                # DTO/存取格式的 mapper（只在此层）
├── infrastructure/                 # 防腐层：wx.* 外部能力适配（可 mock、可替换）
│   ├── wx-login.js  wx-subscribe.js  wx-share.js  cloud-rpc.js
│   ├── wx-navigate.js  wx-ui.js      # 导航 / toast·确认框·剪贴板
│   ├── page-view.js                  # Page → IView 适配器（页面只 createPageView(this)）
│   └── app-info.js                   # 小程序自身信息（版本号）
├── packageTool/                    # 分包：垂直计算工具页（unit-convert / loan / bmi / result-share）
└── cloudfunctions/                 # login / feedback / stats
```

**分包策略**：主包只放 4 个 tab 页 + 核心组件（目标 <500KB）；垂直工具全在 `packageTool` 分包，新工具只动分包。

## 四、层间规约（调用关系铁律）

| 层 | 语言 | 职责 | 禁止事项 |
|---|---|---|---|
| pages/components | 界面语言 | 绑定、事件转发、setData | 直接 import domain 实现 / wx.* / persistence |
| application | 用例语言 | 输入翻译 + 编排 + 异常翻译为用户提示 | 出现业务规则、碰 wx.*、出现 setData |
| presenter | 交互语言 | 持有 IView、产出 view state、编排异步回推 | 碰 wx.*/setData、在自身之外持有模块级状态 |
| domain | 业务语言 | 实体规则、值对象校验、跨实体 service | 出现 wx.* / Page / setData / storage |
| persistence | 技术语言 | 实现 repository、存取格式序列化 | 出现业务判断、被 ui 直接调用 |
| infrastructure | 技术语言 | wx.* Promise 化与错误归一化 | 出现业务判断、被 ui/domain 直接调用 |

- **依赖严格单向**：ui → presenter → application → domain；persistence/infrastructure 只依赖 domain 的接口，不反向。domain 零外部依赖 → Node/CI 纯单测。
- **MVP 三条铁律**（在 DDD 分层之上叠加的交互层约束）：
  1. **View 被动**：页面只做「持有 Presenter → 转发事件 → setData」，不得出现业务判断、`wx.*` 调用、入参解析；交互状态（选中项、展开项、输入值）一律不留在 `data` 里。
  2. **Presenter 持有 IView**：所有对界面的输出都经 `view.render/ toast/ confirm/ copy/ navigate/ switchTab`，因此异步结果（如历史落库失败）能真正回推给用户，而不是 `console.warn` 了事。
  3. **生命周期跟随 View**：`onLoad` 创建、`onUnload` 调 `dispose()`，Presenter 内部用 `disposed` 标记阻断回推；禁止模块级状态容器（原 `sessions` Map 已移除）。
- **View 可替换**：页面侧 `createPageView(this)` 把 Page 适配成 IView，单测侧 `test/mock_view` 造替身；Presenter 因此可在无小程序环境下验证「渲染几次、推了什么、有没有请求跳转」。
- **parse, don't validate**：页面来的裸字符串必须先经 `domain/types` 工厂构造（`Expression.from(raw)`），非法输入在边界抛出领域异常，不让脏数据流入实体。
- **类型卫生**：application 把原始输入翻译成 cqe / domain primitive 再往下传；JS 无静态类型，靠工厂 + 结构约定实现"卫生"。
- **facade 收口**：领域模块对内 service 规则强，对外统一经 facade；跨模块只引用对方 ID/接口，不引用内部实现。
- **异常归属**：领域异常在 `domain/exceptions`（`xxx_exception` / `invalid_xxx_exception`）；application 负责把异常翻译成用户可读文案；wx 错误码只在 infrastructure 归一化，不得外泄给 ui。
- **单测边界**：domain 纯 Node 单测；application mock 掉 persistence/infrastructure 后单测；ui 走微信开发者工具真机验证。
- **换平台策略**：重写 `infrastructure` 与 `persistence`，application/domain/ui 结构原样保留。

## 五、页面与导航设计

- tabBar 四页：计算 / 工具箱 / 历史 / 关于。
- 冷启动原则：首页即计算器，0 弹窗、0 引导——工具类留存来自"快"。
- 分享落地页：结果页均可经 `result-share` 落地，分享路径带 `?from=share&tool=xxx`。

## 六、增长钩子（架构预埋）

1. 结果卡片分享（onShareAppMessage + 分享图）——最自然的裂变路径。
2. 微信搜索 SEO：sitemap 全量 allow + 工具页标题卡高频搜索词。
3. 收藏引导："添加到我的小程序"轻提示。
4. 订阅消息：仅用户主动操作后请求授权。
5. 静默登录：wx.login 静默换 openid，不弹授权窗。

## 七、合规与审核

- 隐私协议：`requiredPrivateInfos` 逐项声明；首页零采集。
- 不申请多余权限（首发无 getUserProfile/位置/相机）。
- 类目"工具 > 效率"；用户反馈文本过 `msgSecCheck`。

## 八、性能红线

| 指标 | 目标 |
|------|------|
| 首屏渲染 | < 1s（主包小 + 按需注入） |
| 主包体积 | < 500KB |
| setData | 键盘连击合并，单次 payload < 10KB |
| domain 计算 | 纯 JS、整数化/decimal 防精度 bug（0.1+0.2） |

## 九、里程碑

| 阶段 | 时间 | 交付 |
|------|------|------|
| MVP 开发 | 第 1-2 周 | 计算器 + 单位换算 + 房贷 + 历史 + 分享卡片 |
| 内测 | 第 2 周末 | 体验版真机验证 |
| 提审发布 | 第 3 周 | 隐私协议齐全一次过审 |
| 冷启动 | 上线后 2 周 | 社群 + 搜索 + 朋友圈传播 |
| 数据迭代 | 持续 | 每周一个新工具（分包热更） |

## 十、二期演进方向

- Skyline 渲染迁移；云端历史同步（启用 `history-repository-cloud` + 领域事件）；搜索双卡位 + 流量主变现。
- 若迁自建后端：application/domain 原样复用，仅替换 persistence/infrastructure 实现。
