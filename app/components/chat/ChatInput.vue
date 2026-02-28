<template>
  <form class="flex items-center gap-2 p-3 border-t border-gray-700" @submit.prevent="handleSubmit">
    <input
      v-model="text"
      type="text"
      placeholder="メッセージを入力..."
      class="flex-1 bg-gray-800 text-white rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
    />
    <button
      type="submit"
      class="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 transition-colors disabled:opacity-50"
      :disabled="!text.trim()"
    >
      送信
    </button>
  </form>
</template>

<script setup lang="ts">
const text = ref('')

const emit = defineEmits<{
  send: [message: string]
}>()

function handleSubmit() {
  const message = text.value.trim()
  if (!message) return
  emit('send', message)
  text.value = ''
}
</script>
