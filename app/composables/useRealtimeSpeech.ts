/**
 * WebSocket リアルタイム音声認識コンポーザブル (Task 04)
 *
 * Lemonade Server の /realtime エンドポイント (OpenAI Realtime API 互換) を使い、
 * マイク入力をリアルタイムでテキスト化する。
 *
 * 音声フォーマット: PCM 16kHz mono 16bit → Base64 エンコードして送信
 */

const LOG_PREFIX = '[RealtimeSpeech]'

/** マイク入力の増幅倍率 (1 = そのまま、2 = 2倍に増幅) */
const MIC_GAIN = 1

interface RealtimeSpeechOptions {
  /** 確定テキストが得られたときのコールバック */
  onTranscriptComplete?: (text: string) => void
}

// --------------- Utility (outer scope) ---------------

/** ArrayBuffer → Base64 エンコード */
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
  const config = useRuntimeConfig()

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
    const model = config.public.lemonadeWhisperModel
    return `${config.public.lemonadeWsUrl}/realtime?model=${model}`
  }

  // --------------- Audio → WebSocket ---------------

  /** Float32 PCM データをダウンサンプリング → Int16 → Base64 変換して WebSocket で送信 */
  function sendAudioData(float32Buffer: Float32Array) {
    if (ws?.readyState !== WebSocket.OPEN || !sessionReady) return

    // ネイティブレートから 16kHz へダウンサンプリング
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

  /** session.update イベントを送信 */
  function sendSessionUpdate() {
    if (ws?.readyState !== WebSocket.OPEN) return

    const model = config.public.lemonadeWhisperModel
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

  /** 受信した WebSocket メッセージを処理 */
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
          error.value = data.error?.message || JSON.stringify(data.error) || 'WebSocket サーバーエラー'
          break

        default:
          console.log(LOG_PREFIX, `ℹ️ Unhandled event: ${data.type}`, data)
      }
    } catch (e) {
      console.error(LOG_PREFIX, '❌ Failed to parse WebSocket message:', e)
      console.error(LOG_PREFIX, '   Raw data:', msgEvent.data)
    }
  }

  /** WebSocket 接続を確立 */
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
        error.value = 'WebSocket 接続エラーが発生しました。サーバーが起動しているか確認してください。'
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

  /** マイク入力を取得し AudioWorklet パイプラインを構築 */
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
        error.value = 'マイクへのアクセスが拒否されました。ブラウザの設定を確認してください。'
      } else if (e.name === 'NotFoundError') {
        error.value = 'マイクデバイスが見つかりません。'
      } else {
        error.value = `マイクアクセスエラー: ${e.message}`
      }
      throw e
    }

    console.log(LOG_PREFIX, '✅ Microphone access granted')
    const track = mediaStream.getAudioTracks()[0]
    if (track) {
      console.log(LOG_PREFIX, '🎤 Audio track settings:', JSON.stringify(track.getSettings()))
    }

    // AudioContext 作成 (ネイティブレートを使用し、送信時にダウンサンプリング)
    audioContext = new AudioContext()
    nativeSampleRate = audioContext.sampleRate
    console.log(LOG_PREFIX, `🔊 AudioContext: sampleRate=${nativeSampleRate}, state=${audioContext.state}`)

    if (audioContext.state === 'suspended') {
      await audioContext.resume()
      console.log(LOG_PREFIX, '🔊 AudioContext resumed')
    }

    // パイプライン: Mic → Source → Gain(増幅) → AudioWorklet → 無音出力
    sourceNode = audioContext.createMediaStreamSource(mediaStream)

    // マイク入力を増幅する GainNode
    gainNode = audioContext.createGain()
    gainNode.gain.value = MIC_GAIN
    console.log(LOG_PREFIX, `🔊 Mic gain set to ${MIC_GAIN}x`)

    // AudioWorklet を読み込み
    await audioContext.audioWorklet.addModule('/audio-worklet-processor.js')
    console.log(LOG_PREFIX, '✅ AudioWorklet module loaded')

    workletNode = new AudioWorkletNode(audioContext, 'pcm-processor')
    workletNode.port.onmessage = (event: MessageEvent) => {
      sendAudioData(new Float32Array(event.data))
    }

    // 無音 GainNode (パイプラインをアクティブに保つが音は鳴らさない)
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
      error.value = error.value ?? 'リアルタイム音声認識の開始に失敗しました'
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
