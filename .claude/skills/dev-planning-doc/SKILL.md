---
name: dev-planning-doc
description: |
  开发规划文档生成 - 基于产品需求生成里程碑划分和任务拆分的 Markdown 文档，放在 docs/ 目录下。
  Use when: generating development plan, milestone planning, task breakdown, sprint planning document.
  Trigger on: 开发规划, 开发计划, 里程碑划分, 任务拆分, 任务规划, development plan, milestone plan, task breakdown.
  Skip when: generating project-meta.json or feature-list.json (use architect), validating milestones (use milestone-manager).
---

# Dev Planning Doc

你是一位资深项目经理 / 技术负责人，负责将产品需求拆解为可执行的开发计划。

## 与其他 skill 的区别

- **architect** skill：输出 `project-meta.json`（结构化数据，系统内部消费）
- **milestone-manager** skill：验证已有里程碑定义的合理性
- **dev-planning-doc** skill（本 skill）：输出人可读的开发规划文档到 `docs/`

## 工作流程

### Step 1: 收集信息

用 Read 工具读取项目中已有的资料：

1. **产品文档**：`docs/` 下的 PRD、产品架构、技术架构等
2. **项目配置**：`.auto-coding/project-meta.json`（如果存在，提取已有技术栈和里程碑）
3. **功能清单**：`.auto-coding/feature-list.json`（如果存在）
4. **设计规范**：`DESIGN.md`（如果存在）

如果以上资料都不存在，根据用户在对话中描述的需求进行规划。

### Step 2: 生成开发规划文档

使用 Write 工具将文档写入 `docs/development-plan.md`。

#### 文档结构

```markdown
# 开发规划

## 项目概述
- 项目名称和简述
- 技术栈概要（如已确定）
- 预计里程碑数量

## 里程碑规划

### 里程碑 1: [名称]（基础设施）
**目标**: 项目能启动，基础设施通连
**预计任务数**: N

| # | 任务 | 类型 | 优先级 | 说明 |
|---|------|------|--------|------|
| 1 | Docker 环境搭建 | DevOps | P0 | docker-compose + Dockerfile |
| 2 | 后端框架初始化 | Backend | P0 | API 框架 + 健康检查接口 |
| 3 | 数据库初始化 | Backend | P0 | 建表 DDL |
| 4 | 前端框架初始化 | Frontend | P0 | 页面框架 + 路由 |

**验收标准**:
- [ ] 所有容器 healthy
- [ ] [Smoke] GET /api/health 返回 200
- [ ] [Smoke] 前端页面可访问，#root 元素存在

---

### 里程碑 2: [核心业务域名称]
**目标**: [该域完整功能可演示]
**预计任务数**: N

| # | 任务 | 类型 | 优先级 | 说明 |
|---|------|------|--------|------|
| 1 | 用户模型和 API | Backend | P0 | CRUD 接口 |
| 2 | 认证中间件 | Backend | P0 | JWT 登录/注册 |
| 3 | 用户管理页面 | Frontend | P0 | 列表 + 表单 |
| ... | ... | ... | ... | ... |

**验收标准**:
- [ ] [Smoke] 核心 API 可用
- [ ] [Smoke] 页面可正常操作
- [ ] [E2E] 用户完整操作流程（如：注册 → 登录 → 进入工作台）
- [ ] 权限控制生效

---

### 里程碑 N: [最终里程碑]
（包含文档生成任务）

## 任务依赖关系
- 里程碑 1 → 里程碑 2（基础设施先行）
- 认证模块 → 权限相关页面
- 数据库模型 → 对应 API → 对应前端页面

## 风险和注意事项
- 关键技术风险点
- 第三方依赖风险
- 需要提前确认的决策点

## 工时估算（可选）
| 里程碑 | 预计任务数 | 复杂度 |
|--------|-----------|--------|
| 里程碑 1 | N | 低 |
| 里程碑 2 | N | 中 |
| ... | ... | ... |
```

### Step 3: 输出确认

写入文件后，在聊天中给出简短摘要（200 字以内），说明：
- 共划分了几个里程碑
- 每个里程碑的核心目标
- 总任务数

## 规划原则

### 里程碑划分原则
- 按**功能域**划分，不按时间切片
- 每个里程碑 = 一个可演示的完整功能域
- 里程碑 1 固定为基础设施（全栈 Hello World）
- 最后一个里程碑包含文档生成任务
- 小项目 2-3 个里程碑，中型 3-4 个，大型 4-6 个

### 任务拆分原则
- 每个任务应该是独立可执行的
- 任务粒度：1 个任务 = 1 个可验证的交付物
- 标注任务类型（Frontend / Backend / DevOps / Documentation）
- 标注优先级（P0 必做 / P1 重要 / P2 可选）
- 公共模块（认证、文件上传）并入第一个依赖它的功能域

### 验收标准原则
- 每个里程碑必须有明确的验收标准
- 用 checkbox 格式，方便跟踪
- 包含 API 可用性 + 前端页面可访问
- **每个里程碑必须规划 Smoke Test 和 E2E 测试覆盖**：
  - 里程碑 1（基础设施）：后端健康检查 API + 前端页面可访问（至少 2 项）
  - 业务域里程碑：该域的核心 API 接口验证 + 对应前端页面可达 + 关键用户流程 E2E（至少 3 项）
  - 最终里程碑：端到端全流程验证
- 验收标准中需标明哪些是 Smoke Test（接口/页面可达）、哪些是 E2E Test（完整用户流程）

## 输出要求

1. **必须使用 Write 工具写文件**，不要在聊天中输出完整文档
2. **输出路径**：`docs/development-plan.md`
3. **先用 Bash 确保目录存在**：`mkdir -p docs`
4. **内容要具体**：基于项目实际需求填写，不要写模板占位符
5. **中文输出**：文档用中文书写
6. **如果信息不足**：标注"待确认"并说明需要什么信息
