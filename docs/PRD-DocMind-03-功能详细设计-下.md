# DocMind PRD — 功能详细设计（下）

**评审大厅 + 聊天室**

---

### 7.3 模块三：评审大厅 🏛️

#### 7.3.1 功能：发起评审

**用户故事**

> 作为用户，我想要选择多个 Agent 组成评审团队来评审我的文档，以便从不同视角获得评价和建议。

**验收标准**

- [ ] 用户选择一个已上传的文档（状态为"已就绪"）
- [ ] 从 Agent 库中勾选 1-5 个 Agent 组成评审团队
- [ ] 提供系统推荐的 Agent 组合（基于文档类型和内容）
- [ ] 点击「开始评审」后，各 Agent 并行分析文档
- [ ] 评审结果流式输出（逐个 Agent 的评价依次展示）
- [ ] 全部 Agent 评审完成后生成综合评审报告
- [ ] 单次评审时间 < 30 秒（5 个 Agent、5000 字文档）
- [ ] 评审过程中显示进度状态

**功能流程**

```
1. 用户在文档列表选择一个文档 → 点击「发起评审」
2. 进入评审配置页：
   a. 左侧展示文档摘要和结构预览
   b. 右侧展示 Agent 选择面板
   c. 系统推荐 2-3 个适合当前文档的 Agent 组合
3. 用户选择评审团队（1-5 个 Agent）
4. 点击「开始评审」
5. 后端处理：
   a. 获取文档结构化内容
   b. 获取各 Agent 的 systemPrompt
   c. 并行调用 AI 生成各角色的评审
   d. 汇总生成综合报告
6. 前端流式展示：
   a. Agent-A 评价（流式输出）
   b. Agent-B 评价（流式输出）
   c. ...
   d. 综合报告
```

**评审输出结构**

每个 Agent 的评审输出包含：

```typescript
interface AgentReview {
  agentId: string;
  agentName: string;
  agentAvatar: string;

  // 总体评价
  overallScore: number;           // 1-5 分
  overallComment: string;         // 总体评价（200字）

  // 分维度评分
  scores: {
    structure: number;            // 结构完整性 1-5
    logic: number;                // 逻辑严密性 1-5
    clarity: number;              // 表达清晰度 1-5
    feasibility: number;          // 可行性 1-5
    completeness: number;         // 完整性 1-5
  };

  // 详细批注
  annotations: {
    sectionId: string;            // 对应文档段落
    quote: string;                // 引用原文
    comment: string;              // 批注内容
    severity: 'praise' | 'suggestion' | 'warning' | 'critical';
  }[];

  // 优化建议
  suggestions: {
    title: string;                // 建议标题
    description: string;          // 详细描述
    priority: 'high' | 'medium' | 'low';
    relatedSection: string;       // 相关段落ID
  }[];
}
```

**综合评审报告**

```typescript
interface ReviewReport {
  id: string;
  documentId: string;
  createdAt: Date;

  // 综合评分
  overallScore: number;           // 所有Agent的平均分

  // 各Agent评审
  agentReviews: AgentReview[];

  // AI 汇总分析
  summary: {
    consensus: string[];          // 共识点（所有Agent一致认可/批评的）
    controversy: {                // 争议点（Agent间意见分歧的）
      topic: string;
      positions: {
        agentId: string;
        stance: 'support' | 'oppose' | 'neutral';
        reason: string;
      }[];
    }[];
    topSuggestions: {             // 综合排序后的 TOP 建议
      title: string;
      description: string;
      priority: 'high' | 'medium' | 'low';
      agreeCount: number;         // 有多少Agent支持此建议
    }[];
  };

  // 状态
  status: 'in_progress' | 'completed';
}
```

**API 接口**

### POST /api/reviews

**请求**

```json
{
  "documentId": "doc_abc123",
  "agentIds": ["agent_001", "agent_002", "agent_003"]
}
```

**响应 (200)**

```json
{
  "reviewId": "review_def456",
  "status": "in_progress",
  "agentCount": 3,
  "streamUrl": "/api/reviews/review_def456/stream"
}
```

### GET /api/reviews/:id/stream（SSE）

**事件流**

```
event: agent_review_start
data: { "agentId": "agent_001", "agentName": "老张" }

event: agent_review_chunk
data: { "agentId": "agent_001", "chunk": "这篇文档的..." }

event: agent_review_complete
data: { "agentId": "agent_001", "overallScore": 3.5 }

event: report_complete
data: { "overallScore": 4.2, "consensus": [...], "controversy": [...] }
```

### GET /api/reviews/:id

**响应 (200)** — 返回完整的 ReviewReport 对象

### GET /api/documents/:id/reviews

**响应 (200)** — 返回该文档的所有评审记录列表

**异常处理**

| 异常场景 | 处理方式 |
|---------|---------|
| 文档未就绪（仍在解析） | 返回 400，提示等待解析完成 |
| Agent 数量为 0 或超过 5 | 返回 400，提示数量限制 |
| AI 调用超时（>60s） | 返回已完成的部分，标记未完成的 Agent |
| 文档内容为空 | 返回 400，提示文档解析可能失败 |
| 评审并发限制（同一用户同时最多 3 次） | 返回 429，提示排队等待 |

---

### 7.4 模块四：聊天室 💬

#### 7.4.1 功能：创建聊天室

**用户故事**

> 作为用户，我想要对评审结果中的争议点或疑问与 Agent 进行深入讨论，以便更好地理解不同视角并做出优化决策。

**验收标准**

