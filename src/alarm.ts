// --- Theme ---
const applyTheme = (theme: string) => {
  if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
      document.body.classList.toggle('light-theme', systemTheme === 'light');
  } else {
      document.body.classList.toggle('light-theme', theme === 'light');
  }
};

const loadTheme = async () => {
  try {
    const result = await chrome.storage.local.get('theme');
    const theme = result.theme || 'dark'; // Default to dark theme
    applyTheme(theme);
  } catch (e) {
    console.error("Error loading theme:", e);
    applyTheme('dark'); // Fallback to dark theme on error
  }
};

// --- Interaction Logic ---
const handleAlarmInteraction = async () => {
    const params = new URLSearchParams(window.location.search);
    const daysParam = params.get('days');
    const alarmNameToDisable = params.get('alarmName');

    if (daysParam && alarmNameToDisable) {
        try {
            const days = JSON.parse(daysParam);
            if (Array.isArray(days) && days.length === 0) {
                // This is a non-recurring alarm, so disable it by sending a message
                // to the background script.
                await new Promise(resolve => {
                    chrome.runtime.sendMessage({
                        type: 'DISABLE_ALARM',
                        alarmName: alarmNameToDisable
                    }, response => {
                        // Even if the response fails, resolve the promise to close the window.
                        // The background script will log the error.
                        resolve(response);
                    });
                });
            }
        } catch (e) {
            console.error("Error parsing 'days' parameter:", e);
        }
    }
};

export function setupAlarmPage() {
  loadTheme();

  // --- Alarm Details ---
  const params = new URLSearchParams(window.location.search);
  const alarmName = params.get('name');
  const alarmDescription = params.get('description');

  const alarmNameDisplay = document.getElementById('alarm-name-display');
  if (alarmNameDisplay) {
    alarmNameDisplay.textContent = alarmName || 'N/A';
  }

  const alarmDescriptionDisplay = document.getElementById('alarm-description-display');
  if (alarmDescriptionDisplay) {
    alarmDescriptionDisplay.textContent = alarmDescription || 'N/A';
  }

  // --- Buttons ---
  const closeButton = document.getElementById('close-btn');
  if (closeButton) {
    closeButton.addEventListener('click', async () => {
      await handleAlarmInteraction();
      window.close();
    });
  }

  const snoozeButton = document.getElementById('snooze-btn');
  if (snoozeButton) {
    snoozeButton.addEventListener('click', async () => {
      await handleAlarmInteraction();
      const originalAlarmName = params.get('alarmName');
      if (originalAlarmName) {
        const snoozeAlarmName = `snooze_${originalAlarmName}_${Date.now()}`;
        chrome.alarms.create(snoozeAlarmName, { delayInMinutes: 5 });
      }
      window.close();
    });
  }
}

document.addEventListener('DOMContentLoaded', setupAlarmPage);
