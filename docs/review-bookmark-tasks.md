# 评审报告标记系统开发任务

> 创建时间: 2026-06-08
> 状态: 待执行

---

## 需求背景

评审报告内容较多且长，"进入研讨"按钮仅在页面顶部，用户浏览到下方时需要滚回顶部才能操作。同时用户希望对报告中的重点段落进行标记，带入研讨室作为讨论议程。

---

## 任务拆分

### Phase 1：浮动"教研研讨"按钮（优先实现）

**目标**：将评审报告页顶部的"教研研讨"按钮改为右侧固定浮动框，滚动时始终可见。

**实现内容**：
- [ ] 在 `ReviewDetailPage` 右侧添加固定浮动框组件
- [ ] 浮动框位置：`position: fixed`，`right: 20px`，`top: 100px`
- [ ] 浮动框宽度：220px
- [ ] 浮动框内容：
  - 顶部"教研研讨"按钮（主要操作）
  - 可选：当前评审状态、文档名等辅助信息
- [ ] 保持原有 `handleCreateChat` 功能不变
- [ ] 响应式：小屏幕（<1024px）时浮动框隐藏或变为底部固定栏

---

### Phase 2：段落标记系统（后续实现）

#### 2.1 标记按钮设计与实现

- [ ] 在每个文本段落（`<p>` 标签）右侧悬浮显示 ⭐ 空心图标
- [ ] 鼠标悬停段落时星星图标显示，平时隐藏（减少视觉干扰）
- [ ] 星星大小 16px，颜色灰色，悬停变金色

#### 2.2 分类选择弹窗

- [ ] 点击星星后弹出小弹窗（非 modal，跟随星星位置）
- [ ] 5 个分类按钮：📌痛点、✨亮点、❓疑问、💡建议、📝其他
- [ ] 点击分类后弹窗关闭，完成标记

#### 2.3 标记视觉反馈

- [ ] 星星变为实心填充（金色 `#F59E0B`）
- [ ] 段落左侧添加 3px 金色竖线边框（或浅金色背景）
- [ ] 分类不同颜色区分：痛点红、亮点绿、疑问蓝、建议紫、其他灰

#### 2.4 右侧浮动框（升级 Phase 1）

- [ ] 浮动框顶部保留"教研研讨"按钮
- [ ] 分类列表（可展开/收起）：
  - 📌 痛点（3）→ 展开显示3条原文摘要
  - ✨ 亮点（2）
  - ❓ 疑问（1）
  - 💡 建议（0）
- [ ] 每条摘要显示原文前30字，悬停显示完整内容
- [ ] 分类统计数字实时更新

#### 2.5 数据持久化

- [ ] 新建 `reviewBookmarkStore`（Zustand + persist）
- [ ] 数据结构：`{ [reviewId]: ReviewBookmark[] }`
- [ ] localStorage 键名：`docmind-review-bookmarks`
- [ ] 刷新页面后标记不丢失

#### 2.6 带入研讨室

- [ ] 点击"教研研讨"时：
  1. 收集当前评审的所有标记内容
  2. 按分类组装成议程文本：
     ```
     讨论议程：
     📌 痛点：xxx；xxx
     ✨ 亮点：xxx；xxx
     ...
     ```
  3. 作为系统消息自动发送到新建的研讨室

---

## 数据结构

```typescript
// 标记分类
export type BookmarkCategory = '痛点' | '亮点' | '疑问' | '建议' | '其他'

// 标记数据
export interface ReviewBookmark {
  id: string
  reviewId: string
  content: string          // 原文摘要（前30字）
  fullContent: string      // 完整原文
  category: BookmarkCategory
  section: string           // 所属章节（如核心提炼、角色细评等）
  createdAt: string
}

// Store 结构
interface ReviewBookmarkState {
  bookmarks: Record<string, ReviewBookmark[]>  // key: reviewId
  addBookmark: (reviewId: string, bookmark: Omit<ReviewBookmark, 'id' | 'createdAt'>) => void
  removeBookmark: (reviewId: string, bookmarkId: string) => void
  getBookmarksByReview: (reviewId: string) => ReviewBookmark[]
  getBookmarksByCategory: (reviewId: string, category: BookmarkCategory) => ReviewBookmark[]
}
```

---

## 涉及文件

| 文件 | 修改内容 |
|------|----------|
| `ReviewDetailPage.tsx` | 添加浮动框、段落标记按钮、视觉反馈 |
| `stores/reviewBookmarkStore.ts` | 新建标记数据存储 |
| `components/ui/BookmarkFloatingPanel.tsx` | 新建右侧浮动框组件 |
| `components/ui/BookmarkCategoryPopover.tsx` | 新建分类选择弹窗组件 |

---

## 备注

- Phase 1 优先实现浮动"教研研讨"按钮
- Phase 2 后续实现完整的段落标记系统
- 所有改动等待用户确认后执行
