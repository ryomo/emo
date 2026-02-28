<template>
  <div class="flex flex-col items-center justify-center p-4">
    <Transition name="emotion" mode="out-in">
      <div :key="emotion" class="text-6xl">
        {{ emotionEmoji }}
      </div>
    </Transition>
    <p class="text-xs text-gray-500 mt-2">{{ emotion }}</p>
  </div>
</template>

<script setup lang="ts">
import type { EmotionType } from '~/types/emotion'
import { EMOTION_EMOJI } from '~/types/emotion'

const props = defineProps<{
  emotion: EmotionType
}>()

const emotionEmoji = computed(() => EMOTION_EMOJI[props.emotion] ?? '😐')
</script>

<style scoped>
.emotion-enter-active,
.emotion-leave-active {
  transition: all 0.3s ease;
}
.emotion-enter-from {
  opacity: 0;
  transform: scale(0.8) translateY(8px);
}
.emotion-leave-to {
  opacity: 0;
  transform: scale(0.8) translateY(-8px);
}
</style>
