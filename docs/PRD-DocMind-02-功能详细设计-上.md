# DocMind PRD — 功能详细设计（上）

**文档中心 + Agent 工坊**

---

## 7. 功能详细设计

### 7.1 模块一：文档中心 📄

#### 7.1.1 功能：文档上传与解析

**用户故事**

> 作为用户，我想要上传我的文档，以便系统自动解析并准备好评审。

**验收标准**

- [ ] 支持拖拽上传和点击上传两种方式
- [ ] 支持格式：PDF、Word（.docx）、Markdown（.md）、纯文本（.txt）
- [ ] 单文件大小上限 20MB
- [ ] 上传后自动解析，提取以下信息：
  - 文档标题
  - 段落结构（章/节/段）
  - 关键词（自动提取 5-10 个）
  - 文档摘要（200 字以内）
  - 字数统计
- [ ] 解析时间 < 10 秒（5000 字以内文档）
- [ ] 上传过程中显示进度条
- [ ] 上传失败时给出明确错误提示（格式不支持/文件过大/解析失败）

**功能流程**

```
1. 用户进入文档中心 → 点击上传按钮 / 拖拽文件到上传区域
2. 前端校验文件格式和大小
   ├── 校验通过 → 调用上传接口
   └── 校验失败 → 提示具体原因
3. 后端接收文件 → 存储原始文件 → 触发解析任务
4. 解析引擎处理：
   a. 文本提取（按格式适配）
   b. 结构化处理（识别标题层级、段落）
   c. 关键词提取
   d. 摘要生成
5. 解析完成 → 存储结构化数据 → 通知前端
6. 文档卡片出现在列表中，状态为"已就绪"
```

**数据模型**

```typescript
interface Document {
  id: string;                    // 文档唯一ID
  ownerId: string;               // 所属用户
  title: string;                 // 文档标题
  originalFileName: string;      // 原始文件名
  fileType: 'pdf' | 'docx' | 'md' | 'txt';  // 文件类型
  fileSize: number;              // 文件大小（bytes）
  rawContent: string;            // 提取的纯文本内容
  structuredContent: {           // 结构化内容
    sections: Section[];         // 章节列表
  };
  keywords: string[];            // 关键词
  summary: string;               // 摘要
  wordCount: number;             // 字数
  status: 'uploading' | 'parsing' | 'ready' | 'error';  // 状态
  reviewCount: number;           // 评审次数
  createdAt: Date;
  updatedAt: Date;
}

interface Section {
  id: string;
  level: number;        // 标题层级 1-6
  title: string;        // 标题文本
  content: string;      // 段落内容
  position: number;     // 在文档中的位置序号
}
```

**API 接口**

### POST /api/documents/upload

**请求**（multipart/form-data）

```
file: <binary>           // 文档文件
title?: string           // 可选自定义标题
```

**响应 (200)**

```json
{
  "id": "doc_abc123",
  "title": "产品需求文档 v2.0",
  "fileType": "pdf",
  "fileSize": 2048000,
  "status": "parsing",
  "createdAt": "2026-04-20T10:00:00Z"
}
```

**错误 (400)**

```json
{ "error": "不支持的文件格式，请上传 PDF/Word/Markdown/TXT 文件" }
{ "error": "文件大小超过 20MB 限制" }
```

---

#### 7.1.2 功能：文档列表与详情

**用户故事**

> 作为用户，我想要查看我所有的文档及其评审状态，以便快速找到需要处理的文档。

**验收标准**

- [ ] 文档列表按更新时间倒序排列
- [ ] 支持按文件名搜索
- [ ] 每个文档卡片显示：标题、文件类型图标、字数、评审次数、更新时间、状态标签
- [ ] 点击文档卡片进入文档详情页
- [ ] 详情页左侧展示文档内容（可滚动），右侧展示评审历史记录
- [ ] 支持删除文档（二次确认）

**API 接口**

### GET /api/documents

**响应 (200)**

```json
{
  "documents": [
    {
      "id": "doc_abc123",
      "title": "产品需求文档 v2.0",
      "fileType": "pdf",
      "wordCount": 5200,
      "reviewCount": 3,
      "status": "ready",
      "updatedAt": "2026-04-20T10:00:00Z"
    }
  ],
  "total": 15,
  "page": 1,
  "pageSize": 20
}
```

### DELETE /api/documents/:id

**响应 (200)**

```json
{ "message": "文档已删除" }
```

**异常处理**

