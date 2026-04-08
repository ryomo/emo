/**
 * WebGPU ASR (Automatic Speech Recognition) composable.
 *
 * Captures microphone audio via AudioWorklet, runs client-side
 * energy-based VAD, and transcribes finalized speech segments
 * using Whisper large-v3 on WebGPU.
 *
 * Provides the same reactive interface as useLemonadeListen (Lemonade Server).
 */

import { pipeline } from '@huggingface/transformers'

const LOG_PREFIX = '[WebGPU Listen]'
const MODEL_ID = 'onnx-community/whisper-large-v3-turbo'

/** Target sample rate for downsampled audio */
const TARGET_SAMPLE_RATE = 16000

/** RMS energy threshold for speech detection */
const SPEECH_ENERGY_THRESHOLD = 0.015

/** Duration (ms) of silence required to finalise a speech segment */
const SILENCE_DURATION_MS = 800

/** Number of audio chunks to keep as prefix buffer (captures speech onset) */
const PREFIX_BUFFER_COUNT = 3

/** Maximum speech duration in seconds */
const MAX_SPEECH_SECONDS = 30

/** Interval (ms) between interim transcription attempts while speaking */
const INTERIM_INTERVAL_MS = 1000

interface WebGpuListenOptions {
  /** Callback called with transcribed text when a speech segment ends */
  onTranscriptComplete?: (text: string) => void
}

// --------------- Module-level singleton (Whisper pipeline) ---------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _pipe: any = null

// --------------- Utility (outer scope) ---------------

/** Calculate RMS energy of a PCM buffer */
function calculateRms(samples: Float32Array): number {
  let sum = 0
  for (const sample of samples) {
    sum += sample * sample
  }
  return Math.sqrt(sum / samples.length)
}

/** Downsample PCM audio via linear interpolation */
function downsampleBuffer(
  input: Float32Array,
  inputRate: number,
  outputRate: number,
): Float32Array {
  if (inputRate === outputRate) return input
  const ratio = inputRate / outputRate
  const outputLength = Math.floor(input.length / ratio)
  const output = new Float32Array(outputLength)
  for (let i = 0; i < outputLength; i++) {
    const srcIdx = i * ratio
    const srcFloor = Math.floor(srcIdx)
    const srcCeil = Math.min(srcFloor + 1, input.length - 1)
    const frac = srcIdx - srcFloor
    output[i] = input[srcFloor]! * (1 - frac) + input[srcCeil]! * frac
  }
  return output
}

/** Concatenate multiple Float32Arrays into one */
function mergeFloat32Arrays(arrays: Float32Array[]): Float32Array {
  const totalLength = arrays.reduce((s, a) => s + a.length, 0)
  const merged = new Float32Array(totalLength)
  let offset = 0
  for (const arr of arrays) {
    merged.set(arr, offset)
    offset += arr.length
  }
  return merged
}

