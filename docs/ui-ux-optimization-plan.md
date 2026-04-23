# DocMind UI/UX 优化计划

**版本**: v0.3.2 | **日期**: 2026-04-23 | **状态**: 待实施

---

## 1. 概述

基于 v0.3.1 迭代的 UI/UX 审查，以及全站代码审计，共发现 **47 个问题**。本文档按严重程度分类，给出具体修复方案和优先级。

| 严重程度 | 数量 | 建议处理阶段 |
|---------|:----:|------------|
| Critical | 4 | v0.3.2 立即修复 |
| Medium | 17 | v0.3.2 修复 |
| Low | 26 | v0.4.0 逐步优化 |

---

## 2. Critical — 必须立即修复

### C-1: 评审运行中无取消/中断按钮

- **文件**: `pages/reviews/ReviewCreatePage.tsx:259-331`
- **问题**: 评审运行中（`phase === 'running'`）用户无法取消。`AbortController` 已创建（line 130）但 UI 上没有按钮触发 `abort()`。用户只能等待或刷新页面，刷新后评审记录会卡在 `in_progress` 状态。
- **修复**: 在 `phase === 'running'` 的 UI 区块添加"取消评审"按钮，点击后调用 `abortRef.current?.abort()`、清除定时器、跳转回列表页或展示已有部分结果。
- **联动注意**（N-2 并发改造）: 并发模式下多个 `executeAgentReview` 共享同一个 `AbortController` signal，取消按钮逻辑无需修改，已自动终止所有并行请求。

### C-2: Header 清除数据使用原生 confirm()

- **文件**: `components/layout/Header.tsx:168`
- **问题**: "清除数据"操作使用 `window.confirm()`，无法自定义样式，深色模式下显示异常，与全站统一的 `ConfirmDialog` 不一致。
- **修复**: 引入 `ConfirmDialog` 组件替代原生 `confirm()`，与文档删除、聊天室删除等操作保持一致。

### C-3: 设置页两处使用原生 confirm()

- **文件**: `pages/settings/SettingsPage.tsx:304, 587`
- **问题**: Line 304 删除配置用 `confirm()`，Line 587 清除数据用 `confirm()`。视觉不一致，深色模式下突兀。
- **修复**: 新增 `deleteTarget` state + `ConfirmDialog` 组件处理配置删除；清除数据操作同样用 `ConfirmDialog`。

### C-4: 评审摘要生成失败无容错

- **文件**: `pages/reviews/ReviewCreatePage.tsx:188-204`
- **问题**: `generateSummary` 调用（line 204）未被 try/catch 包裹。若摘要生成失败，整个函数抛异常，`setPhase('done')` 永远不会执行，评审卡在 `in_progress` 状态，用户看不到任何反馈。
- **修复**: 将 `generateSummary` 包裹在独立 try/catch 中，失败时仍将评审标记为 `completed`，展示已有结果并提示"摘要生成失败"。

---

## 3. Medium — v0.3.2 修复

### M-1 ~ M-3: Dashboard 列表有 hover 效果但不可点击

- **文件**: `pages/DashboardPage.tsx:134, 176, 214`
- **问题**: 角色排行、最近评审、最近动态列表项有 `hover:bg-gray-50 transition-colors` 但无点击事件，用户误以为可以交互。
- **修复**:
  - 角色排行项 → 用 `Link` 跳转到 `/agents`
  - 最近评审项 → 用 `Link` 跳转到 `/reviews/${review.id}`
  - 最近动态 → 根据类型跳转到对应实体页面，或移除 hover 效果

### M-4: 雷达图深色模式不可读

- **文件**: `components/ui/RadarChart.tsx:72, 78, 112`
- **问题**: SVG 使用硬编码浅色：网格线 `#e5e7eb`、轴线 `#d1d5db`、标签 `gray-600`。深色模式下几乎不可见。
- **修复**: 使用 CSS `currentColor` 配合 Tailwind `className="text-gray-400"` 替代硬编码颜色，或传入主题感知的颜色参数。

### M-5 ~ M-6: 深色模式覆盖不完整

