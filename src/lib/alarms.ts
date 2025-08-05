import type { Alarm } from './types';
import { loadAlarms } from './storage';
import { calculateNextAlarmOccurrences } from './time';

/**
 * Sorts a list of alarms by time.
 * @param alarms The list of alarms to sort.
 * @returns A new array with the sorted alarms.
 */
export const sortAlarms = (alarms: Alarm[]): Alarm[] => {
  return [...alarms].sort((a, b) => a.time.localeCompare(b.time));
};

/**
 * Adds or updates an alarm in the list.
 * @param alarms The current list of alarms.
 * @param alarm The alarm to add or update.
 * @returns A new array with the updated list of alarms.
 */
export const addOrUpdateAlarm = (alarms: Alarm[], alarm: Alarm): Alarm[] => {
  const existingIndex = alarms.findIndex(a => a.id === alarm.id);
  if (existingIndex > -1) {
    const newAlarms = [...alarms];
    newAlarms[existingIndex] = alarm;
    return newAlarms;
  } else {
    return [...alarms, alarm];
  }
};

/**
 * Deletes an alarm from the list.
 * @param alarms The current list of alarms.
 * @param alarmId The ID of the alarm to delete.
 * @returns A new array without the deleted alarm.
 */
export const deleteAlarm = (alarms: Alarm[], alarmId: string): Alarm[] => {
  return alarms.filter(a => a.id !== alarmId);
};

/**
 * Toggles the enabled state of an alarm.
 * @param alarms The current list of alarms.
 * @param alarmId The ID of the alarm to toggle.
 * @returns A new array with the updated alarm.
 */
export const toggleAlarmEnabled = (alararms: Alarm[], alarmId: string): Alarm[] => {
    const alarm = alararms.find(a => a.id === alarmId);
    if (alarm) {
        alarm.enabled = !alarm.enabled;
    }
    return [...alararms];
}


/**
 * Clears all existing chrome.alarms and creates new ones based on the
 * currently stored list of alarms.
 */
export const syncChromeAlarms = async (): Promise<void> => {
  const alarms = await loadAlarms();
  await chrome.alarms.clearAll();

  const now = new Date();

  alarms.forEach(alarm => {
    const occurrences = calculateNextAlarmOccurrences(alarm, now);
    occurrences.forEach(occurrence => {
      const periodInMinutes = alarm.days.length > 0 ? 7 * 24 * 60 : undefined;
      chrome.alarms.create(occurrence.name, {
        when: occurrence.time,
        periodInMinutes,
      });
    });
  });
};
