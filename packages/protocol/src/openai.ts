import type { ChatCompletionResponse, ChatMessage, ModelInstallation } from '@local-ai/shared';

export function createChatCompletionResponse(params: {
  id: string;
  model: string;
  created?: number;
  message: ChatMessage;
  finishReason?: 'stop' | 'length' | null;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}): ChatCompletionResponse {
  return {
    id: params.id,
    object: 'chat.completion',
    created: params.created || Math.floor(Date.now() / 1000),
    model: params.model,
    choices: [
      {
        index: 0,
        message: params.message,
        finish_reason: params.finishReason ?? 'stop',
      },
    ],
    usage: params.usage,
  };
}

export function createChatCompletionChunk(params: {
  id: string;
  model: string;
  created?: number;
  delta: { role?: string; content?: string };
  finishReason?: 'stop' | 'length' | null;
}): ChatCompletionResponse {
  return {
    id: params.id,
    object: 'chat.completion.chunk',
    created: params.created || Math.floor(Date.now() / 1000),
    model: params.model,
    choices: [
      {
        index: 0,
        delta: params.delta,
        finish_reason: params.finishReason ?? null,
      },
    ],
  };
}

export function formatSSE(data: ChatCompletionResponse | '[DONE]'): string {
  if (data === '[DONE]') {
    return 'data: [DONE]\n\n';
  }
  return `data: ${JSON.stringify(data)}\n\n`;
}

export function formatOpenAIModelList(
  installed: ModelInstallation[],
  activeModelName?: string | null
): { object: 'list'; data: Array<{ id: string; object: 'model'; created: number; owned_by: string; root?: string }> } {
  const list = installed.map((m) => ({
    id: m.name,
    object: 'model' as const,
    created: Math.floor(m.installedAt / 1000),
    owned_by: 'local-ai',
    root: m.modelId,
  }));

  if (activeModelName && !list.some((m) => m.id === activeModelName)) {
    list.unshift({
      id: activeModelName,
      object: 'model' as const,
      created: Math.floor(Date.now() / 1000),
      owned_by: 'local-ai',
      root: activeModelName,
    });
  }

  return {
    object: 'list',
    data: list,
  };
}
