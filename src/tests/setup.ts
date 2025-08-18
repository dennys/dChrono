import { vi } from 'vitest';

const mockAlarms = {
  create: vi.fn(),
  get: vi.fn(),
  getAll: vi.fn(),
  clear: vi.fn(),
  clearAll: vi.fn(),
  onAlarm: {
    addListener: vi.fn(),
  },
};

const mockStorage = {
  local: {
    get: vi.fn().mockResolvedValue({}),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
  },
  sync: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
  },
  managed: {
      get: vi.fn().mockResolvedValue({}),
  },
  onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn(),
  }
};

const mockI18n = {
  getMessage: vi.fn((key) => key), // Just return the key for simplicity
};

const mockNotifications = {
    create: vi.fn(),
};

const mockRuntime = {
  getURL: (path: string) => `chrome-extension://test-id/${path}`,
  lastError: undefined,
  onMessage: {
    addListener: vi.fn(),
  },
  sendMessage: vi.fn((message, callback) => {
    if (callback) {
      callback({ success: true });
    }
    return Promise.resolve({ success: true });
  }),
};

const mockWindows = {
  create: vi.fn(),
};

const mockSystem = {
  display: {
    getInfo: vi.fn().mockResolvedValue([
      {
        isPrimary: true,
        workArea: {
          width: 1920,
          height: 1080,
        },
      },
    ]),
  },
};

// Mock the global chrome object
const chromeMock = {
  alarms: mockAlarms,
  storage: mockStorage,
  i18n: mockI18n,
  notifications: mockNotifications,
  runtime: mockRuntime,
  windows: mockWindows,
  system: mockSystem,
};

// Assign the mock to the global object
vi.stubGlobal('chrome', chromeMock);