| 异常场景 | 处理方式 |
|---------|---------|
| 文件格式不支持 | 返回 400，提示支持的格式列表 |
| 文件超过 20MB | 返回 400，提示大小限制 |
| 解析失败 | 文档状态设为 error，允许重新上传 |
| 文档不存在 | 返回 404 |
| 无权限访问 | 返回 403 |

---

### 7.2 模块二：Agent 工坊 🎭

#### 7.2.1 功能：预设 Agent 模板库

**用户故事**

> 作为新用户，我想要直接使用预设的 Agent 角色，以便快速开始文档评审，不需要从头创建。

**验收标准**

- [ ] 提供不少于 6 个预设 Agent 模板，覆盖常见评审场景
- [ ] 每个模板包含：名称、头像、一句话介绍、标签、详细角色说明
- [ ] 用户可一键「使用此模板」，添加到自己的 Agent 库
- [ ] 使用模板后可编辑修改，不影响原模板

**预设模板列表**

| 编号 | Agent 名称 | 定位 | 说话风格 | 关注重点 |
|:----:|-----------|------|---------|---------|
| 1 | 🎓 李教授 | 大学教授 / 学术导师 | 温和严谨 | 逻辑性、论证充分性、学术规范 |
| 2 | 💻 老张 | 技术Leader / 资深工程师 | 直接毒舌 | 代码规范、性能、可维护性 |
| 3 | 📋 陈产品 | 产品经理 | 务实高效 | 用户价值、ROI、可落地性 |
| 4 | 🎨 小林 | UX 设计师 | 温柔细腻 | 用户体验、交互逻辑、可读性 |
| 5 | 👨‍🎓 小王 | 大学生 / 初学者 | 好奇单纯 | 能否看懂、是否有歧义、学习曲线 |
| 6 | 👔 赵总 | 高管 / 决策者 | 简洁果断 | 战略对齐、成本效益、风险 |
| 7 | ⚖️ 孙律师 | 法务 / 合规专家 | 严谨保守 | 合规性、风险条款、法律漏洞 |
| 8 | 📊 数据刘 | 数据分析师 | 理性客观 | 数据支撑、指标定义、逻辑链条 |

**数据模型**

```typescript
interface AgentTemplate {
  id: string;                    // 模板ID
  name: string;                  // 角色名称
  avatar: string;                // 头像URL
  tagline: string;               // 一句话定位
  tags: string[];                // 标签（如"技术""学术"）
  description: string;           // 详细角色说明
  personality: {
    tone: 'gentle' | 'direct' | 'harsh' | 'encouraging';
    strictness: number;          // 1-5
    cooperation: 'collaborative' | 'confrontational' | 'complementary';
  };
  expertise: {
    domain: string[];            // 领域标签
    focus: string[];             // 关注重点
    depth: 'junior' | 'mid' | 'senior' | 'expert';
  };
  behavior: {
    catchphrase: string;         // 口头禅
    facingChallenge: 'stubborn' | 'evidence_based' | 'flexible';
    reviewStyle: 'macro' | 'detail' | 'balanced';
  };
  isPreset: true;                // 标记为预设模板
}
```

---

#### 7.2.2 功能：对话式创建 Agent

**用户故事**

> 作为用户，我想要通过和 AI 对话来创建一个自定义的评审角色，以便得到更贴合我需求的评审视角。

**验收标准**

- [ ] 用户点击「创建新 Agent」后进入对话创建模式
- [ ] AI 自动引导用户描述想要的角色（最多 5 轮对话）
- [ ] 每轮对话后，AI 补充完善角色特征并展示预览卡片
- [ ] 用户可在任意轮次确认保存，或继续调整
- [ ] AI 自动生成：角色名称、头像建议、口头禅、性格参数
- [ ] 保存后的 Agent 出现在「我的 Agent 库」中
- [ ] 对话过程中实时展示 Agent 预览卡片（随对话更新）

**功能流程**

```
1. 用户点击「创建新 Agent」→ 打开对话式创建面板
2. AI 发起引导："你想创建什么样的评审角色？可以简单描述一下"
3. 用户输入描述（1-3 句话）
   例："一个严格的技术Leader，注重代码规范，说话比较直接"
4. AI 分析描述 → 推断角色参数 → 生成完整 Agent 卡片：
   - 基础信息：名称"老张"、头像（AI生成）、tagline
   - 性格参数：tone=direct, strictness=4, cooperation=confrontational
   - 专业能力：domain=["技术","架构"], focus=["代码规范","性能"]
   - 行为特征：口头禅、评审风格
5. 展示 Agent 预览卡片 + 询问："这个角色符合你的预期吗？需要调整吗？"
6. 用户选择：
   ├── ✅ 满意 → 保存到 Agent 库
   ├── 🔧 继续调整 → 用户说"说话再毒舌一点" / "关注性能"
   │   → AI 更新参数 → 重新展示预览
   └── 🔄 重新开始 → 清空重来
7. 保存成功后：
   - 推荐相关"同事 Agent"（2-3 个互补角色）
   - 提供「立即使用此 Agent 评审」入口
```

