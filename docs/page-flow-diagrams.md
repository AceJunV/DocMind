# DocMind 页面流程图

**版本**: v1.0 | **日期**: 2026-04-20

> 本文档包含 DocMind 平台所有核心流程的 Mermaid 图表，可在支持 Mermaid 的 Markdown 编辑器（如 GitHub、VS Code + Mermaid 插件、Typora）中渲染查看。

---

## 1. 页面导航地图

> 展示所有页面之间的跳转关系

```mermaid
flowchart TB
    subgraph 入口
        Landing["🌍 落地页<br>index.html"]
        Login["🔐 登录/注册"]
    end

    subgraph 主界面
        Dashboard["🏠 工作台"]
        Docs["📄 文档中心"]
        Agents["🎭 Agent 工坊"]
        Reviews["🏛️ 评审大厅"]
        Chat["💬 聊天室"]
    end

    subgraph 子页面
        DocDetail["📋 文档详情"]
        Upload["📤 上传文档"]
        ReviewConfig["⚙️ 评审配置"]
        ReviewReport["📊 评审报告"]
        AgentCreate["🤖 创建 Agent"]
        AgentDetail["📇 Agent 详情"]
        TemplateLib["📚 模板库"]
        DebateSummary["📝 辩论总结"]
    end

    Landing -->|点击登录| Login
    Landing -->|点击免费开始| Login
    Login -->|首次使用| Onboard["✨ 新手引导"]
    Login -->|再次使用| Dashboard
    Onboard --> Dashboard

    Dashboard -->|侧栏导航| Docs
    Dashboard -->|侧栏导航| Agents
    Dashboard -->|侧栏导航| Reviews
    Dashboard -->|侧栏导航| Chat

    Docs -->|点击文档卡片| DocDetail
    Docs -->|点击上传| Upload
    DocDetail -->|点击发起评审| ReviewConfig

    Agents -->|点击创建| AgentCreate
    Agents -->|点击模板库| TemplateLib
    Agents -->|点击卡片| AgentDetail
    TemplateLib -->|使用模板| AgentDetail

    ReviewConfig -->|开始评审| ReviewReport
    ReviewReport -->|进入辩论| Chat
    Chat -->|生成总结| DebateSummary
    DebateSummary -->|回到报告| ReviewReport
```

---

## 2. 首次使用（新手引导）流程

```mermaid
flowchart TD
    Start([用户访问网站]) --> Landing[落地页]
    Landing -->|点击注册/登录| Register[注册页面]
    Register -->|填写信息| CreateAccount[创建账户]
    CreateAccount --> Onboard{是否首次使用?}

    Onboard -->|是| Step1["Step 1: 欢迎引导<br>「让我们创建你的第一个评审角色」"]
    Onboard -->|否| Dashboard[工作台]

    Step1 --> Step2["Step 2: 对话式创建 Agent<br>AI 引导 2-3 轮"]
    Step2 --> Step3["Step 3: 展示 Agent 预览卡片<br>用户确认保存"]

    Step3 --> Step4["Step 4: 提供示例文档<br>「试试用你的角色评审这份文档」"]
    Step4 --> Step5["Step 5: 发起评审<br>选择刚创建的 Agent"]
    Step5 --> Step6["Step 6: 展示评审报告<br>高亮展示建议和评分"]

    Step6 --> Step7["Step 7: 引导完成<br>「恭喜！你已经掌握了基本操作」"]
    Step7 --> Dashboard

    style Start fill:#4F46E5,color:#fff
    style Dashboard fill:#10B981,color:#fff
    style Onboard fill:#F59E0B,color:#fff
```

---

## 3. 文档评审核心流程（主线）

