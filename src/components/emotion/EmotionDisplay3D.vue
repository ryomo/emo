<template>
  <div :class="['relative', 'flex', 'flex-col', 'items-center', 'justify-center', 'p-4', 'rounded-xl', { 'bg-gray-800/60': !config.transparentBackground }]">
    <!-- 3D Canvas (rendered by Worker via OffscreenCanvas) -->
    <div
      ref="containerRef"
      class="w-full"
      style="height: 280px; overflow: hidden;"
    >
      <canvas
        ref="canvasRef"
        class="w-full h-full"
        :style="{ cursor: isDragging ? 'grabbing' : 'grab' }"
      />
    </div>

    <!-- AI Response Text (outside canvas) -->
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

    <p class="text-xs text-gray-500 mt-2">
      {{ emotion }}
    </p>
  </div>
</template>

<script setup lang="ts">
import type { EmotionType } from '~/types/emotion'
import { EMOTION_EMOJI } from '~/types/emotion'

const config = useConfig()

// --------------- Types ---------------

type WorkerOutMessage = { type: 'ready' } | { type: 'error', message: string }

// --------------- Props ---------------

const props = defineProps<{
  emotion: EmotionType
  /** Latest AI response text */
  responseText?: string
}>()

const emotionEmoji = computed(() => EMOTION_EMOJI[props.emotion] ?? '😐')

// --------------- Refs ---------------

const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

let worker: Worker | null = null

// --------------- Drag ---------------

const isDragging = ref(false)
let lastPointerX = 0
let lastPointerY = 0

function onPointerDown(event: PointerEvent): void {
  isDragging.value = true
  lastPointerX = event.clientX
  lastPointerY = event.clientY

  const target = event.currentTarget
  if (target instanceof HTMLElement) {
    target.setPointerCapture(event.pointerId)
  }
}

function onPointerMove(event: PointerEvent): void {
  if (!isDragging.value) return
  const deltaX = event.clientX - lastPointerX
  const deltaY = event.clientY - lastPointerY
  worker?.postMessage({ type: 'drag', deltaX, deltaY })
  lastPointerX = event.clientX
  lastPointerY = event.clientY
}

function onPointerUp(event: PointerEvent): void {
  isDragging.value = false

  const target = event.currentTarget
  if (target instanceof HTMLElement) {
    target.releasePointerCapture(event.pointerId)
  }
}

// --------------- Resize ---------------

function handleResize(): void {
  if (!containerRef.value) return
  const width = containerRef.value.clientWidth
  const height = containerRef.value.clientHeight
  worker?.postMessage({ type: 'resize', width, height })
}

// --------------- Emotion watch ---------------

watch(emotionEmoji, (emoji) => {
  worker?.postMessage({ type: 'emotion', emoji })
})

// --------------- Lifecycle ---------------

onMounted(() => {
  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container) {
    throw new Error('Canvas or container element not found')
  }

  // Init Web Worker from `workers/emotion3d.worker.ts`
  worker = new Worker(new URL('~/workers/emotion3d.worker.ts', import.meta.url), { type: 'module' })

  worker.onmessage = (event: MessageEvent<WorkerOutMessage>) => {
    if (event.data.type === 'error') {
      setAppError(event.data.message)
    }
  }

  const offscreen = canvas.transferControlToOffscreen()
  worker.postMessage(
    {
      type: 'init',
      canvas: offscreen,
      width: container.clientWidth,
      height: container.clientHeight,
      emoji: emotionEmoji.value,
    },
    [offscreen],
  )

  window.addEventListener('resize', handleResize)

  canvas.addEventListener('pointerdown', onPointerDown, { capture: true })
  canvas.addEventListener('pointermove', onPointerMove, { capture: true })
  canvas.addEventListener('pointerup', onPointerUp, { capture: true })
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)

  const canvas = canvasRef.value
  if (canvas) {
    canvas.removeEventListener('pointerdown', onPointerDown, { capture: true })
    canvas.removeEventListener('pointermove', onPointerMove, { capture: true })
    canvas.removeEventListener('pointerup', onPointerUp, { capture: true })
  }

  worker?.postMessage({ type: 'dispose' })
  worker?.terminate()
  worker = null
})
</script>

<style scoped>
canvas {
  touch-action: none;  /* Disable default touch interactions for better dragging on touch devices */
}

/* `<Transition name="overlay-fade">` */
.overlay-fade-enter-active,
.overlay-fade-leave-active {
  transition: opacity 0.3s ease;
}
.overlay-fade-enter-from,
.overlay-fade-leave-to {
  opacity: 0;
}
</style>
