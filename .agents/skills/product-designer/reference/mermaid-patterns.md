# Mermaid 图表模式库

## 流程图 (Flowchart)

```mermaid
flowchart TD
    Start([开始]) --> Step1[步骤1]
    Step1 --> Decision{判断?}
    Decision -->|是| Step2[步骤2]
    Decision -->|否| Step3[步骤3]
    Step2 --> End([结束])
    Step3 --> End
```

## 时序图 (Sequence)

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant Backend
    participant Database

    User->>Frontend: 执行操作
    Frontend->>Backend: 发送请求
    Backend->>Database: 查询数据
    Database-->>Backend: 返回数据
    Backend-->>Frontend: 返回响应
    Frontend-->>User: 显示结果
```

## ER 图 (Entity Relationship)

```mermaid
erDiagram
    users ||--o{ projects : "拥有"
    projects ||--o{ scenes : "包含"

    users {
        uuid id PK
        string email UK
        string name
    }

    projects {
        uuid id PK
        uuid user_id FK
        string title
        enum status
    }
```

## 状态图 (State)

```mermaid
stateDiagram-v2
    [*] --> draft: 创建
    draft --> scenes: 生成场景
    scenes --> images: 确认场景
    images --> videos: 生成图片
    videos --> completed: 生成视频
    completed --> [*]
```

## 节点形状

- [矩形]
- (圆角矩形)
- ([体育场形])
- {菱形}
- ((圆形))

## 箭头类型

- --> 实线箭头
- -.-> 虚线箭头
- ==> 粗箭头

## 图表选择指南

| 需要表达的内容 | 推荐图表 |
|--------------|---------|
| 操作步骤和决策 | Flowchart |
| 组件交互时序 | Sequence |
| 数据实体关系 | ER Diagram |
| 状态流转 | State Diagram |
| 模块结构 | Flowchart (TB) |
