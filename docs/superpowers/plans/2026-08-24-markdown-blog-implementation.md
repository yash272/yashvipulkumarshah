# Markdown Blog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a visually distinctive static writing hub that generates SEO-ready article pages from local Markdown files.

**Architecture:** A dependency-light Node generator reads trusted Markdown plus YAML frontmatter from `content/blog`, validates and sorts posts, then writes a complete static `blog/` tree. The generated pages carry their own shared inline CSS and minimal JavaScript, so the existing static host serves them without a build step.

**Tech Stack:** HTML5, CSS, minimal browser JavaScript, Node.js 20+, `marked@18.0.11`, `gray-matter@4.0.3`, Node's built-in test runner.

**Spec:** `docs/superpowers/specs/2026-08-24-markdown-blog-design.md`

## Global Constraints

- Keep the portfolio and blog deployable as ordinary static files.
- Use `Writing` as the portfolio navigation label.
- Use `Notes on products, systems, and building` as the hub heading.
- Publish no article during the initial implementation.
- Ignore `content/blog/_template.md` during generation.
- Omit drafts from the hub and from generated article routes.
- Treat Markdown bodies as trusted local input, but escape all frontmatter inserted into HTML or metadata.
- Preserve the current cream paper, Fraunces, Inter, DM Mono, ruled-line, and red-annotation language.
- Do not modify or stage the unrelated untracked `stumpvizz/` directory.

---

### Task 1: Establish The Markdown Contract

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Create: `content/blog/_template.md`
- Create: `tests/blog-build.test.mjs`
- Create: `scripts/build-blog.mjs`

**Interfaces:**
- Produces: `parsePost(source: string, fileName: string): Post`
- Produces: `loadPosts(contentDir: string): Promise<Post[]>`
- `Post` fields: `title`, `description`, `date`, `dateLabel`, `tags`, `draft`, `slug`, `bodyHtml`, `readingMinutes`.

- [ ] **Step 1: Add the build and test commands**

Create `package.json` with pinned build-time dependencies:

```json
{
  "name": "yash-shah-portfolio",
  "private": true,
  "type": "module",
  "scripts": {
    "blog:build": "node scripts/build-blog.mjs",
    "test": "node --test tests/blog-build.test.mjs"
  },
  "devDependencies": {
    "gray-matter": "4.0.3",
    "marked": "18.0.11"
  }
}
```

Run `npm install --package-lock-only` and then `npm install` so tests use the pinned lockfile.

- [ ] **Step 2: Write failing parser and loader tests**

Create `tests/blog-build.test.mjs` using `node:test`, `node:assert/strict`, and temporary directories. Cover these exact behaviors:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parsePost, loadPosts } from "../scripts/build-blog.mjs";

const markdown = ({ title, description = "Description", date, draft = false }) => `---
title: "${title}"
description: "${description}"
date: ${date}
tags: [Product]
draft: ${draft}
---
Body copy.
`;

test("parsePost validates and normalizes a publishable post", () => {
  const post = parsePost(`---
title: "Community before marketplace"
description: "What Bookchange taught me."
date: 2026-08-24
tags: [Product, Founder]
draft: false
---
# First heading

Useful body copy.
`, "community-before-marketplace.md");

  assert.equal(post.slug, "community-before-marketplace");
  assert.equal(post.date, "2026-08-24");
  assert.deepEqual(post.tags, ["Product", "Founder"]);
  assert.match(post.bodyHtml, /<h1>First heading<\/h1>/);
  assert.equal(post.readingMinutes, 1);
});

test("parsePost reports required fields with the filename", () => {
  assert.throws(
    () => parsePost("---\ntitle: Missing fields\n---\nBody", "broken.md"),
    /broken\.md: description is required; date is required/
  );
});

test("loadPosts ignores templates and drafts and sorts newest first", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "blog-load-"));
  await Promise.all([
    writeFile(path.join(root, "_template.md"), markdown({ title: "Template", date: "2026-08-24" })),
    writeFile(path.join(root, "draft.md"), markdown({ title: "Draft", date: "2026-08-24", draft: true })),
    writeFile(path.join(root, "older.md"), markdown({ title: "Older", date: "2026-08-20" })),
    writeFile(path.join(root, "newer.md"), markdown({ title: "Newer", date: "2026-08-23" }))
  ]);
  const posts = await loadPosts(root);
  assert.deepEqual(posts.map((post) => post.slug), ["newer", "older"]);
});

