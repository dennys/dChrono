import type { Alarm } from './types';

/**
 * Calculates the timestamp for the next occurrence of a given alarm.
 *
 * @param alarm The alarm to calculate the next time for.
 * @param now The current date and time, for testability.
 * @returns An array of objects, each containing the alarm name and the timestamp for the next occurrence.
 *          For recurring alarms, this will be one object per selected day.
 *          For non-recurring alarms, this will be a single object.
 *          Returns an empty array if the alarm is disabled.
 */
export const calculateNextAlarmOccurrences = (alarm: Alarm, now: Date): { name: string; time: number }[] => {
  if (!alarm.enabled) {
    return [];
  }

  const [hours, minutes] = alarm.time.split(':').map(Number);
  const occurrences: { name: string; time: number }[] = [];

  if (alarm.days.length > 0) {
    // Recurring alarm
    alarm.days.forEach(day => {
      const alarmTime = new Date(now.getTime());
      alarmTime.setHours(hours, minutes, 0, 0);

      let dayDifference = day - now.getDay();
      if (dayDifference < 0 || (dayDifference === 0 && alarmTime.getTime() < now.getTime())) {
        dayDifference += 7;
      }

      alarmTime.setDate(now.getDate() + dayDifference);

      occurrences.push({
        name: `${alarm.id}_${day}`,
        time: alarmTime.getTime(),
      });
    });
  } else {
    // Non-recurring alarm
    const alarmTime = new Date(now.getTime());
    alarmTime.setHours(hours, minutes, 0, 0);

    if (alarmTime.getTime() < now.getTime()) {
      alarmTime.setDate(alarmTime.getDate() + 1); // Schedule for tomorrow if time has passed
    }

    occurrences.push({
      name: alarm.id,
      time: alarmTime.getTime(),
    });
  }

  return occurrences;
};
