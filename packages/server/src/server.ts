import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import {
  ServerConfiguration,
  ChatCompletionRequest,
  EmbeddingRequest,
  ModelNotLoadedError,
  ValidationError,
  LAN_SERVER_HOST,
  DEFAULT_SERVER_HOST,
} from '@local-ai/shared';
import { ModelManager } from '@local-ai/models';
import { KeyManager, SecretRedactor } from '@local-ai/security';
import { DeviceRepository, LogsRepository } from '@local-ai/database';
import { DevicePairingManager } from '@local-ai/network';
import { InferenceService } from '@local-ai/inference';
import { HardwareScanner } from '@local-ai/hardware';
import { formatSSE, formatOpenAIModelList } from '@local-ai/protocol';
import { getWebChatHtml } from './ui.js';

export interface ApiServerOptions {
  config: ServerConfiguration;
  inferenceService: InferenceService;
  modelManager: ModelManager;
  keyManager: KeyManager;
  deviceRepo: DeviceRepository;
  pairingManager: DevicePairingManager;
  logsRepo?: LogsRepository;
}

export class ApiServer {
  private fastify: FastifyInstance;
  private config: ServerConfiguration;
  private inferenceService: InferenceService;
  private modelManager: ModelManager;
  private keyManager: KeyManager;
  private deviceRepo: DeviceRepository;
  private pairingManager: DevicePairingManager;
  private isRunning = false;

  constructor(options: ApiServerOptions) {
    this.config = options.config;
    this.inferenceService = options.inferenceService;
    this.modelManager = options.modelManager;
    this.keyManager = options.keyManager;
    this.deviceRepo = options.deviceRepo;
    this.pairingManager = options.pairingManager;

    this.fastify = Fastify({
      logger: false,
    });

    this.setupMiddleware();
    this.setupRoutes();
  }

  public getConfig(): ServerConfiguration {
    return this.config;
  }

  public updateConfig(newConfig: Partial<ServerConfiguration>): void {
    this.config = { ...this.config, ...newConfig };
    this.inferenceService.setMaxConcurrency(this.config.maxConcurrentRequests);
  }

  private setupMiddleware(): void {
    this.fastify.register(cors, {
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
    });

    // Authentication hook
    this.fastify.addHook('onRequest', async (req: FastifyRequest, reply: FastifyReply) => {
      const url = req.url.split('?')[0];
      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] as string | undefined;

      // Automatically register any connecting LAN device
      const isLoopback = clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === '::ffff:127.0.0.1' || clientIp === 'localhost';
      if (!isLoopback && req.method !== 'OPTIONS') {
        this.deviceRepo.recordActivity(clientIp, userAgent);
      }

      // Always allow CORS preflights, Web Chat UI, health, and pairing
      if (
        req.method === 'OPTIONS' ||
        url === '/' ||
        url === '/chat' ||
        url === '/health' ||
        url === '/models' ||
        url === '/v1/models' ||
        url === '/heartbeat' ||
        url === '/pair'
      ) {
        return;
      }

      // Check client authorization
      const authHeader = req.headers.authorization || (req.headers['x-api-key'] as string);
      let isAuthed = false;

      if (authHeader) {
        const rawKey = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : authHeader.trim();
        const validKey = this.keyManager.validateKey(rawKey);
        if (validKey) {
          isAuthed = true;
          this.deviceRepo.recordActivity(clientIp, userAgent);
        }
      }

      // Check if request is from the built-in Web Chat UI or loopback
      const referer = (req.headers.referer as string) || '';
      const host = (req.headers.host as string) || '';
      const isFromWebChat = Boolean(referer && host && (referer.includes(host) || referer.includes(`:${this.config.port}`)));

      // If LAN mode is disabled and request is strictly from loopback, allow without key
      if ((!this.config.lanEnabled && isLoopback) || isFromWebChat) {
        isAuthed = true;
      }

      if (!isAuthed) {
        reply.code(401).send({
          error: {
            message: 'Authentication required. Provide a valid local API key via Bearer token.',
            type: 'invalid_request_error',
            code: 'unauthorized',
          },
        });
      }
    });

