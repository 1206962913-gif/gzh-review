const rules = window.sensitiveRules || [];
const publicityGuidelines = window.publicityGuidelines || [];

const form = document.querySelector("#reviewForm");
const resetButton = document.querySelector("#resetButton");
const urlInput = document.querySelector("#articleUrl");
const contentInput = document.querySelector("#articleContent");
const submitButton = form.querySelector("button[type='submit']");
const pairedResultList = document.querySelector("#pairedResultList");
const statusText = document.querySelector("#statusText");
const riskMeter = document.querySelector("#riskMeter");
const hitCount = document.querySelector("#hitCount");
const paragraphCount = document.querySelector("#paragraphCount");
const scanTime = document.querySelector("#scanTime");
const sourceTitle = document.querySelector("#sourceTitle");
const wordCount = document.querySelector("#wordCount");
const imageCount = document.querySelector("#imageCount");
const sourceUrl = document.querySelector("#sourceUrl");
const articlePreview = document.querySelector("#articlePreview");
const copyFeedbackButton = document.querySelector("#copyFeedbackButton");
const copyStatus = document.querySelector("#copyStatus");
let latestArticle = null;
let latestHits = [];

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return map[char];
  });
}

function highlight(text, word) {
  const safeText = escapeHtml(text);
  const safeWord = escapeHtml(word);
  return safeText.replaceAll(safeWord, `<mark>${safeWord}</mark>`);
}

function getParagraphs(text) {
  return text
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function scanContent(text) {
  const paragraphs = getParagraphs(text);
  const hits = [];

  paragraphs.forEach((paragraph, index) => {
    rules.forEach((rule) => {
      if (paragraph.includes(rule.word)) {
        hits.push({
          ...rule,
          paragraph,
          paragraphIndex: index + 1,
        });
      }
    });
  });

  return hits;
}

function getRiskSummary(hits) {
  if (hits.some((item) => item.level === "high")) {
    return { text: "高风险", width: "100%", color: "var(--danger)" };
  }

  if (hits.some((item) => item.level === "medium")) {
    return { text: "需复核", width: "66%", color: "var(--warning)" };
  }

  if (hits.length > 0) {
    return { text: "低风险", width: "34%", color: "var(--ok)" };
  }

  return { text: "未发现风险", width: "12%", color: "var(--ok)" };
}

function renderPairedResults(hits) {
  if (hits.length === 0) {
    pairedResultList.className = "empty-state";
    pairedResultList.innerHTML = `
      <i data-lucide="check-circle-2"></i>
      <p>未命中当前规则库中的敏感词。仍建议按单位发布流程进行人工复核。</p>
    `;
    return;
  }

  pairedResultList.className = "paired-result-list";
  pairedResultList.innerHTML = hits
    .map(
      (hit) => `
        <div class="paired-row">
          <article class="risk-item">
            <div class="risk-title">
              <strong>${escapeHtml(hit.word)}</strong>
              <span class="badge ${hit.level}">${hit.label}</span>
            </div>
            <p class="category">类别：${escapeHtml(hit.category || "通用词库")}</p>
            <p>第 ${hit.paragraphIndex} 段：${highlight(hit.paragraph, hit.word)}</p>
          </article>
          <article class="suggestion-item">
            <div class="suggestion-title">
              <strong>${escapeHtml(hit.word)}</strong>
              <span class="badge ${hit.level}">${hit.label}</span>
            </div>
            <p>建议替换表达：${escapeHtml(hit.suggestion)}</p>
            <div class="replacement">处理方向：采用更稳妥的宣传口径，避免直接使用敏感经营表述。</div>
          </article>
        </div>
      `,
    )
    .join("");
}

function updateSummary(hits) {
  const summary = getRiskSummary(hits);
  const riskyParagraphs = new Set(hits.map((item) => item.paragraphIndex));

  statusText.textContent = summary.text;
  riskMeter.style.width = summary.width;
  riskMeter.style.background = summary.color;
  hitCount.textContent = hits.length.toString();
  paragraphCount.textContent = riskyParagraphs.size.toString();
  scanTime.textContent = new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());
}

function buildFeedbackText() {
  const title = latestArticle?.title || sourceTitle.textContent || "未命名稿件";
  const url = latestArticle?.url || urlInput.value.trim() || "未提供";
  const scanAt = scanTime.textContent || "";
  const lines = [
    "公众号发布前审核反馈",
    "",
    `稿件标题：${title}`,
    `稿件链接：${url}`,
    `检测时间：${scanAt}`,
    `命中数量：${latestHits.length}`,
    "",
  ];

  if (latestHits.length === 0) {
    lines.push("检测结果：未命中当前词库中的敏感表述。");
    lines.push("提示：仍建议按单位发布流程进行人工复核。");
    return lines.join("\n");
  }

  lines.push("风险命中及修改建议：");
  latestHits.forEach((hit, index) => {
    lines.push("");
    lines.push(`${index + 1}. 命中表述：${hit.word}`);
    lines.push(`   类别：${hit.category || "通用词库"}`);
    lines.push(`   所在位置：第 ${hit.paragraphIndex} 段`);
    lines.push(`   原文片段：${hit.paragraph}`);
    lines.push(`   建议替换表达：${hit.suggestion}`);
  });

  return lines.join("\n");
}

