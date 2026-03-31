/**
 * Client-only plugin that loads application config before the app mounts.
 * This ensures useConfig() returns populated values in all composables.
 */
export default defineNuxtPlugin(async () => {
  await loadConfig()
})
