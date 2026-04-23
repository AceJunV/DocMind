# PRD 模板库

## PRD 核心模板

```markdown
# [产品名称] PRD

**版本**: v1.0 | **日期**: 2026-03-05 | **负责人**: [姓名]

## 1. 概述
- 产品定位、目标用户、核心价值

## 2. 功能列表
| 功能 | 优先级 | 版本 | 状态 |

## 3. 功能详细设计

### 功能 1: [名称]

**用户故事**
作为 [角色]，我想要 [操作]，以便 [目标]

**验收标准**
- [ ] 标准 1
- [ ] 标准 2

**功能流程**
1. 步骤 1
2. 步骤 2

**数据模型**
```typescript
interface Model { ... }
```

**API 接口**
POST /api/endpoint

**异常处理**
- 异常 1: 处理方式

## 4. 非功能需求
- 性能、安全、可用性

## 5. 里程碑
| 版本 | 功能 | 时间 |
```

## 用户故事模板

作为 [用户角色]
我想要 [完成某个操作]
以便 [达成某个目标]

## 验收标准 INVEST 原则

- Independent: 独立的
- Negotiable: 可协商的
- Valuable: 有价值的
- Estimable: 可估算的
- Small: 小型的
- Testable: 可测试的

## API 接口模板

### POST /api/resource

**请求**
```json
{ "field": "value" }
```

**响应 (200)**
```json
{ "id": "uuid", "field": "value" }
```

**错误 (400)**
```json
{ "error": "Error message" }
```
