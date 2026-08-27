# Zaylo ⚡

**Private Local AI Inference Platform CLI & Server**

Turn your computer into a high-performance, private, OpenAI-compatible AI inference server accessible across your local network.

---

## 🚀 Quick Start

### Run with `npx` (No installation needed)

```bash
# Check hardware and AI engine status
npx zaylo status

# List compatible models
npx zaylo models

# Download and install a model
npx zaylo install smollm2-135m-instruct

# Start local server with OpenAI compatible API
npx zaylo start --port 8080 --lan
```

### Or install globally

```bash
npm install -g zaylo

# Start Zaylo server
zaylo start
```

---

## 🛠 Features

- **OpenAI-Compatible API**: Fully compatible with `/v1/chat/completions`, `/v1/models`, `/v1/embeddings`, and streaming (`text/event-stream`).
- **Hardware Acceleration**: Automatic Apple Silicon Metal, NVIDIA CUDA, and multi-core CPU detection and optimization.
- **LAN Multi-Device Access**: Connect phones, tablets, and other computers on your Wi-Fi network securely.
- **Built-in Web & Mobile Chat**: Instant browser-based chat UI with responsive markdown and streaming.
- **Zero Cloud Dependence**: 100% private, local, and offline.

---

## 📡 API Usage Example

```bash
curl http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer lcl_your_key" \
  -d '{
    "model": "default",
    "messages": [{"role": "user", "content": "Hello Zaylo!"}],
    "stream": false
  }'
```

### Python (OpenAI SDK)

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8080/v1",
    api_key="lcl_your_key"
)

response = client.chat.completions.create(
    model="default",
    messages=[{"role": "user", "content": "Hello from Python!"}],
)
print(response.choices[0].message.content)
```

---

## 📄 License

MIT
