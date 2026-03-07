/**
 * WebSocket realtime speech recognition composable (Task 04)
 *
 * Uses the Lemonade Server's /realtime endpoint (OpenAI Realtime API compatible)
 * to transcribe microphone input in real time.
 *
 * Audio format: PCM 16kHz mono 16bit → Base64 encoded and sent
 */

const LOG_PREFIX = '[RealtimeSpeech]'

/** Microphone input gain multiplier (1 = no change, 2 = 2x amplification) */
const MIC_GAIN = 1

interface RealtimeSpeechOptions {
  /** Callback called when finalized transcript text is available */
  onTranscriptComplete?: (text: string) => void
}

// --------------- Utility (outer scope) ---------------

/** ArrayBuffer → Base64 encode */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 8192
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length))
    binary += String.fromCodePoint(...chunk)
  }
  return btoa(binary)
}

export function useRealtimeSpeech(options: RealtimeSpeechOptions = {}) {
  const config = useConfig()

  // --------------- Reactive State ---------------
  const isListening = ref(false)
  const isSpeaking = ref(false)
  const transcript = ref('')
  const error = ref<string | null>(null)

  // --------------- Internal State ---------------
  let ws: WebSocket | null = null
  let audioContext: AudioContext | null = null
  let mediaStream: MediaStream | null = null
  let sourceNode: MediaStreamAudioSourceNode | null = null
  let gainNode: GainNode | null = null
  let workletNode: AudioWorkletNode | null = null
  let sessionReady = false
  let audioChunksSent = 0
  let nativeSampleRate = 48000

  function getWsUrl(): string {
    const model = config.lemonadeWhisperModel
    return `${config.lemonadeWsUrl}/realtime?model=${model}`
  }

  // --------------- Audio → WebSocket ---------------

  /** Downsample Float32 PCM data → Int16 → Base64 encode and send via WebSocket */
  function sendAudioData(float32Buffer: Float32Array) {
    if (ws?.readyState !== WebSocket.OPEN || !sessionReady) return

    // Downsample from native rate to 16kHz
    const targetRate = 16000
    const ratio = nativeSampleRate / targetRate
    const outputLength = Math.floor(float32Buffer.length / ratio)
    const int16 = new Int16Array(outputLength)

    for (let i = 0; i < outputLength; i++) {
      const srcIdx = i * ratio
      const srcIdxFloor = Math.floor(srcIdx)
      const srcIdxCeil = Math.min(srcIdxFloor + 1, float32Buffer.length - 1)
      const frac = srcIdx - srcIdxFloor
      const sample = float32Buffer[srcIdxFloor]! * (1 - frac) + float32Buffer[srcIdxCeil]! * frac
      const s = Math.max(-1, Math.min(1, sample))
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
    }

    const base64 = arrayBufferToBase64(int16.buffer)

    ws.send(JSON.stringify({
      type: 'input_audio_buffer.append',
      audio: base64,
    }))

    audioChunksSent++
    if (audioChunksSent % 50 === 0) {
      console.debug(LOG_PREFIX, `📊 Audio chunks sent: ${audioChunksSent}`)
    }
  }

  // --------------- WebSocket ---------------

  /** Send session.update event */
  function sendSessionUpdate() {
    if (ws?.readyState !== WebSocket.OPEN) return

    const model = config.lemonadeWhisperModel
    const sessionUpdate = {
      type: 'session.update',
      session: {
        model,
        turn_detection: {
          threshold: 0.01,
          prefix_padding_ms: 250,
          silence_duration_ms: 800,
        },
      },
    }

    console.log(LOG_PREFIX, '📤 Sending session.update:', JSON.stringify(sessionUpdate, null, 2))
    ws.send(JSON.stringify(sessionUpdate))
  }

  /** Handle received WebSocket messages */
  function handleWsMessage(msgEvent: MessageEvent) {
    try {
      const data = JSON.parse(msgEvent.data as string)
      console.log(LOG_PREFIX, `📩 Received: ${data.type}`, data)

      switch (data.type) {
        case 'session.created':
          console.log(LOG_PREFIX, '✅ Session created')
          sessionReady = true
          isListening.value = true
          break

        case 'session.updated':
          console.log(LOG_PREFIX, '✅ Session updated')
          break

        case 'input_audio_buffer.speech_started':
          console.log(LOG_PREFIX, '🎙️ Speech started (VAD)')
          isSpeaking.value = true
          break

        case 'input_audio_buffer.speech_stopped':
          console.log(LOG_PREFIX, '🔇 Speech stopped (VAD)')
          isSpeaking.value = false
          break

        case 'input_audio_buffer.committed':
          console.log(LOG_PREFIX, '📝 Audio buffer committed')
          break

        case 'conversation.item.created':
          console.log(LOG_PREFIX, '📝 Conversation item created')
          break

        case 'conversation.item.input_audio_transcription.delta': {
          const delta = data.delta ?? ''
          console.log(LOG_PREFIX, `📝 Transcription delta: "${delta}"`)
          break
        }

        case 'conversation.item.input_audio_transcription.completed': {
          const text = (data.transcript ?? '').trim()
          console.log(LOG_PREFIX, `✅ Transcription completed: "${text}"`)
          if (text) {
            transcript.value = text
            options.onTranscriptComplete?.(text)
          }
          break
        }

        case 'error':
          console.error(LOG_PREFIX, '❌ Server error:', data.error)
          error.value = data.error?.message || JSON.stringify(data.error) || 'WebSocket server error'
          break

        default:
          console.log(LOG_PREFIX, `ℹ️ Unhandled event: ${data.type}`, data)
      }
    } catch (e) {
      console.error(LOG_PREFIX, '❌ Failed to parse WebSocket message:', e)
      console.error(LOG_PREFIX, '   Raw data:', msgEvent.data)
    }
  }

  /** Establish WebSocket connection */
  function setupWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = getWsUrl()
      console.log(LOG_PREFIX, `🔌 Connecting WebSocket to: ${url}`)

      try {
        ws = new WebSocket(url)
      } catch (e) {
        console.error(LOG_PREFIX, '❌ Failed to create WebSocket:', e)
        reject(e)
        return
      }

      ws.onopen = () => {
        console.log(LOG_PREFIX, '✅ WebSocket connected')
        sendSessionUpdate()
        resolve()
      }

      ws.onmessage = handleWsMessage

      ws.onerror = (event) => {
        console.error(LOG_PREFIX, '❌ WebSocket error:', event)
        error.value = 'WebSocket connection error. Please check that the server is running.'
        reject(new Error('WebSocket connection error'))
      }

      ws.onclose = (event) => {
        console.log(LOG_PREFIX, `🔌 WebSocket closed: code=${event.code}, wasClean=${event.wasClean}`)
        sessionReady = false
        isListening.value = false
        isSpeaking.value = false
      }
    })
  }

  // --------------- Audio Capture ---------------

  /** Acquire microphone input and build AudioWorklet pipeline */
  async function setupAudio() {
    console.log(LOG_PREFIX, '🎤 Requesting microphone access...')

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })
    } catch (e: any) {
      console.error(LOG_PREFIX, '❌ Microphone access failed:', e.name, e.message)
      if (e.name === 'NotAllowedError') {
        error.value = 'Microphone access denied. Please check your browser settings.'
      } else if (e.name === 'NotFoundError') {
        error.value = 'Microphone device not found.'
      } else {
        error.value = `Microphone access error: ${e.message}`
      }
      throw e
    }

    console.log(LOG_PREFIX, '✅ Microphone access granted')
    const track = mediaStream.getAudioTracks()[0]
    if (track) {
      console.log(LOG_PREFIX, '🎤 Audio track settings:', JSON.stringify(track.getSettings()))
    }

    // Create AudioContext (use native rate; downsample when sending)
    audioContext = new AudioContext()
    nativeSampleRate = audioContext.sampleRate
    console.log(LOG_PREFIX, `🔊 AudioContext: sampleRate=${nativeSampleRate}, state=${audioContext.state}`)

    if (audioContext.state === 'suspended') {
      await audioContext.resume()
      console.log(LOG_PREFIX, '🔊 AudioContext resumed')
    }

    // Pipeline: Mic → Source → Gain(amplify) → AudioWorklet → Silent output
    sourceNode = audioContext.createMediaStreamSource(mediaStream)

    // GainNode to amplify microphone input
    gainNode = audioContext.createGain()
    gainNode.gain.value = MIC_GAIN
    console.log(LOG_PREFIX, `🔊 Mic gain set to ${MIC_GAIN}x`)

    // Load AudioWorklet
    await audioContext.audioWorklet.addModule('/audio-worklet-processor.js')
    console.log(LOG_PREFIX, '✅ AudioWorklet module loaded')

    workletNode = new AudioWorkletNode(audioContext, 'pcm-processor')
    workletNode.port.onmessage = (event: MessageEvent) => {
      sendAudioData(new Float32Array(event.data))
    }

    // Silent GainNode (keeps pipeline active but produces no sound)
    const silentNode = audioContext.createGain()
    silentNode.gain.value = 0

    sourceNode.connect(gainNode)
    gainNode.connect(workletNode)
    workletNode.connect(silentNode)
    silentNode.connect(audioContext.destination)

    console.log(LOG_PREFIX, '✅ Audio pipeline established')
  }

  // --------------- Public API ---------------

  async function start() {
    if (isListening.value) {
      console.warn(LOG_PREFIX, '⚠️ Already listening')
      return
    }

    console.log(LOG_PREFIX, '🚀 ===== Starting realtime speech =====')
    console.log(LOG_PREFIX, `   WS URL: ${getWsUrl()}`)

    error.value = null
    transcript.value = ''
    audioChunksSent = 0

    try {
      await Promise.all([setupWebSocket(), setupAudio()])
      console.log(LOG_PREFIX, '✅ ===== Realtime speech started =====')
    } catch (e: any) {
      console.error(LOG_PREFIX, '❌ ===== Failed to start =====', e)
      error.value = error.value ?? 'Failed to start realtime speech recognition'
      cleanup()
    }
  }

  function cleanup() {
    console.log(LOG_PREFIX, '🧹 Cleaning up...')

    if (workletNode) {
      workletNode.port.postMessage('stop')
      workletNode.port.onmessage = null
      workletNode.disconnect()
      workletNode = null
    }

    if (gainNode) {
      gainNode.disconnect()
      gainNode = null
    }

    if (sourceNode) {
      sourceNode.disconnect()
      sourceNode = null
    }

    if (audioContext) {
      audioContext.close().catch((e) => console.warn(LOG_PREFIX, 'AudioContext close error:', e))
      audioContext = null
    }

    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop())
      mediaStream = null
    }

    if (ws) {
      const socket = ws
      ws = null
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close(1000, 'User stopped')
      }
    }

    sessionReady = false
    isListening.value = false
    isSpeaking.value = false
    console.log(LOG_PREFIX, `✅ Cleanup complete (audio chunks sent: ${audioChunksSent})`)
  }

  function stop() {
    console.log(LOG_PREFIX, '⏹ ===== Stopping realtime speech =====')
    cleanup()
  }

  if (import.meta.client) {
    onUnmounted(() => {
      if (isListening.value || ws || audioContext) {
        console.log(LOG_PREFIX, '🔄 Auto cleanup on unmount')
        cleanup()
      }
    })
  }

  return {
    isListening: readonly(isListening),
    isSpeaking: readonly(isSpeaking),
    transcript: readonly(transcript),
    error: readonly(error),
    start,
    stop,
  }
}
