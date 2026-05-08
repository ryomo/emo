<template>
  <div class="flex flex-col items-center gap-2">
    <button
      class="rounded-full w-14 h-14 flex items-center justify-center transition-all duration-200 shadow-lg"
      :class="buttonClass"
      :disabled="disabled"
      @click="$emit('toggle')"
    >
      <span class="text-white text-xl">{{ isActive ? '📷' : '📸' }}</span>
    </button>
    <span
      class="text-xs"
      :class="isActive ? 'text-cyan-400' : 'text-gray-500'"
    >
      {{ isActive ? 'Camera On' : 'Camera' }}
    </span>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  isActive: boolean
  disabled?: boolean
}>()

defineEmits<{
  toggle: []
}>()

const buttonClass = computed(() => {
  if (props.disabled) {
    return 'bg-gray-600 cursor-not-allowed opacity-50'
  }
  if (props.isActive) {
    return 'bg-cyan-600 hover:bg-cyan-700 ring-2 ring-cyan-400/50'
  }
  return 'bg-slate-600 hover:bg-slate-700 hover:scale-105'
})
</script>
