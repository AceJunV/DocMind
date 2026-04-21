# DocMind 开发规划

**版本**: v0.2.0 | **日期**: 2026-04-21 | **负责人**: 技术团队

---

## 1. 项目概述

**项目名称**: DocMind — 多角色 AI Agent 文档评审平台

**简述**: 用户上传文档后，创建或选择不同身份的 AI Agent 组成评审团队，获得多视角评价与优化建议；可进入聊天室与 Agent 深度辩论，通过角色碰撞发现盲区、激发优化方向。

**技术栈概要**：

| 层级 | 技术选型 |
|------|---------|
| 前端 | React 18 + TypeScript + Vite 5 + Tailwind CSS + shadcn/ui + Zustand + TanStack Query |
| 后端 | Python FastAPI + SQLAlchemy 2.0 + Alembic + Celery + Redis |
| AI | LangChain + OpenAI SDK / Anthropic SDK |
| 数据库 | PostgreSQL 16 + Redis 7 |
| 文件存储 | MinIO / AWS S3 |
| 部署 | Docker + Docker Compose + Nginx + GitHub Actions |

**预计里程碑数量**: 5 个

---

## 2. 里程碑规划

---

### 里程碑 1: 基础设施（第 1-2 周）

**目标**: 项目能启动，基础设施通连，前后端可运行

**预计任务数**: 16

| # | 任务 | 类型 | 优先级 | 说明 |
|---|------|------|:------:|------|
| 1 | 项目目录结构搭建 | DevOps | P0 | 前后端分离目录骨架 |
| 2 | Docker Compose 环境配置 | DevOps | P0 | postgres + redis + minio + nginx |
| 3 | 后端框架初始化 | Backend | P0 | FastAPI 项目 + 依赖安装 |
| 4 | 数据库连接配置 | Backend | P0 | SQLAlchemy async engine + session |
| 5 | Alembic 迁移初始化 | Backend | P0 | 迁移目录 + 基础配置 |
| 6 | 数据库模型定义 | Backend | P0 | 8 张表：User, Document, Agent, AgentTemplate, Review, ReviewAgent, ChatRoom, ChatMessage |
| 7 | 初始迁移脚本 | Backend | P0 | `alembic upgrade head` 可执行 |
| 8 | 后端健康检查接口 | Backend | P0 | `GET /api/v1/health` 返回 200 |
| 9 | 前端框架初始化 | Frontend | P0 | Vite + React + TypeScript 项目 |
| 10 | Tailwind + shadcn/ui 配置 | Frontend | P0 | 设计令牌初始化 |
| 11 | React Router 路由配置 | Frontend | P0 | 5 大页面路由 + 懒加载 |
| 12 | Zustand 状态管理初始化 | Frontend | P0 | authStore + agentStore + chatStore |
| 13 | TanStack Query 配置 | Frontend | P0 | API client + 基础 hooks |
| 14 | Axios / fetch 封装 | Frontend | P0 | 统一请求拦截 + 错误处理 |
| 15 | Nginx 配置 | DevOps | P0 | 静态资源服务 + API 反向代理 |
| 16 | CI/CD 基础流程 | DevOps | P1 | GitHub Actions lint + test |

**验收标准**:
- [ ] [Smoke] `docker compose up` 所有容器 healthy
- [ ] [Smoke] `GET /api/v1/health` 返回 200
- [ ] [Smoke] 前端 `npm run dev` 可启动，页面可访问
- [ ] [Smoke] 数据库连接正常，`alembic upgrade head` 执行成功
- [ ] [E2E] 前后端联调：前端请求 `/api/v1/health` 成功

---

### 里程碑 2: 用户系统（第 3 周）

**目标**: 用户可注册、登录、登出，进入工作台

**预计任务数**: 14

