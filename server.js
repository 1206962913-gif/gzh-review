const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "0.0.0.0";
const root = __dirname;
const staticTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function sendJson(response, status, data) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(data));
}

function decodeEntities(value) {
  const named = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  };

  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity) => {
    if (entity.startsWith("#x")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    }

    if (entity.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    }

    return named[entity] || match;
  });
}

function getMatch(html, patterns) {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return decodeEntities(match[1].trim());
    }
  }

  return "";
}

function normalizeText(html) {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|section|div|h[1-6]|li|blockquote)>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\r/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim(),
  );
}

function pickArticleHtml(html) {
  const contentById = html.match(/<[^>]+id=["']js_content["'][^>]*>([\s\S]*?)<\/div>\s*<script/);
  if (contentById && contentById[1]) {
    return { html: contentById[1], found: true };
  }

  const richContent = html.match(
    /<div[^>]+class=["'][^"']*rich_media_content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
  );
  if (richContent && richContent[1]) {
    return { html: richContent[1], found: true };
  }

  const article = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (article && article[1]) {
    return { html: article[1], found: true };
  }

  return { html, found: false };
}

function extractImages(articleHtml) {
  const images = [];
  const imagePattern = /<img\b[^>]*>/gi;
  let match;

  while ((match = imagePattern.exec(articleHtml))) {
    const tag = match[0];
    const source = getMatch(tag, [
      /\bdata-src=["']([^"']+)["']/i,
      /\bsrc=["']([^"']+)["']/i,
      /\bdata-original=["']([^"']+)["']/i,
    ]);

    if (source && !images.includes(source)) {
      images.push(source);
    }
  }

  return images;
}

function parseArticle(html, finalUrl) {
  const article = pickArticleHtml(html);
  const articleHtml = article.html;
  const title = getMatch(html, [
    /var\s+msg_title\s*=\s*['"]([\s\S]*?)['"]\s*;/,
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
    /<title[^>]*>([\s\S]*?)<\/title>/i,
  ]);
  const author = getMatch(html, [
    /var\s+nickname\s*=\s*['"]([\s\S]*?)['"]\s*;/,
    /<a[^>]+id=["']js_name["'][^>]*>([\s\S]*?)<\/a>/i,
  ]);
  const text = normalizeText(articleHtml);
  const images = extractImages(articleHtml);

  return {
    title,
    author,
    text,
    images,
    hasArticleContainer: article.found,
    url: finalUrl,
    wordCount: text.length,
  };
}

function validateTarget(rawUrl) {
  let target;

  try {
    target = new URL(rawUrl);
  } catch {
    throw new Error("请输入有效的文章链接");
  }

  if (!["http:", "https:"].includes(target.protocol)) {
    throw new Error("仅支持 http 或 https 链接");
  }

  if (target.hostname !== "mp.weixin.qq.com") {
    throw new Error("当前仅支持 mp.weixin.qq.com 公众号文章或临时预览链接");
  }

  return target;
}

function validateImageTarget(rawUrl) {
  const target = validateHttpUrl(rawUrl);
  const allowedHosts = ["mp.weixin.qq.com", "mmbiz.qpic.cn", "mmbiz.qlogo.cn", "thirdwx.qlogo.cn"];
  const isAllowed = allowedHosts.includes(target.hostname) || target.hostname.endsWith(".qpic.cn");

  if (!isAllowed) {
    throw new Error("仅支持微信图文图片地址");
  }

  return target;
}

function validateHttpUrl(rawUrl) {
  let target;

  try {
    target = new URL(rawUrl);
  } catch {
    throw new Error("请输入有效的链接");
  }

  if (!["http:", "https:"].includes(target.protocol)) {
    throw new Error("仅支持 http 或 https 链接");
  }

  return target;
}

async function handleExtract(request, response, requestUrl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const target = validateTarget(requestUrl.searchParams.get("url") || "");
    const upstream = await fetch(target, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Referer": "https://mp.weixin.qq.com/",
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.49",
      },
    });

    const html = await upstream.text();
    const article = parseArticle(html, upstream.url);

    if (!upstream.ok) {
      sendJson(response, upstream.status, {
        error: `链接读取失败，状态码 ${upstream.status}`,
      });
      return;
    }

    if (!article.hasArticleContainer || !article.text || article.text.length < 20) {
      sendJson(response, 422, {
        error: "未能从链接中解析出完整正文，可能需要登录态或链接已过期",
      });
      return;
    }

    sendJson(response, 200, article);
  } catch (error) {
    const message = error.name === "AbortError" ? "链接读取超时" : error.message;
    sendJson(response, 400, { error: message });
  } finally {
    clearTimeout(timeout);
  }
}

async function handleImage(request, response, requestUrl) {
  try {
    const target = validateImageTarget(requestUrl.searchParams.get("url") || "");
    const upstream = await fetch(target, {
      redirect: "follow",
      headers: {
        "Referer": "https://mp.weixin.qq.com/",
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.49",
      },
    });

    if (!upstream.ok) {
      sendJson(response, upstream.status, { error: "图片读取失败" });
      return;
    }

    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    const buffer = Buffer.from(await upstream.arrayBuffer());

    response.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
    });
    response.end(buffer);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
  }
}

function serveStatic(request, response, requestUrl) {
  const pathname = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
  const decodedPath = decodeURIComponent(pathname);
  const filePath = path.normalize(path.join(root, decodedPath));

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": staticTypes[path.extname(filePath)] || "application/octet-stream",
    });
    response.end(content);
  });
}

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);

  if (requestUrl.pathname === "/health") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (requestUrl.pathname === "/api/extract") {
    handleExtract(request, response, requestUrl);
    return;
  }

  if (requestUrl.pathname === "/api/image") {
    handleImage(request, response, requestUrl);
    return;
  }

  serveStatic(request, response, requestUrl);
});

function getLocalAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((item) => item && item.family === "IPv4" && !item.internal)
    .map((item) => item.address);
}

server.listen(port, host, () => {
  console.log(`公众号审核页面已启动：http://127.0.0.1:${port}/`);
  getLocalAddresses().forEach((address) => {
    console.log(`局域网访问地址：http://${address}:${port}/`);
  });
});
