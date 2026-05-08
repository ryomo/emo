/**
 * Camera composable used for preview and snapshot capture.
 */

interface CaptureOptions {
  width?: number
  height?: number
  quality?: number
}

const DEFAULT_CAPTURE_WIDTH = 640
const DEFAULT_CAPTURE_HEIGHT = 360
const DEFAULT_CAPTURE_QUALITY = 0.8

export function useCamera() {
  const isActive = ref(false)
  const stream = ref<MediaStream | null>(null)
  const error = ref<string | null>(null)

  const previewRef = ref<HTMLVideoElement | null>(null)
  let captureVideoEl: HTMLVideoElement | null = null

  async function start() {
    if (isActive.value) return

    error.value = null
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      stream.value = media
      isActive.value = true
      await syncPreviewTarget()
    }
    catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e))
      if (err.name === 'NotAllowedError') {
        error.value = 'Camera access denied. Please allow camera permissions.'
      }
      else if (err.name === 'NotFoundError') {
        error.value = 'Camera device not found.'
      }
      else {
        error.value = `Failed to start camera: ${err.message}`
      }
      stop()
      throw err
    }
  }

  function stop() {
    if (previewRef.value) {
      previewRef.value.srcObject = null
    }

    if (captureVideoEl) {
      captureVideoEl.srcObject = null
      captureVideoEl = null
    }

    if (stream.value) {
      for (const track of stream.value.getTracks()) {
        track.stop()
      }
    }

    stream.value = null
    isActive.value = false
  }

  async function setPreviewElement(el: HTMLVideoElement | null) {
    previewRef.value = el
    await syncPreviewTarget()
  }

  async function captureLatestFrame(options: CaptureOptions = {}): Promise<Blob | null> {
    if (!stream.value) return null

    const video = await ensureCaptureVideo()
    if (!video) return null

    const width = options.width ?? DEFAULT_CAPTURE_WIDTH
    const height = options.height ?? DEFAULT_CAPTURE_HEIGHT
    const quality = options.quality ?? DEFAULT_CAPTURE_QUALITY

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.drawImage(video, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality)
    })

    return blob
  }

  async function syncPreviewTarget() {
    if (!previewRef.value || !stream.value) return

    previewRef.value.srcObject = stream.value
    previewRef.value.muted = true
    previewRef.value.playsInline = true

    try {
      await previewRef.value.play()
    }
    catch {
      // play() can fail before user gesture in some environments
    }
  }

  async function ensureCaptureVideo(): Promise<HTMLVideoElement | null> {
    if (!stream.value) return null

    if (!captureVideoEl) {
      captureVideoEl = document.createElement('video')
      captureVideoEl.muted = true
      captureVideoEl.playsInline = true
      captureVideoEl.srcObject = stream.value
    }

    if (captureVideoEl.readyState < 2) {
      await captureVideoEl.play()
      await new Promise<void>((resolve) => {
        if (!captureVideoEl) {
          resolve()
          return
        }
        if (captureVideoEl.readyState >= 2) {
          resolve()
          return
        }
        const handler = () => {
          captureVideoEl?.removeEventListener('loadeddata', handler)
          resolve()
        }
        captureVideoEl.addEventListener('loadeddata', handler)
      })
    }

    return captureVideoEl
  }

  onBeforeUnmount(() => {
    stop()
  })

  return {
    isActive: readonly(isActive),
    stream: readonly(stream),
    error: readonly(error),
    start,
    stop,
    setPreviewElement,
    captureLatestFrame,
  }
}
