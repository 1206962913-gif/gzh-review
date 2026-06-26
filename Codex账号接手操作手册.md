# Codex 账号接手操作手册

这份手册用于在更换或新增 Codex 账号后，继续访问、维护和更新“公众号发布前保密审核”项目。

## 一、项目基本信息

项目用途：

```text
用于公众号发布前审核。使用人员输入公众号或秀米文章链接后，网站自动读取文章内容，检查敏感表述，并给出修改建议。
```

GitHub 仓库：

```text
https://github.com/1206962913-gif/gzh-review
```

线上部署平台：

```text
Cloudflare Pages
```

本地项目目录：

```text
/Users/zhangjingdong/Documents/公众号保密审核
```

## 二、新 Codex 账号如何接手

### 1. 确保能访问 GitHub 仓库

新 Codex 账号使用者需要能访问这个仓库：

```text
https://github.com/1206962913-gif/gzh-review
```

如果仓库是私有的，需要原 GitHub 账号把新维护者加入协作者。

### 2. 在新电脑或新环境下载项目

```bash
git clone https://github.com/1206962913-gif/gzh-review.git
cd gzh-review
```

### 3. 本地启动查看

电脑需要安装 Node.js。

```bash
node server.js
```

打开：

```text
http://127.0.0.1:4173/
```

如果能看到网页，说明本地项目可运行。

## 三、主要文件说明

日常维护最常用的是这些文件：

```text
sensitive-rules.js
```

敏感词库主文件。本地预览用它。

```text
public/sensitive-rules.js
```

线上 Cloudflare 页面使用的词库文件。修改词库时要和 `sensitive-rules.js` 保持一致。

```text
index.html
script.js
styles.css
```

本地网页页面、功能和样式。

```text
public/index.html
public/script.js
public/styles.css
```

线上 Cloudflare 页面使用的网页文件。改页面功能或样式后，也要同步到 `public` 目录。

```text
functions/api/extract.js
```

线上读取公众号和秀米链接正文的接口。

```text
functions/api/image.js
```

线上读取文章图片的接口。

## 四、如何新增或修改敏感词

打开：

```text
sensitive-rules.js
```

找到 `window.sensitiveRules = [`，在数组里新增一条：

```js
{
  word: "敏感词",
  category: "分类名称",
  level: "medium",
  label: "建议优化",
  suggestion: "建议替换表达",
},
```

示例：

```js
{
  word: "核心指标",
  category: "经营指标敏感表述",
  level: "medium",
  label: "建议优化",
  suggestion: "重点工作、关键任务、主要目标",
},
```

修改完后，同步到线上目录：

```bash
cp sensitive-rules.js public/sensitive-rules.js
```

检查是否有语法错误：

```bash
node --check sensitive-rules.js
node --check public/sensitive-rules.js
```

## 五、如何修改页面

如果修改页面结构：

```text
index.html
```

改完后同步：

```bash
cp index.html public/index.html
```

如果修改页面功能：

```text
script.js
```

改完后同步：

```bash
cp script.js public/script.js
```

如果修改页面样式：

```text
styles.css
```

改完后同步：

```bash
cp styles.css public/styles.css
```

检查脚本：

```bash
node --check script.js
node --check public/script.js
```

## 六、如何发布到线上

修改完成后，执行：

```bash
git status
git add .
git commit -m "说明本次修改内容"
git push
```

推送成功后，Cloudflare Pages 会自动重新部署。

通常等待几十秒到几分钟，线上网站就会更新。

## 七、Cloudflare Pages 设置

如果需要重新部署 Cloudflare Pages，设置如下：

```text
Framework preset: None
Build command: 留空
Build output directory: public
Root directory: 留空
Functions directory: functions
```

不要填写：

```bash
npx wrangler deploy
```

这个命令不是本项目的部署方式，可能导致部署失败。

## 八、常见问题

### 1. GitHub 推送失败

如果看到：

```text
Failed to connect to github.com port 443
```

说明当前网络连不上 GitHub。可以：

- 换网络
- 使用能访问 GitHub 的代理或 VPN
- 稍后再试

网络恢复后重新执行：

```bash
git push
```

### 2. 线上没有更新

先确认本地是否推送成功：

```bash
git status
```

如果显示工作区干净，再去 Cloudflare Pages 查看最新部署是否成功。

### 3. 公众号临时预览链接读取失败

可能原因：

- 链接已过期
- 链接需要微信登录态
- 服务器无法访问该临时页面

这种情况可以让送检单位粘贴正文，或使用正式发布链接、秀米预览链接。

### 4. 秀米链接读取失败

目前支持同类型秀米预览链接，也就是页面里包含秀米正文数据的链接。若某个秀米链接结构不同，可能需要再适配。

## 九、交接建议

交给其他 Codex 账号前，建议确认：

- GitHub 仓库权限已给到新维护者
- Cloudflare 项目权限已给到新维护者，或新维护者能重新部署
- 最新代码已经 `git push`
- 新维护者知道重点维护 `sensitive-rules.js` 和 `public/sensitive-rules.js`

新 Codex 账号接手时，可以先让它阅读：

```text
README.md
Cloudflare部署说明.md
Codex账号接手操作手册.md
```
