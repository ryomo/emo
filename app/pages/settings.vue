<template>
  <div class="flex flex-col h-screen bg-gray-900 text-white">
    <!-- Header -->
    <header class="flex items-center gap-3 px-3 py-2 sm:px-4 sm:py-3 border-b border-gray-700">
      <NuxtLink
        to="/"
        class="text-sm text-gray-400 hover:text-white border border-gray-600 rounded px-2 py-1 transition-colors"
      >
        ← Back
      </NuxtLink>
      <h1 class="text-base sm:text-lg font-bold">Settings</h1>
    </header>

    <!-- Settings Form -->
    <main class="flex-1 overflow-y-auto p-4 sm:p-6">
      <div class="max-w-xl mx-auto space-y-5">
        <h2 class="text-sm font-medium text-gray-400">Lemonade Settings</h2>

        <div v-for="field in fields" :key="field.key">
          <label :for="field.key" class="block text-sm font-medium text-gray-300 mb-1">
            {{ field.label }}
          </label>
          <input
            :id="field.key"
            v-model="form[field.key]"
            type="text"
            class="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            :placeholder="field.label"
          />
        </div>

        <button
          class="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded px-4 py-2 transition-colors disabled:opacity-50"
          :disabled="saving"
          @click="save"
        >
          {{ saving ? 'Saving...' : 'Save' }}
        </button>

        <p v-if="saved" class="text-green-400 text-sm">Settings saved.</p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import type { AppConfig } from '~/composables/useConfig'
import { updateConfig } from '~/composables/useConfig'

const config = useConfig()

const fields: { key: keyof AppConfig; label: string }[] = [
  { key: 'lemonadeBaseUrl', label: 'Base URL' },
  { key: 'lemonadeWsUrl', label: 'WebSocket URL' },
  { key: 'lemonadeModel', label: 'Chat Model' },
  { key: 'lemonadeWhisperModel', label: 'Whisper Model' },
  { key: 'lemonadeTtsModel', label: 'TTS Model' },
]

const form = reactive<AppConfig>({
  lemonadeBaseUrl: config.lemonadeBaseUrl,
  lemonadeWsUrl: config.lemonadeWsUrl,
  lemonadeModel: config.lemonadeModel,
  lemonadeWhisperModel: config.lemonadeWhisperModel,
  lemonadeTtsModel: config.lemonadeTtsModel,
})

const saving = ref(false)
const saved = ref(false)

async function save() {
  saving.value = true
  saved.value = false
  try {
    await updateConfig({ ...form })
    saved.value = true
  } finally {
    saving.value = false
  }
}
</script>
