# DocMind 技术架构

**版本**: v0.2.0 | **日期**: 2026-04-21

---

## 1. 技术选型

### 1.1 前端

| 技术 | 选型 | 理由 |
|------|------|------|
| **框架** | React 19 + TypeScript 6 | 生态成熟、组件库丰富、团队熟悉度高；TS 保证大型项目的类型安全 |
| **构建工具** | Vite 8 | 开发体验极快（HMR < 100ms），构建产物优化好，社区活跃 |
| **UI 方案** | Tailwind CSS v4 + 自建组件（shadcn/ui 风格，使用 class-variance-authority） | 原子化样式灵活高效；自建组件完全可控 |
| **状态管理** | Zustand（含 persist 中间件） | API 简洁、TS 友好、无 boilerplate；persist 实现本地数据持久化 |
| **路由** | React Router v7 | 声明式路由，支持嵌套布局和懒加载 |
| **文档解析** | pdfjs-dist（PDF）+ mammoth（DOCX）+ FileReader（TXT/MD） | 客户端解析，无需后端 |
| **LLM 集成** | 浏览器 fetch 直连 OpenAI 兼容 API + 流式响应 | 用户自配 API Key，无后端依赖 |

### 1.2 后端

| 技术 | 选型 | 理由 |
|------|------|------|
| **框架** | Python FastAPI | 异步原生（async/await），自动生成 OpenAPI 文档，与 LLM 生态无缝衔接（LangChain/OpenAI SDK） |
| **数据库 ORM** | SQLAlchemy 2.0 + Alembic | 成熟的 Python ORM，支持异步，Alembic 管理 migration |
| **认证方案** | JWT（PyJWT） | 无状态认证，前后端分离友好，Token 有效期 7 天 |
| **文件处理** | python-docx（Word）、PyPDF2（PDF）、mistune（Markdown） | 各格式对应专用解析库 |
| **AI 集成** | LangChain + OpenAI SDK / Anthropic SDK | LangChain 管理 prompt 模板和 chain 编排；SDK 直接调用保证稳定性 |
| **异步任务** | Celery + Redis | 文档解析、批量评审等耗时任务异步执行 |
| **API 规范** | RESTful + SSE（流式接口） | 普通 CRUD 用 REST；评审/聊天的流式输出用 SSE |

### 1.3 数据库

| 技术 | 选型 | 理由 |
|------|------|------|
| **主数据库** | PostgreSQL 16 | 功能强大的关系型数据库，支持 JSONB（存储 Agent 配置等半结构化数据），全文搜索（文档关键词检索） |
| **缓存** | Redis 7 | 缓存热门 Agent 配置、评审会话状态、SSE 连接管理、Celery Broker |
| **对象存储** | MinIO（自建）或 AWS S3 | 存储用户上传的原始文档文件和 Agent 头像 |

### 1.4 基础设施

| 技术 | 选型 | 理由 |
|------|------|------|
| **容器化** | Docker + Docker Compose | 开发环境一键启动，生产环境标准化部署 |
| **反向代理** | Nginx | 静态资源服务、SSL 终结、SSE 长连接代理、负载均衡 |
| **CI/CD** | GitHub Actions | 代码推送自动触发 lint/test/build，PR 合并自动部署 |

---

## 2. 系统架构

### 2.1 整体架构（前后端分离）

```
┌─────────────────────────────────────────────────────────┐
│                       客户端层                           │
│                    React SPA (Vite)                      │
│  ┌──────────┬──────────┬──────────┬──────────┬────────┐ │
│  │ 文档中心  │ Agent工坊 │ 评审大厅  │  聊天室   │ 用户系统│ │
│  └─────┬────┴─────┬────┴─────┬────┴─────┬────┴───┬────┘ │
└────────┼──────────┼──────────┼──────────┼────────┼──────┘
         │          │          │          │        │
         ▼          ▼          ▼          ▼        ▼
┌─────────────────────────────────────────────────────────┐
│                    Nginx 反向代理                         │
│              (SSL / 静态资源 / SSE代理)                   │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  FastAPI 后端服务                         │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │  API 路由层  │  │  业务逻辑层   │  │   AI 引擎层     │ │
│  │             │  │              │  │                │ │
│  │ /auth/*     │  │ AuthService  │  │ AgentEngine    │ │
│  │ /documents  │  │ DocService   │  │ ReviewEngine   │ │
│  │ /agents     │  │ AgentService │  │ ChatEngine     │ │
│  │ /reviews    │  │ ReviewService│  │ DocParser      │ │
│  │ /chatrooms  │  │ ChatService  │  │ PromptBuilder  │ │
│  └──────┬──────┘  └──────┬───────┘  └───────┬────────┘ │
│         │                │                   │          │
│  ┌──────┴────────────────┴───────────────────┴───────┐  │
│  │                 数据访问层 (SQLAlchemy)              │  │
│  └──────────────────────┬────────────────────────────┘  │
└─────────────────────────┼───────────────────────────────┘
                          │
         ┌────────────────┼────────────────┐
         ▼                ▼                ▼
   ┌──────────┐    ┌──────────┐    ┌──────────┐
   │PostgreSQL│    │  Redis   │    │ MinIO/S3 │
   │  主数据库  │    │ 缓存/队列 │    │ 文件存储  │
   └──────────┘    └──────────┘    └──────────┘
                          │
                    ┌─────┴─────┐
                    │  Celery   │
                    │ Worker    │
                    │(异步任务)  │
                    └───────────┘
```

