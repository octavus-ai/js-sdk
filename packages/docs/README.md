# @octavus/docs

Documentation content package for Octavus SDKs.

## Installation

```bash
npm install @octavus/docs
```

## Overview

This package provides the documentation content for Octavus SDKs as structured data with full-text search capabilities. It's designed for:

- Embedding documentation in your application
- Building custom documentation sites
- Providing AI-friendly documentation access

## Usage

### Get Documentation Content

```typescript
import { getDocBySlug, getDocSlugs, getDocSections } from '@octavus/docs';

// Get all sections with their docs
const sections = getDocSections();
// [{ slug: 'getting-started', title: 'Getting Started', docs: [...] }, ...]

// Get all doc slugs (for static generation)
const slugs = getDocSlugs();
// ['getting-started/introduction', 'getting-started/quickstart', ...]

// Get a specific doc by slug
const doc = getDocBySlug('getting-started/introduction');
// { slug, section, title, description, content, excerpt }
```

### Full Content Access

```typescript
import { getAllDocs, getDocsData } from '@octavus/docs/content';

// Get all docs as array
const docs = getAllDocs();

// Get all data (docs + sections)
const { docs, sections } = getDocsData();
```

### Search

```typescript
import { searchDocs } from '@octavus/docs/search';

// Search documentation
const results = searchDocs('streaming events', 10);
// [{ slug, title, section, excerpt, score }, ...]
```

## Data Types

```typescript
interface Doc {
  slug: string; // 'getting-started/introduction'
  section: string; // 'getting-started'
  title: string; // 'Introduction'
  description: string; // 'Learn about Octavus...'
  content: string; // Full markdown content
  excerpt: string; // First ~200 chars, plain text
}

interface DocSection {
  slug: string;
  title: string;
  description: string;
  order: number;
  docs: Doc[];
}

interface SearchResult {
  slug: string;
  title: string;
  section: string;
  excerpt: string;
  score: number;
}
```

## Content Structure

Documentation is organized by section:

- **Getting Started** - Introduction and quickstart guides
- **Server SDK** - Server-side integration with `@octavus/server-sdk`
- **Client SDK** - Client-side integration with `@octavus/client-sdk`
- **Protocol** - Agent protocol definition language
- **API Reference** - REST API documentation
- **Examples** - Full application examples

## Use with Static Site Generators

```typescript
// Next.js generateStaticParams example
export function generateStaticParams() {
  return getDocSlugs().map((slug) => ({
    slug: slug.split('/'),
  }));
}

export default function DocPage({ params }) {
  const doc = getDocBySlug(params.slug.join('/'));
  if (!doc) notFound();

  return <MarkdownRenderer content={doc.content} />;
}
```

## Related Packages

- [`@octavus/server-sdk`](https://www.npmjs.com/package/@octavus/server-sdk) - Server-side SDK
- [`@octavus/client-sdk`](https://www.npmjs.com/package/@octavus/client-sdk) - Client-side SDK
- [`@octavus/react`](https://www.npmjs.com/package/@octavus/react) - React hooks

## License

MIT
