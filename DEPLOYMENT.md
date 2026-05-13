# DocMind 部署规则

> 最后更新: 2026-05-13

## 当前线上定位

DocMind 只作为 AI 课件工具箱门户下的子工具运行。

| 项 | 规则 |
|----|------|
| 线上入口 | `http://123.207.2.148/teaching` |
| 标准路径 | `/teaching/` |
| 服务器目录 | `/var/www/user_web_teaching` |
| 前端构建 base | `frontend/vite.config.ts` 中必须为 `base: '/teaching/'` |
| 门户根路径 | `http://123.207.2.148/`，归属 Gongju_Index |

## 私密登录信息

服务器登录信息只允许写入仓库根目录的 `DEPLOYMENT.local.md`。该文件已加入 `.gitignore`，禁止提交或推送。

`DEPLOYMENT.local.md` 必须包含：

- 服务器地址
- 登录用户名
- 登录密码
- SSH 登录命令

## 绝对禁止

- 不要把 DocMind 部署到 `/`。
- 不要把 DocMind 部署到 `/var/www/gongju_portal`。
- 不要恢复旧的 `/var/www/user_web` 根站点方案。
- 不要让 DocMind 占用根 `/assets/`，静态资源必须走 `/teaching/assets/`。
- 不要把 nginx 备份文件放进 `/etc/nginx/sites-enabled/`。

## 正确部署流程

```bash
cd frontend
npm install
npm run build
```

把 `frontend/dist/` 同步到：

```text
/var/www/user_web_teaching
```

权限：

```bash
sudo chown -R www-data:www-data /var/www/user_web_teaching
sudo chmod -R a+rX /var/www/user_web_teaching
```

nginx 只应使用 `/teaching/` location：

```nginx
location = /teaching {
    return 301 /teaching/;
}

location = /teaching/index.html {
    alias /var/www/user_web_teaching/index.html;
    add_header Cache-Control "no-cache, no-store, must-revalidate" always;
}

location ^~ /teaching/assets/ {
    alias /var/www/user_web_teaching/assets/;
    expires 30d;
    add_header Cache-Control "public, immutable" always;
}

location ^~ /teaching/ {
    alias /var/www/user_web_teaching/;
    try_files $uri $uri/ /teaching/index.html;
}
```

修改 nginx 后必须执行：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 验证

```bash
curl -I http://123.207.2.148/teaching
curl -I http://123.207.2.148/teaching/
curl -I http://123.207.2.148/teaching/assets/
```

期望：

- `/teaching` 返回 `301 /teaching/`
- `/teaching/` 返回 `200 OK`
- 浏览器控制台不能出现 basename `/teaching` 与 URL `/` 不匹配的错误

## 和门户的关系

门户项目 Gongju_Index 负责根路径 `/` 和工具入口卡片。DocMind 项目只能维护 `/teaching/` 子路径。需要改入口名称、排序或状态时，去 Gongju_Index 的 `src/config/tools.ts` 修改。