test("loadPosts rejects duplicate normalized slugs", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "blog-slug-"));
  await Promise.all([
    writeFile(path.join(root, "hello-world.md"), markdown({ title: "One", date: "2026-08-23" })),
    writeFile(path.join(root, "hello_world.md"), markdown({ title: "Two", date: "2026-08-22" }))
  ]);
  await assert.rejects(() => loadPosts(root), /Duplicate blog slug: hello-world/);
});
```

- [ ] **Step 3: Run tests and verify the red state**

Run: `npm test`

Expected: FAIL because `scripts/build-blog.mjs` does not yet export `parsePost` and `loadPosts`.

- [ ] **Step 4: Implement the parser and loader**

In `scripts/build-blog.mjs`:

```js
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
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
  return path.basename(fileName, path.extname(fileName))
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
    dateLabel: new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date),
    tags: (data.tags || []).map(String),
    draft: data.draft === true,
    slug: slugFromFilename(fileName),
    bodyHtml: marked.parse(content, { gfm: true }),
    readingMinutes: Math.max(1, Math.ceil(wordCount / 220))
  };
}

export async function loadPosts(contentDir) {
  const fileNames = (await readdir(contentDir)).filter((name) => name.endsWith(".md") && !name.startsWith("_"));
  const posts = await Promise.all(fileNames.map(async (name) => parsePost(await readFile(path.join(contentDir, name), "utf8"), name)));
  const seen = new Set();
  for (const post of posts) {
    if (seen.has(post.slug)) throw new Error(`Duplicate blog slug: ${post.slug}`);
    seen.add(post.slug);
  }
  return posts.filter((post) => !post.draft).sort((a, b) => b.date.localeCompare(a.date));
}
```

- [ ] **Step 5: Add the authoring template**

Create `content/blog/_template.md`:

```md
---
title: "Article title"
description: "One sentence for the hub and search metadata."
date: 2026-08-24
tags:
  - Product
draft: true
---

Start writing here.
```

- [ ] **Step 6: Run tests and verify green**

Run: `npm test`

Expected: all parser and loader tests PASS.

- [ ] **Step 7: Commit the Markdown contract**

```bash
git add package.json package-lock.json content/blog/_template.md scripts/build-blog.mjs tests/blog-build.test.mjs
git commit -m "feat: add markdown blog content pipeline"
```

---

### Task 2: Generate The Hub And Article Pages

**Files:**
- Modify: `scripts/build-blog.mjs`
- Modify: `tests/blog-build.test.mjs`
- Generate: `blog/index.html`

**Interfaces:**
- Consumes: `Post[]` from `loadPosts`.
- Produces: `renderHub(posts: Post[]): string`.
- Produces: `renderArticle(post: Post): string`.
- Produces: `buildBlog({ rootDir?: string }): Promise<void>`.

- [ ] **Step 1: Write failing rendering tests**

Add tests that assert:

```js
const postFixture = parsePost(`---
title: "Community before marketplace"
description: "What Bookchange taught me."
date: 2026-08-24
tags: [Product, Founder]
draft: false
---
An article body.
`, "community-before-marketplace.md");

test("renderHub creates the composed empty state", () => {
  const html = renderHub([]);
  assert.match(html, /Notes on products, systems, and building/);
  assert.match(html, /Nothing published yet\./);
  assert.match(html, /The first note is in progress\./);
  assert.match(html, /Current threads/);
});

test("renderHub escapes metadata and links whole article rows", () => {
  const html = renderHub([{ ...postFixture, title: '<Decision & trade-off>' }]);
  assert.match(html, /&lt;Decision &amp; trade-off&gt;/);
  assert.match(html, /href="\.\/community-before-marketplace\/"/);
});

test("renderArticle emits canonical metadata and article content", () => {
  const html = renderArticle(postFixture);
  assert.match(html, /<link rel="canonical" href="https:\/\/yashvipulkumarshah\.com\/blog\/community-before-marketplace\/">/);
  assert.match(html, /1 min read/);
  assert.match(html, /class="article-body"/);
});

