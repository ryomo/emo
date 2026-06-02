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
        <ListenTranscriptArea
          :transcript="transcript"
          :is-speaking="isUserSpeaking"
          :is-transcribing="isTranscribing"
          :is-active="isListening"
          :error="speechError"
        />
      </div>

      <!-- Camera Preview -->
      <div
        v-if="isCameraActive"
        class="shrink-0 px-3 pb-2 sm:px-4 sm:pb-3"
      >
        <div class="w-40 sm:w-48 rounded-lg overflow-hidden border border-cyan-700/60 bg-black">
          <video
            ref="cameraPreviewEl"
            autoplay
            muted
            playsinline
            class="w-full h-auto"
          />
        </div>
      </div>

      <!-- Model Loading Status -->
      <div
        v-if="isAnyModelLoading"
        class="shrink-0 px-4 py-3 border-t border-gray-700 bg-gray-800/30"
      >
        <p class="text-xs text-gray-400 mb-2">
          Initializing on-device AI models…
        </p>
        <div class="mb-1.5">
          <div class="flex justify-between text-xs text-gray-400 mb-0.5">
            <span>Gemma 4 (Chat)</span>
            <span>{{ isGemmaLoaded ? 'Ready' : isGemmaLoading ? gemmaProgress + '%' : 'Waiting…' }}</span>
          </div>
          <div class="h-1 bg-gray-700 rounded-full overflow-hidden">
            <div
              class="h-full bg-blue-500 transition-all duration-300"
              :style="{ width: isGemmaLoaded ? '100%' : gemmaProgress + '%' }"
            />
          </div>
        </div>
        <div>
          <div class="flex justify-between text-xs text-gray-400 mb-0.5">
            <span>Whisper (Voice)</span>
            <span>{{ isWhisperLoaded ? 'Ready' : isWhisperLoading ? whisperProgress + '%' : 'Waiting…' }}</span>
          </div>
          <div class="h-1 bg-gray-700 rounded-full overflow-hidden">
            <div
              class="h-full bg-purple-500 transition-all duration-300"
              :style="{ width: isWhisperLoaded ? '100%' : whisperProgress + '%' }"
            />
          </div>
        </div>
      </div>

      <!-- Bottom Bar: Voice Button + TTS Toggle + Text Input -->
      <div class="shrink-0 flex items-end gap-2 px-3 pb-3 sm:px-4 sm:pb-4 border-t border-gray-700">
        <ListenButton
          :is-listening="isListening"
          :is-tts-speaking="isSpeaking"
          :disabled="isLoading || isAnyModelLoading"
          @toggle="toggleVoice"
        />
        <CameraButton
          :is-active="isCameraActive"
          :disabled="isLoading || isAnyModelLoading"
          @toggle="toggleCamera"
        />
        <TtsButton
          :is-enabled="ttsEnabled"
          :disabled="isLoading || isAnyModelLoading"
          @toggle="toggleTts"
        />
        <ChatInput
          class="flex-1"
          :is-loading="isLoading || isAnyModelLoading"
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
import { useWebSpeechSpeak } from '~/composables/useWebSpeechSpeak'
import { stripEmotionEmoji } from '~/types/emotion'

const config = useConfig()
const webgpuChat = useWebGpuChat()
const webSpeechSpeak = useWebSpeechSpeak()
const camera = useCamera()
const { isLoading: isGemmaLoading, loadProgress: gemmaProgress, isLoaded: isGemmaLoaded, loadModel, error: gemmaModelError } = useWebGpuModel()

const cameraPreviewEl = ref<HTMLVideoElement | null>(null)

watch(
  () => cameraPreviewEl.value,
  (el) => {
    camera.setPreviewElement(el).catch(() => {
      // preview attachment failures are non-fatal
    })
  },
  { immediate: true },
)

const isSpeaking = computed(() => webSpeechSpeak.isSpeaking.value)
const isCameraActive = computed(() => camera.isActive.value)
const cameraError = computed(() => camera.error.value)

function stopTts() {
  webSpeechSpeak.stop()
}

function handleTranscriptComplete(text: string) {
  handleSend(text).catch(() => {
    // send errors are surfaced via webgpuChat error state
  })
}

const webgpuListen = useWebGpuListen({ onTranscriptComplete: handleTranscriptComplete })

const messages = computed(() => webgpuChat.messages.value)
const isLoading = computed(() => webgpuChat.isLoading.value)
const chatError = computed(() => webgpuChat.error.value)
const isListening = computed(() => webgpuListen.isListening.value)
const isUserSpeaking = computed(() => webgpuListen.isSpeaking.value)
const isTranscribing = computed(() => webgpuListen.isTranscribing.value)
const transcript = computed(() => webgpuListen.transcript.value)
const speechError = computed(() => webgpuListen.error.value)
const isWhisperLoading = computed(() => webgpuListen.isLoading.value)
const whisperProgress = computed(() => webgpuListen.loadProgress.value)
const isWhisperLoaded = computed(() => webgpuListen.isLoaded.value)
const isAnyModelLoading = computed(() => isGemmaLoading.value || isWhisperLoading.value)

const ttsEnabled = ref(true)

function toggleTts() {
  ttsEnabled.value = !ttsEnabled.value
  if (!ttsEnabled.value) stopTts()
}

const activeModelName = 'Gemma-4-E2B (WebGPU)'

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

// Watch for errors in chat, speech, camera, and model loading to display in app-level notification
watch([chatError, speechError, cameraError, gemmaModelError], ([chat, speech, cam, model]) => {
  setAppError(chat || speech || cam || model || '')
})

// Detect emoji from assistant response text to update emotion; speak with TTS when in voice mode
watch(
  () => messages.value.length,
  () => {
    if (messages.value.length === 0) return
    const lastMsg = messages.value.at(-1)
    if (lastMsg?.role === 'assistant' && lastMsg.content) {
      detectEmotionFromText(lastMsg.content)
      // Speak with TTS when voice mode is active and TTS is enabled
      if (isListening.value && ttsEnabled.value) {
        webSpeechSpeak.speak(lastMsg.content)
      }
    }
  },
)

async function handleSend(message: string) {
  if (!message.trim()) return
  const imageBlob = isCameraActive.value
    ? await camera.captureLatestFrame()
    : null
  await webgpuChat.sendMessage(message, imageBlob)
}

function clearHistory() {
  webgpuChat.clearHistory()
}

async function closeApp() {
  if (isTauri()) {
    await getCurrentWindow().close()
  }
}

function toggleVoice() {
  if (isListening.value) {
    stopTts()
    webgpuListen.stop()
  }
  else {
    webgpuListen.start()
  }
}

async function toggleCamera() {
  if (isCameraActive.value) {
    camera.stop()
    return
  }
  try {
    await camera.start()
  }
  catch {
    // error state is already exposed by useCamera
  }
}

onMounted(() => {
  if (config.cameraEnabled) {
    void toggleCamera()
  }

  loadModel().catch(() => {})
})
</script>