```mermaid
flowchart TD
    Start([用户进入文档中心]) --> Upload{有文档吗?}

    Upload -->|无| UploadDoc[上传文档<br>拖拽/点击]
    UploadDoc --> Parse[文档解析<br>自动提取结构]
    Parse --> ParseResult{解析成功?}
    ParseResult -->|是| DocReady[文档状态: 已就绪]
    ParseResult -->|否| ParseError[状态: 解析失败<br>提示重新上传]
    ParseError --> UploadDoc

    Upload -->|有| SelectDoc[选择一个已就绪的文档]
    DocReady --> SelectDoc

    SelectDoc --> ConfigReview[评审配置页]
    ConfigReview --> SelectAgents[选择评审团队<br>1-5 个 Agent]
    SelectAgents --> SuggestAgents[系统推荐 Agent 组合<br>基于文档类型]
    SuggestAgents --> ConfirmTeam{确认团队?}

    ConfirmTeam -->|调整| SelectAgents
    ConfirmTeam -->|确认| StartReview[点击「开始评审」]

    StartReview --> ParallelReview["并行评审中...<br>各 Agent 独立分析"]
    ParallelReview --> StreamOutput["流式输出<br>Agent-A → Agent-B → ..."]
    StreamOutput --> GenReport[生成综合评审报告]
    GenReport --> ShowReport[展示评审报告]

    ShowReport --> UserDecision{用户决策}

    UserDecision -->|采纳建议| AdoptSuggestion[标记建议为已采纳]
    AdoptSuggestion --> ExportReport[导出评审报告<br>PDF/Markdown]
    ExportReport --> Done([完成])

    UserDecision -->|有疑问| EnterChat[进入聊天室辩论]
    UserDecision -->|不满意| ChangeTeam[更换 Agent 团队]
    ChangeTeam --> ConfigReview

    EnterChat --> ChatFlow[聊天辩论流程 ⬇️]

    style Start fill:#4F46E5,color:#fff
    style Done fill:#10B981,color:#fff
    style ParallelReview fill:#F59E0B,color:#fff
    style UserDecision fill:#EC4899,color:#fff
```

---

## 4. Agent 创建流程

```mermaid
flowchart TD
    Start([进入 Agent 工坊]) --> Choice{创建方式?}

    Choice -->|快速创建| BrowseTemplates[浏览预设模板库<br>8 个角色]
    BrowseTemplates --> SelectTemplate[选择一个模板]
    SelectTemplate --> PreviewTemplate[预览模板详情<br>性格/专业/行为]
    PreviewTemplate --> UseTemplate{满意?}
    UseTemplate -->|是| SaveTemplate[一键使用 → 保存到我的库]
    UseTemplate -->|否| BrowseTemplates

    Choice -->|自定义创建| OpenCreator[点击「创建新 Agent」]
    OpenCreator --> AIChat["🤖 AI 对话引导<br>「你想创建什么样的角色？」"]

    AIChat --> UserDescribe["👤 用户描述<br>例：严格的技术Leader"]
    UserDescribe --> AIGenerate["🤖 AI 推断参数 + 生成预览<br>名称/头像/性格/专业/行为"]

    AIGenerate --> ShowPreview[展示 Agent 预览卡片]
    ShowPreview --> Satisfied{满意?}

    Satisfied -->|满意| SaveAgent[保存到我的 Agent 库]
    Satisfied -->|需调整| UserAdjust["👤 用户说调整方向<br>「再毒舌一点」「关注性能」"]
    UserAdjust --> AIGenerate

    SaveAgent --> SuggestColleague["💡 推荐同事 Agent<br>基于角色互补性"]
    SuggestColleague --> AddColleague{添加同事?}
    AddColleague -->|是| QuickCreate[快速创建同事 Agent<br>预填参数 → 微调]
    AddColleague -->|否| AgentLibrary[返回我的 Agent 库]
    QuickCreate --> AgentLibrary

    SaveTemplate --> SuggestColleague2["💡 同样推荐同事"]
    SuggestColleague2 --> AgentLibrary

    style Start fill:#4F46E5,color:#fff
    style SaveAgent fill:#10B981,color:#fff
    style AgentLibrary fill:#10B981,color:#fff
    style Choice fill:#F59E0B,color:#fff
```

---

## 5. 聊天室辩论流程