### 2.2 各层职责

| 层级 | 职责 | 关键约束 |
|------|------|---------|
| **API 路由层** | 接收请求、参数校验、认证鉴权、调用业务层、格式化响应 | 不包含业务逻辑，只做转发和校验 |
| **业务逻辑层** | 实现核心业务规则、编排多个数据操作、事务管理 | 不直接操作数据库，通过数据访问层 |
| **AI 引擎层** | LLM 调用编排、Prompt 构建、流式响应处理 | 无状态，所有上下文从业务层传入 |
| **数据访问层** | ORM 模型定义、CRUD 操作、数据库查询 | 不包含业务逻辑，只提供数据操作方法 |

---

## 3. 目录结构

```
DocMind/
├── frontend/                    # 前端项目
│   ├── public/
│   ├── src/
│   │   ├── api/                 # API 请求封装
│   │   │   ├── client.ts        # Axios/_fetch 实例
│   │   │   ├── documents.ts     # 文档相关 API
│   │   │   ├── agents.ts        # Agent 相关 API
│   │   │   ├── reviews.ts       # 评审相关 API
│   │   │   └── chatrooms.ts     # 聊天室相关 API
│   │   ├── components/          # 通用组件
│   │   │   ├── ui/              # shadcn/ui 基础组件
│   │   │   ├── layout/          # 布局组件（Header/Sidebar/MainLayout）
│   │   │   ├── document/        # 文档相关组件（DocCard/DocViewer/UploadZone）
│   │   │   ├── agent/           # Agent 相关组件（AgentCard/AgentCreator/TemplateGrid）
│   │   │   ├── review/          # 评审相关组件（ScoreBar/ReviewReport/AnnotationPanel）
│   │   │   └── chat/            # 聊天相关组件（MessageBubble/ChatInput/AgentAvatar）
│   │   ├── hooks/               # 自定义 Hooks
│   │   │   ├── useSSE.ts        # SSE 流式数据 Hook
│   │   │   ├── useAuth.ts       # 认证状态 Hook
│   │   │   └── useAgents.ts     # Agent 数据 Hook
│   │   ├── pages/               # 页面组件
│   │   │   ├── auth/            # 登录/注册页
│   │   │   ├── documents/       # 文档中心页
│   │   │   ├── agents/          # Agent 工坊页
│   │   │   ├── reviews/         # 评审大厅页
│   │   │   └── chat/            # 聊天室页
│   │   ├── stores/              # Zustand 状态管理（含 persist 持久化）
│   │   │   ├── authStore.ts     # 认证状态（自动匿名登录）
│   │   │   ├── agentStore.ts    # Agent + 模板 + 回收站 + 隐藏模板
│   │   │   ├── chatStore.ts     # 聊天室 + 消息（含 removeRoom）
│   │   │   ├── documentStore.ts # 文档管理
│   │   │   ├── reviewStore.ts   # 评审记录
│   │   │   ├── settingsStore.ts # LLM API 配置
│   │   │   ├── activityStore.ts # 用户动态
│   │   │   └── themeStore.ts    # 主题（亮色/暗色/跟随系统）
│   │   ├── types/               # TypeScript 类型定义
│   │   ├── utils/               # 工具函数
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── tailwind.config.ts
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── backend/                     # 后端项目
│   ├── app/
│   │   ├── api/                 # API 路由
│   │   │   ├── v1/
│   │   │   │   ├── auth.py      # 认证相关路由
│   │   │   │   ├── documents.py # 文档 CRUD 路由
│   │   │   │   ├── agents.py    # Agent CRUD 路由
│   │   │   │   ├── reviews.py   # 评审路由（含 SSE）
│   │   │   │   └── chatrooms.py # 聊天室路由（含 SSE）
│   │   │   └── deps.py          # 依赖注入（get_db, get_current_user）
│   │   ├── models/              # SQLAlchemy 数据模型
│   │   │   ├── user.py
│   │   │   ├── document.py
│   │   │   ├── agent.py
│   │   │   ├── review.py
│   │   │   └── chatroom.py
│   │   ├── schemas/             # Pydantic 请求/响应模型
│   │   │   ├── document.py
│   │   │   ├── agent.py
│   │   │   ├── review.py
│   │   │   └── chatroom.py
│   │   ├── services/            # 业务逻辑层
│   │   │   ├── auth_service.py
│   │   │   ├── document_service.py
│   │   │   ├── agent_service.py
│   │   │   ├── review_service.py
│   │   │   └── chat_service.py
│   │   ├── ai/                  # AI 引擎层
│   │   │   ├── agent_engine.py    # Agent 角色引擎（prompt 构建）
│   │   │   ├── review_engine.py   # 评审引擎（调度多 Agent 评审）
│   │   │   ├── chat_engine.py     # 对话引擎（聊天室回复生成）
│   │   │   ├── doc_parser.py      # 文档解析（PDF/Word/MD/TXT）
│   │   │   └── prompts/           # Prompt 模板
│   │   │       ├── review_system.md      # 评审 system prompt 模板
│   │   │       ├── chat_system.md        # 聊天 system prompt 模板
│   │   │       ├── agent_creator.md      # Agent 创建引导 prompt
│   │   │       └── report_summary.md     # 报告汇总 prompt
│   │   ├── core/                # 核心配置
│   │   │   ├── config.py        # 环境变量配置
│   │   │   ├── security.py      # JWT / 密码加密
│   │   │   └── database.py      # 数据库连接
│   │   ├── tasks/               # Celery 异步任务
│   │   │   ├── document_tasks.py # 文档解析任务
│   │   │   └── review_tasks.py   # 评审任务
│   │   └── main.py              # FastAPI 入口
│   ├── migrations/              # Alembic 数据库迁移
│   ├── tests/                   # 测试
│   │   ├── test_api/
│   │   ├── test_services/
│   │   └── test_ai/
│   ├── requirements.txt
│   ├── Dockerfile
│   └── celery_worker.py         # Celery Worker 入口
│
├── docker-compose.yml           # 本地开发环境编排
├── nginx/                       # Nginx 配置
│   └── default.conf
├── docs/                        # 项目文档
└── README.md
```

