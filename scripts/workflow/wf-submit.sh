#!/bin/bash
# wf-submit.sh - 提交审查（lint检查 → 越界检测 → 推送 → 创建PR）
# 用法: bash scripts/workflow/wf-submit.sh

set -e

REPO=$(gh repo view --json nameWithOwner --jq '.nameWithOwner')
CURRENT_BRANCH=$(git branch --show-current)

# 0. 校验不在 main 分支
if [ "$CURRENT_BRANCH" = "main" ]; then
  echo "❌ 当前在 main 分支，不能直接从 main 提交。请先用 /wf-start 创建任务分支。"
  exit 1
fi

# 1. 从分支名提取 Issue 编号
ISSUE_NUMBER=$(echo "$CURRENT_BRANCH" | grep -oP '(?<=/)\d+' | head -1)
if [ -z "$ISSUE_NUMBER" ]; then
  echo "❌ 无法从分支名 '${CURRENT_BRANCH}' 中提取 Issue 编号"
  echo "分支命名格式应为: feature/<编号>-<描述>"
  exit 1
fi

echo "🔍 提交前检查..."
echo "  分支: ${CURRENT_BRANCH}"
echo "  关联 Issue: #${ISSUE_NUMBER}"
echo ""

# 2. 读取项目配置的命令
LINT_CMD="pnpm lint"
TYPE_CHECK_CMD="pnpm tsc --noEmit"

# 3. Lint 检查
echo "📋 [1/4] 运行 lint 检查..."
if ! eval "$LINT_CMD" 2>&1; then
  echo ""
  echo "🔴 lint 检查不通过！请修复后重试。"
  exit 1
fi
echo "  ✅ lint 通过"

# 4. 类型检查
echo "📋 [2/4] 运行类型检查..."
if ! eval "$TYPE_CHECK_CMD" 2>&1; then
  echo ""
  echo "🔴 类型检查不通过！请修复后重试。"
  exit 1
fi
echo "  ✅ 类型检查通过"

# 5. 越界检测
echo "📋 [3/4] 检测修改文件的模块边界..."
CHANGED_FILES=$(git diff --name-only origin/main..HEAD)
SHARED_FILES=""
OUT_OF_BOUNDS=""

# 获取 Issue 的模块标签
MODULE_LABEL=$(gh issue view "$ISSUE_NUMBER" --repo "$REPO" --json labels --jq '[.labels[].name | select(startswith("mod:"))] | first // ""')

if [ -n "$MODULE_LABEL" ]; then
  echo "  Issue 模块: ${MODULE_LABEL}"
  # 检查共享层文件
  while IFS= read -r file; do
    if echo "$file" | grep -qE "^(components/shared/|components/ui/|lib/utils\.ts|lib/constants/|lib/store/|lib/db/)"; then
      SHARED_FILES="${SHARED_FILES}\n  ⚠️ 共享层: ${file}"
    fi
  done <<< "$CHANGED_FILES"
fi

if [ -n "$SHARED_FILES" ]; then
  echo -e "  涉及共享层文件：${SHARED_FILES}"
  echo "  ⚠️ 共享层修改将标记为警告，需要管理者审批"
fi
echo "  ✅ 边界检测完成"

# 6. 冲突检测
echo "📋 [4/4] 检测与 main 的冲突..."
git fetch origin main --quiet
MERGE_RESULT=$(git merge-tree $(git merge-base origin/main HEAD) origin/main HEAD 2>&1 || true)
if echo "$MERGE_RESULT" | grep -q "CONFLICT"; then
  echo "  ⚠️ 检测到与 main 有冲突，建议先同步 main"
  echo "  执行: bash scripts/workflow/wf-sync.sh"
  echo ""
  read -p "是否继续提交？(y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
else
  echo "  ✅ 无冲突"
fi

echo ""
echo "═══════════════════════════════"
echo "  所有检查通过！准备提交..."
echo "═══════════════════════════════"
echo ""

# 7. 暂存并提交所有更改
git add -A
COMMIT_MSG="feat: $(gh issue view "$ISSUE_NUMBER" --repo "$REPO" --json title --jq '.title')"
git commit -m "$COMMIT_MSG" --allow-empty 2>/dev/null || true

# 8. 推送到远程
echo "📤 推送到远程..."
git push -u origin "$CURRENT_BRANCH"

# 9. 创建 PR
echo "📝 创建 PR..."
ISSUE_TITLE=$(gh issue view "$ISSUE_NUMBER" --repo "$REPO" --json title --jq '.title')

# 生成变更摘要
DIFF_STAT=$(git diff --stat origin/main..HEAD)
FILE_COUNT=$(git diff --name-only origin/main..HEAD | wc -l | xargs)

PR_BODY="## 关联 Issue

closes #${ISSUE_NUMBER}

## 改了什么

<!-- AI 生成的变更摘要，请确认或补充 -->
修改了 ${FILE_COUNT} 个文件。

变更统计：
\`\`\`
${DIFF_STAT}
\`\`\`

## 为什么改

（请补充一句话说明动机）

## 涉及模块

${MODULE_LABEL:-未检测到模块标签}

## 效果说明

<!-- 前端改动请贴截图，非 UI 改动请描述变更效果 -->

## 自测情况

- [ ] 功能正常运行
- [ ] 没有影响其他页面
- [ ] lint 检查通过
- [ ] 类型检查通过
- [ ] 未修改其他模块的文件"

# 添加警告标签
PR_LABELS="status:待审查"
if [ -n "$SHARED_FILES" ]; then
  PR_LABELS="${PR_LABELS},review:warning"
fi

PR_URL=$(gh pr create \
  --repo "$REPO" \
  --title "${ISSUE_TITLE}" \
  --body "$PR_BODY" \
  --label "$PR_LABELS" \
  --base main \
  --head "$CURRENT_BRANCH" \
  2>&1)

# 10. 更新 Issue 状态
gh issue edit "$ISSUE_NUMBER" --repo "$REPO" --remove-label "status:开发中" --add-label "status:待审查" 2>/dev/null || true

echo ""
echo "✅ PR 已创建！"
echo "  链接: ${PR_URL}"
echo ""
echo "📌 接下来请："
echo "  1. 打开 PR 链接，补充效果截图（前端改动）或确认变更描述"
echo "  2. 补充一句话说明「为什么做这个改动」"
echo "  3. 等待管理者审批"
