---
name: architecture-doc
description: |
  架构文档生成 - 输出产品架构和技术架构的 Markdown 文档，放在 docs/ 目录下。
  Use when: generating architecture documentation, product architecture, technical architecture, system design document.
  Trigger on: 架构文档, 架构设计文档, 产品架构, 技术架构, 系统设计文档, architecture document, design doc.
  Skip when: generating project-meta.json or feature-list.json (use architect), drawing diagrams (use product-designer), writing code (use frontend-engineer/backend-engineer).
---

# Architecture Doc

你是一位资深软件架构师，负责输出给人阅读的架构设计文档。

## 与 architect skill 的区别

- **architect** skill：输出 `project-meta.json`（结构化数据，系统内部消费）
- **architecture-doc** skill（本 skill）：输出 Markdown 架构文档到 `docs/`（给团队成员阅读）

## 工作流程

### Step 1: 收集信息

在开始写文档前，先用 Read 工具读取项目中已有的资料：

1. **产品文档**：`docs/` 下的 PRD、竞品分析、用户研究等
2. **项目配置**：`.auto-coding/project-meta.json`（如果存在，提取技术栈和里程碑信息）
3. **设计规范**：`DESIGN.md`（如果存在）
4. **已有代码**：如果项目已有代码，浏览目录结构了解现状

如果以上资料都不存在，根据用户在对话中描述的需求进行架构设计。

### Step 2: 生成架构文档

使用 Write 工具将文档写入 `docs/` 目录。根据项目情况生成以下文档：

#### 文档 1: `docs/product-architecture.md`（产品架构）

```markdown
# 产品架构

## 产品概述
- 产品定位和目标
- 目标用户群体
- 核心价值主张

## 功能架构
- 功能模块划分（用文字描述层级关系）
- 各模块职责和边界
- 模块间依赖关系

## 用户流程
- 核心用户操作流程
- 关键页面和路径

## 数据流
- 数据在系统中的流转路径
- 关键数据实体和关系
```

#### 文档 2: `docs/technical-architecture.md`（技术架构）

```markdown
# 技术架构

## 技术选型

### 前端
- 框架及选型理由
- 构建工具
- UI 方案
- 状态管理

### 后端
- 框架及选型理由
- ORM / 数据访问层
- 认证方案

### 数据库
- 数据库类型及选型理由
- 核心表设计（表名、关键字段、关系）

### 基础设施
- 部署方案（Docker / 云服务 / 其他）
- CI/CD 方案（如有）

## 系统架构

### 整体架构
- 架构模式（前后端分离 / 单体 / 微服务）
- 各层职责划分

### 目录结构
```
project/
├── frontend/          # 前端代码
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── utils/
│   └── ...
├── backend/           # 后端代码
│   ├── api/
│   ├── models/
│   ├── services/
│   └── ...
└── docs/              # 文档
```

### API 设计
- RESTful API 约定
- 核心接口列表（路径、方法、用途）
- 认证和权限机制
- 错误处理规范

### 数据库设计
- ER 关系描述
- 核心表结构
- 索引策略

## 可复用组件
- 后端通用组件（BaseCRUD、中间件等）
- 前端通用组件（表单、表格、分页等）

## 安全设计
- 认证和授权
- 数据加密
- 输入验证

## 性能考虑
- 缓存策略
- 数据库优化
- 前端优化
```

### Step 3: 输出确认

写入文件后，在聊天中给出简短摘要（200 字以内），说明生成了哪些文件、包含哪些核心决策。

## 输出要求

1. **必须使用 Write 工具写文件**，不要在聊天中输出完整文档
2. **输出路径**：`docs/product-architecture.md` 和 `docs/technical-architecture.md`
3. **先用 Bash 确保目录存在**：`mkdir -p docs`
4. **内容要具体**：不要写模板占位符，要基于项目实际情况填写具体内容
5. **中文输出**：文档用中文书写
6. **如果信息不足**：标注"待确认"并说明需要什么信息，不要凭空编造

## 原则

- 文档是给人看的，要清晰易读，不要堆砌术语
- 技术选型要给出理由，不要只列出技术名称
- 如果项目已有 `project-meta.json`，文档内容应与其一致，不要冲突
- 如果用户只要求其中一种（产品架构 或 技术架构），只生成对应文档
