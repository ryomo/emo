<template>
  <div class="flex flex-col items-center gap-2">
    <button
      class="rounded-full w-14 h-14 flex items-center justify-center transition-all duration-200 shadow-lg"
      :class="buttonClass"
      :disabled="disabled"
      @click="$emit('toggle')"
    >
      <span class="text-white text-xl">{{ buttonIcon }}</span>
    </button>
    <span
      class="text-xs"
      :class="labelClass"
    >
      {{ label }}
    </span>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  isListening: boolean
  isTtsSpeaking?: boolean
  disabled?: boolean
}>()

defineEmits<{
  toggle: []
}>()

const buttonIcon = computed(() => {
  if (props.isListening && props.isTtsSpeaking) return '🔊'
  return '🎤'
})

const label = computed(() => {
  if (props.isListening && props.isTtsSpeaking) return 'Speaking...'
  if (props.isListening) return 'Voice On'
  return 'Voice'
})

const labelClass = computed(() => {
  if (props.isListening && props.isTtsSpeaking) return 'text-blue-400'
  if (props.isListening) return 'text-green-400'
  return 'text-gray-500'
})

const buttonClass = computed(() => {
  if (props.disabled) {
    return 'bg-gray-600 cursor-not-allowed opacity-50'
  }
  if (props.isListening && props.isTtsSpeaking) {
    return 'bg-blue-600 hover:bg-blue-700 ring-2 ring-blue-400/50 animate-pulse'
  }
  if (props.isListening) {
    return 'bg-green-600 hover:bg-green-700 ring-2 ring-green-400/50'
  }
  return 'bg-slate-600 hover:bg-slate-700 hover:scale-105'
})
</script>
