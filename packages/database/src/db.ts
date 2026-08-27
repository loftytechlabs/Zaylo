import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { getDefaultDatabasePath } from '@local-ai/shared';

const require = createRequire(import.meta.url);

export interface PreparedStatement {
  all(...params: any[]): any[];
  get(...params: any[]): any;
  run(...params: any[]): { changes: number; lastInsertRowid: number | bigint };
}

export interface IDatabase {
  prepare(sql: string): PreparedStatement;
  exec(sql: string): void;
  close(): void;
}

export interface DatabaseConnection {
  raw: IDatabase;
  close: () => void;
}

class SqlJsWrapper implements IDatabase {
  private db: SqlJsDatabase;
  private dbPath: string;
  private saveTimeout?: NodeJS.Timeout;

  constructor(db: SqlJsDatabase, dbPath: string) {
    this.db = db;
    this.dbPath = dbPath;
  }

  private scheduleSave() {
    if (this.saveTimeout) return;
    this.saveTimeout = setTimeout(() => {
      this.saveToDisk();
      this.saveTimeout = undefined;
    }, 100);
  }

  public saveToDisk() {
    try {
      const data = this.db.export();
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.dbPath, Buffer.from(data));
    } catch (err) {
      console.error('Failed to persist SQLite database to disk:', err);
    }
  }

  public exec(sql: string): void {
    this.db.exec(sql);
    this.scheduleSave();
  }

  public prepare(sql: string): PreparedStatement {
    const isWrite = /^\s*(INSERT|UPDATE|DELETE|REPLACE|CREATE|DROP|ALTER)/i.test(sql);

    return {
      all: (...params: any[]): any[] => {
        const stmt = this.db.prepare(sql);
        try {
          if (params.length > 0) {
            stmt.bind(params);
          }
          const results: any[] = [];
          while (stmt.step()) {
            results.push(stmt.getAsObject());
          }
          return results;
        } finally {
          stmt.free();
        }
      },
      get: (...params: any[]): any => {
        const stmt = this.db.prepare(sql);
        try {
          if (params.length > 0) {
            stmt.bind(params);
          }
          if (stmt.step()) {
            return stmt.getAsObject();
          }
          return null;
        } finally {
          stmt.free();
        }
      },
      run: (...params: any[]): { changes: number; lastInsertRowid: number | bigint } => {
        const stmt = this.db.prepare(sql);
        try {
          if (params.length > 0) {
            stmt.bind(params);
          }
          stmt.step();
          if (isWrite) {
            this.scheduleSave();
          }
          return { changes: 1, lastInsertRowid: 0 };
        } finally {
          stmt.free();
        }
      },
    };
  }

  public close(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = undefined;
    }
    this.saveToDisk();
    this.db.close();
  }
}

let sqlJsEngine: any = null;

async function getSqlJsEngine(): Promise<any> {
  if (sqlJsEngine) return sqlJsEngine;

  const initFn = typeof initSqlJs === 'function' ? initSqlJs : (initSqlJs as any).default;
  try {
    const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm');
    const wasmBinary = fs.readFileSync(wasmPath);
    sqlJsEngine = await initFn({ wasmBinary });
  } catch {
    sqlJsEngine = await initFn();
  }
  return sqlJsEngine;
}

export function createDatabase(dbPath: string = getDefaultDatabasePath()): DatabaseConnection {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // 1. Attempt Node built-in node:sqlite if available in the running environment
  try {
    const nodeSqlite = (globalThis as any).process?.getBuiltinModule?.('node:sqlite');
    if (nodeSqlite && nodeSqlite.DatabaseSync) {
      const raw = new nodeSqlite.DatabaseSync(dbPath);
      raw.exec(`
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
        PRAGMA foreign_keys = ON;
      `);
      initializeSchema(raw);
      return {
        raw,
        close: () => raw.close(),
      };
    }
  } catch {}

  // 2. If running synchronously and sqlJsEngine is already loaded
  if (sqlJsEngine) {
    let fileBuffer: Buffer | undefined;
    if (fs.existsSync(dbPath)) {
      fileBuffer = fs.readFileSync(dbPath);
    }
    const dbInstance: SqlJsDatabase = fileBuffer ? new sqlJsEngine.Database(fileBuffer) : new sqlJsEngine.Database();
    const wrapper = new SqlJsWrapper(dbInstance, dbPath);
    initializeSchema(wrapper);
    return {
      raw: wrapper,
      close: () => wrapper.close(),
    };
  }

  throw new Error('createDatabase called synchronously before engine initialized. Use createDatabaseAsync.');
}

export async function createDatabaseAsync(dbPath: string = getDefaultDatabasePath()): Promise<DatabaseConnection> {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const engine = await getSqlJsEngine();

  let fileBuffer: Buffer | undefined;
  if (fs.existsSync(dbPath)) {
    fileBuffer = fs.readFileSync(dbPath);
  }

  const dbInstance: SqlJsDatabase = fileBuffer ? new engine.Database(fileBuffer) : new engine.Database();
  const wrapper = new SqlJsWrapper(dbInstance, dbPath);
  initializeSchema(wrapper);

  return {
    raw: wrapper,
    close: () => wrapper.close(),
  };
}

