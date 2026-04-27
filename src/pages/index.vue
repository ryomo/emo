<template>
  <div :class="['flex flex-col h-screen text-white', { 'bg-gray-900': !config.transparentBackground }]">
    <!-- Header -->
    <header class="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3 border-b border-gray-700 bg-gray-800/50">
      <h1
        data-tauri-drag-region
        class="text-base sm:text-lg font-bold"
      >
        Emo
      </h1>
      <div
        data-tauri-drag-region
        class="flex-1 self-stretch"
      />
      <div class="flex items-center gap-2 sm:gap-3">
        <span class="hidden sm:inline text-sm text-gray-400">{{ activeModelName }}</span>
        <NuxtLink
          to="/settings"
          class="text-xs text-gray-400 hover:text-white border border-gray-600 rounded px-2 py-1 transition-colors"
        >
          Settings
        </NuxtLink>
        <button
          class="text-xs text-gray-400 hover:text-white border border-gray-600 rounded px-2 py-1 transition-colors"
          @click="clearHistory"
        >
          Clear History
        </button>
        <button
          class="text-xs text-gray-400 hover:text-red-400 border border-gray-600 rounded px-2 py-1 transition-colors"
          @click="closeApp"
        >
          ✕
        </button>
      </div>
    </header>

    <!-- Main Content (vertical stacked layout) -->
    <main class="flex flex-col flex-1 overflow-hidden">
      <!-- Chat History -->
      <ChatHistory
        class="flex-1 min-h-0"
        :messages="messages"
        :is-loading="isLoading"
      />

      <!-- AI Emotion Area -->
      <div class="shrink-0 px-3 py-2 sm:px-4 sm:py-3 border-t border-gray-700">
        <EmotionDisplay2D
          v-if="!config.emotionDisplay3d"
          :emotion="emotionState.current"
          :response-text="lastAssistantText"
        />
        <EmotionDisplay3D
          v-else
          :emotion="emotionState.current"
          :response-text="lastAssistantText"
        />
      </div>

      <!-- Serial Control Panel (Debug) -->
      <DebugSerialControlPanel v-if="config.debugSerialEnabled" />

      <!-- Voice Recognition Text Area (shown only in voice mode) -->
      <div
        v-if="isListening"
        class="shrink-0 px-3 pb-2 sm:px-4 sm:pb-3"
      >
        <VoiceTranscriptArea
          :transcript="transcript"
          :is-speaking="isUserSpeaking"
          :is-transcribing="isTranscribing"
          :is-active="isListening"
          :error="speechError"
        />
      </div>

      <!-- Bottom Bar: Voice Button + Text Input -->
      <div class="shrink-0 flex items-end gap-2 px-3 pb-3 sm:px-4 sm:pb-4 border-t border-gray-700">
        <VoiceButton
          :is-listening="isListening"
          :is-tts-speaking="isSpeaking"
          :disabled="isLoading"
          @toggle="toggleVoice"
        />
        <ChatInput
          class="flex-1"
          :is-loading="isLoading"
          :disabled="isListening"
          @send="handleSend"
        />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { isTauri } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { stripEmotionEmoji } from '~/types/emotion'

const config = useConfig()

// Both backends always initialized — Vue composables cannot be called conditionally
const lemonadeChat = useLemonadeChat()
const webgpuChat = useWebGpuChat()

const { isSpeaking, speak, stop: stopTts } = useLemonadeSpeak()

const isWebGpu = computed(() => config.backendMode === 'webgpu')

function handleTranscriptComplete(text: string) {
  console.log('[index] Transcription completed → Sending to Chat API:', text)
  lemonadeChat.sendMessage(text)
}

const lemonadeListen = useLemonadeListen({ onTranscriptComplete: handleTranscriptComplete })
const webgpuListen = useWebGpuListen({
  onTranscriptComplete: (text) => {
    webgpuChat.sendMessage(text)
  },
})

// Unified reactive accessors that delegate to the active backend
const messages = computed(() => isWebGpu.value ? webgpuChat.messages.value : lemonadeChat.messages.value)
const isLoading = computed(() => isWebGpu.value ? webgpuChat.isLoading.value : lemonadeChat.isLoading.value)
const chatError = computed(() => isWebGpu.value ? webgpuChat.error.value : lemonadeChat.error.value)
const isListening = computed(() => isWebGpu.value ? webgpuListen.isListening.value : lemonadeListen.isListening.value)
const isUserSpeaking = computed(() => isWebGpu.value ? webgpuListen.isSpeaking.value : lemonadeListen.isSpeaking.value)
const isTranscribing = computed(() => isWebGpu.value ? webgpuListen.isTranscribing.value : false)
const transcript = computed(() => isWebGpu.value ? webgpuListen.transcript.value : lemonadeListen.transcript.value)
const speechError = computed(() => isWebGpu.value ? webgpuListen.error.value : lemonadeListen.error.value)

const activeModelName = computed(() =>
  isWebGpu.value ? 'Gemma-4-E2B (WebGPU)' : config.lemonadeModel,
)

const { emotionState, detectEmotionFromText } = useAiEmotion()

/** Pass the latest assistant response text (emotion emoji removed) to EmotionDisplay */
const lastAssistantText = computed(() => {
  for (let i = messages.value.length - 1; i >= 0; i--) {
    const msg = messages.value[i]
    if (msg?.role === 'assistant' && msg.content) {
      return stripEmotionEmoji(msg.content)
    }
  }
  return ''
})

// Watch for errors in chat and speech APIs to display in app-level notification
watch([chatError, speechError], ([chat, speech]) => {
  setAppError(chat || speech || '')
})

// Detect emoji from assistant response text to update emotion; speak with TTS when in voice mode
watch(
  () => messages.value.length,
  () => {
    if (messages.value.length === 0) return
    const lastMsg = messages.value.at(-1)
    if (lastMsg?.role === 'assistant' && lastMsg.content) {
      detectEmotionFromText(lastMsg.content)
      // Lemonade only: speak with TTS when voice mode is active
      if (isListening.value && !isWebGpu.value) {
        speak(lastMsg.content)
      }
    }
  },
)

function handleSend(message: string) {
  if (isWebGpu.value) {
    webgpuChat.sendMessage(message)
  }
  else {
    lemonadeChat.sendMessage(message)
  }
}

function clearHistory() {
  lemonadeChat.clearHistory()
  webgpuChat.clearHistory()
}

async function closeApp() {
  if (isTauri()) {
    await getCurrentWindow().close()
  }
}

function toggleVoice() {
  if (isListening.value) {
    if (!isWebGpu.value) stopTts()
    if (isWebGpu.value) webgpuListen.stop()
    else lemonadeListen.stop()
  }
  else if (isWebGpu.value) {
    webgpuListen.start()
  }
  else {
    lemonadeListen.start()
  }
}
</script>
