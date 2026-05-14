# Claude Code 工作流规则

> 此文件从 RULES.md 自动生成，请勿手动修改。

## 核心规则

请严格遵守项目根目录的 `RULES.md` 中的所有规则。以下是关键摘要：

### 禁止事项

- ❌ 禁止直接 push 到 main 分支
- ❌ 禁止 force push
- ❌ 禁止修改其他模块的文件
- ❌ 禁止引入新的 npm 依赖（需要时通知管理者）
- ❌ 禁止删除或重命名共享层文件

### 工作流 Skill

当用户说出以下触发词时，直接调用对应脚本：

- 「查看我的任务」→ `bash scripts/workflow/wf-tasks.sh`
- 「开始做 Issue #N」→ `bash scripts/workflow/wf-start.sh N`
- 「提交审查」/「做完了」→ `bash scripts/workflow/wf-submit.sh`
- 「分支状态」→ `bash scripts/workflow/wf-status.sh`
- 「同步 main」→ `bash scripts/workflow/wf-sync.sh`

### 模块边界

只允许修改当前 Issue 所属模块的目录。需要改其他模块时，停下来通知用户。
