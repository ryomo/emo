<template>
  <div class="shrink-0 px-3 py-2 sm:px-4 border-t border-gray-700">
    <!-- LED Toggle -->
    <div class="flex items-center gap-2 mb-2">
      <span class="text-xs text-gray-400">LED</span>
      <button
        :class="[
          'text-xs border rounded px-2 py-1 transition-colors',
          isLedOn
            ? 'text-green-400 border-green-600 hover:text-green-300'
            : 'text-gray-400 border-gray-600 hover:text-white',
          isSerialSending ? 'opacity-50 cursor-not-allowed' : '',
        ]"
        :disabled="isSerialSending"
        @click="toggleLed"
      >
        {{ isLedOn ? 'ON' : 'OFF' }}
      </button>
    </div>

    <!-- Servo Sliders -->
    <div class="flex flex-col gap-1">
      <div
        v-for="servo in (['A', 'B', 'C'] as const)"
        :key="servo"
        class="flex items-center gap-2"
      >
        <span class="w-4 text-xs font-mono text-gray-400 uppercase">{{ servo }}</span>
        <input
          type="range"
          min="0"
          max="180"
          :value="servoAngles[servo]"
          class="flex-1 accent-blue-500"
          :disabled="isSerialSending"
          @change="setServo(servo, Number(($event.target as HTMLInputElement).value))"
        >
        <span class="w-8 text-right text-xs text-gray-400">{{ servoAngles[servo] }}°</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { isLedOn, isSerialSending, servoAngles, toggleLed, setServo } = useSerial()
</script>
