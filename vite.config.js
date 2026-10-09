import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  plugins: [
    {
      name: 'inject-app-version',
      transformIndexHtml(html) {
        return html.replace(/%APP_VERSION%/g, pkg.version);
      }
    }
  ],
  server: {
    port: 3000,
    open: true
  },
  build: {
    assetsDir: 'assets',
    sourcemap: true
  }
});
