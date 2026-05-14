#!/bin/bash
# wf-status.sh - 查看当前分支状态
# 用法: bash scripts/workflow/wf-status.sh

set -e

CURRENT_BRANCH=$(git branch --show-current)
REPO=$(gh repo view --json nameWithOwner --jq '.nameWithOwner')

echo "📊 分支状态"
echo "================================"
echo "  当前分支: ${CURRENT_BRANCH}"

if [ "$CURRENT_BRANCH" = "main" ]; then
  echo "  你在 main 分支上，请先用 /wf-start 创建任务分支。"
  exit 0
fi

# 同步远程信息
git fetch origin main --quiet 2>/dev/null || true

# 领先/落后
AHEAD=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo "0")
BEHIND=$(git rev-list --count HEAD..origin/main 2>/dev/null || echo "0")
echo "  领先 main: ${AHEAD} 个 commit"
echo "  落后 main: ${BEHIND} 个 commit"

# 同步建议
if [ "$BEHIND" -gt 5 ]; then
  echo "  ⚠️ 落后较多，建议执行: bash scripts/workflow/wf-sync.sh"
elif [ "$BEHIND" -gt 0 ]; then
  echo "  ℹ️ 略有落后，暂无需同步"
else
  echo "  ✅ 与 main 同步"
fi

# 未提交的修改
UNCOMMITTED=$(git status --porcelain | wc -l | xargs)
if [ "$UNCOMMITTED" -gt 0 ]; then
  echo ""
  echo "  📝 未提交的修改: ${UNCOMMITTED} 个文件"
  git status --short
fi

# PR 状态
echo ""
echo "📋 PR 状态"
ISSUE_NUMBER=$(echo "$CURRENT_BRANCH" | grep -oP '(?<=/)\d+' | head -1)
if [ -n "$ISSUE_NUMBER" ]; then
  PR_INFO=$(gh pr list --repo "$REPO" --head "$CURRENT_BRANCH" --json number,state,reviewDecision,labels --jq '.[0] // empty')
  if [ -n "$PR_INFO" ]; then
    PR_NUMBER=$(echo "$PR_INFO" | jq -r '.number')
    PR_STATE=$(echo "$PR_INFO" | jq -r '.state')
    PR_REVIEW=$(echo "$PR_INFO" | jq -r '.reviewDecision // "PENDING"')
    echo "  PR #${PR_NUMBER}: ${PR_STATE}"
    echo "  审查状态: ${PR_REVIEW}"
  else
    echo "  尚未创建 PR"
  fi
fi

echo ""
echo "================================"
