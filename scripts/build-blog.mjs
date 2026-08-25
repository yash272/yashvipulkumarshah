import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import matter from "gray-matter";
import { marked } from "marked";

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function slugFromFilename(fileName) {
  return path
    .basename(fileName, path.extname(fileName))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function parsePost(source, fileName) {
  const { data, content } = matter(source);
  const errors = [];

  if (!String(data.title || "").trim()) errors.push("title is required");
  if (!String(data.description || "").trim()) errors.push("description is required");
  if (!data.date || Number.isNaN(new Date(data.date).getTime())) errors.push("date is required");
  if (data.tags != null && !Array.isArray(data.tags)) errors.push("tags must be an array");
  if (errors.length) throw new Error(`${fileName}: ${errors.join("; ")}`);

  const date = new Date(data.date);
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  return {
    title: String(data.title).trim(),
    description: String(data.description).trim(),
    date: date.toISOString().slice(0, 10),
    dateLabel: new Intl.DateTimeFormat("en-CA", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC"
    }).format(date),
    tags: (data.tags || []).map(String),
    draft: data.draft === true,
    slug: slugFromFilename(fileName),
    bodyHtml: marked.parse(content, { gfm: true }),
    readingMinutes: Math.max(1, Math.ceil(wordCount / 220))
  };
}

export async function loadPosts(contentDir) {
  const fileNames = (await readdir(contentDir)).filter(
    (name) => name.endsWith(".md") && !name.startsWith("_")
  );
  const posts = await Promise.all(
    fileNames.map(async (name) =>
      parsePost(await readFile(path.join(contentDir, name), "utf8"), name)
    )
  );
  const seen = new Set();

  for (const post of posts) {
    if (seen.has(post.slug)) throw new Error(`Duplicate blog slug: ${post.slug}`);
    seen.add(post.slug);
  }

  return posts
    .filter((post) => !post.draft)
    .sort((a, b) => b.date.localeCompare(a.date));
}

const siteUrl = "https://yashvipulkumarshah.com";

function sharedStyles() {
  return `
    :root {
      --paper: #f4eddd;
      --paper-soft: #faf5e9;
      --ink: #18140c;
      --muted: #6b6350;
      --line: rgba(24, 20, 12, 0.14);
      --line-strong: rgba(24, 20, 12, 0.55);
      --pencil: #e8442e;
      --radius: 10px;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body {
      min-height: 100vh;
      overflow-x: hidden;
      background: var(--paper);
      color: var(--ink);
      font-family: "Inter", sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    a { color: inherit; }
    a, button { -webkit-tap-highlight-color: transparent; }
    a:focus-visible, button:focus-visible {
      outline: 2px solid var(--pencil);
      outline-offset: 5px;
    }
    .shell { width: min(100% - 64px, 1380px); margin-inline: auto; }
    .site-head {
      min-height: 82px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 32px;
      border-bottom: 1px solid var(--line);
    }
    .identity {
      font-family: "Fraunces", serif;
      font-size: 24px;
      font-weight: 700;
      line-height: 1;
      text-decoration: none;
    }
    .site-head nav { display: flex; align-items: center; gap: clamp(18px, 2.4vw, 36px); }
    .site-head nav a {
      position: relative;
      padding-block: 10px;
      color: var(--muted);
      font-family: "DM Mono", monospace;
      font-size: 11px;
      letter-spacing: 0.08em;
      text-decoration: none;
      text-transform: uppercase;
      transition: color 180ms ease;
    }
    .site-head nav a::after {
      content: "";
      position: absolute;
      right: 0;
      bottom: 4px;
      left: 0;
      height: 1px;
      background: currentColor;
      transform: scaleX(0);
      transform-origin: right;
      transition: transform 220ms ease;
    }
    .site-head nav a:hover,
    .site-head nav a[aria-current="page"] { color: var(--ink); }
    .site-head nav a:hover::after,
    .site-head nav a[aria-current="page"]::after {
      transform: scaleX(1);
      transform-origin: left;
    }
    .eyebrow {
      color: var(--pencil);
      font-family: "DM Mono", monospace;
      font-size: 11px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
    }
    .site-footer {
      min-height: 96px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      border-top: 1px solid var(--line);
      color: var(--muted);
      font-family: "DM Mono", monospace;
      font-size: 10px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .site-footer a { text-underline-offset: 4px; }

    @media (max-width: 760px) {
      .shell { width: min(100% - 40px, 1380px); }
      .site-head { min-height: 70px; gap: 18px; }
      .identity { font-size: 20px; }
      .site-head nav { gap: 16px; }
      .site-head nav a:not(.mobile-keep) { display: none; }
      .site-footer { padding-block: 28px; align-items: flex-start; flex-direction: column; }
    }

    @media (prefers-reduced-motion: reduce) {
      html { scroll-behavior: auto; }
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }
  `;
}

