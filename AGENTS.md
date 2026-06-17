# AGENTS.md — DocMind

## 本地启动规则

本地测试 DocMind 时，不要只启动前端开发服务器。AI Key 测试、评审、聊天等模型调用都依赖本项目根目录的 LLM 中转脚本。

需要同时启动两个进程：

```bash
# 终端 1：启动 LLM 中转服务
python3 scripts/llm_proxy.py
```

```bash
# 终端 2：启动前端页面
cd frontend
npm run dev
```

前端会把 `/teaching/api/llm-proxy/chat/completions` 转发到 `http://127.0.0.1:18080/chat/completions`。如果没有启动 `scripts/llm_proxy.py`，测试连接和模型调用会返回 `502 Bad Gateway`。

## 部署红线

部署前必须先读本项目根目录的 `DEPLOYMENT.md`。
- 每次给出修改的方案后，必须得到用户确认再进行。
- 修改内容需要在代码进行注释
# - DocMind 线上入口只允许是 `http://123.207.2.148/teaching`
# - 构建产物只允许部署到 `/var/www/docmind_teaching`
# - `frontend/vite.config.ts` 必须保持 `base: '/teaching/'`
# - 根路径 `/` 属于 Gongju_Index 门户，不属于 DocMind
# - 不要使用或恢复历史目录 `/var/www/docmind`
# - 不要占用根 `/assets/`，资源必须在 `/teaching/assets/`

修改 nginx 后必须执行：

```bash
sudo nginx -t
sudo systemctl reload nginx
```
