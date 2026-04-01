<template>
  <div>
    <NuxtRouteAnnouncer />
    <!-- Config load error notification -->
    <div
      v-if="showError"
      class="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-3 bg-yellow-600/90 px-4 py-3 text-sm text-white"
    >
      <span>⚠ {{ configLoadError }}</span>
      <button
        class="shrink-0 hover:text-yellow-200"
        @click="errorDismissed = true"
      >
        ✕
      </button>
    </div>
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
import { useConfigLoadError } from '~/composables/useConfig'

const configLoadError = useConfigLoadError()
const errorDismissed = ref(false)
const showError = computed(() => !errorDismissed.value && !!configLoadError.value)
</script>
