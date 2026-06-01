# Cloudflare Pages 免费部署说明

Koyeb 和 Render 如果要求填写银行卡，可以改用 Cloudflare Pages。

## 1. 准备

项目已经包含 Cloudflare Pages 需要的结构：

```text
public/              静态网页文件
functions/           读取公众号链接和图片的接口
functions/health.js  健康检查
```

## 2. 推送到 GitHub

本地修改后提交并推送：

```bash
git add .
git commit -m "Add Cloudflare Pages deployment"
git push
```

## 3. Cloudflare Pages 创建项目

1. 打开 Cloudflare Dashboard。
2. 进入 `Workers & Pages`。
3. 选择 `Create application`。
4. 选择 `Pages`。
5. 选择 `Connect to Git`。
6. 授权 GitHub，并选择仓库：

```text
1206962913-gif/gzh-review
```

## 4. 构建设置

填写：

```text
Framework preset: None
Build command: 留空
Build output directory: public
Root directory: 留空
```

如果页面上显示 Functions directory，填写：

```text
functions
```

## 5. 部署完成

部署成功后，Cloudflare 会给一个地址，例如：

```text
https://gzh-review.pages.dev
```

电脑和手机都可以访问这个地址。

## 6. 注意事项

- 公众号正式链接通常可以读取。
- 临时预览链接如果必须依赖微信登录态，云端仍可能无法读取。
- 如果需要正式域名，可以在 Cloudflare Pages 的 Custom domains 里绑定。
