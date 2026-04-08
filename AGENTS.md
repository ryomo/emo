# AGENTS.md

## Maintaining This File

When making changes to the source code that affect architecture, directory structure, development commands, coding conventions, or any other content described in this file, **update this AGENTS.md accordingly** to keep it in sync with the codebase.

## Project Overview

**Emo** is a desktop AI chatbot application with real-time speech recognition, emotion expression, and TTS (text-to-speech) capabilities.
The frontend is built with **Nuxt 4** (`src/`) and the desktop wrapper is **Tauri 2** (`src-tauri/`).
An external **Lemonade Server** handles LLM, Whisper, and TTS model inference.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Nuxt 4, Vue 3 (Composition API), TypeScript |
| UI / Styling | Tailwind CSS |
| 3D Display | Three.js (Emotion 3D mode) |
| Desktop | Tauri 2 (Rust) |
| Persistence | Tauri Store plugin (`emo.config.json`) |
| Package Manager | **pnpm** (primary) |
| Linter | ESLint (`@nuxt/eslint` + stylistic) |
| CI/CD | GitHub Actions (release workflow) |
| On-device AI | transformers.js (WebGPU, ONNX) |
| Backend (external) | Lemonade Server (OpenAI-compatible API) |

## Directory Structure

```
├── src/                    # Nuxt application (srcDir: 'src')
│   ├── pages/              # Pages (index.vue, settings.vue)
│   ├── components/         # Vue components
│   │   ├── chat/           #   Chat UI (ChatHistory, ChatInput)
│   │   ├── emotion/        #   Emotion display (EmotionDisplay2D, EmotionDisplay3D)
│   │   └── voice/          #   Voice UI (VoiceButton, TranscriptArea)
│   ├── composables/        # Business logic (use*.ts)
│   │   ├── useConfig.ts    #   App config read/write (Tauri Store / runtimeConfig)
│   │   ├── useAiEmotion.ts #   Emotion detection from AI responses
│   │   ├── lemonade/       #   Lemonade Server specific composables
│   │   │   ├── useLemonadeChat.ts     #   Chat Completions API calls
│   │   │   ├── useLemonadeListen.ts   #   WebSocket real-time speech recognition (listen)
│   │   │   ├── useLemonadeSpeak.ts    #   TTS API calls and playback (speak)
│   │   │   └── useLemonadeModels.ts   #   Fetch model list from server
│   │   └── webgpu/        #   WebGPU (transformers.js) on-device composables
│   │       ├── useWebGpuModel.ts      #   Shared model loader (Gemma-4-E2B-it-ONNX) + GPU lock
│   │       ├── useWebGpuChat.ts       #   Chat via local WebGPU model (text-only)
│   │       └── useWebGpuListen.ts     #   Speech recognition via Whisper large-v3 (WebGPU)
│   ├── types/              # TypeScript type definitions (chat.ts, emotion.ts)
│   ├── plugins/            # Nuxt plugins (config.client.ts)
│   ├── assets/css/         # Global CSS
│   └── public/             # Static files (audio-worklet-processor.js, etc.)
├── src-tauri/              # Tauri (Rust) desktop app
│   ├── src/                #   Rust source code (lib.rs, main.rs)
│   ├── capabilities/       #   Tauri permission settings
│   ├── tauri.conf.json     #   Tauri config (window, bundle, etc.)
│   └── Cargo.toml          #   Rust dependencies
├── .github/workflows/      # GitHub Actions (release.yml)
├── nuxt.config.ts          # Nuxt config
├── eslint.config.mjs       # ESLint config
├── package.json            # Node.js dependencies and scripts
└── pnpm-workspace.yaml     # pnpm workspace config
```

## Environment Requirements

- **Node.js**: LTS version recommended
- **Rust**: stable toolchain (rustup)
- **Tauri prerequisites**: see https://tauri.app/start/prerequisites/ (platform-specific system libraries)
- **pnpm**: recommended, but npm also works

## Development Commands

```sh
# Install dependencies
pnpm install

# Start dev server in browser (settings are not persisted)
pnpm dev

# Start as Tauri desktop app in development mode
pnpm tauri dev

# Production build (Tauri)
pnpm tauri build

# Lint
pnpm lint
pnpm lint:fix
```

> **Note:** `tauri.conf.json` uses `npm run dev` (not `pnpm run dev`) in `beforeDevCommand` intentionally. This is because this project is designed to be usable even for those who don't have `pnpm` installed globally.

## Testing

There are currently no automated tests in this project.

## Architecture Notes

### SSR Disabled
`ssr: false` is set in `nuxt.config.ts`. The app runs as an SPA acting as the Tauri frontend.

