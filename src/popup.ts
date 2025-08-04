// Define the structure of an alarm
interface Alarm {
  id: string;
  time: string; // "HH:MM"
  days: number[]; // 0 for Sunday, 1 for Monday, etc.
  enabled: boolean;
  name?: string; // Optional name
}

// --- DOM Elements ---
const mainView = document.getElementById('main-view') as HTMLDivElement;
const editView = document.getElementById('edit-view') as HTMLDivElement;
const alarmList = document.getElementById('alarm-list') as HTMLUListElement;
const addAlarmBtn = document.getElementById('add-alarm-btn') as HTMLButtonElement;
const cancelBtn = document.getElementById('cancel-btn') as HTMLButtonElement;
const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
const editViewTitle = document.getElementById('edit-view-title') as HTMLHeadingElement;
const alarmIdInput = document.getElementById('alarm-id') as HTMLInputElement;
const alarmTimeInput = document.getElementById('alarm-time') as HTMLInputElement;
const weekdayButtons = document.querySelectorAll('.weekday') as NodeListOf<HTMLButtonElement>;

// --- App State ---
let alarms: Alarm[] = [];
const weekdayMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// --- Functions ---

/**
 * Replaces __MSG_...__ placeholders in the document with localized messages.
 */
const localizeHtml = () => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let node;
  while (node = walker.nextNode()) {
    if (node.nodeType === Node.TEXT_NODE && node.nodeValue) {
      const text = node.nodeValue;
      const newText = text.replace(/__MSG_(\w+)__/g, (match, key) => {
        return chrome.i18n.getMessage(key) || match;
      });
      if (newText !== text) {
        node.nodeValue = newText;
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i];
        const text = attr.value;
        const newText = text.replace(/__MSG_(\w+)__/g, (match, key) => {
          return chrome.i18n.getMessage(key) || match;
        });
        if (newText !== text) {
          attr.value = newText;
        }
      }
    }
  }
}

/**
 * Shows the main view and hides the edit view.
 */
const showMainView = () => {
  mainView.classList.remove('hidden');
  editView.classList.add('hidden');
};

/**
 * Shows the edit view and hides the main view.
 * @param {Alarm | null} alarm - The alarm to edit, or null to add a new one.
 */
