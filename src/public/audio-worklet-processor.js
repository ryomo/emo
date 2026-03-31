/**
 * AudioWorklet Processor: Buffers PCM float32 data from microphone input
 * and sends it to the main thread.
 *
 * process() is called every 128 frames, so we buffer FLUSH_SIZE samples
 * before sending them in bulk to reduce the number of WebSocket messages.
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

    // Receive stop message from main thread
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

    // Copy and accumulate Float32 data
    this._chunks.push(new Float32Array(channelData))
    this._samplesCollected += channelData.length

    if (this._samplesCollected >= this._flushSize) {
      // Merge chunks
      const merged = new Float32Array(this._samplesCollected)
      let offset = 0
      for (const chunk of this._chunks) {
        merged.set(chunk, offset)
        offset += chunk.length
      }

      // Transfer to main thread (transferable)
      this.port.postMessage(merged.buffer, [merged.buffer])

      this._chunks = []
      this._samplesCollected = 0
    }

    return true
  }
}

registerProcessor('pcm-processor', PCMProcessor)