**AI 引导策略**

| 对话轮次 | AI 行为 | 目标 |
|:--------:|---------|------|
| 第 1 轮 | 开放式提问："你想创建什么角色？" | 收集核心描述 |
| 第 2 轮 | 展示预览 + 询问调整方向 | 快速成型 |
| 第 3 轮 | 针对性调整 + 再次预览 | 精细化 |
| 第 4-5 轮 | 确认细节（口头禅/严格度等） | 最终打磨 |

**数据模型**

```typescript
interface Agent {
  id: string;                    // Agent唯一ID
  ownerId: string;               // 创建者
  templateId?: string;           // 来源模板ID（可选）

  // 基础信息
  name: string;                  // 角色名称
  avatar: string;                // 头像URL
  tagline: string;               // 一句话定位

  // 性格参数
  personality: {
    tone: 'gentle' | 'direct' | 'harsh' | 'encouraging';
    strictness: number;          // 1-5
    cooperation: 'collaborative' | 'confrontational' | 'complementary';
  };

  // 专业能力
  expertise: {
    domain: string[];            // 领域标签
    focus: string[];             // 关注重点
    depth: 'junior' | 'mid' | 'senior' | 'expert';
  };

  // 行为特征
  behavior: {
    catchphrase: string;         // 口头禅
    facingChallenge: 'stubborn' | 'evidence_based' | 'flexible';
    reviewStyle: 'macro' | 'detail' | 'balanced';
  };

  // 系统提示词（基于以上参数自动生成）
  systemPrompt: string;          // 用于AI调用的完整system prompt

  // 来源与可见性
  source: 'custom' | 'template' | 'community';
  isPublic: boolean;             // 是否公开到社区

  // 使用统计
  usageCount: number;            // 被使用次数
  lastUsedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}
```

**API 接口**

### POST /api/agents/create-via-chat

**请求**

```json
{
  "messages": [
    { "role": "user", "content": "我想创建一个严格的技术Leader" },
    { "role": "assistant", "content": "好的，我帮你..." },
    { "role": "user", "content": "说话再毒舌一点" }
  ]
}
```

**响应 (200)**

```json
{
  "agent": {
    "id": "agent_xyz789",
    "name": "老张",
    "avatar": "https://...",
    "tagline": "毒舌但专业的技术Leader",
    "personality": {
      "tone": "harsh",
      "strictness": 5,
      "cooperation": "confrontational"
    },
    "expertise": {
      "domain": ["技术", "架构"],
      "focus": ["代码规范", "性能", "可维护性"],
      "depth": "senior"
    },
    "behavior": {
      "catchphrase": "这代码写得...我看看",
      "facingChallenge": "evidence_based",
      "reviewStyle": "detail"
    }
  },
  "suggestions": [
    {
      "name": "陈产品",
      "tagline": "务实的产品经理",
      "reason": "和技术Leader互补，提供产品视角"
    }
  ]
}
```

### GET /api/agents

**响应 (200)**

```json
{
  "agents": [
    {
      "id": "agent_xyz789",
      "name": "老张",
      "avatar": "https://...",
      "tagline": "毒舌但专业的技术Leader",
      "source": "custom",
      "usageCount": 5,
      "lastUsedAt": "2026-04-20T10:00:00Z"
    }
  ],
  "total": 8
}
```

### PUT /api/agents/:id

**请求**

```json
{
  "name": "老张Pro",
  "personality": { "strictness": 5 }
}
```

### DELETE /api/agents/:id

**响应 (200)**

```json
{ "message": "Agent已删除" }
```

**异常处理**

| 异常场景 | 处理方式 |
|---------|---------|
| 对话轮次超过 5 轮 | AI 引导保存当前版本，提示"可以保存后再编辑" |
| Agent 名称重复 | 允许重名，通过 ID 区分 |
| 生成 Agent 参数不完整 | 后端补全默认值，不阻塞保存 |
| Agent 数量上限（50 个） | 提示删除不常用的 Agent |
| 无权限操作 | 返回 403 |

---

> 📎 上一篇：[PRD-DocMind-01-概述与功能列表](./PRD-DocMind-01-概述与功能列表.md)
> 📎 下一篇：[PRD-DocMind-03-功能详细设计（下）](./PRD-DocMind-03-功能详细设计-下.md)
