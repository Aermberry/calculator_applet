# 项目长期约定（calculator_applet）

## 分层架构约定（2026-09-09 用户确认，同日演进为 DDD 版）
- 对齐公司 Flutter DDD 定制架构（参考文档《Flutter DDD 架构分析》：ui→application→domain←persistence，COLA CQE + 六边形防腐层）。依赖方向：ui(pages/components) → application → domain；persistence/infrastructure 实现 domain 接口反向依赖；types/exceptions 最底层。
- domain 零 wx.* 依赖、纯 JS 可 Node 单测；命名统一 xxx_exception / invalid_xxx_exception、domain primitive(types) 工厂校验（parse, don't validate）。
- 原「services → infrastructure」演进为「application(薄翻译编排) → domain + persistence/infrastructure(防腐层适配 wx.*)」；core 并入 domain（service/types 等）。
- Repository 接口定义在 domain，persistence 只做实现；序列化/mapper 归 persistence。
- 领域事件、facade 收口为预留约定；不用 ECS entity+component，实体用常规聚合形态。
- infrastructure 保持极薄（10-40 行/模块），出现业务判断即上移。

## 其他用户偏好
- 用户偏好先讲清概念再落地；不喜欢被连续追问（一次问清、给出推荐项）。

