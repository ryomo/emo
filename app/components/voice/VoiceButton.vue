<template>
  <div class="flex flex-col items-center gap-2">
    <button
      class="rounded-full w-14 h-14 flex items-center justify-center transition-all duration-200 shadow-lg"
      :class="buttonClass"
      :disabled="disabled"
      @click="$emit('toggle')"
    >
      <span class="text-white text-xl">{{ isListening ? '⏹' : '🎤' }}</span>
    </button>
    <span class="text-xs" :class="isListening ? 'text-red-400' : 'text-gray-500'">
      {{ isListening ? '停止' : '音声認識' }}
    </span>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  isListening: boolean
  disabled?: boolean
}>()

defineEmits<{
  toggle: []
}>()

const buttonClass = computed(() => {
  if (props.disabled) {
    return 'bg-gray-600 cursor-not-allowed opacity-50'
  }
  if (props.isListening) {
    return 'bg-red-600 hover:bg-red-700 ring-2 ring-red-400/50 animate-pulse'
  }
  return 'bg-green-600 hover:bg-green-700 hover:scale-105'
})
</script>