| # | 任务 | 类型 | 优先级 | 说明 |
|---|------|------|:------:|------|
| 1 | 用户注册 API | Backend | P0 | `POST /api/v1/auth/register` + bcrypt 密码哈希 |
| 2 | 用户登录 API | Backend | P0 | `POST /api/v1/auth/login` + JWT 签发（7 天有效期） |
| 3 | 获取当前用户 API | Backend | P0 | `GET /api/v1/auth/me` |
| 4 | JWT 认证中间件 | Backend | P0 | 验证 Token + 注入 current_user |
| 5 | 刷新 Token API | Backend | P1 | `POST /api/v1/auth/refresh` |
| 6 | 注册页面 | Frontend | P0 | 表单 + 校验 + 错误提示 |
| 7 | 登录页面 | Frontend | P0 | 表单 + 记住登录态 |
| 8 | 认证状态管理 | Frontend | P0 | authStore + Token 持久化（localStorage） |
| 9 | 路由守卫 | Frontend | P0 | 未登录重定向到登录页 |
| 10 | Header 组件 | Frontend | P0 | Logo + 导航 + 用户头像下拉 |
| 11 | Sidebar 组件 | Frontend | P0 | 5 个导航项 + 徽章 + 状态高亮 |
| 12 | 工作台页面骨架 | Frontend | P0 | 统计面板 + 快捷入口 |
| 13 | 退出登录功能 | Frontend | P0 | 清除 Token + 跳转登录页 |
| 14 | 用户系统 E2E 测试 | QA | P0 | 注册 → 登录 → 进入工作台 → 退出 |

**验收标准**:
- [ ] [Smoke] `POST /api/v1/auth/register` 创建用户成功
- [ ] [Smoke] `POST /api/v1/auth/login` 返回 JWT Token
- [ ] [Smoke] 未登录状态访问 `/documents` 重定向到 `/login`
- [ ] [Smoke] 登录后侧栏显示用户名和头像
- [ ] [E2E] 注册新账号 → 登录 → 进入工作台 → 退出登录

---

### 里程碑 3: 文档中心（第 4-5 周）

**目标**: 用户可上传、解析、管理文档

**预计任务数**: 16

| # | 任务 | 类型 | 优先级 | 说明 |
|---|------|------|:------:|------|
| 1 | 文档上传 API | Backend | P0 | `POST /api/v1/documents/upload`（multipart）|
| 2 | MinIO/S3 文件存储集成 | Backend | P0 | 文件上传到对象存储，返回 URL |
| 3 | 文档解析任务（Celery） | Backend | P0 | 异步任务：PDF/Word/MD/TXT 解析 |
| 4 | PDF 解析实现 | Backend | P0 | PyPDF2 提取文本和结构 |
| 5 | Word 解析实现 | Backend | P0 | python-docx 提取内容和格式 |
| 6 | Markdown 解析实现 | Backend | P0 | mistune 提取结构 |
| 7 | 关键词和摘要提取 | Backend | P0 | 基于 LLM 或 TextRank 算法 |
| 8 | 文档列表 API | Backend | P0 | `GET /api/v1/documents` 分页 + 搜索 |
| 9 | 文档详情 API | Backend | P0 | `GET /api/v1/documents/:id` |
| 10 | 文档删除 API | Backend | P0 | `DELETE /api/v1/documents/:id` |
| 11 | 上传区域组件 | Frontend | P0 | 拖拽上传 + 进度条 + 格式校验 |
| 12 | 文档卡片组件 | Frontend | P0 | 类型图标 + 状态标签 + 评审次数 |
| 13 | 文档列表页面 | Frontend | P0 | 网格布局 + 搜索 + Tab 筛选 |
| 14 | 文档详情页面 | Frontend | P0 | 内容展示 + 章节导航 + 评审历史 |
| 15 | 文档状态轮询 | Frontend | P1 | 解析中状态实时更新 |
| 16 | 文档中心 E2E 测试 | QA | P0 | 上传文档 → 等待解析 → 查看详情 |

**验收标准**:
- [ ] [Smoke] `POST /api/v1/documents/upload` 上传文件成功
- [ ] [Smoke] PDF/Word/MD 三种格式解析后内容正确
- [ ] [Smoke] `GET /api/v1/documents` 返回用户自己的文档列表
- [ ] [Smoke] 文档详情页展示解析后的结构化内容
- [ ] [E2E] 上传 PDF 文档 → 等待解析完成 → 查看文档内容和评审历史

---