- **文件**: `index.css` + 多个页面
- **问题**: 深色模式仅覆盖 `bg-white`、`bg-gray-50/100`、文字色和边框色。大量语义色背景（`bg-emerald-50`、`bg-blue-50`、`bg-amber-50`、`bg-red-50`、`bg-purple-50`、`bg-orange-50`、`bg-primary-50/100`）及其上的文字色均未覆盖深色模式。
- **受影响组件**:
  - ReviewCreatePage 维度进度区 (`bg-emerald-50`, `bg-primary-50`)
  - DashboardPage 统计条 (`bg-primary-50`)
  - ReviewDetailPage 多处 (`bg-emerald-50`, `bg-amber-50`, `bg-red-50`)
  - Toast 组件 (`bg-emerald-50`, `bg-red-50`, `bg-blue-50`)
  - ConfirmDialog (`bg-red-50`)
- **修复**: 系统性地为所有语义色背景添加深色模式覆盖，或迁移至 Tailwind `dark:` 变体类。

### M-7: "Agent" vs "角色" 命名不一致

- **文件**: 多个页面
- **问题**: 同一概念在 UI 上混用英文 "Agent" 和中文 "角色"，造成困惑。
- **不一致位置**:

| 文件 | 当前文案 | 建议统一为 |
|------|---------|-----------|
| ReviewCreatePage:116 | "最多选择 5 个 Agent" | "最多选择 5 个角色" |
| ReviewCreatePage:384 | "选择评审 Agent" | "选择评审角色" |
| ReviewCreatePage:435 | "N 位 Agent" | "N 位角色" |
| ChatRoomPage:329,361 | "邀请 Agent" | "邀请角色" |
| ChatRoomPage:431 | "N 位 Agent" | "N 位角色" |
| ChatListPage:97,113 | "请先添加 Agent" | "请先添加角色" |
| ChatListPage:159 | "与 AI Agent 深度辩论" | "与 AI 角色深度辩论" |
| ChatListPage:195 | "与 Agent 深入讨论" | "与角色深入讨论" |
| ChatListPage:387 | "N 位 Agent" | "N 位角色" |
| DocumentDetailPage:103 | "选择 Agent 开始评审" | "选择角色开始评审" |
| CommandPalette:21 | "Agent 工坊" | "评审团" |
| OnboardingGuide:23-24 | "评审 Agent" / "Agent 工坊" | "评审角色" / "评审团" |

- **修复**: 全站统一为"角色"或"评审角色"，仅技术文档/代码注释中保留 "Agent"。

### M-8: 评审页 toast 语言混杂

- **文件**: `pages/reviews/ReviewCreatePage.tsx:116`
- **问题**: `toast('info', '最多选择 5 个 Agent')` 中英混杂。
- **修复**: 改为"最多选择 5 个角色"。

### M-9: 聊天室"邀请 Agent"标签使用英文

- **文件**: `pages/chat/ChatRoomPage.tsx:329, 361, 431`
- **问题**: 按钮和标题写"邀请 Agent"、"N 位 Agent"。
- **修复**: 统一为"邀请角色"、"N 位角色"。

### M-10: 复制到剪贴板无错误处理

- **文件**: `pages/reviews/ReviewDetailPage.tsx:170-173`
- **问题**: `navigator.clipboard.writeText()` 返回 Promise 但未被 await/catch。部分浏览器（如非 HTTPS 下的 Firefox）会 reject，toast 却总是显示"已复制"。
- **修复**: `try { await navigator.clipboard.writeText(...) } catch { toast('error', '复制失败，请手动复制') }`

### M-11: 评审导出按钮未说明格式

- **文件**: `pages/reviews/ReviewDetailPage.tsx:156-168`
- **问题**: 导出按钮文案为"下载报告"，未告知用户格式为 Markdown。对不熟悉 Markdown 的教研老师可能困惑。
- **修复**: 改为"下载 Markdown 报告"，或增加格式选择下拉。

### M-12 ~ M-13: 文档卡片"发起评审"/"查看详情"是伪链接

- **文件**: `pages/documents/DocumentListPage.tsx:244, 286-292`
- **问题**: "发起评审"和"查看详情"文字看起来像链接，但被 `pointer-events-none` 容器禁用了点击。整个卡片点击跳转到详情页。
- **修复**:
  - "发起评审" → 添加 `pointer-events-auto` + `e.stopPropagation()` + 链接到 `/reviews/create?doc=${doc.id}`
  - "查看详情" → 移除此文字（整张卡片已经是链接）