- [ ] 从评审报告可一键「进入聊天室」，自动携带评审上下文
- [ ] 聊天室初始成员为评审团队中的所有 Agent
- [ ] 用户可随时发送消息，所有 Agent 可见
- [ ] 用户可使用 `@Agent名` 指定某个 Agent 优先回复
- [ ] Agent 回复基于角色身份，引用文档原文作为依据
- [ ] 支持动态邀请新 Agent 加入（从 Agent 库选择）
- [ ] 可结束辩论并生成总结

**功能流程**

```
1. 触发入口：
   a. 评审报告中点击「对此争议点辩论」
   b. 评审报告中点击某个 Agent 的评价 → 「追问」
   c. 聊天室列表中新建聊天室

2. 创建聊天室：
   a. 自动填入评审上下文（文档摘要 + 争议点）
   b. 自动加入评审团队的 Agent
   c. 用户可以额外邀请 Agent

3. 聊天室内交互：
   a. 用户发言 → 所有 Agent 可见
   b. @某Agent → 该 Agent 优先回复
   c. Agent 回复 → 基于角色 + 文档上下文 + 对话历史
   d. Agent 可对其他 Agent 的观点做出反应（同意/反对/补充）

4. 结束辩论：
   a. 用户点击「生成总结」
   b. AI 汇总对话中的关键观点和分歧
   c. 输出结构化总结 + 更新后的优化建议
   d. 可选择「采纳并回到评审报告」
```

**数据模型**

```typescript
interface ChatRoom {
  id: string;
  ownerId: string;
  documentId: string;             // 关联文档
  reviewId: string;               // 关联评审

  // 参与者
  participants: {
    agentId: string;
    agentName: string;
    joinedAt: Date;
  }[];

  // 上下文
  context: {
    topic: string;                 // 讨论主题
    controversyPoint?: string;     // 争议点（如有）
    relevantQuotes: string[];      // 相关文档引用
  };

  status: 'active' | 'closed';
  summary?: DebateSummary;         // 辩论总结

  createdAt: Date;
  updatedAt: Date;
}

interface ChatMessage {
  id: string;
  roomId: string;
  senderType: 'user' | 'agent';
  senderId: string;                // userId 或 agentId
  senderName: string;
  senderAvatar: string;
  content: string;

  // 引用
  quotes?: {
    sectionId: string;
    text: string;                  // 引用的文档原文
  }[];

  // 回复关系
  replyTo?: string;                // 回复的消息ID

  // Agent 间互动标记
  targetAgentId?: string;          // 针对某个Agent的回复

  createdAt: Date;
}

interface DebateSummary {
  keyPoints: {                     // 关键观点
    agentId: string;
    agentName: string;
    point: string;
    stance: 'support' | 'oppose' | 'neutral';
  }[];
  agreements: string[];            // 达成共识的点
  disagreements: string[];        // 仍存在分歧的点
  recommendations: string[];       // 最终建议
  generatedAt: Date;
}
```

**API 接口**

### POST /api/chatrooms

**请求**

```json
{
  "documentId": "doc_abc123",
  "reviewId": "review_def456",
  "agentIds": ["agent_001", "agent_002"],
  "topic": "第三章方案可行性讨论",
  "controversyPoint": "技术Leader认为可行，产品经理认为ROI不足"
}
```

**响应 (200)**

```json
{
  "id": "room_ghi789",
  "participants": [
    { "agentId": "agent_001", "agentName": "老张", "joinedAt": "..." },
    { "agentId": "agent_002", "agentName": "陈产品", "joinedAt": "..." }
  ],
  "status": "active"
}
```

### POST /api/chatrooms/:id/messages

**请求**

```json
{
  "content": "@陈产品 你觉得第三章的方案ROI真的不够吗？",
  "targetAgentId": "agent_002"
}
```

**响应 (200)** — SSE 流式返回 Agent 回复

```
event: message_start
data: { "senderId": "agent_002", "senderName": "陈产品" }

event: message_chunk
data: { "chunk": "我的观点是..." }

event: message_complete
data: { "messageId": "msg_001", "content": "我的观点是..." }

event: reaction
data: { "agentId": "agent_001", "reaction": "disagree", "comment": "但技术上..." }
```

### POST /api/chatrooms/:id/invite

**请求**

```json
{ "agentId": "agent_003" }
```

### POST /api/chatrooms/:id/summary

**响应 (200)**

```json
{
  "keyPoints": [
    { "agentId": "agent_001", "agentName": "老张", "point": "技术可行", "stance": "support" },
    { "agentId": "agent_002", "agentName": "陈产品", "point": "ROI不足", "stance": "oppose" }
  ],
  "agreements": ["方案需要进一步验证用户需求"],
  "disagreements": ["技术可行性 vs 商业价值"],
  "recommendations": ["建议先做用户调研验证需求"]
}
```

### GET /api/chatrooms/:id/messages

**查询参数**：`?before=msg_xxx&limit=50`

**响应 (200)** — 返回消息列表，支持分页加载历史记录

**异常处理**

| 异常场景 | 处理方式 |
|---------|---------|
| 聊天室已关闭 | 返回 400，提示只能查看历史记录 |
| Agent 回复超时（>30s） | 显示"该角色正在思考..."，异步返回 |
| 消息内容为空 | 前端拦截，不允许发送 |
| 同时在线 Agent 超过 8 个 | 返回 400，提示人数上限 |
| 生成总结失败 | 提示重试，聊天记录不丢失 |

---

> 📎 上一篇：[PRD-DocMind-02-功能详细设计（上）](./PRD-DocMind-02-功能详细设计-上.md)
> 📎 下一篇：[PRD-DocMind-04-非功能需求与里程碑](./PRD-DocMind-04-非功能需求与里程碑.md)