```mermaid
flowchart TD
    Start([从评审报告进入]) --> Context["加载评审上下文<br>争议点 + 文档摘要"]
    Context --> CreateRoom[创建聊天室<br>自动加入评审团队 Agent]
    CreateRoom --> ShowRoom[展示聊天室<br>左: 文档预览 右: 对话区]

    ShowRoom --> UserAction{用户操作}

    UserAction -->|发送消息| UserMsg["用户发言<br>所有 Agent 可见"]
    UserMsg --> DetermineReply["判断哪些 Agent 回复<br>@指定 → 优先回复<br>否则 → 所有 Agent"]
    DetermineReply --> AgentReply["Agent 生成回复<br>基于角色 + 文档上下文"]
    AgentReply --> CheckInteraction{"Agent 间<br>观点矛盾?"}

    CheckInteraction -->|是| AgentInteraction["Agent 自动互动<br>B 回应 A 的观点"]
    CheckInteraction -->|否| WaitNext[等待下一条消息]
    AgentInteraction --> WaitNext
    WaitNext --> UserAction

    UserAction -->|邀请 Agent| InviteAgent["从 Agent 库选择<br>或一键生成同事"]
    InviteAgent --> AgentJoin["新 Agent 加入聊天室<br>带入角色身份"]
    AgentJoin --> UserAction

    UserAction -->|引用文档| QuoteDoc["选择文档段落引用<br>所有 Agent 基于引用讨论"]
    QuoteDoc --> UserMsg

    UserAction -->|生成总结| GenSummary["AI 汇总对话<br>提取关键观点/共识/分歧"]
    GenSummary --> ShowSummary[展示辩论总结]
    ShowSummary --> UpdateSuggestions["更新优化建议<br>回到评审报告"]
    UpdateSuggestions --> Done([辩论结束])

    UserAction -->|结束辩论| CloseRoom[关闭聊天室]
    CloseRoom --> Done

    style Start fill:#4F46E5,color:#fff
    style Done fill:#10B981,color:#fff
    style UserAction fill:#EC4899,color:#fff
    style CheckInteraction fill:#F59E0B,color:#fff
```

---

## 6. 评审时序图

> 展示评审发起时前后端 + AI 引擎的交互时序

```mermaid
sequenceDiagram
    actor User as 用户
    participant FE as 前端
    participant API as FastAPI 后端
    participant ReviewEngine as 评审引擎
    participant LLM as LLM (AI)
    participant DB as PostgreSQL

    User->>FE: 选择文档 + Agent 团队 → 点击「开始评审」
    FE->>API: POST /api/v1/reviews<br>{documentId, agentIds}

    API->>DB: 查询文档内容
    DB-->>API: 返回结构化文档

    API->>DB: 查询各 Agent 配置 + systemPrompt
    DB-->>API: 返回 Agent 列表

    API->>DB: 创建 Review 记录 (status: in_progress)
    API-->>FE: 返回 reviewId + SSE stream URL

    Note over FE: 展示「评审中...」状态

    loop 对每个 Agent（并行）
        API->>ReviewEngine: 构建 Prompt (agent.systemPrompt + 文档内容)
        ReviewEngine->>LLM: 流式调用 LLM
        LLM-->>ReviewEngine: 流式返回评审内容
        ReviewEngine-->>API: 解析为 AgentReview
        API-->>FE: SSE event: agent_review_chunk
        FE-->>User: 逐字展示 Agent 评价
    end

    API->>ReviewEngine: 汇总生成综合报告<br>(共识/争议/建议)
    ReviewEngine->>LLM: 调用汇总 Prompt
    LLM-->>ReviewEngine: 返回汇总结果
    ReviewEngine-->>API: 返回 ReviewReport

    API->>DB: 更新 Review (status: completed)
    API-->>FE: SSE event: report_complete
    FE-->>User: 展示完整评审报告
```

---

## 7. 聊天室时序图

> 展示用户发言后 Agent 间的互动时序

