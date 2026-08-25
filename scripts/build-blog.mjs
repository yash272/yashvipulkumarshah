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
