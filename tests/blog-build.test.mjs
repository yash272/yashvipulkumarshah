import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { loadPosts, parsePost } from "../scripts/build-blog.mjs";

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