```mermaid
sequenceDiagram
    actor User as 用户
    participant FE as 前端
    participant API as FastAPI 后端
    participant ChatEngine as 聊天引擎
    participant LLM as LLM (AI)

    User->>FE: 发送消息 "@陈产品 第三章方案行不行？"
    FE->>API: POST /api/v1/chatrooms/:id/messages<br>{content, targetAgentId}

    API->>ChatEngine: 加载上下文 (评审报告 + 最近20条消息 + Agent列表)

    Note over ChatEngine: 判断回复 Agent:<br>@陈产品 → 优先回复

    ChatEngine->>LLM: 陈产品角色 Prompt + 上下文
    LLM-->>ChatEngine: 流式返回回复
    ChatEngine-->>API: 解析为 ChatMessage
    API-->>FE: SSE: 陈产品的回复
    FE-->>User: 展示陈产品的消息

    Note over ChatEngine: 检测到观点矛盾<br>老张可能不同意

    ChatEngine->>LLM: 老张角色 Prompt + 陈产品的观点
    LLM-->>ChatEngine: 流式返回互动回复
    ChatEngine-->>API: 解析为互动消息
    API-->>FE: SSE: 老张的互动消息
    FE-->>User: 展示「老张 → 陈产品」

    User->>FE: 点击「生成总结」
    FE->>API: POST /api/v1/chatrooms/:id/summary
    API->>ChatEngine: 汇总所有消息
    ChatEngine->>LLM: 总结 Prompt
    LLM-->>ChatEngine: 返回结构化总结
    ChatEngine-->>API: DebateSummary
    API-->>FE: 返回总结
    FE-->>User: 展示辩论总结面板
```

---

## 8. 数据实体 ER 图

```mermaid
erDiagram
    users ||--o{ documents : "拥有"
    users ||--o{ agents : "创建"
    users ||--o{ reviews : "发起"
    users ||--o{ chatrooms : "创建"

    agent_templates ||--o{ agents : "派生"

    documents ||--o{ reviews : "被评审"
    documents ||--o{ chatrooms : "关联"

    reviews ||--o{ review_agents : "包含"
    agents ||--o{ review_agents : "参与"
    reviews ||--o| chatrooms : "产生"

    chatrooms ||--o{ chat_participants : "包含"
    agents ||--o{ chat_participants : "参与"
    chatrooms ||--o{ chat_messages : "包含"

    users {
        uuid id PK
        string email UK
        string password_hash
        string name
        string avatar
        timestamp created_at
    }

    documents {
        uuid id PK
        uuid owner_id FK
        string title
        string file_type
        integer file_size
        string file_url
        text raw_content
        jsonb structured_content
        varchar keywords
        text summary
        integer word_count
        varchar status
        integer review_count
        timestamp created_at
    }

    agent_templates {
        uuid id PK
        string name
        string avatar
        string tagline
        jsonb personality
        jsonb expertise
        jsonb behavior
    }

    agents {
        uuid id PK
        uuid owner_id FK
        uuid template_id FK
        string name
        string avatar
        string tagline
        jsonb personality
        jsonb expertise
        jsonb behavior
        text system_prompt
        varchar source
        boolean is_public
        integer usage_count
        timestamp created_at
    }

    reviews {
        uuid id PK
        uuid document_id FK
        uuid owner_id FK
        decimal overall_score
        jsonb agent_reviews
        jsonb summary
        varchar status
        timestamp created_at
    }

    review_agents {
        uuid id PK
        uuid review_id FK
        uuid agent_id FK
    }

    chatrooms {
        uuid id PK
        uuid document_id FK
        uuid review_id FK
        uuid owner_id FK
        string topic
        jsonb context
        varchar status
        jsonb summary
        timestamp created_at
    }

    chat_participants {
        uuid id PK
        uuid room_id FK
        uuid agent_id FK
        timestamp joined_at
    }

    chat_messages {
        uuid id PK
        uuid room_id FK
        varchar sender_type
        uuid sender_id
        string content
        jsonb quotes
        uuid reply_to FK
        uuid target_agent_id
        timestamp created_at
    }
```

---

## 9. 文档状态图

