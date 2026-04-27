import { SerialPort } from 'tauri-plugin-serialplugin-api'

/**
 * If set to an empty string, the first available port will be automatically detected.
 * Example: '', 'COM3', '/dev/ttyUSB0'
 */
const SERIAL_PORT = ''

const BAUD_RATE = 115200

const _isLedOn = ref(false)
const _isSerialSending = ref(false)
const _isSerialConnected = ref(false)

const _servoAngles = reactive({ A: 90, B: 90, C: 90 })

let _serialPort: SerialPort | null = null

async function resolvePortPath(): Promise<string> {
  if (SERIAL_PORT !== '') {
    return SERIAL_PORT
  }
  const ports = await SerialPort.available_ports()
  const keys = Object.keys(ports)
  if (keys.length === 0) {
    throw new Error('Serial port not found')
  }
  return keys[0]!
}

async function connect(): Promise<void> {
  if (_serialPort) return
  const path = await resolvePortPath()
  _serialPort = new SerialPort({ path, baudRate: BAUD_RATE })
  await _serialPort.open()
  _isSerialConnected.value = true
}

async function disconnect(): Promise<void> {
  if (!_serialPort) return
  try {
    await _serialPort.close()
  }
  catch { /* ignore close errors */ }
  _serialPort = null
  _isSerialConnected.value = false
}

export function useSerial() {
  async function toggleLed() {
    const next = !_isLedOn.value
    await _sendCommand(next ? 'LED ON' : 'LED OFF')
    // Update the state
    _isLedOn.value = next
  }

  async function setServo(servo: 'A' | 'B' | 'C', angle: number) {
    const clamped = Math.round(Math.max(0, Math.min(180, angle)))
    await _sendCommand(`SRV ${servo} ${clamped}`)
    _servoAngles[servo] = clamped
  }

  return {
    isLedOn: readonly(_isLedOn),
    isSerialSending: readonly(_isSerialSending),
    isSerialConnected: readonly(_isSerialConnected),
    servoAngles: readonly(_servoAngles),
    toggleLed: toggleLed,
    setServo: setServo,
    connect,
    disconnect,
  }

  async function _sendCommand(command: string) {
    if (_isSerialSending.value) return
    _isSerialSending.value = true
    setAppError('')

    try {
      if (!_serialPort) {
        await connect()
      }
      console.log('Starting serial send:', command)
      await _serialPort!.write(command + '\n')
      console.log('Serial send complete')
    }
    catch (e) {
      // Connection may be broken — reset so next call reconnects
      _serialPort = null
      _isSerialConnected.value = false
      const message = e instanceof Error ? e.message : String(e)
      setAppError(`Serial send error: ${message}`)
    }
    finally {
      _isSerialSending.value = false
    }
  }
}
