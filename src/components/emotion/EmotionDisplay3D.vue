<template>
  <div :class="['relative', 'flex', 'flex-col', 'items-center', 'justify-center', 'p-4', 'rounded-xl', { 'bg-gray-800/60': !config.transparentBackground }]">
    <!-- 3D Canvas -->
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

    <!-- HTMLMesh source (rendered onto 3D box) -->
    <div
      ref="emojiDomRef"
      class="emoji-source"
    >
      <span class="emoji-text">{{ emotionEmoji }}</span>
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
import * as THREE from 'three'
import { HTMLMesh } from 'three/addons/interactive/HTMLMesh.js'
import { InteractiveGroup } from 'three/addons/interactive/InteractiveGroup.js'
import type { EmotionType } from '~/types/emotion'
import { EMOTION_EMOJI } from '~/types/emotion'

const config = useConfig()

class EmojiBoxModel {
  cube: THREE.Mesh
  mesh: HTMLMesh
  interactiveGroup!: InteractiveGroup
  group: THREE.Group
  rotationOffsetX: number = 0
  rotationOffsetY: number = 0

  constructor(element: HTMLElement, scene: THREE.Scene, renderer: THREE.WebGLRenderer, camera: THREE.Camera) {
    // Group to hold cube and HTMLMesh, so we can rotate them together
    this.group = new THREE.Group()
    scene.add(this.group)

    // Box
    const geometry = new THREE.BoxGeometry(2, 2, 1)
    const material = new THREE.MeshStandardMaterial({ color: 0x4a5568, transparent: true, opacity: 0.8 })
    this.cube = new THREE.Mesh(geometry, material)
    this.group.add(this.cube)

    // HTMLMesh with emoji
    this.mesh = new HTMLMesh(element)
    this.mesh.position.set(0, 0, 0.501)
    this.mesh.scale.setScalar(10)

    this.connectGroup(scene, renderer, camera)
  }

  animate(ms: number): void {
    this.group.rotation.x = Math.sin(ms * 0.0007) / 4 + this.rotationOffsetX
    this.group.rotation.y = Math.sin(ms * 0.001) / 2 + this.rotationOffsetY
  }

  connectGroup(scene: THREE.Scene, renderer: THREE.WebGLRenderer, camera: THREE.Camera): void {
    this.interactiveGroup = new InteractiveGroup()
    this.interactiveGroup.listenToPointerEvents(renderer, camera)
    this.interactiveGroup.add(this.mesh)
    this.group.add(this.interactiveGroup)
  }

  disconnectGroup(): void {
    this.interactiveGroup.disconnect()
  }
}

const props = defineProps<{
  emotion: EmotionType
  /** Latest AI response text */
  responseText?: string
}>()

const emotionEmoji = computed(() => EMOTION_EMOJI[props.emotion] ?? '😐')

const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const emojiDomRef = ref<HTMLDivElement | null>(null)

let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let emojiBoxModel: EmojiBoxModel | null = null

const isDragging = ref(false)
let lastPointerX = 0
let lastPointerY = 0

function onPointerDown(event: PointerEvent): void {
  isDragging.value = true
  lastPointerX = event.clientX
  lastPointerY = event.clientY

  // Capture pointer
  const target = event.currentTarget
  if (target instanceof HTMLElement) {
    target.setPointerCapture(event.pointerId)
  }
}

function onPointerMove(event: PointerEvent): void {
  if (!isDragging.value || !emojiBoxModel) return
  const deltaX = event.clientX - lastPointerX
  const deltaY = event.clientY - lastPointerY
  emojiBoxModel.rotationOffsetY += deltaX * 0.01
  emojiBoxModel.rotationOffsetX += deltaY * 0.01
  lastPointerX = event.clientX
  lastPointerY = event.clientY
}

function onPointerUp(event: PointerEvent): void {
  isDragging.value = false

  // Release pointer capture when dragging ends
  const target = event.currentTarget
  if (target instanceof HTMLElement) {
    target.releasePointerCapture(event.pointerId)
  }
}

function init(): void {
  const container = containerRef.value!
  const canvas = canvasRef.value!
  const width = container.clientWidth
  const height = container.clientHeight

  // Scene / Camera / Renderer setup
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100)
  camera.position.set(0, 0, 4)
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setSize(width, height, false)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.5)
  scene.add(ambientLight)
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
  directionalLight.position.set(2, 3, 4)
  scene.add(directionalLight)

  // EmojiBox
  emojiBoxModel = new EmojiBoxModel(emojiDomRef.value!, scene, renderer, camera)
}

function startAnimationLoop(): void {
  renderer!.setAnimationLoop((time: number) => {
    emojiBoxModel?.animate(time)
    renderer!.render(scene!, camera!)
  })
}

function handleResize(): void {
  if (!containerRef.value || !camera || !renderer) return
  const width = containerRef.value.clientWidth
  const height = containerRef.value.clientHeight
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height, false)
}

function disposeScene(): void {
  if (scene) {
    scene.traverse((object: THREE.Object3D) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose()
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        for (const mat of materials) {
          for (const value of Object.values(mat)) {
            if (value instanceof THREE.Texture) {
              value.dispose()
            }
          }
          mat.dispose()
        }
      }
    })
  }
  renderer?.dispose()
}

onMounted(() => {
  init()
  startAnimationLoop()

  window.addEventListener('resize', handleResize)

  // Add pointer event listeners to canvas
  const canvas = canvasRef.value
  if (canvas === null) {
    throw new Error('Canvas element not found')
  }
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
  renderer?.setAnimationLoop(null)
  emojiBoxModel?.disconnectGroup()
  disposeScene()
})
</script>

<style scoped>
canvas {
  touch-action: none;  /* Disable default touch interactions for better dragging on touch devices */
}

.emoji-source {
  width: 128px;
  height: 128px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;

  /* Hidden off-screen */
  position: absolute;
  left: -9999px;
  top: -9999px;
}

.emoji-text {
  font-size: 96px;
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
