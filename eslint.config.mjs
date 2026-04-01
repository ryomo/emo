// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    ignores: [
      '.nuxt/',
      '.output/',
      'dist/',
      'node_modules/',
      'src-tauri/target/',
    ],
  },
)
