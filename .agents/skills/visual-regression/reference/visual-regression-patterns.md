# 视觉回归测试模式参考

## Playwright 配置

### playwright.config.ts 视觉测试配置
```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/visual',
  snapshotDir: './tests/visual/baseline',
  snapshotPathTemplate: '{snapshotDir}/{testFilePath}/{arg}{ext}',
  updateSnapshots: process.env.UPDATE_SNAPSHOTS === 'true' ? 'all' : 'missing',
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.001,
      threshold: 0.2,
      animations: 'disabled',
    },
  },
  use: {
    baseURL: process.env.BASE_URL, // 必须从 allocated-ports.json 派生注入真实地址
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
});
```

## 动态内容处理

### 隐藏不稳定元素
```typescript
async function stabilizePage(page) {
  await page.evaluate(() => {
    // 隐藏时间戳
    document.querySelectorAll('[data-testid="timestamp"], time')
      .forEach(el => { el.textContent = '2026-01-01 00:00:00'; });
    // 停止动画
    document.querySelectorAll('*').forEach(el => {
      el.style.animation = 'none';
      el.style.transition = 'none';
    });
    // 替换随机头像
    document.querySelectorAll('img[src*="avatar"]')
      .forEach(img => { img.src = '/placeholder-avatar.png'; });
  });
}
```

### 等待字体加载
```typescript
async function waitForFonts(page) {
  await page.evaluate(() => document.fonts.ready);
  // 额外等待渲染
  await page.waitForTimeout(500);
}
```

## 差异分析策略

| 差异率 | 判定 | 处理方式 |
|--------|------|----------|
| 0% | 完全一致 | 通过 |
| < 0.1% | 抗锯齿差异 | 自动通过 |
| 0.1% ~ 1% | 可疑变更 | 人工审查 |
| 1% ~ 5% | 明显变更 | 标记失败，需确认是否预期 |
| > 5% | 严重回归 | 立即修复 |

## 基线管理

### 更新基线
```bash
# 更新所有基线
npx playwright test --update-snapshots

# 更新特定测试的基线
npx playwright test tests/visual/home.spec.ts --update-snapshots
```

### 基线版本控制
- 基线截图提交到 Git（使用 Git LFS 管理大文件）
- PR 中包含基线变更时需人工审查
- 分支合并前确保基线与目标分支一致

```bash
# 配置 Git LFS
git lfs track "tests/visual/baseline/**/*.png"
git add .gitattributes
```

## CI/CD 集成

### GitHub Actions 示例
```yaml
visual-regression:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
    - run: npm ci
    - run: npx playwright install --with-deps
    - run: npm run dev &
    - run: npx playwright test tests/visual/
    - uses: actions/upload-artifact@v4
      if: failure()
      with:
        name: visual-diff
        path: test-results/
```

## 常见问题与解决

### 字体渲染差异
不同操作系统字体渲染不同，解决方案：
- CI 中使用 Docker 容器统一环境
- 设置较高的 threshold（0.3~0.5）
- 使用 `--ignore-fonts` 选项

### 滚动位置不一致
```typescript
// 确保滚动到顶部
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(100);
```

### 懒加载图片未加载
```typescript
// 滚动触发懒加载
await page.evaluate(() => {
  window.scrollTo(0, document.body.scrollHeight);
});
await page.waitForTimeout(1000);
await page.evaluate(() => window.scrollTo(0, 0));
```