### 里程碑 4: Agent 工坊 + 预设模板（第 6-7 周）

**目标**: 用户可使用预设 Agent，可创建和管理自定义 Agent

**预计任务数**: 20

| # | 任务 | 类型 | 优先级 | 说明 |
|---|------|------|:------:|------|
| 1 | 预设 Agent 模板数据初始化 | Backend | P0 | 8 个预设模板数据入库 |
| 2 | 预设模板列表 API | Backend | P0 | `GET /api/v1/agents/templates` |
| 3 | 从模板创建 Agent API | Backend | P0 | `POST /api/v1/agents/from-template/:id` |
| 4 | Agent CRUD API | Backend | P0 | 增删改查 + 权限校验（只能操作自己的） |
| 5 | 我的 Agent 列表 API | Backend | P0 | `GET /api/v1/agents` |
| 6 | Agent 详情 API | Backend | P0 | `GET /api/v1/agents/:id` |
| 7 | 对话式创建 Agent 接口 | Backend | P0 | `POST /api/v1/agents/create-via-chat` + AI 推断参数 |
| 8 | 同事 Agent 推荐接口 | Backend | P1 | `GET /api/v1/agents/suggest-colleagues` |
| 9 | Agent 角色色分配逻辑 | Backend | P1 | 从色池中分配，8 种角色色 |
| 10 | 预设模板展示页面 | Frontend | P0 | 卡片网格 + 角色色边框 |
| 11 | 模板详情预览 | Frontend | P0 | 角色介绍 + 性格参数 + 使用按钮 |
| 12 | 我的 Agent 列表页面 | Frontend | P0 | Tab 切换（我的/模板/社区）|
| 13 | Agent 卡片组件 | Frontend | P0 | 角色色左边框 + 头像 + 标签 + 使用次数 |
| 14 | 对话式创建 Agent 面板 | Frontend | P0 | 对话式交互 + 实时预览卡片 |
| 15 | Agent 编辑页面 | Frontend | P1 | 参数调整 + 预览更新 |
| 16 | 模板库页面 | Frontend | P0 | 按类别筛选 + 搜索 |
| 17 | Agent 预览卡片组件 | Frontend | P0 | 实时预览 + 交互反馈 |
| 18 | Agent 状态管理 | Frontend | P0 | agentStore 增删改查 |
| 19 | 同事推荐展示组件 | Frontend | P1 | 创建完成后推荐 + 快速添加 |
| 20 | Agent 工坊 E2E 测试 | QA | P0 | 使用模板 → 创建自定义 Agent → 查看列表 |

**验收标准**:
- [ ] [Smoke] `GET /api/v1/agents/templates` 返回 8 个预设模板
- [ ] [Smoke] 从模板创建 Agent 成功，出现在我的列表
- [ ] [Smoke] 对话式创建流程完整，可保存自定义 Agent
- [ ] [Smoke] Agent 卡片正确显示角色色和参数
- [ ] [E2E] 浏览模板库 → 从模板创建 Agent → 编辑 Agent 名称 → 保存成功

---

### 里程碑 5: 评审大厅（第 8-10 周）

**目标**: 用户可发起多角色并行评审，查看评审报告

**预计任务数**: 24

