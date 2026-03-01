<template>
  <div class="relative flex flex-col items-center justify-center p-4 rounded-xl bg-gray-800/60">
    <!-- Emoji Display -->
    <Transition name="emotion" mode="out-in">
      <div :key="emotion" class="text-9xl sm:text-[10rem] select-none drop-shadow-lg">
        {{ emotionEmoji }}
      </div>
    </Transition>

    <!-- AI Response Text (Overlay) -->
    <Transition name="overlay-fade">
      <div
        v-if="responseText"
        class="mt-3 w-full max-h-28 overflow-y-auto rounded-lg bg-black/40 backdrop-blur-sm px-3 py-2"
      >
        <p class="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
          {{ responseText }}
        </p>
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
  /** Latest AI response text (emotion emoji removed) */
  responseText?: string
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

.overlay-fade-enter-active,
.overlay-fade-leave-active {
  transition: opacity 0.3s ease;
}
.overlay-fade-enter-from,
.overlay-fade-leave-to {
  opacity: 0;
}
</style>
