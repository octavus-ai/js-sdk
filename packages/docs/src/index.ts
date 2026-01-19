/**
 * @octavus/docs - Documentation package for Octavus SDKs
 *
 * This is the main entry point that exports loader utilities.
 * For full content, import from '@octavus/docs/content'.
 * For search functionality, import from '@octavus/docs/search'.
 */

export type * from './types';

// Re-export commonly used functions from content
export { getDocBySlug, getDocSlugs, getDocSections } from './content';
