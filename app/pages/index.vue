<template>
  <div class="flex flex-col h-screen bg-gray-900 text-white">
    <!-- ヘッダー -->
    <header class="flex items-center justify-between px-4 py-3 border-b border-gray-700">
      <h1 class="text-lg font-bold">AI Chat</h1>
      <div class="flex items-center gap-3">
        <span class="text-sm text-gray-400">{{ config.lemonadeModel }}</span>
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

    <!-- メインコンテンツ -->
    <div class="flex flex-1 overflow-hidden">
      <!-- チャットエリア -->
      <main class="flex flex-col flex-1">
        <ChatHistory class="flex-1" :messages="messages" :is-loading="isLoading" />
        <ChatInput :is-loading="isLoading" @send="handleSend" />
      </main>

      <!-- サイドバー: 表情 + 音声 -->
      <aside class="w-64 border-l border-gray-700 flex flex-col items-center gap-4 p-4">
        <EmotionDisplay :emotion="emotionState.current" />
        <VoiceButton
          :is-listening="isListening"
          :is-tts-speaking="isSpeaking"
          :disabled="isLoading"
          @toggle="toggleVoice"
        />
        <VoiceTranscriptArea
          :transcript="transcript"
          :is-speaking="isUserSpeaking"
          :is-active="isListening"
          :error="speechError"
        />
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
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
