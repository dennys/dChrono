import type { Alarm } from './lib/types';
import { loadAlarms, saveAlarms } from './lib/storage';

// Listen for alarm events
chrome.alarms.onAlarm.addListener(async (alarm: chrome.alarms.Alarm) => {
  console.log('Alarm triggered:', alarm.name);

  // The alarm name might be composite (e.g., "alarmId_day")
  const alarmId = alarm.name.split('_')[0];

  const alarms = await loadAlarms();
  const triggeredAlarm = alarms.find(a => a.id === alarmId);

  const notificationOptions = {
    type: 'basic' as const,
    priority: 2,
    iconUrl: chrome.runtime.getURL('src/icons/icon128.png'),
    title: triggeredAlarm?.name || chrome.i18n.getMessage('alarm'),
    message: triggeredAlarm?.description || chrome.i18n.getMessage('defaultAlarmMessage'),
  };

  try {
    const notificationId = await chrome.notifications.create(alarm.name, notificationOptions);
    console.log('Notification created with ID:', notificationId);
  } catch (error) {
    console.error('Error creating notification:', error);
  }

  // If it's a non-recurring alarm, disable it after it rings
  if (triggeredAlarm && triggeredAlarm.days.length === 0) {
    triggeredAlarm.enabled = false;
    await saveAlarms(alarms);
  }
});