function pageHead({ title, description, canonical, type = "website" }) {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  return `
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="${safeDescription}">
    <meta name="theme-color" content="#f4eddd">
    <meta property="og:type" content="${type}">
    <meta property="og:title" content="${safeTitle}">
    <meta property="og:description" content="${safeDescription}">
    <meta property="og:url" content="${canonical}">
    <link rel="canonical" href="${canonical}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;0,9..144,700;1,9..144,300&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <title>${safeTitle} · Yash Shah</title>`;
}

function header(portfolioPrefix, current = "writing") {
  const links = [
    ["Work", `${portfolioPrefix}index.html#accept`, ""],
    ["About", `${portfolioPrefix}index.html#about`, ""],
    ["Writing", `${portfolioPrefix}blog/index.html`, "mobile-keep"],
    ["Contact", `${portfolioPrefix}index.html#contact`, "mobile-keep"]
  ];
  return `
    <header class="site-head shell">
      <a class="identity" href="${portfolioPrefix}index.html" aria-label="Yash Shah, home">Yash Shah</a>
      <nav aria-label="Primary navigation">
        ${links.map(([label, href, className]) => `<a${className ? ` class="${className}"` : ""} href="${href}"${current === label.toLowerCase() ? ' aria-current="page"' : ""}>${label}</a>`).join("\n        ")}
      </nav>
    </header>`;
}

function footer(portfolioPrefix) {
  return `
    <footer class="site-footer shell">
      <span>Yash Shah · Toronto · 2026</span>
      <a href="${portfolioPrefix}index.html#contact">Start a conversation</a>
    </footer>`;
}

function renderPostRow(post, index) {
  const number = String(index + 1).padStart(2, "0");
  return `
    <a class="post-row" href="${escapeHtml(post.slug)}/index.html">
      <span class="post-number">${number}</span>
      <span class="post-copy">
        <strong>${escapeHtml(post.title)}</strong>
        <span>${escapeHtml(post.description)}</span>
      </span>
      <span class="post-meta">${escapeHtml(post.dateLabel)}<br>${post.readingMinutes} min read</span>
      <span class="post-arrow" aria-hidden="true">↗</span>
    </a>`;
}

