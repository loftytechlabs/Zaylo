import { z } from 'zod';

export const ChatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  content: z.string(),
  name: z.string().optional(),
});

export const ChatCompletionRequestSchema = z.object({
  model: z.string().min(1),
  messages: z.array(ChatMessageSchema).min(1),
  temperature: z.number().min(0).max(2).optional().default(0.7),
  top_p: z.number().min(0).max(1).optional().default(0.9),
  max_tokens: z.number().int().positive().optional(),
  stream: z.boolean().optional().default(false),
  stop: z.union([z.string(), z.array(z.string())]).optional(),
  presence_penalty: z.number().min(-2).max(2).optional(),
  frequency_penalty: z.number().min(-2).max(2).optional(),
  user: z.string().optional(),
});

export const EmbeddingRequestSchema = z.object({
  model: z.string().min(1),
  input: z.union([z.string(), z.array(z.string())]),
  user: z.string().optional(),
});

export const ServerConfigurationSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  port: z.number().int().min(1024).max(65535),
  host: z.string(),
  lanEnabled: z.boolean(),
  activeModelId: z.string().optional(),
  activeVariantId: z.string().optional(),
  maxConcurrentRequests: z.number().int().min(1).max(64),
  contextLimit: z.number().int().min(512).max(131072),
  gpuLayers: z.number().int().min(0).max(999),
  threads: z.number().int().min(1).max(128),
  temperature: z.number().min(0).max(2),
  topP: z.number().min(0).max(1),
  autoStartOnBoot: z.boolean(),
  autoLoadModel: z.boolean(),
  lowMemoryMode: z.boolean().default(false),
  flashAttention: z.boolean().default(true),
  modelsDirectory: z.string(),
  runtimeDirectory: z.string(),
});

export const CreateAPIKeySchema = z.object({
  name: z.string().min(1).max(64),
});

export const PairDeviceRequestSchema = z.object({
  pairingToken: z.string().min(1),
  deviceName: z.string().min(1).max(64),
});
