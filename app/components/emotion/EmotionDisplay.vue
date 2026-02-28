<template>
  <div class="flex items-center justify-center p-4">
    <div class="text-6xl transition-all duration-300">
      {{ emotionEmoji }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type { EmotionType } from '~/types/emotion'

const props = defineProps<{
  emotion: EmotionType
}>()

const emojiMap: Record<EmotionType, string> = {
  neutral: '😐',
  happy: '😊',
  sad: '😢',
  angry: '😠',
  surprised: '😲',
  thinking: '🤔',
}

const emotionEmoji = computed(() => emojiMap[props.emotion] ?? '😐')
</script>