---

## 4. API 设计

### 4.1 RESTful 约定

| 规范 | 说明 |
|------|------|
| URL 风格 | 小写 + 连字符，复数名词：`/api/v1/documents` |
| 版本控制 | URL 路径版本：`/api/v1/` |
| 认证方式 | Bearer Token（JWT），Header: `Authorization: Bearer <token>` |
| 分页 | Query 参数：`?page=1&pageSize=20` |
| 错误响应 | 统一格式：`{ "error": "错误描述", "detail": "详细信息" }` |
| 流式接口 | 使用 SSE（Server-Sent Events），Content-Type: `text/event-stream` |

### 4.2 核心接口列表

#### 认证模块

| 方法 | 路径 | 用途 |
|------|------|------|
| POST | `/api/v1/auth/register` | 用户注册 |
| POST | `/api/v1/auth/login` | 用户登录，返回 JWT |
| GET | `/api/v1/auth/me` | 获取当前用户信息 |
| POST | `/api/v1/auth/refresh` | 刷新 Token |

#### 文档模块

| 方法 | 路径 | 用途 |
|------|------|------|
| POST | `/api/v1/documents/upload` | 上传文档（multipart） |
| GET | `/api/v1/documents` | 文档列表（分页/搜索） |
| GET | `/api/v1/documents/:id` | 文档详情 |
| DELETE | `/api/v1/documents/:id` | 删除文档 |

#### Agent 模块

