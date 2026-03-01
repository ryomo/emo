<template>
  <div class="flex flex-col h-screen bg-gray-900 text-white">
    <!-- ヘッダー -->
    <header class="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3 border-b border-gray-700">
      <h1 class="text-base sm:text-lg font-bold">AI Chat</h1>
      <div class="flex items-center gap-2 sm:gap-3">
        <span class="hidden sm:inline text-sm text-gray-400">{{ config.lemonadeModel }}</span>
        <button
          class="text-xs text-gray-400 hover:text-white border border-gray-600 rounded px-2 py-1 transition-colors"
          @click="clearHistory"
        >
          履歴クリア
        </button>
      </div>
    </header>

    <!-- エラー表示 -->
    <div v-if="chatError || speechError" class="bg-red-900/50 border border-red-700 text-red-200 px-4 py-2 text-sm">
      {{ chatError || speechError }}
    </div>

    <!-- メインコンテンツ (縦積みレイアウト) -->
    <main class="flex flex-col flex-1 overflow-hidden">
      <!-- チャット履歴 -->
      <ChatHistory class="flex-1 min-h-0" :messages="messages" :is-loading="isLoading" />

      <!-- AI 表情エリア -->
      <div class="shrink-0 px-3 py-2 sm:px-4 sm:py-3 border-t border-gray-700">
        <EmotionDisplay
          :emotion="emotionState.current"
          :response-text="lastAssistantText"
        />
      </div>

      <!-- 音声認識テキストエリア (音声モード時のみ表示) -->
      <div v-if="isListening" class="shrink-0 px-3 pb-2 sm:px-4 sm:pb-3">
        <VoiceTranscriptArea
          :transcript="transcript"
          :is-speaking="isUserSpeaking"
          :is-active="isListening"
          :error="speechError"
        />
      </div>

      <!-- ボトムバー: 音声ボタン + テキスト入力 -->
      <div class="shrink-0 flex items-end gap-2 px-3 pb-3 sm:px-4 sm:pb-4 border-t border-gray-700">
        <VoiceButton
          :is-listening="isListening"
          :is-tts-speaking="isSpeaking"
          :disabled="isLoading"
          @toggle="toggleVoice"
        />
        <ChatInput class="flex-1" :is-loading="isLoading" @send="handleSend" />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { stripEmotionEmoji } from '~/types/emotion'

const config = useRuntimeConfig().public

const { messages, isLoading, error: chatError, sendMessage, clearHistory } = useChatApi()
const { isSpeaking, speak, stop: stopTts } = useTtsApi()
const {
  isListening,
  isSpeaking: isUserSpeaking,
  transcript,
  error: speechError,
  start: startSpeech,
  stop: stopSpeech,
} = useRealtimeSpeech({
  onTranscriptComplete: (text) => {
    console.log('[index] 音声認識テキスト確定 → チャット API 送信:', text)
    sendMessage(text)
  },
})
const { emotionState, detectEmotionFromText } = useAiEmotion()

/** 最新の assistant 応答テキスト (感情絵文字除去済み) を EmotionDisplay に渡す */
const lastAssistantText = computed(() => {
  for (let i = messages.value.length - 1; i >= 0; i--) {
    const msg = messages.value[i]
    if (msg?.role === 'assistant' && msg.content) {
      return stripEmotionEmoji(msg.content)
    }
  }
  return ''
})

// assistant の応答テキストから絵文字を検出して感情を更新し、ボイスモード中は TTS で読み上げ
watch(
  () => messages.value.length,
  () => {
    if (messages.value.length === 0) return
    const lastMsg = messages.value.at(-1)
    if (lastMsg?.role === 'assistant' && lastMsg.content) {
      detectEmotionFromText(lastMsg.content)
      // ボイスモードが有効なときだけ TTS で読み上げ
      if (isListening.value) {
        speak(lastMsg.content)
      }
    }
  },
)

function handleSend(message: string) {
  sendMessage(message)
}

function toggleVoice() {
  if (isListening.value) {
    stopTts()
    stopSpeech()
  } else {
    startSpeech()
  }
}
</script>
