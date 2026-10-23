import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://inspired-by-christ.com',
  output: 'static',
  // Directory output (about/index.html) is served at /about/ by Render and every static host.
  build: { format: 'directory', inlineStylesheets: 'never' },
  devToolbar: { enabled: false },
});
