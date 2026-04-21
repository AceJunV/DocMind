---
name: playwright-skill
description: E2E browser testing with Playwright. Write and run E2E tests using @playwright/test framework. Use when user wants to test web pages, validate UI flows, check responsive design, or automate browser interactions. Tests run headless by default (suitable for CI/server environments).
---

# Playwright E2E Testing Skill

使用 `@playwright/test` 标准框架编写和执行 E2E 测试。

## 首次使用（自动安装）

在目标项目中执行：

```bash
npm install -D @playwright/test
npx playwright install chromium --with-deps
```

如果项目已有 `@playwright/test` 依赖则跳过安装。

## 工作流程

### 1. 检测运行中的服务

先读取项目的 `.auto-coding/allocated-ports.json` 获取分配的端口，然后检测服务是否在监听：

```bash
# 从 allocated-ports.json 读取端口，检测服务是否在监听
cat .auto-coding/allocated-ports.json
lsof -i -P -n | grep LISTEN | grep -E ":($(cat .auto-coding/allocated-ports.json | python3 -c 'import sys,json; ports=json.load(sys.stdin); print("|".join(str(v) for v in ports.values() if isinstance(v, int)))'))\\s"
```

- 找到 1 个服务 → 直接使用
- 找到多个 → 询问用户测试哪个
- 没找到 → 提示用户先启动服务，或使用 docker-compose up

### 2. 编写测试文件

测试文件放在项目的 `e2e/` 目录下（与 playwright.config.ts 配置一致）：

```typescript
// e2e/example.spec.ts
import { test, expect } from '@playwright/test';

test('页面标题正确', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Expected Title/);
});

test('登录流程', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'password');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
  await expect(page.locator('h1')).toContainText('Dashboard');
});
```

### 3. 执行测试

```bash
npx playwright test e2e/example.spec.ts --reporter=list
```

查看测试报告：
```bash
npx playwright show-report
```

## playwright.config.ts 模板

如果项目没有 playwright.config.ts，创建一个：

```typescript
import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL;

if (!baseURL) {
  throw new Error('BASE_URL 未注入；必须先从 .auto-coding/allocated-ports.json 派生真实地址');
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    headless: true,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
```

## 常用测试模式

### CRUD 流程测试

```typescript
test('创建和查看记录', async ({ page }) => {
  // 创建
  await page.goto('/items/new');
  await page.fill('input[name="name"]', '测试项目');
  await page.click('button:has-text("保存")');
  await expect(page.locator('.ant-message-success')).toBeVisible();

  // 列表中可见
  await page.goto('/items');
  await expect(page.locator('table')).toContainText('测试项目');
});
```

### 响应式测试

```typescript
test('移动端布局', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');
  await page.screenshot({ path: 'e2e/screenshots/mobile.png', fullPage: true });
  // 验证移动端菜单
  await expect(page.locator('.mobile-menu-toggle')).toBeVisible();
});
```

### API Mock

```typescript
test('API 错误处理', async ({ page }) => {
  await page.route('**/api/items', route =>
    route.fulfill({ status: 500, body: JSON.stringify({ error: '服务器错误' }) })
  );
  await page.goto('/items');
  await expect(page.locator('.error-message')).toBeVisible();
});
```

## 注意事项

- **始终使用 headless: true**（平台后台运行，无显示器）
- **使用 baseURL**：不要硬编码完整 URL，用相对路径 `await page.goto('/')`
- **等待策略**：优先用 `expect` 自动等待，避免 `page.waitForTimeout()`
- **截图调试**：失败时自动截图（`screenshot: 'only-on-failure'`）
- **测试隔离**：每个 test 独立，不依赖其他 test 的状态

## 报告输出（必须执行）

测试执行完成后，必须将结果写入报告文件，供测试管理界面展示。

路径: `.auto-coding/testing/reports/{YYYYMMDD_HHmmss}_e2e.md`

步骤：
1. 先确保目录存在：`mkdir -p .auto-coding/testing/reports`
2. 用 Write 工具写入报告文件

报告格式：

```
# E2E 测试报告

**时间**: YYYY-MM-DD HH:mm:ss
**框架**: playwright
**目标**: 测试范围描述

## 结果概览

| 指标 | 数值 |
|------|------|
| 总用例 | N |
| 通过 | N |
| 失败 | N |
| 耗时 | Ns |

## 失败详情

（如有失败用例，列出名称、文件、错误信息）

## 通过用例

（列出通过的用例名称）
```
