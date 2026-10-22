import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

export interface SystemConfig {
  baseUrl: string;
  apiKey: string;
  textModel: string;
  imageModel: string;
  useGeminiBackup: boolean;
  updatedAt: string;
}

export interface AdminUser {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExtractedItem {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  thumbnailUrl?: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  errorMessage?: string;
  promptType: string; // 'wechat' | 'table' | 'invoice' | 'custom'
  customPrompt?: string;
  sheetName: string;
  modelUsed?: string;
  extractedData: {
    headers: string[];
    rows: (Record<string, any> | any[])[];
    summaryText?: string;
    rawResponse?: string;
  } | null;
  processedAt?: string;
}

export interface RecordItem {
  id: string;
  createdAt: string;
  imageCount: number;
  status: 'completed' | 'partial' | 'failed' | 'pending';
  summary: string;
  promptType: string;
  items: ExtractedItem[];
  exportCount: number;
}

export interface DatabaseStore {
  config: SystemConfig;
  admins: AdminUser[];
  records: RecordItem[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'system_store.json');

const DEFAULT_CONFIG: SystemConfig = {
  baseUrl: process.env.DEFAULT_AI_BASE_URL || 'https://apihub.agnes-ai.com/v1',
  apiKey: process.env.DEFAULT_AI_API_KEY || 'sk-GUdpKQNIwwJSZQ5mYyrMnuCJBOwSbB73c2N6NcnNfk5LoKyq',
  textModel: process.env.DEFAULT_AI_TEXT_MODEL || 'Agnes-2.5-flash',
  imageModel: process.env.DEFAULT_AI_IMAGE_MODEL || 'Agnes-Image-2.1-flash',
  useGeminiBackup: true,
  updatedAt: new Date().toISOString(),
};

function ensureInitialized(): DatabaseStore {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
    const defaultUsername = process.env.DEFAULT_ADMIN_USER || 'admin';
    const passwordHash = bcrypt.hashSync(defaultPassword, 10);

    const initialStore: DatabaseStore = {
      config: DEFAULT_CONFIG,
      admins: [
        {
          id: 'admin-1',
          username: defaultUsername,
          passwordHash,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      records: [],
    };

    fs.writeFileSync(DB_FILE, JSON.stringify(initialStore, null, 2), 'utf-8');
    return initialStore;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return parsed;
  } catch (err) {
    console.error('Failed reading database file, reinitializing', err);
    const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
    const passwordHash = bcrypt.hashSync(defaultPassword, 10);
    const fallbackStore: DatabaseStore = {
      config: DEFAULT_CONFIG,
      admins: [
        {
          id: 'admin-1',
          username: 'admin',
          passwordHash,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      records: [],
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(fallbackStore, null, 2), 'utf-8');
    return fallbackStore;
  }
}

function writeStore(store: DatabaseStore) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
  fs.writeFileSync(tempFile, JSON.stringify(store, null, 2), 'utf-8');
  fs.renameSync(tempFile, DB_FILE);
}

// Config operations
export function getConfig(): SystemConfig {
  const store = ensureInitialized();
  return store.config;
}

export function updateConfig(partial: Partial<SystemConfig>): SystemConfig {
  const store = ensureInitialized();
  store.config = {
    ...store.config,
    ...partial,
    updatedAt: new Date().toISOString(),
  };
  writeStore(store);
  return store.config;
}

// Admin operations
export function getAdminUser(username: string): AdminUser | undefined {
  const store = ensureInitialized();
  return store.admins.find((a) => a.username.toLowerCase() === username.toLowerCase());
}

export function updateAdminPassword(username: string, newPasswordPlain: string): boolean {
  const store = ensureInitialized();
  const adminIndex = store.admins.findIndex((a) => a.username.toLowerCase() === username.toLowerCase());
  if (adminIndex === -1) return false;

  const newHash = bcrypt.hashSync(newPasswordPlain, 10);
  store.admins[adminIndex].passwordHash = newHash;
  store.admins[adminIndex].updatedAt = new Date().toISOString();
  writeStore(store);
  return true;
}

// Records operations
export function getRecords(options?: {
  status?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}): { records: RecordItem[]; total: number; page: number; pageSize: number } {
  const store = ensureInitialized();
  let list = [...store.records];

  // Sort newest first
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (options?.status && options.status !== 'all') {
    list = list.filter((r) => r.status === options.status);
  }

  if (options?.search) {
    const q = options.search.toLowerCase();
    list = list.filter(
      (r) =>
        r.id.toLowerCase().includes(q) ||
        r.summary.toLowerCase().includes(q) ||
        r.items.some((item) => item.fileName.toLowerCase().includes(q) || item.sheetName.toLowerCase().includes(q))
    );
  }

  if (options?.startDate) {
    const start = new Date(options.startDate).getTime();
    list = list.filter((r) => new Date(r.createdAt).getTime() >= start);
  }

  if (options?.endDate) {
    const end = new Date(options.endDate).getTime();
    list = list.filter((r) => new Date(r.createdAt).getTime() <= end);
  }

  const total = list.length;
  const page = options?.page && options.page > 0 ? options.page : 1;
  const pageSize = options?.pageSize && options.pageSize > 0 ? options.pageSize : 10;
  const startIndex = (page - 1) * pageSize;
  const paginated = list.slice(startIndex, startIndex + pageSize);

  return {
    records: paginated,
    total,
    page,
    pageSize,
  };
}

export function getRecordById(id: string): RecordItem | undefined {
  const store = ensureInitialized();
  return store.records.find((r) => r.id === id);
}

export function saveRecord(record: RecordItem): RecordItem {
  const store = ensureInitialized();
  const existingIdx = store.records.findIndex((r) => r.id === record.id);
  if (existingIdx >= 0) {
    store.records[existingIdx] = record;
  } else {
    store.records.unshift(record);
  }
  // Keep up to 500 recent records in file store
  if (store.records.length > 500) {
    store.records = store.records.slice(0, 500);
  }
  writeStore(store);
  return record;
}

export function updateRecord(id: string, updates: Partial<RecordItem>): RecordItem | null {
  const store = ensureInitialized();
  const idx = store.records.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  store.records[idx] = {
    ...store.records[idx],
    ...updates,
  };
  writeStore(store);
  return store.records[idx];
}

export function deleteRecord(id: string): boolean {
  const store = ensureInitialized();
  const initialLength = store.records.length;
  store.records = store.records.filter((r) => r.id !== id);
  if (store.records.length !== initialLength) {
    writeStore(store);
    return true;
  }
  return false;
}

export function incrementExportCount(id: string): void {
  const store = ensureInitialized();
  const record = store.records.find((r) => r.id === id);
  if (record) {
    record.exportCount = (record.exportCount || 0) + 1;
    writeStore(store);
  }
}
