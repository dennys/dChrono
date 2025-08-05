import type { Alarm } from "./lib/types";

// Listen for alarm events
chrome.alarms.onAlarm.addListener((alarm: chrome.alarms.Alarm) => {
  console.log('Alarm triggered:', alarm.name);

  // The alarm name might be composite (e.g., "alarmId_day")
  const alarmId = alarm.name.split('_')[0];

  chrome.storage.local.get('alarms', (result) => {
    const alarms: Alarm[] = result.alarms || [];
    const triggeredAlarm = alarms.find(a => a.id === alarmId);

    const notificationOptions = {
      type: 'basic' as const,
      priority: 2,
      iconUrl: chrome.runtime.getURL('src/icons/icon128.png'),
      title: triggeredAlarm?.name || chrome.i18n.getMessage('alarm'),
      message: triggeredAlarm?.description || chrome.i18n.getMessage('defaultAlarmMessage'),
    };

    chrome.notifications.create(alarm.name, notificationOptions, (notificationId) => {
      if (chrome.runtime.lastError) {
        console.error('Error creating notification:', chrome.runtime.lastError);
      } else {
        console.log('Notification created with ID:', notificationId);
      }
    });

    // If it's a non-recurring alarm, disable it after it rings
    if (triggeredAlarm && triggeredAlarm.days.length === 0) {
      triggeredAlarm.enabled = false;
      chrome.storage.local.set({ alarms });
    }
  });
});
