import { mergeConfig } from 'vite'
import base from './vite.config'

// The demo previews for mikkelmanniche.dk/lab/ui. `npm run lab -- <site repo>` builds them and copies them in.
export default mergeConfig(base, {
  base: '/lab/ui/preview/',
  publicDir: false,
  build: { outDir: 'dist-lab', emptyOutDir: true, rollupOptions: { input: { preview: 'preview.html' } } },
})
