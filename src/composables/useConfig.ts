/**
 * Composable for application configuration.
 *
 * - Tauri  → reads/writes values via the Tauri Store plugin
 *            (`emo.config.json` in `%APPDATA%/com.github.ryomo.emo/`)
 * - Browser → uses defaults from nuxt.config.ts runtimeConfig
 *             (overridable via NUXT_PUBLIC_* environment variables)
 */

import { isTauri } from '@tauri-apps/api/core'
import type { Store } from '@tauri-apps/plugin-store'
import { detectBrowserSpeechLanguage } from '~/composables/useSpeechLanguage'

export interface AppConfig {
  speechVoiceByLanguage: Record<string, string>
  systemPrompt: string
  transparentBackground: boolean
  emotionDisplay3d: boolean
  speechLanguage: string
  debugSerialEnabled: boolean
  cameraEnabled: boolean
}

const CONFIG_FILE = 'emo.config.json'

const _config = reactive<AppConfig>({
  speechVoiceByLanguage: {},
  systemPrompt: '',
  transparentBackground: false,
  emotionDisplay3d: true,
  speechLanguage: 'english',
  debugSerialEnabled: false,
  cameraEnabled: false,
})
let _initialized = false
let _defaults: AppConfig | null = null

function assignConfigValue<K extends keyof AppConfig>(key: K, value: AppConfig[K]) {
  _config[key] = value
}

/** Write all default values to an open Tauri store and persist to disk. */
async function writeDefaultsToStore(defaults: AppConfig, store: Store): Promise<void> {
  for (const key of Object.keys(defaults) as (keyof AppConfig)[]) {
    await store.set(key, defaults[key])
  }
  await store.save()
}

/** Load config from Tauri Store, creating the store file with defaults if it doesn't exist. */
async function loadFromTauriStore(defaults: AppConfig): Promise<void> {
  const { load } = await import('@tauri-apps/plugin-store')
  const store = await load(CONFIG_FILE)

  // If the store is empty (file doesn't exist yet), populate with defaults and save
  const firstKey = Object.keys(defaults)[0] as keyof AppConfig
  if ((await store.get<string>(firstKey)) == null) {
    await writeDefaultsToStore(defaults, store)
  }

  for (const key of Object.keys(defaults) as (keyof AppConfig)[]) {
    const value = await store.get<AppConfig[typeof key]>(key)
    if (value != null) {
      assignConfigValue(key, value)
    }
  }

  // Remove keys that are no longer part of AppConfig
  const knownKeys = new Set(Object.keys(defaults))
  const storeKeys = await store.keys()
  const obsoleteKeys = storeKeys.filter(k => !knownKeys.has(k))
  if (obsoleteKeys.length > 0) {
    for (const key of obsoleteKeys) {
      await store.delete(key)
    }
    await store.save()
  }
}

/** Load configuration values (called once by the config plugin). */
export async function loadConfig(): Promise<void> {
  if (_initialized) return

  const runtimeConfig = useRuntimeConfig()
  const defaults: AppConfig = {
    speechVoiceByLanguage: {},
    systemPrompt: runtimeConfig.public.systemPromptDefault,
    transparentBackground: runtimeConfig.public.transparentBackgroundDefault,
    emotionDisplay3d: runtimeConfig.public.emotionDisplay3dDefault,
    speechLanguage: runtimeConfig.public.speechLanguageDefault || detectBrowserSpeechLanguage(),
    debugSerialEnabled: runtimeConfig.public.debugSerialEnabledDefault,
    cameraEnabled: runtimeConfig.public.cameraEnabledDefault,
  }
  _defaults = defaults
  Object.assign(_config, defaults)

  if (isTauri()) {
    try {
      await loadFromTauriStore(defaults)
    }
    catch (e) {
      console.warn('[Config] Failed to load Tauri store, resetting to defaults:', e)
      setAppError('Config file could not be loaded and has been reset to defaults.')
      try {
        const { load } = await import('@tauri-apps/plugin-store')
        const store = await load(CONFIG_FILE)
        await writeDefaultsToStore(defaults, store)
      }
      catch (resetError) {
        console.warn('[Config] Failed to reset Tauri store:', resetError)
      }
    }
  }

  _initialized = true
}

/** Update config values and persist to Tauri Store if running in Tauri. */
export async function updateConfig(newValues: Partial<AppConfig>): Promise<void> {
  Object.assign(_config, newValues)

  if (isTauri()) {
    try {
      const { load } = await import('@tauri-apps/plugin-store')
      const store = await load(CONFIG_FILE)
      for (const key of Object.keys(newValues) as (keyof AppConfig)[]) {
        await store.set(key, newValues[key])
      }
      await store.save()
    }
    catch (e) {
      console.warn('[Config] Failed to save Tauri store:', e)
    }
  }
}

/** Reset config to defaults and persist to Tauri Store if running in Tauri. */
export async function resetConfig(): Promise<void> {
  if (!_defaults) return
  Object.assign(_config, _defaults)

  if (isTauri()) {
    try {
      const { load } = await import('@tauri-apps/plugin-store')
      const store = await load(CONFIG_FILE)
      await writeDefaultsToStore(_defaults, store)
    }
    catch (e) {
      console.warn('[Config] Failed to reset Tauri store:', e)
    }
  }
}

/** Return the reactive (read-only) application config. */
export function useConfig(): Readonly<AppConfig> {
  return readonly(_config) as Readonly<AppConfig>
}
