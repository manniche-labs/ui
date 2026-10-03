import { mergeConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import base from './vite.config'

// One self-contained HTML file for a private preview of the gallery.
export default mergeConfig(base, {
  plugins: [viteSingleFile()],
  build: { outDir: 'dist-preview' },
})
