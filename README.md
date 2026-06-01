# 公众号发布前保密审核

用于在公众号发布前读取文章链接内容，按词库检测敏感表述，并给出建议替换表达。

## 本地运行

```bash
node server.js
```

默认地址：

```text
http://127.0.0.1:4173/
```

健康检查：

```text
http://127.0.0.1:4173/health
```

## Cloudflare Pages 部署参数

```text
Framework preset: None
Build command: 留空
Build output directory: public
Functions directory: functions
```

部署成功后，Cloudflare Pages 会提供一个 `*.pages.dev` 地址。

## Koyeb 部署参数

```text
Build command: npm install
Run command: npm start
Port: 使用平台自动识别的 PORT
Health check path: /health
```

项目已支持 Koyeb 自动注入的 `PORT` 环境变量。
