<template>
  <div :class="['flex flex-col h-screen text-white', { 'bg-gray-900': !config.transparentBackground }]">
    <!-- Header -->
    <header
      data-tauri-drag-region
      class="flex items-center gap-3 px-3 py-2 sm:px-4 sm:py-3 border-b border-gray-700 bg-gray-800/50"
    >
      <NuxtLink
        to="/"
        class="text-sm text-gray-400 hover:text-white border border-gray-600 rounded px-2 py-1 transition-colors"
      >
        ← Back
      </NuxtLink>
      <h1 class="text-base sm:text-lg font-bold">
        Settings
      </h1>

      <div class="ml-auto flex items-center gap-3">
        <p
          v-if="saved"
          class="text-green-400 text-sm"
        >
          Settings saved.
        </p>
        <p
          v-if="reset_done"
          class="text-green-400 text-sm"
        >
          Settings reset.
        </p>
        <button
          class="text-sm text-gray-400 hover:text-white border border-gray-600 rounded px-3 py-2 transition-colors disabled:opacity-50"
          :disabled="busy"
          @click="reset"
        >
          Reset to Defaults
        </button>
        <button
          class="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded px-4 py-2 transition-colors disabled:opacity-50"
          :disabled="busy"
          @click="save"
        >
          Save
        </button>
      </div>
    </header>

    <!-- Settings Form -->
    <main class="flex-1 overflow-y-auto p-4 sm:p-6">
      <div class="max-w-xl mx-auto space-y-5">
        <h2 class="text-sm font-medium text-gray-400">
          General Settings
        </h2>

        <div>
          <label
            for="systemPrompt"
            class="block text-sm font-medium text-gray-300 mb-1"
          >
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

        <details class="rounded border border-gray-700 bg-gray-800/40">
          <summary class="cursor-pointer select-none px-3 py-2 text-sm text-gray-300 hover:text-white">
            Advanced Prompt Settings (preview + camera instruction)
          </summary>
          <div class="space-y-3 border-t border-gray-700 px-3 py-3">
            <div>
              <label
                for="cameraContextInstruction"
                class="block text-sm font-medium text-gray-300 mb-1"
              >
                Camera Context Instruction
              </label>
              <textarea
                id="cameraContextInstruction"
                v-model="form.cameraContextInstruction"
                rows="3"
                class="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                placeholder="Used only when an image is attached"
              />
              <p class="mt-1 text-xs text-gray-400">
                This instruction is appended only when camera image input is attached.
              </p>
            </div>

            <div>
              <p class="mb-1 text-xs font-medium text-gray-400">
                Built System Prompt Preview (no image)
              </p>
              <pre class="max-h-48 overflow-auto whitespace-pre-wrap rounded border border-gray-700 bg-gray-900/70 px-3 py-2 text-xs text-gray-200">{{ builtSystemPromptWithoutImage }}</pre>
            </div>

            <div>
              <p class="mb-1 text-xs font-medium text-gray-400">
                Built System Prompt Preview (with image)
              </p>
              <pre class="max-h-48 overflow-auto whitespace-pre-wrap rounded border border-gray-700 bg-gray-900/70 px-3 py-2 text-xs text-gray-200">{{ builtSystemPromptWithImage }}</pre>
            </div>
          </div>
        </details>

        <!-- Voice Language (used in WebGPU ASR and TTS) -->
        <div>
          <label
            for="speechLanguage"
            class="block text-sm font-medium text-gray-300 mb-1"
          >
            Voice Language
          </label>
          <select
            id="speechLanguage"
            v-model="form.speechLanguage"
            class="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option
              v-for="lang in SUPPORTED_SPEECH_LANGUAGES"
              :key="lang"
              :value="lang"
            >
              {{ lang.charAt(0).toUpperCase() + lang.slice(1) }}
            </option>
          </select>
        </div>

        <h2 class="text-sm font-medium text-gray-400 mt-6">
          Web Speech Voice
        </h2>

        <div>
          <label
            for="speechVoice"
            class="block text-sm font-medium text-gray-300 mb-1"
          >
            Voice (for selected language)
          </label>
          <select
            id="speechVoice"
            v-model="selectedSpeechVoice"
            class="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            :disabled="availableSpeechVoices.length === 0"
          >
            <option
              v-if="availableSpeechVoices.length === 0"
              value=""
            >
              No voice available for this language
            </option>
            <option
              v-for="voice in availableSpeechVoices"
              :key="voice.voiceURI"
              :value="voice.voiceURI"
            >
              {{ voice.name }} ({{ voice.lang }}){{ voice.default ? ' (default)' : '' }}
            </option>
          </select>
          <p
            v-if="!isReady"
            class="text-gray-400 text-xs mt-1"
          >
            Loading available system voices...
          </p>
        </div>

        <!-- Transparent Background Toggle -->
        <div class="flex items-center gap-3">
          <input
            id="transparentBackground"
            v-model="form.transparentBackground"
            type="checkbox"
            class="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900"
          >
          <label
            for="transparentBackground"
            class="text-sm font-medium text-gray-300"
          >
            Transparent Background
          </label>
        </div>

        <!-- Emotion Display Mode -->
        <div class="flex items-center gap-3">
          <input
            id="emotionDisplay3d"
            v-model="form.emotionDisplay3d"
            type="checkbox"
            class="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900"
          >
          <label
            for="emotionDisplay3d"
            class="text-sm font-medium text-gray-300"
          >
            3D Mode
          </label>
        </div>

        <!-- Camera Toggle -->
        <div class="flex items-center gap-3">
          <input
            id="cameraEnabled"
            v-model="form.cameraEnabled"
            type="checkbox"
            class="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900"
          >
          <label
            for="cameraEnabled"
            class="text-sm font-medium text-gray-300"
          >
            Start Camera On Launch
          </label>
        </div>

        <!-- Debug Section -->
        <h2 class="text-sm font-medium text-gray-400 mt-6">
          Debug
        </h2>

        <!-- Debug Serial Communication Toggle -->
        <div class="flex items-center gap-3">
          <input
            id="debugSerialEnabled"
            v-model="form.debugSerialEnabled"
            type="checkbox"
            class="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900"
          >
          <label
            for="debugSerialEnabled"
            class="text-sm font-medium text-gray-300"
          >
            Debug Serial Communication
          </label>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import type { AppConfig } from '~/composables/useConfig'