export function renderHub(posts, { portfolioPrefix = "../" } = {}) {
  const description = "Notes on products, systems, and building by Yash Shah.";
  const postList = posts.length
    ? posts.map(renderPostRow).join("\n")
    : `
      <div class="empty-row">
        <span class="empty-number">00</span>
        <div>
          <strong>Nothing published yet.</strong>
          <span>The first note is in progress.</span>
        </div>
        <span class="empty-mark" aria-hidden="true"></span>
      </div>`;

  return `<!doctype html>
<html lang="en">
<head>
  ${pageHead({
    title: "Writing",
    description,
    canonical: `${siteUrl}/blog/`
  })}
  <style>
    ${sharedStyles()}
    .writing-hero {
      position: relative;
      min-height: clamp(510px, 72vh, 760px);
      display: grid;
      grid-template-columns: minmax(0, 1.45fr) minmax(260px, 0.55fr);
      align-items: end;
      gap: clamp(44px, 8vw, 130px);
      padding-block: clamp(72px, 11vh, 132px) 64px;
    }
    .folio {
      position: absolute;
      top: clamp(44px, 8vh, 90px);
      right: 0;
      color: rgba(24, 20, 12, 0.045);
      font-family: "Fraunces", serif;
      font-size: clamp(150px, 27vw, 420px);
      font-weight: 700;
      line-height: 0.72;
      pointer-events: none;
      user-select: none;
    }
    .hero-copy { position: relative; z-index: 1; }
    .hero-copy h1 {
      max-width: 820px;
      margin-top: 18px;
      font-family: "Fraunces", serif;
      font-size: clamp(64px, 10vw, 152px);
      font-weight: 600;
      letter-spacing: -0.045em;
      line-height: 0.82;
    }
    .hero-copy h1 em { color: var(--pencil); font-weight: 300; }
    .hero-copy p {
      max-width: 500px;
      margin-top: 32px;
      color: var(--muted);
      font-size: 17px;
      line-height: 1.7;
    }
    .threads {
      position: relative;
      z-index: 1;
      padding-left: 24px;
      border-left: 1px solid var(--line-strong);
    }
    .threads ul { margin-top: 22px; list-style: none; }
    .threads li {
      display: flex;
      align-items: center;
      gap: 12px;
      padding-block: 13px;
      border-top: 1px solid var(--line);
      font-family: "Fraunces", serif;
      font-size: 23px;
    }
    .threads li::before {
      content: "";
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: var(--pencil);
    }
    .index-section { padding-bottom: clamp(90px, 13vw, 180px); }
    .index-head {
      display: grid;
      grid-template-columns: 60px minmax(0, 1fr) auto;
      gap: 24px;
      padding-block: 18px;
      border-top: 1px solid var(--line-strong);
      border-bottom: 1px solid var(--line);
      color: var(--muted);
      font-family: "DM Mono", monospace;
      font-size: 10px;
      letter-spacing: 0.13em;
      text-transform: uppercase;
    }
    .post-row {
      display: grid;
      grid-template-columns: 60px minmax(0, 1fr) 150px 28px;
      align-items: center;
      gap: 24px;
      min-height: 138px;
      border-bottom: 1px solid var(--line);
      text-decoration: none;
      transition: background 180ms ease, padding 180ms ease;
    }
    .post-row:hover { padding-inline: 14px; background: var(--paper-soft); }
    .post-number, .post-meta {
      color: var(--muted);
      font-family: "DM Mono", monospace;
      font-size: 10px;
      line-height: 1.7;
      text-transform: uppercase;
    }
    .post-copy { display: grid; gap: 9px; }
    .post-copy strong { font-family: "Fraunces", serif; font-size: clamp(25px, 3vw, 40px); line-height: 1.05; }
    .post-copy span { max-width: 620px; color: var(--muted); font-size: 13px; line-height: 1.55; }
    .post-arrow { color: var(--pencil); font-size: 22px; transition: transform 180ms ease; }
    .post-row:hover .post-arrow { transform: translate(4px, -4px); }
    .empty-row {
      position: relative;
      min-height: 230px;
      display: grid;
      grid-template-columns: 60px minmax(0, 1fr);
      align-items: center;
      gap: 24px;
      overflow: hidden;
      border-bottom: 1px solid var(--line);
    }
    .empty-number {
      color: var(--pencil);
      font-family: "DM Mono", monospace;
      font-size: 11px;
    }
    .empty-row div { display: grid; gap: 10px; }
    .empty-row strong { font-family: "Fraunces", serif; font-size: clamp(30px, 4vw, 54px); font-weight: 600; }
    .empty-row div span { color: var(--muted); font-size: 14px; }
    .empty-mark {
      position: absolute;
      right: clamp(18px, 7vw, 100px);
      width: clamp(80px, 13vw, 170px);
      height: 12px;
      border-top: 2px solid var(--pencil);
      border-radius: 50%;
      transform: rotate(-4deg);
    }

    @media (max-width: 760px) {
      .writing-hero {
        min-height: auto;
        grid-template-columns: 1fr;
        gap: 58px;
        padding-block: 68px 62px;
      }
      .folio { top: 72px; right: -18px; font-size: 190px; }
      .hero-copy h1 { max-width: 330px; font-size: clamp(62px, 21vw, 88px); overflow-wrap: anywhere; }
      .hero-copy p { max-width: 340px; margin-top: 24px; font-size: 15px; }
      .threads { width: min(100%, 340px); justify-self: end; }
      .threads li { font-size: 20px; }
      .index-head { grid-template-columns: 34px minmax(0, 1fr); gap: 14px; }
      .index-head span:last-child { display: none; }
      .post-row { grid-template-columns: 34px minmax(0, 1fr) 18px; gap: 14px; min-height: 150px; }
      .post-meta { display: none; }
      .post-copy strong { font-size: 27px; }
      .empty-row { min-height: 210px; grid-template-columns: 34px minmax(0, 1fr); gap: 14px; }
      .empty-row strong { font-size: 31px; }
      .empty-mark { right: -34px; width: 90px; }
    }
  </style>
</head>
<body>
  ${header(portfolioPrefix)}
  <main>
    <section class="writing-hero shell" aria-labelledby="writing-title">
      <span class="folio" aria-hidden="true">W</span>
      <div class="hero-copy">
        <p class="eyebrow">Field notes · Vol. 01</p>
        <h1 id="writing-title">Writing<em>.</em></h1>
        <p>Notes on products, systems, and building. I use this space to make the thinking behind the work visible.</p>
      </div>
      <aside class="threads" aria-labelledby="threads-title">
        <p class="eyebrow" id="threads-title">Current threads</p>
        <ul>
          <li>Products</li>
          <li>Systems</li>
          <li>Building</li>
        </ul>
      </aside>
    </section>
    <section class="index-section shell" aria-labelledby="article-index-title">
      <div class="index-head">
        <span>No.</span>
        <span id="article-index-title">Article index</span>
        <span>${posts.length ? `${posts.length} published` : "Opening soon"}</span>
      </div>
      ${postList}
    </section>
  </main>
  ${footer(portfolioPrefix)}
</body>
</html>`;
}

