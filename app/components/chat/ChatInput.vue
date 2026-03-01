<template>
  <form class="flex items-center gap-2" @submit.prevent="handleSubmit">
    <input
      ref="inputEl"
      v-model="text"
      type="text"
      placeholder="Type a message..."
      class="flex-1 bg-gray-800 text-white rounded-lg px-3 py-2 sm:px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      :disabled="isLoading"
    />
    <button
      type="submit"
      class="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-2 sm:px-4 text-sm transition-colors disabled:opacity-50 whitespace-nowrap"
      :disabled="!text.trim() || isLoading"
    >
      Send
    </button>
  </form>
</template>

<script setup lang="ts">
defineProps<{
  isLoading: boolean
}>()

const text = ref('')
const inputEl = ref<HTMLInputElement | null>(null)

const emit = defineEmits<{
  send: [message: string]
}>()

function handleSubmit() {
  const message = text.value.trim()
  if (!message) return
  emit('send', message)
  text.value = ''
  // Return focus after sending
  nextTick(() => inputEl.value?.focus())
}
</script>
