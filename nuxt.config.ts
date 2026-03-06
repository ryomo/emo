// https://nuxt.com/docs/api/configuration/nuxt-config
// Tauri: https://tauri.app/start/frontend/nuxt/#update-nuxt-configuration
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  ssr: false,
  telemetry: false,
  modules: ['@nuxtjs/tailwindcss'],

  runtimeConfig: {
    public: {
      // These are overridden by the following environment variables. And overridden again by the Tauri Store's file which is loaded in useConfig.ts.
      lemonadeBaseUrlDefault: 'http://localhost:8000', // NUXT_PUBLIC_LEMONADE_BASE_URL_DEFAULT
      lemonadeWsUrlDefault: 'ws://localhost:9000',     // NUXT_PUBLIC_LEMONADE_WS_URL_DEFAULT
      lemonadeModelDefault: 'Gemma-3-4b-it-GGUF',     // NUXT_PUBLIC_LEMONADE_MODEL_DEFAULT
      lemonadeWhisperModelDefault: 'Whisper-Base',     // NUXT_PUBLIC_LEMONADE_WHISPER_MODEL_DEFAULT
      lemonadeTtsModelDefault: 'kokoro-v1',            // NUXT_PUBLIC_LEMONADE_TTS_MODEL_DEFAULT
    },
  },

  vite: {
    // Tauri
    clearScreen: false,
    envPrefix: ['VITE_', 'TAURI_'],
    server: {
      strictPort: true,
    },
  },

  // Tauri
  ignore: ['**/src-tauri/**'],
})
