<div align="center">

# Zaylo

**High-performance, private, OpenAI-compatible local AI inference engine and server.**

[![npm version](https://img.shields.io/npm/v/zaylo.svg?style=flat-square&color=2563eb)](https://www.npmjs.com/package/zaylo)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Windows%20%7C%20Linux-18181b.svg?style=flat-square)](https://github.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6.svg?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Fastify](https://img.shields.io/badge/Fastify-v5-000000.svg?style=flat-square&logo=fastify&logoColor=white)](https://fastify.dev)
[![Turborepo](https://img.shields.io/badge/Monorepo-Turbo-ef4444.svg?style=flat-square&logo=turborepo&logoColor=white)](https://turbo.build)
[![Tests Passing](https://img.shields.io/badge/Tests-18%2F18%20Passing-10b981.svg?style=flat-square)](tests)

<br />

[Overview](#overview) • [Feature Comparison](#feature-comparison) • [Architecture](#architectural-pillars) • [Quickstart](#quickstart) • [Desktop GUI](#desktop-application) • [Mobile & LAN](#mobile--lan-chat) • [CLI Reference](#cli-command-reference) • [Configuration](#configuration-options) • [Integrations](#integrations--sdk-examples) • [Benchmarks](#hardware-benchmarks) • [Monorepo](#monorepo-packages) • [Troubleshooting](#troubleshooting)

</div>

---

## Overview

**Zaylo** is an open-source, zero-cloud local AI runtime and inference server. It bridges bare-metal hardware performance with modern developer workflows, allowing you to run open-weights LLMs (Llama 3.2, Qwen 2.5, Mistral, DeepSeek, SmolLM2) entirely on your local machine with zero subscription fees and 100% data privacy.

Zaylo features an integrated **native C++ engine supervisor** (`llama.cpp`), a **high-throughput Fastify API gateway**, a **zero-install mobile and LAN web chat interface**, an **automated multi-stage benchmark suite**, and **embedded SQLite telemetry persistence**.

---

## Feature Comparison

| Capability | Zaylo | Ollama | LM Studio | LocalAI | vLLM |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Instant Mobile & LAN Web Chat (Zero Install)** | **Yes (Built-in QR)** | No | No | Optional WebUI | No |
| **Multi-Stage Hardware Benchmarking** | **Yes (Prompt + Gen + TTFT)** | No | No | No | CLI Script |
| **Live Hardware & Token Telemetry** | **Yes (CPU/GPU/VRAM/Tok/s)** | No | Limited | No | Prometheus |
| **Desktop GUI + Global CLI in One Engine** | **Yes** | CLI Only | GUI Only | CLI / Container | CLI / Python |
| **Persistent API Key Management** | **Yes (Stored in SQLite)** | No | No | Partial | API Token |
| **Low-Memory KV Cache Quantization (`q8_0`)** | **Yes (1-Click Toggle)** | Manual Flag | Settings | Config File | Argument |
| **Native Apple Silicon Metal & NVIDIA CUDA** | **Yes** | Yes | Yes | Yes | CUDA Only |
| **Embedded Zero-Daemon SQLite Engine** | **Yes (WAL Mode)** | SQLite / JSON | JSON | SQLite | None |
| **Drop-in OpenAI SDK Compatibility** | **Yes (`/v1/*`)** | Yes | Yes | Yes | Yes |

---

## Architectural Pillars

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                 ZAYLO PLATFORM                                   │
├────────────────────────┬─────────────────────────┬───────────────────────────────┤
│    CLIENT INTERFACES   │       API GATEWAY       │        STORAGE & STATE        │
│  • Desktop GUI (Vite)  │  • Fastify v5 Engine    │  • Embedded SQLite (WAL Mode) │
│  • Mobile & LAN Chat   │  • SSE Token Streaming  │  • Hardware Telemetry Samples │
│  • Published NPM CLI   │  • OpenAI Route Matcher │  • Model Manifests & GGUFs    │
│  • External SDKs       │  • SHA-256 Key Auth     │  • Paired Devices & Tokens    │
├────────────────────────┴─────────────────────────┴───────────────────────────────┤
│                             HARDWARE & RUNTIME LAYER                             │
│  • Hardware Scanner (sysctl / wmic / nvidia-smi)                                 │
│  • Capability Engine (Automated Layer Offload & Quant Calculation)               │
│  • Native C++ Llama Supervisor (Metal / CUDA / AVX2 / Flash Attention / Q8-KV)  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 1. Bare-Metal Inference & Memory Optimization
* **Hardware-Tailored Layer Offload**: Evaluates host VRAM and compute tier to calculate exact GPU offload layers (`gpuLayers: 99` on unified memory / dedicated VRAM).
* **Low-Memory Streaming Mode**: Combines Flash Attention (`--flash-attn on`) with quantized 8-bit key-value tensors (`-ctk q8_0 -ctv q8_0`) to halve working memory requirements.
* **Process Supervision**: Manages child engine lifecycles with health probing, automatic restart on unexpected exit, and graceful SIGINT teardown.

### 2. High-Throughput HTTP & Streaming Gateway
* **Fastify v5 Core**: High-throughput routing with connection keep-alive and zero-overhead JSON serialization.
* **Server-Sent Events (SSE)**: Streams generated tokens in standard OpenAI format (`data: {"choices":[{"delta":{"content":"..."}}]}`) with sub-millisecond dispatch latency.
* **Active Abort Control**: Instant generation cancellation preserving already generated tokens while immediately freeing compute resources.

### 3. Local-First Security & Telemetry
* **Cryptographic Keys**: SHA-256 hashed API keys with unmasked local copy tokens (`lcl_...`).
* **Non-Blocking Telemetry**: Writes high-frequency hardware metrics (CPU, RAM, GPU, VRAM, active requests) every second via SQLite WAL mode without read locks.

---

## Quickstart

### Option 1: Run with `npx` (No Installation Required)
```bash
npx zaylo start
```

### Option 2: Install Global CLI
```bash
npm install -g zaylo

# Verify installation
zaylo --version
```

### Option 3: Build Monorepo from Source
```bash
git clone https://github.com/your-username/zaylo.git
cd zaylo

pnpm install
pnpm build

# Run desktop application
pnpm dev:desktop

# Or run CLI
pnpm cli start
```

---

## Desktop Application

The Zaylo desktop application provides a complete visual command center for local AI workloads:

* **Overview Dashboard**: Active server state, current model memory footprint, live token generation throughput gauge, and connected LAN devices.
* **Models Catalog & Downloader**: Direct Hugging Face model downloader with automated hash verification and local `.gguf` manual importer.
* **Interactive Playground**: Real-time parameter tuning (temperature, top-p, system prompt, max tokens) with interactive generation abort controls.
* **Server & API Hub**: Live interactive code generation (cURL, Python, Node.js) with dynamic API key and model selector dropdowns.
* **Device Management**: Real-time device connection tracking (`● Online` vs `○ Offline`), pairing tokens, and deletion controls.
* **Automated Benchmark Suite**: Run multi-stage performance passes measuring warmup latency, prompt ingestion throughput, and generation speed.

---

## Mobile & LAN Chat

Zaylo enables immediate access from mobile devices on your local network without installing apps from an App Store:

1. Enable **LAN Network Access** in the **Server & API** tab (or run `zaylo start --lan`).
2. Scan the **QR Code** displayed in the app with an iPhone or Android camera, or navigate to `http://<YOUR_LOCAL_IP>:8080`.
3. Chat with your models with full token streaming, Markdown rendering, code highlighting, and interactive stop response controls.

---

## CLI Command Reference

| Command | Description | Example |
| :--- | :--- | :--- |
| `zaylo start` | Launch inference server and Web Chat | `zaylo start --port 8080 --lan` |
| `zaylo status` | Display CPU, GPU, memory, and runtime status | `zaylo status` |
| `zaylo models list` | List all locally installed and loaded models | `zaylo models list` |
| `zaylo models pull <id>` | Download model from registry | `zaylo models pull llama-3.2-1b` |
| `zaylo models import <path>` | Import existing local `.gguf` file | `zaylo models import ./model.gguf` |
| `zaylo benchmark` | Execute multi-stage hardware benchmark | `zaylo benchmark --gen-tokens 150` |
| `zaylo keys list` | Display all generated API keys | `zaylo keys list` |
| `zaylo keys create <name>` | Generate new authenticated API key | `zaylo keys create "Cursor IDE"` |
| `zaylo keys revoke <id>` | Revoke access for an API key | `zaylo keys revoke key_abc123` |

---

## Configuration Options

Settings can be customized via CLI flags or configured in the Desktop Settings view:

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `port` | `number` | `8080` | Port for Fastify HTTP server and Web Chat |
| `host` | `string` | `'127.0.0.1'` | Host binding (`0.0.0.0` when LAN is enabled) |
| `lanEnabled` | `boolean` | `false` | Expose server across local Wi-Fi / Ethernet network |
| `maxConcurrentRequests` | `number` | `4` | Maximum parallel inference requests before queuing |
| `contextLimit` | `number` | `4096` | Context window size in tokens |
| `gpuLayers` | `number` | `99` | Number of transformer layers offloaded to GPU |
| `threads` | `number` | `Auto` | Physical CPU threads dedicated to compute |
| `temperature` | `number` | `0.7` | Sampling temperature (`0.0` to `2.0`) |
| `topP` | `number` | `0.9` | Nucleus sampling probability threshold |
| `lowMemoryMode` | `boolean` | `false` | Enable 8-bit quantized KV-cache streaming |
| `flashAttention` | `boolean` | `true` | Enable Flash Attention SIMD optimizations |

---

## Integrations & SDK Examples

### 1. Python (Official `openai` SDK)

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://127.0.0.1:8080/v1",
    api_key="lcl_your_api_key"
)

# Streaming Chat Completion
response = client.chat.completions.create(
    model="Llama-3.2-1B-Instruct-Q4_K_M",
    messages=[
        {"role": "system", "content": "You are a concise engineering assistant."},
        {"role": "user", "content": "Write a high-performance concurrency pattern in Go."}
    ],
    temperature=0.7,
    stream=True
)

for chunk in response:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)
print()
```

### 2. Node.js & TypeScript (`openai` package)

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'http://127.0.0.1:8080/v1',
  apiKey: 'lcl_your_api_key',
});

async function main() {
  const stream = await client.chat.completions.create({
    model: 'Llama-3.2-1B-Instruct-Q4_K_M',
    messages: [
      { role: 'system', content: 'You are an expert full-stack developer.' },
      { role: 'user', content: 'Explain the benefits of SQLite WAL mode.' },
    ],
    stream: true,
  });

  for await (const chunk of stream) {
    process.stdout.write(chunk.choices[0]?.delta?.content || '');
  }
  console.log();
}

main();
```

### 3. LangChain Integration (Python)

```python
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    base_url="http://127.0.0.1:8080/v1",
    api_key="lcl_your_api_key",
    model="Llama-3.2-1B-Instruct-Q4_K_M",
    temperature=0.3
)

response = llm.invoke("Summarize the architectural differences between Monoliths and Microservices.")
print(response.content)
```

### 4. Cursor IDE / Continue Configuration

Add Zaylo as an OpenAI-compatible provider in your IDE configuration (`~/.continue/config.json` or Cursor custom model settings):

```json
{
  "models": [
    {
      "title": "Zaylo - Llama 3.2 1B",
      "provider": "openai",
      "model": "Llama-3.2-1B-Instruct-Q4_K_M",
      "apiBase": "http://127.0.0.1:8080/v1",
      "apiKey": "lcl_your_api_key"
    }
  ]
}
```

---

## Hardware Benchmarks

Measured on standard consumer hardware using Zaylo's multi-stage benchmarking engine:

| Hardware Spec | Model | Quantization | Prompt Processing | Generation Speed | Time-to-First-Token | Peak Memory |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Apple M4 Pro (14-Core CPU, 20-Core GPU)** | Llama 3.2 1B | Q4_K_M | **`245.2 tok/s`** | **`68.4 tok/s`** | **`42 ms`** | 1.1 GB |
| **Apple M2 (8-Core CPU, 10-Core GPU)** | Llama 3.2 1B | Q4_K_M | **`110.6 tok/s`** | **`25.3 tok/s`** | **`64 ms`** | 1.1 GB |
| **Apple M2 (8-Core CPU, 10-Core GPU)** | Mistral 7B | Q4_K_M | **`58.2 tok/s`** | **`14.1 tok/s`** | **`112 ms`** | 4.8 GB |
| **NVIDIA RTX 4090 (24GB VRAM)** | Qwen 2.5 7B | Q4_K_M | **`420.0 tok/s`** | **`95.2 tok/s`** | **`28 ms`** | 5.2 GB |
| **Intel Core i7-13700K (AVX2 CPU)** | SmolLM2 135M | Q4_K_M | **`310.4 tok/s`** | **`82.5 tok/s`** | **`31 ms`** | 350 MB |

---

## Monorepo Packages

Zaylo is structured into 15 isolated, type-safe packages managed by Turborepo:

| Package | Directory | Role & Key Responsibilities |
| :--- | :--- | :--- |
| **`zaylo`** | `cli/` | Global command-line interface executable |
| **`@local-ai/desktop`** | `apps/desktop/` | Electron + React 18 + Tailwind desktop application |
| **`@local-ai/server`** | `packages/server/` | Fastify HTTP server, SSE router, Web Chat UI |
| **`@local-ai/runtime-llama`** | `packages/runtime-llama/` | C++ llama-server process supervisor & binary installer |
| **`@local-ai/runtimes`** | `packages/runtimes/` | Abstract runtime lifecycle and health interfaces |
| **`@local-ai/hardware`** | `packages/hardware/` | OS-agnostic CPU, GPU, VRAM, and RAM scanner |
| **`@local-ai/capabilities`** | `packages/capabilities/` | Hardware tier scoring and layer offload planner |
| **`@local-ai/models`** | `packages/models/` | Hugging Face downloader, sha256 verifier, GGUF parser |
| **`@local-ai/inference`** | `packages/inference/` | Request queue, rate limiter, streaming pipeline |
| **`@local-ai/database`** | `packages/database/` | SQLite embedded repositories (WAL mode) |
| **`@local-ai/security`** | `packages/security/` | API key crypto hashing and token validator |
| **`@local-ai/network`** | `packages/network/` | LAN adapter scanner, QR generator, device tracker |
| **`@local-ai/monitoring`** | `packages/monitoring/` | Resource sampler and structured event logger |
| **`@local-ai/protocol`** | `packages/protocol/` | Typed IPC channels, event contracts, API schemas |
| **`@local-ai/shared`** | `packages/shared/` | Shared TypeScript types, error classes, constants |

---

## Operating System Support

| Operating System | Hardware Acceleration | Default Storage Location |
| :--- | :--- | :--- |
| **macOS** *(Apple Silicon / Intel)* | Metal, CPU SIMD | `~/Library/Application Support/Zaylo/` |
| **Windows 10 / 11** | NVIDIA CUDA, CPU AVX2 | `%APPDATA%\Zaylo\` |
| **Linux** *(Ubuntu / Debian / Arch)* | NVIDIA CUDA, CPU AVX2 | `~/.zaylo/` |

---

## Troubleshooting

### Port Already in Use (`EADDRINUSE`)
If port 8080 is occupied by another service, specify a custom port:
```bash
zaylo start --port 8090
```

### Insufficient GPU Memory (Out of Memory)
If running a model that exceeds available GPU VRAM:
1. Enable **Low-Memory Mode** in Settings or via CLI (`zaylo start --low-mem`).
2. Reduce the context size (e.g., `--context 2048`).
3. Select a higher-compression quantization variant (e.g., `Q4_K_M` instead of `Q8_0` or `F16`).

### Phone Cannot Connect Over Wi-Fi
1. Ensure your computer and phone are connected to the same Wi-Fi network (not a guest network with client isolation).
2. Check that **LAN Network Access** is enabled in the Server & API tab.
3. If on Windows, ensure the Windows Firewall permits incoming TCP connections on port 8080.

---

## Testing

Run the automated integration and unit test suite across all workspace packages:

```bash
pnpm test
```

---

## License

Distributed under the **MIT License**. See `LICENSE` for more information.
