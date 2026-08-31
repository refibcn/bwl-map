import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://refibcn.github.io',
  base: '/bwl-map',
  vite: {
    optimizeDeps: {
      // maplibre-gl loads its tile-parsing code in a Web Worker; Vite's
      // esbuild pre-bundler mangles that worker's relative asset paths when
      // it moves the package into node_modules/.vite/deps, leaving the
      // worker request permanently pending and the map blank. Excluding it
      // from pre-bundling serves the package's own valid ESM as-is.
      exclude: ['maplibre-gl'],
    },
  },
});
