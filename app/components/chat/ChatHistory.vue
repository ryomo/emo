<template>
  <div ref="scrollContainer" class="flex flex-col h-full overflow-y-auto p-4 space-y-3">
    <!-- メッセージが無い場合 -->
    <p v-if="messages.length === 0" class="text-gray-500 text-center text-sm mt-8">
      メッセージを入力して会話を始めましょう
    </p>

    <!-- メッセージ一覧 -->
    <div
      v-for="(msg, i) in messages"
      :key="i"
      class="flex"
      :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
    >
      <div
        class="max-w-[75%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap"
        :class="
          msg.role === 'user'
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-gray-700 text-gray-100 rounded-bl-sm'
        "
      >
        {{ displayContent(msg) }}
      </div>
    </div>

    <!-- ローディングインジケーター -->
    <div v-if="isLoading" class="flex justify-start">
      <div class="bg-gray-700 text-gray-300 rounded-2xl rounded-bl-sm px-4 py-2 text-sm">
        <span class="inline-flex gap-1">
          <span class="animate-bounce" style="animation-delay: 0ms">●</span>
          <span class="animate-bounce" style="animation-delay: 150ms">●</span>
          <span class="animate-bounce" style="animation-delay: 300ms">●</span>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DeepReadonly } from 'vue'
import type { ChatMessage } from '~/types/chat'
import { stripEmotionEmoji } from '~/types/emotion'

const props = defineProps<{
  messages: readonly ChatMessage[] | DeepReadonly<ChatMessage[]>
  isLoading: boolean
}>()

/** assistant メッセージから感情絵文字を除去して表示用テキストを返す */
function displayContent(msg: { role: string; content: string | null }): string {
  const text = msg.content ?? ''
  return msg.role === 'assistant' ? stripEmotionEmoji(text) : text
}

const scrollContainer = ref<HTMLElement | null>(null)

/** 新しいメッセージ追加時に自動スクロール */
watch(
  () => props.messages.length,
  async () => {
    await nextTick()
    if (scrollContainer.value) {
      scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
    }
  },
)

/** ローディング表示時にもスクロール */
watch(
  () => props.isLoading,
  async (loading) => {
    if (loading) {
      await nextTick()
      if (scrollContainer.value) {
        scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
      }
    }
  },
)
</script>