    // Error handling hook
    this.fastify.setErrorHandler((error: any, _req, reply) => {
      const statusCode = error.statusCode || 500;
      const message = SecretRedactor.redact(error.message || 'Internal server error');

      reply.status(statusCode).send({
        error: {
          message,
          type: error.code || 'api_error',
          code: error.code || 'internal_error',
        },
      });
    });
  }

  private setupRoutes(): void {
    // 0. Web Chat UI (Mobile & Desktop browser interface)
    this.fastify.get('/', async (_req, reply) => {
      reply.type('text/html; charset=utf-8').send(getWebChatHtml());
    });

    this.fastify.get('/chat', async (_req, reply) => {
      reply.type('text/html; charset=utf-8').send(getWebChatHtml());
    });

    // 1. Health Check & Heartbeat
    this.fastify.get('/health', async () => {
      const runtime = this.inferenceService.getRuntime();
      const health = runtime ? await runtime.health() : { isHealthy: false, state: 'STOPPED', modelLoaded: false };
      return {
        status: health.isHealthy ? 'ok' : 'degraded',
        server: this.isRunning ? 'running' : 'stopped',
        modelLoaded: health.modelLoaded,
        activeModel: this.inferenceService.getModelName() || null,
        uptime: process.uptime(),
      };
    });

    this.fastify.get('/heartbeat', async (req) => {
      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      this.deviceRepo.recordActivity(clientIp, req.headers['user-agent'], `Client (${clientIp})`);
      return { status: 'ok', active: true, timestamp: Date.now() };
    });

    // System Information
    this.fastify.get('/system', async () => {
      const profile = await HardwareScanner.scan();
      return profile;
    });

    // Metrics
    this.fastify.get('/metrics', async () => {
      return this.inferenceService.getMetrics();
    });

    // Server Info
    this.fastify.get('/server', async () => {
      return {
        name: this.config.name,
        port: this.config.port,
        host: this.config.lanEnabled ? LAN_SERVER_HOST : DEFAULT_SERVER_HOST,
        lanEnabled: this.config.lanEnabled,
        activeModel: this.inferenceService.getModelName() || null,
        maxConcurrentRequests: this.config.maxConcurrentRequests,
        contextLimit: this.config.contextLimit,
      };
    });

    // Models List (Local and OpenAI format)
    this.fastify.get('/models', async () => {
      return this.modelManager.getInstalledModels();
    });

    this.fastify.get('/v1/models', async () => {
      const installed = this.modelManager.getInstalledModels();
      const loadedModel = this.inferenceService.getModelName();
      return formatOpenAIModelList(installed, loadedModel);
    });

    // OpenAI Chat Completions (Stream & Non-stream)
    this.fastify.post('/v1/chat/completions', async (req: FastifyRequest, reply: FastifyReply) => {
      const body = req.body as ChatCompletionRequest;
      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

      if (!this.inferenceService.getRuntime()) {
        throw new ModelNotLoadedError('No model is currently loaded in the server');
      }

      if (body.stream) {
        reply.raw.setHeader('Content-Type', 'text/event-stream');
        reply.raw.setHeader('Cache-Control', 'no-cache');
        reply.raw.setHeader('Connection', 'keep-alive');
        reply.raw.flushHeaders();

        const ac = new AbortController();
        req.raw.on('close', () => ac.abort());

        try {
          for await (const chunk of this.inferenceService.chatStream(body, clientIp, ac.signal)) {
            reply.raw.write(formatSSE(chunk));
          }
          reply.raw.write(formatSSE('[DONE]'));
          reply.raw.end();
        } catch (err: any) {
          if (!ac.signal.aborted) {
            reply.raw.write(`data: ${JSON.stringify({ error: { message: err.message } })}\n\n`);
            reply.raw.end();
          }
        }
        return reply;
      }

      const response = await this.inferenceService.chat(body, clientIp);
      return response;
    });

    // OpenAI Embeddings
    this.fastify.post('/v1/embeddings', async (req: FastifyRequest) => {
      const body = req.body as EmbeddingRequest;
      return this.inferenceService.embeddings(body);
    });

    // QR Device Pairing Endpoint
    this.fastify.post('/pair', async (req: FastifyRequest) => {
      const body = req.body as { pairingToken: string; deviceName: string };
      if (!body?.pairingToken || !body?.deviceName) {
        throw new ValidationError('pairingToken and deviceName are required');
      }

      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      return this.pairingManager.completePairing(body.pairingToken, body.deviceName, clientIp);
    });
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;

    await this.fastify.listen({
      port: this.config.port,
      host: '0.0.0.0',
    });
    this.isRunning = true;
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) return;
    await this.fastify.close();
    this.isRunning = false;
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }
}