function initializeSchema(raw: { exec: (sql: string) => void }): void {
  raw.exec(`
    CREATE TABLE IF NOT EXISTS servers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      port INTEGER NOT NULL DEFAULT 8080,
      host TEXT NOT NULL DEFAULT '127.0.0.1',
      lan_enabled INTEGER NOT NULL DEFAULT 0,
      active_model_id TEXT,
      active_variant_id TEXT,
      max_concurrent_requests INTEGER NOT NULL DEFAULT 4,
      context_limit INTEGER NOT NULL DEFAULT 4096,
      gpu_layers INTEGER NOT NULL DEFAULT 99,
      threads INTEGER NOT NULL DEFAULT 6,
      temperature REAL NOT NULL DEFAULT 0.7,
      top_p REAL NOT NULL DEFAULT 0.9,
      auto_start_on_boot INTEGER NOT NULL DEFAULT 0,
      auto_load_model INTEGER NOT NULL DEFAULT 1,
      low_memory_mode INTEGER NOT NULL DEFAULT 0,
      flash_attention INTEGER NOT NULL DEFAULT 1,
      models_directory TEXT NOT NULL,
      runtime_directory TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS models (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      publisher TEXT NOT NULL,
      description TEXT NOT NULL,
      parameter_count TEXT NOT NULL,
      capabilities TEXT NOT NULL,
      variants TEXT NOT NULL,
      default_variant_id TEXT NOT NULL,
      tags TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS model_installations (
      id TEXT PRIMARY KEY,
      model_id TEXT NOT NULL,
      variant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      local_path TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      sha256 TEXT,
      installed_at INTEGER NOT NULL,
      is_loaded INTEGER NOT NULL DEFAULT 0,
      format TEXT NOT NULL,
      quantization TEXT NOT NULL,
      context_length INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      prefix TEXT NOT NULL,
      hashed_key TEXT NOT NULL,
      raw_key TEXT,
      created_at INTEGER NOT NULL,
      last_used_at INTEGER,
      is_revoked INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      ip_address TEXT NOT NULL,
      user_agent TEXT,
      device_name TEXT NOT NULL,
      paired_at INTEGER NOT NULL,
      last_request_at INTEGER NOT NULL,
      request_count INTEGER NOT NULL DEFAULT 0,
      is_revoked INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS requests (
      id TEXT PRIMARY KEY,
      timestamp INTEGER NOT NULL,
      model_id TEXT NOT NULL,
      client_ip TEXT NOT NULL,
      prompt_tokens INTEGER NOT NULL DEFAULT 0,
      completion_tokens INTEGER NOT NULL DEFAULT 0,
      latency_ms INTEGER NOT NULL,
      tokens_per_sec REAL NOT NULL DEFAULT 0,
      status_code INTEGER NOT NULL,
      is_streaming INTEGER NOT NULL DEFAULT 0,
      error_message TEXT
    );

    CREATE TABLE IF NOT EXISTS performance_samples (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      cpu_percent REAL NOT NULL,
      memory_used_bytes INTEGER NOT NULL,
      memory_total_bytes INTEGER NOT NULL,
      gpu_percent REAL,
      vram_used_bytes INTEGER,
      vram_total_bytes INTEGER,
      active_requests INTEGER NOT NULL,
      tokens_per_second REAL NOT NULL,
      latency_ms REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS server_events (
      id TEXT PRIMARY KEY,
      timestamp INTEGER NOT NULL,
      level TEXT NOT NULL,
      component TEXT NOT NULL,
      event TEXT NOT NULL,
      message TEXT NOT NULL,
      request_id TEXT,
      model_id TEXT,
      meta TEXT
    );

    CREATE TABLE IF NOT EXISTS downloads (
      id TEXT PRIMARY KEY,
      model_id TEXT NOT NULL,
      variant_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      status TEXT NOT NULL,
      downloaded_bytes INTEGER NOT NULL,
      total_bytes INTEGER NOT NULL,
      bytes_per_second REAL NOT NULL DEFAULT 0,
      error TEXT,
      started_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS benchmark_results (
      id TEXT PRIMARY KEY,
      model_id TEXT NOT NULL,
      variant_id TEXT NOT NULL,
      model_name TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      prompt_tokens INTEGER NOT NULL,
      completion_tokens INTEGER NOT NULL,
      prompt_processing_tokens_per_sec REAL NOT NULL,
      generation_tokens_per_sec REAL NOT NULL,
      time_to_first_token_ms REAL NOT NULL,
      total_duration_ms REAL NOT NULL,
      peak_memory_bytes INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_requests_timestamp ON requests(timestamp);
    CREATE INDEX IF NOT EXISTS idx_samples_timestamp ON performance_samples(timestamp);
    CREATE INDEX IF NOT EXISTS idx_events_timestamp ON server_events(timestamp);
  `);

  // Automatic schema migrations for existing databases
  try {
    raw.exec('ALTER TABLE servers ADD COLUMN low_memory_mode INTEGER NOT NULL DEFAULT 0;');
  } catch {}
  try {
    raw.exec('ALTER TABLE servers ADD COLUMN flash_attention INTEGER NOT NULL DEFAULT 1;');
  } catch {}
  try {
    raw.exec('ALTER TABLE api_keys ADD COLUMN raw_key TEXT;');
  } catch {}
}
