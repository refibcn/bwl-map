import { defineConfig } from 'astro/config';
import { createRequire } from 'node:module';
import { copyFileSync } from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);

// maplibre-gl resolves its Web Worker script AT RUNTIME via
// `new URL('./maplibre-gl-worker.mjs', import.meta.url)`, relative to
// whichever bundled chunk happens to load it. That's a dynamic template-
// literal construction, not the static `new Worker(new URL('./literal',
// import.meta.url))` pattern Vite's build can detect and bundle — so the
// production build never emits maplibre-gl-worker.mjs at all, and on the
// deployed site the worker request 404s silently. Everything else (style,
// sprite, tiles.json, markers) loads fine since none of it depends on the
// worker, so the only symptom is a blank map with no console error — the
// dev-time fix below (excluding maplibre-gl from pre-bundling) doesn't
// touch this, it only prevents a DIFFERENT dev-server-only breakage.
//
// maplibre-gl-worker.mjs itself then does `import ... from
// "./maplibre-gl-shared.mjs"` — a second sibling file that must sit right
// next to it for that import to resolve, or the worker's module script
// fails to load (silently again: the ErrorEvent Worker.onerror receives
// for a failed module import carries no message/filename, by design, so
// this is invisible in the console too). Both files get copied verbatim
// into the built assets dir after every production build, under the exact
// unhashed filenames the runtime code expects.
function copyMaplibreWorker() {
  return {
    name: 'copy-maplibre-gl-worker',
    apply: 'build',
    closeBundle() {
      const outDir = path.join(process.cwd(), 'dist', '_astro');
      for (const file of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
        copyFileSync(require.resolve(`maplibre-gl/dist/${file}`), path.join(outDir, file));
      }
    },
  };
}

export default defineConfig({
  site: 'https://refibcn.github.io',
  base: '/bwl-map',
  vite: {
    plugins: [copyMaplibreWorker()],
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
