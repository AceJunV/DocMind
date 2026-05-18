#!/bin/bash
# wf-tasks.sh - 查看指派给当前用户的 Issue
# 用法: bash scripts/workflow/wf-tasks.sh

set -e

CURRENT_USER=$(gh api user --jq '.login')
REPO=$(gh repo view --json nameWithOwner --jq '.nameWithOwner')

echo "📋 ${CURRENT_USER} 的任务列表"
echo "================================"

echo ""
echo "🔴 开发中："
gh issue list --repo "$REPO" --assignee "$CURRENT_USER" --label "开发中" --json number,title,labels --jq '.[] | "  #\(.number) \(.title)"'

echo ""
echo "🟡 待开发："
gh issue list --repo "$REPO" --assignee "$CURRENT_USER" --label "待开发" --json number,title,labels --jq '.[] | "  #\(.number) \(.title)"'

echo ""
echo "🔵 待审查（PR 已提交）："
gh issue list --repo "$REPO" --assignee "$CURRENT_USER" --label "待审查" --json number,title,labels --jq '.[] | "  #\(.number) \(.title)"'

echo ""
echo "🟠 需修改（PR 被打回）："
gh issue list --repo "$REPO" --assignee "$CURRENT_USER" --label "需修改" --json number,title,labels --jq '.[] | "  #\(.number) \(.title)"'

echo ""
echo "================================"
TOTAL=$(gh issue list --repo "$REPO" --assignee "$CURRENT_USER" --state open --json number --jq 'length')
echo "共 ${TOTAL} 个进行中的任务"