```mermaid
stateDiagram-v2
    [*] --> Uploading: 用户上传文件

    Uploading --> Parsing: 上传完成
    Uploading --> Error: 上传失败

    Parsing --> Ready: 解析成功
    Parsing --> Error: 解析失败

    Ready --> UnderReview: 发起评审
    UnderReview --> Ready: 评审完成

    Ready --> Deleted: 用户删除
    Error --> Deleted: 用户删除
    UnderReview --> Ready: 评审取消

    Ready --> [*]
    Error --> [*]
    Deleted --> [*]

    note right of Ready: 可发起评审
    note right of UnderReview: 评审中...
    note right of Error: 可重新上传
```

---

## 10. Agent 状态图

```mermaid
stateDiagram-v2
    [*] --> Creating: 用户开始创建

    Creating --> Previewing: AI 生成预览
    Previewing --> Creating: 用户要求调整
    Previewing --> Saved: 用户确认保存

    state Creating {
        [*] --> TemplateMode: 从模板创建
        [*] --> ChatMode: 对话式创建
        TemplateMode --> Previewing
        ChatMode --> Previewing
    }

    Saved --> Editing: 用户编辑
    Editing --> Saved: 保存修改

    Saved --> InReview: 被选入评审团队
    InReview --> Saved: 评审完成

    Saved --> InChat: 加入聊天室
    InChat --> Saved: 聊天结束

    Saved --> Shared: 用户设为公开
    Shared --> Saved: 用户取消公开

    Saved --> Deleted: 用户删除
    Deleted --> [*]

    note right of Saved: 正常可用状态
    note right of Shared: 社区可见
```

---

## 11. 评审状态图

```mermaid
stateDiagram-v2
    [*] --> Configuring: 用户选择文档+Agent

    Configuring --> InProgress: 点击「开始评审」
    Configuring --> [*]: 用户取消

    InProgress --> StreamingOutput: Agent 逐个输出
    StreamingOutput --> GeneratingReport: 全部 Agent 完成
    GeneratingReport --> Completed: 报告生成成功

    Completed --> Debating: 进入聊天室辩论
    Debating --> Completed: 辩论结束 → 更新建议

    Completed --> ReReview: 重新评审
    ReReview --> Configuring: 重新选择团队

    Completed --> Exported: 导出报告
    Exported --> [*]

    note right of InProgress: 各 Agent 并行分析中
    note right of Completed: 展示评分/共识/争议/建议
    note right of Debating: 聊天室活跃中
```

---

## 12. 完整用户旅程图

```mermaid
flowchart LR
    subgraph 获取["1️⃣ 获取"]
        A1[访问落地页] --> A2[注册/登录]
    end

    subgraph 引导["2️⃣ 新手引导"]
        B1[创建第一个Agent] --> B2[评审示例文档]
        B2 --> B3[查看评审报告]
    end

    subgraph 核心使用["3️⃣ 核心使用循环"]
        C1[上传文档] --> C2[选择Agent团队]
        C2 --> C3[发起评审]
        C3 --> C4[查看报告]
        C4 --> C5{满意?}
        C5 -->|是| C6[采纳/导出]
        C5 -->|否| C7[进入辩论]
        C7 --> C8[优化文档]
        C8 --> C1
    end

    subgraph 深度使用["4️⃣ 深度使用"]
        D1[创建自定义Agent] --> D2[调教Agent参数]
        D2 --> D3[共享到社区]
        D3 --> D4[使用社区Agent]
    end

    A2 --> B1
    B3 --> C1
    C6 --> D1
    D4 --> C2

    style A1 fill:#4F46E5,color:#fff
    style C3 fill:#F59E0B,color:#fff
    style C7 fill:#EC4899,color:#fff
    style C6 fill:#10B981,color:#fff
```

---

> 📎 相关文档：
> - [产品架构](./product-architecture.md)
> - [技术架构](./technical-architecture.md)
> - [PRD-01-概述与功能列表](./PRD-DocMind-01-概述与功能列表.md)
> - [UI 设计规范](./ui-design-spec.md)
