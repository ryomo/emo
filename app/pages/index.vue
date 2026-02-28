<template>
  <div class="flex flex-col h-screen bg-gray-900 text-white">
    <!-- ヘッダー -->
    <header class="flex items-center justify-between px-4 py-3 border-b border-gray-700">
      <h1 class="text-lg font-bold">AI Chat</h1>
      <span class="text-sm text-gray-400">{{ config.lemonadeModel }}</span>
    </header>

    <!-- メインコンテンツ -->
    <div class="flex flex-1 overflow-hidden">
      <!-- チャットエリア -->
      <main class="flex flex-col flex-1">
        <ChatWindow class="flex-1" />
        <ChatInput @send="handleSend" />
      </main>

      <!-- サイドバー: 表情 + 音声 -->
      <aside class="w-64 border-l border-gray-700 flex flex-col items-center gap-4 p-4">
        <EmotionDisplay :emotion="emotionState.current" />
        <VoiceButton :is-listening="isListening" @toggle="toggleVoice" />
        <VoiceTranscriptArea :transcript="transcript" />
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
const config = useRuntimeConfig().public

const { messages, isLoading, sendMessage } = useChatApi()
const { isSpeaking, speak, stop: stopTts } = useTtsApi()
const { isListening, transcript, start: startSpeech, stop: stopSpeech } = useRealtimeSpeech()
const { emotionState, setEmotion } = useAiEmotion()

function handleSend(message: string) {
  sendMessage(message)
}

function toggleVoice() {
  if (isListening.value) {
    stopSpeech()
  } else {
    startSpeech()
  }
}
</script>
