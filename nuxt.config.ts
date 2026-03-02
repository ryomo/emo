// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  modules: ['@nuxtjs/tailwindcss'],

  runtimeConfig: {
    public: {
      lemonadeBaseUrl: '', // overridden by NUXT_PUBLIC_LEMONADE_BASE_URL in .env
      lemonadeWsUrl: '',   // overridden by NUXT_PUBLIC_LEMONADE_WS_URL in .env
      lemonadeModel: '',   // overridden by NUXT_PUBLIC_LEMONADE_MODEL in .env
      lemonadeWhisperModel: '', // overridden by NUXT_PUBLIC_LEMONADE_WHISPER_MODEL in .env
      lemonadeTtsModel: '',      // overridden by NUXT_PUBLIC_LEMONADE_TTS_MODEL in .env
    },
  },
})
