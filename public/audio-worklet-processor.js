/**
 * AudioWorklet Processor: マイク入力の PCM float32 データをバッファリングして
 * メインスレッドに送信する。
 *
 * 128 フレームごとに process() が呼ばれるため、
 * FLUSH_SIZE サンプル分バッファしてからまとめて送信し、
 * WebSocket メッセージ数を抑える。
 */
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    /** @type {Float32Array[]} */
    this._chunks = []
    /** @type {number} */
    this._samplesCollected = 0
    // 2048 samples ≈ 128ms at 16kHz
    this._flushSize = 2048
    this._active = true

    // メインスレッドから stop メッセージを受け取る
    this.port.onmessage = (event) => {
      if (event.data === 'stop') {
        this._active = false
      }
    }
  }

  process(inputs) {
    if (!this._active) return false

    const input = inputs[0]
    if (!input || input.length === 0) return true

    const channelData = input[0]
    if (!channelData || channelData.length === 0) return true

    // Float32 データをコピーして蓄積
    this._chunks.push(new Float32Array(channelData))
    this._samplesCollected += channelData.length

    if (this._samplesCollected >= this._flushSize) {
      // チャンクを結合
      const merged = new Float32Array(this._samplesCollected)
      let offset = 0
      for (const chunk of this._chunks) {
        merged.set(chunk, offset)
        offset += chunk.length
      }

      // メインスレッドへ転送 (transferable)
      this.port.postMessage(merged.buffer, [merged.buffer])

      this._chunks = []
      this._samplesCollected = 0
    }

    return true
  }
}

registerProcessor('pcm-processor', PCMProcessor)