| 方法 | 路径 | 用途 |
|------|------|------|
| GET | `/api/v1/agents/templates` | 预设模板列表 |
| POST | `/api/v1/agents/from-template/:id` | 从模板创建 Agent |
| POST | `/api/v1/agents/create-via-chat` | 对话式创建 Agent |
| GET | `/api/v1/agents` | 我的 Agent 列表 |
| GET | `/api/v1/agents/:id` | Agent 详情 |
| PUT | `/api/v1/agents/:id` | 更新 Agent |
| DELETE | `/api/v1/agents/:id` | 删除 Agent |
| GET | `/api/v1/agents/suggest-colleagues` | 推荐同事 Agent |

#### 评审模块

| 方法 | 路径 | 用途 |
|------|------|------|
| POST | `/api/v1/reviews` | 发起评审 |
| GET | `/api/v1/reviews/:id/stream` | 评审结果 SSE 流 |
| GET | `/api/v1/reviews/:id` | 获取完整评审报告 |
| GET | `/api/v1/documents/:id/reviews` | 文档的评审历史 |
| PATCH | `/api/v1/reviews/:id/suggestions/:sid` | 标记建议采纳状态 |

#### 聊天室模块

| 方法 | 路径 | 用途 |
|------|------|------|
| POST | `/api/v1/chatrooms` | 创建聊天室 |
| GET | `/api/v1/chatrooms/:id` | 聊天室详情 |
| POST | `/api/v1/chatrooms/:id/messages` | 发送消息（返回 SSE 流） |
| GET | `/api/v1/chatrooms/:id/messages` | 历史消息（分页） |
| POST | `/api/v1/chatrooms/:id/invite` | 邀请 Agent 加入 |
| POST | `/api/v1/chatrooms/:id/summary` | 生成辩论总结 |
| PATCH | `/api/v1/chatrooms/:id/close` | 关闭聊天室 |

### 4.3 错误码规范

| HTTP 状态码 | 含义 | 场景 |
|:-----------:|------|------|
| 400 | 请求参数错误 | 格式不支持、文件过大、参数缺失 |
| 401 | 未认证 | Token 缺失或过期 |
| 403 | 无权限 | 访问他人资源 |
| 404 | 资源不存在 | 文档/Agent/评审不存在 |
| 429 | 请求过多 | 超出频率限制 |
| 500 | 服务端错误 | 未预期的异常 |

---

## 5. 数据库设计

### 5.1 核心表结构

#### users — 用户表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | 用户唯一ID |
| email | VARCHAR(255) | UNIQUE, NOT NULL | 邮箱 |
| password_hash | VARCHAR(255) | NOT NULL | 密码哈希 |
| name | VARCHAR(100) | | 昵称 |
| avatar | VARCHAR(500) | | 头像URL |
| created_at | TIMESTAMP | DEFAULT NOW | 创建时间 |
| updated_at | TIMESTAMP | | 更新时间 |

#### documents — 文档表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | 文档ID |
| owner_id | UUID | FK → users.id | 所属用户 |
| title | VARCHAR(500) | NOT NULL | 文档标题 |
| file_name | VARCHAR(500) | NOT NULL | 原始文件名 |
| file_type | VARCHAR(10) | NOT NULL | pdf/docx/md/txt |
| file_size | INTEGER | NOT NULL | 文件大小(bytes) |
| file_url | VARCHAR(1000) | | 存储路径 |
| raw_content | TEXT | | 提取的纯文本 |
| structured_content | JSONB | | 结构化章节内容 |
| keywords | VARCHAR(200)[] | | 关键词数组 |
| summary | TEXT | | 文档摘要 |
| word_count | INTEGER | | 字数 |
| status | VARCHAR(20) | NOT NULL | uploading/parsing/ready/error |
| review_count | INTEGER | DEFAULT 0 | 评审次数 |
| created_at | TIMESTAMP | DEFAULT NOW | |
| updated_at | TIMESTAMP | | |

**索引**：`owner_id`, `status`, `created_at DESC`

#### agents — Agent 角色表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | Agent ID |
| owner_id | UUID | FK → users.id | 创建者 |
| template_id | UUID | FK → agent_templates.id, NULLABLE | 来源模板 |
| name | VARCHAR(100) | NOT NULL | 角色名称 |
| avatar | VARCHAR(500) | | 头像URL |
| tagline | VARCHAR(200) | | 一句话定位 |
| personality | JSONB | NOT NULL | 性格参数 |
| expertise | JSONB | NOT NULL | 专业能力 |
| behavior | JSONB | NOT NULL | 行为特征 |
| system_prompt | TEXT | NOT NULL | AI 使用的完整 system prompt |
| source | VARCHAR(20) | NOT NULL | custom/template/community |
| is_public | BOOLEAN | DEFAULT FALSE | 是否公开 |
| usage_count | INTEGER | DEFAULT 0 | 使用次数 |
| created_at | TIMESTAMP | DEFAULT NOW | |
| updated_at | TIMESTAMP | | |

