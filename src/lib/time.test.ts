import { describe, it, expect } from 'vitest';
import { calculateNextAlarmOccurrences } from './time';
import type { Alarm } from './types';

describe('calculateNextAlarmOccurrences', () => {
  // Test date: Wednesday, June 12, 2024 10:00:00 AM
  const now = new Date('2024-06-12T10:00:00');

  it('should return an empty array for a disabled alarm', () => {
    const alarm: Alarm = { id: '1', time: '12:00', days: [], enabled: false };
    expect(calculateNextAlarmOccurrences(alarm, now)).toEqual([]);
  });

  it('should calculate the next occurrence for a non-recurring alarm today', () => {
    const alarm: Alarm = { id: '2', time: '14:00', days: [], enabled: true };
    const occurrences = calculateNextAlarmOccurrences(alarm, now);
    const expectedTime = new Date('2024-06-12T14:00:00').getTime();
    expect(occurrences).toHaveLength(1);
    expect(occurrences[0].name).toBe('2');
    expect(occurrences[0].time).toBe(expectedTime);
  });

  it('should calculate the next occurrence for a non-recurring alarm tomorrow', () => {
    const alarm: Alarm = { id: '3', time: '08:00', days: [], enabled: true };
    const occurrences = calculateNextAlarmOccurrences(alarm, now);
    const expectedTime = new Date('2024-06-13T08:00:00').getTime();
    expect(occurrences).toHaveLength(1);
    expect(occurrences[0].name).toBe('3');
    expect(occurrences[0].time).toBe(expectedTime);
  });

  it('should calculate occurrences for a recurring alarm', () => {
    // Alarm on Mondays (1) and Fridays (5) at 09:00
    const alarm: Alarm = { id: '4', time: '09:00', days: [1, 5], enabled: true };
    const occurrences = calculateNextAlarmOccurrences(alarm, now);

    // Monday is next week, Friday is this week
    const expectedFriday = new Date('2024-06-14T09:00:00').getTime();
    const expectedMonday = new Date('2024-06-17T09:00:00').getTime();

    expect(occurrences).toHaveLength(2);
    const monday = occurrences.find(o => o.name === '4_1');
    const friday = occurrences.find(o => o.name === '4_5');

    expect(monday?.time).toBe(expectedMonday);
    expect(friday?.time).toBe(expectedFriday);
  });

  it('should calculate occurrence for a recurring alarm on the same day (after current time)', () => {
    // Alarm on Wednesday (3) at 11:00. "now" is Wednesday 10:00.
    const alarm: Alarm = { id: '5', time: '11:00', days: [3], enabled: true };
    const occurrences = calculateNextAlarmOccurrences(alarm, now);
    const expectedTime = new Date('2024-06-12T11:00:00').getTime();

    expect(occurrences).toHaveLength(1);
    expect(occurrences[0].time).toBe(expectedTime);
  });

  it('should calculate occurrence for a recurring alarm on the same day (before current time)', () => {
    // Alarm on Wednesday (3) at 09:00. "now" is Wednesday 10:00.
    const alarm: Alarm = { id: '6', time: '09:00', days: [3], enabled: true };
    const occurrences = calculateNextAlarmOccurrences(alarm, now);
    // Should schedule for next Wednesday
    const expectedTime = new Date('2024-06-19T09:00:00').getTime();

    expect(occurrences).toHaveLength(1);
    expect(occurrences[0].time).toBe(expectedTime);
  });

  it('should handle alarms around midnight correctly', () => {
    const lateNight = new Date('2024-06-12T23:00:00');
    // Non-recurring alarm for tomorrow morning
    const alarm: Alarm = { id: '7', time: '01:00', days: [], enabled: true };
    const occurrences = calculateNextAlarmOccurrences(alarm, lateNight);
    const expectedTime = new Date('2024-06-13T01:00:00').getTime();
    expect(occurrences[0].time).toBe(expectedTime);
  });
});