### M-14: 进行中的评审卡片点击后可能无数据

- **文件**: `pages/reviews/ReviewListPage.tsx:161-171`
- **问题**: `in_progress` 状态的评审链接到详情页，但 ReviewDetailPage 没有处理进行中状态的展示逻辑，可能显示空数据或"评审记录不存在"。
- **修复**: 在 ReviewDetailPage 添加 `in_progress` 状态展示（如进度提示），或在列表页禁用未完成评审的链接。

### M-15: AgentCreatePage 与 AgentListPage AI 创建流代码重复

- **文件**: `pages/agents/AgentCreatePage.tsx`（整个文件） vs `pages/agents/AgentListPage.tsx:799-1034`
- **问题**: 两个文件包含近乎相同的 AI 创建对话流：相同的 prompt、聊天界面、JSON 解析、预览渲染。
- **修复**: 提取为共享组件（如 `AICreateFlow`），两个页面共同引用。

### M-16: 主题切换不支持"跟随系统"

- **文件**: `components/layout/Header.tsx:51-53`
- **问题**: `themeStore` 支持 `light`/`dark`/`system` 三种模式，但 Header 按钮只在 light 和 dark 间切换：`setTheme(theme === 'dark' ? 'light' : 'dark')`，`system` 选项不可达。
- **修复**: 改为三态循环切换 `light → dark → system → light`，或使用下拉菜单选择。

### M-17: 主题切换按钮无状态提示

- **文件**: `components/layout/Header.tsx:133-139`
- **问题**: 按钮只显示太阳/月亮图标，无 tooltip 或文字标签告知当前模式和操作含义。
- **修复**: 添加 `title` 属性，如"当前: 浅色模式 | 点击切换"。

---

## 4. Low — v0.4.0 逐步优化

### L-1: Dashboard"发起评审"跳转到列表而非创建页

- **文件**: `pages/DashboardPage.tsx:19`
- **问题**: 快捷操作 `path: '/reviews'` 跳到列表页而非直接创建。
- **修复**: 改为 `/reviews/create`。

### L-2: Dashboard 标题硬编码 `text-gray-90`0 依赖全局覆盖

- **文件**: `pages/DashboardPage.tsx:65, 121, 166, 209`
- **修复**: 考虑用 Tailwind `dark:` 变体替代依赖全局覆盖。

### L-3: `formatTimeAgo` 函数复制 5 次

- **文件**: `DashboardPage.tsx:27`、`DocumentListPage.tsx:35`、`DocumentDetailPage.tsx:15`、`ChatListPage.tsx:15`、`ReviewListPage.tsx:8`
- **修复**: 提取到 `@/utils/formatTime.ts`，统一导入。

### L-4: Dashboard 欢迎栏渐变未做深色适配验证

- **文件**: `pages/DashboardPage.tsx:56-61`
- **修复**: 验证深色模式下渐变和相邻元素的视觉一致性。

### L-5: 星级评分为 0 时不显示星

- **文件**: `ReviewDetailPage.tsx:303`、`ReviewListPage.tsx:111`
- **问题**: `Math.round(0.3)` = 0，显示零颗星。
- **修复**: `Math.max(1, Math.round(score))`。

### L-6: ReviewDetailPage 无骨架屏/加载态

- **文件**: `pages/reviews/ReviewDetailPage.tsx`
- **问题**: Store 未 hydrate 时短暂显示"评审记录不存在"。
- **修复**: 添加 loading 骨架屏状态。

### L-7: DocumentDetailPage file_size 无空值保护

- **文件**: `pages/documents/DocumentDetailPage.tsx:75`
- **修复**: 提取共享的 `formatFileSize` 工具函数。

### L-8: ChatRoomPage API 未配置时"设置页面"非链接

- **文件**: `pages/chat/ChatRoomPage.tsx:212-219`
- **修复**: "设置页面"文字改为 `<Link to="/settings">`。

### L-9: "关闭聊天室"按钮无确认弹窗

