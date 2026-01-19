import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    content: 'src/content.ts',
    search: 'src/search.ts',
  },
  format: ['esm'],
  dts: true,
  clean: false, // Don't clean - prebuild generates files in dist
  sourcemap: true,
  external: ['minisearch'],
});
