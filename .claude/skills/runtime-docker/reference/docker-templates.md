# Docker 配置模板参考

本文档提供各类项目的标准 Docker 配置模板，**禁止使用 volumes 挂载宿主机代码目录**。

---

## 通用原则

1. 代码通过 `COPY . .` 复制到镜像，不用 bind mount
2. 启动命令绑定 `0.0.0.0`
3. `EXPOSE` 端口 = CMD 启动端口 = docker-compose 容器端口
4. 数据库使用命名 volume 持久化
5. 数据库添加 healthcheck，后端/前端用 depends_on
6. npm install 必须带 `--registry https://registry.npmmirror.com`
7. pip install 必须带 `-i https://pypi.tuna.tsinghua.edu.cn/simple`
8. 前端使用 multi-stage build（生产模式），禁止 `npm run dev`
9. Flask 使用 gunicorn，FastAPI 禁止 `--reload`

---

## Node.js / React (Vite)

### Dockerfile（multi-stage 生产构建）

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --registry https://registry.npmmirror.com
COPY . .
RUN npm run build

FROM node:18-alpine
RUN npm install -g serve --registry https://registry.npmmirror.com
WORKDIR /app
COPY --from=builder /app/dist ./dist
EXPOSE 4173
CMD ["serve", "-s", "dist", "-l", "4173"]
```

### .dockerignore

```
node_modules
npm-debug.log
.env
.env.*
dist
```

### docker-compose.yml（单服务）

```yaml
services:
  frontend:
    build: .
    ports:
      - "41001:4173"
    restart: unless-stopped
```

---

## Node.js / Next.js

### Dockerfile（standalone 生产构建）

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --registry https://registry.npmmirror.com
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

> **注意**：Next.js 项目需要在 `next.config.js` 中添加 `output: 'standalone'`。

---

## Python / FastAPI

### Dockerfile（生产模式，无 --reload）

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## Python / Flask

### Dockerfile（gunicorn 生产模式）

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
RUN pip install --no-cache-dir gunicorn -i https://pypi.tuna.tsinghua.edu.cn/simple
COPY . .
EXPOSE 5000
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]
```

---
## 全栈：React (Vite) + FastAPI + PostgreSQL

### 目录结构

```
project/
├── frontend/
│   ├── Dockerfile
│   └── package.json
├── backend/
│   ├── Dockerfile
│   └── requirements.txt
└── docker-compose.yml
```

### frontend/Dockerfile（multi-stage 生产构建）

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --registry https://registry.npmmirror.com
COPY . .
RUN npm run build

FROM node:18-alpine
RUN npm install -g serve --registry https://registry.npmmirror.com
WORKDIR /app
COPY --from=builder /app/dist ./dist
EXPOSE 4173
CMD ["serve", "-s", "dist", "-l", "4173"]
```

### backend/Dockerfile（生产模式，无 --reload）

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### docker-compose.yml

```yaml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "41000:8000"
    environment:
      - DATABASE_URL=postgresql://appuser:apppass@db:5432/appdb
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "41001:4173"
    environment:
      - VITE_API_URL=http://localhost:41000
    depends_on:
      - backend
    restart: unless-stopped

  db:
    image: docker.1ms.run/postgres:15-alpine
    environment:
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD: apppass
      POSTGRES_DB: appdb
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U appuser -d appdb"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  postgres_data:
```

---

## Go / Gin（纯后端）

### Dockerfile（multi-stage 生产构建）

```dockerfile
FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server .

FROM alpine:3.19
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app
COPY --from=builder /app/server .
EXPOSE 8000
CMD ["./server"]
```

> **重要**：Go 必须使用 multi-stage build。构建阶段用 `golang:1.23-alpine`，运行阶段用 `alpine:3.19`（最终镜像仅 ~20MB）。`go build -o server .` 中的 `.` 需替换为实际 main 包路径。如果项目有配置文件（如 `config.yaml`、`.env`），需在第二阶段 COPY。

### docker-compose.yml（单服务 + MySQL）

```yaml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "41000:8000"
    environment:
      - DB_HOST=db
      - DB_PORT=3306
      - DB_USER=appuser
      - DB_PASSWORD=apppass
      - DB_NAME=appdb
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: docker.1ms.run/mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpass
      MYSQL_DATABASE: appdb
      MYSQL_USER: appuser
      MYSQL_PASSWORD: apppass
    volumes:
      - mysql_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  mysql_data:
```

---

## Java / Spring Boot (Maven)

### Dockerfile（multi-stage 生产构建）

```dockerfile
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app
# 配置阿里云 Maven 镜像
RUN mkdir -p /root/.m2 && echo '<?xml version="1.0" encoding="UTF-8"?>\
<settings><mirrors><mirror><id>aliyun</id><mirrorOf>central</mirrorOf>\
<url>https://maven.aliyun.com/repository/central</url></mirror></mirrors></settings>' > /root/.m2/settings.xml
COPY pom.xml .
COPY .mvn .mvn
COPY mvnw .
RUN chmod +x mvnw && ./mvnw dependency:resolve -q
COPY src ./src
RUN ./mvnw package -DskipTests -q

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
EXPOSE 8080
CMD ["java", "-jar", "app.jar", "--server.port=8080"]
```

> **重要**：必须读取 `pom.xml` 中的 `<java.version>` 确定 JDK 版本，调整 `eclipse-temurin:XX-jdk-alpine`。

### .dockerignore

```
target
.idea
*.iml
.env
.env.*
```

---

## Java / Spring Boot (Gradle)

### Dockerfile（multi-stage 生产构建）

```dockerfile
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app
COPY build.gradle settings.gradle ./
COPY gradle ./gradle
COPY gradlew .
RUN chmod +x gradlew
RUN ./gradlew dependencies --no-daemon -q || true
COPY src ./src
RUN ./gradlew bootJar --no-daemon -q

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/build/libs/*.jar app.jar
EXPOSE 8080
CMD ["java", "-jar", "app.jar", "--server.port=8080"]
```

> **重要**：Gradle 产物路径是 `build/libs/*.jar`（不是 Maven 的 `target/*.jar`）。

### .dockerignore

```
build
.gradle
.idea
*.iml
.env
.env.*
```

### docker-compose.yml（Spring Boot + PostgreSQL）

```yaml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "41000:8080"
    environment:
      - SPRING_DATASOURCE_URL=jdbc:postgresql://db:5432/appdb
      - SPRING_DATASOURCE_USERNAME=appuser
      - SPRING_DATASOURCE_PASSWORD=apppass
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: docker.1ms.run/postgres:15-alpine
    environment:
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD: apppass
      POSTGRES_DB: appdb
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U appuser -d appdb"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  postgres_data:
```

---

## 全栈：Vue3 (Vite) + Go/Gin + MySQL

### backend/Dockerfile

```dockerfile
FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server .

FROM alpine:3.19
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app
COPY --from=builder /app/server .
EXPOSE 8000
CMD ["./server"]
```

### frontend/Dockerfile（multi-stage 生产构建）

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --registry https://registry.npmmirror.com
COPY . .
RUN npm run build

FROM node:18-alpine
RUN npm install -g serve --registry https://registry.npmmirror.com
WORKDIR /app
COPY --from=builder /app/dist ./dist
EXPOSE 4173
CMD ["serve", "-s", "dist", "-l", "4173"]
```

### docker-compose.yml

```yaml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "41000:8000"
    environment:
      - DB_HOST=db
      - DB_PORT=3306
      - DB_USER=appuser
      - DB_PASSWORD=apppass
      - DB_NAME=appdb
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "41001:4173"
    environment:
      - VITE_API_URL=http://localhost:41000
    depends_on:
      - backend
    restart: unless-stopped

  db:
    image: docker.1ms.run/mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpass
      MYSQL_DATABASE: appdb
      MYSQL_USER: appuser
      MYSQL_PASSWORD: apppass
    volumes:
      - mysql_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  mysql_data:
```

### backend/Dockerfile

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --registry https://registry.npmmirror.com
COPY . .
EXPOSE 3001
CMD ["node", "server.js"]
```

### frontend/Dockerfile（multi-stage 生产构建）

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --registry https://registry.npmmirror.com
COPY . .
RUN npm run build

FROM node:18-alpine
RUN npm install -g serve --registry https://registry.npmmirror.com
WORKDIR /app
COPY --from=builder /app/dist ./dist
EXPOSE 4173
CMD ["serve", "-s", "dist", "-l", "4173"]
```

### docker-compose.yml

```yaml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "41000:3001"
    environment:
      - DATABASE_URL=postgresql://appuser:apppass@db:5432/appdb
      - PORT=3001
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "41001:4173"
    environment:
      - VITE_API_URL=http://localhost:41000
    depends_on:
      - backend
    restart: unless-stopped

  db:
    image: docker.1ms.run/postgres:15-alpine
    environment:
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD: apppass
      POSTGRES_DB: appdb
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U appuser -d appdb"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  postgres_data:
```