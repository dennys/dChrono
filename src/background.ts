interface AlarmNotificationOptions {
  type: 'basic';
  iconUrl: string;
  title: string;
  message: string;
  priority: 0 | 1 | 2;
}

// Listen for alarm events
chrome.alarms.onAlarm.addListener((alarm: chrome.alarms.Alarm) => {
  console.log('Alarm triggered:', alarm.name);

  // Create notification when alarm fires
  const notificationOptions: AlarmNotificationOptions = {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon128.png'),
    title: 'Alarm Notification',
    message: `Alarm "${alarm.name}" is ringing!`,
    priority: 2, // High priority
  };

  chrome.notifications.create(alarm.name, notificationOptions, (notificationId) => {
    if (chrome.runtime.lastError) {
      console.error('Error creating notification:', chrome.runtime.lastError);
    } else {
      console.log('Notification created with ID:', notificationId);
    }
  });
});
