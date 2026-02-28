// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],

  runtimeConfig: {
    public: {
      lemonadeBaseUrl: '', // .env の NUXT_PUBLIC_LEMONADE_BASE_URL で上書き
      lemonadeWsUrl: '',   // .env の NUXT_PUBLIC_LEMONADE_WS_URL で上書き
      lemonadeModel: '',   // .env の NUXT_PUBLIC_LEMONADE_MODEL で上書き
      lemonadeWhisperModel: '', // .env の NUXT_PUBLIC_LEMONADE_WHISPER_MODEL で上書き
      lemonadeTtsModel: '',      // .env の NUXT_PUBLIC_LEMONADE_TTS_MODEL で上書き
    },
  },
})