### Configuration Management (useConfig)
- **Tauri environment**: Settings are persisted to `emo.config.json` via `@tauri-apps/plugin-store`. The config file location varies by OS (Windows: `%APPDATA%/com.github.ryomo.emo/`).
- **Browser environment**: Uses default values from Nuxt's `runtimeConfig.public`, overridable via `NUXT_PUBLIC_*` environment variables.
- The `config.client.ts` plugin loads configuration before the app mounts.
- If the config file fails to load, it is automatically reset to defaults and `useConfigLoadError()` returns a non-empty message.

### Global Notifications (app.vue)
- `app.vue` subscribes to `useAppError()` and shows a dismissible banner at the top of the screen when an error is set.
- Any composable or page can call `setAppError(message)` from `useAppError.ts` to surface an error to the user.

### Communication with Lemonade Server
- **Chat API**: `POST /api/v1/chat/completions` (OpenAI-compatible)
- **TTS API**: `POST /api/v1/audio/speech`
- **Speech recognition**: WebSocket `/realtime` (OpenAI Realtime API-compatible)
- **Model list**: `GET /api/v1/models`

### Emotion Display
- Emotions are detected from emojis (😐😊😢😠😲🤔) at the beginning of AI response text.
- The system prompt instructs the AI to prefix every response with one of these emotion emojis.
- Two display modes: 2D (default) and 3D (Three.js).

### Speech Recognition (useLemonadeListen)
- Microphone input is captured as PCM data via an AudioWorklet (`audio-worklet-processor.js`).
- PCM is downsampled to 16kHz, Base64-encoded, and sent over WebSocket.
- VAD (Voice Activity Detection) is handled server-side.
- On transcription completion, the text is automatically sent to the Chat API.

### On-device Inference via WebGPU (composables/webgpu/)
- Uses `@huggingface/transformers` with `onnx-community/gemma-4-E2B-it-ONNX` (q4f16, WebGPU) for chat and `onnx-community/whisper-large-v3-turbo` (encoder fp16 + decoder q4, WebGPU) for speech recognition.
- **useWebGpuModel**: Singleton model loader. Loads `AutoProcessor` and `Gemma4ForConditionalGeneration` once and shares them across consumers. Also provides a GPU exclusion lock (`withGpuLock`) so that listen and chat inference do not run concurrently on the same WebGPU device.
- **useWebGpuChat**: Text-only chat composable with the same interface as `useLemonadeChat`. Runs inference locally via `model.generate()` within `withGpuLock`. KV cache (`past_key_values`) is enabled when `enableThinking` is `false`; when thinking mode is on, the cache is disabled because thinking tokens are stripped before storage, causing token mismatch on the next turn.
- **useWebGpuListen**: Speech recognition composable with the same reactive interface as `useLemonadeListen` (Lemonade). Captures microphone audio via AudioWorklet, runs client-side energy-based VAD, and transcribes finalized speech segments using Whisper large-v3 on WebGPU within `withGpuLock`. On transcription completion, text is sent to the Chat API. During voice recognition, text input is disabled.
- TTS is not yet supported in WebGPU mode (planned for a future model).
- Backend selection (`lemonade` | `webgpu`) is persisted in `AppConfig.backendMode` and switchable from the Settings page.

## Coding Conventions

### General
- **Language**: Use TypeScript.
- **Frontend**: Use Vue 3 Composition API with `<script setup>` syntax.
- **Styling**: Use Tailwind CSS utility classes. Keep custom CSS minimal.
- **Linter**: Follow ESLint (`@nuxt/eslint` stylistic mode). Run `pnpm lint` before committing.

### Composable Pattern
- Place composables under `composables/` with `use*.ts` naming.
- Manage reactive state with `ref` / `reactive`; wrap return values in `readonly()`.
- Expose error state as an `error` ref.

### Type Definitions
- Place shared types in the `types/` directory.
- Leverage Nuxt auto-imports (`ref`, `computed`, `watch`, `useRuntimeConfig`, `useRouter`, etc. do not need explicit imports).
- `srcDir` is set to `src/`, so the `~/` alias resolves to `src/`, not the project root.

### Tauri (Rust)
- App setup logic lives in `src-tauri/src/lib.rs`. Currently no custom commands — only plugin registrations (store, log).
- Window settings (decorations off, transparent, always on top) and bundle config are managed in `tauri.conf.json`.

## Release Process

Uses the GitHub Actions `release` workflow:
1. Go to Actions → release → Run workflow, enter the version number, and run it.
2. `tauri.conf.json` and `Cargo.toml` versions are auto-updated and a tag is created.
3. Builds are created for each platform (Windows, macOS Arm, Linux x64/arm) and a draft release is published.
4. Review the draft on the GitHub releases page and publish it.
