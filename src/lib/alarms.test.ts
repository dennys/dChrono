import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sortAlarms, addOrUpdateAlarm, deleteAlarm, syncChromeAlarms } from './alarms';
import * as storage from './storage';
import type { Alarm } from './types';

// Mock the storage module
vi.mock('./storage');

// The chrome mock is setup globally in setup.ts


describe('alarm management', () => {
  const alarm1: Alarm = { id: '1', time: '10:00', days: [], enabled: true };
  const alarm2: Alarm = { id: '2', time: '08:00', days: [1], enabled: true };
  const alarm3: Alarm = { id: '3', time: '12:00', days: [2], enabled: false };

  it('should sort alarms by time', () => {
    const alarms = [alarm1, alarm2, alarm3];
    const sorted = sortAlarms(alarms);
    expect(sorted.map(a => a.id)).toEqual(['2', '1', '3']);
    // Ensure original array is not mutated
    expect(alarms.map(a => a.id)).toEqual(['1', '2', '3']);
  });

  it('should add a new alarm', () => {
    const alarms = [alarm1];
    const newAlarms = addOrUpdateAlarm(alarms, alarm2);
    expect(newAlarms).toHaveLength(2);
    expect(newAlarms.find(a => a.id === '2')).toBeDefined();
  });

  it('should update an existing alarm', () => {
    const alarms = [alarm1, alarm2];
    const updatedAlarm1 = { ...alarm1, time: '11:00' };
    const newAlarms = addOrUpdateAlarm(alarms, updatedAlarm1);
    expect(newAlarms).toHaveLength(2);
    expect(newAlarms.find(a => a.id === '1')?.time).toBe('11:00');
  });

  it('should delete an alarm', () => {
    const alarms = [alarm1, alarm2, alarm3];
    const newAlarms = deleteAlarm(alarms, '2');
    expect(newAlarms).toHaveLength(2);
    expect(newAlarms.find(a => a.id === '2')).toBeUndefined();
  });
});


describe('syncChromeAlarms', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  it('should clear all existing alarms and create new ones', async () => {
    const alarms: Alarm[] = [
      { id: '1', time: '10:00', days: [], enabled: true }, // Non-recurring
      { id: '2', time: '08:00', days: [1, 5], enabled: true }, // Recurring
      { id: '3', time: '12:00', days: [2], enabled: false }, // Disabled
    ];

    // Mock storage to return our test alarms
    vi.mocked(storage.loadAlarms).mockResolvedValue(alarms);

    await syncChromeAlarms();

    // Verify that clearAll was called
    expect(chrome.alarms.clearAll).toHaveBeenCalledOnce();

    // Verify that create was called for the enabled alarms
    // Alarm 1: non-recurring, 1 call
    // Alarm 2: recurring on 2 days, 2 calls
    // Alarm 3: disabled, 0 calls
    expect(chrome.alarms.create).toHaveBeenCalledTimes(3);

    // Check the calls in more detail
    expect(chrome.alarms.create).toHaveBeenCalledWith(expect.stringContaining('1'), expect.any(Object));
    expect(chrome.alarms.create).toHaveBeenCalledWith(expect.stringContaining('2_1'), expect.any(Object));
    expect(chrome.alarms.create).toHaveBeenCalledWith(expect.stringContaining('2_5'), expect.any(Object));
  });

  it('should not create any alarms if all are disabled', async () => {
    const alarms: Alarm[] = [
        { id: '1', time: '10:00', days: [], enabled: false },
        { id: '2', time: '08:00', days: [1, 5], enabled: false },
    ];
    vi.mocked(storage.loadAlarms).mockResolvedValue(alarms);

    await syncChromeAlarms();

    expect(chrome.alarms.clearAll).toHaveBeenCalledOnce();
    expect(chrome.alarms.create).not.toHaveBeenCalled();
  });
});
