# 测试模式库

## 单元测试模式

### 函数测试
```typescript
describe('calculateTotal', () => {
  it('should return 0 for empty array', () => {
    expect(calculateTotal([])).toBe(0)
  })

  it('should sum all numbers', () => {
    expect(calculateTotal([1, 2, 3])).toBe(6)
  })
})
```

## 组件测试模式

### 渲染测试
```typescript
import { render, screen } from '@testing-library/react'

it('should render correctly', () => {
  render(<Button>Click me</Button>)
  expect(screen.getByText('Click me')).toBeInTheDocument()
})
```

### 交互测试
```typescript
import { fireEvent } from '@testing-library/react'

it('should handle click', () => {
  const onClick = jest.fn()
  render(<Button onClick={onClick}>Click</Button>)
  fireEvent.click(screen.getByText('Click'))
  expect(onClick).toHaveBeenCalled()
})
```

## E2E 测试模式

### 用户流程测试
```typescript
import { test, expect } from '@playwright/test'

test('user can create project', async ({ page }) => {
  await page.goto('/projects')
  await page.click('text=Create Project')
  await page.fill('input[name="title"]', 'Test Project')
  await page.click('button[type="submit"]')
  await expect(page.locator('text=Test Project')).toBeVisible()
})
```

## API 测试模式

```typescript
describe('POST /api/projects', () => {
  it('should create project', async () => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test' })
    })

    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.title).toBe('Test')
  })
})
```

## 测试金字塔

- 单元测试（70%）：快速、稳定、覆盖面广
- 集成测试（20%）：测试模块间交互
- E2E 测试（10%）：测试完整用户流程

## 测试最佳实践

- 测试独立性：每个测试应该独立运行
- 测试可读性：测试代码应该清晰易懂
- 测试覆盖率：关键功能测试覆盖率 > 80%
- 快速反馈：单元测试应该在秒级完成
