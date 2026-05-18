#!/bin/bash
# wf-start.sh - 开始一个 Issue 任务
# 用法: bash scripts/workflow/wf-start.sh <issue_number>

set -e

ISSUE_NUMBER=$1

if [ -z "$ISSUE_NUMBER" ]; then
  echo "❌ 请提供 Issue 编号"
  echo "用法: bash scripts/workflow/wf-start.sh <issue_number>"
  exit 1
fi

CURRENT_USER=$(gh api user --jq '.login')
REPO=$(gh repo view --json nameWithOwner --jq '.nameWithOwner')

# 1. 校验 Issue 是否指派给当前用户
ASSIGNEE=$(gh issue view "$ISSUE_NUMBER" --repo "$REPO" --json assignees --jq '.assignees[].login')
if [ "$ASSIGNEE" != "$CURRENT_USER" ]; then
  echo "❌ Issue #${ISSUE_NUMBER} 未指派给你（指派给了: ${ASSIGNEE:-未指派}）"
  echo "请联系管理者确认任务指派。"
  exit 1
fi

# 2. 获取 Issue 信息
ISSUE_TITLE=$(gh issue view "$ISSUE_NUMBER" --repo "$REPO" --json title --jq '.title')
ISSUE_LABELS=$(gh issue view "$ISSUE_NUMBER" --repo "$REPO" --json labels --jq '[.labels[].name] | join(",")')

# 3. 确定分支类型
BRANCH_TYPE="feature"
if echo "$ISSUE_LABELS" | grep -q "type:bug"; then
  BRANCH_TYPE="fix"
elif echo "$ISSUE_LABELS" | grep -q "type:improvement"; then
  BRANCH_TYPE="improve"
fi

# 4. 生成分支名（提取简短描述）
BRANCH_DESC=$(echo "$ISSUE_TITLE" | sed 's/\[.*\] *//' | sed 's/ /-/g' | head -c 40)
BRANCH_NAME="${BRANCH_TYPE}/${ISSUE_NUMBER}-${BRANCH_DESC}"

# 5. 检查是否已有活跃分支
EXISTING_BRANCH=$(git branch -r --list "origin/${BRANCH_TYPE}/${ISSUE_NUMBER}-*" 2>/dev/null | head -1 | xargs)
if [ -n "$EXISTING_BRANCH" ]; then
  echo "⚠️ Issue #${ISSUE_NUMBER} 已有分支: ${EXISTING_BRANCH}"
  echo "切换到已有分支..."
  LOCAL_BRANCH=$(echo "$EXISTING_BRANCH" | sed 's|origin/||')
  git checkout "$LOCAL_BRANCH" 2>/dev/null || git checkout -b "$LOCAL_BRANCH" "$EXISTING_BRANCH"
  exit 0
fi

# 6. 从最新 main 创建分支
echo "📦 从 main 创建分支: ${BRANCH_NAME}"
git fetch origin main
git checkout -b "$BRANCH_NAME" origin/main

# 7. 更新 Issue 状态为开发中
gh issue edit "$ISSUE_NUMBER" --repo "$REPO" --remove-label "待开发" --add-label "开发中" 2>/dev/null || true

echo ""
echo "✅ 任务开始！"
echo "  Issue: #${ISSUE_NUMBER} ${ISSUE_TITLE}"
echo "  分支:  ${BRANCH_NAME}"
echo ""
echo "现在可以开始开发了。完成后说「开发完成，帮我提交审查」。"
