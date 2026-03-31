/**
 * Composable for application configuration.
 *
 * - Tauri  → reads/writes values via the Tauri Store plugin
 *            (`emo.config.json` in `%APPDATA%/com.github.ryomo.emo/`)
 * - Browser → uses defaults from nuxt.config.ts runtimeConfig
 *             (overridable via NUXT_PUBLIC_* environment variables)
 */

import { isTauri } from '@tauri-apps/api/core'

export interface AppConfig {
  lemonadeBaseUrl: string
  lemonadeModel: string
  lemonadeWhisperModel: string
  lemonadeTtsModel: string
  systemPrompt: string
  enableThinking: boolean
  transparentBackground: boolean
  emotionDisplay3d: boolean
}

const CONFIG_FILE = 'emo.config.json'

const _config = reactive<AppConfig>({
  lemonadeBaseUrl: '',
  lemonadeModel: '',
  lemonadeWhisperModel: '',
  lemonadeTtsModel: '',
  systemPrompt: '',
  enableThinking: false,
  transparentBackground: false,
  emotionDisplay3d: false,
})
let _initialized = false

/** Load config from Tauri Store, creating the store file with defaults if it doesn't exist. */
async function loadFromTauriStore(defaults: AppConfig): Promise<void> {
  const { load } = await import('@tauri-apps/plugin-store')
  const store = await load(CONFIG_FILE)

  // If the store is empty (file doesn't exist yet), populate with defaults and save
  const firstKey = Object.keys(defaults)[0] as keyof AppConfig
  if ((await store.get<string>(firstKey)) == null) {
    for (const key of Object.keys(defaults) as (keyof AppConfig)[]) {
      await store.set(key, defaults[key])
    }
    await store.save()
  }

  for (const key of Object.keys(defaults) as (keyof AppConfig)[]) {
    const value = await store.get<string | boolean>(key)
    if (value != null) (_config as any)[key] = value
  }
}

/** Load configuration values (called once by the config plugin). */
export async function loadConfig(): Promise<void> {
  if (_initialized) return

  const runtimeConfig = useRuntimeConfig()
  const defaults: AppConfig = {
    lemonadeBaseUrl: runtimeConfig.public.lemonadeBaseUrlDefault,
    lemonadeModel: runtimeConfig.public.lemonadeModelDefault,
    lemonadeWhisperModel: runtimeConfig.public.lemonadeWhisperModelDefault,
    lemonadeTtsModel: runtimeConfig.public.lemonadeTtsModelDefault,
    systemPrompt: runtimeConfig.public.systemPromptDefault,
    enableThinking: runtimeConfig.public.enableThinkingDefault,
    transparentBackground: runtimeConfig.public.transparentBackgroundDefault,
    emotionDisplay3d: runtimeConfig.public.emotionDisplay3dDefault,
  }
  Object.assign(_config, defaults)

  if (isTauri()) {
    try {
      await loadFromTauriStore(defaults)
    }
    catch (e) {
      console.warn('[Config] Failed to load Tauri store:', e)
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

/** Return the reactive (read-only) application config. */
export function useConfig(): Readonly<AppConfig> {
  return readonly(_config) as Readonly<AppConfig>
}
