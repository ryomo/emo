/**
 * Shared WebGPU model manager for Gemma-4-E2B-it-ONNX.
 *
 * Loads the processor and model once as a module-level singleton,
 * shared across all consumers (chat API, speech recognition).
 */

import {
  AutoProcessor,
  Gemma4ForConditionalGeneration,
} from '@huggingface/transformers'

const LOG_PREFIX = '[WebGPU Model]'
const MODEL_ID = 'onnx-community/gemma-4-E2B-it-ONNX'

// --------------- Module-level singleton state ---------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _processor: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _model: any = null
let _loadPromise: Promise<void> | null = null

const _isLoaded = ref(false)
const _isLoading = ref(false)
const _loadProgress = ref(0)
const _error = ref<string | null>(null)

// --------------- GPU Lock ---------------

let _isGpuBusy = false
const _isGpuBusyRef = ref(false)

async function withGpuLock<T>(fn: () => Promise<T>): Promise<T> {
  while (_isGpuBusy) {
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  _isGpuBusy = true
  _isGpuBusyRef.value = true
  try {
    return await fn()
  }
  finally {
    _isGpuBusy = false
    _isGpuBusyRef.value = false
  }
}

// --------------- Public API ---------------

/**
 * Load the processor and model. Safe to call multiple times;
 * subsequent calls return the same promise until resolved or failed.
 */
async function loadModel(): Promise<void> {
  if (_isLoaded.value) return
  if (_loadPromise) return _loadPromise

  _isLoading.value = true
  _error.value = null
  _loadProgress.value = 0

  _loadPromise = (async () => {
    try {
      if (typeof navigator !== 'undefined' && !navigator.gpu) {
        throw new Error('WebGPU is not supported in this browser.')
      }

      console.log(LOG_PREFIX, '📦 Loading processor…')
      _processor = await AutoProcessor.from_pretrained(MODEL_ID)

      console.log(LOG_PREFIX, '📦 Loading model (WebGPU, q4f16)…')
      _model = await Gemma4ForConditionalGeneration.from_pretrained(MODEL_ID, {
        dtype: 'q4f16',
        device: 'webgpu',
        progress_callback: (info: { status: string, progress?: number }) => {
          if (info.progress != null) {
            _loadProgress.value = Math.round(info.progress)
          }
        },
      })

      _isLoaded.value = true
      console.log(LOG_PREFIX, '✅ Model loaded successfully')
    }
    catch (e) {
      _error.value = e instanceof Error ? e.message : String(e)
      _loadPromise = null
      console.error(LOG_PREFIX, '❌ Failed to load model:', e)
    }
    finally {
      _isLoading.value = false
    }
  })()

  return _loadPromise
}

/**
 * Return reactive model state and accessors.
 */
export function useWebGpuModel() {
  return {
    isLoaded: readonly(_isLoaded),
    isLoading: readonly(_isLoading),
    loadProgress: readonly(_loadProgress),
    error: readonly(_error),
    isGpuBusy: readonly(_isGpuBusyRef),
    loadModel,
    getProcessor: () => _processor,
    getModel: () => _model,
    withGpuLock,
  }
}
