/**
 * Worker for EmotionDisplay3D.
 * Runs Three.js WebGPURenderer on an OffscreenCanvas in a dedicated thread.
 */
import {
  AmbientLight,
  BoxGeometry,
  CanvasTexture,
  DirectionalLight,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  WebGPURenderer,
} from 'three/webgpu'

// --------------- Types ---------------

type InitMessage = { type: 'init', canvas: OffscreenCanvas, width: number, height: number, emoji: string }
type EmotionMessage = { type: 'emotion', emoji: string }
type DragMessage = { type: 'drag', deltaX: number, deltaY: number }
type ResizeMessage = { type: 'resize', width: number, height: number }
type DisposeMessage = { type: 'dispose' }

type IncomingMessage = InitMessage | EmotionMessage | DragMessage | ResizeMessage | DisposeMessage

// --------------- State ---------------

let renderer: WebGPURenderer | null = null
let scene: Scene | null = null
let camera: PerspectiveCamera | null = null
let group: Group | null = null

let emojiCanvas: OffscreenCanvas | null = null
let emojiCtx: OffscreenCanvasRenderingContext2D | null = null
let emojiTexture: CanvasTexture | null = null

let rotationOffsetX = 0
let rotationOffsetY = 0

// --------------- Emoji texture ---------------

function drawEmoji(emoji: string): void {
  if (!emojiCtx || !emojiTexture) return
  emojiCtx.clearRect(0, 0, 256, 256)
  emojiCtx.font = '200px emoji, serif'
  emojiCtx.textAlign = 'center'
  emojiCtx.textBaseline = 'middle'
  emojiCtx.fillText(emoji, 128, 128)
  emojiTexture.needsUpdate = true
}

// --------------- Animation ---------------

function animate(ms: number): void {
  if (!group) return
  group.rotation.x = Math.sin(ms * 0.0007) / 4 + rotationOffsetX
  group.rotation.y = Math.sin(ms * 0.001) / 2 + rotationOffsetY
}

// --------------- Dispose ---------------

function disposeScene(): void {
  if (!scene) return
  scene.traverse((object) => {
    if (object instanceof Mesh) {
      object.geometry.dispose()
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      for (const mat of materials) {
        for (const value of Object.values(mat)) {
          if (value instanceof CanvasTexture) {
            value.dispose()
          }
        }
        mat.dispose()
      }
    }
  })
}

// --------------- Init ---------------

async function init(msg: InitMessage): Promise<void> {
  const { canvas, width, height, emoji } = msg

  // Check WebGPU availability
  if (!navigator.gpu) {
    globalThis.postMessage({ type: 'error', message: 'WebGPU is not supported in this environment.' })
    return
  }

  // Renderer
  renderer = new WebGPURenderer({ canvas, antialias: true })
  renderer.setSize(width, height, false)
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio ?? 1, 2))

  try {
    await renderer.init()
  }
  catch (err) {
    globalThis.postMessage({ type: 'error', message: `WebGPU renderer failed to initialize: ${err}` })
    renderer.dispose()
    renderer = null
    return
  }

  // Scene
  scene = new Scene()

  // Camera
  camera = new PerspectiveCamera(50, width / height, 0.1, 100)
  camera.position.set(0, 0, 4)

  // Lighting
  const ambientLight = new AmbientLight(0xFFFFFF, 1.5)
  scene.add(ambientLight)
  const directionalLight = new DirectionalLight(0xFFFFFF, 1)
  directionalLight.position.set(2, 3, 4)
  scene.add(directionalLight)

  // Group (box + emoji plane)
  group = new Group()
  scene.add(group)

  // Box
  const boxGeometry = new BoxGeometry(2, 2, 1)
  const boxMaterial = new MeshStandardMaterial({ color: 0x4A5568, transparent: true, opacity: 0.8 })
  const cube = new Mesh(boxGeometry, boxMaterial)
  group.add(cube)

  // Emoji texture via Canvas 2D
  emojiCanvas = new OffscreenCanvas(256, 256)
  emojiCtx = emojiCanvas.getContext('2d')
  emojiTexture = new CanvasTexture(emojiCanvas as unknown as HTMLCanvasElement)
  drawEmoji(emoji)

  const planeGeometry = new PlaneGeometry(2, 2)
  const planeMaterial = new MeshBasicMaterial({ map: emojiTexture, transparent: true })
  const plane = new Mesh(planeGeometry, planeMaterial)
  plane.position.set(0, 0, 0.501)
  group.add(plane)

  // Start render loop
  renderer.setAnimationLoop((time: number) => {
    animate(time)
    renderer!.render(scene!, camera!)
  })

  globalThis.postMessage({ type: 'ready' })
}

// --------------- Message handler ---------------

globalThis.onmessage = (event: MessageEvent<IncomingMessage>) => {
  const msg = event.data
  switch (msg.type) {
    case 'init':
      init(msg)
      break
    case 'emotion':
      drawEmoji(msg.emoji)
      break
    case 'drag':
      rotationOffsetX += msg.deltaY * 0.01
      rotationOffsetY += msg.deltaX * 0.01
      break
    case 'resize': {
      if (!camera || !renderer) break
      camera.aspect = msg.width / msg.height
      camera.updateProjectionMatrix()
      renderer.setSize(msg.width, msg.height, false)
      break
    }
    case 'dispose':
      renderer?.setAnimationLoop(null)
      disposeScene()
      renderer?.dispose()
      renderer = null
      scene = null
      camera = null
      group = null
      emojiTexture = null
      emojiCtx = null
      emojiCanvas = null
      break
  }
}