- **文件**: `pages/chat/ChatRoomPage.tsx:331-337`
- **修复**: 添加 `ConfirmDialog` 确认。

### L-10: 设置页测试连接无超时

- **文件**: `pages/settings/SettingsPage.tsx:52-73`
- **修复**: 添加 30 秒超时，超时后标记为失败。

### L-11 ~ L-12: CommandPalette 和 OnboardingGuide 命名不一致

- **文件**: `components/ui/CommandPalette.tsx:21`、`components/ui/OnboardingGuide.tsx:24`
- **问题**: 引用"Agent 工坊"而页面标题为"教研评审团"。
- **修复**: 统一为"评审团"。

### L-13: MainLayout 深色模式依赖全局覆盖

- **文件**: `components/layout/MainLayout.tsx:6`
- **修复**: 使用 Tailwind `dark:bg-[#0f1117]` 显式声明。

### L-14: 卡片 hover 动画可能引起布局偏移

- **文件**: `DocumentListPage.tsx:242`、`AgentListPage.tsx:247`
- **修复**: 添加 `transform-gpu` 或用 `scale` 替代 `translate`。

### L-15: ReviewDetailPage 操作栏无响应式适配

- **文件**: `pages/reviews/ReviewDetailPage.tsx:253-278`
- **修复**: 按钮容器添加 `flex-wrap`，小屏时自动换行。

### L-16: ~~AgentListPage 预设新增按钮名称可优化~~（已废弃）

- **文件**: `pages/agents/AgentListPage.tsx:1193`
- ~~**修复**: 改为"从模板新增"更明确。~~
- **废弃原因**: N-3（统一新增按钮）将三个按钮合并为一个"新增角色"按钮，L-16 的重命名建议已无意义，不再执行。

### L-17: AgentManageCard onImport 命名误导

- **文件**: `pages/agents/AgentListPage.tsx:240, 287-293`
- **修复**: 重命名为 `onImportClick`。

### L-18: ChatListPage 空状态文案含英文 Agent

- **文件**: `pages/chat/ChatListPage.tsx:195`
- **修复**: "与 Agent 深入讨论" → "与角色深入讨论"。

### L-19 ~ L-20: Toast 和 ConfirmDialog 深色模式缺失

- **文件**: `components/ui/Toast.tsx:21-23`、`components/ui/ConfirmDialog.tsx`
- **修复**: 添加深色模式样式覆盖。

### L-21 ~ L-23: Button/Badge/Input 组件定义但未使用

- **文件**: `components/ui/Button.tsx`、`Badge.tsx`、`Input.tsx`
- **修复**: 逐步在各页面中采用这些组件，提升设计一致性。

### L-24: 评审开始时首批 Agent 显示"待处理"时间过长

- **文件**: `pages/reviews/ReviewCreatePage.tsx:126-127`
- **修复**: 评审启动后先显示"准备中..."状态。

### L-25: Header 和 Settings 两个"清除数据"行为不同

- **文件**: `components/layout/Header.tsx:167-175` vs `pages/settings/SettingsPage.tsx`
- **问题**: Header 的"清除数据"用 `localStorage.clear()` 清除一切（含 API 配置），Settings 的"清除数据（保留配置）"仅清业务数据。标签类似但行为不同。
- **修复**: Header 按钮改为"重置所有数据"并明确提示会清除 API 配置。

### L-26: 深色模式滚动条颜色不协调

- **文件**: `index.css:125-141`
- **修复**: 添加 `.dark ::-webkit-scrollbar-thumb { background: #374151; }`。

---

## 5. 修复优先级路线图

### 第一批: Critical + 高频 Medium（v0.3.2-a）

| 优先级 | ID | 修复内容 | 影响页面 | 预估工时 |
|:------:|:--:|---------|---------|:-------:|
| P0 | C-1 | 添加评审取消按钮 | ReviewCreatePage | 2h |
| P0 | C-2, C-3 | 原生 confirm() → ConfirmDialog | Header, SettingsPage | 1.5h |
| P0 | C-4 | 摘要生成容错 | ReviewCreatePage | 1h |
| P0 | M-7, M-8, M-9 | Agent/角色 命名统一 | 全站 12+ 处 | 1h |
| P1 | M-12, M-13 | 文档卡片伪链接修复 | DocumentListPage | 1h |
| P1 | M-1~M-3 | Dashboard hover 元素可点击化 | DashboardPage | 1.5h |

