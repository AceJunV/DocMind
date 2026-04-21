# 后端开发模式库

## API Route 模板

### GET - 列表查询
```typescript
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('table_name')
      .select('*')
      .eq('user_id', user.id)

    if (error) throw error
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### POST - 创建资源
```typescript
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    if (!body.field) {
      return NextResponse.json({ error: 'Field is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('table_name')
      .insert({ ...body, user_id: user.id })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

## 错误处理模式

```typescript
class APIError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message)
  }
}

function handleError(error: unknown) {
  if (error instanceof APIError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode })
  }
  console.error('Unexpected error:', error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}
```

## 数据库查询模式

### 关联查询
```typescript
const { data } = await supabase
  .from('projects')
  .select(`
    *,
    scenes (
      *,
      images (*),
      videos (*)
    )
  `)
  .eq('user_id', user.id)
```

### 分页查询
```typescript
const page = 1
const pageSize = 10
const { data } = await supabase
  .from('projects')
  .select('*')
  .range((page - 1) * pageSize, page * pageSize - 1)
```

## RESTful API 规范

- GET /api/resources - 获取列表
- GET /api/resources/:id - 获取单个
- POST /api/resources - 创建
- PUT /api/resources/:id - 更新（全量）
- PATCH /api/resources/:id - 更新（部分）
- DELETE /api/resources/:id - 删除

## 状态码规范

- 200: 成功
- 201: 创建成功
- 400: 客户端错误
- 401: 未认证
- 403: 无权限
- 404: 未找到
- 500: 服务器错误
