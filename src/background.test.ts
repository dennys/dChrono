import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { Alarm } from './lib/types';

type AlarmListener = (alarm: chrome.alarms.Alarm) => Promise<void>;

describe('Background Script', () => {
  let onAlarmListener: AlarmListener;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    // Spy on addListener to capture the callback
    const addListenerSpy = vi.spyOn(chrome.alarms.onAlarm, 'addListener');

    // Import the background script to execute its top-level code
    await import('./background');

    // Capture the listener function
    onAlarmListener = addListenerSpy.mock.calls[0][0];

    vi.mocked(chrome.notifications.create).mockResolvedValue('notification-id');
  });

  it('should register an onAlarm listener', () => {
    expect(chrome.alarms.onAlarm.addListener).toHaveBeenCalledOnce();
    expect(onAlarmListener).toBeInstanceOf(Function);
  });

  it('should show a notification for a recurring alarm', async () => {
    const mockChromeAlarm = { name: 'alarm1', scheduledTime: Date.now() };
    const mockRecurringAlarm: Alarm = {
      id: 'alarm1',
      name: 'Test Recurring Alarm',
      description: 'A test description',
      time: '10:00',
      days: [1, 2, 3], // Recurring
      enabled: true,
    };

    // Setup mock for chrome.storage.local.get to return the alarm
    vi.mocked(chrome.storage.local.get).mockResolvedValue({ alarms: [mockRecurringAlarm] });

    // Trigger the alarm listener
    await onAlarmListener(mockChromeAlarm);

    // Verify notification was created with correct details
    expect(chrome.notifications.create).toHaveBeenCalledOnce();
    expect(chrome.notifications.create).toHaveBeenCalledWith(
      mockChromeAlarm.name,
      expect.objectContaining({
        title: mockRecurringAlarm.name,
        message: mockRecurringAlarm.description,
      })
    );

    // Verify storage.local.set was NOT called
    expect(chrome.storage.local.set).not.toHaveBeenCalled();
  });

  it('should show a notification and disable a non-recurring alarm', async () => {
    const mockChromeAlarm = { name: 'alarm2', scheduledTime: Date.now() };
    const mockNonRecurringAlarm: Alarm = {
      id: 'alarm2',
      name: 'Test Non-Recurring Alarm',
      description: 'A one-time alert',
      time: '11:00',
      days: [], // Non-recurring
      enabled: true,
    };

    vi.mocked(chrome.storage.local.get).mockResolvedValue({ alarms: [mockNonRecurringAlarm] });

    await onAlarmListener(mockChromeAlarm);

    expect(chrome.notifications.create).toHaveBeenCalledOnce();

    // Verify storage.local.set was called to disable the alarm
    expect(chrome.storage.local.set).toHaveBeenCalledOnce();
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      alarms: [expect.objectContaining({ id: 'alarm2', enabled: false })],
    });
  });

  it('should show a default notification if alarm is not found in storage', async () => {
    const mockChromeAlarm = { name: 'alarm3', scheduledTime: Date.now() };

    // Setup mock for chrome.storage.local.get to return no alarms
    vi.mocked(chrome.storage.local.get).mockResolvedValue({ alarms: [] });

    await onAlarmListener(mockChromeAlarm);

    // Verify notification was created with default details
    expect(chrome.notifications.create).toHaveBeenCalledOnce();
    expect(chrome.notifications.create).toHaveBeenCalledWith(
      mockChromeAlarm.name,
      expect.objectContaining({
        title: 'alarm', // from i18n mock
        message: 'defaultAlarmMessage', // from i18n mock
      })
    );
  });
});