| # | 任务 | 类型 | 优先级 | 说明 |
|---|------|------|:------:|------|
| 1 | 发起评审 API | Backend | P0 | `POST /api/v1/reviews` + 创建 Review 记录 |
| 2 | 评审 Agent 选择器逻辑 | Backend | P0 | 验证 Agent 数量（1-5）+ 权限 |
| 3 | 评审引擎 — Prompt 构建 | Backend | P0 | ReviewEngine：根据 Agent 配置组装 system prompt |
| 4 | 评审引擎 — 并行调用 LLM | Backend | P0 | 对每个 Agent 并行调用 LLM 流式输出 |
| 5 | 评审引擎 — 结果解析 | Backend | P0 | 解析 LLM 输出为 AgentReview 结构 |
| 6 | 评审报告汇总生成 | Backend | P0 | 提取共识点、争议点、排序建议 |
| 7 | 评审结果 SSE 流 | Backend | P0 | `GET /api/v1/reviews/:id/stream` 逐 Agent 输出 |
| 8 | 评审详情 API | Backend | P0 | `GET /api/v1/reviews/:id` 完整报告 |
| 9 | 文档评审历史 API | Backend | P0 | `GET /api/v1/documents/:id/reviews` |
| 10 | 建议采纳状态更新 API | Backend | P1 | `PATCH /api/v1/reviews/:id/suggestions/:sid` |
| 11 | Agent 系统 Prompt 模板 | Backend | P0 | 评审 prompt 模板文件（8 个角色的变体）|
| 12 | 报告汇总 Prompt 模板 | Backend | P0 | 共识/争议/建议提取模板 |
| 13 | 评审配置页面 | Frontend | P0 | 文档预览 + Agent 多选面板 + 系统推荐 |
| 14 | Agent 选择面板组件 | Frontend | P0 | 多选 + 已选计数 + 推荐组合 |
| 15 | 评审进行中状态 | Frontend | P0 | 各 Agent 头像 "思考中..." + 进度条 |
| 16 | 流式输出渲染 | Frontend | P0 | 逐字展示 Agent 评价 |
| 17 | 评审报告展示页面 | Frontend | P0 | 评分 + Agent 观点 + 共识/争议 + 建议 |
| 18 | 综合评分卡片 | Frontend | P0 | 大数字评分 + 星级 + 维度条 |
| 19 | Agent 观点卡片 | Frontend | P0 | 头像 + 角色名 + 评分 + 观点摘要 |
| 20 | 共识/争议展示组件 | Frontend | P0 | 绿底共识 + 黄底争议 + 辩论入口 |
| 21 | 优化建议列表 | Frontend | P0 | 优先级标签 + 采纳按钮 |
| 22 | 评审大厅列表页面 | Frontend | P0 | 全部/进行中/已完成 Tab |
| 23 | 评审报告对比视图 | Frontend | P1 | 同一段落不同角色批注对比 |
| 24 | 评审流程 E2E 测试 | QA | P0 | 选择文档 → 选 3 个 Agent → 发起评审 → 查看报告 |

**验收标准**:
- [ ] [Smoke] `POST /api/v1/reviews` 发起评审成功，返回 reviewId
- [ ] [Smoke] `GET /api/v1/reviews/:id/stream` SSE 流式输出各 Agent 评价
- [ ] [Smoke] 评审报告包含综合评分、共识点、争议点、TOP 建议
- [ ] [Smoke] 建议可标记采纳状态
- [ ] [E2E] 选择文档 → 勾选 3 个 Agent → 点击开始评审 → 观看流式输出 → 查看完整报告

---

### 里程碑 6: 聊天室（第 11-13 周）

**目标**: 用户可进入聊天室与 Agent 辩论，生成辩论总结

**预计任务数**: 22