export function renderArticle(post, { portfolioPrefix = "../../" } = {}) {
  const canonical = `${siteUrl}/blog/${encodeURIComponent(post.slug)}/`;
  const tags = post.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
  return `<!doctype html>
<html lang="en">
<head>
  ${pageHead({
    title: post.title,
    description: post.description,
    canonical,
    type: "article"
  })}
  <meta property="article:published_time" content="${escapeHtml(post.date)}">
  <style>
    ${sharedStyles()}
    .read-progress {
      position: fixed;
      z-index: 20;
      top: 0;
      left: 0;
      width: 100%;
      height: 3px;
      background: var(--pencil);
      transform: scaleX(0);
      transform-origin: left;
    }
    .article-head {
      display: grid;
      grid-template-columns: minmax(120px, 0.28fr) minmax(0, 1fr);
      gap: clamp(32px, 7vw, 120px);
      padding-block: clamp(70px, 12vw, 150px) clamp(58px, 8vw, 96px);
      border-bottom: 1px solid var(--line-strong);
    }
    .back-link {
      align-self: start;
      color: var(--muted);
      font-family: "DM Mono", monospace;
      font-size: 10px;
      letter-spacing: 0.08em;
      text-decoration: none;
      text-transform: uppercase;
    }
    .back-link:hover { color: var(--ink); }
    .article-title h1 {
      max-width: 980px;
      margin-top: 20px;
      font-family: "Fraunces", serif;
      font-size: clamp(54px, 8vw, 120px);
      font-weight: 600;
      letter-spacing: -0.04em;
      line-height: 0.9;
      overflow-wrap: anywhere;
    }
    .dek { max-width: 700px; margin-top: 30px; color: var(--muted); font-size: 18px; line-height: 1.7; }
    .article-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 10px 24px;
      margin-top: 34px;
      color: var(--muted);
      font-family: "DM Mono", monospace;
      font-size: 10px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .article-meta span + span::before { content: "·"; margin-right: 24px; }
    .tag-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 22px; }
    .tag-list span {
      padding: 6px 10px;
      border: 1px solid var(--line);
      border-radius: 999px;
      color: var(--muted);
      font-family: "DM Mono", monospace;
      font-size: 9px;
      letter-spacing: 0.07em;
      text-transform: uppercase;
    }
    .article-layout {
      display: grid;
      grid-template-columns: minmax(120px, 0.28fr) minmax(0, 700px) minmax(0, 0.35fr);
      gap: clamp(32px, 7vw, 120px);
      padding-block: clamp(64px, 9vw, 120px) clamp(100px, 14vw, 180px);
    }
    .margin-note {
      color: var(--pencil);
      font-family: "DM Mono", monospace;
      font-size: 9px;
      letter-spacing: 0.12em;
      line-height: 1.7;
      text-transform: uppercase;
    }
    .article-body { min-width: 0; }
    .article-body > * + * { margin-top: 1.55em; }
    .article-body p, .article-body li { font-size: 18px; line-height: 1.85; }
    .article-body h2, .article-body h3 {
      margin-top: 2.2em;
      font-family: "Fraunces", serif;
      font-weight: 600;
      line-height: 1.08;
    }
    .article-body h2 { font-size: clamp(34px, 5vw, 52px); }
    .article-body h3 { font-size: clamp(26px, 4vw, 34px); }
    .article-body ul, .article-body ol { padding-left: 1.4em; }
    .article-body li + li { margin-top: 0.6em; }
    .article-body a { text-decoration-color: var(--pencil); text-underline-offset: 4px; }
    .article-body blockquote {
      margin-left: -34px;
      padding-left: 30px;
      border-left: 3px solid var(--pencil);
      font-family: "Fraunces", serif;
      font-size: 28px;
      font-style: italic;
      line-height: 1.45;
    }
    .article-body img { max-width: 100%; height: auto; border-radius: var(--radius); }
    .article-body pre {
      max-width: 100%;
      overflow-x: auto;
      padding: 22px;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: var(--paper-soft);
      font: 13px/1.7 "DM Mono", monospace;
    }
    .article-body code { font-family: "DM Mono", monospace; font-size: 0.86em; }
    .article-end { align-self: end; width: 72px; border-top: 2px solid var(--pencil); transform: rotate(-3deg); }

    @media (max-width: 760px) {
      .article-head { grid-template-columns: 1fr; gap: 44px; padding-block: 58px 60px; }
      .article-title h1 { font-size: clamp(50px, 16vw, 72px); }
      .dek { font-size: 16px; }
      .article-layout { grid-template-columns: 1fr; gap: 40px; padding-block: 54px 100px; }
      .article-body p, .article-body li { font-size: 17px; line-height: 1.78; }
      .article-body blockquote { margin-left: 0; padding-left: 20px; font-size: 24px; }
      .article-end { justify-self: end; }
    }
  </style>
</head>
<body>
  <div class="read-progress" aria-hidden="true"></div>
  ${header(portfolioPrefix)}
  <main>
    <header class="article-head shell">
      <a class="back-link" href="../index.html">← All writing</a>
      <div class="article-title">
        <p class="eyebrow">Field note</p>
        <h1>${escapeHtml(post.title)}</h1>
        <p class="dek">${escapeHtml(post.description)}</p>
        <div class="article-meta">
          <span>${escapeHtml(post.dateLabel)}</span>
          <span>${post.readingMinutes} min read</span>
        </div>
        ${tags ? `<div class="tag-list">${tags}</div>` : ""}
      </div>
    </header>
    <div class="article-layout shell">
      <p class="margin-note">A note by<br>Yash Shah</p>
      <article class="article-body">${post.bodyHtml}</article>
      <span class="article-end" aria-hidden="true"></span>
    </div>
  </main>
  ${footer(portfolioPrefix)}
  <script>
    const progress = document.querySelector('.read-progress');
    const updateProgress = () => {
      const distance = document.documentElement.scrollHeight - window.innerHeight;
      const amount = distance > 0 ? window.scrollY / distance : 0;
      progress.style.transform = 'scaleX(' + Math.min(1, amount) + ')';
    };
    updateProgress();
    addEventListener('scroll', updateProgress, { passive: true });
  </script>
</body>
</html>`;
}

export async function buildBlog({ rootDir = process.cwd() } = {}) {
  const contentDir = path.join(rootDir, "content", "blog");
  const outputDir = path.join(rootDir, "blog");
  const posts = await loadPosts(contentDir);

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, "index.html"), renderHub(posts));

  await Promise.all(posts.map(async (post) => {
    const postDir = path.join(outputDir, post.slug);
    await mkdir(postDir, { recursive: true });
    await writeFile(path.join(postDir, "index.html"), renderArticle(post));
  }));

  return posts;
}

const isDirectRun = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const posts = await buildBlog();
  console.log(`Built writing hub with ${posts.length} published article${posts.length === 1 ? "" : "s"}.`);
}
