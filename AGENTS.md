# AGENTS.md — DocMind

## 部署红线

部署前必须先读本项目根目录的 `DEPLOYMENT.md`。

- DocMind 线上入口只允许是 `http://123.207.2.148/teaching`
- 构建产物只允许部署到 `/var/www/docmind_teaching`
- `frontend/vite.config.ts` 必须保持 `base: '/teaching/'`
- 根路径 `/` 属于 Gongju_Index 门户，不属于 DocMind
- 不要使用或恢复历史目录 `/var/www/docmind`
- 不要占用根 `/assets/`，资源必须在 `/teaching/assets/`

修改 nginx 后必须执行：

```bash
sudo nginx -t
sudo systemctl reload nginx
```