| # | 任务 | 类型 | 优先级 | 说明 |
|---|------|------|:------:|------|
| 1 | 创建聊天室 API | Backend | P0 | `POST /api/v1/chatrooms` + 加载评审上下文 |
| 2 | 聊天室详情 API | Backend | P0 | `GET /api/v1/chatrooms/:id` |
| 3 | 发送消息 API | Backend | P0 | `POST /api/v1/chatrooms/:id/messages` + SSE 回复 |
| 4 | 历史消息 API | Backend | P0 | `GET /api/v1/chatrooms/:id/messages` 分页 |
| 5 | 邀请 Agent 加入 API | Backend | P0 | `POST /api/v1/chatrooms/:id/invite` |
| 6 | 生成辩论总结 API | Backend | P0 | `POST /api/v1/chatrooms/:id/summary` |
| 7 | 关闭聊天室 API | Backend | P0 | `PATCH /api/v1/chatrooms/:id/close` |
| 8 | 聊天引擎 — 上下文加载 | Backend | P0 | 评审报告 + 争议点 + 最近 20 条消息 |
| 9 | 聊天引擎 — Agent 回复生成 | Backend | P0 | 根据角色 + 上下文生成回复，流式输出 |
| 10 | 聊天引擎 — Agent 间互动 | Backend | P0 | 检测观点矛盾，自动触发 Agent 间回应 |
| 11 | 聊天引擎 — 文档引用解析 | Backend | P0 | 解析消息中的文档引用，传递给 LLM |
| 12 | 聊天记录存储 | Backend | P0 | ChatMessage 入库 |
| 13 | 聊天室布局 | Frontend | P0 | 左：文档预览 + Agent 列表；右：消息区 |
| 14 | 消息气泡组件 | Frontend | P0 | 用户消息（右侧灰）/ Agent 消息（左侧角色色）|
| 15 | Agent 间互动消息 | Frontend | P0 | 缩进显示 + "A → B" 箭头 |
| 16 | 聊天输入框 | Frontend | P0 | @提及 + 发送按钮 + 加载中 |
| 17 | 文档预览面板 | Frontend | P0 | 文档缩略 + 章节跳转 + 引用高亮 |
| 18 | 参与者列表 | Frontend | P0 | 在线 Agent 头像 + 离线状态 |
| 19 | 辩论总结展示 | Frontend | P0 | 关键观点 + 共识 + 分歧 + 最终建议 |
| 20 | 邀请 Agent 弹窗 | Frontend | P1 | 从 Agent 库选择 + 一键生成同事 |
| 21 | 聊天室列表页面 | Frontend | P0 | 全部/活跃/已结束 Tab |
| 22 | 辩论流程 E2E 测试 | QA | P0 | 评审报告 → 点击辩论 → 发言 → 查看 Agent 回应 → 生成总结 |

**验收标准**:
- [ ] [Smoke] `POST /api/v1/chatrooms` 创建聊天室成功
- [ ] [Smoke] `POST .../messages` 发送消息后 Agent 角色化回复
- [ ] [Smoke] Agent 间观点冲突时自动产生互动消息
- [ ] [Smoke] `POST .../summary` 生成包含共识/分歧/建议的结构化总结
- [ ] [E2E] 评审报告 → 点击"进入辩论" → 发送消息 → Agent 回复 → Agent 间互动 → 生成总结

---

### 里程碑 7: 优化与发布（第 14-16 周）

**目标**: 产品打磨优化，准备 v1.0 发布

**预计任务数**: 18

| # | 任务 | 类型 | 优先级 | 说明 |
|---|------|------|:------:|------|
| 1 | 评审报告导出 PDF | Backend | P1 | 报告模板渲染 + PDF 生成 |
| 2 | 评审报告导出 Markdown | Backend | P1 | 报告内容格式化为 MD |
| 3 | Agent 社区共享功能 | Backend | P2 | `is_public` + 社区列表 |
| 4 | 性能优化 — LLM 调用 | Backend | P1 | Token 限制 + 分级调用 + 缓存 |
| 5 | 性能优化 — 数据库 | Backend | P1 | 索引优化 + 连接池调优 |
| 6 | 性能优化 — 前端 | Frontend | P1 | 路由懒加载 + 虚拟列表 + TanStack Query 缓存 |
| 7 | 错误处理规范化 | Backend | P1 | 统一错误码 + 错误日志 |
| 8 | 新手引导流程 | Frontend | P1 | 首次使用引导创建 Agent + 体验评审 |
| 9 | 空状态设计完善 | Frontend | P1 | 无文档/无 Agent/无评审的引导页 |
| 10 | 响应式适配 | Frontend | P1 | 768px+ 平板适配 |
| 11 | 一键重新评审 | Frontend | P1 | 文档修改后快速重评 |
| 12 | 建议采纳追踪面板 | Frontend | P1 | 采纳率统计 + 采纳历史 |
| 13 | API 限流实现 | Backend | P1 | 60 次/分钟/IP 限制 |
| 14 | 内容安全过滤 | Backend | P0 | Agent 输出安全过滤 |
| 15 | 集成测试 | QA | P0 | 各模块 API + 前端联调 |
| 16 | E2E 端到端测试 | QA | P0 | Playwright 覆盖核心流程 |
| 17 | 文档完善 | Documentation | P0 | README + API 文档 + 部署文档 |
| 18 | v1.0 发布准备 | DevOps | P0 | 生产环境部署 + 监控配置 |

