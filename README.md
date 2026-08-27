<div align="center">

# Zaylo

**The High-Performance, Private Local AI Server & Desktop Application**

Turn any Mac, Windows, or Linux computer into a private, OpenAI-compatible local AI inference engine with zero cloud dependencies, instant mobile QR chat, and embedded telemetry.

[![Release](https://img.shields.io/github/v/release/loftytechlabs/Zaylo?style=flat-square&color=2563eb)](https://github.com/loftytechlabs/Zaylo/releases)
[![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Windows%20%7C%20Linux-18181b.svg?style=flat-square)](https://github.com/loftytechlabs/Zaylo/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6.svg?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Fastify](https://img.shields.io/badge/Fastify-v5-000000.svg?style=flat-square&logo=fastify&logoColor=white)](https://fastify.dev)
[![Tests Passing](https://img.shields.io/badge/Tests-18%2F18%20Passing-10b981.svg?style=flat-square)](tests)

<br />

### 📥 [Download Zaylo for Your OS](#-download-installers) • [Desktop Features](#-desktop-application-features) • [Mobile QR Chat](#-instant-mobile--lan-chat) • [API & Integrations](#-openai-compatible-api--integrations) • [Benchmarks](#-hardware-benchmarks)

</div>

---

## 📥 Download Installers

Download the official release installer for your platform:

| Operating System | Architecture / Type | Format | Direct Download Link |
| :--- | :--- | :---: | :--- |
| 🍏 **macOS** | **Apple Silicon (M1 / M2 / M3 / M4)** | `.dmg` | [**Download Zaylo for Mac (Apple Silicon)**](https://github.com/loftytechlabs/Zaylo/releases/latest/download/Zaylo-1.0.0-arm64.dmg) |
| 🍏 **macOS** | **Intel Core (x64)** | `.dmg` | [**Download Zaylo for Mac (Intel)**](https://github.com/loftytechlabs/Zaylo/releases/latest/download/Zaylo-1.0.0.dmg) |
| 🪟 **Windows** | **Windows 10 / 11 (64-bit Installer)** | `.exe` | [**Download Zaylo for Windows (Setup)**](https://github.com/loftytechlabs/Zaylo/releases/latest/download/Zaylo.Setup.1.0.0.exe) |
| 🪟 **Windows** | **Windows Portable (No Installation)** | `.exe` | [**Download Zaylo Portable**](https://github.com/loftytechlabs/Zaylo/releases/latest/download/Zaylo.1.0.0.exe) |
| 🐧 **Linux** | **Universal AppImage** | `.AppImage` | [**Download Zaylo AppImage**](https://github.com/loftytechlabs/Zaylo/releases/latest/download/Zaylo-1.0.0.AppImage) |
| 🐧 **Linux** | **Debian / Ubuntu** | `.deb` | [**Download Zaylo .deb**](https://github.com/loftytechlabs/Zaylo/releases/latest/download/Zaylo-1.0.0.deb) |

---

## 🌟 Why Zaylo?

* 🔒 **100% Air-Gapped Privacy**: All prompts, weights, and conversations run strictly on your machine. Zero cloud telemetry.
* ⚡ **Native C++ Inference Engine**: Built on `llama.cpp` with Apple Silicon Metal, NVIDIA CUDA, and multi-core CPU SIMD hardware acceleration.
* 📱 **Zero-Install Mobile Chat**: Scan a built-in QR code on any iPhone or Android on your Wi-Fi network to chat with your local AI instantly.
* 🔌 **Drop-in OpenAI Compatibility**: Seamlessly works with Cursor, LangChain, Open WebUI, and official OpenAI Python & Node.js SDKs at `http://localhost:8080/v1`.
* 💾 **Low-Memory Streaming Mode**: 1-click 8-bit quantized KV cache (`q8_0`) and Flash Attention for efficient inference on laptops.
* 📊 **Embedded SQLite Telemetry**: Non-blocking SQLite WAL database persists models, hardware telemetry, benchmark passes, and paired devices.

---

## 🖥️ Desktop Application Features

Zaylo's desktop interface provides a visual control center for all your local AI workloads:

### 1. 🎛️ Overview Dashboard
* **Server State & Controls**: 1-click server start/stop with live host, port, and LAN status.
* **Active Model Memory Footprint**: Real-time VRAM/RAM allocation tracker.
* **Live Speed Gauge**: Real-time token generation speed (tokens/sec) with animated visual feedback.
* **Hardware Summary**: Instant scan of CPU model, active GPU backend (Metal/CUDA), and available memory.

### 2. 📦 Models Catalog & Downloader
* **Curated Open-Weights Registry**: Download top models (Llama 3.2, Qwen 2.5, Mistral, DeepSeek, SmolLM2) directly from Hugging Face with SHA-256 integrity verification.
* **Custom Model Importer**: Drag and drop or browse any local `.gguf` file to instantly add it to your model library.
* **Quantization Variant Switching**: Easily switch between `Q4_K_M`, `Q8_0`, or full-precision variants based on your hardware.

### 3. 💬 Interactive Playground
* **Multi-Turn Chat Interface**: Full Markdown rendering, syntax-highlighted code blocks, and copy-code buttons.
* **Real-Time Token Streaming**: Watch responses stream token-by-token with sub-millisecond dispatch latency.
* **Interactive Stop Button**: Cancel running generations instantly while preserving partial output and freeing compute resources.
* **Parameter Tuning**: Adjust temperature, Top-P, max generation tokens, and custom System Prompts on the fly.

### 4. 🌐 Server & API Hub
* **LAN Wi-Fi Sharing**: Expose your server to your local network (`0.0.0.0`) with a single toggle.
* **Dynamic Code Generator**: Instant, interactive copy-paste code snippets for cURL, Python (`openai`), and Node.js with auto-populated model names and active API keys.
* **Persistent API Key Manager**: Generate and manage API keys stored securely in SQLite. Click any key to copy the unmasked token (`lcl_...`).

### 5. 📱 Connected Devices & QR Pairing
* **Instant QR Code**: Generates direct pairing links (`http://<YOUR_LAN_IP>:8080/?pair=<TOKEN>`) for seamless mobile camera scanning.
* **Smart Device Identification**: Automatically recognizes and labels connected devices (e.g. *Apple iPhone 16*, *Samsung Galaxy*, *Google Pixel*, *MacBook Client*, *Windows PC*).
* **Live 3-Second Heartbeat Polling**: Visual indicator showing which devices are currently active (`● Online` vs `○ Offline`).

### 6. 🚀 Automated Hardware Benchmark Suite
* **Multi-Stage Performance Evaluation**:
  * **Warmup & TTFT**: Measures initial prompt evaluation latency (Time-To-First-Token).
  * **Prompt Ingestion Throughput**: Calculates prompt processing speed (tok/s) under standard context loads.
  * **Generation Speed**: Measures raw sustained token generation throughput (tok/s).
  * **Memory Bandwidth**: Calculates effective memory transfer speeds during inference.
* **Historic Run Comparison**: SQLite-persisted history table to compare speed across different quantization levels and context sizes.

### 7. 📈 Performance Telemetry & Logs
* **Real-Time Resource Sampler**: Live visual charts for CPU load, RAM usage, GPU load, and VRAM consumption.
* **Unified Event Logs**: Structured, color-coded stream of system events, HTTP requests, inference queries, and error diagnostics.

---

## 📱 Instant Mobile & LAN Chat

Chat with your private local models from your phone, tablet, or another laptop across your home or office Wi-Fi:

```text
┌─────────────────────────┐          Wi-Fi Network          ┌─────────────────────────┐
│     Zaylo Desktop       │ ◄─────────────────────────────► │     Mobile Phone        │
│   (Local AI Server)     │    http://192.168.1.X:8080      │   (Safari / Chrome)     │
│   [Shows Pairing QR]    │                                 │   [Instant Web Chat]    │
└─────────────────────────┘                                 └─────────────────────────┘
```

1. Open Zaylo Desktop and click the **Devices** or **Server & API** tab.
2. Ensure **LAN Network Access** is switched on.
3. Scan the displayed **QR Code** with your phone's camera.
4. The mobile Web Chat UI opens immediately with full streaming support, Markdown rendering, and model selection.

---

## 🔌 OpenAI-Compatible API & Integrations

Zaylo acts as a drop-in local replacement for the OpenAI API at `http://localhost:8080/v1`.

### Python (`openai` SDK)

```python
from openai import OpenAI

# Connect to your local Zaylo server
client = OpenAI(
    base_url="http://localhost:8080/v1",
    api_key="lcl_your_api_key"  # Copy from Zaylo Desktop App
)

# Stream response
response = client.chat.completions.create(
    model="default",
    messages=[
        {"role": "system", "content": "You are a concise engineering assistant."},
        {"role": "user", "content": "Explain how vector quantization works."}
    ],
    temperature=0.7,
    stream=True
)

for chunk in response:
    print(chunk.choices[0].delta.content or "", end="", flush=True)
print()
```

### Node.js / TypeScript (`openai` package)

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'http://localhost:8080/v1',
  apiKey: 'lcl_your_api_key',
});

async function main() {
  const stream = await client.chat.completions.create({
    model: 'default',
    messages: [{ role: 'user', content: 'Write a TypeScript debounce utility.' }],
    stream: true,
  });

  for await (const chunk of stream) {
    process.stdout.write(chunk.choices[0]?.delta?.content || '');
  }
}

main();
```

### Cursor IDE / Continue Plugin Setup

Add Zaylo to your IDE model settings (`~/.continue/config.json` or Cursor custom OpenAI endpoint):

```json
{
  "models": [
    {
      "title": "Zaylo Local AI",
      "provider": "openai",
      "model": "default",
      "apiBase": "http://localhost:8080/v1",
      "apiKey": "lcl_your_api_key"
    }
  ]
}
```

---

## 📊 Hardware Benchmarks

Measured on consumer hardware using Zaylo's integrated benchmark suite:

| Hardware Configuration | Model Tested | Quantization | Prompt Processing | Generation Speed | TTFT Latency | Memory Used |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Apple M4 Pro (Unified Memory)** | Llama 3.2 1B | Q4_K_M | **`245.2 tok/s`** | **`68.4 tok/s`** | **`42 ms`** | 1.1 GB |
| **Apple M2 (Unified Memory)** | Llama 3.2 1B | Q4_K_M | **`110.6 tok/s`** | **`25.3 tok/s`** | **`64 ms`** | 1.1 GB |
| **Apple M2 (Unified Memory)** | Mistral 7B | Q4_K_M | **`58.2 tok/s`** | **`14.1 tok/s`** | **`112 ms`** | 4.8 GB |
| **NVIDIA RTX 4090 (24GB VRAM)** | Qwen 2.5 7B | Q4_K_M | **`420.0 tok/s`** | **`95.2 tok/s`** | **`28 ms`** | 5.2 GB |
| **Intel Core i7-13700K (CPU AVX2)** | SmolLM2 135M | Q4_K_M | **`310.4 tok/s`** | **`82.5 tok/s`** | **`31 ms`** | 350 MB |

---

## 🛠️ Developer Setup & Monorepo Build

To develop or build Zaylo from source:

```bash
# 1. Clone the repository
git clone https://github.com/loftytechlabs/Zaylo.git
cd Zaylo

# 2. Install workspace dependencies
pnpm install

# 3. Build all 15 workspace packages
pnpm build

# 4. Launch Desktop App in Development Mode
pnpm dev:desktop

# 5. Run test suite
pnpm test
```

### Optional CLI Commands

Zaylo also includes an optional CLI for headless server environments:

```bash
pnpm cli start --port 8080 --lan    # Start headless server
pnpm cli models list                # List installed models
pnpm cli benchmark                  # Run hardware benchmark
pnpm cli keys list                  # Manage API keys
```

---

## 📄 License

Distributed under the **MIT License**. Created by [Lofty Tech Labs](https://github.com/loftytechlabs).