test("buildBlog removes stale generated routes and emits only published posts", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "blog-build-"));
  await mkdir(path.join(root, "content", "blog"), { recursive: true });
  await mkdir(path.join(root, "blog", "old-post"), { recursive: true });
  await writeFile(path.join(root, "blog", "old-post", "index.html"), "stale");
  await writeFile(path.join(root, "content", "blog", "published.md"), markdown({ title: "Published", date: "2026-08-24" }));
  await writeFile(path.join(root, "content", "blog", "draft.md"), markdown({ title: "Draft", date: "2026-08-23", draft: true }));

  await buildBlog({ rootDir: root });

  assert.match(await readFile(path.join(root, "blog", "index.html"), "utf8"), /Published/);
  assert.match(await readFile(path.join(root, "blog", "published", "index.html"), "utf8"), /Published/);
  await assert.rejects(() => readFile(path.join(root, "blog", "draft", "index.html"), "utf8"), /ENOENT/);
  await assert.rejects(() => readFile(path.join(root, "blog", "old-post", "index.html"), "utf8"), /ENOENT/);
});
```

- [ ] **Step 2: Run tests and verify the red state**

Run: `npm test`

Expected: FAIL because `renderHub`, `renderArticle`, and `buildBlog` are not exported.

- [ ] **Step 3: Implement shared document chrome**

Add `renderDocument({ title, description, canonicalPath, body, articleScript })` and shared CSS constants to `scripts/build-blog.mjs`. Use these exact visual tokens:

```css
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
```

Import the same Fraunces, DM Mono, and Inter Google Fonts used by `index.html`. `renderDocument` accepts a `portfolioPrefix` so pages also work when opened directly from disk. The hub uses `../`; article pages use `../../`. The shared header is:

```html
<header class="site-head">
  <a class="wordmark" href="${portfolioPrefix}index.html">Yash Shah</a>
  <nav aria-label="Site">
    <a href="${portfolioPrefix}index.html#accept">Work</a>
    <a href="${portfolioPrefix}index.html#about">About</a>
    <a href="${portfolioPrefix}blog/index.html" aria-current="page">Writing</a>
    <a href="${portfolioPrefix}index.html#contact">Contact</a>
  </nav>
</header>
```

- [ ] **Step 4: Implement the visually complete hub**

`renderHub(posts)` must render:

```html
<main class="writing-hub">
  <section class="writing-hero">
    <div class="folio" aria-hidden="true">Writing</div>
    <div class="writing-thesis">
      <p class="mono kicker">Notes from Yash Shah</p>
      <h1>Notes on products, systems, and <em>building.</em></h1>
    </div>
    <aside class="threads" aria-label="Current writing themes">
      <span class="mono">Current threads</span>
      <ol><li>Products</li><li>Systems</li><li>Building</li></ol>
    </aside>
  </section>
  <section class="article-index" aria-labelledby="article-index-title">
    <div class="index-head"><h2 id="article-index-title">Published notes</h2><span class="mono">Newest first</span></div>
    <!-- Article rows or the composed empty state -->
  </section>
