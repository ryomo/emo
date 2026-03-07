# Emo: Emotional Emoji AI Buddy :smile:

## Overview

![screenshot](./screenshot.png)

Emo is an expressive AI chatbot built with Nuxt on the frontend and [Lemonade Server](https://lemonade-server.ai/) on the backend. It transcribes your speech in real time and dynamically changes its facial expression based on the AI's response.

**Features:**

- Runs entirely on your local machine via Lemonade Server — no data sent to the cloud
- Real-time speech recognition and transcription
- Dynamic emotion display driven by AI responses
- Thanks to Lemonade Server, you can use a GPU (NVIDIA/AMD) or a Ryzen AI NPU (AI 300 series and later) for better performance

**Limitations:**

Due to the models currently supported by Lemonade Server, the following constraints apply:

- **English only** — The TTS model (`kokoro-v1`) is trained on English.
- **Speech recognition latency** — Whisper currently runs on CPU only, so it can be hard to achieve both low latency and high accuracy at the same time

<br>

## Quick Start

### Install Emo

**Windows users:**

Install Emo by downloading the latest release from the [Releases](https://github.com/ryomo/emo/releases) page.

SmartScreen on Windows may block the installer since it's not signed. If that happens, click "More info" and then "Run anyway". Or it may be better to build the executable yourself by following the instructions in the [Development](#development) section below :smirk:

**Linux and macOS users:**

Only Windows version available for now. If you want to run it on Linux or macOS, you can build it by following the instructions in the [Development](#development) section.

### Start Lemonade Server

Launch Lemonade Server and load the following models:

| Role               | Model                          |
|--------------------|--------------------------------|
| LLM                | `Gemma-3-4b-it-GGUF` (or any model suited to your environment) |
| Speech Recognition | `Whisper-Base`                 |
| TTS                | `kokoro-v1`                    |

NOTE: If you change the model names, make sure to update "Settings" in Emo accordingly.

<br>

## Uninstall

You can uninstall Emo according to the standard procedure for your OS.

However, Emo's configuration file is stored separately and won't be removed automatically. You can delete it manually if you want to remove all settings:

- Windows: `C:\Users\<User>\AppData\Roaming\com.github.ryomo.emo`
- Linux: `/home/<user>/.config/com.github.ryomo.emo`
- macOS: `/Users/<user>/Library/Application Support/com.github.ryomo.emo`

<br>

## Troubleshooting

**WSL networking issue:** If you run Lemonade Server on Windows and Emo inside WSL, Emo may not be able to reach the server. To fix this, open **WSL Settings** and set **Networking Mode** to `Mirrored`.

<br>

## Development

### Setup

```sh
npm install
```

### Run the App in your Browser

```sh
npm run dev
```

Open <http://localhost:3000/> in your browser.

NOTE: In this mode, app settings do not persist. Settings changes won't be saved to disk.

### Build Executable with Tauri

Below are the instructions for building a Windows executable.

First, make sure you have the [Tauri prerequisites](https://tauri.app/start/prerequisites/#windows) installed, then run:

```powershell
npm run tauri dev
```

This will launch the app in development mode with Tauri.

If everything works fine, you can proceed to build the production executable:

```powershell
npm run tauri build
```

The built executable will be located in `src-tauri/target/release/`.

- `app.exe` is the portable version that doesn't require installation. You can run it directly. But you may need to install the required Visual C++ Redistributable if you don't have it already.
- `bundle/msi/*.msi` or `bundle/nsis/*.exe` are installer packages. Running one will install the app.

<br>

## What's Next?

- Make Emo recognize its own name and the pronunciation.
