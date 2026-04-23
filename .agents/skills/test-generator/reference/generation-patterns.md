# 测试用例生成模式参考

## Python 后端测试模式

### 基础函数测试
```python
import pytest
from mymodule import calculate_total

class TestCalculateTotal:
    """测试 calculate_total 函数"""

    def test_empty_list(self):
        """空列表应返回 0"""
        assert calculate_total([]) == 0

    def test_single_item(self):
        """单个元素"""
        assert calculate_total([10]) == 10

    def test_multiple_items(self):
        """多个元素求和"""
        assert calculate_total([1, 2, 3]) == 6

    def test_negative_numbers(self):
        """负数处理"""
        assert calculate_total([-1, -2, 3]) == 0

    def test_float_numbers(self):
        """浮点数精度"""
        result = calculate_total([0.1, 0.2])
        assert abs(result - 0.3) < 1e-9

    def test_invalid_input(self):
        """非法输入应抛出异常"""
        with pytest.raises(TypeError):
            calculate_total("not a list")
```

### API 端点测试
```python
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

class TestProjectAPI:
    """测试项目 API"""

    def test_create_project(self):
        """创建项目"""
        response = client.post("/api/projects/create", json={
            "name": "test-project",
            "description": "测试项目"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "test-project"

    def test_create_project_missing_name(self):
        """缺少名称应返回 422"""
        response = client.post("/api/projects/create", json={
            "description": "测试项目"
        })
        assert response.status_code == 422

    def test_get_project(self):
        """获取项目详情"""
        response = client.get("/api/projects/test-id")
        assert response.status_code in [200, 404]

    def test_list_projects(self):
        """列出所有项目"""
        response = client.get("/api/projects")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
```

### Fixture 模式
```python
import pytest
import json
from pathlib import Path

@pytest.fixture
def temp_project(tmp_path):
    """创建临时项目目录"""
    project_dir = tmp_path / "test-project"
    project_dir.mkdir()
    (project_dir / ".auto-coding").mkdir()
    (project_dir / ".auto-coding" / "feature-list.json").write_text("[]")
    return project_dir

@pytest.fixture
def mock_config(monkeypatch):
    """Mock 配置"""
    monkeypatch.setenv("API_KEY", "test-key")
    monkeypatch.setenv("MODEL", "test-model")

def test_with_fixtures(temp_project, mock_config):
    """使用 fixtures 的测试"""
    feature_file = temp_project / ".auto-coding" / "feature-list.json"
    assert feature_file.exists()
```

## 前端测试模式

### React 组件测试
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ChatInput } from '../ChatInput';

describe('ChatInput', () => {
  it('应该渲染输入框和发送按钮', () => {
    render(<ChatInput onSend={vi.fn()} disabled={false} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByText('发送')).toBeInTheDocument();
  });

  it('输入为空时不应触发发送', () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} disabled={false} />);
    fireEvent.click(screen.getByText('发送'));
    expect(onSend).not.toHaveBeenCalled();
  });

  it('输入内容后点击发送应触发回调', async () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} disabled={false} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '测试消息' } });
    fireEvent.click(screen.getByText('发送'));

    await waitFor(() => {
      expect(onSend).toHaveBeenCalledWith('测试消息', []);
    });
  });

  it('disabled 状态下不应允许输入', () => {
    render(<ChatInput onSend={vi.fn()} disabled={true} />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });
});
```

### Hook 测试
```typescript
import { renderHook, act } from '@testing-library/react';
import { useTestingWs } from '../useTestingWs';

describe('useTestingWs', () => {
  it('初始状态应为未运行', () => {
    const { result } = renderHook(() => useTestingWs('test-project'));
    expect(result.current.isRunning).toBe(false);
    expect(result.current.logs).toEqual([]);
    expect(result.current.currentRun).toBeNull();
  });
});
```

## 边界条件清单

生成测试时必须覆盖以下边界条件：

### 通用
- 空值 / null / undefined
- 空字符串 / 空数组 / 空对象
- 极大值 / 极小值
- 特殊字符（中文、emoji、HTML 标签）
- 并发调用

### 字符串
- 空字符串 ""
- 超长字符串（>10000 字符）
- 包含特殊字符（\n, \t, \0）
- Unicode 字符

### 数字
- 0, -0, NaN, Infinity, -Infinity
- 最大安全整数
- 浮点精度问题

### 数组
- 空数组 []
- 单元素数组
- 大数组（>10000 元素）
- 嵌套数组

### API
- 200 正常响应
- 400 参数错误
- 401 未授权
- 404 资源不存在
- 500 服务器错误
- 超时
- 网络断开
