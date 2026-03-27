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

      <div class="ml-auto flex items-center gap-3">
        <p v-if="saved" class="text-green-400 text-sm">Settings saved.</p>
        <button
          class="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded px-4 py-2 transition-colors disabled:opacity-50"
          :disabled="saving"
          @click="save"
        >
          {{ saving ? 'Saving...' : 'Save' }}
        </button>
      </div>
    </header>

    <!-- Settings Form -->
    <main class="flex-1 overflow-y-auto p-4 sm:p-6">
      <div class="max-w-xl mx-auto space-y-5">
        <h2 class="text-sm font-medium text-gray-400">General Settings</h2>

        <div>
          <label for="systemPrompt" class="block text-sm font-medium text-gray-300 mb-1">
            System Prompt
          </label>
          <textarea
            id="systemPrompt"
            v-model="form.systemPrompt"
            rows="6"
            class="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            placeholder="System Prompt"
          />
        </div>

        <h2 class="text-sm font-medium text-gray-400 mt-6">Lemonade Settings</h2>

        <div v-for="field in textFields" :key="field.key">
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

        <!-- Model Selection Dropdowns -->
        <div v-for="sel in modelSelectors" :key="sel.key">
          <label :for="sel.key" class="block text-sm font-medium text-gray-300 mb-1">
            {{ sel.label }}
          </label>
          <div class="flex gap-2">
            <select
              :id="sel.key"
              v-model="form[sel.key]"
              class="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              :disabled="sel.loading.value"
            >
              <option v-if="sel.models.value.length === 0" :value="form[sel.key]">
                {{ form[sel.key] }}
              </option>
              <template v-for="model in sel.models.value" :key="model.id">
                <option
                  :value="model.id"
                  :disabled="!model.downloaded"
                  :class="{ 'text-gray-500': !model.downloaded }"
                >
                  {{ model.id }}{{ !model.downloaded ? ' (not downloaded)' : '' }}
                </option>
              </template>
            </select>
            <button
              class="text-xs text-gray-400 hover:text-white border border-gray-600 rounded px-2 py-1 transition-colors disabled:opacity-50"
              :disabled="sel.loading.value"
              @click="sel.refresh"
            >
              {{ sel.loading.value ? '...' : '↻' }}
            </button>
          </div>
          <p v-if="sel.error.value" class="text-red-400 text-xs mt-1">{{ sel.error.value }}</p>
        </div>

        <!-- Enable Thinking Toggle -->
        <div class="flex items-center gap-3">
          <input
            id="enableThinking"
            v-model="form.enableThinking"
            type="checkbox"
            class="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900"
          />
          <label for="enableThinking" class="text-sm font-medium text-gray-300">
            Enable Thinking
          </label>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import type { AppConfig } from '~/composables/useConfig'
import { updateConfig } from '~/composables/useConfig'

const config = useConfig()

const textFields: { key: keyof AppConfig; label: string }[] = [
  { key: 'lemonadeBaseUrl', label: 'Base URL' },
]

const chatModels = useAvailableModels('tool-calling')
const whisperModels = useAvailableModels('transcription')
const ttsModels = useAvailableModels('tts')

const modelSelectors = [
  { key: 'lemonadeModel' as keyof AppConfig, label: 'Chat Model', ...chatModels },
  { key: 'lemonadeWhisperModel' as keyof AppConfig, label: 'Whisper Model', ...whisperModels },
  { key: 'lemonadeTtsModel' as keyof AppConfig, label: 'TTS Model', ...ttsModels },
].map((s) => ({
  key: s.key,
  label: s.label,
  models: s.models,
  loading: s.isLoading,
  error: s.error,
  refresh: s.fetchModels,
}))

onMounted(() => {
  for (const sel of modelSelectors) {
    sel.refresh()
  }
})

const form = reactive<AppConfig>({
  lemonadeBaseUrl: config.lemonadeBaseUrl,
  lemonadeModel: config.lemonadeModel,
  lemonadeWhisperModel: config.lemonadeWhisperModel,
  lemonadeTtsModel: config.lemonadeTtsModel,
  systemPrompt: config.systemPrompt,
  enableThinking: config.enableThinking,
})

const saving = ref(false)
const saved = ref(false)

watch(form, () => {
  saved.value = false
})

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