</main>
```

The empty state contains folio `00`, a red `.margin-mark`, `Nothing published yet.`, and `The first note is in progress.` Article rows use a four-column desktop grid and collapse to one column below `720px`. On hover or `:focus-visible`, the red margin mark translates no more than `6px` in `180ms ease-out`; on `:active`, the row scales to `0.99`.

- [ ] **Step 5: Implement article pages and generator output**

`renderArticle(post)` must escape title, description, date, and tags, while inserting trusted `post.bodyHtml` into `.article-body`. Add CSS for headings, paragraphs, lists, blockquotes, code, preformatted blocks, images, and links. Add a top reading-progress element and this minimal script:

```js
const progress = document.querySelector(".reading-progress i");
addEventListener("scroll", () => {
  const max = document.documentElement.scrollHeight - innerHeight;
  progress.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
}, { passive: true });
```

`buildBlog({ rootDir = process.cwd() } = {})` must load `content/blog`, remove and recreate `blog`, write the hub, and write `blog/<slug>/index.html` for each published post. Invoke it when the module runs as the CLI entry point.

- [ ] **Step 6: Run tests and generate the empty hub**

Run:

```bash
npm test
npm run blog:build
```

Expected: all tests PASS; `blog/index.html` exists; no article directories exist.

- [ ] **Step 7: Commit generated blog pages**

```bash
git add scripts/build-blog.mjs tests/blog-build.test.mjs blog/index.html
git commit -m "feat: generate writing hub and article pages"
```

---

### Task 3: Connect The Portfolio To Writing

**Files:**
- Modify: `index.html`
- Modify: `tests/blog-build.test.mjs`

**Interfaces:**
- Consumes: public route `/blog/` generated in Task 2.
- Produces: a visible `Writing` navigation path on desktop and mobile.

- [ ] **Step 1: Add a failing portfolio-navigation test**

```js
test("portfolio navigation links to the writing hub", async () => {
  const projectRoot = path.resolve(import.meta.dirname, "..");
  const html = await readFile(path.join(projectRoot, "index.html"), "utf8");
  assert.match(html, /<a class="keep" href="blog\/">Writing<\/a>/);
});
```

- [ ] **Step 2: Run tests and verify the red state**

Run: `npm test`

Expected: FAIL because `index.html` has no Writing link.

- [ ] **Step 3: Add Writing to the existing header**

Add this link after Fitness and before About:

```html
<a class="keep" href="blog/">Writing</a>
```

Update the mobile navigation rule so Writing and Contact remain visible while product anchors and About remain hidden. Preserve the current fixed header width and do not change the product sections.

- [ ] **Step 4: Run tests and source checks**

Run:

```bash
npm test
git diff --check -- index.html
```

Expected: all tests PASS and no whitespace errors.

- [ ] **Step 5: Commit the portfolio link**

```bash
git add index.html tests/blog-build.test.mjs
git commit -m "feat: link portfolio to writing hub"
```

---

### Task 4: Verify Publishing And Responsive Design

**Files:**
- Modify if required by findings: `scripts/build-blog.mjs`
- Modify if required by findings: `tests/blog-build.test.mjs`
- Regenerate: `blog/index.html`

**Interfaces:**
- Verifies all interfaces from Tasks 1-3.
- Produces no new public API.

- [ ] **Step 1: Run the full automated verification**

Run:

```bash
npm test
npm run blog:build
git diff --check
```

Expected: tests PASS, generator exits `0`, and diff check reports no errors.

- [ ] **Step 2: Verify a real article fixture without publishing it**

Create this exact fixture in a temporary non-repository `content/blog/visual-check.md`, call `buildBlog({ rootDir: tempRoot })`, and confirm the generated article contains each element and valid canonical metadata. Do not add the fixture to the repository:

````md
---
title: "A decision worth writing down"
description: "A temporary article used only to verify the reading experience."
date: 2026-08-24
tags: [Product, Systems]
draft: false
---

## Start with the constraint

This paragraph verifies the reading width and rhythm.

- One useful observation
- One concrete trade-off

> A decision becomes useful when someone else can inspect it.

[Return to the portfolio](../../index.html)

```js
const decision = "write it down";
```
````

- [ ] **Step 3: Perform desktop visual checks**

Serve the repository locally and inspect:

- Portfolio at `1400×900`: Writing link fits without shifting the fixed header.
- Hub at `1400×1000`: asymmetrical folio, thesis, current threads, ruled index, and empty state have a clear visual hierarchy.
- Temporary article at `1400×1000`: title, metadata, reading column, and progress rule remain legible.

- [ ] **Step 4: Perform mobile visual checks**

Inspect at `390×844`:

- Portfolio header shows Yash Shah, Writing, and Contact without overflow.
- Hub has no horizontal scrolling or clipped folio text.
- Empty state remains composed rather than appearing blank.
- Temporary article body wraps long links and code blocks scroll internally.

- [ ] **Step 5: Audit accessibility and motion**

Confirm keyboard focus is visible, every article row is one link, color is not the only active-state signal, and `prefers-reduced-motion: reduce` removes reveal and translation motion. Confirm all user-initiated transitions remain under `300ms` and use ease-out.

- [ ] **Step 6: Regenerate and commit final corrections**

Run `npm run blog:build` after any source change, then:

```bash
git add index.html package.json package-lock.json scripts/build-blog.mjs content/blog/_template.md tests/blog-build.test.mjs blog/index.html
git commit -m "fix: polish markdown writing experience"
```

Skip the commit if verification required no corrections.
