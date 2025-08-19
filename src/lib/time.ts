import type { Alarm } from './types';

export const convert12hTo24h = (time12h: string): string => {
  if (!time12h) return '00:00';

  const [time, modifier] = time12h.split(' ');
  // If there's no modifier, we assume it's already in 24h format.
  // We'll just return it, assuming it's valid. A more robust solution
  // might validate this further, but this matches previous behavior.
  if (!modifier) return time12h;

  const [hours, minutes] = time.split(':');
  let hoursNum = parseInt(hours, 10);

  if (isNaN(hoursNum) || isNaN(parseInt(minutes, 10))) {
    return '00:00'; // Return a sensible default for invalid numbers
  }

  if (modifier.toUpperCase() === 'PM' && hoursNum < 12) {
    hoursNum += 12;
  }
  if (modifier.toUpperCase() === 'AM' && hoursNum === 12) {
    hoursNum = 0; // Midnight case
  }

  return `${String(hoursNum).padStart(2, '0')}:${minutes}`;
}

export const convert24hTo12h = (time24h: string): string => {
  if (!time24h || !time24h.includes(':')) {
    return '12:00 AM'; // Return a sensible default for invalid input
  }
  const [hours, minutes] = time24h.split(':');
  const hoursNum = parseInt(hours, 10);

  if (isNaN(hoursNum) || isNaN(parseInt(minutes, 10))) {
    return '12:00 AM'; // Return a sensible default for invalid numbers
  }

  const ampm = hoursNum >= 12 ? 'PM' : 'AM';
  let hours12 = hoursNum % 12;
  if (hours12 === 0) {
    hours12 = 12; // 0 should be 12 in 12h format
  }
  return `${hours12}:${minutes} ${ampm}`;
}

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
