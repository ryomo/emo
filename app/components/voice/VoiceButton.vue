<template>
  <button
    class="rounded-full w-14 h-14 flex items-center justify-center transition-colors"
    :class="isListening ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'"
    @click="$emit('toggle')"
  >
    <span class="text-white text-xl">{{ isListening ? '⏹' : '🎤' }}</span>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  isListening: boolean
}>()

defineEmits<{
  toggle: []
}>()
</script>
