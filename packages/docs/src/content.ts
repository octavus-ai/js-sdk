/**
 * Content module - provides access to all documentation content
 *
 * Import from '@octavus/docs/content' to get all docs as structured data.
 * This module is tree-shakeable - only import what you need.
 */

import type { Doc, DocSection, DocsData } from './types';

// These are populated by the build script (prebuild generates them)
import docsJson from '../dist/docs.json';
import sectionsJson from '../dist/sections.json';

const docs: Doc[] = docsJson as Doc[];
const sections: DocSection[] = sectionsJson as DocSection[];

/**
 * Get all documentation pages.
 */
export function getAllDocs(): Doc[] {
  return docs;
}

/**
 * Get all documentation sections with their pages.
 */
export function getDocSections(): DocSection[] {
  return sections;
}

/**
 * Get all documentation as structured data.
 */
export function getDocsData(): DocsData {
  return { docs, sections };
}

/**
 * Get a single documentation page by its slug.
 * @param slug - The full slug path (e.g., "getting-started/introduction")
 */
export function getDocBySlug(slug: string): Doc | null {
  return docs.find((doc) => doc.slug === slug) ?? null;
}

/**
 * Get all documentation slugs.
 * Useful for static generation with generateStaticParams.
 */
export function getDocSlugs(): string[] {
  return docs.map((doc) => doc.slug);
}

/**
 * Get a section by its slug.
 */
export function getSectionBySlug(sectionSlug: string): DocSection | null {
  return sections.find((section) => section.slug === sectionSlug) ?? null;
}
