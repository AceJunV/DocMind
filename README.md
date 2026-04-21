# DocMind — 多角色 AI Agent 文档评审平台

用户上传文档后，创建或选择不同身份的 AI Agent 组成评审团队，获得多视角评价与优化建议；可进入聊天室与 Agent 深度辩论，通过角色碰撞发现盲区、激发优化方向。

## 技术栈

| 层级 | 技术选型 |
|------|---------|
| 前端 | React 19 + TypeScript + Vite 8 + Tailwind CSS v4 + Zustand + React Router v7 |
| 后端 | Python FastAPI + SQLAlchemy 2.0 + Alembic + Celery + Redis（规划中）|
| AI | LangChain + OpenAI SDK / Anthropic SDK（规划中）|
| 数据库 | PostgreSQL 16 + Redis 7（规划中）|

## 快速开始

```bash
# 安装前端依赖
cd frontend
npm install

# 启动开发服务器
npm run dev

# 生产构建
npm run build
```

访问 http://localhost:5173 即可使用。

## 前端页面

| 路径 | 页面 | 说明 |
|------|------|------|
| `/login` | 登录 | 用户登录 |
| `/register` | 注册 | 用户注册 |
| `/dashboard` | 工作台 | 统计面板 + 快捷入口 |
| `/documents` | 文档中心 | 文档列表、上传、搜索 |
| `/documents/:id` | 文档详情 | 内容展示 + 评审历史 |
| `/agents` | Agent 工坊 | 预设模板 + 我的 Agent |
| `/agents/create` | 创建 Agent | 对话式创建 + 实时预览 |
| `/reviews` | 评审大厅 | 评审列表 + 发起评审 |
| `/reviews/:id` | 评审报告 | 评分 + 观点 + 建议 |
| `/chat` | 聊天室列表 | 辩论会话列表 |
| `/chat/:id` | 聊天室 | 多 Agent 实时对话 |
| `/settings` | 设置 | AI 模型 API Key 配置 |

## 项目文档

- [开发规划](./docs/development-plan.md)
- [技术架构](./docs/technical-architecture.md)
- [UI 设计规范](./docs/ui-design-spec.md)
- [产品架构](./docs/product-architecture.md)
