/**
 * Build script for @octavus/docs package
 *
 * File naming convention:
 * - Sections: XX-section-name/ (e.g., 01-getting-started/)
 * - Pages: XX-page-name.md (e.g., 01-introduction.md)
 * - The XX prefix determines order, the rest becomes the slug
 *
 * This script:
 * 1. Reads all markdown files from content/
 * 2. Parses the XX- prefix for ordering
 * 3. Replaces version placeholders with actual package versions
 * 4. Generates docs.json and sections.json
 * 5. Builds a MiniSearch index for full-text search
 * 6. Validates naming format and internal links (fails build on errors)
 *
 * Version placeholders:
 * Use {{VERSION:package-name}} in markdown to inject package versions.
 * Example: `npm install @octavus/client-sdk@{{VERSION:@octavus/client-sdk}}`
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import matter from 'gray-matter';
import MiniSearch from 'minisearch';

const PACKAGES_DIR = path.join(import.meta.dirname, '../../');

/**
 * Load package versions from packages directory.
 * Returns a map of package name to version.
 */
function loadPackageVersions(): Map<string, string> {
  const versions = new Map<string, string>();

  const packageDirs = fs.readdirSync(PACKAGES_DIR, { withFileTypes: true });

  for (const dir of packageDirs) {
    if (!dir.isDirectory()) continue;

    const packageJsonPath = path.join(PACKAGES_DIR, dir.name, 'package.json');
    if (!fs.existsSync(packageJsonPath)) continue;

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    if (packageJson.name && packageJson.version) {
      versions.set(packageJson.name, packageJson.version);
    }
  }

  return versions;
}

/**
 * Replace version placeholders in content.
 * Syntax: {{VERSION:@octavus/package-name}}
 */
function replaceVersionPlaceholders(content: string, versions: Map<string, string>): string {
  return content.replace(/\{\{VERSION:([^}]+)\}\}/g, (match, packageName: string) => {
    const version = versions.get(packageName);
    if (!version) {
      console.warn(`  Warning: No version found for package "${packageName}"`);
      return match;
    }
    return version;
  });
}

interface DocData {
  slug: string;
  section: string;
  title: string;
  description: string;
  content: string;
  excerpt: string;
  order: number;
}

interface SectionMeta {
  title: string;
  description: string;
  order: number;
  slug: string;
}

interface SectionData {
  slug: string;
  title: string;
  description: string;
  order: number;
  docs: DocData[];
}

const CONTENT_DIR = path.join(import.meta.dirname, '../content');
const DIST_DIR = path.join(import.meta.dirname, '../dist');

// Regex to match XX- prefix (two digits followed by dash)
const PREFIX_REGEX = /^(\d{2})-(.+)$/;

interface BrokenLink {
  sourceSlug: string;
  link: string;
  line: number;
}

interface ValidationError {
  path: string;
  message: string;
}

/**
 * Parse a name with XX- prefix.
 * Returns { order, slug } or null if invalid.
 */
function parsePrefix(name: string): { order: number; slug: string } | null {
  const match = PREFIX_REGEX.exec(name);
  if (!match) return null;
  return {
    order: parseInt(match[1]!, 10),
    slug: match[2]!,
  };
}

/**
 * Validate that all sections and files follow the XX- naming convention.
 */
function validateNamingConvention(contentDir: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const entries = fs.readdirSync(contentDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const parsed = parsePrefix(entry.name);
    if (!parsed) {
      errors.push({
        path: entry.name,
        message: `Section directory must use XX-name format (e.g., 01-getting-started)`,
      });
      continue;
    }

    const sectionDir = path.join(contentDir, entry.name);
    const files = fs.readdirSync(sectionDir);

    for (const file of files) {
      if (file === '_meta.md' || file === '_meta.json') continue;
      if (!file.endsWith('.md')) continue;

      const fileName = file.replace('.md', '');
      const fileParsed = parsePrefix(fileName);

      if (!fileParsed) {
        errors.push({
          path: `${entry.name}/${file}`,
          message: `File must use XX-name.md format (e.g., 01-overview.md)`,
        });
      }
    }
  }

  return errors;
}

/**
 * Check for duplicate orders within sections.
 */