**小计: 约 8 小时**

### 第二批: 深色模式 + 交互完善（v0.3.2-b）

| 优先级 | ID | 修复内容 | 影响页面 | 预估工时 |
|:------:|:--:|---------|---------|:-------:|
| P1 | M-4 | 雷达图深色模式 | RadarChart | 1.5h |
| P1 | M-5, M-6 | 语义色深色模式系统性覆盖 | index.css + 多页面 | 3h |
| P1 | M-10 | 剪贴板错误处理 | ReviewDetailPage | 0.5h |
| P1 | M-11 | 导出格式标注 | ReviewDetailPage | 0.5h |
| P1 | M-14 | 进行中评审详情页处理 | ReviewDetailPage, ReviewListPage | 1.5h |
| P1 | M-16, M-17 | 主题切换三态 + 提示 | Header | 1h |

**小计: 约 8 小时**

### 第三批: Low 级批量修复（v0.4.0）

| 优先级 | ID | 修复内容 | 预估工时 |
|:------:|:--:|---------|:-------:|
| P2 | L-1 | Dashboard 快捷操作路径修正 | 5min |
| P2 | L-3 | formatTimeAgo 提取工具函数 | 30min |
| P2 | L-5 | 星级评分最低 1 星 | 10min |
| P2 | L-6 | ReviewDetailPage 骨架屏 | 1h |
| P2 | L-7 | formatFileSize 提取工具函数 | 30min |
| P2 | L-8 | 设置页面链接化 | 10min |
| P2 | L-9 | 关闭聊天室确认弹窗 | 15min |
| P2 | L-15 | 操作栏响应式 | 30min |
| P2 | L-19, L-20 | Toast/ConfirmDialog 深色模式 | 1h |
| P2 | L-25 | 清除数据按钮行为区分 | 30min |
| P2 | L-26 | 滚动条深色模式 | 10min |
| P2 | L-11, L-12, L-18 | 命名一致性补充 | 15min |
| P2 | L-21~L-23 | 逐步采用 Button/Badge/Input 组件 | 3h |

**小计: 约 8 小时**

---

## 6. 工时总结

| 批次 | 范围 | 预估工时 | 修复数 |
|------|------|:-------:|:-----:|
| v0.3.2-a | Critical + 核心中等 | 8h | 10 |
| v0.3.2-b | 深色模式 + 交互完善 | 8h | 8 |
| v0.4.0 | Low 级批量修复 | 8h | 18 |
| **合计** | — | **24h** | **36** |

> 注: 11 个 Low 级问题（M-15 代码重构、M-16~17 主题切换、L-2/4/13/14/16/17/24 等）归入日常维护，不占专门工时。

---

## 7. 与聊天室增强计划的关系

本优化计划与 `docs/chat-room-enhancement-plan.md` 是**并行**关系：

- **本计划**：修复现有 UI/UX 问题，提升基础体验质量
- **聊天室计划**：新增聊天室核心功能，扩展能力

> **重要区分**：`chat-room-enhancement-plan.md` 第 3.2 节注明"控制并发（同时最多 1 个 Agent 输出）"，这是**聊天室引擎**的排队输出逻辑（防止多个 Agent 同时"说话"），与本计划 N-2 中的**评审并发**（允许多角色同时调用 LLM 评审同一份文档）是**完全不同的两件事**，不存在冲突。

建议执行顺序：
1. 先完成 v0.3.2-a（Critical 修复），消除阻塞性问题
2. 并行启动聊天室 Phase 1（核心引擎重构）
3. v0.3.2-b 和聊天室 Phase 2-3 交替进行
4. 聊天室完成后做 v0.4.0 批量优化

---

> 相关文档:
> - [聊天室增强开发规划](./chat-room-enhancement-plan.md)
> - [开发规划](./development-plan.md)
> - [产品架构](./product-architecture.md)
> - [UI 设计规范](./ui-design-spec.md)

---

## 8. 新增优化项（本次迭代补充）