**索引**：`owner_id`, `source`, `is_public`

#### agent_templates — 预设模板表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | 模板ID |
| name | VARCHAR(100) | NOT NULL | 角色名称 |
| avatar | VARCHAR(500) | | 头像 |
| tagline | VARCHAR(200) | | 一句话定位 |
| tags | VARCHAR(50)[] | | 标签 |
| description | TEXT | | 详细说明 |
| personality | JSONB | NOT NULL | 性格参数 |
| expertise | JSONB | NOT NULL | 专业能力 |
| behavior | JSONB | NOT NULL | 行为特征 |

#### reviews — 评审记录表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | 评审ID |
| document_id | UUID | FK → documents.id | 关联文档 |
| owner_id | UUID | FK → users.id | 发起人 |
| overall_score | DECIMAL(3,2) | | 综合评分 |
| agent_reviews | JSONB | | 各 Agent 评审详情 |
| summary | JSONB | | 汇总（共识/争议/建议） |
| status | VARCHAR(20) | NOT NULL | in_progress/completed |
| created_at | TIMESTAMP | DEFAULT NOW | |

**索引**：`document_id`, `owner_id`, `created_at DESC`

#### review_agents — 评审-Agent 关联表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | |
| review_id | UUID | FK → reviews.id | |
| agent_id | UUID | FK → agents.id | |

**索引**：`review_id`, `agent_id`

#### chatrooms — 聊天室表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | 聊天室ID |
| document_id | UUID | FK → documents.id | 关联文档 |
| review_id | UUID | FK → reviews.id, NULLABLE | 关联评审 |
| owner_id | UUID | FK → users.id | 创建者 |
| topic | VARCHAR(500) | | 讨论主题 |
| context | JSONB | | 评审上下文 |
| status | VARCHAR(20) | NOT NULL | active/closed |
| summary | JSONB | NULLABLE | 辩论总结 |
| created_at | TIMESTAMP | DEFAULT NOW | |
| updated_at | TIMESTAMP | | |

#### chat_participants — 聊天室参与者表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | |
| room_id | UUID | FK → chatrooms.id | |
| agent_id | UUID | FK → agents.id | |
| joined_at | TIMESTAMP | DEFAULT NOW | |

#### chat_messages — 聊天消息表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | 消息ID |
| room_id | UUID | FK → chatrooms.id | 所属聊天室 |
| sender_type | VARCHAR(10) | NOT NULL | user/agent |
| sender_id | UUID | NOT NULL | userId 或 agentId |
| sender_name | VARCHAR(100) | | 发送者名称 |
| content | TEXT | NOT NULL | 消息内容 |
| quotes | JSONB | NULLABLE | 引用的文档原文 |
| reply_to | UUID | FK → chat_messages.id, NULLABLE | 回复的消息 |
| target_agent_id | UUID | NULLABLE | 针对某Agent |
| created_at | TIMESTAMP | DEFAULT NOW | |

**索引**：`room_id, created_at ASC`（消息按时间排序查询）

### 5.2 索引策略总结

| 表 | 索引 | 用途 |
|----|------|------|
| documents | `(owner_id)` | 用户查自己的文档 |
| documents | `(created_at DESC)` | 按时间排序 |
| reviews | `(document_id)` | 查文档的评审历史 |
| reviews | `(owner_id, created_at DESC)` | 用户的评审列表 |
| chat_messages | `(room_id, created_at ASC)` | 聊天消息分页加载 |

---

## 6. AI 引擎设计

### 6.1 Prompt 架构

```
Agent评审时的完整 Prompt 结构：

┌──────────────────────────────────┐
│  System Prompt                    │
│  ┌────────────────────────────┐  │
│  │ 1. 角色定义（来自Agent配置） │  │
│  │    - 身份、性格、专业领域    │  │
│  │    - 说话风格、口头禅       │  │
│  ├────────────────────────────┤  │
│  │ 2. 评审规则（来自模板）     │  │
│  │    - 评分维度定义           │  │
│  │    - 输出格式要求(JSON)     │  │
│  │    - 建议必须具体可执行     │  │
│  ├────────────────────────────┤  │
│  │ 3. 行为约束                │  │
│  │    - 必须引用原文           │  │
│  │    - 严格遵循角色身份       │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  User Prompt                     │
│  ┌────────────────────────────┐  │
│  │ 文档标题: ...              │  │
│  │ 文档内容: ...              │  │
│  │ 请从你的角色视角进行评审    │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

### 6.2 评审引擎流程

```
ReviewEngine.run(document, agents):