function validateUniqueOrders(docs: DocData[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const ordersBySection = new Map<string, Map<number, string>>();

  for (const doc of docs) {
    if (!ordersBySection.has(doc.section)) {
      ordersBySection.set(doc.section, new Map());
    }

    const sectionOrders = ordersBySection.get(doc.section)!;
    if (sectionOrders.has(doc.order)) {
      errors.push({
        path: doc.slug,
        message: `Duplicate order ${doc.order} in section ${doc.section} (also used by ${sectionOrders.get(doc.order)})`,
      });
    } else {
      sectionOrders.set(doc.order, doc.slug);
    }
  }

  return errors;
}

/**
 * Extract all internal links from markdown content.
 * Matches links like [text](/docs/section/page) or [text](/docs/section/page#anchor)
 */
function extractInternalLinks(content: string): { link: string; line: number }[] {
  const links: { link: string; line: number }[] = [];
  const lines = content.split('\n');

  // Match markdown links: [text](/docs/...)
  const linkRegex = /\[([^\]]*)\]\(\/docs\/([^)#\s]+)/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    let match;
    while ((match = linkRegex.exec(line)) !== null) {
      links.push({
        link: match[2]!, // The slug part after /docs/
        line: i + 1,
      });
    }
  }

  return links;
}

/**
 * Validate all internal links in docs.
 * Returns array of broken links.
 */
function validateLinks(docs: DocData[]): BrokenLink[] {
  const validSlugs = new Set(docs.map((d) => d.slug));
  const brokenLinks: BrokenLink[] = [];

  for (const doc of docs) {
    const links = extractInternalLinks(doc.content);

    for (const { link, line } of links) {
      if (!validSlugs.has(link)) {
        brokenLinks.push({
          sourceSlug: doc.slug,
          link,
          line,
        });
      }
    }
  }

  return brokenLinks;
}

function createExcerpt(content: string, maxLength = 200): string {
  // Remove markdown formatting and get plain text
  const plainText = content
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/`[^`]+`/g, '') // Remove inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
    .replace(/[#*_~`]/g, '') // Remove markdown symbols
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .trim();

  if (plainText.length <= maxLength) {
    return plainText;
  }

  // Find the last space before maxLength to avoid cutting words
  const truncated = plainText.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + '...';
}

async function loadSectionMeta(sectionDir: string, dirName: string): Promise<SectionMeta> {
  const parsed = parsePrefix(dirName);
  if (!parsed) {
    throw new Error(`Invalid section directory name: ${dirName}`);
  }

  const metaPath = path.join(sectionDir, '_meta.json');
  const metaMdPath = path.join(sectionDir, '_meta.md');

  let title = parsed.slug.charAt(0).toUpperCase() + parsed.slug.slice(1).replace(/-/g, ' ');
  let description = '';

  if (fs.existsSync(metaPath)) {
    const content = fs.readFileSync(metaPath, 'utf-8');
    const meta = JSON.parse(content);
    title = meta.title ?? title;
    description = meta.description ?? '';
  } else if (fs.existsSync(metaMdPath)) {
    const content = fs.readFileSync(metaMdPath, 'utf-8');
    const { data } = matter(content);
    title = (data.title as string) ?? title;
    description = (data.description as string) ?? '';
  }

  return {
    title,
    description,
    order: parsed.order,
    slug: parsed.slug,
  };
}

