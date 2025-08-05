import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveAlarms, loadAlarms, saveTheme, loadTheme } from './storage';
import type { Alarm } from './types';

// The chrome mock is setup globally in setup.ts

describe('Storage functions', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Alarms', () => {
    it('should call chrome.storage.local.set with alarms', async () => {
      const alarms: Alarm[] = [{ id: '1', time: '10:00', days: [], enabled: true }];
      await saveAlarms(alarms);
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ alarms });
    });

    it('should call chrome.storage.local.get to load alarms', async () => {
      const mockAlarms = [{ id: '1', time: '10:00', days: [], enabled: true }];
      vi.mocked(chrome.storage.local.get).mockResolvedValue({ alarms: mockAlarms });

      const loadedAlarms = await loadAlarms();
      expect(chrome.storage.local.get).toHaveBeenCalledWith('alarms');
      expect(loadedAlarms).toEqual(mockAlarms);
    });

    it('should return an empty array if no alarms are in storage', async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({});
      const loadedAlarms = await loadAlarms();
      expect(loadedAlarms).toEqual([]);
    });
  });

  describe('Theme', () => {
    it('should call chrome.storage.local.set with the theme', async () => {
      const theme = 'light';
      await saveTheme(theme);
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ theme });
    });

    it('should call chrome.storage.local.get to load the theme', async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({ theme: 'light' });
      const loadedTheme = await loadTheme();
      expect(chrome.storage.local.get).toHaveBeenCalledWith('theme');
      expect(loadedTheme).toBe('light');
    });

    it('should return "dark" as the default theme if none is set', async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({});
      const loadedTheme = await loadTheme();
      expect(loadedTheme).toBe('dark');
    });
  });
});
