import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Alarm } from './lib/types';
import * as storage from './lib/storage';

vi.mock('./lib/storage');

type AlarmListener = (alarm: chrome.alarms.Alarm) => Promise<void>;
type MessageListener = (message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => void;

describe('Background Script', () => {
  let onAlarmListener: AlarmListener;
  let onMessageListener: MessageListener;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    const onAlarmSpy = vi.spyOn(chrome.alarms.onAlarm, 'addListener');
    const onMessageSpy = vi.spyOn(chrome.runtime.onMessage, 'addListener');

    await import('./background');

    onAlarmListener = onAlarmSpy.mock.calls[0][0];
    onMessageListener = onMessageSpy.mock.calls[0][0];
  });

  describe('onAlarm Listener', () => {
    it('should register an onAlarm listener', () => {
      expect(chrome.alarms.onAlarm.addListener).toHaveBeenCalledOnce();
      expect(onAlarmListener).toBeInstanceOf(Function);
    });

    it('should open a popup and pass correct URL params', async () => {
      const mockChromeAlarm = { name: 'alarm1_123', scheduledTime: Date.now() };
      const mockRecurringAlarm: Alarm = {
        id: 'alarm1',
        name: 'Test Alarm',
        description: 'Test Desc',
        time: '10:00',
        days: [1, 2],
        enabled: true,
      };
      vi.mocked(storage.loadAlarms).mockResolvedValue([mockRecurringAlarm]);

      await onAlarmListener(mockChromeAlarm);

      expect(chrome.windows.create).toHaveBeenCalledOnce();
      const createCall = vi.mocked(chrome.windows.create).mock.calls[0][0];
      const url = new URL(createCall.url as string);
      expect(url.searchParams.get('name')).toBe('Test Alarm');
      expect(url.searchParams.get('description')).toBe('Test Desc');
      expect(url.searchParams.get('alarmName')).toBe('alarm1_123');
      expect(url.searchParams.get('days')).toBe('[1,2]');
    });

    it('should NOT disable a one-time alarm immediately', async () => {
        const mockChromeAlarm = { name: 'alarm2', scheduledTime: Date.now() };
        const mockNonRecurringAlarm: Alarm = {
          id: 'alarm2', name: 'Test', description: '', time: '11:00', days: [], enabled: true,
        };
        vi.mocked(storage.loadAlarms).mockResolvedValue([mockNonRecurringAlarm]);

        await onAlarmListener(mockChromeAlarm);

        expect(chrome.windows.create).toHaveBeenCalledOnce();
        expect(storage.saveAlarms).not.toHaveBeenCalled();
    });
  });

  describe('onMessage Listener', () => {
    it('should register an onMessage listener', () => {
        expect(chrome.runtime.onMessage.addListener).toHaveBeenCalledOnce();
        expect(onMessageListener).toBeInstanceOf(Function);
    });

    it('should disable a one-time alarm on DISABLE_ALARM message', async () => {
      const mockAlarmToDisable: Alarm = {
        id: 'alarm1', name: 'Test', description: '', time: '10:00', days: [], enabled: true,
      };
      vi.mocked(storage.loadAlarms).mockResolvedValue([mockAlarmToDisable]);
      const message = { type: 'DISABLE_ALARM', alarmName: 'alarm1_123' };

      onMessageListener(message, {} as any, () => {});

      // Allow async operations within the listener to complete
      await vi.dynamicImportSettled();

      expect(storage.loadAlarms).toHaveBeenCalledOnce();
      expect(storage.saveAlarms).toHaveBeenCalledOnce();
      expect(storage.saveAlarms).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'alarm1', enabled: false })
      ]);
    });

    it('should not do anything for other messages', async () => {
        const message = { type: 'UNKNOWN_MESSAGE' };
        onMessageListener(message, {} as any, () => {});
        await vi.dynamicImportSettled();
        expect(storage.loadAlarms).not.toHaveBeenCalled();
        expect(storage.saveAlarms).not.toHaveBeenCalled();
    });
  });
});