export function useWebGpuListen(options: WebGpuListenOptions = {}) {
  const { withGpuLock } = useWebGpuModel()
  const config = useConfig()

  // --------------- Reactive State ---------------
  const isListening = ref(false)
  const isSpeaking = ref(false)
  const isTranscribing = ref(false)
  const transcript = ref('')
  const isLoaded = ref(_pipe !== null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // --------------- Internal State ---------------
  let audioContext: AudioContext | null = null
  let mediaStream: MediaStream | null = null
  let sourceNode: MediaStreamAudioSourceNode | null = null
  let workletNode: AudioWorkletNode | null = null
  let nativeSampleRate = 48000

  // VAD state
  let speechChunks: Float32Array[] = []
  let prefixBuffer: Float32Array[] = []
  let silenceStartTime: number | null = null
  let totalSpeechSamples = 0

  // Interim transcription state
  let interimTimer: ReturnType<typeof setTimeout> | null = null
  let isInterimRunning = false

  // --------------- Whisper Model Loading ---------------

  async function loadWhisperModel(): Promise<void> {
    if (_pipe) {
      isLoaded.value = true
      return
    }

    isLoading.value = true
    try {
      console.log(LOG_PREFIX, '📦 Loading Whisper model…')
      _pipe = await pipeline('automatic-speech-recognition', MODEL_ID, {
        // Some encoder-decoder models, like Whisper, are extremely sensitive to quantization settings: especially of the encoder.
        // See: https://huggingface.co/docs/transformers.js/guides/dtypes#per-module-dtypes
        dtype: {
          encoder_model: 'fp16',
          decoder_model_merged: 'q4',
        },
        device: 'webgpu',
      })
      isLoaded.value = true
      console.log(LOG_PREFIX, '✅ Whisper model loaded')
    }
    catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      error.value = `Failed to load Whisper model: ${msg}`
      console.error(LOG_PREFIX, '❌ Failed to load Whisper model:', e)
    }
    finally {
      isLoading.value = false
    }
  }

  // --------------- Transcription ---------------

  /** Run Whisper transcription on audio data within GPU lock */
  async function transcribeAudio(audioData: Float32Array): Promise<string> {
    return await withGpuLock(async () => {
      if (!_pipe) {
        await loadWhisperModel()
      }
      if (!_pipe) {
        throw new Error('Whisper model is not loaded')
      }
      const result = await _pipe(audioData, {
        language: config.whisperLanguage || 'english',
      })
      return (result.text as string).trim()
    })
  }

  // --------------- Interim Transcription ---------------

  /** Schedule the next interim transcription after a delay */
  function scheduleInterim() {
    cancelInterim()
    interimTimer = setTimeout(async () => {
      interimTimer = null
      if (!isSpeaking.value || speechChunks.length === 0) return
      await runInterimTranscription()
      // Schedule next if still speaking
      if (isSpeaking.value) {
        scheduleInterim()
      }
    }, INTERIM_INTERVAL_MS)
  }

  /** Cancel pending interim transcription timer */
  function cancelInterim() {
    if (interimTimer !== null) {
      clearTimeout(interimTimer)
      interimTimer = null
    }
  }

  /** Run a single interim transcription on the accumulated audio so far */
  async function runInterimTranscription() {
    if (isInterimRunning) return
    isInterimRunning = true
    try {
      const audio = mergeFloat32Arrays([...speechChunks])
      const text = await transcribeAudio(audio)
      // Only update transcript if still speaking (avoid overwriting final result)
      if (text && isSpeaking.value) {
        transcript.value = text
        console.log(LOG_PREFIX, '📝 Interim transcript:', text)
      }
    }
    catch (e) {
      console.warn(LOG_PREFIX, 'Interim transcription failed:', e)
    }
    finally {
      isInterimRunning = false
    }
  }

  // --------------- VAD & Audio Processing ---------------

  /** Process a raw audio chunk from the AudioWorklet */
  function processAudioChunk(rawChunk: Float32Array) {
    const chunk = downsampleBuffer(rawChunk, nativeSampleRate, TARGET_SAMPLE_RATE)
    const rms = calculateRms(chunk)

    if (rms > SPEECH_ENERGY_THRESHOLD) {
      // Speech detected
      if (!isSpeaking.value) {
        // Speech just started — prepend prefix buffer to capture onset
        isSpeaking.value = true
        speechChunks = [...prefixBuffer]
        totalSpeechSamples = speechChunks.reduce((s, b) => s + b.length, 0)
        console.log(LOG_PREFIX, '🎙️ Speech started (VAD)')
        scheduleInterim()
      }
      speechChunks.push(chunk)
      totalSpeechSamples += chunk.length
      silenceStartTime = null
    }
    else if (isSpeaking.value) {
      // Trailing silence after speech
      speechChunks.push(chunk)
      totalSpeechSamples += chunk.length

      if (silenceStartTime === null) {
        silenceStartTime = Date.now()
      }
      else if (Date.now() - silenceStartTime >= SILENCE_DURATION_MS) {
        console.log(LOG_PREFIX, '🔇 Speech ended (VAD)')
        finalizeSpeech()
      }
    }

    // Enforce max duration
    if (isSpeaking.value && totalSpeechSamples >= MAX_SPEECH_SECONDS * TARGET_SAMPLE_RATE) {
      console.log(LOG_PREFIX, '⏱️ Max speech duration reached')
      finalizeSpeech()
    }

    // Maintain circular prefix buffer
    prefixBuffer.push(chunk)
    if (prefixBuffer.length > PREFIX_BUFFER_COUNT) {
      prefixBuffer.shift()
    }
  }

  /** Merge collected speech chunks and transcribe via Whisper */
  function finalizeSpeech() {
    cancelInterim()
    isSpeaking.value = false
    silenceStartTime = null

    if (speechChunks.length === 0) return

    const audio = mergeFloat32Arrays(speechChunks)
    speechChunks = []
    totalSpeechSamples = 0

    console.log(LOG_PREFIX, `📦 Audio segment ready: ${(audio.length / TARGET_SAMPLE_RATE).toFixed(1)}s`)
    handleAudioComplete(audio)
  }

  /** Run final transcription on the complete speech segment */
  async function handleAudioComplete(audioData: Float32Array) {
    isTranscribing.value = true

    try {
      const text = await transcribeAudio(audioData)
      if (text) {
        transcript.value = text
        console.log(LOG_PREFIX, '✅ Transcript:', text)
        options.onTranscriptComplete?.(text)
      }
    }
    catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      error.value = msg
      console.error(LOG_PREFIX, '❌ Transcription error:', e)
    }
    finally {
      isTranscribing.value = false
    }
  }

  // --------------- Audio Capture ---------------

  /** Acquire microphone and build AudioWorklet pipeline */
  async function setupAudio() {
    console.log(LOG_PREFIX, '🎤 Requesting microphone access…')

    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    })

    audioContext = new AudioContext()
    nativeSampleRate = audioContext.sampleRate

    await audioContext.audioWorklet.addModule('/audio-worklet-processor.js')

    sourceNode = audioContext.createMediaStreamSource(mediaStream)
    workletNode = new AudioWorkletNode(audioContext, 'pcm-processor')

    workletNode.port.onmessage = (event: MessageEvent) => {
      const buffer = new Float32Array(event.data as ArrayBuffer)
      processAudioChunk(buffer)
    }

    sourceNode.connect(workletNode)
    // Worklet is NOT connected to destination — capture only, no playback
  }

  /** Release all audio resources */
  function cleanupAudio() {
    cancelInterim()
    if (workletNode) {
      workletNode.port.postMessage('stop')
      workletNode.disconnect()
      workletNode = null
    }
    if (sourceNode) {
      sourceNode.disconnect()
      sourceNode = null
    }
    if (audioContext) {
      audioContext.close()
      audioContext = null
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop())
      mediaStream = null
    }

    // Reset VAD state
    speechChunks = []
    prefixBuffer = []
    silenceStartTime = null
    totalSpeechSamples = 0
  }

  // --------------- Public Controls ---------------

  /** Start listening for speech */
  async function start() {
    if (isListening.value) return

    error.value = null
    transcript.value = ''

    try {
      // Lazy-load Whisper model on first start
      if (!_pipe) {
        await loadWhisperModel()
      }

      await setupAudio()
      isListening.value = true
      console.log(LOG_PREFIX, '🎤 Listening started')
    }
    catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e))
      if (err.name === 'NotAllowedError') {
        error.value = 'Microphone access denied. Please check your browser settings.'
      }
      else if (err.name === 'NotFoundError') {
        error.value = 'Microphone device not found.'
      }
      else {
        error.value = `Microphone error: ${err.message}`
      }
      console.error(LOG_PREFIX, '❌ Start failed:', e)
    }
  }

  /** Stop listening and release resources */
  function stop() {
    cleanupAudio()
    isListening.value = false
    isSpeaking.value = false
    console.log(LOG_PREFIX, '🛑 Listening stopped')
  }

  return {
    isListening: readonly(isListening),
    isSpeaking: readonly(isSpeaking),
    isTranscribing: readonly(isTranscribing),
    transcript: readonly(transcript),
    isLoaded: readonly(isLoaded),
    isLoading: readonly(isLoading),
    error: readonly(error),
    start,
    stop,
  }
}
