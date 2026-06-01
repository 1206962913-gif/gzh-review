function sendJson(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function validateImageTarget(rawUrl) {
  let target;

  try {
    target = new URL(rawUrl);
  } catch {
    throw new Error("请输入有效的链接");
  }

  if (!["http:", "https:"].includes(target.protocol)) {
    throw new Error("仅支持 http 或 https 链接");
  }

  const allowedHosts = [
    "mp.weixin.qq.com",
    "mmbiz.qpic.cn",
    "mmbiz.qlogo.cn",
    "thirdwx.qlogo.cn",
    "img.xiumi.us",
    "statics.xiumi.us",
    "stc.xiumius.cn",
    "sd.xiumius.cn",
  ];
  const isAllowed =
    allowedHosts.includes(target.hostname) ||
    target.hostname.endsWith(".qpic.cn") ||
    target.hostname.endsWith(".xiumi.us") ||
    target.hostname.endsWith(".xiumius.cn");

  if (!isAllowed) {
    throw new Error("仅支持微信或秀米图文图片地址");
  }

  return target;
}

export async function onRequestGet(context) {
  try {
    const target = validateImageTarget(new URL(context.request.url).searchParams.get("url") || "");
    const upstream = await fetch(target, {
      redirect: "follow",
      headers: {
        "Referer": "https://mp.weixin.qq.com/",
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.49",
      },
    });

    if (!upstream.ok) {
      return sendJson({ error: "图片读取失败" }, upstream.status);
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    return sendJson({ error: error.message }, 400);
  }
}