**验收标准**:
- [ ] [Smoke] 评审报告可导出为 PDF 和 Markdown
- [ ] [Smoke] 核心 API 响应时间 < 200ms（非 AI 调用）
- [ ] [Smoke] 新用户首次使用有引导流程
- [ ] [Smoke] 移动端 768px+ 页面布局正常
- [ ] [E2E] 从注册到完成评审辩论的完整流程测试通过

---

## 3. 任务依赖关系

```
里程碑 1（基础设施）
     │
     ▼
里程碑 2（用户系统）
     │
     ▼
里程碑 3（文档中心）
     │
     ▼
里程碑 4（Agent 工坊）──────┐
     │                      │
     ▼                      │
里程碑 5（评审大厅）────────┤
     │                      │
     ▼                      │
里程碑 6（聊天室）───────────┤
     │                      │
     ▼                      │
里程碑 7（优化发布）◄───────┘
```

**关键依赖链**：
- 数据库模型（里程碑 1）→ 文档 API（里程碑 3）
- 数据库模型（里程碑 1）→ Agent API（里程碑 4）
- 数据库模型（里程碑 1）→ 评审 API（里程碑 5）
- 数据库模型（里程碑 1）→ 聊天 API（里程碑 6）
- 用户认证（里程碑 2）→ 所有需要登录的功能

---

## 4. 风险和注意事项

### 技术风险

| 风险 | 影响 | 概率 | 应对策略 |
|------|:----:|:----:|---------|
| LLM 输出格式不稳定 | 评审解析失败 | 中 | 精心设计 Prompt 模板，输出前做格式校验，异常时降级处理 |
| 流式输出延迟高 | 用户等待时间长 | 中 | 并行调用 + 首字响应优先 + 进度提示 |
| AI 调用成本超预算 | 运营成本不可控 | 中 | 设置单次 Token 上限，分级调用策略，监控日调用量 |
| 文档解析失败 | 特定格式无法评审 | 中 | 支持主流 4 种格式全覆盖，预留扩展接口 |

### 产品风险

| 风险 | 影响 | 概率 | 应对策略 |
|------|:----:|:----:|---------|
| 新用户不知如何创建 Agent | 流失 | 高 | 优质预设模板 + 新手引导强制体验 + 系统推荐 |
| 评审建议不够具体可执行 | 用户觉得无价值 | 中 | Prompt 约束必须引用原文 + 建议必须含"改哪里+怎么改" |
| 聊天室辩论枯燥 | Agent 各说各话 | 中 | 设计 Agent 间互动触发机制，强制回应对立观点 |

### 第三方依赖风险

| 依赖 | 风险 | 应对策略 |
|------|------|---------|
| OpenAI / Anthropic API | 服务不可用/价格波动 | 预留接口可切换 LLM 提供商 |
| Vercel/阿里云等部署平台 | 价格调整/服务变更 | 架构支持多平台部署 |
| 第三方登录（微信/Google） | 审核不过/不可用 | MVP 先做邮箱登录，第三方延后 |

---

## 5. 工时估算

| 里程碑 | 任务数 | 预估周期 | 复杂度 | 备注 |
|--------|:------:|:--------:|:------:|------|
| M1 基础设施 | 16 | 第 1-2 周 | 低 | 框架搭建，无业务逻辑 |
| M2 用户系统 | 14 | 第 3 周 | 中 | 认证标准流程 |
| M3 文档中心 | 16 | 第 4-5 周 | 中 | 文件处理是难点 |
| M4 Agent 工坊 | 20 | 第 6-7 周 | 中 | AI 对话创建较复杂 |
| M5 评审大厅 | 24 | 第 8-10 周 | 高 | 核心功能，AI 引擎集成 |
| M6 聊天室 | 22 | 第 11-13 周 | 高 | 多 Agent 实时交互 |
| M7 优化发布 | 18 | 第 14-16 周 | 中 | 打磨 + 测试 + 文档 |
| **合计** | **130** | **16 周** | — | |

> **注**：以上为单人或双人小团队估算，三人并行可缩短至 10-12 周。

---

## 6. 关键决策点（待确认）

