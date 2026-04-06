// https://nuxt.com/docs/api/configuration/nuxt-config
// Tauri: https://tauri.app/start/frontend/nuxt/#update-nuxt-configuration
export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss', '@nuxt/eslint'],
  ssr: false,
  imports: {
    dirs: ['composables/**'],
  },
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      // These are overridden by the following environment variables. And overridden again by the Tauri Store's file which is loaded in useConfig.ts.
      lemonadeBaseUrlDefault: 'http://localhost:8000', // NUXT_PUBLIC_LEMONADE_BASE_URL_DEFAULT
      lemonadeModelDefault: 'Qwen3.5-9B-GGUF', // NUXT_PUBLIC_LEMONADE_MODEL_DEFAULT
      lemonadeWhisperModelDefault: 'Whisper-Base', // NUXT_PUBLIC_LEMONADE_WHISPER_MODEL_DEFAULT
      lemonadeTtsModelDefault: 'kokoro-v1', // NUXT_PUBLIC_LEMONADE_TTS_MODEL_DEFAULT
      enableThinkingDefault: false, // NUXT_PUBLIC_ENABLE_THINKING_DEFAULT
      transparentBackgroundDefault: false, // NUXT_PUBLIC_TRANSPARENT_BACKGROUND_DEFAULT
      emotionDisplay3dDefault: true, // NUXT_PUBLIC_EMOTION_DISPLAY_3D_DEFAULT
      // NUXT_PUBLIC_SYSTEM_PROMPT_DEFAULT
      systemPromptDefault: [
        'You are a helpful AI assistant.',
        'Please follow these rules when responding:',
        '- Keep responses to 1-3 sentences',
        '- Answer clearly and concisely',
        '- Avoid lengthy explanations as this is designed for voice conversation',
      ].join('\n'),
    },
  },
  dir: { public: 'src/public' },
  srcDir: 'src',
  ignore: ['**/src-tauri/**'], // Tauri
  compatibilityDate: '2025-07-15',
  vite: {
    clearScreen: false, // Better support for Tauri CLI output
    envPrefix: ['VITE_', 'TAURI_'],
    server: {
      strictPort: true, // Tauri requires a consistent port
    },
  },
  telemetry: false,
  eslint: {
    config: {
      stylistic: true,
    },
  },
})
