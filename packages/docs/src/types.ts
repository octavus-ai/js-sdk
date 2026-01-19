export interface Doc {
  slug: string;
  section: string;
  title: string;
  description: string;
  content: string;
  excerpt: string;
}

export interface DocSection {
  slug: string;
  title: string;
  description: string;
  order: number;
  docs: Doc[];
}

export interface SearchResult {
  slug: string;
  title: string;
  section: string;
  excerpt: string;
  score: number;
}

export interface DocsData {
  docs: Doc[];
  sections: DocSection[];
}
