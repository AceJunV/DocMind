# 技术栈选型指南

## 前端框架

| 框架 | 适用场景 | 优点 | 缺点 |
|------|---------|------|------|
| Next.js | 需要 SSR、SEO | SSR、API Routes、文件路由 | 学习曲线略陡 |
| React + Vite | SPA、不需要 SSR | 轻量、快速、灵活 | 需要自己配置 |
| Vue + Nuxt | 类似 Next.js 的 Vue 项目 | 易学、文档好 | 生态不如 React |

## 后端框架

| 框架 | 适用场景 | 优点 | 缺点 |
|------|---------|------|------|
| Next.js API Routes | 小型项目、与前端集成 | 简单、无需 CORS | 不适合复杂后端 |
| Express.js | 中小型 Node.js 项目 | 灵活、生态丰富 | 需要自己组织代码 |
| NestJS | 大型企业级项目 | 架构清晰、TypeScript | 学习成本高 |

## 数据库

| 数据库 | 适用场景 | 优点 | 缺点 |
|--------|---------|------|------|
| PostgreSQL | 复杂查询、关系型数据 | 功能强大、ACID | 需要运维 |
| MongoDB | 文档型数据、灵活 schema | 灵活、易扩展 | 不适合复杂关系 |
| Supabase | 快速开发、MVP | 开箱即用、RLS | 依赖第三方 |

## BaaS (Backend as a Service)

| 服务 | 适用场景 | 优点 | 缺点 |
|------|---------|------|------|
| Supabase | 需要 PostgreSQL | 开源、功能全、RLS | 国内访问慢 |
| Firebase | 实时应用、移动端 | 实时、简单 | NoSQL、价格高 |

## 技术选型决策树

### 项目规模

小型项目 (< 10 页面):
- 前端: React + Vite + Tailwind
- 后端: Next.js API Routes
- 数据库: Supabase

中型项目 (10-50 页面):
- 前端: Next.js + Tailwind + Zustand
- 后端: Next.js API Routes / Express
- 数据库: PostgreSQL

大型项目 (> 50 页面):
- 前端: Next.js + Tailwind + Redux Toolkit
- 后端: NestJS / 微服务
- 数据库: PostgreSQL + Redis

## 常见技术栈组合

### Supabase Stack
- 前端: Next.js + Tailwind
- 后端: Next.js API Routes
- 数据库: Supabase (PostgreSQL)
- 认证: Supabase Auth
- 部署: Vercel

### T3 Stack
- 前端: Next.js + Tailwind
- 后端: tRPC
- 数据库: Prisma + PostgreSQL
- 认证: NextAuth.js
