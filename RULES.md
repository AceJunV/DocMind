# DocMind - 团队开发规则

> 本文件是 AI 工具的核心规则文件。所有 AI 工具（Claude Code、Codex、Open Code、Cursor）启动时自动读取。
> ⚠️ 此文件由 PM 工具自动生成，请勿手动修改。修改模板请到 PM 仓库。

---

## 一、项目信息

- **项目名称：** DocMind
- **技术栈：** React (Vite + TypeScript + Tailwind CSS + Zustand)
- **包管理器：** pnpm
- **开发命令：** `pnpm dev`
- **Lint 命令：** `pnpm lint`
- **类型检查：** `pnpm tsc --noEmit`

---

## 二、Git 工作流规则

### 分支命名

```
feature/<issue编号>-<简短描述>    # 新功能
fix/<issue编号>-<简短描述>        # Bug修复
improve/<issue编号>-<简短描述>    # 优化改进
hotfix/<简短描述>                 # 紧急修复（仅管理者）
```

### Commit 格式

```
<type>: <简短描述>

type 可选值：feat / fix / improve / refactor / style / docs / chore
```

### 禁止事项

- ❌ **禁止直接 push 到 main 分支**（分支保护会阻止）
- ❌ **禁止 force push**（`git push -f`）
- ❌ **禁止在非自己分支上工作**
- ❌ **禁止修改其他模块的文件**（见模块边界）
- ❌ **禁止引入新的 npm 依赖**（需要时通知管理者决定）
- ❌ **禁止删除或重命名共享层文件**

---

## 三、模块边界映射

> **核心规则：只允许修改当前 Issue 所属模块的目录。需要改其他模块时，停下来通知用户告知管理者。**

| 模块 | 标签 | 覆盖目录 | 说明 |
|------|------|----------|------|
| 聊天引擎 | `mod:聊天引擎` | `frontend/src/services/chatEngine/` | chatEngine 核心策略、事件路由、上下文组装 |
| 聊天UI | `mod:聊天UI` | `frontend/src/components/chat/, frontend/src/pages/chat/` | 聊天室页面、工具栏、搜索、书签 |
| 文档管理 | `mod:文档管理` | `frontend/src/pages/documents/, frontend/src/services/documentParser.ts, frontend/src/stores/documentStore.ts` | 文档列表、详情、解析服务 |
| 评审系统 | `mod:评审系统` | `frontend/src/pages/reviews/, frontend/src/services/reviewEngine.ts, frontend/src/services/compareService.ts, frontend/src/components/reviews/, frontend/src/stores/reviewStore.ts` | 评审引擎、对比、Diff查看器 |
| Agent管理 | `mod:Agent管理` | `frontend/src/pages/agents/, frontend/src/stores/agentStore.ts` | Agent 创建、编辑、列表 |
| 认证 | `mod:认证` | `frontend/src/pages/auth/, frontend/src/components/auth/, frontend/src/stores/authStore.ts` | 登录、注册、路由守卫 |
| 共享层 | `mod:共享层` | `frontend/src/components/ui/, frontend/src/components/layout/, frontend/src/lib/, frontend/src/utils/, frontend/src/types/, frontend/src/stores/themeStore.ts, frontend/src/stores/settingsStore.ts` | UI组件库、工具函数、类型定义、布局 |

### 共享层特殊规则

共享层（`mod:共享层`）的文件需要特别注意：
- 修改共享层文件时必须在提交中**明确标注**
- 共享层文件的 PR 需要管理者审批，副审批人不可合入
- 涉及共享层目录：frontend/src/components/ui/, frontend/src/components/layout/, frontend/src/lib/, frontend/src/utils/, frontend/src/types/, frontend/src/stores/themeStore.ts, frontend/src/stores/settingsStore.ts

---

## 四、Issue 工作规范

### Issue 标签（必须使用中文）

所有 Issue 必须带以下状态标签之一：

- `待开发` — Issue 已创建，等待开始
- `开发中` — 正在开发（运行 wf-start.sh 后自动添加）
- `待审查` — PR 已提交，等待 AI 检测
- `需修改` — AI 检测失败，需要修复
- `已完成` — PR 已合并

**禁止使用英文标签**（如 todo、in-progress、done 等）。

### 工作规范

1. **只做指派给你的 Issue**，不要自己领取未指派的任务
2. **一次只做一个 Issue**（等合并后再做下一个，或做不同模块的）
3. **一个 Issue = 一个分支 = 一个 PR**，不要在一个分支上做多个 Issue
4. 如果开发过程中发现需要改其他模块的代码，**停下来告诉用户**，让用户通知管理者
5. 如果发现了不属于当前 Issue 的 Bug，**不要顺手修**，让用户告知管理者新建 Issue

---

## 五、PR 提交规范

### 提交前必须通过

- [ ] `pnpm lint` 无错误
- [ ] `pnpm tsc --noEmit` 无错误
- [ ] 没有修改其他模块的文件
- [ ] 与最新 main 无冲突

### PR 描述（AI 自动生成）

- **变更摘要：** AI 根据 diff 自动生成
- **涉及模块：** AI 根据修改文件自动标注
- **效果说明：** 前端改动由成员补充截图；非 UI 改动由 AI 生成文字描述
- **动机：** 成员手动补充一句话

### PR 关联

PR 描述中必须包含 `closes #<Issue编号>` 以自动关联。

---

## 六、代码风格

- 使用 TypeScript，不使用 JavaScript
- 组件使用函数式组件 + Hooks
- 样式使用 Tailwind CSS，不使用内联 style 或 CSS 文件
- 命名：组件 PascalCase，函数/变量 camelCase，常量 UPPER_SNAKE_CASE
- 文件命名：组件文件 PascalCase，工具文件 kebab-case

---

## 七、工作流触发词

> 以下触发词适用于所有 AI 工具。说出触发词或类似表达，AI 应调用对应脚本。

| 触发词 | 对应脚本 | 功能 |
|--------|---------|------|
| "查看我的任务"、"我的任务"、"待办" | `scripts/workflow/wf-tasks.sh` | 查询指派给我的 Issue |
| "开始任务"、"开始做 Issue #N" | `scripts/workflow/wf-start.sh <N>` | 校验指派→建分支→改状态 |
| "提交审查"、"做完了"、"开发完成" | `scripts/workflow/wf-submit.sh` | lint→越界检测→推送→创建PR |
| "分支状态"、"当前状态" | `scripts/workflow/wf-status.sh` | 领先/落后/冲突/PR状态 |
| "同步main"、"更新主线" | `scripts/workflow/wf-sync.sh` | 拉取最新main合并到当前分支 |

---

*此文件由 PM 工具（deploy-workflow.sh）自动生成*
*模板版本：v1.0*
*项目配置：docmind*
