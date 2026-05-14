#!/bin/bash
# wf-sync.sh - 同步最新 main 到当前分支
# 用法: bash scripts/workflow/wf-sync.sh

set -e

CURRENT_BRANCH=$(git branch --show-current)

if [ "$CURRENT_BRANCH" = "main" ]; then
  echo "❌ 当前在 main 分支，无需同步。请切换到你的任务分支。"
  exit 1
fi

echo "🔄 同步最新 main 到 ${CURRENT_BRANCH}..."

# 1. 确保工作区干净
UNCOMMITTED=$(git status --porcelain | wc -l | xargs)
if [ "$UNCOMMITTED" -gt 0 ]; then
  echo "  📦 暂存未提交的修改..."
  git stash push -m "wf-sync auto stash"
  STASHED=true
fi

# 2. 拉取最新 main
echo "  📥 拉取最新 main..."
git fetch origin main

# 3. 尝试 rebase
echo "  🔀 合并 main 到当前分支..."
if git rebase origin/main; then
  echo "  ✅ 同步成功！"
else
  echo ""
  echo "  ⚠️ 自动合并失败，有冲突需要手动处理。"
  echo ""
  echo "  冲突文件："
  git diff --name-only --diff-filter=U
  echo ""
  echo "  请告诉 AI 你想保留哪个版本，或找管理者协助。"
  echo "  解决冲突后执行: git rebase --continue"
  echo "  放弃合并执行: git rebase --abort"

  # 如果之前有 stash，提示用户
  if [ "$STASHED" = true ]; then
    echo ""
    echo "  ℹ️ 你之前有未提交的修改已暂存，冲突解决后执行: git stash pop"
  fi
  exit 1
fi

# 4. 恢复暂存的修改
if [ "$STASHED" = true ]; then
  echo "  📦 恢复暂存的修改..."
  git stash pop
fi

# 5. 显示同步后状态
AHEAD=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo "0")
echo ""
echo "  当前领先 main: ${AHEAD} 个 commit"
echo "  ✅ 同步完成！可以继续开发。"
