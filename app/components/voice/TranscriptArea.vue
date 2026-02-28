<template>
  <div class="p-3 bg-gray-800 rounded-lg min-h-[3rem] relative overflow-hidden">
    <!-- 発話中パルスアニメーション -->
    <div
      v-if="isSpeaking"
      class="absolute inset-0 bg-green-500/10 animate-pulse rounded-lg pointer-events-none"
    />

    <!-- 発話中インジケーター -->
    <div v-if="isSpeaking" class="flex items-center gap-2 mb-2">
      <span class="relative flex h-2.5 w-2.5">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
      </span>
      <span class="text-green-400 text-xs font-medium">認識中...</span>
    </div>

    <!-- 認識テキスト -->
    <div v-if="transcript" class="text-gray-200 text-sm whitespace-pre-wrap max-h-32 overflow-y-auto">
      {{ transcript }}
    </div>
    <p v-else class="text-gray-500 text-sm">
      {{ isActive ? 'マイク入力を待っています...' : '音声認識テキストがここに表示されます' }}
    </p>

    <!-- エラー表示 -->
    <p v-if="error" class="text-red-400 text-xs mt-1">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  transcript: string
  isSpeaking?: boolean
  isActive?: boolean
  error?: string | null
}>()
</script>
