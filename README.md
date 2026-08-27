<div align="center">

<img src="assets/logo.png" alt="Zaylo Logo" width="100" />

# Zaylo

**High-Performance, Private Local AI Inference Engine & Desktop Server**

Run open-weights LLMs locally on macOS, Windows, and Linux with full data privacy, hardware acceleration, and drop-in OpenAI API compatibility.

[![Release](https://img.shields.io/github/v/release/loftytechlabs/Zaylo?style=flat-square&color=2563eb)](https://github.com/loftytechlabs/Zaylo/releases)
[![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Windows%20%7C%20Linux-18181b.svg?style=flat-square)](https://github.com/loftytechlabs/Zaylo/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6.svg?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Fastify](https://img.shields.io/badge/Fastify-v5-000000.svg?style=flat-square&logo=fastify&logoColor=white)](https://fastify.dev)
[![Tests Passing](https://img.shields.io/badge/Tests-18%2F18%20Passing-10b981.svg?style=flat-square)](tests)

<br />

[Installers](#installers) • [Overview](#overview) • [Desktop Features](#desktop-application) • [Local Network Access](#local-network--mobile-access) • [API & Integrations](#openai-compatible-api) • [Benchmarks](#hardware-benchmarks) • [Monorepo](#monorepo-architecture) • [Development](#development-setup)

</div>

---

## Installers

Download pre-compiled release binaries for your operating system:

| Operating System | Architecture | Format | Download Link |
| :--- | :--- | :---: | :--- |
| macOS | Apple Silicon (M1, M2, M3, M4) | .dmg | [Download Zaylo for Mac (Apple Silicon)](https://github.com/loftytechlabs/Zaylo/releases/latest/download/Zaylo-1.0.0-arm64.dmg) |
| macOS | Intel Core (x86_64) | .dmg | [Download Zaylo for Mac (Intel)](https://github.com/loftytechlabs/Zaylo/releases/latest/download/Zaylo-1.0.0.dmg) |
| Windows | 10 / 11 (64-bit Installer) | .exe | [Download Zaylo for Windows (Setup)](https://github.com/loftytechlabs/Zaylo/releases/latest/download/Zaylo.Setup.1.0.0.exe) |
| Windows | 10 / 11 (64-bit Portable) | .exe | [Download Zaylo for Windows (Portable)](https://github.com/loftytechlabs/Zaylo/releases/latest/download/Zaylo.1.0.0.exe) |
| Linux | Universal AppImage | .AppImage | [Download Zaylo for Linux (AppImage)](https://github.com/loftytechlabs/Zaylo/releases/latest/download/Zaylo-1.0.0.AppImage) |
| Linux | Debian / Ubuntu | .deb | [Download Zaylo for Linux (.deb)](https://github.com/loftytechlabs/Zaylo/releases/latest/download/Zaylo-1.0.0.deb) |

---

## Overview

Zaylo is an enterprise-grade, privacy-first local AI server and desktop application developed by Lofty Tech Labs. It bridges bare-metal hardware acceleration with a modern developer workflow, enabling you to run large language models (Llama 3.2, Qwen 2.5, Mistral, DeepSeek, SmolLM2) entirely on your local machine with zero subscription fees, zero cloud telemetry, and complete data confidentiality.

### Key Capabilities

* **Zero Cloud Dependency**: All model weights, inference execution, and conversation history remain exclusively on local storage.
* **Bare-Metal Acceleration**: Native support for Apple Silicon Metal (unified memory), NVIDIA CUDA, and multi-threaded CPU SIMD execution (AVX2/AVX-512).
* **Zero-Install Mobile Chat**: Built-in QR pairing enables any smartphone or tablet on the local Wi-Fi network to chat with local models via an optimized Web Chat interface.
* **OpenAI-Compatible API Gateway**: High-throughput Fastify server serving `/v1/chat/completions` with streaming Server-Sent Events (SSE).
* **Low-Memory Streaming Mode**: One-click 8-bit quantized KV cache (`q8_0`) and Flash Attention for efficient inference on memory-constrained systems.
* **Embedded SQLite Persistence**: Zero-daemon SQLite WAL database persists models, hardware telemetry, benchmark passes, and paired devices.

---

## Desktop Application

The Zaylo desktop application provides a visual control center for configuring, monitoring, and interacting with local AI inference:

```text
+-----------------------------------------------------------------------------+
|                                ZAYLO DESKTOP                                |
+------------------+----------------------------------------------------------+
| Navigation       | Main Content Area                                        |
|                  |                                                          |
| - Overview       | Server State: Active | Port: 8080 | LAN: Enabled            |
| - Models         | Active Model: Llama-3.2-1B-Instruct-Q4_K_M (1.1 GB VRAM)    |
| - Playground     | Live Generation Throughput: 68.4 tok/s                   |
| - Server & API   | Hardware: Apple M4 Pro (14-Core CPU, 20-Core GPU)        |
| - Devices        |                                                          |
| - Performance    | [ Stop Server ]   [ Open Web Chat ]   [ Copy API Key ]   |
| - Benchmark      |                                                          |
| - Logs           | Connected Devices: Apple iPhone 16 (Online)              |
| - Settings       |                                                          |
+------------------+----------------------------------------------------------+
```

### 1. Overview Dashboard
* **Server State & Controls**: Instant server start and stop toggles with real-time port and host binding feedback.
* **Active Model Memory Footprint**: Displays exact VRAM and RAM allocation for loaded models.
* **Live Speed Gauge**: Visual token generation velocity meter displaying real-time tokens per second.
* **Hardware Identification**: Automated host scan identifying CPU model, active GPU backend, core counts, and total system memory.

### 2. Models Catalog & Importer
* **Curated Open-Weights Registry**: Download top models (Llama 3.2, Qwen 2.5, Mistral, DeepSeek, SmolLM2) directly from Hugging Face with SHA-256 integrity verification.
* **Local GGUF Importer**: Drag and drop or browse any local `.gguf` file to register custom fine-tunes or third-party weights.
* **Quantization Switching**: Select between `Q4_K_M`, `Q8_0`, or full-precision weights depending on available hardware capacity.

### 3. Interactive Playground
* **Multi-Turn Chat**: Complete Markdown rendering, syntax-highlighted code blocks, and one-click code copy buttons.
* **Token Streaming**: Real-time token dispatch with sub-millisecond latency.
* **Active Generation Control**: Instant stop button that halts inference and immediately releases compute resources.
* **Parameter Tuning**: Adjust temperature, Top-P, max generation tokens, and custom System Prompts dynamically.

### 4. Server & API Hub
* **Local Network Sharing**: Single toggle to bind the inference engine to `0.0.0.0` for local network access.
* **Interactive Code Generator**: Dynamic, ready-to-copy code snippets for cURL, Python (`openai`), and Node.js with active models and API keys pre-filled.
* **Persistent Key Manager**: Cryptographically hashed API keys stored in SQLite. Click any key to copy the unmasked token (`lcl_...`).

### 5. Connected Devices & Mobile Pairing
* **Direct QR Pairing**: Generates pairing links (`http://<LAN_IP>:8080/?pair=<TOKEN>`) for seamless smartphone camera scanning.
* **Hardware Identification**: Automatically detects and labels client devices (e.g., Apple iPhone, Samsung Galaxy, Google Pixel, MacBook Client, Windows PC).
* **Live Status Polling**: Three-second polling cycle indicating live online/offline heartbeat status.

### 6. Automated Hardware Benchmark Suite
* **Time-to-First-Token (TTFT)**: Measures prompt evaluation latency and warmup overhead.
* **Prompt Ingestion Throughput**: Evaluates prompt ingestion velocity (tokens per second) under standard context loads.
* **Generation Speed**: Measures raw sustained token generation throughput (tokens per second).
* **Memory Bandwidth**: Calculates effective memory transfer speeds during inference.
* **Historic Comparison**: SQLite-persisted history table to evaluate speed changes across quantization levels and context lengths.

### 7. Performance Telemetry & Logs
* **Real-Time Resource Sampler**: Live visual charts tracking CPU load, RAM utilization, GPU load, and VRAM consumption.
* **Structured System Logs**: Color-coded stream of system events, HTTP requests, inference queries, and error diagnostics.

---

## Local Network & Mobile Access

Zaylo allows team members or mobile devices on your local network to use the inference server without installing client applications:

```text
+-----------------------+        Local Wi-Fi Network        +-----------------------+
|     Zaylo Host        | <===============================> |     Mobile Device     |
|   (Desktop Server)    |       http://192.168.1.X:8080     |   (Safari / Chrome)   |
|   [Pairing QR Code]   |                                   |   [Web Chat Client]   |
+-----------------------+                                   +-----------------------+
```

1. Open Zaylo Desktop and navigate to the **Server & API** or **Devices** tab.
2. Enable **LAN Network Access**.
3. Scan the displayed **QR Code** using a smartphone or tablet camera.
4. The Web Chat client launches immediately with full streaming support, Markdown rendering, and model selection.

---

## OpenAI-Compatible API

Zaylo functions as a drop-in local replacement for OpenAI endpoints at `http://localhost:8080/v1`.

### Python Integration

```python
from openai import OpenAI

# Initialize client pointing to local Zaylo server
client = OpenAI(
    base_url="http://localhost:8080/v1",
    api_key="lcl_your_api_key"  # Available in Zaylo Desktop under Server & API
)

# Request streaming completion
response = client.chat.completions.create(
    model="default",
    messages=[
        {"role": "system", "content": "You are a concise technical assistant."},
        {"role": "user", "content": "Explain memory-mapped I/O in operating systems."}
    ],
    temperature=0.7,
    stream=True
)

for chunk in response:
    content = chunk.choices[0].delta.content
    if content:
        print(content, end="", flush=True)
print()
```

### Node.js / TypeScript Integration

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'http://localhost:8080/v1',
  apiKey: 'lcl_your_api_key',
});

async function run() {
  const stream = await client.chat.completions.create({
    model: 'default',
    messages: [
      { role: 'system', content: 'You are an expert software engineer.' },
      { role: 'user', content: 'Write a generic LRU Cache implementation in TypeScript.' },
    ],
    stream: true,
  });

  for await (const chunk of stream) {
    process.stdout.write(chunk.choices[0]?.delta?.content || '');
  }
}

run();
```

### cURL Request

```bash
curl http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer lcl_your_api_key" \
  -d '{
    "model": "default",
    "messages": [{"role": "user", "content": "Ping"}],
    "temperature": 0.7
  }'
```

### IDE Configuration (Cursor / Continue)

Add Zaylo to your IDE model configuration (`~/.continue/config.json` or Cursor custom OpenAI provider):

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

## Hardware Benchmarks

Measured on standard consumer hardware using Zaylo's integrated benchmark suite:

| Hardware Spec | Model | Quantization | Prompt Processing | Generation Speed | TTFT Latency | Memory Footprint |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| Apple M4 Pro (Unified Memory) | Llama 3.2 1B | Q4_K_M | 245.2 tok/s | 68.4 tok/s | 42 ms | 1.1 GB |
| Apple M2 (Unified Memory) | Llama 3.2 1B | Q4_K_M | 110.6 tok/s | 25.3 tok/s | 64 ms | 1.1 GB |
| Apple M2 (Unified Memory) | Mistral 7B | Q4_K_M | 58.2 tok/s | 14.1 tok/s | 112 ms | 4.8 GB |
| NVIDIA RTX 4090 (24GB VRAM) | Qwen 2.5 7B | Q4_K_M | 420.0 tok/s | 95.2 tok/s | 28 ms | 5.2 GB |
| Intel Core i7-13700K (CPU AVX2) | SmolLM2 135M | Q4_K_M | 310.4 tok/s | 82.5 tok/s | 31 ms | 350 MB |

---

## Monorepo Architecture

Zaylo is built as a TypeScript monorepo managed with Turborepo and pnpm:

```text
packages/
  capabilities/    Hardware scoring and layer offload planner
  database/        SQLite embedded repositories with WAL mode
  hardware/        Cross-platform CPU, GPU, VRAM, and RAM scanner
  inference/       Request queue, rate limiter, and streaming pipeline
  models/          Hugging Face downloader, SHA-256 verifier, GGUF parser
  monitoring/      System telemetry sampler and structured event logger
  network/         Network interface scanner, QR generator, device tracker
  protocol/        Typed IPC contracts and OpenAPI schemas
  runtime-llama/   C++ llama-server process supervisor
  runtimes/        Abstract runtime lifecycle interfaces
  security/        Cryptographic key manager and redaction filters
  server/          Fastify HTTP server, SSE router, and Web Chat UI
  shared/          Shared TypeScript types, error definitions, constants
apps/
  desktop/         Electron + React + Tailwind desktop application
cli/
  src/             Headless CLI interface
```

---

## Development Setup

To build and run Zaylo from source:

### Prerequisites
* Node.js >= 22.0.0
* pnpm >= 11.0.0
* C++ toolchain (Xcode Command Line Tools on macOS, MSVC on Windows, GCC/Clang on Linux)

### Build Instructions

```bash
# 1. Clone the repository
git clone https://github.com/loftytechlabs/Zaylo.git
cd Zaylo

# 2. Install workspace dependencies
pnpm install

# 3. Compile all packages
pnpm build

# 4. Start the Desktop application in development mode
pnpm dev:desktop

# 5. Run the full test suite
pnpm test
```

### Packaging Installers Locally

```bash
pnpm --filter @local-ai/desktop dist        # Package for current platform
pnpm --filter @local-ai/desktop dist:mac    # Package macOS .dmg and .zip
pnpm --filter @local-ai/desktop dist:win    # Package Windows .exe and portable
pnpm --filter @local-ai/desktop dist:linux  # Package Linux .AppImage and .deb
```

---

## License

Distributed under the **MIT License**. Copyright (c) 2026 Lofty Tech Labs. See `LICENSE` for details.
