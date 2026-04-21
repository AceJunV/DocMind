# 测试修复模式参考

## 错误分析决策树

```
测试失败
├── AssertionError
│   ├── 预期值错误 → 检查需求是否变更
│   ├── 实际值错误 → 检查被测代码逻辑
│   └── 数据过时 → 更新测试数据
├── TypeError
│   ├── 参数类型变更 → 更新调用方式
│   ├── None 值未处理 → 添加空值检查
│   └── 接口变更 → 更新测试代码
├── ImportError
│   ├── 模块重命名 → 更新 import 路径
│   ├── 依赖缺失 → 安装依赖
│   └── 循环导入 → 重构导入结构
├── TimeoutError
│   ├── 网络超时 → Mock 网络请求
│   ├── 异步未等待 → 添加 await
│   └── 死锁 → 检查锁逻辑
└── 其他
    ├── 环境差异 → 统一环境配置
    ├── 竞态条件 → 添加同步机制
    └── 资源泄漏 → 添加 cleanup
```

## 修复模板

### 修复断言错误
```python
# 修复前
def test_user_count():
    users = get_all_users()
    assert len(users) == 5  # 硬编码数量

# 修复后
def test_user_count():
    initial_count = len(get_all_users())
    create_user("new_user")
    assert len(get_all_users()) == initial_count + 1
```

### 修复异步测试
```python
# 修复前
def test_async_operation():
    result = start_async_task()
    assert result.status == "completed"  # 可能还没完成

# 修复后
import asyncio

async def test_async_operation():
    result = await start_async_task()
    assert result.status == "completed"
```

### 修复 Mock 问题
```python
# 修复前
def test_api_call():
    response = call_external_api()  # 依赖外部服务
    assert response.status_code == 200

# 修复后
from unittest.mock import patch

def test_api_call():
    with patch('mymodule.requests.get') as mock_get:
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {"data": "test"}
        response = call_external_api()
        assert response.status_code == 200
```

### 修复前端组件测试
```typescript
// 修复前：直接查找文本可能因为异步渲染失败
it('should show user name', () => {
  render(<UserProfile userId="1" />);
  expect(screen.getByText('John')).toBeInTheDocument();
});

// 修复后：等待异步渲染完成
it('should show user name', async () => {
  render(<UserProfile userId="1" />);
  await waitFor(() => {
    expect(screen.getByText('John')).toBeInTheDocument();
  });
});
```

## 不稳定测试（Flaky Tests）修复策略

### 1. 时间依赖
```python
# 问题：依赖当前时间
def test_is_expired():
    token = create_token(expires_in=60)
    time.sleep(61)  # 不可靠
    assert token.is_expired()

# 修复：使用 freezegun
from freezegun import freeze_time

def test_is_expired():
    with freeze_time("2026-01-01 12:00:00"):
        token = create_token(expires_in=60)
    with freeze_time("2026-01-01 12:01:01"):
        assert token.is_expired()
```

### 2. 顺序依赖
```python
# 问题：测试依赖执行顺序
def test_create_user():
    create_user("alice")

def test_get_user():
    user = get_user("alice")  # 依赖上一个测试
    assert user is not None

# 修复：每个测试独立
def test_get_user():
    create_user("alice")  # 自己创建数据
    user = get_user("alice")
    assert user is not None
```

### 3. 并发问题
```python
# 问题：共享资源竞争
def test_counter():
    counter.reset()
    threads = [Thread(target=counter.increment) for _ in range(100)]
    for t in threads: t.start()
    for t in threads: t.join()
    assert counter.value == 100  # 可能不是 100

# 修复：使用线程安全的实现或串行测试
def test_counter():
    counter = ThreadSafeCounter()
    counter.reset()
    # ... 同上
    assert counter.value == 100
```