import { SUPPORTED_SPEECH_LANGUAGES } from '~/composables/useSpeechLanguage'
import { buildSystemPrompt } from '~/composables/systemPrompt'
import { resetConfig, updateConfig } from '~/composables/useConfig'
import { isTauri } from '@tauri-apps/api/core'

const config = useConfig()
const { isReady, getVoicesForSpeechLanguage, pickDefaultVoiceForSpeechLanguage } = useWebSpeechVoices()

const form = reactive<AppConfig>({
  speechVoiceByLanguage: { ...config.speechVoiceByLanguage },
  systemPrompt: config.systemPrompt,
  cameraContextInstruction: config.cameraContextInstruction,
  transparentBackground: config.transparentBackground,
  emotionDisplay3d: config.emotionDisplay3d,
  speechLanguage: config.speechLanguage,
  debugSerialEnabled: config.debugSerialEnabled,
  cameraEnabled: config.cameraEnabled,
})

const builtSystemPromptWithoutImage = computed(() =>
  buildSystemPrompt(form.systemPrompt, form.cameraContextInstruction, false),
)

const builtSystemPromptWithImage = computed(() =>
  buildSystemPrompt(form.systemPrompt, form.cameraContextInstruction, true),
)

const availableSpeechVoices = computed(() => getVoicesForSpeechLanguage(form.speechLanguage))

const selectedSpeechVoice = computed({
  get: () => form.speechVoiceByLanguage[form.speechLanguage] || '',
  set: (voiceId: string) => {
    form.speechVoiceByLanguage = {
      ...form.speechVoiceByLanguage,
      [form.speechLanguage]: voiceId,
    }
  },
})

watch(
  [() => form.speechLanguage, availableSpeechVoices],
  ([language, voices]) => {
    if (voices.length === 0) return

    const selected = form.speechVoiceByLanguage[language]
    const exists = voices.some(v => v.voiceURI === selected)
    if (exists) return

    const fallback = pickDefaultVoiceForSpeechLanguage(language)
    if (!fallback) return
    form.speechVoiceByLanguage = {
      ...form.speechVoiceByLanguage,
      [language]: fallback.voiceURI,
    }
  },
  { immediate: true },
)

const busy = ref(false)
const saved = ref(false)
const reset_done = ref(false)

watch(form, () => {
  saved.value = false
  reset_done.value = false
})

async function save() {
  busy.value = true
  saved.value = false
  try {
    await updateConfig({ ...form })
    saved.value = true
  }
  finally {
    busy.value = false
  }
}

async function reset() {
  let confirmed: boolean
  if (isTauri()) {
    const { confirm } = await import('@tauri-apps/plugin-dialog')
    confirmed = await confirm('Reset all settings to defaults?', { title: 'Reset Settings', kind: 'warning' })
  }
  else {
    confirmed = globalThis.confirm('Reset all settings to defaults?')
  }
  if (!confirmed) return
  busy.value = true
  reset_done.value = false
  try {
    await resetConfig()
    Object.assign(form, config)
    reset_done.value = true
  }
  finally {
    busy.value = false
  }
}
</script>