1. PromptBuilder.build_system_prompt(agent)  ← 为每个Agent构建独立prompt
2. 并行调用 LLM：
   for agent in agents (parallel):
     response = await llm.stream(
       system=agent.system_prompt,
       user=f"文档内容:\n{document.structured_content}"
     )
3. 解析各 Agent 响应 → AgentReview 对象
4. ReportGenerator.generate(agent_reviews)  ← 汇总生成综合报告
   - 提取共识点（所有Agent一致的观点）
   - 提取争议点（Agent间意见分歧的）
   - 综合排序建议（按支持Agent数+优先级）
```

### 6.3 聊天引擎流程

```
ChatEngine.handle_message(room, user_message):

1. 加载上下文：
   - room.context（评审报告/争议点）
   - 最近 20 条消息（对话历史）
   - 在场 Agent 列表

2. 判断哪些 Agent 需要回复：
   - 如果 @指定 Agent → 该 Agent 优先回复
   - 否则 → 所有 Agent 均可回复

3. 为每个回复 Agent 构建上下文：
   system = agent.system_prompt + room.context + "你在参与一场讨论"
   messages = [对话历史] + [user_message]

4. 生成回复（流式）：
   for agent in reply_agents:
     response = await llm.stream(system, messages)

5. 检查是否触发 Agent 间互动：
   - 如果 Agent A 的观点与 Agent B 矛盾
   - 自动生成 Agent B 的回应
```

---

## 7. 安全设计

### 7.1 认证与授权

```
认证流程：
1. 用户注册 → bcrypt 哈希存储密码
2. 用户登录 → 验证密码 → 签发 JWT (access_token + refresh_token)
3. 请求认证 → Bearer Token → 验证签名和过期时间 → 注入当前用户

权限控制：
- 数据隔离：所有查询自动过滤 owner_id = current_user.id
- Agent 只能被创建者使用/编辑（公开模板除外）
- 聊天室只有创建者可以发送消息和邀请 Agent
```

### 7.2 数据安全

| 措施 | 说明 |
|------|------|
| 密码存储 | bcrypt 哈希，不存储明文 |
| HTTPS | 全站 TLS 加密 |
| 输入过滤 | Pydantic Schema 校验 + XSS 过滤 |
| SQL 防注入 | ORM 参数化查询 |
| API 限流 | 60 次/分钟/IP，评审接口 10 次/分钟/用户 |
| 文件校验 | 校验文件类型和大小，防恶意上传 |

---

## 8. 性能考虑

### 8.1 缓存策略

| 缓存目标 | 方式 | TTL | 说明 |
|---------|------|-----|------|
| Agent 模板 | Redis | 1 小时 | 模板数据变化少，减少 DB 查询 |
| 用户 Agent 列表 | Redis | 10 分钟 | 列表页频繁访问 |
| 文档结构化内容 | Redis | 30 分钟 | 评审时反复读取 |
| SSE 连接状态 | Redis | 会话级 | 聊天室和评审的流式连接 |

### 8.2 数据库优化

| 策略 | 说明 |
|------|------|
| JSONB 索引 | Agent 的 personality/expertise 字段使用 GIN 索引 |
| 分页查询 | 所有列表接口使用 cursor-based 分页（避免大偏移量） |
| 连接池 | SQLAlchemy 配置连接池（pool_size=20, max_overflow=10） |
| 只读副本 | 增长阶段考虑读写分离 |

### 8.3 前端优化

| 策略 | 说明 |
|------|------|
| 路由懒加载 | 每个页面模块按需加载 |
| 虚拟列表 | 文档列表和聊天消息使用虚拟滚动 |
| TanStack Query 缓存 | API 请求自动缓存，减少重复请求 |
| 流式渲染 | 评审结果逐字渲染，降低感知等待时间 |

---

> 📎 相关文档：
> - [产品架构](./product-architecture.md)
> - [PRD-01-概述与功能列表](./PRD-DocMind-01-概述与功能列表.md)
> - [PRD-04-非功能需求与里程碑](./PRD-DocMind-04-非功能需求与里程碑.md)