function updateCopyState(hits) {
  latestHits = hits;
  copyFeedbackButton.disabled = false;
  copyStatus.textContent = hits.length > 0
    ? `已生成 ${hits.length} 条反馈，可复制给送检单位。`
    : "未命中当前词库，也可复制审核结果反馈。";
}

async function copyFeedback() {
  const text = buildFeedbackText();

  try {
    await navigator.clipboard.writeText(text);
    copyStatus.textContent = "已复制，可直接粘贴给送检单位。";
  } catch {
    const helper = document.createElement("textarea");
    helper.value = text;
    helper.setAttribute("readonly", "");
    helper.style.position = "fixed";
    helper.style.left = "-9999px";
    document.body.appendChild(helper);
    helper.select();
    document.execCommand("copy");
    document.body.removeChild(helper);
    copyStatus.textContent = "已复制，可直接粘贴给送检单位。";
  }
}

function renderGuidelines() {
  if (publicityGuidelines.length === 0 || pairedResultList.className !== "empty-state") {
    return;
  }

  pairedResultList.innerHTML += `
    <div class="guideline-box">
      <strong>公众号宣传建议</strong>
      <ul>
        ${publicityGuidelines.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    </div>
  `;
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.innerHTML = isLoading
    ? '<i data-lucide="loader-circle"></i> 正在读取'
    : '<i data-lucide="scan-search"></i> 开始检测';

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function showSourceMeta(article) {
  sourceTitle.textContent = article.title || "已读取链接正文";
  wordCount.textContent = article.text.length.toString();
  imageCount.textContent = article.images.length.toString();
  sourceUrl.textContent = article.url || "已读取";
}

function showReadError(message) {
  sourceTitle.textContent = message;
  wordCount.textContent = "0";
  imageCount.textContent = "0";
  sourceUrl.textContent = "读取失败";
}

function renderArticlePreview(article) {
  const images = article.images
    .map((image) => {
      const proxiedImage = `/api/image?url=${encodeURIComponent(image)}`;
      return `
        <a href="${escapeHtml(image)}" target="_blank" rel="noreferrer">
          <img src="${escapeHtml(proxiedImage)}" alt="文章图片" loading="lazy" />
        </a>
      `;
    })
    .join("");

  articlePreview.className = "article-body";
  articlePreview.innerHTML = `
    <div class="article-text">${escapeHtml(article.text)}</div>
    ${images ? `<div class="image-grid">${images}</div>` : ""}
  `;
}

function resetArticlePreview() {
  sourceUrl.textContent = "等待链接";
  articlePreview.className = "empty-state";
  articlePreview.innerHTML = `
    <i data-lucide="newspaper"></i>
    <p>读取成功后，这里会展示文章正文和图片，便于确认图文内容是否完整。</p>
  `;
}

async function readArticleFromUrl(url) {
  const response = await fetch(`/api/extract?url=${encodeURIComponent(url)}`);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "链接内容读取失败");
  }

  return payload;
}

function runScan(text) {
  const hits = scanContent(text);

  renderPairedResults(hits);
  updateSummary(hits);
  updateCopyState(hits);
  renderGuidelines();

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const url = urlInput.value.trim();
  const fallbackText = contentInput.value.trim();

  setLoading(true);
  sourceTitle.textContent = "正在读取链接内容...";

  try {
    const article = await readArticleFromUrl(url);
    latestArticle = article;
    contentInput.value = article.text;
    showSourceMeta(article);
    renderArticlePreview(article);
    runScan(article.text);
  } catch (error) {
    if (!fallbackText) {
      showReadError(error.message);
      pairedResultList.className = "empty-state";
      pairedResultList.innerHTML = `
        <i data-lucide="circle-alert"></i>
        <p>${escapeHtml(error.message)}。如果这是需要登录态的临时预览链接，请先粘贴正文再检测。</p>
      `;
      updateSummary([]);
      resetArticlePreview();
    } else {
      showReadError(`${error.message}，已使用粘贴正文检测`);
      latestArticle = {
        title: "粘贴正文",
        url: urlInput.value.trim(),
        text: fallbackText,
        images: [],
      };
      articlePreview.className = "article-body";
      articlePreview.innerHTML = `<div class="article-text">${escapeHtml(fallbackText)}</div>`;
      runScan(fallbackText);
    }
  } finally {
    setLoading(false);
  }
});

resetButton.addEventListener("click", () => {
  form.reset();
  pairedResultList.className = "empty-state";
  pairedResultList.innerHTML = `
    <i data-lucide="file-search"></i>
    <p>提交链接后，这里会按“左侧风险、右侧建议”的方式逐条展示。</p>
  `;
  statusText.textContent = "等待检测";
  riskMeter.style.width = "0";
  hitCount.textContent = "0";
  paragraphCount.textContent = "0";
  scanTime.textContent = "尚未检测";
  sourceTitle.textContent = "尚未读取链接内容";
  wordCount.textContent = "0";
  imageCount.textContent = "0";
  latestArticle = null;
  latestHits = [];
  copyFeedbackButton.disabled = true;
  copyStatus.textContent = "检测完成后，可一键复制风险命中和修改建议。";
  resetArticlePreview();

  if (window.lucide) {
    window.lucide.createIcons();
  }
});

copyFeedbackButton.addEventListener("click", copyFeedback);

window.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) {
    window.lucide.createIcons();
  }

  urlInput.value = "";
});
