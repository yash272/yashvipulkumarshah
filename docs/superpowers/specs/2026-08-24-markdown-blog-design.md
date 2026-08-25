# Markdown Blog Design

## Objective

Add a static writing hub to Yash Shah's existing portfolio. Yash will author posts as Markdown files, run one local command, and commit the generated HTML alongside the portfolio. The current static hosting setup must continue to work without a server, database, CMS, or deployment reconfiguration.

## Audience And Job

The hub is for people already exploring Yash's work and for readers who arrive through a shared article. It should make Yash's thinking legible without presenting itself as a corporate content feed. The navigation label is `Writing`; the page heading is `Notes on products, systems, and building`.

## Architecture

The source of truth for posts lives in `content/blog/*.md`. A Node script at `scripts/build-blog.mjs` reads each Markdown file, validates its frontmatter, converts the body with a maintained Markdown parser, and generates:

- `blog/index.html` for the writing hub.
- `blog/<slug>/index.html` for each published article.

Generated HTML is committed to Git. Hosting therefore serves ordinary static files and does not need to run the generator. A root `package.json` provides `npm run blog:build` and pins the Markdown/frontmatter dependencies.

## Post Schema

Every source post uses YAML frontmatter:

```yaml
---
title: "A clear article title"
description: "One sentence used on the hub and in metadata."
date: 2026-08-24
tags:
  - Product
  - Building
draft: true
---
```

Rules:

- `title`, `description`, and `date` are required.
- The filename becomes the URL slug, for example `why-community-first.md` becomes `/blog/why-community-first/`.
- `tags` is optional and defaults to an empty list.
- `draft` is optional and defaults to `false`.
- Draft posts are omitted from the hub and are not emitted as article pages.
- Invalid frontmatter or duplicate slugs fail the build with a specific filename and message.
- Posts are sorted newest first.

## Hub Experience

The portfolio header gains a `Writing` link pointing to `blog/`. The writing hub reuses the current site's cream paper, Fraunces display face, Inter body face, DM Mono labels, hairline rules, and red annotation accent.

The page is structured as:

1. A compact shared header with `Yash Shah`, `Work`, `About`, and `Contact` links back to the portfolio.
2. An editorial introduction headed `Notes on products, systems, and building`.
3. A chronological article list. Each row contains the publication date, title, description, tags, and a directional arrow. The whole row is clickable.
4. A quiet footer linking to the portfolio and social profiles.

The initial build has no published posts. Instead of rendering an empty grid, it shows an intentional ruled empty state: `Nothing published yet.` followed by `The first note is in progress.` The empty state disappears automatically when the first non-draft Markdown file is added.

## Article Experience

Each article page contains:

- A shared header and a `Back to writing` link.
- Title, description, date, tags, and calculated reading time.
- A narrow reading column with clear heading, paragraph, list, link, quotation, code, and image styles.
- A subtle reading-progress rule at the top.
- A closing block linking back to the writing hub and to LinkedIn.
- Article-specific title, description, canonical URL, and Open Graph metadata.

Article JavaScript is limited to the reading-progress indicator. Reduced-motion preferences are respected, and all content remains available without JavaScript.

## Visual Direction

The blog is an extension of the existing annotated portfolio, not a separate brand. Its memorable element is the article list presented as a working notebook index: ruled rows, small editorial metadata, and one red margin mark that moves to the active row on hover or keyboard focus. The mark communicates selection and does not obscure content.

The design avoids generic card grids, oversized marketing copy, decorative blobs, and dark-theme detours. Mobile collapses each article row into date, title, description, and tags in one column with no horizontal overflow.

## Content Workflow

Publishing a post is:

1. Duplicate `content/blog/_template.md` to a descriptive filename.
2. Fill in frontmatter and write Markdown.
3. Set `draft: false`.
4. Run `npm run blog:build`.
5. Preview `blog/index.html` locally.
6. Commit the Markdown source and generated blog output together.

`content/blog/_template.md` is ignored by the generator and documents the supported fields. No article is published during the initial implementation.

## Repository Changes

- Modify `index.html` to add the Writing navigation link.
- Create `package.json` and the corresponding lockfile.
- Create `scripts/build-blog.mjs`.
- Create `content/blog/_template.md`.
- Generate `blog/index.html`.
- Add focused generator tests under `tests/blog-build.test.mjs`.

The unrelated untracked `stumpvizz/` directory is outside the scope and must not be changed or staged.

## Verification

Automated checks cover frontmatter validation, draft omission, newest-first sorting, slug generation, HTML escaping through the Markdown pipeline, empty-state generation, and article metadata. The final pass runs the generator, the test suite, `git diff --check`, and visual checks at desktop and mobile widths for the portfolio navigation, empty hub, and a temporary generated article fixture.