async function build() {
  console.log('Building @octavus/docs...');

  // Load package versions for placeholder replacement
  const versions = loadPackageVersions();
  console.log(`✓ Loaded ${versions.size} package versions`);

  // Ensure dist directory exists
  fs.mkdirSync(DIST_DIR, { recursive: true });

  // Check if content directory exists
  if (!fs.existsSync(CONTENT_DIR)) {
    console.log('No content directory found. Creating empty outputs.');
    fs.writeFileSync(path.join(DIST_DIR, 'docs.json'), '[]');
    fs.writeFileSync(path.join(DIST_DIR, 'sections.json'), '[]');
    fs.writeFileSync(path.join(DIST_DIR, 'search-index.json'), '{}');
    return;
  }

  // Validate naming convention
  const namingErrors = validateNamingConvention(CONTENT_DIR);
  if (namingErrors.length > 0) {
    console.error('\n✗ Invalid naming convention:\n');
    for (const { path: filePath, message } of namingErrors) {
      console.error(`  ${filePath}`);
      console.error(`    → ${message}\n`);
    }
    console.error(
      `Files must follow the XX-name format (e.g., 01-getting-started/, 01-introduction.md)\n`,
    );
    process.exit(1);
  }
  console.log('✓ Naming convention valid');

  const files = await glob('**/*.md', {
    cwd: CONTENT_DIR,
    ignore: ['**/_meta.md'],
  });

  const docs: DocData[] = [];
  const sectionsMap = new Map<string, SectionMeta>();

  for (const file of files) {
    const filePath = path.join(CONTENT_DIR, file);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const { data: frontmatter, content: rawContent } = matter(raw);

    // Replace version placeholders with actual versions
    const content = replaceVersionPlaceholders(rawContent, versions);

    const parts = file.replace('.md', '').split('/');
    const sectionDirName = parts[0]!;
    const fileName = parts[parts.length - 1]!;

    const sectionParsed = parsePrefix(sectionDirName);
    if (!sectionParsed) {
      throw new Error(`Invalid section directory: ${sectionDirName}`);
    }

    const fileParsed = parsePrefix(fileName);
    if (!fileParsed) {
      throw new Error(`Invalid file name: ${fileName}`);
    }

    const slug = `${sectionParsed.slug}/${fileParsed.slug}`;

    if (!sectionsMap.has(sectionParsed.slug)) {
      const sectionDir = path.join(CONTENT_DIR, sectionDirName);
      const meta = await loadSectionMeta(sectionDir, sectionDirName);
      sectionsMap.set(sectionParsed.slug, meta);
    }

    docs.push({
      slug,
      section: sectionParsed.slug,
      title: (frontmatter.title as string) || fileParsed.slug,
      description: (frontmatter.description as string) || '',
      content,
      excerpt: createExcerpt(content),
      order: fileParsed.order,
    });
  }

  // Validate unique orders
  const orderErrors = validateUniqueOrders(docs);
  if (orderErrors.length > 0) {
    console.error('\n✗ Duplicate order numbers found:\n');
    for (const { path: filePath, message } of orderErrors) {
      console.error(`  ${filePath}`);
      console.error(`    → ${message}\n`);
    }
    process.exit(1);
  }
  console.log('✓ Order numbers unique within sections');

  docs.sort((a, b) => {
    const sectionA = sectionsMap.get(a.section);
    const sectionB = sectionsMap.get(b.section);
    const sectionOrderDiff = (sectionA?.order ?? 99) - (sectionB?.order ?? 99);
    if (sectionOrderDiff !== 0) return sectionOrderDiff;
    return a.order - b.order;
  });

  const sections: SectionData[] = Array.from(sectionsMap.values())
    .map((meta) => ({
      slug: meta.slug,
      title: meta.title,
      description: meta.description,
      order: meta.order,
      docs: docs.filter((doc) => doc.section === meta.slug),
    }))
    .sort((a, b) => a.order - b.order);

  // Validate internal links
  const brokenLinks = validateLinks(docs);
  if (brokenLinks.length > 0) {
    console.error('\n✗ Found broken internal links:\n');
    for (const { sourceSlug, link, line } of brokenLinks) {
      console.error(`  ${sourceSlug}:${line}`);
      console.error(`    → /docs/${link} (not found)\n`);
    }
    console.error(`Total: ${brokenLinks.length} broken link(s)\n`);
    process.exit(1);
  }
  console.log('✓ All internal links valid');

  const miniSearch = new MiniSearch({
    fields: ['title', 'content', 'section'],
    storeFields: ['title', 'slug', 'section', 'excerpt'],
  });

  miniSearch.addAll(
    docs.map((doc, id) => ({
      id,
      slug: doc.slug,
      title: doc.title,
      section: doc.section,
      content: doc.content,
      excerpt: doc.excerpt,
    })),
  );

  fs.writeFileSync(path.join(DIST_DIR, 'docs.json'), JSON.stringify(docs, null, 2));

  fs.writeFileSync(path.join(DIST_DIR, 'sections.json'), JSON.stringify(sections, null, 2));

  fs.writeFileSync(path.join(DIST_DIR, 'search-index.json'), JSON.stringify(miniSearch.toJSON()));

  console.log(`✓ Built ${docs.length} docs across ${sections.length} sections`);
  console.log(`✓ Generated search index`);
}

build().catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});