const showEditView = (alarm: Alarm | null) => {
  editViewTitle.textContent = alarm ? 'Edit Alarm' : 'Add Alarm';
  alarmIdInput.value = alarm ? alarm.id : '';
  alarmTimeInput.value = alarm ? alarm.time : '07:00';

  // Reset and set active weekdays
  weekdayButtons.forEach(btn => {
    const day = parseInt(btn.dataset.day || '0', 10);
    if (alarm && alarm.days.includes(day)) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  mainView.classList.add('hidden');
  editView.classList.remove('hidden');
};

/**
 * Renders the list of alarms.
 */
const renderAlarms = () => {
  alarmList.innerHTML = '';
  if (alarms.length === 0) {
    alarmList.innerHTML = '<li>No alarms set.</li>';
    return;
  }

  alarms.sort((a, b) => a.time.localeCompare(b.time));

  alarms.forEach(alarm => {
    const listItem = document.createElement('li');
    listItem.className = 'alarm-item';
    listItem.dataset.id = alarm.id;

    const daysText = alarm.days.length > 0
      ? alarm.days.map(d => weekdayMap[d]).join(', ')
      : 'Once';

    listItem.innerHTML = `
      <div class="alarm-item-left">
        <div class="alarm-time">${alarm.time}</div>
        <div class="alarm-days">${daysText}</div>
      </div>
      <div class="alarm-item-right">
        <button class="delete-btn" data-id="${alarm.id}">🗑️</button>
        <label class="switch">
          <input type="checkbox" class="toggle-switch" data-id="${alarm.id}" ${alarm.enabled ? 'checked' : ''}>
          <span class="slider"></span>
        </label>
      </div>
    `;

    alarmList.appendChild(listItem);
  });
};

/**
 * Loads alarms from storage and renders them.
 */
const loadAlarms = async () => {
  const result = await chrome.storage.local.get('alarms');
  alarms = result.alarms || [];
  renderAlarms();
};

/**
 * Updates the actual chrome.alarms based on our stored alarm data.
 */
const syncAlarms = async () => {
  const { alarms: storedAlarms } = await chrome.storage.local.get('alarms');
  await chrome.alarms.clearAll();

  if (storedAlarms) {
    storedAlarms.forEach((alarm: Alarm) => {
      if (alarm.enabled) {
        // For recurring alarms, we need to schedule them differently
        if (alarm.days.length > 0) {
          const now = new Date();
          const [hours, minutes] = alarm.time.split(':').map(Number);

          alarm.days.forEach(day => {
            const alarmTime = new Date();
            alarmTime.setHours(hours, minutes, 0, 0);

            // Find the next occurrence of this day
            let dayDifference = day - now.getDay();
            if (dayDifference < 0 || (dayDifference === 0 && alarmTime.getTime() < now.getTime())) {
              dayDifference += 7;
            }

            alarmTime.setDate(now.getDate() + dayDifference);

            // The name of the Chrome alarm will be unique for each day
            const alarmName = `${alarm.id}_${day}`;
            chrome.alarms.create(alarmName, {
              when: alarmTime.getTime(),
              periodInMinutes: 7 * 24 * 60 // Repeats weekly
            });
          });
        } else {
          // For non-recurring alarms
          const alarmTime = new Date();
          const [hours, minutes] = alarm.time.split(':').map(Number);
          alarmTime.setHours(hours, minutes, 0, 0);

          if (alarmTime.getTime() < Date.now()) {
            alarmTime.setDate(alarmTime.getDate() + 1); // Schedule for tomorrow if time has passed
          }

          chrome.alarms.create(alarm.id, {
            when: alarmTime.getTime()
          });
        }
      }
    });
  }
};


/**
 * Saves alarms to storage and syncs with chrome.alarms API.
 */
const saveAndSyncAlarms = async () => {
  await chrome.storage.local.set({ alarms });
  await syncAlarms();
};

// --- Event Listeners ---

document.addEventListener('DOMContentLoaded', () => {
  localizeHtml();
  loadAlarms();
  showMainView();
});

addAlarmBtn.addEventListener('click', () => {
  showEditView(null);
});

cancelBtn.addEventListener('click', () => {
  showMainView();
});

weekdayButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    btn.classList.toggle('active');
  });
});

saveBtn.addEventListener('click', async () => {
  const id = alarmIdInput.value || `alarm_${Date.now()}`;
  const time = alarmTimeInput.value;
  const days = Array.from(weekdayButtons)
    .filter(btn => btn.classList.contains('active'))
    .map(btn => parseInt(btn.dataset.day || '0', 10));

  const existingIndex = alarms.findIndex(a => a.id === id);

  const newAlarm: Alarm = { id, time, days, enabled: true };

  if (existingIndex > -1) {
    alarms[existingIndex] = newAlarm;
  } else {
    alarms.push(newAlarm);
  }

  await saveAndSyncAlarms();
  await loadAlarms(); // Reload and re-render
  showMainView();
});

alarmList.addEventListener('click', async (e) => {
  const target = e.target as HTMLElement;

  // Handle toggle switch
  if (target.classList.contains('toggle-switch')) {
    const input = target as HTMLInputElement;
    const id = input.dataset.id;
    const alarm = alarms.find(a => a.id === id);
    if (alarm) {
      alarm.enabled = input.checked;
      await saveAndSyncAlarms();
    }
  }

  // Handle delete button
  if (target.classList.contains('delete-btn')) {
    const id = target.dataset.id;
    if (id && confirm('Are you sure you want to delete this alarm?')) {
        alarms = alarms.filter(a => a.id !== id);
        await saveAndSyncAlarms();
        await loadAlarms();
    }
  }

  // Handle click on item to edit
  const alarmItem = target.closest('.alarm-item');
  if (alarmItem && !target.classList.contains('toggle-switch') && !target.classList.contains('delete-btn') && !target.classList.contains('slider')) {
      const id = (alarmItem as HTMLLIElement).dataset.id;
      const alarm = alarms.find(a => a.id === id);
      if (alarm) {
          showEditView(alarm);
      }
  }
});
