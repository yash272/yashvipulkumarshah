import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  buildBlog,
  loadPosts,
  parsePost,
  renderArticle,
  renderHub
} from "../scripts/build-blog.mjs";

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

const postFixture = {
  title: "Community < marketplace",
  description: "What a failed marketplace taught me about focus & sequence.",
  date: "2026-08-24",
  dateLabel: "Aug 24, 2026",
  tags: ["Product", "Founder"],
  draft: false,
  slug: "community-before-marketplace",
  bodyHtml: "<h2>The decision</h2><p>Start with the people.</p>",
  readingMinutes: 4
};

test("renderHub makes the empty state feel deliberate", () => {
  const html = renderHub([]);

  assert.match(html, /Nothing published yet\./);
  assert.match(html, /The first note is in progress\./);
});

test("renderHub keeps the hero focused on the Blog title", () => {
  const html = renderHub([]);
  const hero = html.match(/<section class="blog-hero shell"[\s\S]*?<\/section>/)?.[0];

  assert.match(html, /<meta name="description" content="Personal blog by Yash Shah\.">/);
  assert.match(hero, /<h1 id="blog-title">Blog<em>\.<\/em><\/h1>/);
  assert.doesNotMatch(hero, /<p|<aside/);
  assert.doesNotMatch(html, /Current threads|Products|Systems|Field notes/);
});

test("renderHub identifies the section as Blog", () => {
  const html = renderHub([]);

  assert.match(html, /<title>Blog · Yash Shah<\/title>/);
  assert.match(html, /<h1 id="blog-title">Blog<em>\.<\/em><\/h1>/);
  assert.match(html, /aria-current="page"[^>]*>Blog<\/a>/);
  assert.doesNotMatch(html, />Writing<\/a>/);
});

test("blog navigation contains only Blog, About, and Contact", () => {
  const html = renderHub([]);
  const nav = html.match(/<nav aria-label="Primary navigation">([\s\S]*?)<\/nav>/)?.[1];
  const labels = [...nav.matchAll(/<a[^>]*>([^<]+)<\/a>/g)].map((match) => match[1]);

  assert.deepEqual(labels, ["Blog", "About", "Contact"]);
});

test("renderHub lists articles and escapes frontmatter", () => {
  const html = renderHub([postFixture]);

  assert.match(html, /community-before-marketplace\/index\.html/);
  assert.match(html, /Community &lt; marketplace/);
  assert.match(html, /focus &amp; sequence/);
  assert.doesNotMatch(html, /Community < marketplace/);
});

test("renderArticle includes canonical metadata, article content, and reading time", () => {
  const html = renderArticle(postFixture);

  assert.match(html, /<link rel="canonical" href="https:\/\/yashvipulkumarshah\.com\/blog\/community-before-marketplace\/">/);
  assert.match(html, /<meta property="og:title" content="Community &lt; marketplace">/);
  assert.match(html, /4 min read/);
  assert.match(html, /<h2>The decision<\/h2><p>Start with the people\.<\/p>/);
  assert.match(html, /href="\.\.\/index\.html"/);
});

test("buildBlog replaces stale output and emits only published article routes", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "blog-build-"));
  await mkdir(path.join(root, "content", "blog"), { recursive: true });
  await mkdir(path.join(root, "blog", "stale"), { recursive: true });
  await writeFile(path.join(root, "blog", "stale", "index.html"), "old");
  await writeFile(
    path.join(root, "content", "blog", "published.md"),
    markdown({ title: "Published", date: "2026-08-24" })
  );
  await writeFile(
    path.join(root, "content", "blog", "draft.md"),
    markdown({ title: "Draft", date: "2026-08-23", draft: true })
  );

  await buildBlog({ rootDir: root });

  assert.match(await readFile(path.join(root, "blog", "index.html"), "utf8"), /Published/);
  assert.match(
    await readFile(path.join(root, "blog", "published", "index.html"), "utf8"),
    /Body copy\./
  );
  await assert.rejects(access(path.join(root, "blog", "draft", "index.html")));
  await assert.rejects(access(path.join(root, "blog", "stale", "index.html")));
});

test("portfolio navigation contains only Blog, About, and Contact", async () => {
  const portfolio = await readFile(path.join(process.cwd(), "index.html"), "utf8");
  const nav = portfolio.match(/<nav aria-label="Site">([\s\S]*?)<\/nav>/)?.[1];
  const labels = [...nav.matchAll(/<a[^>]*>([^<]+)<\/a>/g)].map((match) => match[1]);

  assert.deepEqual(labels, ["Blog", "About", "Contact"]);
  assert.match(nav, /<a class="keep" href="blog\/">Blog<\/a>/);
});
