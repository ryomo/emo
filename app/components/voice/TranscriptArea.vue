<template>
  <div class="p-3 bg-gray-800 rounded-lg min-h-[3rem]">
    <p v-if="transcript" class="text-gray-200 text-sm">{{ transcript }}</p>
    <p v-else class="text-gray-500 text-sm">音声認識テキストがここに表示されます</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  transcript: string
}>()
</script>