| 编号 | 问题 | 影响 | 状态 |
|:----:|------|------|:----:|
| 1 | LLM 提供商选 OpenAI 还是 Anthropic？ | 成本和效果权衡 | 待确认 |
| 2 | 是否需要支持团队协作（多人评审同一文档）？ | v1.0 之后考虑 | 待讨论 |
| 3 | 免费用户是否限制评审次数？ | 影响留存策略 | 待确定 |
| 4 | 文档解析是否需要支持更多格式（PPT、Excel）？ | MVP 暂不支持 | 待讨论 |
| 5 | Agent 头像使用 AI 生成还是预设图库？ | 影响实现方式 | 待确定 |

---

## 版本发布记录

### v0.2.0（2026-04-21）— 综合优化与交互重构

**核心变更**：

| # | 变更内容 | 类型 |
|---|---------|------|
| 1 | 文档详情页简化：移除段落预览和内容预览，仅保留操作、文档信息、评审历史 | 优化 |
| 2 | 预设模板按钮文案"使用此角色"改为"添加此角色" | 修复 |
| 3 | 预设模板支持隐藏/删除，可在回收站恢复 | 新功能 |
| 4 | Agent 工坊新增回收站 Tab（已删除 Agent + 已隐藏模板，支持恢复/永久删除） | 新功能 |
| 5 | 预设模板改为横向滑动浏览，点击弹出详情二级弹窗 | 优化 |
| 6 | Agent 创建流程改为引导式对话（行业→性格→关注点→生成），新增"随机生成"按钮 | 重构 |
| 7 | 聊天室列表和详情页新增关闭/删除功能，chatStore 新增 removeRoom | 新功能 |
| 8 | 修复文档中心三点菜单点击空白区域不收起的 bug（click-outside 监听） | 修复 |
| 9 | 隐藏登录/注册模块，ProtectedRoute 自动创建匿名体验用户 | 重构 |
| 10 | Header "退出登录"改为"清除数据"，移除 auth 路由 | 优化 |
| 11 | Dashboard 空状态统计卡新增 CTA 引导按钮 | 优化 |
| 12 | 聊天室列表显示最后活跃时间（最后消息时间） | 优化 |
| 13 | 评审创建页当只有一个文档时自动选中 | 优化 |
| 14 | 文档上传成功后自动跳转到文档详情页 | 优化 |
| 15 | 聊天室输入框支持 @提及自动补全 | 新功能 |

**涉及的关键文件变更**：

| 文件 | 改动类型 |
|------|---------|
| `frontend/src/pages/documents/DocumentDetailPage.tsx` | 大幅简化 |
| `frontend/src/pages/documents/DocumentListPage.tsx` | 修复 bug + 上传跳转 |
| `frontend/src/pages/agents/AgentListPage.tsx` | 模板横滑 + 回收站 Tab + 文案 |
| `frontend/src/pages/agents/AgentCreatePage.tsx` | 引导式创建 + 随机生成 |
| `frontend/src/stores/agentStore.ts` | 回收站 + 隐藏模板 |
| `frontend/src/stores/chatStore.ts` | 新增 removeRoom |
| `frontend/src/pages/chat/ChatListPage.tsx` | 添加关闭/删除操作 |
| `frontend/src/pages/chat/ChatRoomPage.tsx` | 删除按钮 + @提及补全 |
| `frontend/src/components/auth/ProtectedRoute.tsx` | 自动匿名登录 |
| `frontend/src/App.tsx` | 移除 auth 路由 |
| `frontend/src/components/layout/Header.tsx` | 退出→清除数据 |
| `frontend/src/pages/DashboardPage.tsx` | 空状态 CTA |
| `frontend/src/pages/reviews/ReviewCreatePage.tsx` | 单文档自动选中 |
| `frontend/package.json` | version → 0.2.0 |

---

> 📎 相关文档：
> - [技术架构](./technical-architecture.md)
> - [产品架构](./product-architecture.md)
> - [PRD-DocMind-01-概述与功能列表](./PRD-DocMind-01-概述与功能列表.md)
> - [PRD-DocMind-04-非功能需求与里程碑](./PRD-DocMind-04-非功能需求与里程碑.md)
