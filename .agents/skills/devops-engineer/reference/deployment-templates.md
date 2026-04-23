# 部署模板库

## Vercel 部署

### vercel.json
```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs"
}
```

### 环境变量
```bash
# .env.example
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ZHIPU_API_KEY=
VOLCANO_ACCESS_KEY=
VOLCANO_SECRET_KEY=
```

## GitHub Actions

### CI/CD 流程
```yaml
name: CI/CD

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run lint
      - run: npm run build
      - run: npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v2
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
```

## Docker

### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000  # 容器内部端口，宿主机端口必须从 allocated-ports.json 读取

CMD ["npm", "start"]
```

### docker-compose.yml
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "${FRONTEND_PORT}:3000"  # 宿主机端口必须从 allocated-ports.json 读取
    environment:
      - NODE_ENV=production
    env_file:
      - .env.local
```

## 监控配置

### Vercel Analytics
```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

## 部署检查清单

- [ ] 环境变量配置正确
- [ ] 构建成功
- [ ] 测试通过
- [ ] 生产环境可访问
- [ ] HTTPS 证书有效
- [ ] 监控配置完成
