import { loadAlarms, saveAlarms } from './lib/storage';

// Listen for alarm events
chrome.alarms.onAlarm.addListener(async (alarm: chrome.alarms.Alarm) => {
  console.log('Alarm triggered:', alarm.name);

  const alarms = await loadAlarms();

  // For non-recurring alarms, the alarm name is the alarm ID.
  // For recurring alarms, the name is `alarm.id + '_' + day`.
  let triggeredAlarm = alarms.find(a => a.id === alarm.name);

  if (!triggeredAlarm) {
    // If not found, it might be a recurring alarm. Let's parse the ID.
    const parts = alarm.name.split('_');
    if (parts.length > 1) {
      parts.pop(); // Remove the day part
      const alarmId = parts.join('_');
      triggeredAlarm = alarms.find(a => a.id === alarmId);
    }
  }

  console.log('Found triggered alarm from storage:', triggeredAlarm);

  const alarmName = triggeredAlarm?.name || chrome.i18n.getMessage('alarm');
  const alarmDescription =
    triggeredAlarm?.description ||
    chrome.i18n.getMessage('defaultAlarmMessage');

  // Create a popup window instead of a notification
  const popupUrl = new URL(chrome.runtime.getURL('src/alarm.html'));
  popupUrl.searchParams.append('name', alarmName);
  popupUrl.searchParams.append('description', alarmDescription);
  popupUrl.searchParams.append('alarmName', alarm.name);
  const days = triggeredAlarm?.days || [];
  popupUrl.searchParams.append('days', JSON.stringify(days));

  // Get screen dimensions to center the popup
  const displayInfo = await chrome.system.display.getInfo();
  const primaryDisplay = displayInfo.find((d) => d.isPrimary) || displayInfo[0];
  const screenWidth = primaryDisplay.workArea.width;
  const screenHeight = primaryDisplay.workArea.height;
  const width = 400;
  const height = 250;

  const left = Math.round((screenWidth - width) / 2);
  const top = Math.round((screenHeight - height) / 2);

  try {
    await chrome.windows.create({
      url: popupUrl.href,
      type: 'popup',
      width: width,
      height: height,
      left: left,
      top: top,
    });
    console.log('Alarm window created for:', alarm.name);
  } catch (error) {
    console.error('Error creating alarm window:', error);
  }

});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'DISABLE_ALARM') {
    const disableAlarm = async () => {
      try {
        const alarms = await loadAlarms();
        const alarmName = message.alarmName;

        // For non-recurring alarms, the alarm name is the alarm ID.
        // For recurring alarms, the name is `alarm.id + '_' + day`.
        let alarmToDisable = alarms.find(a => a.id === alarmName);

        if (!alarmToDisable) {
          // If not found, it might be a recurring alarm. Let's parse the ID.
          const parts = alarmName.split('_');
          if (parts.length > 1) {
            parts.pop(); // Remove the day part
            const alarmId = parts.join('_');
            alarmToDisable = alarms.find(a => a.id === alarmId);
          }
        }

        if (alarmToDisable) {
          alarmToDisable.enabled = false;
          await saveAlarms(alarms);
          console.log(`Disabled alarm: ${alarmToDisable.name}`);
        }
        sendResponse({ success: true });
      } catch (error) {
        console.error('Error disabling alarm:', error);
        sendResponse({ success: false, error: (error as Error).message });
      }
    };

    disableAlarm();
    return true; // Indicates that the response is sent asynchronously
  }
});