以下条目为 v0.3.2 迭代新增，优先级排在 C 级修复之后。

### N-1: 评审等待动画重设计

- **文件**: `pages/reviews/ReviewCreatePage.tsx`（`DimensionProgress` 组件）
- **问题**: 当前网格 chip 动画（旋转图标 + 脉冲闪烁）信息密度低，缺乏"任务推进"的真实感，用户无法感知进度细节。
- **修复**: 改为**终端任务清单风格**——每个维度一行，完成后显示删除线（`line-through`）+ ✅，进行中显示颜文字循环动画（`(｀・ω・´)` 等 8 个轮播），待处理行灰色半透明。每维度预设专属 emoji 前缀与任务描述文案。
- **优先级**: P0 | **预估工时**: 1.5h

### N-2: 并发评审 + 模型设置提示

- **文件**: `types/index.ts`（`ModelConfig`）、`stores/settingsStore.ts`、`pages/settings/SettingsPage.tsx`、`pages/reviews/ReviewCreatePage.tsx`
- **问题**: 评审严格串行（`for...of + await`），多角色评审时总耗时 = 各角色耗时之和。大多数模型服务商支持并发，串行浪费了带宽。
- **修复**:
  1. `ModelConfig` 新增 `maxConcurrentReviews?: number`（默认 1）
  2. 设置页新增并发数量选择器（1/2/3/全部），附说明"⚠️ 并行评审会同时发起多个 API 请求，请确认服务商支持并发，否则可能限流"
  3. `handleStart` 改用 semaphore 并发池，`maxConcurrent=1` 时退化为串行
  4. C-1 取消按钮逻辑无需改动（单 AbortController signal 自动取消所有并发请求）
- **优先级**: P0 | **预估工时**: 2h

### N-3: 统一"新增角色"按钮（合并三个按钮）

- **文件**: `pages/agents/AgentListPage.tsx`
- **问题**: 评审团页面右上角有 3 个独立按钮（预设新增、自定义新增、AI 新增），占用 header 水平空间，且对新用户不清晰。L-16 与本项冲突，已废弃 L-16。
- **修复**: 三个按钮 → 一个 `+ 新增角色`（primary 色），点击弹出 `AddAgentModal`，弹窗顶部含三个 Tab（📋 预设模板 / ✏️ 自定义 / 🤖 AI 生成），各 Tab 承载原有对应 modal 的完整内容。
- **优先级**: P0 | **预估工时**: 2.5h

### N-4: 评审报告质量提升（10 项优化）

- **文件**: `services/reviewEngine.ts`（`REVIEW_SYSTEM_PROMPT`）、`types/index.ts`（`AgentReview`、`Suggestion`）
- **问题**: 当前 prompt 要求 comment"一句话"、suggestions 无下限、未要求引用原文，导致报告表面化、同质化、缺乏操作指导价值。
- **修复优先级**:

  | 优先级 | 编号 | 内容 |
  |:------:|:----:|------|
  | P0 | N-4-1 | 强制引用原文：每条 comment/suggestion 必须含 `（原文：'xxx'）` |
  | P0 | N-4-2 | 建议深度格式：3-8 条，每条含①问题定位 ②改进方案 ③参考实践 |
  | P0 | N-4-3 | comment 扩展为 2-3 句（发现+理由+改进方向），新增 `evidence?` 字段 |
  | P1 | N-4-4 | 角色个性强化：prompt 强调从本角色视角提出独特见解，避免同质化 |
  | P1 | N-4-5 | 新增 `highlights` 字段（1-3 条亮点），平衡纯负面评价 |
  | P1 | N-4-6 | `opinion` 结构化为四段：【总体印象】【最大亮点】【核心问题】【综合建议】 |
  | P1 | N-4-7 | `priority` 附加说明：high=影响学生理解，medium=影响质量，low=锦上添花 |
  | P2 | N-4-8 | 教学情境感知：注入文档元信息（年级/学科/课时）影响适龄性评价 |
  | P2 | N-4-9 | 跨维度联系分析：要求 opinion 中分析维度间的因果关联 |
  | P2 | N-4-10 | high 建议附加"预期改进效果"一句话 |

- **优先级**: P1 | **预估工时**: 2h
